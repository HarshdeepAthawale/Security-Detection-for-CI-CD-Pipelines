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

## API Endpoints

- `GET /` - API information
- `GET /health` - Health check endpoint
- `POST /api/analyze` - Analyze CI/CD log for security drift
- `GET /api/history` - Get analysis history and timeline data
- `GET /api/pipelines/:pipelineName` - Get pipeline comparison data (baseline vs current)
- `POST /api/train` - Train/retrain baseline model

## Training Baseline Model

Before the system can detect drift, you need to train a baseline model. The baseline model represents the "normal" or "secure" state of your CI/CD pipeline.

### Quick Start: Train Initial Baseline

Use the provided script to train a baseline model from sample data:

```bash
node src/scripts/train-baseline.js
```

This will:
1. Load `backend/data/logs/sample-baseline.json`
2. Process and extract features from the baseline log
3. Train a statistical baseline model
4. Save the model to `backend/data/models/baseline-model.json`

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
