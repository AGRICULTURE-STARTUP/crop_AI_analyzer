# AgriScan: Google Cloud Platform (Cloud Run) Deployment Guide

This guide provides a step-by-step walkthrough to deploy your Django application to **Google Cloud Run** for free (within the "Always Free" tier limits).

---

## 1. Prerequisites
1.  **GCP Account**: Create an account at [console.cloud.google.com](https://console.cloud.google.com/).
2.  **Billing Account**: Activate a billing account. You won't be charged if you stay within the free limits, but it's required for service activation.
3.  **GCloud CLI**: Install the Google Cloud SDK on your local machine.
4.  **External Database**: Since Cloud SQL is not free, create a free PostgreSQL database on [Neon.tech](https://neon.tech/) or [Supabase](https://supabase.com/) and copy the connection string.

---

## 2. Project Initialization
Run these commands in your terminal:

```bash
# Login to your account
gcloud auth login

# Create a new project (replace [PROJECT_ID] with a unique name)
gcloud projects create [PROJECT_ID]

# Set the project as your default
gcloud config set project [PROJECT_ID]

# Enable necessary APIs
gcloud services enable run.googleapis.com \
                       containerregistry.googleapis.com \
                       artifactregistry.googleapis.com \
                       cloudbuild.googleapis.com
```

---

## 3. Configure Artifact Registry
Create a repository to store your Docker image:

```bash
gcloud artifacts repositories create agriscan-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Docker repository for AgriScan"
```

---

## 4. Build and Push the Image
We will use Cloud Build to build your image directly from your local source and push it to the Registry:

```bash
# Build the image (us-central1 is used for the free tier)
gcloud builds submit --tag us-central1-docker.pkg.dev/[PROJECT_ID]/agriscan-repo/agriscan-app .
```

---

## 5. Deploy to Cloud Run
Deploy the application and set up your environment secrets:

```bash
gcloud run deploy agriscan-service \
    --image us-central1-docker.pkg.dev/[PROJECT_ID]/agriscan-repo/agriscan-app \
    --platform managed \
    --region us-central1 \
    --allow-unauthenticated \
    --set-env-vars "DATABASE_URL=[YOUR_DATABASE_URL]" \
    --set-env-vars "SECRET_KEY=[YOUR_SECRET_KEY]" \
    --set-env-vars "DEBUG=False" \
    --set-env-vars "GROQ_API_KEY=[YOUR_KEY]" \
    --set-env-vars "SENDGRID_API_KEY=[YOUR_KEY]"
```

> [!TIP]
> **Port Handling**: Cloud Run automatically listens on the port provided by the `PORT` environment variable. Our Dockerfile is already pre-configured to handle this.

---

## 6. Post-Deployment
1.  **Get URL**: After deployment, the CLI will output a "Service URL".
2.  **Update Settings**: If the site doesn't load, ensure your `CSRF_TRUSTED_ORIGINS` in `settings.py` contains your new URL (e.g., `https://agriscan-service-xyz.a.run.app`).
3.  **Migrations**: The Dockerfile is configured to run `python manage.py migrate` on every startup, so your database will stay updated automatically.

---

## 7. Free Tier Maintenance
To ensure you stay within the free tier:
-   **Region**: Use `us-central1`, `us-east1`, or `us-west1`.
-   **CPU/Memory**: The default Cloud Run settings (1 vCPU, 512MB/1GB RAM) are well within the 180,000 vCPU-seconds and 360,000 GiB-seconds free limits.
-   **Requests**: First 2 million requests per month are free.
