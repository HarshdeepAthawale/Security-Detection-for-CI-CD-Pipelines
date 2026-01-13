#!/bin/bash
# Script to restart the backend server

echo "Stopping existing backend server..."
pkill -f "node.*server.js" || echo "No server process found"

sleep 2

echo "Starting backend server..."
cd backend
node src/server.js &
BACKEND_PID=$!

sleep 3

echo "Checking if server started..."
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend server started (PID: $BACKEND_PID)"
    echo "Testing health endpoint..."
    curl -s http://localhost:3001/health | jq .
else
    echo "❌ Backend server failed to start"
    exit 1
fi
