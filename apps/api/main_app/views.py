from django.shortcuts import render, redirect
from django.http import HttpResponse, JsonResponse
from django.contrib.auth import login, authenticate, logout
from django.contrib.auth.decorators import login_required, user_passes_test
from django.db.models import Sum, Count
from django.contrib.auth.forms import AuthenticationForm
from django.contrib.auth.views import PasswordResetView
from django_ratelimit.decorators import ratelimit
from django.utils.decorators import method_decorator
from .forms import SignupFormfarmer, SignupFormbuyer
from .models import FarmerProfile, BuyerProfile, CropScanLog, PartnerAPIKey, FarmHealthProfile
from .utils_scoring import calculate_farm_health_score
from .agents import run_agrovet_agent
import os
from django.views.decorators.csrf import csrf_exempt
import json
import requests
import uuid
from django.utils.html import strip_tags, escape
from .utils_weather import get_weather_data
from .mpesa_utils import MpesaGateway
from .models import (
    FarmerProfile, BuyerProfile, CropScanLog,
    PartnerAPIKey, FarmHealthProfile, Wallet,
    MpesaTransaction
)
from django.utils import timezone
from django.utils.http import url_has_allowed_host_and_scheme
from datetime import timedelta
from django.db import transaction

mpesa_client = MpesaGateway()

# NOTE: TensorFlow, HuggingFace, and rag.retrieve are imported lazily inside
# scan/chat helpers so the slim `api` container never loads them at startup.

# Legacy in-process cache (template /process path). Prefer inference.model_lru in workers.
loaded_models = {}
_gatekeeper_model = None


farmer_required = user_passes_test(
    lambda user: user.is_authenticated
    and not user.is_staff
    and hasattr(user, "farmer_profile"),
    login_url="login",
)
buyer_required = user_passes_test(
    lambda user: user.is_authenticated
    and not user.is_staff
    and hasattr(user, "buyer_profile"),
    login_url="login",
)
staff_required = user_passes_test(
    lambda user: user.is_authenticated and user.is_staff,
    login_url="login",
)


def get_gatekeeper():
    global _gatekeeper_model
    if _gatekeeper_model is None:
        from keras.applications.efficientnet import EfficientNetB0
        from tensorflow.keras import mixed_precision

        mixed_precision.set_global_policy("float32")
        _gatekeeper_model = EfficientNetB0(weights="imagenet")
    return _gatekeeper_model


def is_plant_image(img_path):
    """
    Returns True if the image is likely a plant/crop, False if it's a known non-plant.
    Uses a pre-trained ImageNet EfficientNetB0 to filter out obvious out-of-distribution images.
    """
    import numpy as np
    from keras.applications.efficientnet import decode_predictions, preprocess_input
    from keras.preprocessing import image

    model = get_gatekeeper()
    img = image.load_img(img_path, target_size=(224, 224))
    img_array = image.img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)
    img_array = preprocess_input(img_array)

    preds = model.predict(img_array)
    decoded = decode_predictions(preds, top=5)[0]

    print(f"\n--- GATEKEEPER IMAGE-NET PREDICTIONS ---")
    for i, (imagenet_id, label, score) in enumerate(decoded):
        print(f"{i + 1}: {label} ({score * 100:.2f}%)")
    print("----------------------------------------\n")

    plant_whitelist = [
        'plant', 'leaf', 'flower', 'tree', 'grass', 'daisy', 'pot', 'earthstar',
        'corn', 'cabbage', 'cucumber', 'zucchini', 'bell_pepper', 'strawberry',
        'orange', 'lemon', 'fig', 'pineapple', 'banana', 'apple', 'broccoli',
        'cauliflower', 'artichoke', 'turnip', 'mushroom', 'agaric', 'gyromitra',
        'stinkhorn', 'bolete', 'buckeye', 'acorn', 'rapeseed',
        'head_cabbage', 'vegetable', 'fruit', 'greenhouse', 'hay', 'thistle',
        'cardoon', 'squash', 'pomegranate', 'jackfruit', 'custard_apple',
        'granny_smith', 'lady\'s_slipper', 'hip', 'coral_fungus', 'hen-of-the-woods',
        'velvet', 'sponge', 'tuber', 'root', 'stalk', 'vine', 'pod', 'seed', 'grain'
    ]

    top_label = decoded[0][1].lower()
    top_score = decoded[0][2]

    is_top_plant = any(w in top_label for w in plant_whitelist)
    if not is_top_plant and top_score > 0.8:
        print(f"Gatekeeper: Strict rejection - Highly confident non-plant: {top_label} ({top_score*100:.1f}%)")
        return False

    for _, label, conf in decoded:
        if any(w in label.lower() for w in plant_whitelist):
            if conf > 0.05:
                return True

    non_plant_strict = ['car', 'truck', 'bus', 'vehicle', 'tire', 'wheel', 'logo', 'sign', 'building', 'furniture', 'person', 'dog', 'cat']
    if top_score < 0.3:
        if not any(w in top_label for w in non_plant_strict):
            print(f"Gatekeeper: Low confidence fallback - allowing uncertain image '{top_label}' ({top_score*100:.1f}%)")
            return True

    return False


beans_classes = ['angular_leaf_spot', 'anthracnose', 'bean_rust', 'healthy', 'mosaic_virus']
cabbage_classes= ['Cabbage___Alternaria_Leaf_Spot', 'Cabbage___Black_Rot', 'Cabbage___Cabbage_aphid_colony', 'Cabbage___Downy_Mildew', 'Cabbage___Healthy', 'Cabbage___Ring_Spot']
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
apple_classes = ['Apple_Scab', 'Apple_rust_leaf', 'Black_Rot', 'Cedar_Apple_Rust', 'Healthy']
ball_pepper_classes = ['Bacterial_Spot', 'Healthy']
cashew_nuts_classes = ['Cashew_anthracnose', 'Cashew_gumosis', 'Cashew_healthy', 'Cashew_leaf_miner', 'Cashew_red_rust']
cassava_classes = ['Cassava_bacterial_blight', 'Cassava_brown_spot', 'Cassava_green_mite', 'Cassava_healthy', 'Cassava_mosaic']
chilly_classes = ['Chili__healthy', 'Chili__leaf curl', 'Chili__leaf spot', 'Chili__whitefly', 'Chili__yellowish']
sugarcane_classes = ['Healthy', 'Mosaic', 'RedRot', 'RedRust', 'YellowRust ']
grape_classes = ['Black_Rot', 'Esca_(Black Measles)', 'Healthy', 'Leaf_Blight']
KNOWN_CROP_CLASSES = {
    'wheat': wheat_classes,
    'maize': maize_classes,
    'potato': potato_classes,
    'beans': beans_classes,
    'cabbage': cabbage_classes,
    'cassava': cassava_classes,
    'tomato': tomato_classes,
    'capsicum': capsicum_classes,
    'cucumber': cucumber_classes,
    'onion': onion_classes,
    'pea': pea_classes,
    'cauliflower': cauliflower_classes,
    'apple': apple_classes,
    'ball_pepper': ball_pepper_classes,
    'cashew_nuts': cashew_nuts_classes,
    'chilly': chilly_classes,
    'sugarcane': sugarcane_classes,
    'grape': grape_classes,

}

def get_crop_model(crop_selection):
    """Determines model path, downloads from HF if needed, and loads it."""
    from huggingface_hub import hf_hub_download
    from tensorflow.keras.layers import Dense
    from tensorflow.keras.models import load_model

    class SafeDense(Dense):
        @classmethod
        def from_config(cls, config):
            if "quantization_config" in config:
                del config["quantization_config"]
            return super().from_config(config)

    safe_custom_objs = {"Dense": SafeDense}
    filename = f"{crop_selection}.h5"
    repo_id = os.getenv("HF_MODEL_REPO_ID")

    if repo_id:
        try:
            print(f"Fetching {filename} from Hugging Face repo: {repo_id}...")
            model_path = hf_hub_download(repo_id=repo_id, filename=filename)
        except Exception as e:
            print(f"HF download failed, falling back to local: {e}")
            model_path = os.path.join("main_app", "CropModels", filename)
    else:
        model_path = os.path.join("main_app", "CropModels", filename)

    if not os.path.exists(model_path):
        raise FileNotFoundError(f"Model file '{filename}' not found locally or on HF.")

    if model_path not in loaded_models:
        try:
            loaded_models[model_path] = load_model(
                model_path, compile=False, custom_objects=safe_custom_objs
            )
        except Exception as e:
            import h5py

            try:
                with h5py.File(model_path, "r") as f:
                    pass
                signature_status = "Valid H5 signature but load failed."
            except Exception as h5_err:
                signature_status = f"Invalid H5 signature (possibly an LFS pointer): {str(h5_err)}"

            raise OSError(
                f"Failed to load model '{crop_selection}': {str(e)}. {signature_status}"
            ) from e

    return loaded_models[model_path]



@login_required(login_url='login')
@farmer_required
def page(request):
    if hasattr(request.user, 'buyer_profile'):
        return redirect('buyer_dashboard_view')
    return render(request,"index.html")

@login_required(login_url='login')
@farmer_required
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
        
        # 5. ImageNet Gatekeeper (OOD Check)
        if not is_plant_image(temp_path):
             os.remove(temp_path)
             return render(request, 'index.html', {'error': 'Image does not appear to be a plant. Please upload a clear leaf photo.'})
        
        # --- MONETIZATION: Gating ---
        wallet = request.user.wallet
        # Check if farmer exists
        try:
            farmer = request.user.farmer_profile
            is_free_trial = farmer.scan_logs.count() < 2
        except Exception:
            # Buyers don't get free trials or might not be allowed to scan
            is_free_trial = False

        if not is_free_trial and wallet.balance < 20:
             os.remove(temp_path)
             return render(request, 'index.html', {
                 'error': 'Insufficient balance (KSh 20 required). Please top up your wallet to continue.',
                 'needs_topup': True
             })
        
        current_model = get_crop_model(crop_selection)

        import numpy as np
        from keras.applications.efficientnet import preprocess_input
        from keras.preprocessing import image

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
        
        # --- FARMSCAN LOGGING FOR LENDING SCORE ---
        if request.user.is_authenticated:
            try:
                farmer = request.user.farmer_profile
                CropScanLog.objects.create(
                    farmer=farmer,
                    crop_type=crop_selection,
                    result=prediction,
                    confidence_score=confidence / 100.0, # Store as ratio 0-1
                    location=farmer.county
                )
            except Exception as e:
                pass # E.g., user is a Buyer, not Farmer

        if not is_free_trial:
            wallet.balance -= 20
            wallet.save()
        
        os.remove(temp_path)

    # Render back to the same page with results
    return render(request, 'index.html', {
        'prediction': prediction,
        'confidence': confidence
    })


@login_required(login_url='login')
@farmer_required
@ratelimit(key='user_or_ip', rate='5/m', block=False)
def chat(request):
    was_limited = getattr(request, 'ratelimit', {}).get('was_limited', False)
    if was_limited:
        return JsonResponse({"error": "Rate limit exceeded. Please wait a moment."}, status=429)
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON"}, status=400)
            
        # Handle clear chat history action
        if data.get('action') == 'clear':
            request.session['chat_history'] = []
            request.session.modified = True
            return JsonResponse({"response": "Conversation history cleared.", "status": "success"})
            
        user_message = strip_tags(data.get('message', '')).strip()
        if not user_message:
             return JsonResponse({"response": "Please enter a message."})
        
        # --- MONETIZATION: Gating ---
        wallet = request.user.wallet
        is_free_trial = wallet.chat_count < 5
        if not is_free_trial and wallet.balance < 10:
            return JsonResponse({
                "response": "Insufficient balance (KSh 10 required). Please top up your wallet to continue chatting.",
                "needs_topup": True
            })

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

        # Get session chat history (limited to last 8 messages / 4 turns to avoid token bloat)
        chat_history = request.session.get('chat_history', [])

        # Initialize LangChain ChatGroq with gpt-oss-120b
        from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
        from langchain_groq import ChatGroq

        llm = ChatGroq(
            model="openai/gpt-oss-120b",
            groq_api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.0
        )

        rephrased_query = user_message
        detected_language = "English"

        # Construct helper history for context analysis
        history_str = ""
        for msg in chat_history[-4:]:  # last 2 turns
            role = "User" if msg.get('role') == 'user' else "Assistant"
            content = msg.get('content', '')
            if role == "Assistant":
                try:
                    parsed = json.loads(content)
                    content = parsed.get("overview", "") + " " + " ".join(parsed.get("recommendations", []))
                except Exception:
                    pass
            history_str += f"{role}: {content}\n"

        analysis_prompt = f"""Given the following conversation history and a user's question, analyze the question and:
1. Rephrase it to be a standalone search query in English. The query must incorporate all necessary context (specific crop, disease, location, etc.) from the conversation history, so that it can be used to search a database. If the question is already a standalone question, keep it as is.
2. Detect the language of the user's question (either "Kiswahili" or "English").

Output your response as a valid JSON object with the keys:
- "rephrased_query": "standalone query in English"
- "detected_language": "Kiswahili" or "English"

Do NOT output any other text or explanation. Only return the JSON object.

Conversation History:
{history_str}

User Question: {user_message}
JSON Output:"""

        try:
            analysis_msg = llm.bind(response_format={"type": "json_object"}).invoke([HumanMessage(content=analysis_prompt)])
            analysis_content = analysis_msg.content.strip()
            # Clean possible markdown wrapping
            if analysis_content.startswith("```json"):
                analysis_content = analysis_content[7:]
            if analysis_content.startswith("```"):
                analysis_content = analysis_content[3:]
            if analysis_content.endswith("```"):
                analysis_content = analysis_content[:-3]
            analysis_content = analysis_content.strip()

            analysis_data = json.loads(analysis_content)
            rephrased_query = analysis_data.get("rephrased_query", user_message)
            detected_language = analysis_data.get("detected_language", "English")
            print(f"[AgriBot] Message analysis successful. Rephrased: '{rephrased_query}', Language: '{detected_language}'")
        except Exception as e:
            print("[AgriBot] Error analyzing user message:", e)
            # Fallback simple keyword language detection
            is_swahili = any(word in user_message.lower() for word in ["je", "jee", "ugonjwa", "tibiwa", "mahindi", "kutu", "ya", "wa", "kwa", "na", "huyu", "huu", "hii"])
            if is_swahili:
                detected_language = "Kiswahili"

        # Retrieve context using the rephrased query
        context_text = ""
        try:
            from rag.retrieve import retrieve_context

            context_text, _ = retrieve_context(rephrased_query)
        except Exception as e:
            print("Error retrieving context:", e)

        user_name = "Farmer"
        if request.user.is_authenticated:
            if request.user.first_name:
                user_name = request.user.first_name
            else:
                user_name = request.user.username

        system_prompt = f"""
                    You are AgriBot, an expert-level agricultural advisor specialized in small-scale and semi-commercial farming in East Africa, particularly Kenya.
                    You must provide technically accurate, practical, and context-aware guidance for any type of agriculture question.
                    Maintain a friendly, highly conversational, and caring persona—just like a trusted local extension officer. Reference previous points or crops discussed in the conversation history where appropriate.
                    Address the user as {user_name} when responding.

                    LANGUAGE RULE (VERY IMPORTANT):
                    - You MUST write your entire response in {detected_language}.
                    - Since the target language is {detected_language}, you must translate all retrieved context, weather data, and details into {detected_language} when generating the response.
                    - All keys in the output JSON (overview, recommendations, explanation, practical_tips, follow_up_question) must contain values written entirely in clear, natural {detected_language}.

                    First, internally classify the question type (do this silently):
                    - DIAGNOSTIC, ADVISORY, PLANNING, or INFORMATIONAL

                    Then generate your response using EXACTLY this output structure.

                    OUTPUT FORMAT (MUST BE A VALID JSON OBJECT ONLY):
                    {{
                      "overview": "Two short, direct sentences that answer the question with local context in {detected_language}. Acknowledge and build on previous conversation history if applicable.",
                      "recommendations": [
                        "clear actionable step 1 in {detected_language}",
                        "clear actionable step 2 in {detected_language}"
                      ],
                      "explanation": [
                        "key reason or important fact in {detected_language}",
                        "supporting local detail in {detected_language}"
                      ],
                      "practical_tips": [
                        "easy implementation tip in {detected_language}",
                        "monitoring or follow-up step in {detected_language}"
                      ],
                      "follow_up_question": "A friendly, conversational, and highly specific follow-up question in {detected_language} to ask the farmer (e.g. asking about their soil, irrigation frequency, severity of symptoms, crop variety, or local weather) to help gather more context for better advice."
                    }}

                    DEPTH REQUIREMENTS:
                    - Be extremely specific: name exact varieties, fertilizer types/rates, timing, and local practices.
                    - Prioritize low-cost, sustainable solutions for farmers.

                    FORMATTING RULES:
                    - Only output a pure JSON object. Do not wrap it in ```json blocks. Do not add any text before or after the JSON.
                    - You may use **bold** inside the strings for crop names, fertilizer types, and key numbers.
                    - Keep every array item very short and scannable (one idea only).
                    - Use simple, direct language. No long sentences.

                    STRICT RULES:
                    - Must be valid parsable JSON.
                    - Never skip any section.
                    - No greetings, no conclusions, no repetition.
                    - Stay concise — remove any repeated information.

                    CONTEXT:
                    {context_text}
                """

        if user_location:
            system_prompt += f"\nNote: The user's registered location/county is {user_location}. Use this for location-specific advice if relevant."

        # Define LLM for response generation
        llm_response = ChatGroq(
            model="openai/gpt-oss-120b",
            groq_api_key=os.getenv("GROQ_API_KEY"),
            temperature=0.3
        )

        # Define tools for LangChain
        from langchain_core.tools import tool
        
        @tool
        def get_weather(location: str):
            """Get the current weather (temperature, humidity, wind, rainfall) in a given location. Use this to provide location-specific agricultural advice."""
            return get_weather_data(location)

        tools = [get_weather]
        llm_with_tools = llm_response.bind_tools(tools)

        messages = [
            SystemMessage(content=system_prompt)
        ]
        
        # Load conversation history into LangChain messages
        for msg in chat_history[-8:]:
            if msg.get('role') == 'user':
                messages.append(HumanMessage(content=msg.get('content', '')))
            elif msg.get('role') == 'assistant':
                messages.append(AIMessage(content=msg.get('content', '')))
                
        # Append current message
        messages.append(HumanMessage(content=user_message))

        try:
            ai_msg = llm_with_tools.invoke(messages)
            
            if ai_msg.tool_calls:
                # Handle tool calls
                messages.append(ai_msg)
                for tool_call in ai_msg.tool_calls:
                    if tool_call["name"] == "get_weather":
                        tool_output = get_weather.invoke(tool_call["args"])
                        messages.append(ToolMessage(content=tool_output, tool_call_id=tool_call["id"]))
                
                # Get final response after tool execution with JSON format constraint
                final_msg = llm_response.bind(response_format={"type": "json_object"}).invoke(messages)
                reply = final_msg.content
            else:
                reply = ai_msg.content
                # Enforce valid JSON structure if not returned as one
                try:
                    json.loads(reply.strip())
                except Exception:
                    print("[AgriBot] Initial response was not valid JSON, formatting...")
                    formatting_prompt = f"""Format the following text into the exact JSON structure required by AgriBot:
Required JSON Structure:
{{
  "overview": "Overview text in {detected_language}",
  "recommendations": ["step 1", "step 2"],
  "explanation": ["reason 1", "reason 2"],
  "practical_tips": ["tip 1", "tip 2"],
  "follow_up_question": "follow up question in {detected_language}"
}}

Input Text:
{reply}

JSON Output:"""
                    format_msg = llm_response.bind(response_format={"type": "json_object"}).invoke([HumanMessage(content=formatting_prompt)])
                    reply = format_msg.content
                
        except Exception as e:
            print("LangChain Chat Error:", e)
            return JsonResponse({"response": "I encountered an error processing your request. Please try again."})

        # Process the reply to ensure it's clean JSON string
        reply = reply.strip()
        if reply.startswith("```json"):
            reply = reply[7:]
        if reply.startswith("```"):
            reply = reply[3:]
        if reply.endswith("```"):
            reply = reply[:-3]
        reply = reply.strip()

        # Update chat history in the session (keep last 5 turns / 10 messages)
        chat_history.append({'role': 'user', 'content': user_message})
        chat_history.append({'role': 'assistant', 'content': reply})
        request.session['chat_history'] = chat_history[-10:]
        request.session.modified = True

        # --- MONETIZATION: Deduct and Increment ---
        wallet.chat_count += 1
        if not is_free_trial:
            wallet.balance -= 10
        wallet.save()
        
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
        form = SignupFormbuyer(request.POST, request.FILES)
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
                email=form.cleaned_data.get("email"),
                photo=form.cleaned_data.get("photo"),
            )
            login(request, user, backend='django.contrib.auth.backends.ModelBackend')

            return redirect('page')
    else:
        form = SignupFormbuyer()
    return render(request, 'signup.html', {'form': form, 'user_type': 'Buyer'})

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
            login(request, user)
            
            # Respect the 'next' parameter if it exists
            next_url = request.GET.get('next')
            if next_url and url_has_allowed_host_and_scheme(
                next_url,
                allowed_hosts={request.get_host()},
                require_https=request.is_secure(),
            ):
                return redirect(next_url)
            
            if user.is_superuser:
                return redirect('revenue_dashboard')
            
            if hasattr(user, 'farmer_profile'):
                return redirect('page')
            elif hasattr(user, 'buyer_profile'):
                return redirect('buyer_dashboard_view')
            elif hasattr(user, 'buyer_profile'):
                return redirect('buyer_dashboard_view')
            else:
                return redirect('page')
    else:
        form = AuthenticationForm()
    return render(request, 'signin.html', {'form': form})

def signout_view(request):
    logout(request)
    return redirect('login')
@login_required(login_url='login')
@farmer_required
def fertiliser_view(request):
    return render(request,"fertiliser_page.html")

def homepage_view(request):
    return render(request,"homepage.html")

def privacy_policy_view(request):
    return render(request,"privacy_policy.html")
@login_required(login_url='login')
@farmer_required
@ratelimit(key='user_or_ip', rate='10/m', block=False)
def fertiliser_display(request):
    if request.method == 'GET':
        query = request.GET.get('query', '').strip()
        data = []
            
        # AI AGENT LAYER: Dynamic search via Tavily & LangGraph
        if query:
            external_results = run_agrovet_agent(query)
            # Add unique IDs to external results
            for i, item in enumerate(external_results):
                item['id'] = f"ai_ext_{i}"
            data.extend(external_results)
        else:
            # If no query, we could show a default or message. 
            # For now, we'll return an empty list or a prompt to search.
            pass

        return JsonResponse({'products': data})
@login_required(login_url='login')
@farmer_required
def market_view(request):
    return render(request,"market_buyers.html")

@login_required(login_url='login')
@farmer_required
def market_display(request):
    if request.method == "GET":
        qs = BuyerProfile.objects.all().order_by("first_name", "id")
        location = (request.GET.get("location") or "").strip()
        if location:
            qs = qs.filter(county__icontains=location)

        buyer_list = []
        for buyer in qs:
            location_label = ", ".join(
                part for part in [buyer.county, buyer.country] if part
            )
            photo_url = None
            if buyer.photo:
                try:
                    photo_url = request.build_absolute_uri(buyer.photo.url)
                except Exception:
                    photo_url = buyer.photo.url
            buyer_list.append(
                {
                    "id": buyer.id,
                    "name": buyer.first_name or buyer.user.get_username(),
                    "first_name": buyer.first_name,
                    "email": buyer.email,
                    "phone_number": buyer.phone_number or "",
                    "contact": buyer.phone_number or buyer.email or "",
                    "county": buyer.county or "",
                    "country": buyer.country or "",
                    "location": location_label,
                    "photo": photo_url,
                    # Registered via buyer signup = verified Ukulima Bora buyer
                    "verified": True,
                    "verification_badge": "Verified",
                }
            )
        return JsonResponse({"buyer_list": buyer_list, "count": len(buyer_list)})

@login_required(login_url='login')
@buyer_required
def farmer_view(request):
    return render(request, "farmers.html")

@login_required(login_url='login')
@buyer_required
def farmer_display(request):
    if request.method == "GET":
        farmers = FarmerProfile.objects.select_related("user").all()
        county_q = (request.GET.get("county") or request.GET.get("location") or "").strip()
        crop_q = (request.GET.get("crop") or request.GET.get("products") or "").strip()
        if county_q:
            farmers = farmers.filter(county__icontains=county_q)
        if crop_q:
            farmers = farmers.filter(products__icontains=crop_q)

        data = []
        for farmer in farmers:
            photo_url = None
            if farmer.profile_photo:
                try:
                    photo_url = request.build_absolute_uri(farmer.profile_photo.url)
                except Exception:
                    photo_url = farmer.profile_photo.url
            name = " ".join(
                part
                for part in [farmer.user.first_name, farmer.user.last_name]
                if part
            ).strip() or farmer.user.username
            location_label = ", ".join(
                part for part in [farmer.county, farmer.country] if part
            )
            data.append(
                {
                    "id": farmer.id,
                    "username": farmer.user.username,
                    "name": name,
                    "phone_number": farmer.phone_number or "",
                    "county": farmer.county or "",
                    "country": farmer.country or "",
                    "location": location_label,
                    "products": farmer.products or "",
                    "farm_name": farmer.farm_name or "",
                    "farm_size_acres": (
                        str(farmer.farm_size_acres)
                        if farmer.farm_size_acres is not None
                        else ""
                    ),
                    "photo": photo_url,
                }
            )
        return JsonResponse({"farmer_list": data, "count": len(data)})



@login_required(login_url='login')
@farmer_required
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
        
        # --- Opt-in for lending ---
        opt_in = request.POST.get('opt_in_for_lending') == 'on'
        health_profile = getattr(farmer_profile, 'health_profile', None)
        if health_profile:
            health_profile.opt_in_for_lending = opt_in
            health_profile.save()

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

    # Calculate Farm Health Score
    health_profile = calculate_farm_health_score(farmer_profile)

    context = {
        'farmer_profile': farmer_profile,
        'health_profile': health_profile,
        'crops_list': crops_list,
        'weather_data': weather_data,
        'success_message': success_message,
        'error_message': error_message,
        'wallet': request.user.wallet
    }
    return render(request, 'farmer_profile.html', context)

@method_decorator(ratelimit(key='ip', rate='3/m', block=False), name='dispatch')
@method_decorator(ratelimit(key='ip', rate='3/h', block=True), name='dispatch')
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
                 'site_name': 'Ukulima Bora'
            },
        }
        form.save(**opts)
        return super(PasswordResetView, self).form_valid(form)

@csrf_exempt
@ratelimit(key='ip', rate='30/m', block=True)
def farm_health_score_api(request):
    """Legacy function view — prefer accounts.PartnerFarmHealthScoreView."""
    from accounts.lending_auth import log_lending_usage, resolve_bearer_key
    from accounts.views import _farmer_score_payload

    if request.method != "GET":
        return JsonResponse({"error": "Method not allowed"}, status=405)

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return JsonResponse({"error": "Unauthorized"}, status=401)

    token = auth_header.split(" ", 1)[1].strip()
    lending_key, _legacy, err = resolve_bearer_key(token)
    if err:
        return JsonResponse({"error": err}, status=401)

    phone = request.GET.get("phone")
    if not phone:
        return JsonResponse({"error": "Phone parameter is required"}, status=400)

    payload, http_status, error = _farmer_score_payload(phone)
    log_lending_usage(lending_key=lending_key, phone=phone, http_status=http_status)
    if error:
        return JsonResponse({"error": error}, status=http_status)
    return JsonResponse(payload, status=http_status)


@login_required(login_url='login')
@buyer_required
def buyer_dashboard_view(request):
    try:
        buyer_profile = request.user.buyer_profile
    except BuyerProfile.DoesNotExist:
        return redirect('page')

    success_message = None

    if request.method == 'POST':
        first_name = request.POST.get('first_name', '').strip()
        email = request.POST.get('email', '').strip()
        phone_number = request.POST.get('phone_number', '').strip()
        county = request.POST.get('county', '').strip()
        country = request.POST.get('country', '').strip()

        # Update BuyerProfile
        if first_name: buyer_profile.first_name = first_name
        if email: buyer_profile.email = email
        if phone_number: buyer_profile.phone_number = phone_number
        if county: buyer_profile.county = county
        if country: buyer_profile.country = country
        
        buyer_profile.save()
        success_message = "Profile updated successfully."

    farmers = FarmerProfile.objects.all()

    context = {
        'buyer_profile': buyer_profile,
        'farmers': farmers,
        'success_message': success_message
    }
    return render(request, 'buyer_dashboard.html', context)


    return redirect('buyer_dashboard_view')

@csrf_exempt
@ratelimit(key='ip', rate='60/m', block=True)
def mpesa_callback(request):
    """Handles Safaricom's M-Pesa STK Push results."""
    from django.conf import settings as dj_settings
    from ipaddress import ip_address, ip_network

    allowlist = getattr(dj_settings, "MPESA_CALLBACK_ALLOWLIST", []) or []
    if allowlist and not getattr(dj_settings, "DEV_ENV", False):
        # Prefer reverse-proxy client IP when present.
        forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
        client_ip = (
            forwarded.split(",")[0].strip()
            if forwarded
            else request.META.get("REMOTE_ADDR", "")
        )
        try:
            addr = ip_address(client_ip)
            allowed = False
            for entry in allowlist:
                try:
                    if "/" in entry:
                        allowed = addr in ip_network(entry, strict=False)
                    else:
                        allowed = addr == ip_address(entry)
                except ValueError:
                    continue
                if allowed:
                    break
            if not allowed:
                return JsonResponse(
                    {"ResultCode": 1, "ResultDesc": "Forbidden"}, status=403
                )
        except ValueError:
            return JsonResponse(
                {"ResultCode": 1, "ResultDesc": "Forbidden"}, status=403
            )

    try:
        data = json.loads(request.body)
        stk_callback = data['Body']['stkCallback']
        result_code = stk_callback['ResultCode']
        checkout_request_id = stk_callback['CheckoutRequestID']

        with transaction.atomic():
            try:
                mpesa_txn = MpesaTransaction.objects.get(checkout_request_id=checkout_request_id)
                if result_code == 0:
                    # Success
                    mpesa_txn.status = 'Success'
                    # Extract receipt number (usually at index 1 of Item list)
                    meta = stk_callback['CallbackMetadata']['Item']
                    receipt = next((item['Value'] for item in meta if item['Name'] == 'MpesaReceiptNumber'), None)
                    mpesa_txn.receipt_number = receipt
                    mpesa_txn.save()

                    # Update Wallet or Subscription
                    user = mpesa_txn.user
                    # Update Wallet (Farmer/Buyer)
                    wallet = user.wallet
                    wallet.balance += mpesa_txn.amount
                    wallet.save()
                else:
                    mpesa_txn.status = 'Failed'
                    mpesa_txn.result_desc = stk_callback['ResultDesc']
                    mpesa_txn.save()
            except MpesaTransaction.DoesNotExist:
                pass
    except Exception as e:
        print("M-Pesa Callback Error:", e)

    return JsonResponse({"ResultCode": 0, "ResultDesc": "Accepted"})

@login_required(login_url='login')
@farmer_required
@ratelimit(key='user_or_ip', rate='3/m', block=True)
def initiate_topup(request):
    """Initiates an M-Pesa STK Push for wallet top-up."""
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            amount = data.get('amount')
            phone = data.get('phone_number')
        except json.JSONDecodeError:
            amount = request.POST.get('amount')
            phone = request.POST.get('phone_number')
        
        if not amount or not phone:
            return JsonResponse({"status": "Error", "message": "Amount and phone number are required."})

        callback_url = request.build_absolute_uri('/mpesa/callback/')
        response = mpesa_client.initiate_stk_push(phone, amount, callback_url)
        
        if 'CheckoutRequestID' in response:
            MpesaTransaction.objects.create(
                user=request.user,
                phone_number=phone,
                amount=amount,
                checkout_request_id=response['CheckoutRequestID'],
                merchant_request_id=response['MerchantRequestID']
            )
            return JsonResponse({"status": "Success", "message": "STK Push sent to your phone. Please enter your M-Pesa PIN."})
        else:
            return JsonResponse({"status": "Error", "message": response.get('errorMessage', 'Failed to initiate M-Pesa payment.')})
    return JsonResponse({"error": "Invalid request"}, status=400)

def admin_login(request):
    """Retired master-password entry point; use a staff account."""
    return redirect(f"/login?next=/admin/revenue/")

@login_required(login_url='login')
@staff_required
def revenue_dashboard(request):
    """Admin dashboard to track MRR, total revenue, and user metrics."""
    total_revenue = MpesaTransaction.objects.filter(status='Success').aggregate(Sum('amount'))['amount__sum'] or 0
    mrr = 0 # Agrovets removed
          
    recent_transactions = MpesaTransaction.objects.order_by('-created_at')[:20]
    
    context = {
        'total_revenue': total_revenue,
        'mrr': mrr,
        'recent_transactions': recent_transactions
    }
    return render(request, 'admin_revenue.html', context)