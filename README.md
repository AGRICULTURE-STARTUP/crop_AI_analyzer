# 🌾 AgriScan

AgriScan is an AI-powered agricultural platform that integrates crop disease detection, a multilingual AI assistant, and a role-based agricultural marketplace into a unified system.

Originally built as a computer vision project, it has evolved into a full-stack, CI/CD-enabled, production-oriented AI system.

## 🚜 Problem Statement

### Farmers face three systemic challenges:
- Delayed identification of crop diseases
- Limited access to reliable agricultural guidance
- Fragmented access to buyers and agrovet agencies
AgriScan addresses these gaps using computer vision, large language models, and a structured multi-role platform.

## 🌱 Core Features
1.AI Crop Disease Detection
2.Leaf image upload
3.Real-time AI prediction
4.Treatment recommendations


## Multilingual AI Agricultural Assistant
- English & Kiswahili support
- Context-aware agricultural responses
- Decision-support guidance for farmers

## Role-Based Authentication
- Role	Capabilities
- Farmer	Scan crops, use AI assistant, find buyers
- Buyer / Market	Discover farmers and agricultural produce
- Agency (Fertilizer/Pesticide)	Connect with farmers and list services
- Admin	Platform moderation and management
## Agricultural Marketplace
- Farmer-to-buyer discovery
- Buyer-to-farmer sourcing
- Verified agrovet agency connections
## AI & Models
- MobileNet Pretrained computer vision model
* Model	Purpose
- Custom disease classification
- MobileNetV2	Lightweight optimized deployment
### LLM Integration
- Ollama
- Groq API

## 📊 Model Performance
Metric	            Value
Accuracy	          97%
Loss	              0.1087
Validation Accuracy	85.56%

### ⚙️ Tech Stack
Backend
- Django
- Python
- PostgreSQL
AI
- TensorFlow 
- LLM via Ollama + Groq
DevOps
- Jenkins
- CI/CD pipeline

## Production configuration ready

### 🔐 Security & Engineering Standards
- Role-based access control
- Secure password hashing
- Environment variable configuration
- DEBUG disabled in production
- Structured database schema
- CI/CD enforced builds

### How to use
*awaiting deployement*
