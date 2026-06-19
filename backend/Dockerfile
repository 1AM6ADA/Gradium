# syntax=docker/dockerfile:1
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    HOME=/app

# System dependencies:
#  - libreoffice-impress: converts uploaded PPTX/PPT slides to PDF for the AI
#  - fonts-dejavu / fonts-liberation: readable text in the rendered PDFs
#  - curl: container healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
        libreoffice-impress \
        fonts-dejavu \
        fonts-liberation \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Writable dirs for uploads and the SQLite database
RUN mkdir -p uploads

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
