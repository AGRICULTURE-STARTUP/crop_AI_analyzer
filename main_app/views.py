from django.shortcuts import render, redirect
from django.http import HttpResponse,JsonResponse
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.forms import AuthenticationForm
from .forms import SignupFormfarmer, SignupFormbuyer, SignupFormagency
from .models import FarmerProfile, BuyerProfile, AgencyProfile
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
import numpy as np
import os
from django.views.decorators.csrf import csrf_exempt
import json
import requests
import ollama
from .utils_weather import get_weather_data
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
# Cache for dynamically loaded models
loaded_models = {}

default_class_names = ['corn_Blight', 'corn_Gray Leaf Spot', 'corn_Healthy',
             'corn_Northern_Leaf_Blight', 'corn_common_Rust', 'potato_Early Blight',
             'potato_Healthy', 'potato_Late Blight']

KNOWN_CROP_CLASSES = {
    'wheat': ['Wheat___black_rust', 'Wheat___brown_rust', 'Wheat___healthy', 'Wheat___leaf_blight', 'Wheat___mildew', 'Wheat___mite', 'Wheat___septoria'],
    'maize': default_class_names,
    'potato': default_class_names,
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

def page(request):
    return render(request,"index.html")

def process(request):
    prediction = None
    confidence = None

    if request.method == 'POST' and request.FILES.get('image'):
        uploaded_file = request.FILES['image']
        temp_path = os.path.join('media/uploads', uploaded_file.name)
        os.makedirs(os.path.dirname(temp_path), exist_ok=True)

        with open(temp_path, 'wb+') as destination:
            for chunk in uploaded_file.chunks():
                destination.write(chunk)

        # Get the selected crop type, default to maize
        crop_selection = request.POST.get('available_crop_scan', 'maize').strip().lower()
        
        # Determine model path
        model_name = f"{crop_selection}.keras"
        model_path = os.path.join('main_app', 'CropModels', model_name)
        
        # Check if the specific model exists, otherwise fallback to maize
        if not os.path.exists(model_path):
            model_path = os.path.join('main_app', 'CropModels', 'maize.keras')
            # If maize.keras also doesn't exist, try local fallbacks
            if not os.path.exists(model_path):
                if os.path.exists(os.path.join('main_app', 'CropModels', 'maize_potato.keras')):
                    model_path = os.path.join('main_app', 'CropModels', 'maize_potato.keras')
                else:
                    model_path = 'main_app/mobilenet_finetuned2.keras'
        
        # Load the model and cache it
        if model_path not in loaded_models:
            loaded_models[model_path] = load_model(model_path)
        current_model = loaded_models[model_path]
        
        # Determine class names for the current crop
        current_class_names = KNOWN_CROP_CLASSES.get(crop_selection, default_class_names)

        #code to preproces the image
        img = image.load_img(temp_path, target_size=(224, 224))
        img_array = image.img_to_array(img)
        img_array = img_array / 255.0  
        img_array = np.expand_dims(img_array, axis=0)

        # making  Predictions
        predictions = current_model.predict(img_array)
        predicted_class_index = np.argmax(predictions[0])
        
        if predicted_class_index < len(current_class_names):
            prediction = current_class_names[predicted_class_index]
        else:
            prediction = f"{crop_selection.capitalize()} Disease (Class {predicted_class_index})"
            
        confidence = round(100 * np.max(predictions[0]), 2)

        
        os.remove(temp_path)

    # Render back to the same page with results
    return render(request, 'index.html', {
        'prediction': prediction,
        'confidence': confidence
    })


@csrf_exempt
def chat(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        user_message = data.get('message', '')
        
        user_location = None
        if request.user.is_authenticated:
            try:
                user_location = request.user.farmer_profile.county
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
            You are AgriBot, an agricultural assistant for small farmers.
            RULES:
            - Respond in plain text, no markdown or asterisks.
            - Output in short, clear points, each point on a new line.
            - Include Causes, Symptoms, Remedies.
            - No greetings or introductions.
            - Each point should be a complete sentence.{context_text}
            Question: {user_message}"""

        if user_location:
            prompt += f"\n            - The user's registered location/county is: {user_location}. You can use this for location-specific advice."

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
            "model": "llama-3.1-8b-instant",
            "messages": messages,
            "temperature": 0.4,
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
        
        # Check if the model wants to call a tool
        if message_obj.get("tool_calls"):
            tool_call = message_obj["tool_calls"][0]
            function_name = tool_call["function"]["name"]
            function_args = json.loads(tool_call["function"]["arguments"])
            
            if function_name == "get_weather_data":
                location_arg = function_args.get("location")
                tool_output = get_weather_data(location_arg)
                
                # Append the assistant's request and the tool's response to the conversation
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

def signup_farmer(request):
    if request.method == 'POST':
        form = SignupFormfarmer(request.POST)
        if form.is_valid():
            user = form.save()
            FarmerProfile.objects.create(
                user=user,
                phone_number=form.cleaned_data.get('phone_number'),
                county=form.cleaned_data.get('county'),
                country=form.cleaned_data.get('country'),
                products=form.cleaned_data.get('products')
            )
            login(request, user)
            return redirect('page')
    else:
        form = SignupFormfarmer()
    return render(request, 'signup.html', {'form': form, 'user_type': 'Farmer'})

def signup_buyer(request):
    if request.method == 'POST':
        form = SignupFormbuyer(request.POST)
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
            login(request, user)
            return redirect('page')
    else:
        form = SignupFormbuyer()
    return render(request, 'signup.html', {'form': form, 'user_type': 'Buyer'})

def signup_agency(request):
    if request.method == 'POST':
        form = SignupFormagency(request.POST)
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
            login(request, user)
            return redirect('page')
    else:
        form = SignupFormagency()
    return render(request, 'signup.html', {'form': form, 'user_type': 'Agency'})

def signin_view(request):
    if request.method == 'POST':
        form = AuthenticationForm(data=request.POST)
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            return redirect('page')
    else:
        form = AuthenticationForm()
    return render(request, 'signin.html', {'form': form})

def signout_view(request):
    logout(request)
    return redirect('login')

def reset_password_view(request):
    return render(request, 'resetpass.html')
def fertiliser_view(request):
    return render(request,"fertiliser_page.html")
def introduction_view(request):
    return render(request,"intro.html")
def fertiliser_display(request):
    if request.method== 'GET':
        fertiliser_firm=AgencyProfile.objects.all().values()
        data=list(fertiliser_firm)
        return JsonResponse({'fertiliser_firm' : data})
def market_view(request):
    return render(request,"market_buyers.html")

def market_display(request):
    if request.method == "GET":
        buyer_list= BuyerProfile.objects.all().values()
        data=list(buyer_list)
        return JsonResponse({"buyer_list":data})

def farmer_view(request):
    return render(request, "farmers.html")

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
        