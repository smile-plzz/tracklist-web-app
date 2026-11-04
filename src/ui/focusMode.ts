import { appStore } from '../store';

export function renderFocusMode(container: HTMLElement): void {
  container.innerHTML = `
    <div class="focus-mode-overlay" id="focus-overlay" style="display: none;">
      <button class="focus-exit-btn" id="btn-exit-focus" title="Exit Focus Mode (Esc or F)">
        ✕ Exit Focus Mode
      </button>

      <div class="focus-player-wrap" id="focus-player-mount-wrap">
        <!-- Player will be moved here or synchronized -->
      </div>

      <div class="focus-controls" id="focus-controls">
        <h2 id="focus-track-title" style="color: white; font-size: 1.8rem; margin-bottom: 6px;">Track Title</h2>
        <p id="focus-track-artist" style="color: rgba(255, 255, 255, 0.7); font-size: 1.1rem; margin-bottom: 20px;">Artist Name</p>

        <div style="display: flex; justify-content: center; align-items: center; gap: 24px;">
          <button class="icon-btn btn-skip" id="btn-focus-prev" style="color: white; font-size: 1.6rem;">⏮</button>
          <button class="btn-play-pause" id="btn-focus-play" style="font-size: 1.6rem;">
            <span id="focus-play-icon">▶</span>
          </button>
          <button class="icon-btn btn-skip" id="btn-focus-next" style="color: white; font-size: 1.6rem;">⏭</button>
        </div>
      </div>
    </div>
  `;

  const overlay = container.querySelector('#focus-overlay') as HTMLElement;
  const exitBtn = container.querySelector('#btn-exit-focus');
  const controls = container.querySelector('#focus-controls') as HTMLElement;
  const titleEl = container.querySelector('#focus-track-title') as HTMLElement;
  const artistEl = container.querySelector('#focus-track-artist') as HTMLElement;
  const playBtn = container.querySelector('#btn-focus-play');
  const playIcon = container.querySelector('#focus-play-icon');
  const prevBtn = container.querySelector('#btn-focus-prev');
  const nextBtn = container.querySelector('#btn-focus-next');

  let idleTimer: number | null = null;

  function resetIdleTimer(): void {
    controls.classList.remove('fade-out');
    if (exitBtn) (exitBtn as HTMLElement).style.opacity = '1';

    if (idleTimer !== null) {
      clearTimeout(idleTimer);
    }

    idleTimer = window.setTimeout(() => {
      if (appStore.getState().isFocusMode) {
        controls.classList.add('fade-out');
        if (exitBtn) (exitBtn as HTMLElement).style.opacity = '0';
      }
    }, 3000);
  }

  // Pointer movement restores controls
  overlay.addEventListener('mousemove', resetIdleTimer);
  overlay.addEventListener('touchstart', resetIdleTimer, { passive: true });

  exitBtn?.addEventListener('click', () => {
    appStore.toggleFocusMode();
  });

  playBtn?.addEventListener('click', () => {
    appStore.togglePlay();
    resetIdleTimer();
  });

  prevBtn?.addEventListener('click', () => {
    appStore.previous();
    resetIdleTimer();
  });

  nextBtn?.addEventListener('click', () => {
    appStore.next();
    resetIdleTimer();
  });

  appStore.subscribe(state => {
    if (!state.isFocusMode) {
      overlay.style.display = 'none';
      if (idleTimer !== null) {
        clearTimeout(idleTimer);
        idleTimer = null;
      }
      return;
    }

    overlay.style.display = 'flex';
    resetIdleTimer();

    if (titleEl) titleEl.textContent = state.currentTrack?.title || 'No Track Playing';
    if (artistEl) artistEl.textContent = state.currentTrack?.artist || state.activePlaylist?.name || 'Tracklist';
    if (playIcon) playIcon.textContent = state.isPlaying ? '⏸' : '▶';
  });
}

