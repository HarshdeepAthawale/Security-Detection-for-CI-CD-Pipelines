---
name: Complete Frontend Integration and System Testing
overview: Complete the remaining frontend integrations (History and Pipelines pages), create initial baseline model, and ensure end-to-end system functionality with proper testing.
todos:
  - id: history-page-integration
    content: Complete History page API integration - replace TODO with actual API call to /api/history, handle loading/error states, add query parameter support
    status: completed
  - id: pipeline-comparison-backend
    content: Enhance backend API to include pipeline comparison data - modify driftRoutes.js to include baseline/current pipeline steps in responses
    status: completed
  - id: pipelines-page-integration
    content: Complete Pipelines page API integration - fetch pipeline comparison data and display in PipelineComparison component
    status: completed
  - id: baseline-model-script
    content: Create baseline model training script - create backend/src/scripts/train-baseline.js to train initial model from sample data
    status: completed
  - id: train-initial-baseline
    content: Train and save initial baseline model - run training script to create baseline-model.json from sample-baseline.json
    status: completed
  - id: e2e-testing
    content: Perform end-to-end testing - test analysis flow, history flow, pipeline comparison, error handling, and data persistence
    status: completed
  - id: documentation-update
    content: Update documentation - add baseline training instructions, troubleshooting guide, and quick start guide to README files
    status: completed
---

# Complete Frontend Integration and System Testing

## Current State Analysis

### Completed Components

- ✅ Backend API fully implemented (analyze, history, train endpoints)
- ✅ Main dashboard (`app/page.tsx`) connected to API
- ✅ API proxy routes (`app/api/analyze/route.ts`, `app/api/history/route.ts`)
- ✅ Log upload component with validation
- ✅ All dashboard components (drift score, timeline, security issues, quick stats)
- ✅ MongoDB storage and database utilities
- ✅ Sample CI/CD logs exist in `backend/data/logs/`

### Missing/Incomplete Components

- ❌ History page (`app/history/page.tsx`) - has TODO, not connected to API
- ❌ Pipelines page (`app/pipelines/page.tsx`) - has TODO, needs pipeline comparison data
- ❌ No baseline model exists (`backend/data/models/` is empty)
- ⚠️ Settings page is UI-only (low priority)

## Implementation Plan

### Phase 1: Complete History Page Integration

**File**: `app/history/page.tsx`

**Tasks**:

1. Replace TODO with actual API call to `/api/history`
2. Handle loading states and errors
3. Pass fetched data to `HistoryTable` component
4. Add query parameter support (pipeline filter, limit)

**Implementation**:

- Use same pattern as `app/page.tsx` for API calls
- Fetch from `/api/history` endpoint (already proxies to backend)
- Handle empty states gracefully
- Support optional query parameters for filtering

### Phase 2: Complete Pipelines Page Integration

**File**: `app/pipelines/page.tsx`

**Challenge**: Backend doesn't have a dedicated pipeline comparison endpoint. The `generatePipelineComparison` function exists in `reportGenerator.js` but needs baseline and current pipeline steps.

**Solution Options**:

1. **Option A (Recommended)**: Modify `/api/history` or `/api/analyze` to include pipeline comparison data when available
2. **Option B**: Create new `/api/pipelines` endpoint that returns comparison data
3. **Option C**: Fetch latest analysis and extract pipeline steps from stored analysis data

**Recommended Approach**: Option A - Enhance existing endpoints to include pipeline comparison when baseline model exists.

**Tasks**:

1. Modify backend `driftRoutes.js` to include pipeline comparison in history response
2. Store parsed pipeline steps in analysis documents (or retrieve from baseline model)
3. Update `app/pipelines/page.tsx` to fetch and display comparison data
4. Handle cases where baseline doesn't exist

**Backend Changes Needed**:

- Store or retrieve baseline pipeline steps from model
- Include pipeline comparison in history/analyze responses
- Ensure `generatePipelineComparison` receives correct step data

### Phase 3: Create Initial Baseline Model

**Goal**: Train and save an initial baseline model from sample data so the system can detect drift immediately.

**Files**:

- `backend/data/logs/sample-baseline.json` (already exists)
- `backend/data/models/baseline-model.json` (needs to be created)

**Tasks**:

1. Create script to train baseline model from sample logs
2. Train model using `/api/train` endpoint or direct model training
3. Save model to `backend/data/models/baseline-model.json`
4. Verify model loads correctly on server startup

**Implementation**:

- Create `backend/src/scripts/train-baseline.js` script
- Use existing `sample-baseline.json` (or create multiple baseline samples)
- Call `trainBaselineModel` from `driftModel.js`
- Save using `saveModel` function
- Document in README

### Phase 4: End-to-End Testing

**Test Scenarios**:

1. **Analysis Flow**:

   - Upload sample log via UI
   - Verify analysis completes successfully
   - Verify results display on dashboard
   - Verify data persists in MongoDB

2. **History Flow**:

   - Verify history page loads analyses
   - Test filtering by pipeline
   - Verify timeline chart displays correctly
   - Test pagination/limit

3. **Pipeline Comparison Flow**:

   - Verify pipelines page loads
   - Verify baseline vs current comparison displays
   - Test with different pipeline states (drifted, critical)

4. **Error Handling**:

   - Test with backend server down
   - Test with invalid log format
   - Test with missing baseline model
   - Verify error messages display correctly

5. **Data Persistence**:

   - Verify analyses stored in MongoDB
   - Verify model persists across restarts
   - Test data retrieval after restart

### Phase 5: Documentation and Cleanup

**Tasks**:

1. Update README with:

   - Instructions for training initial baseline
   - Troubleshooting guide
   - API endpoint documentation
   - Sample data usage

2. Code cleanup:

   - Remove any unused imports
   - Verify all TODOs are addressed
   - Add JSDoc comments where needed
   - Ensure consistent error handling

3. Create quick start guide:

   - Step-by-step setup instructions
   - How to train baseline model
   - How to analyze first pipeline

## Technical Details

### History Page Implementation

```typescript
// app/history/page.tsx pattern
async function fetchHistoryData(pipeline?: string) {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  const url = new URL(`${baseUrl}/api/history`)
  if (pipeline) url.searchParams.append('pipeline', pipeline)
  
  const response = await fetch(url.toString(), {
    next: { revalidate: 30 }
  })
  // ... handle response
}
```

### Pipeline Comparison Data Flow

The backend needs to:

1. Store baseline pipeline steps (from model or first analysis)
2. Include current pipeline steps in analysis response
3. Generate comparison using `generatePipelineComparison()`
4. Return comparison data in API response

**Backend Enhancement** (`backend/src/api/driftRoutes.js`):

- Modify `/api/analyze` to store parsed steps
- Modify `/api/history` to include pipeline comparison for latest analysis
- Or create `/api/pipelines/:pipelineName` endpoint

### Baseline Model Training

**Script**: `backend/src/scripts/train-baseline.js`

```javascript
import { readFileSync } from 'fs'
import { trainBaselineModel, saveModel } from '../model/driftModel.js'
import { parseLog } from '../parsers/logParser.js'
import { extractFeatures } from '../features/featureExtractor.js'

// Load sample baseline logs
// Train model
// Save to data/models/baseline-model.json
```

## Success Criteria

- ✅ History page displays real analysis data
- ✅ Pipelines page shows baseline vs current comparison
- ✅ Initial baseline model exists and loads on startup
- ✅ End-to-end flow works: upload → analyze → display
- ✅ All error states handled gracefully
- ✅ Data persists correctly in MongoDB
- ✅ Documentation is complete and accurate

## Files to Modify

**Frontend**:

- `app/history/page.tsx` - Add API integration
- `app/pipelines/page.tsx` - Add API integration

**Backend**:

- `backend/src/api/driftRoutes.js` - Add pipeline comparison to responses
- `backend/src/utils/storage.js` - Optionally store pipeline steps
- `backend/src/scripts/train-baseline.js` - New script for baseline training

**Documentation**:

- `README.md` - Update with baseline training instructions
- `backend/README.md` - Add script documentation

## Dependencies

- All required dependencies already installed
- MongoDB must be running
- Sample logs already exist in `backend/data/logs/`

## Estimated Complexity

- **History Page**: Low (similar to dashboard, ~30 min)
- **Pipelines Page**: Medium (requires backend changes, ~1-2 hours)
- **Baseline Model**: Low (script creation, ~30 min)
- **Testing**: Medium (comprehensive testing, ~1 hour)
- **Documentation**: Low (~30 min)

**Total Estimated Time**: 3-4 hours