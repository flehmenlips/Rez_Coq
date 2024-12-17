#!/bin/bash

# release.sh - Automated release script for Rez_Coq
# Usage: ./release.sh <version>

# Check if version is provided
if [ $# -lt 1 ]; then
    echo "Usage: ./release.sh <version>"
    echo "Example: ./release.sh 0.0.5"
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

# Execute release steps
echo "1. Adding all changes..."
git add .

echo "2. Committing changes..."
git commit -m "$COMMIT_MESSAGE"

echo "3. Merging to develop..."
git checkout develop || exit 1
git merge --no-ff feature/* -m "Merge feature branch into develop" || exit 1

echo "4. Merging to main..."
git checkout main || exit 1
git merge --no-ff develop -m "Merge develop into main for v$VERSION" || exit 1

echo "5. Creating version tag..."
git tag -a "v$VERSION" -m "$COMMIT_MESSAGE"

echo "6. Pushing changes..."
git push origin main
git push origin develop
git push origin --tags

echo "7. Cleaning up..."
git branch -D $(git branch | grep 'feature/' | tr -d ' ') 2>/dev/null || true

echo "Release v$VERSION completed successfully!"
echo "Don't forget to update CHANGELOG.md if needed." 