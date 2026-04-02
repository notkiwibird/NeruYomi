# NeruYomi → Tauri Setup Guide

## Prerequisites

Install these once on your machine:

```bash
# 1. Rust (the Tauri backend language)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 2. Tauri CLI
npm install -g @tauri-apps/cli@latest

# Windows only: install WebView2 if not already present
# It ships with Windows 10/11 — most machines already have it.
# https://developer.microsoft.com/en-us/microsoft-edge/webview2/
```

**Linux only** — also install these system packages:
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev build-essential libssl-dev \
  libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel openssl-devel gtk3-devel \
  libappindicator-gtk3-devel librsvg2-devel
```


## Project Layout

```
neruyomi/
├── NeruYomi_V0_48B.html   ← your existing file (renamed to index.html)
├── package.json
└── src-tauri/
    ├── build.rs
    ├── Cargo.toml
    ├── tauri.conf.json
    ├── icons/             ← generate with: npm run tauri icon your-icon.png
    └── src/
        └── main.rs
```

Copy the files from this folder into that structure, and rename
`NeruYomi_V0_48B.html` to `index.html`.

Generate placeholder icons (required to build):
```bash
# Put any PNG (ideally 1024×1024) in the folder as icon.png, then:
npx @tauri-apps/cli icon icon.png
```


## Phase 1 — Get it running (15 minutes)

No JS changes yet. Just wraps the existing HTML in a native window.

```bash
npm install     # installs @tauri-apps/cli
npm run dev     # compiles Rust + opens the app window
```

First compile takes 3–5 minutes (Rust downloads dependencies).
Subsequent `dev` runs are ~10 seconds.

At this point: native window, no browser chrome, proxy.js still needed
for MangaUpdates lookups.


## Phase 2 — Remove the MU proxy (1–2 hours)

Apply the changes in JS_CHANGES.js sections 1–3.

MU calls now go directly from Rust to the MangaUpdates API —
no proxy.js, no terminal step, works on first launch.

Changes in the HTML:
- Remove `const PROXY = '...'`
- Add the `IS_TAURI`, `invoke`, and `muSearch()` block
- Replace the two `fetch(PROXY + '/mu/...')` calls with `await muSearch(...)`
- Update error messages to not mention the proxy


## Phase 3 — Persistent library + native file reading (half day)

Apply the changes in JS_CHANGES.js sections 4–5.

This is the significant migration:
- `openLibraryFSAPI()` → `openLibraryTauri()` (uses native folder picker)
- File handle reads → `invoke('read_dir')` + `invoke('read_file_as_data_url')`
- Library path saved to OS app-data, reopened automatically on launch

After this phase, `node proxy.js` is no longer needed at all for the B version.
The app is fully self-contained.


## Building a distributable

```bash
npm run build
```

Outputs to `src-tauri/target/release/bundle/`:
- Windows: `.msi` installer + `.exe`
- macOS:   `.dmg` + `.app`
- Linux:   `.deb`, `.rpm`, `.AppImage`

Typical output sizes:
- Windows: ~8MB installer
- macOS:   ~10MB .app
- Linux:   ~8MB .AppImage


## What this fixes from the audit

| Issue | Status after Tauri port |
|---|---|
| P0 — Library folder persistence | ✅ Fixed in Phase 3 (native path storage) |
| MU proxy requirement | ✅ Fixed in Phase 2 (Rust HTTP) |
| Progress/bookmark data safety | ✅ Free — migrate localStorage to files in Phase 3 |
| alert()/confirm() dialogs | ✅ Can use tauri-plugin-dialog for native OS dialogs |
| Back button exits app | ✅ No browser — no browser back button |
| File associations (.cbz, .pdf) | ✅ One entry in tauri.conf.json |
| Pinch-to-zoom | 🔧 Still JS work |
| View transitions | 🔧 Still JS/CSS work |
| Reader auto-hide | 🔧 Still JS work |
| Image fit modes | 🔧 Still JS work |
