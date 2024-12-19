const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// Create a 1024x1024 canvas
const canvas = createCanvas(1024, 1024);
const ctx = canvas.getContext('2d');

// Draw a simple icon (golden rooster silhouette)
ctx.fillStyle = '#FFD700'; // Gold color
ctx.fillRect(0, 0, 1024, 1024);

// Save the icon
const buffer = canvas.toBuffer('image/png');
fs.mkdirSync(path.join(__dirname, '../assets'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../assets/icon.png'), buffer); 