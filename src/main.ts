import { appStore } from './store';
import { renderHeader } from './ui/header';
import { renderLibraryView } from './ui/libraryView';
import { renderPlaylistView } from './ui/playlistView';
import { renderNowPlayingView } from './ui/nowPlayingView';
import { renderMiniPlayer } from './ui/miniPlayer';
import { renderFocusMode } from './ui/focusMode';
import { renderImportModal } from './ui/importModal';
import { setupKeyboardShortcuts } from './ui/shortcuts';
import './styles.css';

function initApp(): void {
  const root = document.getElementById('app');
  if (!root) return;

  root.innerHTML = `
    <div class="app-container">
      <div id="header-mount"></div>
      <main class="main-content" id="view-mount"></main>
      <div id="mini-player-mount"></div>
      <div id="focus-mount"></div>
      <div id="modal-mount"></div>

      <!-- Persistent Player Host -->
      <div id="global-player-anchor" style="position: fixed; bottom: 84px; right: 24px; width: 220px; aspect-ratio: 16/9; z-index: 35; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.5); display: none; background: #000;">
        <div id="yt-player-target" style="width: 100%; height: 100%;"></div>
      </div>
    </div>
  `;

  const headerMount = root.querySelector('#header-mount') as HTMLElement;
  const viewMount = root.querySelector('#view-mount') as HTMLElement;
  const miniPlayerMount = root.querySelector('#mini-player-mount') as HTMLElement;
  const focusMount = root.querySelector('#focus-mount') as HTMLElement;
  const modalMount = root.querySelector('#modal-mount') as HTMLElement;
  const globalPlayerAnchor = root.querySelector('#global-player-anchor') as HTMLElement;

  let isPlayerInitialized = false;

  function openImportModal(): void {
    renderImportModal(modalMount, () => {
      modalMount.innerHTML = '';
    });
  }

  // 1. Render Top Header
  renderHeader(headerMount, openImportModal);

  // 2. Render Mini Player
  renderMiniPlayer(miniPlayerMount);

  // 3. Render Focus Mode overlay
  renderFocusMode(focusMount);

  // 4. Setup Global Keyboard Shortcuts
  setupKeyboardShortcuts();

  // 5. Initialize Theme
  appStore.applyTheme(appStore.getState().theme);

  // 6. Check URL Hash for shared playlists
  const hadSharedPlaylist = appStore.importFromUrlHash();
  if (hadSharedPlaylist) {
    appStore.setView('playlist');
  }

  // 7. Route Views & Manage Player Mounting
  function updateView(): void {
    const state = appStore.getState();

    // Render active view
    if (state.currentView === 'library') {
      renderLibraryView(viewMount, openImportModal);
    } else if (state.currentView === 'playlist') {
      renderPlaylistView(viewMount);
    } else if (state.currentView === 'nowPlaying') {
      renderNowPlayingView(viewMount);
    }

    // Position YouTube player container dynamically without re-creating iframe
    positionPlayer(state.currentView, state.isFocusMode);
  }

  function positionPlayer(currentView: string, isFocus: boolean): void {
    const playerTarget = document.getElementById('yt-player-target');
    if (!playerTarget) return;

    if (!isPlayerInitialized) {
      isPlayerInitialized = true;
      appStore.initPlayer('yt-player-target');
    }

    if (isFocus) {
      const focusWrap = document.getElementById('focus-player-mount-wrap');
      if (focusWrap) {
        globalPlayerAnchor.style.display = 'none';
        if (playerTarget.parentElement !== focusWrap) {
          focusWrap.appendChild(playerTarget);
        }
      }
      return;
    }

    if (currentView === 'nowPlaying') {
      const npStage = document.getElementById('youtube-player-mount');
      if (npStage) {
        globalPlayerAnchor.style.display = 'none';
        if (playerTarget.parentElement !== npStage) {
          npStage.appendChild(playerTarget);
        }
      }
    } else {
      // In Library or Playlist view: keep playing in the compact corner anchor
      if (appStore.getState().currentTrack) {
        globalPlayerAnchor.style.display = 'block';
        if (playerTarget.parentElement !== globalPlayerAnchor) {
          globalPlayerAnchor.appendChild(playerTarget);
        }
      } else {
        globalPlayerAnchor.style.display = 'none';
      }
    }
  }

  // Initial view render
  updateView();

  // Subscribe to view changes
  let previousView = appStore.getState().currentView;
  let previousFocus = appStore.getState().isFocusMode;

  appStore.subscribe(state => {
    if (state.currentView !== previousView || state.isFocusMode !== previousFocus) {
      previousView = state.currentView;
      previousFocus = state.isFocusMode;
      updateView();
    }
  });
}

// Start app once DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
