# Security Detection for CI/CD Pipelines

A comprehensive platform for detecting security drift in CI/CD pipelines using machine learning and baseline comparison.

## Overview

This project provides a full-stack solution for monitoring and detecting security changes in CI/CD pipeline configurations. It analyzes pipeline logs, compares them against baseline models, and identifies potential security risks.

## Architecture

- **Frontend**: Next.js 16 with TypeScript, React 19, and Tailwind CSS
- **Backend**: Express.js with Node.js (ES Modules)
- **Database**: MongoDB for storing analysis history
- **ML Engine**: Custom drift detection algorithm with baseline modeling

## Project Structure

```
.
├── app/                    # Next.js app directory
│   ├── api/               # Next.js API proxy routes
│   ├── page.tsx           # Main dashboard
│   └── ...
├── backend/               # Backend Express server
│   ├── src/
│   │   ├── api/          # API route handlers
│   │   ├── detector/     # Drift detection engine
│   │   ├── features/     # Feature extraction
│   │   ├── model/        # Baseline model
│   │   ├── parsers/      # Log parsers
│   │   └── report/       # Report generation
│   └── data/             # Sample data and models
├── components/           # React components
│   ├── dashboard/       # Dashboard components
│   └── ui/              # UI components
└── lib/                 # Shared utilities and types
```

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- MongoDB (local or Atlas)

### Initial Setup (First Time)

1. **Install dependencies** (frontend and backend)
2. **Set up MongoDB** and configure connection
3. **Train initial baseline model** (required for drift detection):
   ```bash
   cd backend
   node src/scripts/train-baseline.js
   ```
4. **Start both servers** and begin analyzing pipelines

### Installation

1. **Clone the repository** (if applicable)

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Install backend dependencies**:
   ```bash
   cd backend
   npm install
   cd ..
   ```

4. **Set up environment variables**:

   **Backend** (create `backend/.env`):
   ```bash
   PORT=3001
   FRONTEND_URL=http://localhost:3000
   NODE_ENV=development
   LOG_LEVEL=INFO
   MONGODB_URI=mongodb://localhost:27017/security-drift
   ```

   **Frontend** (create `.env.local` in root, optional):
   ```bash
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

5. **Start MongoDB**:
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community
   
   # On Linux
   sudo systemctl start mongod
   
   # Or run directly
   mongod
   ```

### Running the Application

**Option 1: Run both servers separately** (recommended for development)

Terminal 1 - Backend:
```bash
cd backend
npm start
```

Terminal 2 - Frontend:
```bash
npm run dev
```

**Option 2: Run backend only** (if frontend is already running)
```bash
npm run dev:backend
```

The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## API Endpoints

### Backend API (Port 3001)

- `GET /` - API information
- `GET /health` - Health check
- `POST /api/analyze` - Analyze CI/CD log for security drift
- `GET /api/history` - Get analysis history and timeline
- `POST /api/train` - Train/retrain baseline model

### Frontend API Proxy (Port 3000)

- `POST /api/analyze` - Proxies to backend `/api/analyze`
- `GET /api/history` - Proxies to backend `/api/history`

## Usage

### Analyzing a Pipeline

1. **Prepare your CI/CD log** in the expected format (see `backend/data/logs/` for examples)

2. **Send analysis request**:
   ```bash
   curl -X POST http://localhost:3001/api/analyze \
     -H "Content-Type: application/json" \
     -d '{
       "pipeline": "my-pipeline",
       "log": {
         "pipeline": "my-pipeline",
         "timestamp": "2024-01-15T10:00:00.000Z",
         "steps": [...]
       }
     }'
   ```

3. **View results** in the dashboard at http://localhost:3000

### Training a Baseline Model

**Option 1: Using the Training Script (Recommended for Initial Setup)**

The easiest way to create an initial baseline model is using the provided script:

```bash
cd backend
node src/scripts/train-baseline.js
```

This script will:
- Load the sample baseline log from `backend/data/logs/sample-baseline.json`
- Train a baseline model from it
- Save the model to `backend/data/models/baseline-model.json`

**Option 2: Using the API Endpoint**

You can also train a baseline model via the API:

```bash
curl -X POST http://localhost:3001/api/train \
  -H "Content-Type: application/json" \
  -d '{
    "baselineLogs": [...],
    "modelName": "my-baseline"
  }'
```

**Note**: The system requires a baseline model to detect drift. Make sure to train a baseline model before analyzing pipelines.

## Sample Data

Sample CI/CD logs are available in `backend/data/logs/`:
- `sample-baseline.json` - Baseline secure pipeline
- `sample-drifted.json` - Pipeline with security drift
- `sample-critical.json` - Pipeline with critical security issues

## Development

### Project Phases

- ✅ **Phase 1**: Backend Foundation
- ✅ **Phase 2**: Data Processing (Parsers & Feature Extraction)
- ✅ **Phase 3**: ML Detection Engine
- ✅ **Phase 4**: API & Reporting
- ✅ **Phase 5**: Frontend Integration

### Code Structure

- **Backend**: ES Modules, Express.js, MongoDB
- **Frontend**: Next.js App Router, TypeScript, React Server Components
- **Styling**: Tailwind CSS with shadcn/ui components

### Testing

Test the backend API:
```bash
cd backend
node src/test-api.js
```

## Troubleshooting

### Backend won't start

- Check MongoDB is running: `mongosh` or check MongoDB service
- Verify environment variables in `backend/.env`
- Check port 3001 is not in use

### Frontend can't connect to backend

- Ensure backend is running on port 3001
- Check `NEXT_PUBLIC_API_URL` in `.env.local` (if set)
- Verify CORS settings in backend (should allow `http://localhost:3000`)

### No data in dashboard

- Ensure backend is running and accessible
- Check browser console for errors
- Verify MongoDB connection and that analyses have been stored
- **Ensure a baseline model exists** - Run `node backend/src/scripts/train-baseline.js` if needed
- Try analyzing a sample log first

### Baseline model not found

- Train the initial baseline model: `cd backend && node src/scripts/train-baseline.js`
- Verify the model file exists: `ls backend/data/models/baseline-model.json`
- Check backend logs for model loading errors

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend server port | `3001` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` |
| `LOG_LEVEL` | Logging level | `INFO` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/security-drift` |

### Frontend (`.env.local`, optional)

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3000` (uses proxy) |

## Documentation

- [Phase 1: Backend Foundation](./docs/phases/phase-1-backend-foundation.md)
- [Phase 2: Data Processing](./docs/phases/phase-2-data-processing.md)
- [Phase 3: ML Detection Engine](./docs/phases/phase-3-ml-detection-engine.md)
- [Phase 4: API & Reporting](./docs/phases/phase-4-api-reporting.md)
- [Phase 5: Frontend Integration](./docs/phases/phase-5-frontend-integration.md)

## License

[Add your license here]

## Contributing

[Add contributing guidelines here]
