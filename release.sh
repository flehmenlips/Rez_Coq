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
# Check if tag exists
if git rev-parse "v$VERSION" >/dev/null 2>&1; then
    echo "Warning: Tag v$VERSION already exists. Incrementing patch version..."
    # Split version into major.minor.patch
    IFS='.' read -r major minor patch <<< "$VERSION"
    # Increment patch
    VERSION="$major.$minor.$((patch + 1))"
    echo "New version: $VERSION"
fi

# Force update version in package.json
npm --no-git-tag-version version $VERSION --force

# Stage changes
git add .

# Prompt for commit message
echo "Enter additional commit message (press Enter to skip):"
read -r COMMIT_MSG

# Base commit message
BASE_MSG="Release $VERSION

- Customer registration and management system
- Converted to pure web application
- Removed Electron dependencies
- Simplified deployment process
- Improved login UI and navigation"

# Combine messages if additional message provided
if [ ! -z "$COMMIT_MSG" ]; then
    FULL_MSG="$BASE_MSG

$COMMIT_MSG"
else
    FULL_MSG="$BASE_MSG"
fi

# Commit
git commit -m "$FULL_MSG"

# Create tag
git tag -a "v$VERSION" -m "Version $VERSION" --force

echo "Release $VERSION complete!"
