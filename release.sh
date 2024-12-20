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

# Clean and test steps
echo "1. Cleaning environment..."
rm -rf node_modules/
rm -rf dist/
rm -rf ~/.rez_coq/  # Remove production database

echo "2. Fresh install of dependencies..."
npm ci || exit 1

echo "2a. Rebuilding native modules..."
npm run rebuild

echo "3. Skipping tests (TODO: Implement test suite)"

# Database initialization test
echo "4. Testing database initialization..."
NODE_ENV=production npm run start:prod &
SERVER_PID=$!
sleep 5  # Give the server time to start

# Check if database was created (check both prod and dev locations)
PROJECT_DB="$(pwd)/dev_db/database.sqlite"
HOME_DB="$HOME/.rez_coq/db/database.sqlite"

if [ ! -f "$PROJECT_DB" ] && [ ! -f "$HOME_DB" ]; then
    echo "Database initialization failed!"
    kill $SERVER_PID
    exit 1
else
    echo "Database created successfully at:"
    [ -f "$PROJECT_DB" ] && echo "- $PROJECT_DB"
    [ -f "$HOME_DB" ] && echo "- $HOME_DB"
fi

# Kill the test server
kill $SERVER_PID

# Update version in package.json
echo "5. Updating package.json version..."
npm version $VERSION --no-git-tag-version

# Update changelog date
echo "6. Updating CHANGELOG.md..."
sed -i "s/## \[$VERSION\] - YYYY-MM-DD/## [$VERSION] - $(date +%Y-%m-%d)/" CHANGELOG.md

# Execute release steps (before build)
echo "7. Adding changes (excluding dist)..."
git add . ':!dist'

echo "8. Committing changes..."
git commit -m "$COMMIT_MESSAGE"

# Only try to merge if feature branches exist
if git branch | grep -q "feature/"; then
    echo "9. Merging feature branches to develop..."
    git checkout develop || exit 1
    git merge --no-ff feature/* -m "Merge feature branch into develop" || exit 1
else
    echo "9. No feature branches to merge..."
fi

echo "10. Merging to main..."
git checkout main || exit 1
git merge --no-ff develop -m "Merge develop into main for v$VERSION" || exit 1

echo "11. Creating version tag..."
git tag -a "v$VERSION" -m "$COMMIT_MESSAGE"

echo "12. Pushing changes..."
git push origin main
git push origin develop
git push origin --tags

# Build the Electron app (after git operations)
echo "13. Building Electron app..."
npm run build

# Final verification
echo "14. Running final verification..."
# Test the built app
if [ -d "dist" ]; then
    echo "Build successful - distribution files created"
else
    echo "Build failed - no distribution files found"
    exit 1
fi

echo "Release v$VERSION completed successfully!"
echo "Native app package is available in the dist/ directory"
echo "Don't forget to verify the following manually:"
echo "1. Check database initialization in the packaged app"
echo "2. Verify settings table has correct default values"
echo "3. Test error handling in both dev and prod modes"
echo "4. Verify all CRUD operations on reservations"
