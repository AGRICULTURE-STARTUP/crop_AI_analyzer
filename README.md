# 🌾 AgriScan: Empowering Agriculture with AI

[![Python](https://img.shields.io/badge/Python-3.10-blue?logo=python)](https://www.python.org/)
[![Django](https://img.shields.io/badge/Django-5.2-092e20?logo=django)](https://www.djangoproject.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-2.19-FF6F00?logo=tensorflow)](https://www.tensorflow.org/)
[![Railway](https://img.shields.io/badge/Deployed_on-Railway-0B0D0E?logo=railway)](https://railway.app/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

**AgriScan** is a cutting-edge, AI-powered agricultural platform designed to bridge the gap between technology and traditional farming. By integrating advanced Computer Vision, Multilingual LLMs, and a decentralized Marketplace, AgriScan empowers farmers to make data-driven decisions and connect directly with the agricultural ecosystem.

---

## 🚀 Vision
To build a sustainable agricultural future where every farmer has an AI agronomist in their pocket, reducing crop loss and ensuring global food security.

## ✨ Key Features

### 🔍 AI Crop Diagnosis
- **Multi-Crop Support**: Detects diseases in Maize, Potato, Tomato, Beans, Wheat, and more.
- **Instant Analysis**: High-speed leaf scan analysis powered by **MobileNetV2**.
- **97% Accuracy**: Fine-tuned deep learning models ensuring reliable diagnosis.

### 🤖 AgriBot: Multilingual AI Assistant
- **RAG-Enabled**: Uses Retrieval-Augmented Generation (LangChain + ChromaDB) for context-aware advice.
- **Multilingual**: Supports **English** and **Kiswahili** to cater to diverse farming communities.
- **Weather Integration**: Smart advice based on local weather conditions via API.

### 🏪 Role-Based Marketplace
- **Farmer Profile**: List produce, find buyers, and get specialized advice.
- **Buyer/Market**: Discover fresh produce directly from the source.
- **Agro-Agencies**: Connect with farmers to provide fertilizers, seeds, and pesticides.

---

## 🛠️ Technical Architecture

### Artificial Intelligence Stack
- **Vision Model**: `EfficientNet`/`MobileNetV2` backbone with custom transfer learning.
- **Embedding Engine**: `all-MiniLM-L6-v2` via HuggingFace for semantic search.
- **Vector Database**: `ChromaDB` for high-performance knowledge retrieval.
- **LLM Reasoning**: Powered by **Groq / Llama-3.1-8b** for ultra-fast, intelligent conversations.

### Backend Infrastructure
- **Framework**: Django REST Framework.
- **Database**: PostgreSQL (Production) / SQLite (Development).
- **Security**: Role-Based Access Control (RBAC), Secure Cookie Session Management, and CSRF Protection.
- **Static Assets**: Optimized with WhiteNoise for efficient container delivery.

---

## 📦 Installation & Setup

### Local Development
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/yourusername/AgriScan.git
   cd AgriScan
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
   OPEN_WEATHER_API_KEY=your_weather_key
   ```
4. **Run Migrations & Start Server**:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

### Production Deployment (Railway)
AgriScan is pre-configured for **Railway** via Docker. The system automatically handles migrations and static file collection on startup.

> [!IMPORTANT]
> When deploying to Railway, ensure the `PORT` environment variable is set to `8000` and the `DATABASE_URL` is provisioned.

---

## 📊 Analytics
| Metric | Performance |
|--------|-------------|
| **Training Accuracy** | 97.2% |
| **Validation Accuracy** | 85.6% |
| **Average Inference Time** | 240ms |
| **Model Type** | MobileNetV2 (Fine-tuned) |

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
