"""
Isolation Forest model implementation for drift detection
"""
import numpy as np
from sklearn.ensemble import IsolationForest
from typing import List, Tuple


# Risk level thresholds (same as Node.js backend)
RISK_LEVEL_THRESHOLDS = {
    "LOW": 30,
    "MEDIUM": 50,
    "HIGH": 70,
    "CRITICAL": 100,
}


class DriftDetectionModel:
    """Isolation Forest wrapper for drift detection"""
    
    def __init__(
        self,
        n_estimators: int = 100,
        contamination: float = 0.1,
        random_state: int = 42,
        max_samples: str = 'auto'
    ):
        """
        Initialize Isolation Forest model
        
        Args:
            n_estimators: Number of trees in the forest
            contamination: Expected proportion of anomalies (0.1 = 10%)
            random_state: Random seed for reproducibility
            max_samples: Number of samples to draw for each tree
        """
        self.model = IsolationForest(
            n_estimators=n_estimators,
            contamination=contamination,
            random_state=random_state,
            max_samples=max_samples
        )
        self.is_trained = False
    
    def train(self, feature_vectors: List[List[float]]) -> None:
        """
        Train the Isolation Forest model
        
        Args:
            feature_vectors: List of feature vectors from baseline runs
        """
        if len(feature_vectors) < 2:
            raise ValueError("At least 2 feature vectors are required for training")
        
        # Convert to numpy array
        X = np.array(feature_vectors)
        
        # Train model
        self.model.fit(X)
        self.is_trained = True
    
    def predict(self, feature_vector: List[float]) -> Tuple[float, str, float, bool]:
        """
        Predict drift score from feature vector
        
        Args:
            feature_vector: Single feature vector (17 features)
            
        Returns:
            Tuple of (drift_score, risk_level, anomaly_score, is_anomaly)
            - drift_score: 0-100 scale (higher = more anomalous)
            - risk_level: "low", "medium", "high", or "critical"
            - anomaly_score: Raw anomaly score from decision_function
            - is_anomaly: Boolean indicating if sample is an anomaly
        """
        if not self.is_trained:
            raise ValueError("Model must be trained before prediction")
        
        # Convert to numpy array and reshape for single sample
        X = np.array(feature_vector).reshape(1, -1)
        
        # Get prediction (-1 = anomaly, 1 = normal)
        prediction = self.model.predict(X)[0]
        is_anomaly = prediction == -1
        
        # Get anomaly score from decision function
        # Lower scores = more anomalous
        anomaly_score = self.model.decision_function(X)[0]
        
        # Convert anomaly score to drift score (0-100)
        # decision_function typically returns values in range [-0.5, 0.5]
        # We need to normalize and invert (lower anomaly score = higher drift score)
        
        # Normalize to 0-1 range (assuming typical range of [-0.5, 0.5])
        # More negative = more anomalous
        # We'll use a sigmoid-like transformation
        normalized_score = 1 / (1 + np.exp(anomaly_score))
        
        # Scale to 0-100
        drift_score = normalized_score * 100
        
        # Ensure drift score is in valid range
        drift_score = max(0, min(100, drift_score))
        
        # If it's classified as an anomaly, ensure minimum drift score
        if is_anomaly and drift_score < 50:
            drift_score = 50 + (abs(anomaly_score) * 20)  # Boost anomaly scores
            drift_score = min(100, drift_score)
        
        # Determine risk level
        risk_level = self._calculate_risk_level(drift_score)
        
        return drift_score, risk_level, float(anomaly_score), bool(is_anomaly)
    
    def _calculate_risk_level(self, drift_score: float) -> str:
        """
        Calculate risk level from drift score
        
        Args:
            drift_score: Drift score (0-100)
            
        Returns:
            Risk level string
        """
        if drift_score <= RISK_LEVEL_THRESHOLDS["LOW"]:
            return "low"
        elif drift_score <= RISK_LEVEL_THRESHOLDS["MEDIUM"]:
            return "medium"
        elif drift_score <= RISK_LEVEL_THRESHOLDS["HIGH"]:
            return "high"
        else:
            return "critical"
    
    def get_model(self) -> IsolationForest:
        """Get the underlying Isolation Forest model"""
        return self.model
