---
name: Universal JSON Parser for Any CI/CD Format
overview: Transform the platform to accept any JSON file format by implementing a flexible, intelligent parser that can detect and extract pipeline data from various CI/CD platforms (GitHub Actions, GitLab CI, Jenkins, Azure DevOps, CircleCI, and generic JSON structures). The solution will maintain backward compatibility while adding format detection, intelligent field extraction, and graceful handling of missing or differently structured data.
todos:
  - id: create-universal-parser
    content: Create universalLogParser.js with format detection and intelligent field extraction for GitHub Actions, GitLab CI, Jenkins, Azure DevOps, CircleCI, and generic JSON
    status: completed
  - id: integrate-universal-parser
    content: Update logParser.js to use universal parser first, then fall back to existing logic for backward compatibility
    status: completed
  - id: update-frontend-validation
    content: Remove strict validation from log-upload.tsx - only validate JSON syntax, update UI messages
    status: completed
  - id: update-backend-validation
    content: Make validateParsedLog() more lenient - only require that we can extract some data
    status: completed
  - id: robust-feature-extraction
    content: Add robustness checks to featureExtractor.js to handle missing fields and empty steps gracefully
    status: completed
  - id: update-api-routes
    content: Update driftRoutes.js to handle any JSON format and provide helpful error messages
    status: completed
---

# Universal JSON Parser for Any CI/CD Format

## Problem Statement

Currently, the platform requires a strict JSON format with specific fields (`pipeline`, `timestamp`, `steps` array). Users must format their CI/CD logs exactly as expected, which limits usability. The goal is to accept **any JSON file** and intelligently extract pipeline information regardless of format.

## Solution Architecture

### 1. Universal JSON Parser (`backend/src/parsers/universalLogParser.js`)

Create a new flexible parser that can handle multiple CI/CD formats:

**Format Detection:**

- Auto-detect format type (GitHub Actions, GitLab CI, Jenkins, Azure DevOps, CircleCI, generic)
- Use heuristics: field names, structure patterns, common keys

**Intelligent Field Extraction:**

- **Pipeline Name**: Extract from `pipeline`, `pipelineName`, `name`, `workflow`, `job.name`, `definition.name`, `repository.name`, or generate from filename/timestamp
- **Timestamp**: Extract from `timestamp`, `created_at`, `time`, `started_at`, `finished_at`, `date`, or use current time
- **Steps/Actions/Jobs**: Extract from:
  - `steps` (current format)
  - `jobs[].steps` (GitHub Actions)
  - `stages[].jobs[].script` (GitLab CI)
  - `stages[].steps` (Azure DevOps)
  - `jobs[].steps` (Jenkins)
  - `jobs[].steps` (CircleCI)
  - Recursively search for arrays of objects that look like steps

**Step Normalization:**

- Extract step name from: `name`, `id`, `step`, `action`, `script`, `task`, `label`
- Extract type from: `type`, `category`, `kind`, or infer from name/keywords
- Extract permissions from: `permissions` (object/array), `scopes`, `access`, or infer from context
- Extract execution order from: `executionOrder`, `order`, `index`, array position, or `run_number`
- Detect security steps from keywords in name/description
- Detect secrets usage from env vars, inputs, or step content
- Detect approvals from step type or name keywords

**Fallback Strategy:**

- If no steps found, treat entire JSON as a single "step" with all fields
- If minimal data, extract what's available and use defaults for missing fields
- Log warnings for missing critical data but don't fail

### 2. Update Existing Parser (`backend/src/parsers/logParser.js`)

Modify `parseLog()` to:

- First try the new universal parser
- Fall back to current logic for backward compatibility
- Return normalized structure regardless of input format

### 3. Update Frontend Validation (`components/dashboard/log-upload.tsx`)

**Remove strict validation:**

- Only validate JSON syntax (valid JSON)
- Remove checks for `pipeline`, `timestamp`, `steps` fields
- Show informational message: "Any JSON format accepted - we'll extract what we can"
- Remove field-specific error messages

**Update UI:**

- Change hint text to: "Upload any JSON file - we support GitHub Actions, GitLab CI, Jenkins, Azure DevOps, CircleCI, and more"
- Show format detection result after upload (optional, for transparency)

### 4. Update Backend Validation (`backend/src/parsers/logParser.js`)

Modify `validateParsedLog()` to:

- Be more lenient: only require that we have at least one step (or the log object itself)
- Allow missing pipeline name (use generated name)
- Allow missing timestamp (use current time)
- Validate that steps array exists (even if empty, we'll handle it)

### 5. Robust Feature Extraction (`backend/src/features/featureExtractor.js`)

Ensure `extractFeatures()` handles:

- Empty steps array (return zero features or minimal features)
- Steps with missing fields (use defaults: empty permissions, type='other', etc.)
- Single step or no steps (still produce valid 17-feature vector)
- Missing security/permission data (default to false/empty)

### 6. Update API Routes (`backend/src/api/driftRoutes.js`)

Modify `/api/analyze` endpoint to:

- Accept any JSON structure
- Use universal parser first
- Provide helpful error messages if parsing completely fails
- Log detected format type for debugging

## Implementation Details

### Universal Parser Structure

```javascript
// Format detection
detectFormat(json) -> 'github-actions' | 'gitlab-ci' | 'jenkins' | 'azure-devops' | 'circleci' | 'generic'

// Field extraction
extractPipelineName(json, format) -> string
extractTimestamp(json, format) -> string (ISO 8601)
extractSteps(json, format) -> Array<Object>

// Step normalization
normalizeStep(step, index, format) -> {
  name: string,
  type: string,
  executionOrder: number,
  permissions: string[],
  security: boolean,
  secrets: boolean,
  approval: boolean
}
```

### Format-Specific Extractors

**GitHub Actions:**

- Steps from `jobs[].steps[]` or `steps[]`
- Permissions from `permissions` object
- Actions from `uses` field

**GitLab CI:**

- Steps from `stages[].jobs[].script` or `before_script`/`after_script`
- Extract from YAML-like structure if present

**Jenkins:**

- Steps from `stages[].steps[]` or `steps[]`
- Extract from pipeline JSON structure

**Azure DevOps:**

- Steps from `stages[].jobs[].steps[]` or `phases[].steps[]`

**Generic/Unknown:**

- Recursively search for arrays of objects
- Look for common step-like patterns
- Extract any object that has name-like or action-like fields

## Files to Modify

1. **Create**: `backend/src/parsers/universalLogParser.js` - New universal parser
2. **Modify**: `backend/src/parsers/logParser.js` - Integrate universal parser
3. **Modify**: `components/dashboard/log-upload.tsx` - Remove strict validation
4. **Modify**: `backend/src/api/driftRoutes.js` - Update error handling
5. **Modify**: `backend/src/features/featureExtractor.js` - Add robustness checks

## Testing Strategy

1. Test with existing pipeline logs (backward compatibility)
2. Test with GitHub Actions workflow JSON
3. Test with GitLab CI pipeline JSON
4. Test with Jenkins pipeline JSON
5. Test with Azure DevOps pipeline JSON
6. Test with generic/unknown JSON structures
7. Test with minimal JSON (single object, no steps)
8. Test with malformed but valid JSON (missing expected fields)

## Benefits

- **User-Friendly**: Accept any JSON without format requirements
- **Flexible**: Support multiple CI/CD platforms out of the box
- **Robust**: Gracefully handle missing or differently structured data
- **Backward Compatible**: Existing logs still work
- **Extensible**: Easy to add new format support