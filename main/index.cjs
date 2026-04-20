const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const path = require('path');

// ── IPC handler registrations ──────────────────────────────────────────────
const { registerAccountHandlers } = require('./ipc/accounts.cjs');
const { registerGitHandlers }     = require('./ipc/git.cjs');
const { createTray }              = require('./services/trayManager.cjs');

const isDev = !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 680,
    minWidth: 780,
    minHeight: 560,
    backgroundColor: '#0d1117',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#161b22',
      symbolColor: '#8b949e',
      height: 38,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(app.getAppPath(), 'assets/icon.png'),
    show: false,
  });

  // Graceful load
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Hide to Tray instead of closing
  mainWindow.on('close', (event) => {
    if (!app.isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    const indexPath = path.join(app.getAppPath(), 'dist/renderer/index.html');
    mainWindow.loadFile(indexPath);
  }
}

// Global error handler for main process
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  dialog.showErrorBox('Main Process Error', error.message || 'An unexpected error occurred');
});

// Ensure single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    
    // Initialize Tray
    createTray(mainWindow);

    registerAccountHandlers(ipcMain);
    registerGitHandlers(ipcMain);

    // Auto-start configuration (Windows)
    if (!isDev) {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: app.getPath('exe'),
        args: ['--hidden']
      });
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  // Prevent quitting, let Tray handle exit
  if (process.platform === 'darwin') {
    app.quit();
  }
});
