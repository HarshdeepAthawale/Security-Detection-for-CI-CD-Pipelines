# ML Service - Security Drift Detection

Python-based ML service for detecting security drift in CI/CD pipelines using Isolation Forest algorithm.

## Overview

This service provides machine learning capabilities for the Security Detection for CI/CD Pipelines platform. It uses scikit-learn's Isolation Forest algorithm to detect anomalies in pipeline feature vectors.

## Architecture

- **Framework**: FastAPI
- **ML Algorithm**: Isolation Forest (scikit-learn)
- **Model Storage**: Joblib (.pkl files)
- **Port**: 5000 (default)

## Setup

### Prerequisites

- Python 3.11 or higher
- pip

### Installation

1. **Install dependencies**:
   ```bash
   cd ml-service
   pip install -r requirements.txt
   ```

2. **Set environment variables** (optional):
   Create a `.env` file:
   ```bash
   MODEL_PATH=./models
   PORT=5000
   HOST=0.0.0.0
   ```

3. **Create models directory**:
   ```bash
   mkdir -p models
   ```

## Running the Service

### Development Mode

```bash
# From ml-service directory
uvicorn app.main:app --reload --port 5000
```

Or using Python directly:
```bash
python -m app.main
```

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 5000
```

### Using Docker

```bash
# Build image
docker build -t ml-service .

# Run container
docker run -p 5000:5000 -v $(pwd)/models:/app/models ml-service
```

## API Endpoints

### POST /predict

Predict drift score from a feature vector.

**Request:**
```json
{
  "features": [1.0, 2.0, 3.0, ...]  // 17 features
}
```

**Response:**
```json
{
  "drift_score": 65.5,
  "risk_level": "high",
  "anomaly_score": -0.45,
  "is_anomaly": true
}
```

### POST /train

Train Isolation Forest model from baseline feature vectors.

**Request:**
```json
{
  "feature_vectors": [
    [1.0, 2.0, 3.0, ...],  // 17 features
    [1.1, 2.1, 3.1, ...],
    ...
  ]
}
```

**Response:**
```json
{
  "status": "success",
  "trained_at": "2024-01-15T10:00:00Z",
  "baseline_run_count": 10,
  "model_version": "1.0.0"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "model_loaded": true
}
```

### GET /model/info

Get model metadata.

**Response:**
```json
{
  "version": "1.0.0",
  "trained_at": "2024-01-15T10:00:00Z",
  "baseline_run_count": 10,
  "feature_count": 17,
  "algorithm": "IsolationForest",
  "parameters": {
    "n_estimators": 100,
    "contamination": 0.1,
    "random_state": 42
  }
}
```

## Model Training

The model must be trained before it can make predictions. Training requires at least 2 baseline feature vectors.

**Example training via API:**
```bash
curl -X POST http://localhost:5000/train \
  -H "Content-Type: application/json" \
  -d '{
    "feature_vectors": [
      [3, 5, 2, 1, 0, 1, 1, 3.5, 0, 10, 0.5, 0.3, 0.8, 0, 0, 3, 0.5],
      [3, 5, 2, 1, 0, 1, 1, 3.2, 0, 10, 0.5, 0.3, 0.8, 0, 0, 3, 0.5]
    ]
  }'
```

## Model Storage

- Models are saved as `.pkl` files in the `models/` directory
- Default model: `models/baseline_model.pkl`
- Metadata is stored in `models/model_metadata.json`

## Algorithm Details

### Isolation Forest

- **Algorithm**: Isolation Forest from scikit-learn
- **Parameters**:
  - `n_estimators=100`: Number of trees
  - `contamination=0.1`: Expected anomaly rate (10%)
  - `random_state=42`: For reproducibility
  - `max_samples='auto'`: Auto-detect sample size

### Drift Score Calculation

1. Isolation Forest predicts anomaly score using `decision_function()`
2. Anomaly score is normalized using sigmoid transformation
3. Normalized score is scaled to 0-100 range (drift score)
4. Risk level is determined from drift score:
   - Low: 0-30
   - Medium: 31-50
   - High: 51-70
   - Critical: 71-100

## Integration with Node.js Backend

The Node.js backend communicates with this service via HTTP REST API. Ensure the ML service is running before starting the backend.

**Backend Configuration** (in `backend/.env`):
```bash
ML_SERVICE_URL=http://localhost:5000
ML_SERVICE_TIMEOUT=5000
ML_SERVICE_RETRY_ATTEMPTS=3
```

## Troubleshooting

### Model not loaded error

**Problem**: `/predict` returns "Model not trained" error

**Solution**: Train the model first using `/train` endpoint

### Connection refused

**Problem**: Node.js backend can't connect to ML service

**Solution**: 
1. Ensure ML service is running on port 5000
2. Check `ML_SERVICE_URL` in backend `.env`
3. Verify firewall settings

### Port already in use

**Problem**: Port 5000 is already in use

**Solution**: 
1. Change port in `.env`: `PORT=5001`
2. Update backend `ML_SERVICE_URL` accordingly

## Development

### Project Structure

```
ml-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── models/
│   │   ├── __init__.py
│   │   ├── isolation_forest.py  # ML model wrapper
│   │   └── model_manager.py    # Model persistence
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── requests.py      # Pydantic models
│   └── utils/
│       ├── __init__.py
│       └── feature_validator.py
├── models/                  # Model storage (created at runtime)
├── requirements.txt
├── Dockerfile
└── README.md
```

### Testing

Test the service endpoints:

```bash
# Health check
curl http://localhost:5000/health

# Model info (after training)
curl http://localhost:5000/model/info

# Predict (after training)
curl -X POST http://localhost:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"features": [3, 5, 2, 1, 0, 1, 1, 3.5, 0, 10, 0.5, 0.3, 0.8, 0, 0, 3, 0.5]}'
```

## License

MIT
