#!/bin/bash

# Go to the root directory (one level up from buildScripts)
cd "$(dirname "$0")/.."

echo "Cleaning Next.js build artifacts..."

# Remove .next folder
if [ -d ".next" ]; then
    rm -rf .next
    echo "Removed .next folder."
else
    echo ".next folder does not exist, skipping."
fi

# Optional: Uncomment the lines below to also remove node_modules and package-lock.json
# echo "Removing node_modules and package-lock.json..."
# rm -rf node_modules
# rm -f package-lock.json

echo "Clean complete."

# Return to buildScripts directory
cd buildScripts
