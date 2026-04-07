# 🚀 How to Deploy AgriScan on Railway (For Free)

This guide provides a step-by-step walkthrough to deploy your Django application to Railway using Docker.

## 📋 Prerequisites
1. A **GitHub account**.
2. A **Railway account** (connected to GitHub).
3. All your code pushed to a GitHub repository.

---

## 🛠️ Step 1: Prepare Your Repository
Ensure the following files are in your project root:
- `Dockerfile`: (I have already created this for you).
- `requirements.txt`: (Includes `gunicorn`, `whitenoise`, and `dj-database-url`).
- `.dockerignore`: (Excludes unnecessary files to keep the build light).

---

## 🏗️ Step 2: Create a New Project on Railway
1. Go to [Railway.app](https://railway.app/) and log in.
2. Click **"+ New Project"**.
3. Select **"Deploy from GitHub repo"**.
4. Choose your `AgriScan` repository.
5. Click **"Deploy Now"**. (Note: The first build might fail until we fix the environment variables).

---

## 🗄️ Step 3: Add a PostgreSQL Database
1. In your Railway project dashboard, click **"+ Add"**.
2. Select **"Database"** and choose **"Add PostgreSQL"**.
3. Railway will provision the database and automatically inject a `DATABASE_URL` variable into your app service.

---

## ⚙️ Step 4: Configure Environment Variables
Go to the **Variables** tab of your app service on Railway and add the following:

| Key | Value |
|-----|-------|
| `SECRET_KEY` | (Your Django secret key) |
| `DEBUG` | `False` |
| `ALLOWED_HOSTS` | `*` |
| `GROQ_API_KEY` | (Your Groq API key) |
| `OPEN_WEATHER_API_KEY` | (Your OpenWeather API key) |
| `SENDGRID_API_KEY` | (Your SendGrid API key) |
| `EMAIL_HOST_USER` | `apikey` |
| `DEFAULT_FROM_EMAIL` | (Your verified SendGrid email) |

> [!NOTE]
> `DATABASE_URL` is managed by Railway automatically. Do not manually edit it unless you know what you are doing.

---

## 🚀 Step 5: Final Deployment
1. Once variables are added, Railway will automatically trigger a redeploy.
2. Watch the **Deployment Logs**. You should see:
    - 🔨 *Building Docker image...*
    - ⚙️ *Running migrations...*
    - 📦 *Collecting static files...*
    - ✅ *Server started!*
3. Once finished, click the generated URL (e.g., `agriscan-production.up.railway.app`) to view your live site!

---

## 🔍 Troubleshooting Tips
- **Migrations failed?** Check the logs in the "Deployments" tab. Sometimes you may need to manually run `python manage.py migrate` via the Railway "Web Shell" if the automatic command fails.
- **Styles missing?** Ensure `whitenoise` is in your `MIDDLEWARE` in `settings.py` (I have verified this is present).
- **Favicon/Images not showing?** Make sure you have pushed all your assets to GitHub.

---

> [!TIP]
> Each time you push new code to your GitHub `main` branch, Railway will automatically rebuild and redeploy your changes!
