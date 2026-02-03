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
# CRITICAL: All files must be at ZIP root, not in a subdirectory
echo "Creating ZIP file with Python (explicit path control)..."
python3 << 'PYTHON_SCRIPT'
import zipfile
import os
from pathlib import Path
import sys

temp_dir = Path("chrome-store-package").resolve()
zip_path = Path("ai-chrome-extension-v1.0.0.zip").resolve()

# Exclude patterns
exclude_patterns = ['.DS_Store', '.git', '.zip', '.sh']

def should_exclude(file_path):
    """Check if file should be excluded"""
    name = file_path.name
    return any(name.endswith(pattern) or pattern in name for pattern in exclude_patterns)

print(f"Creating ZIP from: {temp_dir}")
print(f"ZIP file: {zip_path}")
print("")

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
            # CRITICAL: Use relative_to to remove temp_dir prefix
            # This ensures files are at ZIP root, not in subdirectory
            archive_path = file_path.relative_to(temp_dir)
            archive_path_str = archive_path.as_posix()
            
            # Verify path does not start with temp_dir name
            if archive_path_str.startswith("chrome-store-package/"):
                print(f"ERROR: Path still contains temp dir: {archive_path_str}")
                sys.exit(1)
            
            print(f"  Adding: {archive_path_str}")
            zipf.write(file_path, archive_path_str)

print(f"\n✅ ZIP created successfully: {zip_path}")
print("✅ All files are at root level (no subdirectory)")
PYTHON_SCRIPT

# Show ZIP contents for debugging
echo ""
echo "=== ZIP File Contents ==="
unzip -l "$ZIP_NAME" | head -25
echo ""

# CRITICAL VERIFICATION: Extract ZIP and verify structure
echo ""
echo "=== Verifying ZIP Structure ==="
TEST_EXTRACT="zip-verify-$$"
mkdir -p "$TEST_EXTRACT"
unzip -q "$ZIP_NAME" -d "$TEST_EXTRACT"

echo "Extracted ZIP structure:"
find "$TEST_EXTRACT" -type f | sort
echo ""

# Verify manifest.json is directly at root (not in subdirectory)
if [ -f "$TEST_EXTRACT/manifest.json" ]; then
  echo "✅ manifest.json is at root level"
else
  echo "❌ ERROR: manifest.json is NOT at root level!"
  echo "Looking for manifest.json:"
  find "$TEST_EXTRACT" -name "manifest.json" -type f
  rm -rf "$TEST_EXTRACT"
  exit 1
fi

# Verify all required files are at root
REQUIRED_FILES=("manifest.json" "background.js" "content.js" "content.css" "popup.html" "popup.js" "settings.html" "settings.js")
MISSING=()
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$TEST_EXTRACT/$file" ]; then
    echo "✅ $file is at root level"
  else
    echo "❌ ERROR: $file is NOT at root level!"
    MISSING+=("$file")
  fi
done

if [ ${#MISSING[@]} -gt 0 ]; then
  echo "❌ Missing files at root: ${MISSING[*]}"
  echo "Files found:"
  find "$TEST_EXTRACT" -type f | head -20
  rm -rf "$TEST_EXTRACT"
  exit 1
fi

# Verify directories are at root
if [ -d "$TEST_EXTRACT/icons" ]; then
  echo "✅ icons/ directory is at root level"
else
  echo "❌ ERROR: icons/ directory is NOT at root level!"
  rm -rf "$TEST_EXTRACT"
  exit 1
fi

if [ -d "$TEST_EXTRACT/libs" ]; then
  echo "✅ libs/ directory is at root level"
else
  echo "❌ ERROR: libs/ directory is NOT at root level!"
  rm -rf "$TEST_EXTRACT"
  exit 1
fi

# CRITICAL: Verify NO subdirectory named after temp_dir exists
if [ -d "$TEST_EXTRACT/$TEMP_DIR" ]; then
  echo "❌ ERROR: ZIP contains nested directory '$TEMP_DIR'!"
  echo "This means files are NOT at root level."
  rm -rf "$TEST_EXTRACT"
  exit 1
fi

rm -rf "$TEST_EXTRACT"
echo ""
echo "✅ All files verified at root level - ZIP structure is correct!"

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
