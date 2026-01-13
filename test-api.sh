#!/bin/bash
# Test script for the API

echo "Testing API with test pipeline log..."
echo ""

# Test 1: Normal pipeline
echo "=== Test 1: Normal Pipeline ==="
cat test-pipeline-log.json | jq '{log: .}' | curl -s -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d @- | jq '.'

echo ""
echo "=== Test 2: Risky Pipeline ==="
cat test-pipeline-log-with-security-issues.json | jq '{log: .}' | curl -s -X POST http://localhost:3001/api/analyze \
  -H "Content-Type: application/json" \
  -d @- | jq '.'
