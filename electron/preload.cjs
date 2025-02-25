// electron/preload.cjs
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getBasePath: () => ipcRenderer.invoke('getBasePath'),
  readLocalFile: (filePath) => ipcRenderer.invoke('readLocalFile', filePath)
});
