#!/bin/bash

# Get the new version
VERSION=$1

if [ -z "$VERSION" ]; then
    echo "Please provide a version number (e.g. ./release.sh 1.2.3)"
    exit 1
fi

# Update version in package.json
sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" package.json

# Add and commit changes
git add package.json CHANGELOG.md
git commit -m "Release version $VERSION"

# Create and push tag
git tag -a "v$VERSION" -m "Release $VERSION"
git push origin main
git push origin "v$VERSION"

echo "Released version $VERSION"
