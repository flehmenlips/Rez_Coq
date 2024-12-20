#!/bin/bash

# Check if version number is provided
if [ -z "$1" ]; then
    echo "Please provide a version number (e.g. ./release.sh 1.1.15)"
    exit 1
fi

VERSION=$1

echo "Starting release process for version $VERSION..."

# Clean up
echo "Cleaning up..."
rm -rf node_modules/
rm -rf package-lock.json

# Install dependencies
echo "Installing dependencies..."
npm install

# Update version in package.json
npm version $VERSION --no-git-tag-version

# Stage changes
git add .

# Commit
git commit -m "Release $VERSION

- Customer registration and management system
- Converted to pure web application
- Removed Electron dependencies
- Simplified deployment process
- Improved login UI and navigation"

# Create tag
git tag -a "v$VERSION" -m "Version $VERSION"

echo "Release $VERSION complete!"
