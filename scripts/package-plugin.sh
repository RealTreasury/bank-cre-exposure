#!/bin/bash
set -e

echo "=== Packaging WordPress Plugin ==="

# Create temporary directory
TEMP_DIR=$(mktemp -d)
PLUGIN_DIR="$TEMP_DIR/bank-cre-exposure"

# Copy plugin files
mkdir -p "$PLUGIN_DIR"
cp bank-cre-exposure.php "$PLUGIN_DIR/"
cp readme.txt "$PLUGIN_DIR/"
cp LICENSE "$PLUGIN_DIR/"
cp -r assets "$PLUGIN_DIR/"
cp -r templates "$PLUGIN_DIR/"

# Create zip file
ZIP_NAME="bank-cre-exposure-$(date +%Y%m%d-%H%M).zip"
cd "$TEMP_DIR"
zip -r "../$ZIP_NAME" bank-cre-exposure/

# Move to current directory
mv "../$ZIP_NAME" "$OLDPWD/"

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Plugin packaged as: $ZIP_NAME"
echo "📦 Ready for WordPress installation"
