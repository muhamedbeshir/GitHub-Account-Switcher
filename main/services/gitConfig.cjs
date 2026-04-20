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

/** Get the current global git user */
function getGitUser() {
  try {
    const name  = execGit('config --global user.name');
    const email = execGit('config --global user.email');
    return { name, email };
  } catch {
    return { name: '', email: '' };
  }
}

/** Set global git user.name and user.email */
function setGitUser(name, email) {
  execGit(`config --global user.name "${name}"`);
  execGit(`config --global user.email "${email}"`);
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

module.exports = { getGitUser, setGitUser, isGitInstalled };
