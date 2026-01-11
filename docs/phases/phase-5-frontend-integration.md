# Phase 5: Frontend Integration & Testing

## Goal

Connect the backend to the frontend and ensure end-to-end functionality, completing the Security Detection for CI/CD Pipelines platform.

## Overview

Phase 5 focuses on integrating the backend API with the Next.js frontend, replacing mock data with real API calls, and ensuring the complete system works together seamlessly.

## Tasks

### 1. Create Next.js API Proxy Routes

Create proxy routes in Next.js that forward requests to the backend server:

- **app/api/analyze/route.ts**:
  - Accept POST requests from frontend
  - Forward to backend `POST /api/analyze`
  - Handle errors and transform responses
  - Return data matching frontend TypeScript types
  - Handle backend server errors gracefully

- **app/api/history/route.ts**:
  - Accept GET requests from frontend
  - Forward to backend `GET /api/history`
  - Pass through query parameters (pipeline, limit, since)
  - Transform response to match frontend types
  - Handle errors and empty states

- **Error Handling**:
  - Handle backend server unavailable
  - Handle network errors
  - Transform error responses to frontend format
  - Return appropriate HTTP status codes

### 2. Update Frontend Dashboard (`app/page.tsx`)

Replace mock data with real API calls:

- **Update fetchDashboardData function**:
  - Call Next.js API routes (`/api/analyze`, `/api/history`)
  - Replace mock data with actual API responses
  - Handle loading states
  - Handle error states
  - Ensure data shapes match TypeScript types in `lib/types.ts`

- **Add Error Handling**:
  - Display error messages to users
  - Handle network failures gracefully
  - Show loading indicators during API calls
  - Handle empty states (no data available)

- **Add Loading States**:
  - Show loading indicators while fetching data
  - Prevent multiple simultaneous requests
  - Handle race conditions

### 3. Add Sample Data

Create initial data for testing:

- **Sample CI/CD Logs**:
  - Create sample GitHub Actions logs in `backend/data/logs/`
  - Include various scenarios (baseline, drifted, critical)
  - Use for initial testing and demonstrations

- **Initial Baseline Model**:
  - Create initial baseline model from sample data
  - Store in `backend/data/models/baseline-model.json`
  - Use for initial drift detection testing

### 4. End-to-End Testing

Test complete system workflows:

- **Analysis Flow**:
  1. Submit CI/CD log via API
  2. Backend processes log
  3. Backend detects drift
  4. Frontend displays analysis results
  5. Verify all data displays correctly

- **History Flow**:
  1. Fetch analysis history via API
  2. Backend returns history and timeline
  3. Frontend displays timeline chart
  4. Frontend displays history table
  5. Verify timeline visualization works

- **Pipeline Comparison Flow**:
  1. Fetch analysis with pipeline comparison data
  2. Frontend displays baseline vs current comparison
  3. Verify step differences are highlighted
  4. Verify security steps are marked

### 5. Documentation and Cleanup

- **Add Scripts** (optional):
  - Add scripts to root `package.json` for running both frontend and backend
  - Example: `"dev:all"` to run both servers

- **Update Documentation**:
  - Update README with setup instructions
  - Document API endpoints
  - Document environment variables
  - Document deployment instructions (if applicable)

- **Code Cleanup**:
  - Remove any unused code
  - Ensure consistent code style
  - Add final comments where needed
  - Verify all imports are correct

## Deliverables

- ✅ Fully integrated frontend-backend system
- ✅ Working dashboard with real data
- ✅ End-to-end testing completed
- ✅ Error handling implemented
- ✅ Loading states implemented
- ✅ Sample data available
- ✅ Documentation updated
- ✅ System ready for demo/testing

## Files Created/Modified

**New Files**:
- `app/api/analyze/route.ts`
- `app/api/history/route.ts`
- `backend/data/logs/sample-*.json` (sample logs)
- `backend/data/models/baseline-model.json` (initial model)

**Modified Files**:
- `app/page.tsx` - Replace mock data with API calls
- `package.json` - Add optional scripts for running both servers
- `README.md` (root) - Update with integration instructions

## Dependencies

- **Next.js API Routes**: Already available (Next.js framework)
- **Backend Server**: Must be running on port 3001
- No new npm packages required

## Integration Architecture

```
Frontend (Next.js)          Backend (Express)
┌─────────────────┐         ┌─────────────────┐
│  app/page.tsx   │         │                 │
│  (Dashboard)    │         │                 │
└────────┬────────┘         │                 │
         │                  │                 │
         │ API Call         │                 │
         ▼                  │                 │
┌─────────────────┐         │                 │
│ app/api/*/route │────────▶│ driftRoutes.js  │
│  (Proxy Layer)  │         │                 │
└─────────────────┘         └─────────────────┘
                                    │
                                    ▼
                            Detection Engine
                            (Phases 2-3)
```

## Testing Strategy

### 1. Unit Tests
- Test Next.js API routes
- Test data transformation functions
- Test error handling

### 2. Integration Tests
- Test frontend → API route → backend flow
- Test data format consistency
- Test error propagation

### 3. End-to-End Tests
- Test complete user workflows
- Test dashboard rendering with real data
- Test all dashboard components
- Test error states
- Test loading states

### 4. Manual Testing Checklist
- [ ] Dashboard loads correctly
- [ ] Drift score displays
- [ ] Timeline chart renders with data
- [ ] Security issues list displays
- [ ] Pipeline comparison shows differences
- [ ] History table displays correctly
- [ ] Error messages show when backend is down
- [ ] Loading indicators show during API calls
- [ ] Empty states display when no data
- [ ] All components respond correctly

## Success Criteria

- ✅ Frontend successfully fetches data from backend
- ✅ Dashboard displays real analysis data
- ✅ All dashboard components work with real data
- ✅ Error handling works correctly
- ✅ Loading states work correctly
- ✅ End-to-end flow works: log → analysis → display
- ✅ Timeline visualization works
- ✅ Pipeline comparison works
- ✅ System is ready for demonstration
- ✅ Documentation is complete

## Environment Setup

### Running Both Servers

**Option 1: Separate Terminals**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd ..  # root directory
npm run dev
```

**Option 2: Script (if added)**
```bash
npm run dev:all  # Runs both servers (if script added)
```

### Environment Variables

**Backend** (`.env` in backend/):
```
PORT=3001
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=INFO
```

**Frontend** (`.env.local` in root):
```
NEXT_PUBLIC_API_URL=http://localhost:3001  # Optional, if different
```

## Next Steps (Post-Phase 5)

After Phase 5 completion, potential enhancements:
- Add authentication/authorization
- Add database persistence
- Add real-time updates (WebSockets)
- Add alerting/notifications
- Add multi-pipeline support
- Add custom baseline training UI
- Add export functionality (PDF reports)
- Add filtering and search capabilities

## Status

**Status**: ⏳ Pending

Phase 5 will begin after Phase 4 is complete. This is the final phase of the implementation.
