# Multi-stage build for Olympics PWA - Railway deployment
FROM node:20-alpine AS frontend-build

# Build Next.js frontend
WORKDIR /app/frontend
COPY apps/web/package.json ./
RUN npm install --production=false

COPY apps/web ./
RUN npm run build

# Python backend stage
FROM python:3.11-slim AS backend

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy and install Python dependencies
COPY apps/api/requirements.olympics.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY apps/api ./

# Copy built frontend (for serving static files if needed)
COPY --from=frontend-build /app/frontend/.next/static ./static/
COPY --from=frontend-build /app/frontend/public ./public/

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start command - Railway will use PORT env var
CMD ["python", "-m", "uvicorn", "app.main_olympics_only:app", "--host", "0.0.0.0", "--port", "8080"]