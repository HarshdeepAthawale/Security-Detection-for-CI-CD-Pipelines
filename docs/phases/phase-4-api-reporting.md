# Phase 4: API & Reporting Layer

## Goal

Create REST API endpoints and report generation functionality to expose the drift detection capabilities and format data for the frontend dashboard.

## Overview

Phase 4 focuses on building the API layer that connects the detection engine to the outside world, and the report generator that formats analysis results into human-readable reports suitable for the dashboard.

## Tasks

### 1. Implement Report Generator (`backend/src/report/reportGenerator.js`)

Generate human-readable reports from detection results:

- **Format Security Issues**:
  - Convert SecurityIssue objects to human-readable descriptions
  - Map issue types to clear explanations:
    - `security_scan_removed` → "Security scan step removed from pipeline"
    - `permission_escalation` → "Pipeline permissions escalated (read → write/admin)"
    - `secrets_exposure` → "Secrets usage pattern changed or exposed in logs"
    - `approval_bypassed` → "Manual approval step removed or bypassed"
    - `execution_order_changed` → "Security-critical step execution order changed"
  - Format severity levels consistently
  - Include step names and affected areas

- **Create Timeline Data Points**:
  - Convert analysis history to timeline format
  - Generate TimelineDataPoint objects:
    ```javascript
    {
      date: "ISO timestamp",
      score: number,
      event?: "optional event description"
    }
    ```
  - Sort by date (chronological)
  - Highlight significant events (score spikes, critical issues)

- **Generate Pipeline Comparison Data**:
  - Compare baseline pipeline vs current pipeline
  - Identify step changes:
    - Added steps
    - Removed steps
    - Modified steps (permissions, order)
    - Unchanged steps
  - Mark security-related steps
  - Generate PipelineStep arrays for frontend:
    ```javascript
    {
      name: string,
      status: "unchanged" | "added" | "removed" | "modified",
      security: boolean
    }
    ```

- **Generate Quick Stats**:
  - Calculate summary statistics for dashboard
  - Total analyses count
  - Average drift score
  - Critical issues count
  - Last analysis timestamp

### 2. Implement API Routes (`backend/src/api/driftRoutes.js`)

Create REST API endpoints:

- **POST /api/analyze**:
  - Accept CI/CD log JSON in request body
  - Request format:
    ```json
    {
      "pipeline": "pipeline-name",
      "log": { /* GitHub Actions log structure */ },
      "timestamp": "ISO timestamp"
    }
    ```
  - Process: log → parse → extract features → detect drift → generate report
  - Response format (DriftAnalysis):
    ```json
    {
      "id": "analysis-id",
      "pipelineName": "pipeline-name",
      "driftScore": 65,
      "riskLevel": "high",
      "timestamp": "ISO timestamp",
      "issues": [ /* SecurityIssue array */ ]
    }
    ```
  - Error handling for invalid logs
  - Validation of request body

- **GET /api/history**:
  - Return analysis history for timeline visualization
  - Query parameters (optional):
    - `pipeline`: filter by pipeline name
    - `limit`: maximum number of results
    - `since`: filter by timestamp
  - Response format:
    ```json
    {
      "history": [ /* DriftAnalysis array */ ],
      "timeline": [ /* TimelineDataPoint array */ ],
      "stats": { /* Quick stats */ }
    }
    ```
  - Sort by timestamp (newest first)
  - Include timeline data points

- **POST /api/train** (Optional):
  - Train/retrain baseline model
  - Accept array of baseline logs
  - Request format:
    ```json
    {
      "baselineLogs": [ /* array of CI/CD logs */ ],
      "modelName": "optional-model-name"
    }
    ```
  - Train model and save to `data/models/`
  - Return training status and statistics

### 3. Complete Server Configuration (`backend/src/server.js`)

Update server to mount API routes:

- Mount drift routes: `app.use('/api', driftRoutes)`
- Add request validation middleware
- Add error handling for API routes
- Ensure CORS is properly configured
- Add request body size limits
- Add rate limiting (optional, for production)

### 4. Testing

- Test all API endpoints with sample data
- Test request validation
- Test error handling
- Verify responses match frontend TypeScript types
- Test report generation with various scenarios

## Deliverables

- ✅ Complete REST API with all endpoints
- ✅ Report generation for dashboard display
- ✅ Error handling and validation
- ✅ API documentation (in-code JSDoc)
- ✅ Request/response format documentation
- ✅ Integration with detection engine

## Files Created/Modified

- `backend/src/report/reportGenerator.js` (new)
- `backend/src/api/driftRoutes.js` (new)
- `backend/src/server.js` (modified - add route mounting)

## Dependencies

No new dependencies - uses existing modules:
- Express for routing
- Existing logger utility
- Existing detection modules (from Phase 3)

## API Endpoints

### POST /api/analyze

Analyze a new CI/CD log for security drift.

**Request**:
```json
{
  "pipeline": "deploy-prod",
  "log": {
    "steps": [ /* GitHub Actions log structure */ ]
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

**Response** (200 OK):
```json
{
  "id": "analysis-123",
  "pipelineName": "deploy-prod",
  "driftScore": 65,
  "riskLevel": "high",
  "timestamp": "2024-01-15T10:30:00Z",
  "issues": [
    {
      "id": "issue-1",
      "type": "security_scan_removed",
      "severity": "high",
      "description": "Security scan step removed from pipeline",
      "step": "security-scan"
    }
  ]
}
```

**Error Response** (400 Bad Request):
```json
{
  "error": "Invalid request",
  "message": "Missing required field: log"
}
```

### GET /api/history

Get analysis history and timeline data.

**Query Parameters**:
- `pipeline` (optional): Filter by pipeline name
- `limit` (optional): Maximum results (default: 100)
- `since` (optional): ISO timestamp filter

**Response** (200 OK):
```json
{
  "history": [ /* DriftAnalysis array */ ],
  "timeline": [
    {
      "date": "2024-01-15T10:30:00Z",
      "score": 65,
      "event": "Security scan removed"
    }
  ],
  "stats": {
    "totalAnalyses": 50,
    "averageScore": 35,
    "criticalIssues": 3,
    "lastAnalysis": "2024-01-15T10:30:00Z"
  }
}
```

### POST /api/train (Optional)

Train or retrain the baseline model.

**Request**:
```json
{
  "baselineLogs": [ /* array of baseline CI/CD logs */ ],
  "modelName": "production-baseline"
}
```

**Response** (200 OK):
```json
{
  "status": "success",
  "modelName": "production-baseline",
  "trainedAt": "2024-01-15T10:30:00Z",
  "baselineRunCount": 20,
  "features": 15
}
```

## Testing Strategy

1. **Unit Tests**:
   - Test report generation functions
   - Test API route handlers
   - Test data formatting

2. **Integration Tests**:
   - Test full API workflow: request → analysis → response
   - Test error handling
   - Test request validation

3. **End-to-End Tests**:
   - Test API with real sample data
   - Verify response formats match frontend types
   - Test all endpoints

## Success Criteria

- ✅ All API endpoints are functional
- ✅ Responses match frontend TypeScript types
- ✅ Report generation creates valid dashboard data
- ✅ Error handling works correctly
- ✅ Request validation prevents invalid inputs
- ✅ API is well-documented (JSDoc)
- ✅ CORS is properly configured

## Next Phase

Phase 4 output (API endpoints) will be used in Phase 5 to:
- Create Next.js API proxy routes
- Connect frontend to backend
- Display real data in dashboard

## Status

**Status**: ✅ Complete

Phase 4 has been successfully implemented with all deliverables completed.
