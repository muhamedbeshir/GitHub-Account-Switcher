import React from 'react';

/** Top header bar — doubles as the frameless window drag region */
export default function Header({ activeAccount }) {
  return (
    <header className="drag-region flex items-center justify-between px-5 py-3 pr-[140px] border-b border-surface-700 bg-surface-800/80 backdrop-blur-sm">
      {/* Logo + title */}
      <div className="flex items-center gap-3 no-drag">
        <span className="text-xl select-none">⇄</span>
        <div>
          <h1 className="text-sm font-semibold text-white leading-none">GitHub Switcher</h1>
          <p className="text-[11px] text-gray-500 mt-0.5">Global account manager</p>
        </div>
      </div>

      {/* Active account pill */}
      <div className="no-drag flex items-center gap-2">
        {activeAccount ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-700 border border-surface-600">
            {/* Pulsing green dot */}
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
            </span>
            <span className="text-xs text-gray-300 font-medium">
              {activeAccount.label || activeAccount.username}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">@{activeAccount.username}</span>
          </div>
        ) : (
          <span className="text-xs text-gray-500">No active account</span>
        )}
      </div>
    </header>
  );
}
