#!/bin/bash

# release.sh - Automated release script for Rez_Coq
# Usage: ./release.sh <version>

# Check if version is provided
if [ $# -lt 1 ]; then
    echo "Usage: ./release.sh <version>"
    echo "Example: ./release.sh 1.1.0"
    exit 1
fi

VERSION=$1

# Prompt for commit message
echo "Please enter a commit message for version v$VERSION:"
echo "Format: Brief description of changes"
echo -n "> "
read -r COMMIT_MESSAGE

# Confirm the commit message
echo -e "\nYou entered: \"$COMMIT_MESSAGE\""
echo -n "Is this correct? (y/n): "
read -r CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "Release cancelled. Please try again."
    exit 1
fi

echo -e "\nStarting release process for v$VERSION..."

# Update version in package.json
echo "1. Updating package.json version..."
npm version $VERSION --no-git-tag-version

# Execute release steps (before build)
echo "2. Adding changes (excluding dist)..."
git add . ':!dist'

echo "3. Committing changes..."
git commit -m "$COMMIT_MESSAGE"

# Only try to merge if feature branches exist
if git branch | grep -q "feature/"; then
    echo "4. Merging feature branches to develop..."
    git checkout develop || exit 1
    git merge --no-ff feature/* -m "Merge feature branch into develop" || exit 1
else
    echo "4. No feature branches to merge..."
fi

echo "5. Merging to main..."
git checkout main || exit 1
git merge --no-ff develop -m "Merge develop into main for v$VERSION" || exit 1

echo "6. Creating version tag..."
git tag -a "v$VERSION" -m "$COMMIT_MESSAGE"

echo "7. Pushing changes..."
git push origin main
git push origin develop
git push origin --tags

# Build the Electron app (after git operations)
echo "8. Building Electron app..."
rm -rf dist/
npm run build

echo "Release v$VERSION completed successfully!"
echo "Native app package is available in the dist/ directory"
echo "Don't forget to update CHANGELOG.md if needed."
