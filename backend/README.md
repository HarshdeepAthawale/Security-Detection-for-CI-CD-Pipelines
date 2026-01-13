# Security Detection for CI/CD Pipelines - Backend

## Overview

Backend API server for Security Detection for CI/CD Pipelines. This server provides REST endpoints for analyzing CI/CD pipeline logs and detecting security drift over time.

## Project Structure

```
backend/
├── src/
│   ├── parsers/          # Log parsing modules
│   ├── features/         # Feature extraction modules
│   ├── model/            # Baseline model modules
│   ├── detector/         # Drift detection modules
│   ├── report/           # Report generation modules
│   ├── api/              # API route handlers
│   ├── scripts/          # Utility scripts
│   │   └── train-baseline.js  # Baseline model training script
│   ├── utils/            # Utility functions
│   │   ├── logger.js     # Logging utility
│   │   ├── database.js   # MongoDB connection
│   │   └── storage.js    # Data storage operations
│   └── server.js         # Express server entry point
├── data/
│   ├── logs/             # CI/CD log storage
│   └── models/           # Trained baseline models
├── package.json
└── README.md
```

## Setup

1. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

2. Set up MongoDB:
   - Install MongoDB locally or use MongoDB Atlas (cloud)
   - Start MongoDB service (if running locally):
     ```bash
     # On macOS with Homebrew
     brew services start mongodb-community
     
     # On Linux
     sudo systemctl start mongod
     
     # Or run directly
     mongod
     ```

3. Set environment variables:
   Create a `.env` file in the backend directory:
   ```bash
   PORT=3001                    # Server port (default: 3001)
   FRONTEND_URL=http://localhost:3000  # Frontend URL for CORS
   NODE_ENV=development         # Environment mode
   LOG_LEVEL=INFO              # Log level (DEBUG, INFO, WARN, ERROR)
   MONGODB_URI=mongodb://localhost:27017/security-drift  # MongoDB connection string
   MONGODB_DB_NAME=security-drift  # Database name (optional, can be in URI)
   
   # ML Service Configuration
   ML_SERVICE_URL=http://localhost:5000  # Python ML service URL
   ML_SERVICE_TIMEOUT=5000               # Request timeout in ms
   ML_SERVICE_RETRY_ATTEMPTS=3          # Number of retry attempts
   ```
   
   For MongoDB Atlas (cloud):
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/security-drift
   ```

4. Start the server:
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

## ML Service Dependency

**Important**: This backend requires the Python ML service to be running. The ML service handles all drift detection using Isolation Forest algorithm.

**Start ML Service First**:
```bash
# From project root
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 5000
```

Or use Docker Compose (see root `docker-compose.yml`):
```bash
docker-compose up ml-service
```

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check endpoint
- `POST /api/analyze` - Analyze CI/CD log for security drift (uses ML service)
- `GET /api/history` - Get analysis history and timeline data
- `GET /api/pipelines/:pipelineName` - Get pipeline comparison data (baseline vs current)
- `POST /api/train` - Train/retrain ML model (sends data to ML service)

## Training ML Model

Before the system can detect drift, you need to train the ML model. The model learns the "normal" or "secure" state of your CI/CD pipeline.

**Prerequisites**:
- ML service must be running on port 5000
- At least 2 baseline pipeline logs are required

### Quick Start: Train Initial Model

**Option 1: Using API Endpoint**

Send baseline logs to the training endpoint:

```bash
curl -X POST http://localhost:3001/api/train \
  -H "Content-Type: application/json" \
  -d '{
    "baselineLogs": [
      { /* baseline log 1 */ },
      { /* baseline log 2 */ }
    ]
  }'
```

**Option 2: Using Training Script** (if updated)

The training script needs to be updated to work with ML service. For now, use the API endpoint directly.

**What happens**:
1. Backend extracts features from baseline logs
2. Feature vectors are sent to ML service (`/train` endpoint)
3. ML service trains Isolation Forest model
4. Model is saved to `ml-service/models/baseline_model.pkl`

### Training Custom Baseline

To train a baseline from your own pipeline logs:

1. Prepare your baseline logs (array of CI/CD log objects)
2. Use the `/api/train` endpoint:

```bash
curl -X POST http://localhost:3001/api/train \
  -H "Content-Type: application/json" \
  -d '{
    "baselineLogs": [
      { "pipeline": "my-pipeline", "timestamp": "...", "steps": [...] },
      { "pipeline": "my-pipeline", "timestamp": "...", "steps": [...] }
    ],
    "modelName": "my-baseline"
  }'
```

**Requirements**:
- At least 2 baseline logs are required
- All logs must be valid and parseable
- Logs should represent the "secure" baseline state

### Model Storage

- Models are saved as JSON files in `backend/data/models/`
- Default model: `baseline-model.json`
- Custom models: `{modelName}-model.json`
- The detector automatically loads the default model on startup

## Development Status

**All Phases: ✅ Complete**
- Backend structure and server
- Log parsing and feature extraction
- ML detection engine with baseline modeling
- API endpoints and report generation
- MongoDB integration for data persistence

## Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: MongoDB
- **Dependencies**: express, cors, dotenv, mongodb

## Database

The application uses MongoDB to store analysis history. The database connection is established automatically when the server starts.

### Collections

- **analyses**: Stores drift analysis results
  - Indexed on: `id` (unique), `timestamp`, `pipelineName`

### MongoDB Connection

The server will attempt to connect to MongoDB on startup. If the connection fails, the server will still start but database operations will fail. Make sure MongoDB is running before starting the server.

### Environment Variables

- `MONGODB_URI`: MongoDB connection string (default: `mongodb://localhost:27017/security-drift`)
- `MONGODB_DB_NAME`: Database name (optional if included in URI)
