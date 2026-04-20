/**
 * sshManager.js
 * Manages SSH keys and the ~/.ssh/config file for GitHub account switching.
 *
 * Strategy:
 *  - Each account uses a dedicated Host alias in ~/.ssh/config:
 *      Host github-<username>
 *        HostName github.com
 *        User git
 *        IdentityFile ~/.ssh/id_<username>
 *        IdentitiesOnly yes
 *
 *  - The "active" account also sets the bare `github.com` host entry,
 *    so that plain `git clone git@github.com:...` uses the active key.
 */

const fs          = require('fs');
const path        = require('path');
const os          = require('os');
const { execSync } = require('child_process');

const SSH_DIR    = path.join(os.homedir(), '.ssh');
const CONFIG_FILE = path.join(SSH_DIR, 'config');

// ── helpers ───────────────────────────────────────────────────────────────────
function ensureSshDir() {
  if (!fs.existsSync(SSH_DIR)) fs.mkdirSync(SSH_DIR, { mode: 0o700 });
}

function readSshConfig() {
  if (!fs.existsSync(CONFIG_FILE)) return '';
  return fs.readFileSync(CONFIG_FILE, 'utf8');
}

function writeSshConfig(content) {
  ensureSshDir();
  // Backup before every write
  if (fs.existsSync(CONFIG_FILE)) {
    const backup = CONFIG_FILE + '.bak';
    fs.copyFileSync(CONFIG_FILE, backup);
  }
  fs.writeFileSync(CONFIG_FILE, content, { encoding: 'utf8', mode: 0o600 });
}

/**
 * Parse the SSH config file into an array of Host blocks.
 * Each block is a raw string.
 */
function parseBlocks(raw) {
  const lines  = raw.split('\n');
  const blocks = [];
  let current  = [];

  for (const line of lines) {
    if (line.match(/^Host\s+/i) && current.length > 0) {
      blocks.push(current.join('\n'));
      current = [line];
    } else {
      current.push(line);
    }
  }
  if (current.length > 0) blocks.push(current.join('\n'));
  return blocks.filter((b) => b.trim());
}

/**
 * Remove all github-related blocks (both alias + active entry)
 * managed by this tool.
 */
function stripManagedBlocks(blocks) {
  return blocks.filter((b) => {
    const firstLine = b.split('\n')[0].trim();
    // Managed blocks: "Host github-<anything>"  or  "Host github.com # managed"
    return !firstLine.match(/^Host\s+github-/i) &&
           !firstLine.match(/^Host\s+github\.com\s*#\s*managed/i);
  });
}

/** Build an SSH config block for a given account */
function buildAccountBlock(account) {
  const keyPath = account.sshKeyPath || path.join(SSH_DIR, `id_${account.username}`);
  return [
    `Host github-${account.username}`,
    `  HostName github.com`,
    `  User git`,
    `  IdentityFile "${keyPath}"`,
    `  IdentitiesOnly yes`,
  ].join('\n');
}

/** Build the active (bare github.com) block */
function buildActiveBlock(account) {
  const keyPath = account.sshKeyPath || path.join(SSH_DIR, `id_${account.username}`);
  return [
    `Host github.com # managed`,
    `  HostName github.com`,
    `  User git`,
    `  IdentityFile "${keyPath}"`,
    `  IdentitiesOnly yes`,
  ].join('\n');
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Rebuild the entire SSH config with all account aliases + active block.
 * @param {Array} accounts  - all stored accounts
 * @param {string} activeId - id of the currently active account
 */
function applySshConfig(accounts, activeId) {
  const raw    = readSshConfig();
  const blocks = parseBlocks(raw);
  const others = stripManagedBlocks(blocks);

  const active         = accounts.find((a) => a.id === activeId);
  const accountBlocks  = accounts.filter((a) => a.authType === 'ssh').map(buildAccountBlock);
  const activeBlock    = active && active.authType === 'ssh' ? buildActiveBlock(active) : '';

  const parts = [
    ...others,
    ...(accountBlocks.length ? ['# ── GitHub Switcher (managed) ──'] : []),
    ...accountBlocks,
    ...(activeBlock ? [activeBlock] : []),
  ];

  writeSshConfig(parts.join('\n\n') + '\n');
}

/**
 * Scan ~/.ssh for existing private key files that look like GitHub keys.
 * Returns an array of { path, name } objects.
 */
function scanSshKeys() {
  ensureSshDir();
  return fs.readdirSync(SSH_DIR)
    .filter((f) => !f.endsWith('.pub') && !f.endsWith('.bak') && f !== 'config' && f !== 'known_hosts')
    .map((f) => ({ name: f, path: path.join(SSH_DIR, f) }));
}

/**
 * Generate an ed25519 SSH key pair for the given email.
 * @param {string} email
 * @param {string} username  - used to name the key file
 * @returns {string} path to the generated private key
 */
function generateSshKey(email, username) {
  ensureSshDir();
  const keyPath = path.join(SSH_DIR, `id_${username}`);
  if (fs.existsSync(keyPath)) return keyPath; // already exists

  execSync(
    `ssh-keygen -t ed25519 -C "${email}" -f "${keyPath}" -N ""`,
    { windowsHide: true, encoding: 'utf8' },
  );
  return keyPath;
}

/**
 * Read the public key for a given private key path.
 */
function readPublicKey(privateKeyPath) {
  const pubPath = privateKeyPath + '.pub';
  if (!fs.existsSync(pubPath)) return null;
  return fs.readFileSync(pubPath, 'utf8').trim();
}

module.exports = {
  applySshConfig,
  scanSshKeys,
  generateSshKey,
  readPublicKey,
};
