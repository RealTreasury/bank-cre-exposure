#!/bin/bash
set -e

echo "=== Bank CRE WordPress Plugin Testing ==="

# Environment check
if ! command -v node &> /dev/null; then
    echo "Node.js not found. Please install Node.js 18+"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "Python not found. Please install Python 3.8+"
    exit 1
fi

echo "1. Testing Netlify functions..."
cd dev
npm test 2>/dev/null || node ../tests/ffiec_function.test.js

echo "2. Testing Python API clients..."
cd ../tests
python3 test_ffiec_api.py
python3 test_fred_api.py

echo "3. Testing FFIEC credentials..."
cd ../scripts
if [[ -n "${FFIEC_USERNAME:-}" && -n "${FFIEC_TOKEN:-}" ]]; then
    node ../dev/test-ffiec-credentials.js
else
    echo "⚠️ FFIEC credentials not set - skipping credential test"
fi

echo "4. Validating configuration..."
cd ..
if [[ -f "config/schemas/plugin-config.json" ]]; then
    echo "✅ Plugin configuration schema found"
else
    echo "⚠️ Plugin configuration schema missing"
fi

echo "✅ All tests completed!"
