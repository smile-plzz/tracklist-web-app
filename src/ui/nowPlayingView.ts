import { appStore } from '../store';
import { showToast } from './header';

export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function renderNowPlayingView(container: HTMLElement): void {
  const state = appStore.getState();
  const track = state.currentTrack;

  container.innerHTML = `
    <div class="now-playing-view">
      <div class="now-playing-container">
        <!-- Left: Compliant 16:9 YouTube Player Stage -->
        <div class="player-stage">
          <div id="youtube-player-mount" class="youtube-iframe-holder"></div>
        </div>

        <!-- Right: Controls, Track Details & Options -->
        <div class="now-playing-controls">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1; overflow: hidden; padding-right: 12px;">
              <h2 class="np-track-title" id="np-title" title="${escapeHtml(track?.title || 'No Track Selected')}">
                ${escapeHtml(track?.title || 'No Track Selected')}
              </h2>
              <div class="np-track-artist" id="np-artist">
                ${escapeHtml(track?.artist || state.activePlaylist?.name || 'Tracklist')}
              </div>
            </div>
            <button class="icon-btn" id="btn-focus-mode" title="Enter Focus Mode (F)" aria-label="Focus Mode">
              ⛶
            </button>
          </div>

          <!-- Interactive Scrubber -->
          <div class="scrubber-container">
            <div class="scrubber-bar" id="scrubber-bar">
              <div class="scrubber-progress" id="scrubber-fill">
                <div class="scrubber-thumb"></div>
              </div>
            </div>
            <div class="scrubber-times">
              <span id="time-current">0:00</span>
              <span id="time-duration">0:00</span>
            </div>
          </div>

          <!-- Primary Playback Buttons -->
          <div class="playback-buttons">
            <button class="icon-btn btn-skip" id="btn-prev" title="Previous Track (P)" aria-label="Previous">
              ⏮
            </button>
            <button class="btn-play-pause" id="btn-main-play" title="Play/Pause (Space)" aria-label="Play">
              <span id="play-icon">${state.isPlaying ? '⏸' : '▶'}</span>
            </button>
            <button class="icon-btn btn-skip" id="btn-next" title="Next Track (N)" aria-label="Next">
              ⏭
            </button>
          </div>

          <!-- Secondary Toolbar: Shuffle, Repeat, Volume, Sleep Timer -->
          <div class="secondary-controls">
            <div style="display: flex; gap: 8px; align-items: center;">
              <button class="icon-btn control-toggle ${state.isShuffled ? 'is-active' : ''}" id="btn-toggle-shuffle" title="Shuffle">
                🔀
              </button>
              <button class="icon-btn control-toggle ${state.repeatMode !== 'off' ? 'is-active' : ''}" id="btn-toggle-repeat" title="Repeat (Off / All / One)">
                <span id="repeat-label">${state.repeatMode === 'one' ? '🔂' : '🔁'}</span>
              </button>
              <select id="select-sleep-timer" title="Sleep Timer" style="font-size: 0.8rem; padding: 4px 8px; height: 32px; border-radius: 6px;">
                <option value="0">Timer: Off</option>
                <option value="15">15 mins</option>
                <option value="30">30 mins</option>
                <option value="60">60 mins</option>
              </select>
            </div>

            <!-- Volume Control -->
            <div class="volume-control">
              <button class="icon-btn" id="btn-toggle-mute" title="Mute/Unmute (M)" style="width: 32px; height: 32px; min-width: 32px; min-height: 32px;">
                <span id="mute-icon">${state.isMuted || state.volume === 0 ? '🔇' : '🔊'}</span>
              </button>
              <input type="range" id="volume-range" class="volume-slider" min="0" max="100" value="${state.isMuted ? 0 : state.volume}" />
            </div>
          </div>

          <!-- Up Next Queue Preview -->
          <div id="up-next-preview" style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-subtle);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-size: 0.85rem; font-weight: 600; text-transform: uppercase; color: var(--text-muted); letter-spacing: 0.05em;">
                Up Next (${state.upNext.length})
              </span>
            </div>
            <div id="up-next-items" style="font-size: 0.88rem; color: var(--text-muted);">
              <!-- items rendered dynamically -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Attach control handlers
  const playBtn = container.querySelector('#btn-main-play');
  const playIcon = container.querySelector('#play-icon');
  playBtn?.addEventListener('click', () => {
    appStore.togglePlay();
  });

  const prevBtn = container.querySelector('#btn-prev');
  prevBtn?.addEventListener('click', () => {
    appStore.previous();
  });

  const nextBtn = container.querySelector('#btn-next');
  nextBtn?.addEventListener('click', () => {
    appStore.next();
  });

  const shuffleBtn = container.querySelector('#btn-toggle-shuffle');
  shuffleBtn?.addEventListener('click', () => {
    appStore.toggleShuffle();
  });

  const repeatBtn = container.querySelector('#btn-toggle-repeat');
  repeatBtn?.addEventListener('click', () => {
    appStore.cycleRepeatMode();
  });

  const sleepSelect = container.querySelector('#select-sleep-timer') as HTMLSelectElement;
  sleepSelect?.addEventListener('change', () => {
    const mins = parseInt(sleepSelect.value, 10);
    appStore.setSleepTimer(mins > 0 ? mins : null);
    if (mins > 0) {
      showToast(`Sleep timer set for ${mins} minutes`);
    } else {
      showToast('Sleep timer turned off');
    }
  });

  const muteBtn = container.querySelector('#btn-toggle-mute');
  muteBtn?.addEventListener('click', () => {
    appStore.toggleMute();
  });

  const volumeSlider = container.querySelector('#volume-range') as HTMLInputElement;
  volumeSlider?.addEventListener('input', () => {
    const val = parseInt(volumeSlider.value, 10);
    appStore.setVolume(val);
  });

  const focusBtn = container.querySelector('#btn-focus-mode');
  focusBtn?.addEventListener('click', () => {
    appStore.toggleFocusMode();
  });

  // Scrubber Dragging & Seeking
  const scrubberBar = container.querySelector('#scrubber-bar') as HTMLElement;
  const scrubberFill = container.querySelector('#scrubber-fill') as HTMLElement;
  const timeCurrent = container.querySelector('#time-current') as HTMLElement;
  const timeDuration = container.querySelector('#time-duration') as HTMLElement;

  let isScrubbing = false;

  function updateScrubPos(e: MouseEvent | TouchEvent): void {
    const rect = scrubberBar.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetSeconds = pos * (appStore.getState().duration || 0);

    scrubberFill.style.width = `${pos * 100}%`;
    timeCurrent.textContent = formatTime(targetSeconds);
  }

  function commitScrub(e: MouseEvent | TouchEvent): void {
    const rect = scrubberBar.getBoundingClientRect();
    const clientX = 'changedTouches' in e ? e.changedTouches[0].clientX : (e as MouseEvent).clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const targetSeconds = pos * (appStore.getState().duration || 0);
    appStore.seek(targetSeconds);
    isScrubbing = false;
  }

  scrubberBar?.addEventListener('mousedown', (e) => {
    isScrubbing = true;
    updateScrubPos(e);

    const onMove = (moveEvt: MouseEvent) => {
      if (isScrubbing) updateScrubPos(moveEvt);
    };

    const onUp = (upEvt: MouseEvent) => {
      if (isScrubbing) {
        commitScrub(upEvt);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  });

  // Touch support for scrubber
  scrubberBar?.addEventListener('touchstart', (e) => {
    isScrubbing = true;
    updateScrubPos(e);
  }, { passive: true });

  scrubberBar?.addEventListener('touchmove', (e) => {
    if (isScrubbing) updateScrubPos(e);
  }, { passive: true });

  scrubberBar?.addEventListener('touchend', (e) => {
    if (isScrubbing) commitScrub(e);
  });

  // Sync Store updates
  appStore.subscribe(updated => {
    if (updated.currentView !== 'nowPlaying') return;

    if (playIcon) {
      playIcon.textContent = updated.isPlaying ? '⏸' : '▶';
    }

    const titleEl = container.querySelector('#np-title');
    if (titleEl && updated.currentTrack) {
      titleEl.textContent = updated.currentTrack.title;
    }

    const artistEl = container.querySelector('#np-artist');
    if (artistEl) {
      artistEl.textContent = updated.currentTrack?.artist || updated.activePlaylist?.name || 'Tracklist';
    }

    if (!isScrubbing) {
      const pct = updated.duration > 0 ? (updated.currentTime / updated.duration) * 100 : 0;
      if (scrubberFill) scrubberFill.style.width = `${pct}%`;
      if (timeCurrent) timeCurrent.textContent = formatTime(updated.currentTime);
      if (timeDuration) timeDuration.textContent = formatTime(updated.duration);
    }

    if (shuffleBtn) {
      if (updated.isShuffled) shuffleBtn.classList.add('is-active');
      else shuffleBtn.classList.remove('is-active');
    }

    if (repeatBtn) {
      const repeatLabel = container.querySelector('#repeat-label');
      if (updated.repeatMode !== 'off') {
        repeatBtn.classList.add('is-active');
      } else {
        repeatBtn.classList.remove('is-active');
      }
      if (repeatLabel) {
        repeatLabel.textContent = updated.repeatMode === 'one' ? '🔂' : '🔁';
      }
    }

    const muteIcon = container.querySelector('#mute-icon');
    if (muteIcon) {
      muteIcon.textContent = updated.isMuted || updated.volume === 0 ? '🔇' : '🔊';
    }

    // Up Next preview
    const upNextItems = container.querySelector('#up-next-items');
    if (upNextItems) {
      if (updated.upNext.length === 0) {
        upNextItems.innerHTML = '<em>Playing next from playlist sequence</em>';
      } else {
        upNextItems.innerHTML = updated.upNext
          .slice(0, 3)
          .map(t => `<div style="padding: 2px 0;">🎵 ${escapeHtml(t.title)}</div>`)
          .join('');
      }
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

