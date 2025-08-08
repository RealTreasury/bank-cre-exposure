#!/bin/bash
# Simple diagnostic script to verify FFIEC credentials.
# Requires FFIEC_USERNAME, FFIEC_PASSWORD, and FFIEC_TOKEN environment variables.

set -euo pipefail

if [[ -z "${FFIEC_USERNAME:-}" || -z "${FFIEC_PASSWORD:-}" || -z "${FFIEC_TOKEN:-}" ]]; then
  echo "Missing FFIEC credentials. Please set FFIEC_USERNAME, FFIEC_PASSWORD, and FFIEC_TOKEN."
  exit 1
fi

AUTH=$(printf "%s:%s%s" "$FFIEC_USERNAME" "$FFIEC_PASSWORD" "$FFIEC_TOKEN" | base64)

curl -X GET "https://cdr.ffiec.gov/public/PWS/Institution/Find/628" \
  -H "Authorization: Basic $AUTH" \
  -H "Accept: application/json"

