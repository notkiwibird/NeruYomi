// ═══════════════════════════════════════════════════════════════
// NERUYOMI → TAURI: JS CHANGES GUIDE
// Apply these changes to NeruYomi_V0_48B.html
// ═══════════════════════════════════════════════════════════════
//
// This file documents every JS change needed. There are 4 areas:
//   1. Replace the PROXY constant with a Tauri invoke helper
//   2. Library path persistence (save on open, restore on launch)
//   3. Replace openLibraryFSAPI() with the native Tauri folder picker
//   4. Replace File System Access API handle reads with Tauri FS reads
//
// IMPORTANT: Tauri injects window.__TAURI__ automatically at runtime.
// The IS_TAURI guard lets the file still open in a browser for development.
// ═══════════════════════════════════════════════════════════════


// ─── 1. TOP OF <script> — replace the PROXY constant ─────────────────────────

// REMOVE this line:
const PROXY = 'http://127.0.0.1:3005';

// ADD these instead:
const IS_TAURI = !!window.__TAURI__;
const { invoke } = IS_TAURI ? window.__TAURI__.core : { invoke: null };

/**
 * Calls the Rust search_mu command (Tauri) or falls back to the proxy (browser).
 * Returns the raw MangaUpdates API JSON — same shape the existing JS already parses.
 */
async function muSearch(search, perpage = 5) {
  if (IS_TAURI) {
    return invoke('search_mu', { search, perpage });
  }
  // Browser fallback — proxy.js still needed when running outside Tauri
  const res = await fetch(`${PROXY}/mu/series/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ search, perpage }),
  });
  if (!res.ok) throw new Error(`proxy ${res.status}`);
  return res.json();
}


// ─── 2. fetchMuInfo() — swap the fetch() call ────────────────────────────────
//
// FIND this block inside fetchMuInfo():
//
//   const res = await fetch(`${PROXY}/mu/series/search`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ search: searchName, perpage: 5 })
//   });
//   if (!res.ok) { muCache[name] = null; saveMuCache(); return null; }
//   const data = await res.json();
//
// REPLACE with:
//
//   let data;
//   try {
//     data = await muSearch(searchName, 5);
//   } catch(e) {
//     muCache[name] = null; saveMuCache(); return null;
//   }


// ─── 3. runIdentifySearch() — same swap ──────────────────────────────────────
//
// FIND:
//   const r = await fetch(`${PROXY}/mu/series/search`, {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify({ search: q, perpage: 10 })
//   });
//   if (!r.ok) throw new Error('proxy error');
//   const data = await r.json();
//   renderIdentifyResults(data.results || []);
//
// REPLACE with:
//   const data = await muSearch(q, 10);
//   renderIdentifyResults(data.results || []);
//
// Also update the catch block error message:
//   res.innerHTML = '... PROXY MUST BE RUNNING ...'
// to:
//   res.innerHTML = '... MANGAUPDATES UNAVAILABLE ...'


// ─── 4. LIBRARY PATH PERSISTENCE ─────────────────────────────────────────────
//
// In openLibraryFSAPI(), after "renderLibrary(); show('library'); bc('library');"
// ADD:
//   if (IS_TAURI) {
//     await invoke('save_library_path', { path: rootHandle.name });
//     // Store full path for later — rootHandle.name is just the folder name,
//     // but Tauri needs the real path. See Phase 3 below for the full solution.
//   }
//
// In the INIT block at the bottom, ADD before bc('landing'):
//   if (IS_TAURI) {
//     invoke('load_library_path').then(path => {
//       if (path) {
//         // TODO Phase 3: reopen via pick_folder result stored at path
//         // For now, show a "Reopen [FolderName]?" button
//         const note = document.createElement('button');
//         note.className = 'btn primary';
//         note.textContent = `↩ REOPEN ${path}`;
//         note.onclick = openLibrary;
//         $('view-landing').appendChild(note);
//       }
//     });
//   }


// ═══════════════════════════════════════════════════════════════
// PHASE 3 — Replace File System Access API with Tauri native FS
// ═══════════════════════════════════════════════════════════════
//
// This is the bigger migration that fully solves the P0 persistence
// issue. It replaces openLibraryFSAPI() and all the handle-based
// file reading with Tauri invoke calls.
//
// The new openLibraryFSAPI becomes:

async function openLibraryTauri() {
  const folderPath = await invoke('pick_folder');
  if (!folderPath) return; // user cancelled

  // Save path natively — survives app restarts without any permission prompt
  await invoke('save_library_path', { path: folderPath });

  rootHandle = { name: folderPath.split(/[\\/]/).pop() }; // keeps bc() working
  library = [];

  const topEntries = await invoke('read_dir', { path: folderPath });
  const dirs = topEntries
    .filter(e => e.is_dir)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  for (const dir of dirs) {
    const chapters = await getChaptersTauri(dir.path);
    library.push({ name: dir.name, path: dir.path, chapters, coverUrl: null });
  }

  renderLibrary();
  show('library');
  bc('library');
  library.forEach(loadCoverTauri);
}

async function getChaptersTauri(seriesPath) {
  const entries = await invoke('read_dir', { path: seriesPath });
  const dirs = entries.filter(e => e.is_dir);
  const pdfs = entries.filter(e => !e.is_dir && e.name.toLowerCase().endsWith('.pdf'));
  dirs.sort((a, b) => chapterCmp(a.name, b.name));
  pdfs.sort((a, b) => chapterCmp(a.name, b.name));
  return [
    ...dirs.map(d => ({ name: d.name, path: d.path, isPdf: false })),
    ...pdfs.map(f => ({ name: f.name.replace(/\.pdf$/i, ''), path: f.path, isPdf: true })),
  ];
}

async function loadCoverTauri(series) {
  if (!series.chapters.length) return;
  const ch = series.chapters[0];
  const localFallback = async () => {
    const entries = await invoke('read_dir', { path: ch.path });
    const imgs = entries
      .filter(e => !e.is_dir && isImg(e.name))
      .sort((a, b) => natCmp(a.name, b.name));
    if (!imgs.length) return;
    series.coverUrl = await invoke('read_file_as_data_url', { path: imgs[0].path });
    const card = document.querySelector(`[data-series="${CSS.escape(series.name)}"] .s-cover`);
    if (card) { card.innerHTML = localCoverHTML(series); attachCardExtras(card, 'local:' + series.name, series, 'local'); }
  };
  enqueueMuCover(series, localFallback);
}

// openLocalChapterTauri: reads chapter image files via Tauri FS
// instead of the FSAPI handle. Called in place of openLocalChapter().
async function openLocalChapterTauri(idx, startAtEnd = false) {
  _savedChScroll = $('ch-list')?.scrollTop || 0;
  curChIdx = idx;
  const ch = curSeries.chapters[idx];
  show('reader'); bc('reader');
  freePages();
  $('page-display').innerHTML = '<div style="color:#f5f5f5;font-size:12px;margin:auto;font-family:monospace;letter-spacing:2px">LOADING…</div>';

  const entries = await invoke('read_dir', { path: ch.path });
  const imgs = entries
    .filter(e => !e.is_dir && isImg(e.name))
    .sort((a, b) => natCmp(a.name, b.name));

  // Pages store the file path; url is loaded on demand via read_file_as_data_url
  pages = imgs.map(e => ({ name: e.name, filePath: e.path, url: null, revoke: false }));

  const saved = getChProg('local:' + curSeries.name, ch.name);
  const inProgress = saved && !saved.read && saved.page > 0 && saved.page < pages.length - 1;
  curPage = inProgress ? saved.page : (rtl ? Math.max(0, pages.length - 1) : 0);
  zoom = 1;

  // Preload first pages
  await preloadTauri([curPage, curPage + 1, curPage + 2]);
  renderProgressSegs(); renderThumbs(); renderPage(); stat();
}

async function preloadTauri(idxs) {
  await Promise.all(idxs.map(async i => {
    if (i < 0 || i >= pages.length || pages[i].url) return;
    pages[i].url = await invoke('read_file_as_data_url', { path: pages[i].filePath });
  }));
}

// In renderPage(), replace the preloadLocal call with:
//   if (readerSrc === 'local') preloadTauri(
//     idxs.map(i => i+1).concat(idxs.map(i => i+2)).concat(idxs.map(i => i-1))
//   );


// ═══════════════════════════════════════════════════════════════
// AUTO-REOPEN ON LAUNCH (Phase 3 version — full path stored)
// ═══════════════════════════════════════════════════════════════
//
// Replace the Phase 2 stub at the bottom of <script> with:

if (IS_TAURI) {
  invoke('load_library_path').then(async savedPath => {
    if (!savedPath) return; // first launch
    rootHandle = { name: savedPath.split(/[\\/]/).pop() };
    library = [];
    const topEntries = await invoke('read_dir', { path: savedPath });
    const dirs = topEntries
      .filter(e => e.is_dir)
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    for (const dir of dirs) {
      library.push({ name: dir.name, path: dir.path, chapters: await getChaptersTauri(dir.path), coverUrl: null });
    }
    renderLibrary(); show('library'); bc('library'); switchTab('local');
    library.forEach(loadCoverTauri);
  }).catch(() => {}); // silently skip if path no longer exists
}
