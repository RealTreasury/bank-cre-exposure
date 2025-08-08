#!/bin/bash
# Simple diagnostic script to verify FFIEC credentials.
# Requires FFIEC_USERNAME and FFIEC_TOKEN environment variables.

set -euo pipefail

if [[ -z "${FFIEC_USERNAME:-}" || -z "${FFIEC_TOKEN:-}" ]]; then
  echo "Missing FFIEC credentials. Please set FFIEC_USERNAME and FFIEC_TOKEN."
  exit 1
fi

# Use the Node.js test script which handles WS-Security authentication
node dev/test-ffiec-credentials.js

