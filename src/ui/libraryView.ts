import { appStore } from '../store';
import type { Playlist } from '../schema';

export function renderLibraryView(container: HTMLElement, onOpenImport: () => void): void {
  const state = appStore.getState();

  container.innerHTML = `
    <div class="library-view">
      <div class="view-header">
        <div>
          <h1 class="view-title">Library</h1>
          <p class="view-subtitle">Manage and explore your curated playlists</p>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn-primary" id="btn-create-playlist">
            <span>+ New Playlist</span>
          </button>
          <button class="btn-secondary" id="btn-library-import">
            <span>Import JSON</span>
          </button>
        </div>
      </div>

      <div class="library-grid" id="library-grid">
        <!-- Playlist cards rendered dynamically -->
      </div>
    </div>
  `;

  const grid = container.querySelector('#library-grid') as HTMLElement;
  const createBtn = container.querySelector('#btn-create-playlist');
  const importBtn = container.querySelector('#btn-library-import');

  createBtn?.addEventListener('click', () => {
    const name = prompt('Enter a name for the new playlist:');
    if (name && name.trim()) {
      const pl = appStore.createPlaylist(name.trim());
      appStore.selectPlaylist(pl.id!);
    }
  });

  importBtn?.addEventListener('click', onOpenImport);

  function updateGrid(playlists: Playlist[], activeId: string | null): void {
    grid.innerHTML = '';

    // "New Playlist" quick card
    const newCard = document.createElement('div');
    newCard.className = 'playlist-card';
    newCard.innerHTML = `
      <div class="card-art card-new-art">+</div>
      <div class="card-title">Create Playlist</div>
      <div class="card-meta">Start from scratch or links</div>
    `;
    newCard.addEventListener('click', () => {
      const name = prompt('Enter a name for the new playlist:');
      if (name && name.trim()) {
        const pl = appStore.createPlaylist(name.trim());
        appStore.selectPlaylist(pl.id!);
      }
    });
    grid.appendChild(newCard);

    // Existing playlists
    playlists.forEach(pl => {
      const card = document.createElement('div');
      const isActive = pl.id === activeId;
      card.className = `playlist-card ${isActive ? 'active-card' : ''}`;
      const color = pl.coverColor || '#fa2d48';

      card.innerHTML = `
        <div class="card-art" style="background: linear-gradient(135deg, ${color}, #111);">
          🎵
        </div>
        <div class="card-title" title="${escapeHtml(pl.name)}">${escapeHtml(pl.name)}</div>
        <div class="card-meta">${pl.tracks.length} track${pl.tracks.length === 1 ? '' : 's'}</div>
        <div style="display: flex; gap: 6px; margin-top: 12px;">
          <button class="icon-btn btn-card-play" title="Play Playlist" style="width: 32px; height: 32px; font-size: 0.8rem;">
            ▶
          </button>
          <button class="icon-btn btn-card-dup" title="Duplicate" style="width: 32px; height: 32px; font-size: 0.8rem;">
            📋
          </button>
          <button class="icon-btn btn-card-export" title="Export JSON" style="width: 32px; height: 32px; font-size: 0.8rem;">
            📥
          </button>
          <button class="icon-btn btn-card-del" title="Delete" style="width: 32px; height: 32px; font-size: 0.8rem; color: #ff453a;">
            ✕
          </button>
        </div>
      `;

      card.addEventListener('click', (e: MouseEvent) => {
        // Ignore if clicking action buttons inside card
        if ((e.target as HTMLElement).closest('button')) return;
        appStore.selectPlaylist(pl.id!);
      });

      const playBtn = card.querySelector('.btn-card-play');
      playBtn?.addEventListener('click', () => {
        appStore.loadPlaylist(pl, true);
        appStore.setView('playlist');
      });

      const dupBtn = card.querySelector('.btn-card-dup');
      dupBtn?.addEventListener('click', () => {
        appStore.duplicatePlaylist(pl.id!);
      });

      const exportBtn = card.querySelector('.btn-card-export');
      exportBtn?.addEventListener('click', () => {
        appStore.exportCurrentPlaylist();
      });

      const delBtn = card.querySelector('.btn-card-del');
      delBtn?.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete "${pl.name}"?`)) {
          appStore.deletePlaylist(pl.id!);
        }
      });

      grid.appendChild(card);
    });
  }

  updateGrid(state.playlists, state.activePlaylistId);

  // Subscribe to store updates
  appStore.subscribe(updated => {
    if (updated.currentView === 'library') {
      updateGrid(updated.playlists, updated.activePlaylistId);
    }
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

