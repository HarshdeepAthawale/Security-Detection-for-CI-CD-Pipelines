"""
Feature validation utilities
"""
from typing import List


# Expected number of features (from Node.js feature extractor)
EXPECTED_FEATURE_COUNT = 17


def validate_feature_vector(features: List[float]) -> tuple[bool, str]:
    """
    Validate feature vector format and values
    
    Args:
        features: List of numeric features
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    if not isinstance(features, list):
        return False, "Features must be a list"
    
    if len(features) != EXPECTED_FEATURE_COUNT:
        return False, f"Expected {EXPECTED_FEATURE_COUNT} features, got {len(features)}"
    
    for i, feature in enumerate(features):
        if not isinstance(feature, (int, float)):
            return False, f"Feature {i} must be a number, got {type(feature).__name__}"
        
        if not (isinstance(feature, float) and (feature == float('inf') or feature == float('-inf'))):
            if not (isinstance(feature, float) and feature != feature):  # Check for NaN
                continue
            return False, f"Feature {i} is NaN or infinite"
    
    return True, ""
