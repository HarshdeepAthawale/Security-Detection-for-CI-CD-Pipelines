# Security Detection for CI/CD Pipelines - Backend

## Overview

Backend API server for Security Detection for CI/CD Pipelines. This server provides REST endpoints for analyzing CI/CD pipeline logs and detecting security drift over time.

## Project Structure

```
backend/
├── src/
│   ├── parsers/          # Log parsing modules (Phase 2)
│   ├── features/         # Feature extraction modules (Phase 2)
│   ├── model/            # Baseline model modules (Phase 3)
│   ├── detector/         # Drift detection modules (Phase 3)
│   ├── report/           # Report generation modules (Phase 4)
│   ├── api/              # API route handlers (Phase 4)
│   ├── utils/            # Utility functions
│   │   └── logger.js     # Logging utility
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

2. Set environment variables (optional):
   ```bash
   PORT=3001                    # Server port (default: 3001)
   FRONTEND_URL=http://localhost:3000  # Frontend URL for CORS
   NODE_ENV=development         # Environment mode
   LOG_LEVEL=INFO              # Log level (DEBUG, INFO, WARN, ERROR)
   ```

3. Start the server:
   ```bash
   npm start
   # or for development with auto-reload
   npm run dev
   ```

## API Endpoints

### Phase 1 (Current)

- `GET /` - API information
- `GET /health` - Health check endpoint

### Phase 4 (Upcoming)

- `POST /api/analyze` - Analyze CI/CD log for security drift
- `GET /api/history` - Get analysis history
- `POST /api/train` - Train/retrain baseline model

## Development Status

**Phase 1: ✅ Complete**
- Backend structure created
- Express server configured
- Logging utility implemented
- Basic health check endpoint

**Phase 2: ⏳ Next**
- Log parser implementation
- Feature extractor implementation

## Technology Stack

- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Dependencies**: express, cors, dotenv
