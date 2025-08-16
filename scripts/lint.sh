#!/bin/bash
set -e

echo "=== Code Quality Checks ==="

echo "1. Checking JavaScript (Netlify functions)..."
cd dev
if command -v eslint &> /dev/null; then
    npx eslint netlify/functions/*.js
else
    echo "⚠️ ESLint not installed - skipping JS linting"
fi

echo "2. Checking PHP (WordPress plugin)..."
cd ..
if command -v phpcs &> /dev/null; then
    phpcs --standard=WordPress *.php templates/*.php
else
    echo "⚠️ PHP CodeSniffer not installed - skipping PHP linting"
fi

echo "3. Checking Python (API utilities)..."
if command -v flake8 &> /dev/null; then
    flake8 scripts/*.py tests/*.py --max-line-length=100
else
    echo "⚠️ Flake8 not installed - skipping Python linting"
fi

echo "✅ Code quality checks completed!"
