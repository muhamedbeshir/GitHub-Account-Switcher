import React, { useState } from 'react';
import { useAccounts }      from './hooks/useAccounts';
import Header               from './components/Header';
import AccountCard          from './components/AccountCard';
import AddAccountModal      from './components/AddAccountModal';
import StatusLog            from './components/StatusLog';

export default function App() {
  const {
    accounts, loading, switching, logs,
    addAccount, deleteAccount, switchAccount,
    testConnection, generateSshKey, scanSshKeys,
    clearLogs,
  } = useAccounts();

  const [showModal, setShowModal] = useState(false);

  const activeAccount = accounts.find((a) => a.isActive);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-900">
      {/* Titlebar */}
      <Header activeAccount={activeAccount} />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left panel — account list */}
        <main className="flex flex-col flex-1 overflow-hidden min-w-0">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-surface-700 shrink-0">
            <div>
              <span className="text-sm font-semibold text-white">Accounts</span>
              <span className="ml-2 text-xs text-gray-500">({accounts.length})</span>
            </div>
            <button
              id="add-account-btn"
              className="btn-primary"
              onClick={() => setShowModal(true)}
            >
              + Add Account
            </button>
          </div>

          {/* Account cards */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center h-40">
                <div className="flex flex-col items-center gap-3">
                  <svg className="animate-spin w-7 h-7 text-brand-500" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  <span className="text-sm text-gray-500">Loading accounts…</span>
                </div>
              </div>
            ) : accounts.length === 0 ? (
              <EmptyState onAdd={() => setShowModal(true)} />
            ) : (
              <div className="grid gap-3">
                {accounts.map((account) => (
                  <AccountCard
                    key={account.id}
                    account={account}
                    onSwitch={switchAccount}
                    onDelete={deleteAccount}
                    onTest={testConnection}
                    isSwitching={switching}
                  />
                ))}
              </div>
            )}
          </div>
        </main>

        {/* Right panel — status log */}
        <aside className="w-72 shrink-0 border-l border-surface-700 flex flex-col">
          <StatusLog logs={logs} onClear={clearLogs} />
        </aside>
      </div>

      {/* Add account modal */}
      {showModal && (
        <AddAccountModal
          onAdd={addAccount}
          onClose={() => setShowModal(false)}
          onScanKeys={scanSshKeys}
          onGenerateKey={generateSshKey}
        />
      )}
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6 fade-in">
      <div className="w-16 h-16 rounded-2xl bg-surface-700 border border-surface-600 flex items-center justify-center text-3xl">
        ⇄
      </div>
      <div>
        <h2 className="text-base font-semibold text-white">No accounts yet</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-xs">
          Add your GitHub accounts to start switching between them globally with one click.
        </p>
      </div>
      <button className="btn-primary" onClick={onAdd}>+ Add your first account</button>
    </div>
  );
}
