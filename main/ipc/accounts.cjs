const { BrowserWindow, Notification }  = require('electron');
const path               = require('path');
const store              = require('../services/accountStore.cjs');
const { setGitUser, getGitUser } = require('../services/gitConfig.cjs');
const { applySshConfig } = require('../services/sshManager.cjs');
const { updateTrayMenu } = require('../services/trayManager.cjs');

function log(win, type, message) {
  if (win) win.webContents.send('log', { type, message, ts: new Date().toISOString() });
}

function getWin() {
  return BrowserWindow.getAllWindows()[0] || null;
}

function registerAccountHandlers(ipcMain) {
  // ── Get all accounts ──────────────────────────────────────────
  ipcMain.handle('accounts:get', () => {
    return store.getAllAccounts();
  });

  // ── Detect current git user on system ─────────────────────────
  ipcMain.handle('accounts:detectCurrent', () => {
    return getGitUser(); // { name, email }
  });

  // ── Add account ───────────────────────────────────────────────
  ipcMain.handle('accounts:add', async (_e, data) => {
    try {
      const currentGitUser = getGitUser();
      const isCurrentlyActive = currentGitUser.email &&
        currentGitUser.email.toLowerCase() === data.email.toLowerCase();

      const account = store.addAccount({ ...data, forceActive: isCurrentlyActive });
      const all     = store.getAllAccounts();
      
      applySshConfig(all.map((a) => ({ ...a, token: undefined })), all.find((a) => a.isActive)?.id);
      
      // Update Tray
      updateTrayMenu();

      if (isCurrentlyActive) {
        log(getWin(), 'info', `✔ Detected "${account.username}" as currently active git user`);
      }
      log(getWin(), 'success', `Added account: ${account.username}`);
      return { ok: true, account };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // ── Delete account ────────────────────────────────────────────
  ipcMain.handle('accounts:delete', async (_e, id) => {
    try {
      store.deleteAccount(id);
      const all = store.getAllAccounts();
      applySshConfig(all, all.find((a) => a.isActive)?.id);
      
      // Update Tray
      updateTrayMenu();

      log(getWin(), 'info', `Account removed`);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // ── Switch active account ─────────────────────────────────────
  ipcMain.handle('accounts:switch', async (_e, id) => {
    const win = getWin();
    try {
      const account = store.setActiveAccount(id);
      if (!account) throw new Error('Account not found');

      log(win, 'info', `Switching to → ${account.username}…`);

      setGitUser(account.username, account.email);
      const all = store.getAllAccounts();
      applySshConfig(all, id);

      // Update Tray
      updateTrayMenu();

      // Show OS Notification
      if (Notification.isSupported()) {
        new Notification({
          title: 'GitHub Switcher',
          body: `Switched to: ${account.label || account.username}`,
          icon: path.join(__dirname, '../../assets/icon.png')
        }).show();
      }

      log(win, 'success', `🎉 Active account is now: ${account.label || account.username}`);
      return { ok: true, account };
    } catch (err) {
      log(win, 'error', `✖ Switch failed: ${err.message}`);
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { registerAccountHandlers };
