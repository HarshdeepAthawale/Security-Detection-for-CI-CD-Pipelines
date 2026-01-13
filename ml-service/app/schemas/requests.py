"""
Pydantic request/response schemas
"""
from typing import List
from pydantic import BaseModel, Field


class PredictRequest(BaseModel):
    """Request schema for prediction endpoint"""
    features: List[float] = Field(..., description="Feature vector with 17 numeric features", min_length=17, max_length=17)


class PredictResponse(BaseModel):
    """Response schema for prediction endpoint"""
    drift_score: float = Field(..., description="Drift score from 0-100", ge=0, le=100)
    risk_level: str = Field(..., description="Risk level: low, medium, high, or critical")
    anomaly_score: float = Field(..., description="Raw anomaly score from Isolation Forest")
    is_anomaly: bool = Field(..., description="Whether the sample is classified as an anomaly")


class TrainRequest(BaseModel):
    """Request schema for training endpoint"""
    feature_vectors: List[List[float]] = Field(..., description="Array of feature vectors for training", min_length=2)


class TrainResponse(BaseModel):
    """Response schema for training endpoint"""
    status: str = Field(..., description="Training status")
    trained_at: str = Field(..., description="ISO timestamp of training")
    baseline_run_count: int = Field(..., description="Number of baseline runs used for training")
    model_version: str = Field(..., description="Model version")


class HealthResponse(BaseModel):
    """Response schema for health check"""
    status: str = Field(..., description="Service status")
    model_loaded: bool = Field(..., description="Whether model is loaded")


class ModelInfoResponse(BaseModel):
    """Response schema for model info"""
    version: str = Field(..., description="Model version")
    trained_at: str = Field(..., description="Training timestamp")
    baseline_run_count: int = Field(..., description="Number of baseline runs")
    feature_count: int = Field(..., description="Number of features")
    algorithm: str = Field(..., description="ML algorithm used")
    parameters: dict = Field(..., description="Model parameters")
