# Use Python 3.11 slim official image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Create non-root user for better security
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

# Install system dependencies as root
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create and set permissions for app directory
RUN mkdir -p /app && chown -R appuser:appuser /app
WORKDIR /app

# Switch to non-root user
USER appuser

# Copy and install Python dependencies as non-root user
COPY --chown=appuser:appuser apps/api/requirements.olympics.txt ./requirements.txt
RUN pip install --user --no-cache-dir -r requirements.txt

# Add user's pip bin directory to PATH
ENV PATH="/home/appuser/.local/bin:${PATH}"

# Copy backend application with proper ownership
COPY --chown=appuser:appuser apps/api ./

# Render FastAPI - Direct executable (no shell) as non-root user
CMD ["hypercorn", "app.main_olympics_only:app", "--bind", "0.0.0.0:8080"]