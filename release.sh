#!/bin/bash

# Pull latest changes
git pull origin main

# Update version
npm version $1

# Push changes
git push origin main
git push origin --tags

# Restart the server (using pm2 or similar)
pm2 restart rez_coq

echo "Deployment complete"
