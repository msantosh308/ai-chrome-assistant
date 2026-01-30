#!/bin/bash

# Script to verify Chrome Extension ZIP structure
# Usage: ./verify-zip.sh <zip-file>

if [ $# -eq 0 ]; then
    echo "Usage: $0 <zip-file>"
    echo "Example: $0 ai-chrome-extension-v1.0.0.zip"
    exit 1
fi

ZIP_FILE="$1"

if [ ! -f "$ZIP_FILE" ]; then
    echo "❌ Error: File '$ZIP_FILE' not found"
    exit 1
fi

echo "Verifying ZIP file: $ZIP_FILE"
echo ""

# Extract ZIP to temporary directory
TEST_DIR="zip-verify-$$"
mkdir -p "$TEST_DIR"
unzip -q "$ZIP_FILE" -d "$TEST_DIR" 2>&1

echo "=== ZIP Contents Listing ==="
unzip -l "$ZIP_FILE" | head -30
echo ""

echo "=== Extracted Directory Structure ==="
ls -la "$TEST_DIR/"
echo ""

# Check if manifest.json is at root
if [ -f "$TEST_DIR/manifest.json" ]; then
    echo "✅ SUCCESS: manifest.json is at root level"
    
    # Try to read it directly from ZIP
    if unzip -p "$ZIP_FILE" manifest.json > /dev/null 2>&1; then
        echo "✅ SUCCESS: Can read manifest.json directly from ZIP"
        echo ""
        echo "manifest.json content (first 10 lines):"
        unzip -p "$ZIP_FILE" manifest.json | head -10
    else
        echo "⚠️  Warning: Cannot read manifest.json directly from ZIP (might be in subdirectory)"
    fi
else
    echo "❌ ERROR: manifest.json is NOT at root level!"
    echo ""
    echo "Looking for manifest.json:"
    find "$TEST_DIR" -name "manifest.json" -type f
    echo ""
    echo "Directory structure:"
    find "$TEST_DIR" -type f | head -20
    rm -rf "$TEST_DIR"
    exit 1
fi

# Check for other required files
echo ""
echo "=== Checking Required Files ==="
REQUIRED_FILES=("manifest.json" "background.js" "content.js" "content.css" "popup.html" "popup.js" "settings.html" "settings.js")
ALL_OK=true
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$TEST_DIR/$file" ]; then
        echo "✅ $file"
    else
        echo "❌ Missing: $file"
        ALL_OK=false
    fi
done

# Check for icons
if [ -d "$TEST_DIR/icons" ]; then
    echo "✅ icons/ directory"
else
    echo "❌ Missing: icons/ directory"
    ALL_OK=false
fi

# Clean up
rm -rf "$TEST_DIR"

echo ""
if [ "$ALL_OK" = true ]; then
    echo "✅ ZIP structure is CORRECT - ready for Chrome Web Store upload!"
    exit 0
else
    echo "❌ ZIP structure has issues - please fix before uploading"
    exit 1
fi
