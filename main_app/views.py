from django.shortcuts import render, redirect
from django.http import HttpResponse,JsonResponse
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.views import PasswordResetView
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from .forms import SignupFormfarmer, SignupFormbuyer, SignupFormagency
from .models import FarmerProfile, BuyerProfile, AgencyProfile
from tensorflow.keras.models import load_model
from tensorflow.keras.layers import Dense
from tensorflow.keras.preprocessing import image
from tensorflow.keras.applications.efficientnet import preprocess_input


class SafeDense(Dense):
    @classmethod
    def from_config(cls, config):
        if 'quantization_config' in config:
            del config['quantization_config']
        return super().from_config(config)

safe_custom_objs = {'Dense': SafeDense}
import numpy as np
import os
from django.views.decorators.csrf import csrf_exempt
import json
import requests
import uuid
from django.utils.html import strip_tags, escape
from .utils_weather import get_weather_data
from langchain_huggingface import HuggingFaceEmbeddings
from tensorflow.keras import mixed_precision
mixed_precision.set_global_policy('float32')
from langchain_chroma import Chroma
from huggingface_hub import hf_hub_download

# Cache for dynamically loaded models
loaded_models = {}

beans_classes = ['angular_leaf_spot', 'anthracnose', 'bean_rust', 'healthy', 'mosaic_virus']
cabbage_classes = ["Cabbage___Alternaria_Leaf_Spot", "Cabbage___Bacterial_spot_rot", "Cabbage___Black_Rot", "Cabbage___Cabbage_aphid_colony", "Cabbage___Downy_Mildew", "Cabbage___Healthy", "Cabbage___Ring_Spot"]
tomato_classes = ['bacterial_spot', 'early_blight', 'healthy', 'late_blight', 'leaf_mold', 'mosaic_virus', 'septoria_leaf_spot', 'spider_mite', 'target_spot', 'yellow_leaf__curl_Virus']
potato_classes = ['Potato___Early_blight', 'Potato___Late_blight', 'Potato___healthy']
capsicum_classes = ['Capsicum___Bacterial_spot', 'Capsicum___healthy']
cucumber_classes = ['Cucumber___Anthracnose', 'Cucumber___Bacterial_Wilt', 'Cucumber___Gummy_Stem_Blight', 'Cucumber___Healthy_leaf']
pea_classes = ['Pea___Downy_Mildew', 'Pea___Healthy', 'Pea___Leafminner', 'Pea___Powder_Mildew']
maize_classes = ['Corn___Northern_Leaf_Blight', 'blight', 'common_rust', 'downy_mildew', 'gray_leaf_spot', 'healthy', 'msv_streak_virus']
default_class_names = maize_classes
onion_classes = ['Onion___Alternaria_D', 'Onion___Botrytis_Leaf_Blight', 'Onion___Healthy', 'Onion___Purple_blotch', 'Onion___Virosis-D']
wheat_classes = ['Wheat___black_rust', 'Wheat___brown_rust', 'Wheat___healthy', 'Wheat___leaf_blight', 'Wheat___mildew', 'Wheat___mite', 'Wheat___septoria']
cauliflower_classes= ['Cauliflower___Bacterial_spot_rot', 'Cauliflower___Black_Rot', 'Cauliflower___Downy_Mildew', 'Cauliflower___Healthy']
KNOWN_CROP_CLASSES = {
    'wheat': wheat_classes,
    'maize': maize_classes,
    'potato': potato_classes,
    'beans': beans_classes,
    'cabbage': cabbage_classes,
    'tomato': tomato_classes,
    'capsicum': capsicum_classes,
    'cucumber': cucumber_classes,
    'onion': onion_classes,
    'pea': pea_classes,
    'cauliflower': cauliflower_classes,
   
  
}

try:
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    vectorstore = Chroma(
        persist_directory=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'chroma_db'),
        embedding_function=embeddings
    )
    retriever = vectorstore.as_retriever(search_kwargs={"k": 3})
except Exception as e:
    print("Warning: Could not initialize ChromaDB/Embeddings. RAG will not have context.", e)
    retriever = None

def get_crop_model(crop_selection):
    """Determines model path, downloads from HF if needed, and loads it."""
    filename = f"{crop_selection}.h5"
    repo_id = os.getenv("HF_MODEL_REPO_ID")
    
    # Priority 1: Download from Hugging Face if REPO_ID matches
    if repo_id:
        try:
            print(f"Fetching {filename} from Hugging Face repo: {repo_id}...")
            model_path = hf_hub_download(repo_id=repo_id, filename=filename)
        except Exception as e:
            print(f"HF download failed, falling back to local: {e}")
            model_path = os.path.join('main_app', 'CropModels', filename)
    else:
        # Priority 2: Standard local fallback
        model_path = os.path.join('main_app', 'CropModels', filename)

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file '{filename}' not found locally or on HF.")
    
    # Load the model and cache it
    if model_path not in loaded_models:
        try:
            loaded_models[model_path] = load_model(model_path, compile=False, custom_objects=safe_custom_objs)
        except Exception as e:
            import h5py
            try:
                with h5py.File(model_path, 'r') as f:
                    pass
                signature_status = "Valid H5 signature but load failed."
            except Exception as h5_err:
                signature_status = f"Invalid H5 signature (possibly an LFS pointer): {str(h5_err)}"
            
            raise OSError(f"Failed to load model '{crop_selection}': {str(e)}. {signature_status}") from e
        
    return loaded_models[model_path]



@login_required(login_url='login')
def page(request):
    return render(request,"index.html")

@login_required(login_url='login')
@ratelimit(key='user_or_ip', rate='5/m', block=False)
def process(request):
    was_limited = getattr(request, 'ratelimit', {}).get('was_limited', False)
    if was_limited:
        return render(request, 'index.html', {'error': 'Too many scan requests. Please wait a minute.'})
    prediction = None
    confidence = None

    if request.method == 'POST' and request.FILES.get('image'):
        uploaded_file = request.FILES['image']
        
        # 1. Validate File Size (5MB limit)
        if uploaded_file.size > 5 * 1024 * 1024:
             return render(request, 'index.html', {'error': 'File too large. Maximum size is 5MB.'})

        # 2. Validate MIME type
        allowed_types = ['image/jpeg', 'image/png', 'image/webp']
        if uploaded_file.content_type not in allowed_types:
            return render(request, 'index.html', {'error': 'Invalid file type. Only JPG, PNG, and WEBP images are allowed.'})

        # 3. Secure Filename with UUID
        ext = os.path.splitext(uploaded_file.name)[1].lower()
        if ext not in ['.jpg', '.jpeg', '.png', '.webp']:
            return render(request, 'index.html', {'error': 'Invalid file extension.'})
        
        safe_filename = f"{uuid.uuid4()}{ext}"
        temp_path = os.path.join('media/uploads', safe_filename)
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)

        with open(temp_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        # 4. Strict Crop Selection Validation
        crop_selection = request.POST.get('available_crop_scan', 'maize').strip().lower()
        if crop_selection not in KNOWN_CROP_CLASSES:
             # Fallback to default or error
             crop_selection = 'maize'
        
        
        current_model = get_crop_model(crop_selection)
    
        img = image.load_img(temp_path, target_size=(224, 224))
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0)
        img_array= preprocess_input(img_array)

        # making  Predictions
        predictions = current_model.predict(img_array)
        predicted_class_index = np.argmax(predictions[0])
        
        # Resolve class names based on selection, using default_class_names as fallback
        crop_classes = KNOWN_CROP_CLASSES.get(crop_selection, default_class_names)
        prediction = crop_classes[predicted_class_index]
            
        confidence = round(100 * np.max(predictions[0]), 2)

        
        os.remove(temp_path)

    # Render back to the same page with results
    return render(request, 'index.html', {
        'prediction': prediction,
        'confidence': confidence
    })


@csrf_exempt
@login_required(login_url='login')
@ratelimit(key='user_or_ip', rate='10/m', block=False)
def chat(request):
    was_limited = getattr(request, 'ratelimit', {}).get('was_limited', False)
    if was_limited:
        return JsonResponse({"error": "Rate limit exceeded. Please wait a moment."}, status=429)
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
            
        user_message = strip_tags(data.get('message', '')).strip()
        if not user_message:
             return JsonResponse({"response": "Please enter a message."})
        
        user_location = None
        if request.user.is_authenticated:
            try:
                user_location = request.user.farmer_profile.county
            except Exception:
                pass
        if request.user.is_authenticated:
            try:
                user_location =request.user.agency_profile.location
            except Exception:
                pass
        
            if not user_location:
                try:
                    user_location = request.user.buyer_profile.county
                except Exception:
                    pass

        context_text = ""
        if retriever:
            try:
                docs = retriever.invoke(user_message)
                context_text = "\n            Relevant Context from Documents:\n            " + "\n            ".join([doc.page_content.replace("\n", " ") for doc in docs])
            except Exception as e:
                print("Error retrieving context:", e)

      
        prompt = f"""
                    You are AgriBot, an expert-level agricultural advisor specialized in small-scale and semi-commercial farming in East Africa, particularly Kenya..
                    You must provide technically accurate, practical, and context-aware guidance for any type of agriculture question.
                    LANGUAGE RULE (VERY IMPORTANT):
                    - Always respond in the exact same language as the USER QUESTION.
                    - If the user writes in Kiswahili, answer in clear, natural Kiswahili.
                    - If the user writes in English, answer in English.

                    First, internally classify the question type (do this silently):
                    - DIAGNOSTIC, ADVISORY, PLANNING, or INFORMATIONAL

                    Then generate your response using EXACTLY this output structure.

                    OUTPUT FORMAT (MUST FOLLOW EXACTLY):

                    OVERVIEW
                    Two short, direct sentence that answers the question with local context.

                    RECOMMENDATIONS
                    - clear actionable steps
                    - clear actionable steps

                    EXPLANATION
                    - key reasons or important facts
                    - supporting local details

                    PRACTICAL TIPS
                    - easy implementation tips
                    - monitoring or follow-up steps

                    DEPTH REQUIREMENTS:
                    - Be extremely specific: name exact varieties, fertilizer types/rates, timing, and local practices.
                    - Prioritize low-cost, sustainable solutions for farmers.

                    FORMATTING RULES
                    - Use bold only for crop names, fertilizer types, and key numbers.
                    - Keep every bullet very short and scannable (one idea only).
                    - Add one blank line after every section header.
                    - Use simple, direct language. No long sentences.
                    - Make the whole response easy to read quickly while working in the field.

                    STRICT RULES:
                    - Never skip any section.
                    - Never add extra sections or text.
                    - No greetings, no conclusions, no repetition.
                    - Stay concise — remove any repeated information.

                    CONTEXT:
                    {context_text}

                    USER QUESTION:
                    {user_message}
                """

        if user_location:
            prompt += f"\nNote: The user's registered location/county is {user_location}. Use this for location-specific advice if relevant."

        url = "https://api.groq.com/openai/v1/chat/completions"

        headers = {
            "Authorization": f"Bearer {os.getenv('GROQ_API_KEY')}",
            "Content-Type": "application/json",
        }
        
        tools = [
            {
                "type": "function",
                "function": {
                    "name": "get_weather_data",
                    "description": "Get the current weather (temperature, humidity, wind, rainfall) in a given location. Use this to provide location-specific agricultural advice.",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "location": {
                                "type": "string",
                                "description": "The city or county name, e.g. Nairobi, Kisumu"
                            }
                        },
                        "required": ["location"]
                    }
                }
            }
        ]

        messages = [{"role": "system", "content": prompt}, {"role": "user", "content": user_message}]

        payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": messages,
            "temperature": 0.3,
            "max_tokens": 500,
            "tools": tools,
            "tool_choice": "auto"
        }

        response = requests.post(url, headers=headers, json=payload)
        print("STATUS:", response.status_code)
        print("RAW RESPONSE TEXT:", response.text)


        try:
            result = response.json()
        except Exception as e:
            print("JSON PARSE ERROR:", e)
            print("UNPARSED RESPONSE:", response.text)
            return JsonResponse({"response": "Groq returned invalid JSON."})

        print("PARSED RESULT:", result)

                                                         
        if "error" in result:
            return JsonResponse({"response": f"Groq Error: {result['error']['message']}"})

        message_obj = result["choices"][0]["message"]
        
    
        if message_obj.get("tool_calls"):
            tool_call = message_obj["tool_calls"][0]
            function_name = tool_call["function"]["name"]
            function_args = json.loads(tool_call["function"]["arguments"])
            
            if function_name == "get_weather_data":
                location_arg = function_args.get("location")
                tool_output = get_weather_data(location_arg)
                
                messages.append(message_obj)
                messages.append({
                    "role": "tool",
                    "tool_call_id": tool_call["id"],
                    "name": function_name,
                    "content": tool_output
                })
                
                # Make a second request to Groq with the tool result included
                payload["messages"] = messages
                # We can optionally remove tools on the second call to force completion
                payload.pop("tools", None)
                payload.pop("tool_choice", None)
                
                second_response = requests.post(url, headers=headers, json=payload)
                result = second_response.json()
                
                if "error" in result:
                     return JsonResponse({"response": f"Groq Error on second pass: {result['error']['message']}"})
                
                try:
                    reply = result["choices"][0]["message"]["content"]
                except Exception as e:
                    return JsonResponse({"response": "Groq did not return a valid AI message after tool call."})
                
                return JsonResponse({"response": reply})

        try:
            reply = message_obj["content"]
        except Exception as e:
            print("CHOICES ERROR:", e)
            print("RESULT STRUCTURE:", result)
            return JsonResponse({"response": "Groq did not return a valid AI message."})

        return JsonResponse({"response": reply})

    return JsonResponse({"error": "Invalid request"}, status=400)

@ratelimit(key='ip', rate='3/m', block=False)
def signup_farmer(request):
    was_limited = getattr(request, 'ratelimit', {}).get('was_limited', False)
    if was_limited:
        return render(request, 'signup.html', {'form': SignupFormfarmer(), 'user_type': 'Farmer', 'error': 'Too many registration attempts. Please try again later.'})
    if request.method == 'POST':
        form = SignupFormfarmer(request.POST)
        if not request.POST.get('privacy-accept'):
            return render(request, 'signup.html', {'form': form, 'user_type': 'Farmer', 'error': 'You must accept the Privacy Policy to register.'})
        if form.is_valid():
            user = form.save()
            FarmerProfile.objects.create(
                user=user,
                phone_number=form.cleaned_data.get('phone_number'),
                county=form.cleaned_data.get('county'),
                country=form.cleaned_data.get('country'),
                products=form.cleaned_data.get('products')
            )
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')

            return redirect('page')
    else:
        form = SignupFormfarmer()
    return render(request, 'signup.html', {'form': form, 'user_type': 'Farmer'})

@ratelimit(key='ip', rate='3/m', block=False)
def signup_buyer(request):
    was_limited = getattr(request, 'ratelimit', {}).get('was_limited', False)
    if was_limited:
        return render(request, 'signup.html', {'form': SignupFormbuyer(), 'user_type': 'Buyer', 'error': 'Too many registration attempts. Please try again later.'})
    if request.method == 'POST':
        form = SignupFormbuyer(request.POST)
        if not request.POST.get('privacy-accept'):
            return render(request, 'signup.html', {'form': form, 'user_type': 'Buyer', 'error': 'You must accept the Privacy Policy to register.'})
        if form.is_valid():
            user = form.save()
            BuyerProfile.objects.create(
                user=user,
                phone_number=form.cleaned_data.get('phone_number'),
                county=form.cleaned_data.get('county'),
                country=form.cleaned_data.get('country'),
                first_name=form.cleaned_data.get('first_name'),
                email=form.cleaned_data.get("email")

            )
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')

            return redirect('page')
    else:
        form = SignupFormbuyer()
    return render(request, 'signup.html', {'form': form, 'user_type': 'Buyer'})

@ratelimit(key='ip', rate='3/m', block=False)
def signup_agency(request):
    was_limited = getattr(request, 'ratelimit', {}).get('was_limited', False)
    if was_limited:
        return render(request, 'signup.html', {'form': SignupFormagency(), 'user_type': 'Agency', 'error': 'Too many registration attempts. Please try again later.'})
    if request.method == 'POST':
        form = SignupFormagency(request.POST)
        if not request.POST.get('privacy-accept'):
            return render(request, 'signup.html', {'form': form, 'user_type': 'Agency', 'error': 'You must accept the Privacy Policy to register.'})
        if form.is_valid():
            user = form.save()
            AgencyProfile.objects.create(
                user=user,
                agency_type=form.cleaned_data.get('agency_type'),
                location=form.cleaned_data.get('location'),
                support_phone=form.cleaned_data.get('support_phone'),
                name=form.cleaned_data.get('name'),
                email=form.cleaned_data.get('email'),
            )
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')

            return redirect('page')
    else:
        form = SignupFormagency()
    return render(request, 'signup.html', {'form': form, 'user_type': 'Agency'})

@ratelimit(key='ip', rate='5/m', block=False)
def signin_view(request):
    was_limited = getattr(request, 'ratelimit', {}).get('was_limited', False)
    if was_limited:
        return render(request, 'signin.html', {'form': AuthenticationForm(), 'error': 'Too many login attempts. Please try again later.'})
    if request.method == 'POST':
        form = AuthenticationForm(data=request.POST)
        if not request.POST.get('privacy-accept'):
            return render(request, 'signin.html', {'form': form, 'error': 'You must accept the Privacy Policy to log in.'})
        if form.is_valid():
            user = form.get_user()
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')

            return redirect('page')
    else:
        form = AuthenticationForm()
    return render(request, 'signin.html', {'form': form})

def signout_view(request):
    logout(request)
    return redirect('login')
@login_required(login_url='login')
def fertiliser_view(request):
    return render(request,"fertiliser_page.html")
def introduction_view(request):
    return render(request,"intro.html")

def homepage_view(request):
    return render(request,"homepage.html")

def privacy_policy_view(request):
    return render(request,"privacy_policy.html")
@login_required(login_url='login')
def fertiliser_display(request):
    if request.method== 'GET':
        fertiliser_firm=AgencyProfile.objects.all().values()
        data=list(fertiliser_firm)
        return JsonResponse({'fertiliser_firm' : data})
@login_required(login_url='login')
def market_view(request):
    return render(request,"market_buyers.html")

@login_required(login_url='login')
def market_display(request):
    if request.method == "GET":
        buyer_list= BuyerProfile.objects.all().values()
        data=list(buyer_list)
        return JsonResponse({"buyer_list":data})

@login_required(login_url='login')
def farmer_view(request):
    return render(request, "farmers.html")

@login_required(login_url='login')
def farmer_display(request):
    if request.method == "GET":
        # We need the username from the related user object, so we'll construct the list manually
        farmers = FarmerProfile.objects.select_related('user').all()
        data = []
        for farmer in farmers:
            data.append({
                'username': farmer.user.username,
                'phone_number': farmer.phone_number,
                'county': farmer.county,
                'country': farmer.country,
                'products': farmer.products
            })
        return JsonResponse({"farmer_list": data})



@login_required(login_url='login')
def farmer_profile_view(request):
    """Dedicated profile page for authenticated farmers only."""
    # Guard: only farmers may access this page
    try:
        farmer_profile = request.user.farmer_profile
    except FarmerProfile.DoesNotExist:
        return redirect('page')

    # --- AJAX: handle individual crop removal ---
    if request.method == 'POST' and request.headers.get('X-Requested-With') == 'XMLHttpRequest':
        data = json.loads(request.body)
        action = data.get('action')
        crop = strip_tags(data.get('crop', '')).strip()
        existing = [c.strip() for c in (farmer_profile.products or '').split(',') if c.strip()]

        if action == 'remove' and crop in existing:
            existing.remove(crop)
        elif action == 'add' and crop and crop not in existing:
            existing.append(crop)

        farmer_profile.products = ', '.join(existing)
        farmer_profile.save()
        return JsonResponse({'crops': existing})

    # --- Standard POST: update personal details ---
    success_message = None
    error_message = None

    if request.method == 'POST':
        first_name = strip_tags(request.POST.get('first_name', '')).strip()
        last_name = strip_tags(request.POST.get('last_name', '')).strip()
        email = strip_tags(request.POST.get('email', '')).strip()
        phone_number = strip_tags(request.POST.get('phone_number', '')).strip()
        county = strip_tags(request.POST.get('county', '')).strip()
        country = strip_tags(request.POST.get('country', '')).strip()
        
        # Basic validation for phone number (Allow +, spaces, digits)
        import re
        if phone_number and not re.match(r'^\+?[\d\s\-]+$', phone_number):
             error_message = 'Invalid phone number format.'
             # Continue but maybe log it or show error

        request.user.first_name = first_name
        request.user.last_name = last_name
        request.user.email = email
        request.user.save()

        farmer_profile.phone_number = phone_number
        farmer_profile.county = county
        farmer_profile.country = country
        farmer_profile.save()
        success_message = 'Profile updated successfully!'

    # Parse the comma-separated products string into a clean list
    crops_list = [c.strip() for c in (farmer_profile.products or '').split(',') if c.strip()]

    # Build the weather widget data for the farmer's county
    weather_data = None
    if farmer_profile.county:
        raw = get_weather_data(farmer_profile.county)
        weather_data = json.loads(raw)
        if 'error' in weather_data:
            weather_data = None

    context = {
        'farmer_profile': farmer_profile,
        'crops_list': crops_list,
        'weather_data': weather_data,
        'success_message': success_message,
        'error_message': error_message,
    }
    return render(request, 'farmer_profile.html', context)

@method_decorator(ratelimit(key='ip', rate='3/m', block=False), name='dispatch')
class CustomPasswordResetView(PasswordResetView):
    def dispatch(self, request, *args, **kwargs):
        was_limited = getattr(request, 'ratelimit', {}).get('was_limited', False)
        if was_limited:
            return render(request, 'password_reset_form.html', {
                'form': self.get_form_class()(),
                'error': 'Too many password reset requests. Please try again later.'
            })
        return super().dispatch(request, *args, **kwargs)

    def form_valid(self, form):
        opts = {
            "use_https": self.request.is_secure(),
            "token_generator": self.token_generator,
            "from_email": self.from_email,
            "email_template_name": self.email_template_name,
            "subject_template_name": self.subject_template_name,
            "request": self.request,
            "html_email_template_name": self.html_email_template_name,
            "extra_email_context": {
                 **(self.extra_email_context or {}),
                 'domain': self.request.get_host(),
                 'site_name': 'AgriScan'
            },
        }
        form.save(**opts)
        return super(PasswordResetView, self).form_valid(form)
        