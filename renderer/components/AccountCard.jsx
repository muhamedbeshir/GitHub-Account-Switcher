import React, { useState } from 'react';

const AVATAR_BASE = 'https://github.com/';

/**
 * AccountCard — displays one GitHub account with switch / test / delete actions.
 */
export default function AccountCard({ account, onSwitch, onDelete, onTest, isSwitching }) {
  const [testing, setTesting]     = useState(false);
  const [testResult, setTestResult] = useState(null); // null | 'ok' | 'fail'
  const [confirming, setConfirming] = useState(false);

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    const res = await onTest(account.id);
    setTestResult(res.ok ? 'ok' : 'fail');
    setTesting(false);
    setTimeout(() => setTestResult(null), 4000);
  }

  const isActive = account.isActive;

  return (
    <div
      className={`
        glass rounded-xl p-4 flex flex-col gap-3 transition-all duration-200 slide-up
        ${isActive ? 'active-glow border-brand-500/40' : 'hover:border-surface-500'}
      `}
    >
      {/* Top row: avatar + info + active badge */}
      <div className="flex items-start gap-3">
        <img
          src={`${AVATAR_BASE}${account.username}.png?size=64`}
          alt={account.username}
          className="w-10 h-10 rounded-full bg-surface-600 border border-surface-600 shrink-0"
          onError={(e) => {
            e.currentTarget.src = `https://ui-avatars.com/api/?name=${account.username}&background=30363d&color=8b949e&size=64`;
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-white text-sm truncate">{account.label || account.username}</span>
            {isActive && (
              <span className="badge-active">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
                Active
              </span>
            )}
            <span className={account.authType === 'ssh' ? 'badge-ssh' : 'badge-https'}>
              {account.authType === 'ssh' ? '🔑 SSH' : '🔒 HTTPS'}
            </span>
          </div>
          <p className="text-xs text-gray-400 font-mono mt-0.5 truncate">@{account.username}</p>
          <p className="text-xs text-gray-500 truncate">{account.email}</p>
        </div>
      </div>

      {/* SSH key path */}
      {account.sshKeyPath && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-surface-800 border border-surface-700">
          <span className="text-gray-500 text-[10px]">KEY</span>
          <span className="text-[11px] font-mono text-gray-400 truncate flex-1">{account.sshKeyPath}</span>
        </div>
      )}

      {/* Test result banner */}
      {testResult && (
        <div className={`text-xs px-3 py-1.5 rounded-md font-medium fade-in ${testResult === 'ok' ? 'bg-brand-500/10 text-brand-500 border border-brand-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {testResult === 'ok' ? '✔ Connection successful' : '✖ Connection failed — check the log'}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-1">
        {!isActive && (
          <button
            className="btn-primary flex-1 justify-center"
            onClick={() => onSwitch(account.id)}
            disabled={isSwitching}
          >
            {isSwitching === account.id ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                </svg>
                Switching…
              </>
            ) : '⇄ Switch'}
          </button>
        )}

        {account.authType === 'ssh' && (
          <button
            className="btn-secondary"
            onClick={handleTest}
            disabled={testing}
            title="Test SSH connection to GitHub"
          >
            {testing ? (
              <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
              </svg>
            ) : '⚡ Test'}
          </button>
        )}

        {confirming ? (
          <div className="flex gap-1 fade-in">
            <button className="btn-danger text-xs" onClick={() => onDelete(account.id)}>Confirm</button>
            <button className="btn-ghost text-xs" onClick={() => setConfirming(false)}>Cancel</button>
          </div>
        ) : (
          <button
            className="btn-ghost px-2.5"
            onClick={() => setConfirming(true)}
            title="Remove account"
          >
            🗑
          </button>
        )}
      </div>
    </div>
  );
}
