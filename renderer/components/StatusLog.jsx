import React, { useRef, useEffect } from 'react';

const TYPE_STYLES = {
  success: 'text-brand-500',
  error:   'text-red-400',
  info:    'text-sky-400',
  warn:    'text-yellow-400',
};

const TYPE_ICONS = {
  success: '✔',
  error:   '✖',
  info:    'ℹ',
  warn:    '⚠',
};

/**
 * StatusLog — auto-scrolling terminal-style log panel.
 */
export default function StatusLog({ logs, onClear }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="flex flex-col h-full">
      {/* Log header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-surface-700 shrink-0">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Status Log</span>
        {logs.length > 0 && (
          <button className="btn-ghost text-xs py-1 px-2" onClick={onClear}>Clear</button>
        )}
      </div>

      {/* Log entries */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-[11px] space-y-1 bg-surface-900">
        {logs.length === 0 ? (
          <p className="text-gray-600 text-center mt-6">No activity yet</p>
        ) : (
          [...logs].reverse().map((entry, i) => (
            <div key={i} className="flex items-start gap-2 fade-in">
              <span className="shrink-0 text-gray-600">
                {new Date(entry.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className={`shrink-0 ${TYPE_STYLES[entry.type] || 'text-gray-400'}`}>
                {TYPE_ICONS[entry.type] || '·'}
              </span>
              <span className="text-gray-300 break-words">{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
