# Python ML Service Dockerfile
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/ ./app/
COPY models/ ./models/

# Create models directory if it doesn't exist
RUN mkdir -p ./models

# Expose port
EXPOSE 5000

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=5000
ENV HOST=0.0.0.0
ENV MODEL_PATH=./models

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5000"]
