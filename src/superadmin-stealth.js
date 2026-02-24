const STEALTH_KEY_STORAGE = 'tde_superadmin_stealth_key';
const STEALTH_TS_STORAGE = 'tde_superadmin_stealth_ts';
const STEALTH_TTL_MS = 12 * 60 * 60 * 1000;
const DEFAULT_STEALTH_KEY = 'TDE-2026';

function getRequiredStealthKey() {
  return String(import.meta.env.VITE_SUPERADMIN_STEALTH_KEY || DEFAULT_STEALTH_KEY).trim();
}

function getStealthRecord() {
  try {
    const key = localStorage.getItem(STEALTH_KEY_STORAGE) || '';
    const ts = Number(localStorage.getItem(STEALTH_TS_STORAGE) || 0);
    return { key, ts: Number.isFinite(ts) ? ts : 0 };
  } catch {
    return { key: '', ts: 0 };
  }
}

function saveStealthRecord(candidate) {
  try {
    localStorage.setItem(STEALTH_KEY_STORAGE, String(candidate || '').trim());
    localStorage.setItem(STEALTH_TS_STORAGE, String(Date.now()));
  } catch {
    // ignore storage errors
  }
}

function clearStealthRecord() {
  try {
    localStorage.removeItem(STEALTH_KEY_STORAGE);
    localStorage.removeItem(STEALTH_TS_STORAGE);
  } catch {
    // ignore storage errors
  }
}

function hasStealthAccess() {
  const required = getRequiredStealthKey();
  if (!required) return true;
  const { key, ts } = getStealthRecord();
  if (!key || key !== required) return false;
  if (!ts || (Date.now() - ts) > STEALTH_TTL_MS) {
    clearStealthRecord();
    return false;
  }
  return true;
}

function unlockStealthAccess(candidate) {
  const required = getRequiredStealthKey();
  const safeCandidate = String(candidate || '').trim();
  if (!required || safeCandidate === required) {
    saveStealthRecord(required || safeCandidate);
    return true;
  }
  return false;
}

function ensureStealthOrRedirect(options = {}) {
  const redirectTo = String(options.redirectTo || '/client/login.html');
  if (hasStealthAccess()) return true;
  if (typeof window !== 'undefined') {
    window.location.href = redirectTo;
  }
  return false;
}

const superadminStealth = {
  getRequiredStealthKey,
  hasStealthAccess,
  unlockStealthAccess,
  clearStealthRecord,
  ensureStealthOrRedirect
};

if (typeof window !== 'undefined') {
  window.superadminStealth = superadminStealth;
}

export default superadminStealth;
