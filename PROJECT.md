# Security Detection for CI/CD Pipelines

## Project Vision

**Security Detection for CI/CD Pipelines** identifies silent security degradation in CI/CD pipelines over time using behavioral analysis and lightweight machine learning, without relying on static rules.

## Problem Statement

Modern CI/CD pipelines evolve continuously, and security controls can be silently compromised through:

- **Security checks being removed** without notice
- **Permission scope expansion** in pipeline configurations
- **Secrets leaking into logs** or being exposed
- **Manual approvals being bypassed** or skipped
- **Execution order of sensitive steps being altered** to bypass security gates

Traditional security tools use static rule-based detection, which fails to catch subtle behavioral changes that indicate security drift. This platform uses **unsupervised anomaly detection** to establish baseline security behavior and detect deviations.

## Solution Approach

### Core Technology Stack

- **Frontend**: Next.js 16 with React 19, TypeScript, Tailwind CSS
- **Backend**: Node.js with Express (ES Modules)
- **ML Approach**: Statistical baselining with z-score thresholds (lightweight, explainable)
- **Architecture**: Separate backend server with REST API, Next.js API routes as proxy layer

### Key Principles

1. **Unsupervised Learning**: No labeled training data required - learns normal behavior from historical pipeline runs
2. **Explainable AI**: All features are human-interpretable (security scan counts, permission levels, etc.)
3. **Lightweight**: No deep learning frameworks - pure JavaScript statistical calculations
4. **Behavioral Analysis**: Focus on patterns and changes over time, not static rules

## Architecture

### Backend Modules

```
backend/
├── parsers/logParser.js          - Parse CI/CD logs (GitHub Actions style)
├── features/featureExtractor.js  - Extract security-relevant numeric features
├── model/driftModel.js           - Train and persist baseline behavior models
├── detector/driftDetector.js     - Compare new runs vs baseline, calculate drift scores
├── report/reportGenerator.js     - Generate human-readable security reports
├── api/driftRoutes.js            - REST API endpoints
└── server.js                     - Express server
```

### Detection Flow

```
CI/CD Log → Parser → Feature Extraction → Drift Detection → Report Generation → Dashboard
                                                              ↓
                                                    Baseline Model (JSON)
```

### Feature Engineering

The system extracts numeric features that capture security-relevant aspects:

- Security scan step counts
- Permission levels (read, write, admin)
- Secrets usage patterns
- Manual approval steps
- Execution order of security-critical steps
- Step removal/addition patterns

### Machine Learning Approach

**Statistical Baselining**:
- Calculate mean and standard deviation for each feature from baseline runs
- Use z-score thresholds to identify anomalies
- Weighted scoring system to combine feature deviations into a single drift score (0-100)
- Risk level classification (low/medium/high/critical)

**Why This Approach**:
- No external ML libraries needed
- Highly explainable (shows which features changed)
- Fast inference (simple calculations)
- Works well for time-series anomaly detection

## Security Problems Detected

1. **Silent Security Check Removal**: Detect when security scanning steps disappear
2. **Permission Escalation**: Identify when pipeline permissions are expanded
3. **Secret Exposure**: Flag patterns indicating secrets in logs or configurations
4. **Approval Bypass**: Detect when manual approval gates are removed or skipped
5. **Execution Order Manipulation**: Identify when security steps are moved to non-enforcement positions

## Target Users

- **DevOps Engineers**: Monitor pipeline security health over time
- **Security Teams**: Identify security posture degradation across CI/CD infrastructure
- **Platform Teams**: Ensure compliance and security standards in automation

## Frontend Dashboard

The Next.js dashboard provides:

- **Security Drift Score**: Large, prominent display of current drift score (0-100)
- **Risk Level Indicator**: Visual risk classification (Low/Medium/High/Critical)
- **Drift Timeline**: Line chart showing drift score evolution over time
- **Security Issues Panel**: Detailed list of detected issues with severity badges
- **Pipeline Comparison**: Side-by-side baseline vs current pipeline visualization
- **History Table**: Complete analysis history with filtering and sorting

## API Endpoints

- `POST /api/analyze` - Analyze a new CI/CD log and return drift analysis
- `GET /api/history` - Retrieve analysis history for timeline visualization
- `POST /api/train` - Train/retrain baseline model from historical data (optional)

## Data Format

### Input: CI/CD Log (GitHub Actions Style)
```json
{
  "pipeline": "deploy-prod",
  "steps": [
    {
      "name": "security-scan",
      "type": "security",
      "permissions": ["read"],
      "executionOrder": 2
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Output: Drift Analysis
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

## Development Philosophy

- **Clean Code**: Well-documented, readable JavaScript with JSDoc comments
- **Error Handling**: Comprehensive error handling at all layers
- **No Cloud Dependencies**: Self-contained, runs locally
- **Explainable AI**: Every detection includes human-readable explanations
- **Production-Ready**: Engineering-grade code quality, not prototypes

## Future Enhancements

- Support for additional CI/CD platforms (GitLab CI, Jenkins, CircleCI)
- Database persistence for production use
- Real-time monitoring with webhooks
- Alerting and notification system
- Multi-pipeline aggregation and reporting
- Custom baseline model training UI
