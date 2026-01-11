# Phase 3: ML Detection Engine

## Goal

Implement baseline modeling and drift detection algorithms using statistical baselining to detect security drift in CI/CD pipelines.

## Overview

Phase 3 focuses on building the machine learning detection engine that learns baseline behavior from historical pipeline runs and detects deviations (drift) in new runs. This phase uses statistical baselining with z-score thresholds - a lightweight, explainable approach suitable for JavaScript.

## Tasks

### 1. Implement Drift Model (`backend/src/model/driftModel.js`)

Statistical baselining system for learning normal behavior:

- **Train Baseline Model**:
  - Accept array of feature vectors from baseline pipeline runs
  - Calculate mean (μ) for each feature across all baseline runs
  - Calculate standard deviation (σ) for each feature
  - Store baseline statistics per feature

- **Save/Load Models**:
  - Save trained model as JSON to `backend/data/models/`
  - Load existing models from JSON files
  - Model format:
    ```json
    {
      "features": {
        "featureName": {
          "mean": number,
          "stdDev": number,
          "count": number
        }
      },
      "trainedAt": "ISO timestamp",
      "baselineRunCount": number
    }
    ```

- **Retrain Support**:
  - Add new baseline runs to existing model
  - Recalculate statistics with new data
  - Update model file

- **Baseline Statistics Calculation**:
  - Calculate statistics from historical runs
  - Handle edge cases (single run, missing features)
  - Normalize features if needed

### 2. Implement Drift Detector (`backend/src/detector/driftDetector.js`)

Compare new runs against baseline and calculate drift scores:

- **Compare Against Baseline**:
  - Load baseline model
  - Compare new run's feature vector against baseline
  - Calculate z-scores for each feature: `z = (value - mean) / stdDev`
  - Identify features with significant deviations (threshold: |z| > 2 or configurable)

- **Calculate Drift Score (0-100)**:
  - Weight feature deviations by importance
  - Security-critical features get higher weights
  - Combine z-scores into single drift score
  - Score formula (example):
    ```
    driftScore = Σ(|z_i| * weight_i) / Σ(weight_i) * scaling_factor
    capped at 100
    ```
  - Higher score = more drift detected

- **Generate Explanations**:
  - Identify which features changed significantly
  - Create human-readable explanations
  - Map feature changes to security concepts

- **Map to Security Issues**:
  - Convert feature deviations to SecurityIssue objects
  - Issue types:
    - `security_scan_removed` - Security scans decreased
    - `permission_escalation` - Permissions increased
    - `secrets_exposure` - Secrets usage changed
    - `approval_bypassed` - Approval steps removed
    - `execution_order_changed` - Security steps moved
  - Assign severity levels (low, medium, high, critical) based on:
    - Magnitude of deviation
    - Feature importance
    - Security impact

- **Calculate Risk Levels**:
  - **Low**: 0-30 (minor changes, no security impact)
  - **Medium**: 31-50 (moderate changes, potential issues)
  - **High**: 51-70 (significant changes, security concerns)
  - **Critical**: 71-100 (major changes, serious security risks)

### 3. Create Initial Baseline Model

- Create sample baseline model from test data
- Store in `backend/data/models/baseline-model.json`
- Include multiple baseline runs for statistical accuracy

### 4. Testing

Test detection with various scenarios:
- **No drift**: New run matches baseline → score ~0
- **Minor drift**: Small changes → score 10-30
- **Moderate drift**: Noticeable changes → score 31-50
- **Major drift**: Significant security changes → score 51-70
- **Critical drift**: Severe security degradation → score 71-100

## Deliverables

- ✅ Baseline model training and persistence
- ✅ Drift detection algorithm with scoring (0-100)
- ✅ Risk level classification (low/medium/high/critical)
- ✅ Security issue generation with explanations
- ✅ Model save/load functionality
- ✅ Initial baseline model for testing

## Files Created

- `backend/src/model/driftModel.js`
- `backend/src/detector/driftDetector.js`
- `backend/data/models/baseline-model.json`

## Dependencies

No new dependencies - uses vanilla JavaScript for statistical calculations:
- Array operations for mean/std dev
- Math functions (sqrt, pow)
- JSON for persistence

## Technical Specifications

### Statistical Baselining Algorithm

1. **Training Phase**:
   ```
   For each feature i:
     mean[i] = average of all baseline values for feature i
     stdDev[i] = standard_deviation of all baseline values for feature i
   ```

2. **Detection Phase**:
   ```
   For each feature i in new run:
     z_score[i] = (new_value[i] - mean[i]) / stdDev[i]
     
   driftScore = weighted_sum(|z_score[i]| * weight[i]) / sum(weight[i])
   ```

3. **Feature Weights** (example):
   - Security scan count: weight 1.5
   - Permission escalation: weight 2.0
   - Secrets usage: weight 1.8
   - Approval steps: weight 1.3
   - Execution order: weight 1.0

### Z-Score Thresholds

- **Normal**: |z| < 1.5 (within expected range)
- **Minor deviation**: 1.5 ≤ |z| < 2.5
- **Moderate deviation**: 2.5 ≤ |z| < 3.5
- **Major deviation**: |z| ≥ 3.5

## Testing Strategy

1. **Unit Tests**:
   - Test model training with sample data
   - Test drift detection with known inputs
   - Test score calculation accuracy
   - Test risk level classification

2. **Integration Tests**:
   - Test full pipeline: features → model → detection → score
   - Test with various drift scenarios
   - Test model persistence (save/load)

3. **Edge Cases**:
   - Single baseline run
   - Missing features in new run
   - Zero standard deviation (constant feature)
   - Very large deviations

## Success Criteria

- ✅ Model trains successfully from baseline feature vectors
- ✅ Model saves and loads correctly
- ✅ Drift scores are calculated accurately (0-100 range)
- ✅ Risk levels are assigned correctly
- ✅ Security issues are generated with clear explanations
- ✅ Algorithm handles edge cases gracefully
- ✅ All calculations are explainable

## Next Phase

Phase 3 output (drift scores, security issues, risk levels) will be used in Phase 4 to:
- Generate human-readable reports
- Format data for frontend dashboard
- Create API responses

## Status

**Status**: ⏳ Pending

Phase 3 will begin after Phase 2 is complete.
