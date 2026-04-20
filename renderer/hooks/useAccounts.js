import { useState, useCallback, useEffect } from 'react';

/**
 * Central state hook for account management.
 * All window.api calls happen here — components stay purely presentational.
 */
export function useAccounts() {
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [switching, setSwitching] = useState(null); // id of account being switched to
  const [logs, setLogs]           = useState([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await window.api.getAccounts();

    // ── Auto-reconcile active account from system git config ──────
    const hasActive = data.some((a) => a.isActive);
    if (!hasActive && data.length > 0) {
      try {
        const current = await window.api.detectCurrentGitUser();
        if (current?.email) {
          const match = data.find(
            (a) => a.email.toLowerCase() === current.email.toLowerCase()
          );
          if (match) {
            await window.api.switchAccount(match.id);
            const refreshed = await window.api.getAccounts();
            setAccounts(refreshed);
            setLoading(false);
            return;
          }
        }
      } catch (_) { /* ignore */ }
    }

    setAccounts(data);
    setLoading(false);
  }, []);

  const addAccount = useCallback(async (formData) => {
    const res = await window.api.addAccount(formData);
    if (res.ok) await refresh();
    return res;
  }, [refresh]);

  const deleteAccount = useCallback(async (id) => {
    await window.api.deleteAccount(id);
    await refresh();
  }, [refresh]);

  const switchAccount = useCallback(async (id) => {
    setSwitching(id);
    const res = await window.api.switchAccount(id);
    await refresh();
    setSwitching(null);
    return res;
  }, [refresh]);

  const testConnection = useCallback(async (id) => {
    return window.api.testConnection(id);
  }, []);

  const generateSshKey = useCallback(async ({ email, username }) => {
    return window.api.generateSshKey({ email, username });
  }, []);

  const scanSshKeys = useCallback(async () => {
    return window.api.scanSshKeys();
  }, []);
  
  const fixProjectSsh = useCallback(async () => {
    const folder = await window.api.selectFolder();
    if (!folder) return;
    
    setLogs((prev) => [{ type: 'info', message: `Checking: ${folder}`, ts: new Date().toISOString() }, ...prev]);
    
    const { url } = await window.api.detectRemote(folder);
    if (!url) {
      setLogs((prev) => [{ type: 'error', message: `✖ Not a git repo: ${folder}`, ts: new Date().toISOString() }, ...prev]);
      return;
    }
    
    if (url.startsWith('git@github.com:')) {
      setLogs((prev) => [{ type: 'success', message: `✔ Already SSH: ${url}`, ts: new Date().toISOString() }, ...prev]);
      return;
    }
    
    const res = await window.api.convertToSsh(folder);
    if (res.ok) {
      setLogs((prev) => [{ type: 'success', message: `🎉 Fixed! Remote set to SSH`, ts: new Date().toISOString() }, ...prev]);
    } else {
      setLogs((prev) => [{ type: 'error', message: `✖ Fix failed: ${res.error}`, ts: new Date().toISOString() }, ...prev]);
    }
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  // ── Effects ───────────────────────────

  // Sync state on mount
  useEffect(() => { 
    refresh(); 
  }, [refresh]);

  // Subscribe to main-process events
  useEffect(() => {
    const unsubLog = window.api.onLog((msg) => {
      setLogs((prev) => [msg, ...prev].slice(0, 200));
    });
    
    const unsubRefresh = window.api.onRefreshNeeded(() => {
      refresh();
    });

    return () => {
      unsubLog();
      unsubRefresh();
    };
  }, [refresh]);

  return {
    accounts,
    loading,
    switching,
    logs,
    refresh,
    addAccount,
    deleteAccount,
    switchAccount,
    testConnection,
    generateSshKey,
    scanSshKeys,
    fixProjectSsh,
    clearLogs,
  };
}
