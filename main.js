require('dotenv').config();
const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')
const os = require('os')

// Set production environment when app is packaged
if (app.isPackaged) {
    process.env.NODE_ENV = 'production';
    
    // Ensure logs directory exists
    const logDir = path.join(os.homedir(), '.rez_coq', 'logs');
    try {
        fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
    } catch (e) {
        console.error('Error creating logs directory:', e);
    }
}

const server = require('./index.js')

let mainWindow = null

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  // Try port 3000 first, then 3001
  const tryConnect = (port) => {
    mainWindow.loadURL(`http://localhost:${port}`).catch(() => {
      if (port < 3002) { // Try next port if current fails
        tryConnect(port + 1)
      }
    })
  }

  tryConnect(3000)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
}) 