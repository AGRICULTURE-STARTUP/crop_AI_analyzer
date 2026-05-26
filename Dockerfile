# Use an official Python runtime as a parent image
FROM python:3.10-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 10000
EXPOSE 10000

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    gcc \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/*


# Install dependencies
COPY requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy project
COPY . /app/

# Run collectstatic during the build phase to avoid slow startups
RUN SECRET_KEY=dummy-key-for-building-only DATABASE_URL="" python manage.py collectstatic --noinput

# Run the project
CMD ["sh", "-c", "python manage.py migrate && gunicorn AgriProject.wsgi:application --bind 0.0.0.0:$PORT"]

