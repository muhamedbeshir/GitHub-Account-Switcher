/**
 * accountStore.js
 * Persists GitHub accounts in an AES-256-GCM encrypted JSON file.
 * Tokens/secrets are encrypted individually before storage.
 *
 * Account schema:
 * {
 *   id:        string   (uuid v4)
 *   label:     string   (display name, e.g. "Work")
 *   username:  string   (GitHub username)
 *   email:     string
 *   authType:  'ssh' | 'https'
 *   sshKeyPath?: string (path to private key, e.g. ~/.ssh/id_work)
 *   token?:    string   (ENCRYPTED personal access token for https)
 *   isActive:  boolean
 *   createdAt: ISO string
 * }
 */

const { app }          = require('electron');
const path             = require('path');
const fs               = require('fs');
const crypto           = require('crypto');
const { encrypt, decrypt } = require('./crypto.cjs');

const STORE_FILE = path.join(app.getPath('userData'), 'accounts.enc');

// ── helpers ───────────────────────────────────────────────────────────────────
function readStore() {
  if (!fs.existsSync(STORE_FILE)) return { accounts: [] };
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8');
    return JSON.parse(decrypt(raw));
  } catch {
    return { accounts: [] };
  }
}

function writeStore(data) {
  const encrypted = encrypt(JSON.stringify(data));
  fs.writeFileSync(STORE_FILE, encrypted, 'utf8');
}

// ── public API ────────────────────────────────────────────────────────────────
function getAllAccounts() {
  const store = readStore();
  // Never expose raw tokens to renderer — mask them
  return store.accounts.map((a) => ({
    ...a,
    token: a.token ? '••••••••' : undefined,
  }));
}

function addAccount({ label, username, email, authType, sshKeyPath, token, forceActive }) {
  const store = readStore();

  // If forceActive, mark all existing accounts as not active
  const hasExisting = store.accounts.length > 0;
  if (forceActive && hasExisting) {
    store.accounts.forEach((a) => { a.isActive = false; });
  }

  const account = {
    id:        crypto.randomUUID(),
    label:     label || username,
    username,
    email,
    authType:  authType || 'ssh',
    sshKeyPath: sshKeyPath || null,
    token:     token ? encrypt(token) : null,
    // Active if: forced active, OR it's the very first account
    isActive:  forceActive || store.accounts.length === 0,
    createdAt: new Date().toISOString(),
  };

  store.accounts.push(account);
  writeStore(store);
  return { ...account, token: token ? '••••••••' : null };
}

function deleteAccount(id) {
  const store = readStore();
  store.accounts = store.accounts.filter((a) => a.id !== id);
  writeStore(store);
}

function getActiveAccount() {
  const store = readStore();
  return store.accounts.find((a) => a.isActive) || null;
}

function setActiveAccount(id) {
  const store = readStore();
  store.accounts.forEach((a) => { a.isActive = a.id === id; });
  writeStore(store);
  return store.accounts.find((a) => a.id === id) || null;
}

/** Returns the raw (decrypted) token for a given account id — main process only */
function getRawToken(id) {
  const store = readStore();
  const acc   = store.accounts.find((a) => a.id === id);
  if (!acc || !acc.token) return null;
  try { return decrypt(acc.token); } catch { return null; }
}

// ── Project Management ────────────────────────────────────────────────────────
function getProjects() {
  const store = readStore();
  return store.projects || [];
}

function addProject(path) {
  const store = readStore();
  if (!store.projects) store.projects = [];
  if (!store.projects.includes(path)) {
    store.projects.push(path);
    writeStore(store);
  }
}

function removeProject(path) {
  const store = readStore();
  if (!store.projects) return;
  store.projects = store.projects.filter((p) => p !== path);
  writeStore(store);
}

module.exports = {
  getAllAccounts,
  addAccount,
  deleteAccount,
  getActiveAccount,
  setActiveAccount,
  getRawToken,
  getProjects,
  addProject,
  removeProject,
};
