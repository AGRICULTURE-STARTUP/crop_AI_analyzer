# Legacy single-image build (local / Railway fallback). Prefer Dockerfile.api + Dockerfile.worker.
FROM python:3.10-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    git \
    git-lfs \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-api.txt requirements-scanner.txt requirements-rag.txt requirements.txt /app/
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements-scanner.txt && \
    pip install --no-cache-dir -r requirements-rag.txt

COPY . /app/

RUN SECRET_KEY=dummy-key-for-building-only DATABASE_URL="" DEBUG=True \
    python manage.py collectstatic --noinput || true

CMD ["sh", "-c", "python manage.py migrate && gunicorn AgriProject.wsgi:application --bind 0.0.0.0:$PORT"]
