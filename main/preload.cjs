const { contextBridge, ipcRenderer } = require('electron');

/**
 * Secure IPC bridge exposed to the renderer.
 * Only explicitly listed channels are accessible — no raw ipcRenderer access.
 */
contextBridge.exposeInMainWorld('api', {
  // ── Accounts ────────────────────────────────────────────────
  getAccounts:         ()       => ipcRenderer.invoke('accounts:get'),
  addAccount:          (data)   => ipcRenderer.invoke('accounts:add', data),
  deleteAccount:       (id)     => ipcRenderer.invoke('accounts:delete', id),
  switchAccount:       (id)     => ipcRenderer.invoke('accounts:switch', id),
  detectCurrentGitUser: ()      => ipcRenderer.invoke('accounts:detectCurrent'),

  // ── Git / SSH ────────────────────────────────────────────────
  testConnection: (id)     => ipcRenderer.invoke('git:test', id),
  scanSshKeys:    ()       => ipcRenderer.invoke('ssh:scan'),
  generateSshKey: (email)  => ipcRenderer.invoke('ssh:generate', email),

  // ── Events from main → renderer ──────────────────────────────
  onLog: (cb) => {
    const handler = (_event, msg) => cb(msg);
    ipcRenderer.on('log', handler);
    return () => ipcRenderer.removeListener('log', handler);
  },

  onRefreshNeeded: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('accounts:refresh-needed', handler);
    return () => ipcRenderer.removeListener('accounts:refresh-needed', handler);
  },
});
