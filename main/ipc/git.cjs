/**
 * ipc/git.js
 * IPC handlers for git/ssh utilities:
 *  - Test GitHub SSH connection
 *  - Scan existing SSH keys
 *  - Generate a new SSH key pair
 */

const { execSync }             = require('child_process');
const { BrowserWindow }        = require('electron');
const { scanSshKeys, generateSshKey, readPublicKey } = require('../services/sshManager.cjs');

function log(win, type, message) {
  if (win) win.webContents.send('log', { type, message, ts: new Date().toISOString() });
}

function getWin() {
  return BrowserWindow.getAllWindows()[0] || null;
}

function registerGitHandlers(ipcMain) {
  // ── Test SSH connection to GitHub ─────────────────────────────
  ipcMain.handle('git:test', async (_e, accountId) => {
    const win = getWin();
    try {
      log(win, 'info', 'Testing SSH connection to github.com…');
      // ssh -T git@github.com exits with code 1 but prints the success message
      const result = execSync('ssh -T git@github.com 2>&1', {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000,
      });
      const ok = result.includes('successfully authenticated');
      if (ok) {
        log(win, 'success', `✔ Connected: ${result.trim()}`);
        return { ok: true, message: result.trim() };
      } else {
        log(win, 'error', `✖ Unexpected response: ${result.trim()}`);
        return { ok: false, message: result.trim() };
      }
    } catch (err) {
      // ssh exits 1 on success — check stdout
      const out = (err.stdout || err.message || '').toString();
      if (out.includes('successfully authenticated')) {
        log(win, 'success', `✔ ${out.trim()}`);
        return { ok: true, message: out.trim() };
      }
      log(win, 'error', `✖ Connection failed: ${out.trim() || err.message}`);
      return { ok: false, error: out || err.message };
    }
  });

  // ── Scan existing SSH keys ────────────────────────────────────
  ipcMain.handle('ssh:scan', async () => {
    try {
      const keys = scanSshKeys();
      return { ok: true, keys };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  // ── Generate new SSH key ──────────────────────────────────────
  ipcMain.handle('ssh:generate', async (_e, { email, username }) => {
    const win = getWin();
    try {
      log(win, 'info', `Generating ed25519 key for ${email}…`);
      const keyPath   = generateSshKey(email, username);
      const publicKey = readPublicKey(keyPath);
      log(win, 'success', `✔ Key created: ${keyPath}`);
      return { ok: true, keyPath, publicKey };
    } catch (err) {
      log(win, 'error', `✖ Key generation failed: ${err.message}`);
      return { ok: false, error: err.message };
    }
  });
}

module.exports = { registerGitHandlers };
