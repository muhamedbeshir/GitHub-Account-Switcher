# ⇄ GitHub Switcher

A production-ready desktop tool that lets you switch between multiple GitHub accounts globally with a single click.

---

## Features

| Feature | Details |
|---|---|
| **One-click switch** | Updates `git config --global` user.name + email instantly |
| **SSH key management** | Auto-detects keys, generates ed25519 pairs, rewrites `~/.ssh/config` safely |
| **HTTPS/PAT support** | Personal Access Tokens stored AES-256-GCM encrypted |
| **Connection test** | Tests live SSH auth against `github.com` |
| **Status log** | Real-time terminal-style log of every operation |
| **Dark UI** | GitHub-inspired dark theme with smooth animations |

---

## Quick Start

### Prerequisites

- [Node.js 18+](https://nodejs.org)
- [Git](https://git-scm.com) installed and on PATH
- [OpenSSH](https://docs.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse) (Windows: already included in Win10/11)

### Install & Run

```powershell
# 1. Clone / open the project
cd "d:\Desktop Projects\GitHub Switcher"

# 2. Install dependencies
npm install

# 3. Start in development mode
npm run dev
```

The app window opens automatically. The Vite dev server serves the UI on port 5173.

### Build for production

```powershell
npm run build
```

Installer is created in `release/`.

---

## How It Works

### Switching an account

1. Click **⇄ Switch** on any account card.
2. The app:
   - Runs `git config --global user.name "..."` and `user.email "..."`
   - Rewrites `~/.ssh/config` so the `Host github.com` block points to the selected key
   - Backs up `~/.ssh/config` → `~/.ssh/config.bak` before every write
3. All future `git` operations in any directory use the new identity.

### SSH Config structure

The app adds a **managed section** to `~/.ssh/config`:

```
# ── GitHub Switcher (managed) ──
Host github-alice
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_alice
  IdentitiesOnly yes

Host github-bob
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_bob
  IdentitiesOnly yes

Host github.com # managed      ← the active account
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_alice
  IdentitiesOnly yes
```

Per-account aliases (`github-<username>`) let you clone with a specific account regardless of the active one:

```bash
git clone git@github-bob:bob/repo.git
```

### Security

| Concern | Solution |
|---|---|
| Token storage | AES-256-GCM encrypted, key derived from machine hostname |
| Token in UI | Always masked as `••••••••` |
| SSH key files | Keys remain on disk at `~/.ssh/`, app only reads paths |
| SSH config | Written with mode `0600`, always backed up before modification |

---

## Project Structure

```
github-switcher/
├── main/                   # Electron main process (Node.js)
│   ├── index.js            # Window creation + IPC registration
│   ├── preload.js          # Secure IPC bridge (contextBridge)
│   ├── ipc/
│   │   ├── accounts.js     # Account CRUD + switch
│   │   └── git.js          # SSH test, key scan, key gen
│   └── services/
│       ├── accountStore.js # Encrypted JSON persistence
│       ├── crypto.js       # AES-256-GCM
│       ├── gitConfig.js    # git config read/write
│       └── sshManager.js   # SSH config parser + writer
├── renderer/               # React UI
│   ├── App.jsx
│   ├── hooks/useAccounts.js
│   └── components/
│       ├── Header.jsx
│       ├── AccountCard.jsx
│       ├── AddAccountModal.jsx
│       └── StatusLog.jsx
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Adding your first account

1. Click **+ Add Account**
2. Enter your GitHub username and email
3. Choose **SSH Key** (recommended) or **HTTPS (PAT)**
4. Pick an existing `~/.ssh` key _or_ click **Generate new ed25519 key**
5. If you generated a key, copy the public key shown and add it to [GitHub → Settings → SSH keys](https://github.com/settings/keys)
6. Click **⚡ Test** to verify the connection
7. Click **⇄ Switch** to activate the account
