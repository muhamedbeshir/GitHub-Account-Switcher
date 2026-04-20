/**
 * gitConfig.js
 * Read and write the global git configuration (user.name, user.email).
 * Uses child_process to call the git binary directly.
 */

const { execSync } = require('child_process');

function execGit(args, opts = {}) {
  return execSync(`git ${args}`, {
    encoding: 'utf8',
    windowsHide: true,
    ...opts,
  }).trim();
}

/** Get the current git user (global by default, or local if cwd provided) */
function getGitUser(cwd = null) {
  const scope = cwd ? '--local' : '--global';
  const opts = cwd ? { cwd } : {};
  try {
    const name  = execGit(`config ${scope} user.name`, opts);
    const email = execGit(`config ${scope} user.email`, opts);
    return { name, email };
  } catch {
    return { name: '', email: '' };
  }
}

/** Set git user.name and user.email (global or local) */
function setGitUser(name, email, cwd = null) {
  const scope = cwd ? '--local' : '--global';
  const opts = cwd ? { cwd } : {};
  execGit(`config ${scope} user.name "${name}"`, opts);
  execGit(`config ${scope} user.email "${email}"`, opts);
}

/** Verify git is installed and accessible */
function isGitInstalled() {
  try {
    execGit('--version');
    return true;
  } catch {
    return false;
  }
}

/** Get remote URL of a specific directory */
function getRemoteUrl(cwd) {
  try {
    return execGit('remote get-url origin', { cwd });
  } catch {
    return null;
  }
}

/** Convert HTTPS URL to SSH URL for origin */
function convertToSsh(cwd) {
  const url = getRemoteUrl(cwd);
  if (!url) return { ok: false, error: 'No remote "origin" found' };
  
  if (url.startsWith('https://github.com/')) {
    // Extract user/repo from https://github.com/user/repo.git or similar
    const cleanUrl = url.replace('https://github.com/', '').replace(/\.git$/, '');
    const sshUrl = `git@github.com:${cleanUrl}.git`;
    execGit(`remote set-url origin "${sshUrl}"`, { cwd });
    return { ok: true, newUrl: sshUrl };
  }
  
  if (url.startsWith('git@github.com:')) {
     return { ok: true, message: 'Already using SSH', url };
  }

  return { ok: false, error: 'Not a GitHub HTTPS URL' };
}

module.exports = { getGitUser, setGitUser, isGitInstalled, getRemoteUrl, convertToSsh };
