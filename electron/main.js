const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  const startURL = app.isPackaged
    ? `file://${path.join(__dirname, '../dist/index.html')}`
    : process.env.VITE_DEV_SERVER_URL;

  mainWindow.loadURL(startURL);
});
