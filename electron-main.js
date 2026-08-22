const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    minWidth: 960,
    minHeight: 540,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#08060b',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      devTools: false
    }
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.webContents.on('before-input-event', (_event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') mainWindow.setFullScreen(!mainWindow.isFullScreen());
    if (input.key === 'Escape' && mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
