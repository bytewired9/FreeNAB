// electron/main.js
import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,  // Minimum width set to 600px
    minHeight: 400, // Minimum height set to 400px
    icon: path.join(__dirname, 'assets/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      enableRemoteModule: false,
    },
  });

  // Completely remove the menu bar
  mainWindow.setMenu(null);
  mainWindow.menuBarVisible = false;

  const startURL = app.isPackaged
    ? `file://${path.join(__dirname, '../dist/index.html')}`
    : process.env.VITE_DEV_SERVER_URL;

  mainWindow.loadURL(startURL);
});

// Return "resources" when built and "public" when in dev
ipcMain.handle('getBasePath', () => {
  return app.isPackaged 
    ? path.join(path.dirname(app.getPath('exe')), 'resources')
    : path.join(process.cwd(), 'public');
});

// Read a local file and return its contents
ipcMain.handle('readLocalFile', async (event, filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return data;
  } catch (error) {
    console.error('Error reading file:', filePath, error);
    throw error;
  }
});
