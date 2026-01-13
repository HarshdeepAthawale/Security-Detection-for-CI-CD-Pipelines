"""
FastAPI application for ML drift detection service
"""
import os
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from app.schemas.requests import (
    PredictRequest,
    PredictResponse,
    TrainRequest,
    TrainResponse,
    HealthResponse,
    ModelInfoResponse
)
from app.models.isolation_forest import DriftDetectionModel
from app.models.model_manager import ModelManager
from app.utils.feature_validator import validate_feature_vector

# Initialize FastAPI app
app = FastAPI(
    title="Security Drift Detection ML Service",
    description="ML service for detecting security drift in CI/CD pipelines",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize model manager
model_dir = os.getenv("MODEL_PATH", "./models")
model_manager = ModelManager(model_dir=model_dir)

# Try to load existing model on startup
model_loaded = model_manager.load_model()
if model_loaded:
    print(f"Model loaded successfully from {model_manager.model_path}")
else:
    print("No existing model found. Train a model first using /train endpoint.")


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        model_loaded=model_manager.is_model_loaded()
    )


@app.get("/model/info", response_model=ModelInfoResponse)
async def get_model_info():
    """Get model metadata"""
    if not model_manager.is_model_loaded():
        raise HTTPException(status_code=404, detail="Model not loaded. Train a model first.")
    
    metadata = model_manager.get_metadata()
    if not metadata:
        raise HTTPException(status_code=500, detail="Model metadata not available")
    
    return ModelInfoResponse(**metadata)


@app.post("/train", response_model=TrainResponse)
async def train_model(request: TrainRequest):
    """
    Train Isolation Forest model from baseline feature vectors
    """
    try:
        # Validate feature vectors
        if len(request.feature_vectors) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 feature vectors are required for training"
            )
        
        # Validate each feature vector
        for i, features in enumerate(request.feature_vectors):
            is_valid, error_msg = validate_feature_vector(features)
            if not is_valid:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid feature vector at index {i}: {error_msg}"
                )
        
        # Create and train model
        model = DriftDetectionModel(
            n_estimators=100,
            contamination=0.1,
            random_state=42,
            max_samples='auto'
        )
        
        model.train(request.feature_vectors)
        
        # Create metadata
        metadata = {
            "version": "1.0.0",
            "trained_at": datetime.now().isoformat(),
            "baseline_run_count": len(request.feature_vectors),
            "feature_count": len(request.feature_vectors[0]),
            "algorithm": "IsolationForest",
            "parameters": {
                "n_estimators": 100,
                "contamination": 0.1,
                "random_state": 42,
                "max_samples": "auto"
            }
        }
        
        # Save model and metadata
        model_manager.save_model(model.get_model(), metadata)
        
        return TrainResponse(
            status="success",
            trained_at=metadata["trained_at"],
            baseline_run_count=metadata["baseline_run_count"],
            model_version=metadata["version"]
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Training failed: {str(e)}")


@app.post("/predict", response_model=PredictResponse)
async def predict(request: PredictRequest):
    """
    Predict drift score from feature vector
    """
    try:
        # Check if model is loaded
        if not model_manager.is_model_loaded():
            raise HTTPException(
                status_code=400,
                detail="Model not trained. Train a model first using /train endpoint."
            )
        
        # Validate feature vector
        is_valid, error_msg = validate_feature_vector(request.features)
        if not is_valid:
            raise HTTPException(status_code=400, detail=f"Invalid feature vector: {error_msg}")
        
        # Create model wrapper with loaded model
        model = DriftDetectionModel()
        model.model = model_manager.get_model()
        model.is_trained = True
        
        # Predict
        drift_score, risk_level, anomaly_score, is_anomaly = model.predict(request.features)
        
        return PredictResponse(
            drift_score=round(drift_score, 2),
            risk_level=risk_level,
            anomaly_score=round(anomaly_score, 4),
            is_anomaly=is_anomaly
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5000))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
