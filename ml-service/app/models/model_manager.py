"""
Model persistence and management
"""
import os
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any
import joblib
from sklearn.ensemble import IsolationForest


class ModelManager:
    """Manages model persistence and metadata"""
    
    def __init__(self, model_dir: str = "./models"):
        """
        Initialize model manager
        
        Args:
            model_dir: Directory to store models
        """
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        self.model_path = self.model_dir / "baseline_model.pkl"
        self.metadata_path = self.model_dir / "model_metadata.json"
        self.model: Optional[IsolationForest] = None
        self.metadata: Optional[Dict[str, Any]] = None
    
    def save_model(self, model: IsolationForest, metadata: Dict[str, Any]) -> None:
        """
        Save model and metadata to disk
        
        Args:
            model: Trained Isolation Forest model
            metadata: Model metadata dictionary
        """
        # Save model
        joblib.dump(model, self.model_path)
        
        # Save metadata
        with open(self.metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        self.model = model
        self.metadata = metadata
    
    def load_model(self) -> bool:
        """
        Load model and metadata from disk
        
        Returns:
            True if model loaded successfully, False otherwise
        """
        if not self.model_path.exists():
            return False
        
        try:
            # Load model
            self.model = joblib.load(self.model_path)
            
            # Load metadata
            if self.metadata_path.exists():
                with open(self.metadata_path, 'r') as f:
                    self.metadata = json.load(f)
            else:
                # Create default metadata if missing
                self.metadata = {
                    "version": "1.0.0",
                    "trained_at": datetime.now().isoformat(),
                    "baseline_run_count": 0,
                    "feature_count": 17,
                    "algorithm": "IsolationForest",
                    "parameters": {}
                }
            
            return True
        except Exception as e:
            print(f"Error loading model: {e}")
            return False
    
    def is_model_loaded(self) -> bool:
        """Check if model is loaded"""
        return self.model is not None
    
    def get_model(self) -> Optional[IsolationForest]:
        """Get loaded model"""
        return self.model
    
    def get_metadata(self) -> Optional[Dict[str, Any]]:
        """Get model metadata"""
        return self.metadata
    
    def model_exists(self) -> bool:
        """Check if model file exists"""
        return self.model_path.exists()
