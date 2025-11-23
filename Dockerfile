# Base image
FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# 🌟 CRITICAL FIX: Run collectstatic during the BUILD process (as a RUN command)
# This ensures the ./staticfiles directory is available for Render's CDN to copy.
RUN python manage.py collectstatic --noinput

# Expose Django port
EXPOSE 8000

# 🌟 REVISED CMD: Only run migrations and start the server (collectstatic is now done)
CMD ["sh", "-c", "python manage.py migrate --noinput && gunicorn AgriProject.wsgi:application --bind 0.0.0.0:8000"]