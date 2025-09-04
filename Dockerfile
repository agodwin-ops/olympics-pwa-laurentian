# Use Python 3.11 slim official image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Create and change to the app directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY apps/api/requirements.olympics.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY apps/api ./

# Railway FastAPI - Direct executable (no shell)
CMD ["hypercorn", "app.main_olympics_only:app", "--bind", "0.0.0.0:8080"]