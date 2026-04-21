# 🌾 AgriScan: Empowering Agriculture with AI

[![Python](https://img.shields.io/badge/Python-3.10-blue?logo=python)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.2-092e20?logo=django)](https://www.djangoproject.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.19-FF6F00?logo=tensorflow)](https://www.tensorflow.org/)
[![Railway](https://img.shields.io/badge/Deployed_on-Railway-0B0D0E?logo=railway)](https://railway.app/)
[![Cloudinary](https://img.shields.io/badge/Storage-Cloudinary-0078d7?logo=cloudinary)](https://cloudinary.com/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**AgriScan** is a cutting-edge, AI-powered agricultural platform designed to bridge the gap between technology and traditional farming. By integrating advanced Computer Vision, Multilingual LLMs, and a decentralized Marketplace, AgriScan empowers farmers to make data-driven decisions and connect directly with the agricultural ecosystem.

---

## 🚀 Vision
To build a sustainable agricultural future where every farmer has an AI agronomist in their pocket, reducing crop loss and ensuring global food security.

## ✨ Key Features

### 🔍 AI Crop Diagnosis & Gatekeeper
- **Multi-Crop Support**: Detects diseases in Maize, Potato, Tomato, Beans, Wheat, and more.
- **Smart Filtering**: Integrated **EfficientNetB0 Gatekeeper** ensures only plant-related images are processed, increasing system trust.
- **Instant Analysis**: High-speed leaf scan analysis powered by MobileNetV2.
- **97% Accuracy**: Fine-tuned deep learning models ensuring reliable diagnosis.

### 🤖 AgriBot: Multilingual AI Assistant
- **RAG-Enabled**: Uses Retrieval-Augmented Generation (LangChain + ChromaDB) for context-aware advice.
- **Multilingual**: Supports **English** and **Kiswahili** to cater to diverse farming communities.
- **Tool-Calling**: Capable of fetching real-time weather data to provide location-specific advice.

### 🏪 Role-Based Marketplace (RBAC)
- **Farmer Profile**: List produce, find buyers, and get specialized advice.
- **Buyer/Market**: Discover fresh produce directly from the source.
- **Agro-Agencies**: Connect with farmers to provide fertilizers, seeds, and pesticides.

### 💰 Micro-Lending & Farm Health Score
- **Dynamic Scoring**: Generates a verifiable Farm Health Score (300-850) factoring in AI scan frequency, healthy crop ratios, and marketplace transactions.
- **Fintech Integration API**: Secure, token-authorized REST API for partnered financial institutions to retrieve real-time farmer risk tiers.
- **Consent-based Data Sharing**: Built-in privacy controls allowing farmers to explicitly opt-in to share their digital footprints to unlock non-collateral loans.

---

## 📱 Native Mobile Experience
AgriScan is optimized for mobile via **CapacitorJS**, enabling:
- **Native Camera Integration**: High-resolution image capture for AI scanning.
- **Offline Readiness**: Future support for TFLite edge inference.
- **Android/iOS Packaging**: Standardized builds for deployment on mobile app stores.

---

## 🛠️ Technical Architecture

### Artificial Intelligence Stack
- **Vision Model**: `EfficientNet`/`MobileNetV2` backbone with custom transfer learning.
- **Gatekeeper OOD Filter**: `EfficientNetB0` with an ImageNet-based whitelist.
- **Embedding Engine**: `all-MiniLM-L6-v2` via HuggingFace for semantic search.
- **Vector Database**: `ChromaDB` for high-performance knowledge retrieval.
- **LLM Reasoning**: Powered by **Groq / Llama-3.3-70b** for ultra-fast, intelligent conversations.

### Backend Infrastructure
- **Framework**: Django 5.x with Django REST Framework.
- **Storage**: **Cloudinary** for persistent media storage in production.
- **Database**: PostgreSQL (Production) / SQLite (Development).
- **Security**: Role-Based Access Control (RBAC), Rate Limiting (`django-ratelimit`), and CSRF Protection.

---

## 📦 Installation & Setup

### Local Development
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/jobcode003/AgriScan.git
   cd crop_AI_analyzer
   ```
2. **Setup Virtual Environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```
3. **Configure Environment Variables**:
   Create a `.env` file and add:
   ```env
   SECRET_KEY=your_key
   DEBUG=True
   GROQ_API_KEY=your_groq_key
   HF_TOKEN=your_huggingface_token
   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
   ```
4. **Run Migrations & Start Server**:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

### Production Deployment (Railway)
AgriScan is pre-configured for **Railway** via Docker. 

> [!IMPORTANT]
> Ensure the `CLOUDINARY_URL` is set in your Railway environment variables to enable persistent storage for user uploads.

---

## 📊 Analytics
| Metric                     | Performance              |
| -------------------------- | ------------------------ |
| **Training Accuracy**      | 97.2%                    |
| **Validation Accuracy**    | 85.6%                    |
| **Average Inference Time** | 240ms                    |
| **Model Type**             | MobileNetV2 (Fine-tuned) |

---

## 🤝 Contributing
Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.

## 📬 Contact
**Job Nyaribari** - Founder & AI Lead - [Email](mailto:jobnyaribari808@gmail.com)

Project Link: [https://github.com/jobcode003/AgriScan](https://github.com/jobcode003/AgriScan)
