# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 8000

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Environment variable to skip collectstatic during build if necessary, 
# but Railway usually handles it or we run it on startup.
# RUN python manage.py collectstatic --noinput

# Run the project
CMD sh -c "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn AgriProject.wsgi:application --bind 0.0.0.0:$PORT"
