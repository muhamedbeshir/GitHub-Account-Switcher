import React, { useState, useEffect } from 'react';

const STEPS = ['Details', 'Auth', 'SSH Key'];

const INITIAL = {
  label: '', username: '', email: '',
  authType: 'ssh', sshKeyPath: '', token: '',
  generateKey: false,
};

/**
 * AddAccountModal — multi-step wizard to add a GitHub account.
 * Step 1: username / email / label
 * Step 2: auth type (SSH or HTTPS)
 * Step 3: SSH key path or generate key
 */
export default function AddAccountModal({ onAdd, onClose, onScanKeys, onGenerateKey }) {
  const [step, setStep]         = useState(0);
  const [form, setForm]         = useState(INITIAL);
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [sshKeys, setSshKeys]   = useState([]);
  const [genResult, setGenResult] = useState(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Load existing SSH keys on step 2
  useEffect(() => {
    if (step === 2) {
      onScanKeys().then((r) => { if (r.ok) setSshKeys(r.keys); });
    }
  }, [step, onScanKeys]);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    setError('');
  }

  function validateStep() {
    if (step === 0) {
      if (!form.username.trim()) return 'GitHub username is required';
      if (!form.email.trim())    return 'Email is required';
    }
    if (step === 2 && form.authType === 'ssh' && !form.sshKeyPath && !form.generateKey)
      return 'Select an existing key or choose "Generate new key"';
    return null;
  }

  async function handleNext() {
    const err = validateStep();
    if (err) { setError(err); return; }

    if (step < (form.authType === 'ssh' ? 2 : 1)) {
      setStep((s) => s + 1);
      return;
    }
    // Last step — submit
    await handleSubmit();
  }

  async function handleGenerate() {
    setBusy(true);
    const res = await onGenerateKey({ email: form.email, username: form.username });
    if (res.ok) {
      setGenResult(res);
      set('sshKeyPath', res.keyPath);
    } else {
      setError(res.error || 'Key generation failed');
    }
    setBusy(false);
  }

  async function handleSubmit() {
    setBusy(true);
    const payload = {
      label:      form.label || form.username,
      username:   form.username,
      email:      form.email,
      authType:   form.authType,
      sshKeyPath: form.authType === 'ssh' ? form.sshKeyPath : undefined,
      token:      form.authType === 'https' ? form.token : undefined,
    };
    const res = await onAdd(payload);
    setBusy(false);
    if (res.ok) {
      onClose();
    } else {
      setError(res.error || 'Failed to add account');
    }
  }

  const totalSteps = form.authType === 'ssh' ? 3 : 2;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Dialog */}
      <div className="glass rounded-2xl w-full max-w-md slide-up overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700">
          <div>
            <h2 className="text-base font-semibold text-white">Add GitHub Account</h2>
            <p className="text-xs text-gray-500 mt-0.5">Step {step + 1} of {totalSteps} — {STEPS[step]}</p>
          </div>
          <button className="btn-ghost p-1.5 text-lg" onClick={onClose}>✕</button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-surface-700">
          <div
            className="h-full bg-brand-500 transition-all duration-300"
            style={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* ── Step 0: Details ── */}
          {step === 0 && (
            <>
              <Field label="Nickname / Label" hint="e.g. Work, Personal">
                <input className="input" placeholder="Work" value={form.label}
                  onChange={(e) => set('label', e.target.value)} />
              </Field>
              <Field label="GitHub Username *">
                <input className="input font-mono" placeholder="octocat" value={form.username}
                  onChange={(e) => set('username', e.target.value)} />
              </Field>
              <Field label="Email *">
                <input className="input" type="email" placeholder="you@example.com" value={form.email}
                  onChange={(e) => set('email', e.target.value)} />
              </Field>
            </>
          )}

          {/* ── Step 1: Auth type ── */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">How does this account authenticate with GitHub?</p>
              {['ssh', 'https'].map((type) => (
                <label
                  key={type}
                  className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-150 ${
                    form.authType === type
                      ? 'border-brand-500/50 bg-brand-500/5'
                      : 'border-surface-600 bg-surface-800 hover:border-surface-500'
                  }`}
                >
                  <input type="radio" name="authType" value={type} className="mt-0.5"
                    checked={form.authType === type}
                    onChange={() => set('authType', type)} />
                  <div>
                    <p className="font-medium text-white text-sm">{type === 'ssh' ? '🔑 SSH Key' : '🔒 Personal Access Token (HTTPS)'}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {type === 'ssh'
                        ? 'Recommended. Uses an SSH key pair for passwordless auth.'
                        : 'Uses a GitHub PAT stored encrypted locally.'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* ── Step 2: SSH key (only if ssh) ── */}
          {step === 2 && form.authType === 'ssh' && (
            <div className="space-y-4">
              {/* Existing keys */}
              {sshKeys.length > 0 && (
                <Field label="Select existing key">
                  <select className="input font-mono"
                    value={form.sshKeyPath}
                    onChange={(e) => { set('sshKeyPath', e.target.value); set('generateKey', false); }}>
                    <option value="">— choose —</option>
                    {sshKeys.map((k) => (
                      <option key={k.path} value={k.path}>{k.name}</option>
                    ))}
                  </select>
                </Field>
              )}

              {/* Custom path */}
              <Field label="Or enter key path manually">
                <input className="input font-mono" placeholder="~/.ssh/id_ed25519"
                  value={form.sshKeyPath}
                  onChange={(e) => { set('sshKeyPath', e.target.value); set('generateKey', false); }} />
              </Field>

              {/* Generate */}
              <div className="border-t border-surface-700 pt-4">
                {genResult ? (
                  <div className="bg-brand-500/10 border border-brand-500/20 rounded-lg p-3 space-y-2">
                    <p className="text-xs text-brand-500 font-semibold">✔ Key generated at {genResult.keyPath}</p>
                    <p className="text-[11px] text-gray-400">Add this public key to your GitHub → Settings → SSH keys:</p>
                    <pre className="text-[10px] font-mono text-gray-300 bg-surface-800 rounded p-2 overflow-x-auto whitespace-pre-wrap break-all">
                      {genResult.publicKey}
                    </pre>
                  </div>
                ) : (
                  <button className="btn-secondary w-full justify-center" onClick={handleGenerate} disabled={busy}>
                    {busy ? 'Generating…' : '⚡ Generate new ed25519 key'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── HTTPS token ── */}
          {step === 1 && form.authType === 'https' && (
            <Field label="Personal Access Token" hint="Stored encrypted — never plain text">
              <input className="input font-mono" type="password" placeholder="ghp_••••••••••••••"
                value={form.token}
                onChange={(e) => set('token', e.target.value)} />
            </Field>
          )}

          {error && (
            <p className="text-red-400 text-xs bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2 fade-in">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700 bg-surface-800/50">
          <button className="btn-ghost" onClick={() => step === 0 ? onClose() : setStep((s) => s - 1)}>
            {step === 0 ? 'Cancel' : '← Back'}
          </button>
          <button className="btn-primary" onClick={handleNext} disabled={busy}>
            {busy ? 'Saving…' : step === totalSteps - 1 ? '✔ Add Account' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div className="flex items-baseline gap-2 mb-1.5">
        <label className="text-xs font-medium text-gray-300">{label}</label>
        {hint && <span className="text-[10px] text-gray-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
