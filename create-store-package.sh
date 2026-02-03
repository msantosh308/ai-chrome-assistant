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

# Copy Vega-Lite libraries (bundled locally for Manifest V3 compliance)
cp -r libs "$TEMP_DIR/"

# Create ZIP file - CRITICAL: files must be at root, not in subdirectory
ZIP_NAME="ai-chrome-extension-v1.0.0.zip"

# Remove existing ZIP if present
rm -f "$ZIP_NAME"

# Use Python to create ZIP with explicit control over paths
# This guarantees all files are at root level
echo "Creating ZIP file with Python (explicit path control)..."
python3 << 'PYTHON_SCRIPT'
import zipfile
import os
from pathlib import Path

temp_dir = Path("chrome-store-package")
zip_path = Path("ai-chrome-extension-v1.0.0.zip")

# Exclude patterns
exclude_patterns = ['.DS_Store', '.git', '.zip', '.sh']

def should_exclude(file_path):
    """Check if file should be excluded"""
    name = file_path.name
    return any(name.endswith(pattern) or pattern in name for pattern in exclude_patterns)

# Create ZIP file
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
    # Add all files from temp directory
    for root, dirs, files in os.walk(temp_dir):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if not should_exclude(Path(d))]
        
        for file in files:
            if should_exclude(Path(file)):
                continue
            
            file_path = Path(root) / file
            # Calculate archive path: remove temp_dir prefix to put files at root
            archive_path = file_path.relative_to(temp_dir)
            # Convert to string with forward slashes (ZIP standard)
            # Use as_posix() which handles path conversion correctly
            archive_path_str = archive_path.as_posix()
            
            print(f"Adding: {archive_path_str}")
            zipf.write(file_path, archive_path_str)

print(f"\n✅ ZIP created: {zip_path}")
print(f"✅ All files are at root level")
PYTHON_SCRIPT

# Show ZIP contents for debugging
echo ""
echo "=== ZIP File Contents ==="
unzip -l "$ZIP_NAME" | head -25
echo ""

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
