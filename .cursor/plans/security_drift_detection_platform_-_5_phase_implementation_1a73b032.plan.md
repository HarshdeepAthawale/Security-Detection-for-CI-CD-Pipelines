---
name: Security Drift Detection Platform - 5 Phase Implementation
overview: "Reorganized implementation plan into 5 clear phases: Phase 1 (Backend Foundation), Phase 2 (Data Processing Pipeline), Phase 3 (ML Detection Engine), Phase 4 (API & Reporting), Phase 5 (Frontend Integration & Testing)."
todos:
  - id: phase1_setup
    content: "Phase 1: Create backend directory structure, package.json, .gitignore, logger.js, and Express server skeleton"
    status: pending
  - id: phase2_parser
    content: "Phase 2: Implement logParser.js to parse GitHub Actions style JSON logs and extract pipeline steps/security events"
    status: pending
    dependencies:
      - phase1_setup
  - id: phase2_features
    content: "Phase 2: Implement featureExtractor.js to convert logs to numeric feature vectors (security scans, permissions, secrets, approvals, etc.)"
    status: pending
    dependencies:
      - phase2_parser
  - id: phase3_model
    content: "Phase 3: Implement driftModel.js with statistical baselining (mean/std dev) and JSON persistence for baseline models"
    status: pending
    dependencies:
      - phase2_features
  - id: phase3_detector
    content: "Phase 3: Implement driftDetector.js to compare new runs vs baseline, calculate drift scores (0-100), and generate SecurityIssue objects"
    status: pending
    dependencies:
      - phase3_model
  - id: phase4_report
    content: "Phase 4: Implement reportGenerator.js to generate human-readable reports and format data for frontend (timeline, pipeline comparison)"
    status: pending
    dependencies:
      - phase3_detector
  - id: phase4_api
    content: "Phase 4: Implement driftRoutes.js with POST /api/analyze, GET /api/history, and POST /api/train endpoints"
    status: pending
    dependencies:
      - phase4_report
  - id: phase4_server
    content: "Phase 4: Complete server.js Express server with CORS, route mounting, error handling, and request validation"
    status: pending
    dependencies:
      - phase4_api
  - id: phase5_proxy
    content: "Phase 5: Create Next.js API routes (app/api/analyze/route.ts and app/api/history/route.ts) to proxy requests to backend"
    status: pending
    dependencies:
      - phase4_server
  - id: phase5_integration
    content: "Phase 5: Update app/page.tsx to fetch from API routes, replace mock data, add error handling and loading states"
    status: pending
    dependencies:
      - phase5_proxy
  - id: phase5_testing
    content: "Phase 5: Add sample data, test end-to-end flow, and ensure all features work correctly"
    status: pending
    dependencies:
      - phase5_integration
---

# Security Drift Detection Platform - 5 Phase Implementation Plan

## Overview

Build a complete security drift detection backend as a separate Node.js/Express server, implementing all required modules according to the architecture specification, and integrate it with the existing Next.js frontend. Implementation is organized into 5 sequential phases.

## Architecture

The backend will be a separate Express server with the following structure:

```
backend/
├── src/
│   ├── parsers/logParser.js        - Parse GitHub Actions style CI/CD logs
│   ├── features/featureExtractor.js - Extract security-relevant numeric features
│   ├── model/driftModel.js          - Baseline behavior model (statistical)
│   ├── detector/driftDetector.js    - Compare runs vs baseline, generate scores
│   ├── report/reportGenerator.js    - Generate human-readable drift reports
│   ├── api/driftRoutes.js           - REST API endpoints
│   ├── utils/logger.js              - Logging utility
│   └── server.js                    - Express server entry point
├── data/
│   ├── logs/                        - Sample CI/CD logs storage
│   └── models/                      - Trained baseline models (JSON)
├── package.json                     - Backend dependencies
└── .gitignore
```

## Implementation Phases

### Phase 1: Backend Foundation & Setup

**Goal**: Establish the backend infrastructure and project structure.

**Tasks**:

- Create `backend/` directory structure with all subdirectories
- Initialize `backend/package.json` with dependencies (express, cors, dotenv)
- Set up ES modules configuration
- Create `backend/.gitignore`
- Create `backend/src/utils/logger.js` - Basic logging utility
- Create minimal Express server skeleton in `backend/src/server.js`
- Test server starts and responds to basic requests

**Deliverables**:

- Working Express server on port 3001
- Project structure in place
- Dependencies installed

---

### Phase 2: Data Processing Pipeline

**Goal**: Implement log parsing and feature extraction capabilities.

**Tasks**:

- Implement `backend/src/parsers/logParser.js`:
  - Parse GitHub Actions style JSON logs
  - Extract pipeline steps, security events, permissions, secrets usage
  - Normalize step names and categorize security-related steps
  - Return structured log data
- Implement `backend/src/features/featureExtractor.js`:
  - Convert parsed logs → numeric feature vectors
  - Extract features: security scan counts, permission levels, secrets usage, manual approvals, execution order indices
  - Return feature arrays for model training/detection
- Create sample GitHub Actions log structure for testing
- Test parser and feature extractor with sample data

**Deliverables**:

- Log parser that converts CI/CD logs to structured data
- Feature extractor that generates numeric feature vectors
- Sample test data

---

### Phase 3: ML Detection Engine

**Goal**: Implement baseline modeling and drift detection algorithms.

**Tasks**:

- Implement `backend/src/model/driftModel.js`:
  - Statistical baselining (calculate mean, std dev per feature)
  - Save/load models as JSON to `data/models/`
  - Support retraining with new baseline data
  - Calculate baseline statistics from historical runs
- Implement `backend/src/detector/driftDetector.js`:
  - Compare new run features vs baseline model using z-score thresholds
  - Calculate drift score (0-100) using weighted feature differences
  - Generate explanations for drift (which features changed)
  - Map feature changes to SecurityIssue objects
  - Calculate risk levels (low/medium/high/critical) based on score
- Create initial baseline model from sample data
- Test detection with various scenarios (no drift, minor drift, major drift)

**Deliverables**:

- Baseline model training and persistence
- Drift detection algorithm with scoring
- Risk level classification
- Security issue generation

---

### Phase 4: API & Reporting Layer

**Goal**: Create REST API endpoints and report generation.

**Tasks**:

- Implement `backend/src/report/reportGenerator.js`:
  - Generate human-readable drift reports
  - Format SecurityIssue objects with clear descriptions
  - Create timeline data points from analysis history
  - Generate pipeline comparison data (baseline vs current steps)
- Implement `backend/src/api/driftRoutes.js`:
  - `POST /api/analyze` - Analyze new CI/CD log, return DriftAnalysis
  - `GET /api/history` - Return analysis history with timeline data
  - `POST /api/train` - Train/retrain baseline model (optional)
- Complete `backend/src/server.js`:
  - CORS configuration for Next.js frontend
  - Route mounting
  - Error handling middleware
  - Request validation
- Test all API endpoints with sample data
- Ensure responses match frontend TypeScript types

**Deliverables**:

- Complete REST API with all endpoints
- Report generation for dashboard display
- Error handling and validation
- API documentation (in-code JSDoc)

---

### Phase 5: Frontend Integration & Testing

**Goal**: Connect backend to frontend and ensure end-to-end functionality.

**Tasks**:

- Create Next.js API proxy routes:
  - `app/api/analyze/route.ts` - Proxy to backend POST /api/analyze
  - `app/api/history/route.ts` - Proxy to backend GET /api/history
  - Handle errors and transform responses to match frontend types
- Update `app/page.tsx`:
  - Replace mock data with actual API calls to Next.js routes
  - Add error handling and loading states
  - Ensure data shapes match TypeScript types in `lib/types.ts`
- Add sample data and initial baseline model to `backend/data/`
- Test end-to-end flow:
  - Submit CI/CD log → Backend analysis → Frontend display
  - History retrieval → Timeline visualization
  - Pipeline comparison display
- Add scripts to `package.json` for running backend (optional)
- Documentation and cleanup

**Deliverables**:

- Fully integrated frontend-backend system
- Working dashboard with real data
- End-to-end testing completed
- Ready for demo/testing

## Technical Decisions

1. **ML Approach**: Statistical baselining (mean/std dev) with z-score thresholds - JS-friendly and explainable
2. **Feature Design**: Human-explainable security features (step counts, permission levels, etc.)
3. **Data Persistence**: JSON files for models and logs (no database for MVP)
4. **Integration**: Next.js API routes proxy to backend (avoids CORS, keeps architecture clean)
5. **Error Handling**: Comprehensive error handling at all layers with logging

## Files to Create/Modify

**Phase 1 Files**:

- `backend/package.json`
- `backend/.gitignore`
- `backend/src/utils/logger.js`
- `backend/src/server.js` (skeleton)

**Phase 2 Files**:

- `backend/src/parsers/logParser.js`
- `backend/src/features/featureExtractor.js`
- `backend/data/logs/sample-log.json` (sample data)

**Phase 3 Files**:

- `backend/src/model/driftModel.js`
- `backend/src/detector/driftDetector.js`
- `backend/data/models/baseline-model.json` (initial model)

**Phase 4 Files**:

- `backend/src/report/reportGenerator.js`
- `backend/src/api/driftRoutes.js`
- Complete `backend/src/server.js`

**Phase 5 Files**:

- `app/api/analyze/route.ts`
- `app/api/history/route.ts`
- Modified `app/page.tsx`
- Updated `package.json` (optional scripts)

## Dependencies

**Backend**:

- express
- cors
- dotenv (optional, for config)

**No external ML libraries** - use vanilla JavaScript for statistical calculations

## Success Criteria

- All 5 phases completed sequentially
- Backend server runs independently on port 3001
- Frontend successfully displays real analysis data
- API endpoints return data matching frontend TypeScript types
- End-to-end flow works: log input → analysis → dashboard visualization