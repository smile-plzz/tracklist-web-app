import { appStore, type ViewMode, type ThemeMode } from '../store';

export function renderHeader(container: HTMLElement, onOpenImport: () => void): void {
  container.innerHTML = `
    <header class="top-nav">
      <div class="brand" id="brand-logo" title="Back to Library">
        <div class="brand-icon">▶</div>
        <span>Tracklist</span>
      </div>

      <nav class="nav-tabs" aria-label="Main Navigation">
        <button class="nav-tab-btn" data-view="library" id="tab-library">Library</button>
        <button class="nav-tab-btn" data-view="playlist" id="tab-playlist">Playlist</button>
        <button class="nav-tab-btn" data-view="nowPlaying" id="tab-now-playing">Now Playing</button>
      </nav>

      <div class="nav-actions">
        <button class="icon-btn" id="btn-theme-toggle" title="Toggle Theme" aria-label="Toggle Theme">
          🌓
        </button>
        <button class="icon-btn" id="btn-share-playlist" title="Share Playlist Link" aria-label="Share Playlist Link">
          🔗
        </button>
        <button class="btn-primary" id="btn-nav-import">
          <span>+ Import</span>
        </button>
      </div>
    </header>
  `;

  const brand = container.querySelector('#brand-logo');
  brand?.addEventListener('click', () => {
    appStore.setView('library');
  });

  const tabButtons = container.querySelectorAll<HTMLButtonElement>('.nav-tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view as ViewMode;
      if (view) {
        appStore.setView(view);
      }
    });
  });

  const themeBtn = container.querySelector('#btn-theme-toggle');
  themeBtn?.addEventListener('click', () => {
    const currentTheme = appStore.getState().theme;
    const nextTheme: ThemeMode = currentTheme === 'dark' ? 'light' : currentTheme === 'light' ? 'system' : 'dark';
    appStore.setTheme(nextTheme);
  });

  const shareBtn = container.querySelector('#btn-share-playlist');
  shareBtn?.addEventListener('click', async () => {
    const shareUrl = appStore.generateShareUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Share link copied to clipboard!');
      } else {
        prompt('Copy this share link:', shareUrl);
      }
    } catch {
      prompt('Copy this share link:', shareUrl);
    }
  });

  const importBtn = container.querySelector('#btn-nav-import');
  importBtn?.addEventListener('click', onOpenImport);

  // Sync active tab state
  appStore.subscribe(state => {
    tabButtons.forEach(btn => {
      if (btn.dataset.view === state.currentView) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  });
}

export function showToast(message: string, duration = 3000): void {
  const existing = document.querySelector('.toast-notification');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast-notification';
  toast.textContent = message;
  toast.setAttribute('style', `
    position: fixed;
    bottom: 90px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(30, 30, 35, 0.95);
    color: #fff;
    padding: 10px 20px;
    border-radius: 9999px;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    z-index: 1000;
    pointer-events: none;
    transition: opacity 200ms ease;
  `);

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 200);
  }, duration);
}
