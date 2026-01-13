#!/bin/bash

# Start script for Security Detection for CI/CD Pipelines
# Starts both ML service and backend

echo "Starting Security Detection Services..."

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is not installed"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Start ML service in background
echo "Starting ML service on port 5000..."
cd ml-service
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1

# Create models directory if it doesn't exist
mkdir -p models

# Start ML service
uvicorn app.main:app --host 0.0.0.0 --port 5000 &
ML_PID=$!
echo "ML service started (PID: $ML_PID)"

# Wait for ML service to be ready
echo "Waiting for ML service to be ready..."
sleep 3

# Check if ML service is running
if ! curl -s http://localhost:5000/health > /dev/null; then
    echo "Warning: ML service health check failed"
fi

# Start backend
echo "Starting backend on port 3001..."
cd ../backend

# Install backend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi

# Start backend
npm start &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID)"

echo ""
echo "Services started successfully!"
echo "  ML Service: http://localhost:5000"
echo "  Backend API: http://localhost:3001"
echo ""
echo "To stop services, press Ctrl+C or run:"
echo "  kill $ML_PID $BACKEND_PID"

# Wait for user interrupt
trap "kill $ML_PID $BACKEND_PID 2>/dev/null; exit" INT TERM
wait
