#!/bin/bash

# Script to create Chrome Web Store package
# Excludes test files and documentation

echo "Creating Chrome Web Store package..."

# Create temporary directory
TEMP_DIR="chrome-store-package"
mkdir -p "$TEMP_DIR"

# Copy required files
echo "Copying files..."
cp manifest.json "$TEMP_DIR/"
cp background.js "$TEMP_DIR/"
cp content.js "$TEMP_DIR/"
cp content.css "$TEMP_DIR/"
cp popup.html "$TEMP_DIR/"
cp popup.js "$TEMP_DIR/"
cp settings.html "$TEMP_DIR/"
cp settings.js "$TEMP_DIR/"

# Copy icons directory
cp -r icons "$TEMP_DIR/"

# Create ZIP file - ensure files are at root level
ZIP_NAME="ai-chrome-extension-v1.0.0.zip"
cd "$TEMP_DIR"
# Zip from within the directory so files are at root, not in a subdirectory
zip -r "../$ZIP_NAME" . -x "*.DS_Store" "*.git*" "*.zip"
cd ..

# Verify manifest.json is at root by extracting and checking
echo "Verifying ZIP structure..."
TEST_EXTRACT="zip-verify-$$"
mkdir -p "$TEST_EXTRACT"
unzip -q "$ZIP_NAME" -d "$TEST_EXTRACT"

if [ -f "$TEST_EXTRACT/manifest.json" ]; then
  echo "✅ manifest.json verified at root level"
  echo "✅ All files are at correct location"
  rm -rf "$TEST_EXTRACT"
else
  echo "❌ ERROR: manifest.json is not at root level!"
  echo "ZIP contents:"
  unzip -l "$ZIP_NAME"
  echo ""
  echo "Extracted structure:"
  find "$TEST_EXTRACT" -type f | head -20
  rm -rf "$TEST_EXTRACT"
  exit 1
fi

# Clean up
rm -rf "$TEMP_DIR"

echo "✅ Package created: $ZIP_NAME"
echo "📦 Ready to upload to Chrome Web Store!"
echo ""
echo "Next steps:"
echo "1. Go to https://chrome.google.com/webstore/devconsole"
echo "2. Click 'New Item'"
echo "3. Upload $ZIP_NAME"
echo "4. Fill in store listing details"
echo "5. Submit for review"
