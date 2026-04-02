# NeruYomi
### ねるよみ — Local Manga Reader

A lightweight, native manga reader for Windows, macOS, and Linux. Built with Tauri — no Electron, no bundled browser, ~8MB installer.

---

## Current Features (v0.48B)

### Library
- Open any local folder as a manga library — no import, no copying, reads directly from disk
- Automatic cover art fetched from MangaUpdates
- Series metadata: author, description, genres, year, rating
- Manual series identification via MangaUpdates search (for folders with non-standard names)
- Bookmark series for quick access
- Filter library by name in real time
- Read progress tracked per chapter — resumes where you left off
- Per-series progress bar showing how many chapters read

### Reader
- RTL (right-to-left) and LTR (left-to-right) reading modes
- Single page and two-page spread layouts
- Pinch-to-zoom (touch) and scroll-to-zoom (desktop)
- Keyboard navigation (← → keys, + / - zoom, 0 reset)
- Swipe navigation with direction guard (won't fire on vertical scroll)
- Touch double-tap for theatre mode (hides all UI chrome)
- Auto-advance to next/previous chapter at boundary
- Segmented progress bar synced to reading direction
- Page jump input — type a page number to jump directly
- Thumbnail strip for quick page overview
- Silent image failure handling — shows error state instead of blank

### PDF Support
- PDF chapters rendered page-by-page via PDF.js
- Works identically to image chapters — same reader, same controls

### MangaUpdates Integration
- Cover art, descriptions, genres pulled automatically for local series
- Metadata cached locally — only fetched once per series
- Manual cache refresh and clear from Settings
- Override identification for series with ambiguous folder names

### App
- Native Tauri app — no browser, no Electron, ~8MB
- Runs on Windows, macOS, Linux
- MangaUpdates API called directly from Rust — no proxy server needed
- Settings persist across sessions
- Mobile-aware layout with back button navigation
- Dark theme with purple accent

---

## Roadmap

### UI Polish
- Redesign the library grid and series cards
- Improve header layout and breadcrumb on all screen sizes
- Add smooth view transitions (slide in/out between library → series → reader)
- Reader UI auto-hides after inactivity, tap to restore
- Image fit modes: fit height (default), fit width, original size
- Webtoon / vertical scroll mode for manhwa and long-strip chapters
- Cleaner settings panel with better organisation

### Persistent Library (Phase 3)
- Library folder reopens automatically on launch — no folder picker every session
- Read progress and bookmarks written to a local file instead of browser storage
- Export and import progress as a JSON file for backup or migration
- File associations: double-click `.cbz`, `.zip`, `.pdf` to open directly in NeruYomi

### Server & Self-Hosting
- Optional local server mode — run NeruYomi as a media server on a home machine
- Access your library from any device on the same network via browser or the app
- Jellyfin-style experience: browse, read, and track progress from any device
- Server dashboard for managing the library and monitoring connections
- OPDS catalog support for compatibility with other readers

### Accounts & Sync
- Multi-user accounts on a shared NeruYomi server
- Per-user read progress, bookmarks, and settings
- Progress sync across devices — pick up on your phone where you left off on desktop
- Reading history and statistics per user
- Optional PIN or password protection per account

### Extended Format Support
- CBZ and CBR archive support (no extraction needed)
- EPUB support for light novels and manga in EPUB format
- Automatic chapter ordering for non-standard folder naming conventions

### Future
- Plugin system for custom metadata sources
- Reading lists and collections
- Community features on self-hosted servers (shared shelves, recommendations)

---

## Installation

Download the latest installer from the [Releases](https://github.com/phonii1/neruyomi/releases) page.

- **Windows:** `.msi` or `.exe` installer
- **macOS:** `.dmg`
- **Linux:** `.AppImage` or `.deb`

No dependencies required. WebView2 is pre-installed on Windows 10/11.

---

## Folder Structure

NeruYomi reads directly from your existing folder structure — no reorganising needed.

**Image chapters:**
```
Library/
  Series Name/
    Chapter 001/
      001.jpg
      002.jpg
    Chapter 002/
```

**PDF chapters:**
```
Library/
  Series Name/
    Chapter 001.pdf
    Chapter 002.pdf
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `←` / `→` | Previous / next page |
| `↑` / `↓` | Previous / next page |
| `+` / `-` | Zoom in / out |
| `0` | Reset zoom |
| `Esc` | Close modal / exit settings |

---

## Tech Stack

- **Frontend:** HTML, CSS, vanilla JavaScript
- **Backend:** Rust via Tauri
- **Metadata:** MangaUpdates API
- **PDF rendering:** PDF.js
- **Distribution:** Tauri bundler (MSI, NSIS, DMG, AppImage, DEB)

---

## Building from Source

**Prerequisites:** Rust, Node.js, C++ Build Tools (Windows)

```bash
git clone https://github.com/phonii1/neruyomi.git
cd neruyomi
npm install
npm run dev       # development
npm run build     # production installer
```
