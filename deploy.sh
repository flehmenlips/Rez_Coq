#!/bin/bash

# Production environment setup
export NODE_ENV=production

# Install dependencies
npm install --production

# Start with PM2
pm2 start main.js --name "rez_coq"

# Save PM2 process list
pm2 save 