const { app, BrowserWindow } = require('electron')
const path = require('path')
const express = require('express')
const server = require('./index.js')  // Import your server file

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