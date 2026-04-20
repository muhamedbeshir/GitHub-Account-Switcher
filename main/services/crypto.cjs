/**
 * crypto.js
 * AES-256-GCM encryption/decryption for the account store.
 * The master key is derived from a machine-unique fingerprint so the
 * encrypted file is unreadable if copied to another machine.
 */

const crypto = require('crypto');
const os     = require('os');

const ALGO      = 'aes-256-gcm';
const IV_LEN    = 16;
const TAG_LEN   = 16;
const SALT      = 'github-switcher-salt-v1';

/** Derive a 32-byte key from the machine hostname + username. */
function deriveMasterKey() {
  const seed = `${os.hostname()}::${os.userInfo().username}::${SALT}`;
  return crypto.scryptSync(seed, SALT, 32);
}

const MASTER_KEY = deriveMasterKey();

/**
 * Encrypt a plain-text string.
 * @returns {string} base64-encoded  iv + tag + ciphertext
 */
function encrypt(plaintext) {
  const iv     = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, MASTER_KEY, iv);
  const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

/**
 * Decrypt a base64-encoded payload produced by `encrypt`.
 * @returns {string} original plaintext
 */
function decrypt(payload) {
  const buf     = Buffer.from(payload, 'base64');
  const iv      = buf.subarray(0, IV_LEN);
  const tag     = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc     = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, MASTER_KEY, iv);
  decipher.setAuthTag(tag);
  return decipher.update(enc) + decipher.final('utf8');
}

module.exports = { encrypt, decrypt };
