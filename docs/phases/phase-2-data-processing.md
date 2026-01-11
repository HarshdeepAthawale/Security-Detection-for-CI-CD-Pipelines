# Phase 2: Data Processing Pipeline

## Goal

Implement log parsing and feature extraction capabilities to process CI/CD pipeline logs and convert them into numeric feature vectors for machine learning.

## Overview

Phase 2 focuses on building the data processing pipeline that takes raw CI/CD logs (GitHub Actions style) and transforms them into structured data and numeric features that can be used for drift detection.

## Tasks

### 1. Implement Log Parser (`backend/src/parsers/logParser.js`)

Parse GitHub Actions style JSON logs and extract structured data:

- Parse JSON log format (GitHub Actions style)
- Extract pipeline steps with metadata:
  - Step names
  - Step types (security, build, test, deploy, etc.)
  - Execution order
  - Status (success, failure, skipped)
- Extract security events:
  - Security scan steps
  - Permission changes
  - Secret usage
  - Manual approval gates
- Extract permissions information:
  - Permission levels (read, write, admin)
  - Permission scope changes
- Extract secrets usage patterns:
  - Secrets referenced in logs
  - Secrets passed to steps
- Normalize step names and categorize security-related steps
- Return structured log data object

**Expected Output Structure**:
```javascript
{
  pipeline: string,
  timestamp: string,
  steps: Array<{
    name: string,
    type: string,
    executionOrder: number,
    permissions: string[],
    security: boolean,
    secrets: boolean,
    approval: boolean
  }>
}
```

### 2. Implement Feature Extractor (`backend/src/features/featureExtractor.js`)

Convert parsed logs into numeric feature vectors:

- Convert structured log data → numeric feature array
- Extract security-relevant features:
  - Security scan steps count
  - Total security-related steps
  - Permission levels count (read, write, admin)
  - Secrets usage indicators
  - Manual approval steps count
  - Execution order indices of security steps
  - Step removal/addition patterns
  - Average execution order of security steps
  - Permission escalation indicators
- Normalize features for consistent scaling
- Return feature array suitable for ML model

**Expected Feature Vector** (example structure):
```javascript
[
  securityScanCount,        // Number of security scan steps
  securityStepCount,        // Total security-related steps
  readPermissionCount,      // Steps with read permissions
  writePermissionCount,     // Steps with write permissions
  adminPermissionCount,     // Steps with admin permissions
  secretsUsageCount,        // Steps using secrets
  approvalStepCount,        // Manual approval steps
  avgSecurityStepOrder,     // Average execution order of security steps
  permissionEscalation,     // Boolean indicator (0 or 1)
  // ... additional features
]
```

### 3. Create Sample Data

- Create sample GitHub Actions log structure in `backend/data/logs/sample-log.json`
- Include various scenarios:
  - Baseline pipeline with security steps
  - Pipeline with removed security steps
  - Pipeline with permission escalation
  - Pipeline with secrets in logs

### 4. Testing

- Test parser with sample GitHub Actions logs
- Test feature extractor with parsed log data
- Verify feature vectors are numeric and consistent
- Test edge cases (empty logs, malformed logs, missing fields)

## Deliverables

- ✅ Log parser that converts CI/CD logs to structured data
- ✅ Feature extractor that generates numeric feature vectors
- ✅ Sample test data (GitHub Actions log format)
- ✅ JSDoc documentation for all functions
- ✅ Error handling for malformed inputs

## Files Created

- `backend/src/parsers/logParser.js`
- `backend/src/features/featureExtractor.js`
- `backend/data/logs/sample-log.json`

## Dependencies

No new dependencies required - uses only Node.js built-in modules and existing utilities.

## Technical Specifications

### Log Parser Requirements

- Handle GitHub Actions JSON log format
- Support common CI/CD log structures
- Normalize step names (case-insensitive matching)
- Categorize security-related steps using keywords:
  - security, scan, audit, test, check, verify, validate
  - dependency-check, sast, dast, secrets, token, key
- Detect permission levels from step configuration
- Detect secrets usage from step environment/parameters

### Feature Extractor Requirements

- Extract at least 10-15 security-relevant features
- All features must be numeric (integers or floats)
- Features should be human-explainable
- Normalize execution order to 0-1 range if needed
- Handle missing data gracefully (default to 0)

## Testing Strategy

1. **Unit Tests**:
   - Test parser with valid GitHub Actions logs
   - Test parser with malformed/invalid logs
   - Test feature extractor with parsed log data
   - Test feature extractor with edge cases

2. **Integration Tests**:
   - Test full pipeline: raw log → parsed data → feature vector
   - Verify feature vector length is consistent
   - Verify feature vector values are in expected ranges

## Success Criteria

- ✅ Parser successfully extracts all required fields from GitHub Actions logs
- ✅ Feature extractor generates consistent numeric feature vectors
- ✅ Feature vectors have the same length for all inputs
- ✅ All features are numeric and explainable
- ✅ Error handling works for invalid inputs
- ✅ Sample data is available for testing

## Next Phase

Phase 2 output (feature vectors) will be used in Phase 3 to:
- Train baseline models
- Compare new runs against baseline
- Calculate drift scores

## Status

**Status**: ⏳ Pending

Phase 2 will begin after Phase 1 is complete.
