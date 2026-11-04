import { appStore } from '../store';
import { parseLinksOrIdsToTracks } from '../storage';
import { showToast } from './header';

export function renderPlaylistView(container: HTMLElement): void {
  const state = appStore.getState();
  const pl = state.activePlaylist;

  if (!pl) {
    container.innerHTML = `
      <div style="text-align: center; padding: 60px 20px;">
        <h2>No playlist selected</h2>
        <button class="btn-primary" style="margin-top: 16px;" id="btn-back-lib">Go to Library</button>
      </div>
    `;
    container.querySelector('#btn-back-lib')?.addEventListener('click', () => {
      appStore.setView('library');
    });
    return;
  }

  const coverColor = pl.coverColor || '#fa2d48';

  container.innerHTML = `
    <div class="playlist-view">
      <div class="playlist-hero">
        <div class="playlist-hero-art" style="background: linear-gradient(135deg, ${coverColor}, #111);">
          🎵
        </div>
        <div class="playlist-info">
          <span class="playlist-badge">Curated Playlist</span>
          <h1 class="playlist-title-lg" id="pl-title" title="Click to rename" style="cursor: pointer;">
            ${escapeHtml(pl.name)}
          </h1>
          <p class="playlist-desc" id="pl-desc" title="Click to edit description" style="cursor: pointer;">
            ${escapeHtml(pl.description || 'No description added. Click to add one.')}
          </p>
          <div class="playlist-stats">
            <span>${pl.tracks.length} song${pl.tracks.length === 1 ? '' : 's'}</span>
            <span>•</span>
            <span>Updated ${new Date(pl.updatedAt || Date.now()).toLocaleDateString()}</span>
          </div>

          <div class="playlist-actions">
            <button class="btn-primary" id="btn-hero-play">
              <span>▶ Play</span>
            </button>
            <button class="btn-secondary" id="btn-hero-shuffle">
              <span>🔀 Shuffle</span>
            </button>
            <button class="btn-secondary" id="btn-hero-add">
              <span>+ Add Songs</span>
            </button>
            <button class="btn-secondary" id="btn-hero-edit">
              <span id="edit-btn-label">${state.isEditMode ? '✓ Done' : '✎ Edit'}</span>
            </button>
            <button class="btn-secondary" id="btn-hero-share">
              <span>🔗 Share</span>
            </button>
            <button class="btn-secondary" id="btn-hero-export">
              <span>📥 Export JSON</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Add songs inline drawer -->
      <div id="add-songs-drawer" style="display: none; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-card); padding: 20px; margin-bottom: 24px;">
        <h3 style="margin-bottom: 8px;">Add Tracks by YouTube Link or Video ID</h3>
        <p style="color: var(--text-muted); font-size: 0.88rem; margin-bottom: 12px;">
          Paste YouTube watch links, shorts, youtu.be links, or raw 11-character video IDs (one per line).
        </p>
        <textarea id="add-songs-input" rows="3" style="width: 100%; margin-bottom: 12px;" placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ&#10;https://youtu.be/fJ9rUzIMcZQ - Live Aid"></textarea>
        <div style="display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn-secondary" id="btn-cancel-add">Cancel</button>
          <button class="btn-primary" id="btn-submit-add">Add to Playlist</button>
        </div>
      </div>

      <!-- Error / Skip Notification -->
      <div id="error-banner-holder"></div>

      <!-- Tracklist Table -->
      <div class="tracklist-container" id="tracklist-container">
        <!-- Track rows rendered dynamically -->
      </div>
    </div>
  `;

  // Attach Header Actions
  const titleEl = container.querySelector('#pl-title');
  titleEl?.addEventListener('click', () => {
    const newName = prompt('Rename playlist:', pl.name);
    if (newName && newName.trim()) {
      appStore.updatePlaylist(pl.id!, { name: newName.trim() });
    }
  });

  const descEl = container.querySelector('#pl-desc');
  descEl?.addEventListener('click', () => {
    const newDesc = prompt('Update description:', pl.description || '');
    if (newDesc !== null) {
      appStore.updatePlaylist(pl.id!, { description: newDesc.trim() });
    }
  });

  const playBtn = container.querySelector('#btn-hero-play');
  playBtn?.addEventListener('click', () => {
    appStore.playTrackAtIndex(0);
    appStore.setView('nowPlaying');
  });

  const shuffleBtn = container.querySelector('#btn-hero-shuffle');
  shuffleBtn?.addEventListener('click', () => {
    appStore.toggleShuffle();
    appStore.playTrackAtIndex(0);
    appStore.setView('nowPlaying');
  });

  const editBtn = container.querySelector('#btn-hero-edit');
  editBtn?.addEventListener('click', () => {
    appStore.toggleEditMode();
  });

  const shareBtn = container.querySelector('#btn-hero-share');
  shareBtn?.addEventListener('click', async () => {
    const shareUrl = appStore.generateShareUrl();
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        showToast('Playlist share link copied to clipboard!');
      } else {
        prompt('Copy this share link:', shareUrl);
      }
    } catch {
      prompt('Copy this share link:', shareUrl);
    }
  });

  const exportBtn = container.querySelector('#btn-hero-export');
  exportBtn?.addEventListener('click', () => {
    appStore.exportCurrentPlaylist();
  });

  // Add Songs Drawer
  const addDrawer = container.querySelector('#add-songs-drawer') as HTMLElement;
  const addBtn = container.querySelector('#btn-hero-add');
  const cancelAddBtn = container.querySelector('#btn-cancel-add');
  const submitAddBtn = container.querySelector('#btn-submit-add');
  const addInput = container.querySelector('#add-songs-input') as HTMLTextAreaElement;

  addBtn?.addEventListener('click', () => {
    addDrawer.style.display = addDrawer.style.display === 'none' ? 'block' : 'none';
    if (addDrawer.style.display === 'block') {
      addInput?.focus();
    }
  });

  cancelAddBtn?.addEventListener('click', () => {
    addDrawer.style.display = 'none';
    addInput.value = '';
  });

  submitAddBtn?.addEventListener('click', () => {
    const text = addInput.value.trim();
    if (!text) return;
    const parsed = parseLinksOrIdsToTracks(text);
    if (parsed.length === 0) {
      alert('Could not find any valid YouTube links or IDs.');
      return;
    }
    appStore.addTracksToCurrent(parsed);
    addInput.value = '';
    addDrawer.style.display = 'none';
    showToast(`Added ${parsed.length} track${parsed.length === 1 ? '' : 's'}!`);
  });

  // Track Rows
  const tracklistContainer = container.querySelector('#tracklist-container') as HTMLElement;

  let dragSrcIndex: number | null = null;

  function renderTrackRows(): void {
    const currentState = appStore.getState();
    const currentPl = currentState.activePlaylist;
    const errorHolder = container.querySelector('#error-banner-holder') as HTMLElement;

    if (currentState.lastError && errorHolder) {
      errorHolder.innerHTML = `
        <div class="error-banner" style="margin-bottom: 16px;">
          ⚠️ ${escapeHtml(currentState.lastError)}
        </div>
      `;
    } else if (errorHolder) {
      errorHolder.innerHTML = '';
    }

    if (!currentPl || currentPl.tracks.length === 0) {
      tracklistContainer.innerHTML = `
        <div style="padding: 40px 20px; text-align: center; color: var(--text-muted);">
          <p style="margin-bottom: 12px;">This playlist has no tracks yet.</p>
          <button class="btn-primary" id="btn-empty-add">+ Add Songs</button>
        </div>
      `;
      tracklistContainer.querySelector('#btn-empty-add')?.addEventListener('click', () => {
        addDrawer.style.display = 'block';
        addInput?.focus();
      });
      return;
    }

    tracklistContainer.innerHTML = '';

    currentPl.tracks.forEach((track, index) => {
      const isCurrent = currentState.activeTrackIndex === index && currentPl.id === currentState.activePlaylistId;
      const isUnplayable = currentState.unplayableVideoIds.has(track.videoId);
      const isEdit = currentState.isEditMode;

      const row = document.createElement('div');
      row.className = `track-row ${isCurrent ? 'is-active' : ''} ${isUnplayable ? 'is-unplayable' : ''}`;
      row.dataset.index = index.toString();

      if (isEdit) {
        row.draggable = true;
      }

      row.innerHTML = `
        <div class="track-index">
          ${isEdit ? '<span class="drag-handle" title="Drag to reorder">⠿</span>' : isCurrent && currentState.isPlaying ? '🔊' : index + 1}
        </div>
        <img class="track-thumb" src="https://img.youtube.com/vi/${track.videoId}/mqdefault.jpg" alt="" loading="lazy" />
        <div class="track-details">
          <div class="track-title" title="${escapeHtml(track.title)}">${escapeHtml(track.title)}</div>
          <div class="track-artist">${escapeHtml(track.artist || 'YouTube Video')}</div>
        </div>
        <div class="track-tag-container">
          ${isUnplayable ? '<span class="badge-unplayable">Unplayable</span>' : ''}
          ${typeof track.start === 'number' && track.start > 0 ? `<span style="font-size:0.75rem; color:var(--text-muted); font-family:var(--font-mono);">Start: ${track.start}s</span>` : ''}
        </div>
        <div class="track-actions">
          ${
            isEdit
              ? `
              <button class="icon-btn btn-track-up" title="Move Up" style="width: 28px; height: 28px; font-size: 0.75rem;">▲</button>
              <button class="icon-btn btn-track-down" title="Move Down" style="width: 28px; height: 28px; font-size: 0.75rem;">▼</button>
              <button class="icon-btn btn-track-del" title="Remove" style="width: 28px; height: 28px; font-size: 0.75rem; color: #ff453a;">✕</button>
            `
              : `
              <button class="icon-btn btn-track-queue" title="Play Next" style="width: 32px; height: 32px; font-size: 0.8rem;">
                ➕
              </button>
              <button class="icon-btn btn-track-del" title="Remove" style="width: 32px; height: 32px; font-size: 0.8rem; color: #ff453a;">
                ✕
              </button>
            `
          }
        </div>
      `;

      // Click row to play (when not in edit mode)
      row.addEventListener('click', (e: MouseEvent) => {
        if (isEdit) return;
        if ((e.target as HTMLElement).closest('button')) return;
        appStore.playTrackAtIndex(index);
        appStore.setView('nowPlaying');
      });

      // Actions inside row
      if (isEdit) {
        row.querySelector('.btn-track-up')?.addEventListener('click', (e) => {
          e.stopPropagation();
          if (index > 0) {
            appStore.reorderTrack(index, index - 1);
          }
        });

        row.querySelector('.btn-track-down')?.addEventListener('click', (e) => {
          e.stopPropagation();
          if (index < currentPl.tracks.length - 1) {
            appStore.reorderTrack(index, index + 1);
          }
        });

        // Drag and drop event listeners
        row.addEventListener('dragstart', (e: DragEvent) => {
          dragSrcIndex = index;
          row.classList.add('dragging');
          e.dataTransfer?.setData('text/plain', index.toString());
        });

        row.addEventListener('dragend', () => {
          row.classList.remove('dragging');
          tracklistContainer.querySelectorAll('.track-row').forEach(r => r.classList.remove('drag-over'));
        });

        row.addEventListener('dragover', (e: DragEvent) => {
          e.preventDefault();
          row.classList.add('drag-over');
        });

        row.addEventListener('dragleave', () => {
          row.classList.remove('drag-over');
        });

        row.addEventListener('drop', (e: DragEvent) => {
          e.preventDefault();
          row.classList.remove('drag-over');
          if (dragSrcIndex !== null && dragSrcIndex !== index) {
            appStore.reorderTrack(dragSrcIndex, index);
            dragSrcIndex = null;
          }
        });
      } else {
        row.querySelector('.btn-track-queue')?.addEventListener('click', (e) => {
          e.stopPropagation();
          appStore.addToUpNext(track);
          showToast(`"${track.title}" added to Up Next`);
        });
      }

      row.querySelector('.btn-track-del')?.addEventListener('click', (e) => {
        e.stopPropagation();
        appStore.removeTrack(index);
      });

      tracklistContainer.appendChild(row);
    });
  }

  renderTrackRows();

  // Subscribe to updates
  appStore.subscribe(updated => {
    if (updated.currentView === 'playlist') {
      const editLabel = container.querySelector('#edit-btn-label');
      if (editLabel) {
        editLabel.textContent = updated.isEditMode ? '✓ Done' : '✎ Edit';
      }
      renderTrackRows();
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
