/**
 * trayManager.js
 * Manages the System Tray icon, menu, and quick-switch functionality.
 */

const { Tray, Menu, app, Notification } = require('electron');
const path = require('path');
const store = require('./accountStore.cjs');
const { setGitUser } = require('./gitConfig.cjs');
const { applySshConfig } = require('./sshManager.cjs');

let tray = null;
let mainWindowRef = null;

/**
 * Initialize the System Tray
 */
function createTray(mainWindow) {
  mainWindowRef = mainWindow;
  const iconPath = path.join(app.getAppPath(), 'assets/icon.png');
  
  tray = new Tray(iconPath);
  tray.setToolTip('GitHub Account Switcher');
  
  tray.on('click', () => {
    if (mainWindowRef) {
      if (mainWindowRef.isVisible()) {
        mainWindowRef.hide();
      } else {
        mainWindowRef.show();
        mainWindowRef.focus();
      }
    }
  });

  updateTrayMenu();
}

/**
 * Rebuild the tray context menu with current accounts
 */
function updateTrayMenu() {
  if (!tray) return;

  const accounts = store.getAllAccounts();
  const activeAccount = store.getActiveAccount();

  const menuTemplate = [
    {
      label: 'GitHub Switcher',
      enabled: false,
    },
    { type: 'separator' },
    // Account list
    ...accounts.map(acc => ({
      label: `${acc.isActive ? '● ' : '  '}${acc.label || acc.username}`,
      type: 'normal',
      click: () => {
        if (!acc.isActive) {
          handleQuickSwitch(acc.id);
        }
      }
    })),
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        if (mainWindowRef) {
          mainWindowRef.show();
          mainWindowRef.focus();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ];

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);
}

/**
 * Handle switching accounts directly from the tray
 */
async function handleQuickSwitch(id) {
  try {
    const account = store.setActiveAccount(id);
    if (!account) return;

    // Apply Git config
    setGitUser(account.username, account.email);

    // Apply SSH config
    const all = store.getAllAccounts();
    applySshConfig(all, id);

    // Show Notification
    if (Notification.isSupported()) {
      new Notification({
        title: 'GitHub Account Switched',
        body: `Active account: ${account.label || account.username}`,
        icon: path.join(app.getAppPath(), 'assets/icon.png')
      }).show();
    }

    // Refresh menu to show new active dot
    updateTrayMenu();

    // Signal renderer to refresh if window is open
    if (mainWindowRef && !mainWindowRef.isDestroyed()) {
      mainWindowRef.webContents.send('accounts:refresh-needed');
    }

  } catch (err) {
    console.error('Tray switch failed:', err);
  }
}

module.exports = {
  createTray,
  updateTrayMenu
};
