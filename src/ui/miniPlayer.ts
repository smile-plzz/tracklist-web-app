import { appStore } from '../store';

export function renderMiniPlayer(container: HTMLElement): void {
  container.innerHTML = `
    <div class="mini-player" id="mini-player" style="display: none;">
      <div class="mini-player-progress">
        <div class="mini-player-fill" id="mini-fill"></div>
      </div>
      <div class="mini-left">
        <img class="mini-thumb" id="mini-thumb" src="" alt="" />
        <div class="mini-meta">
          <div class="mini-title" id="mini-title">No track playing</div>
          <div class="mini-artist" id="mini-artist">Tracklist</div>
        </div>
      </div>
      <div class="mini-controls">
        <button class="icon-btn" id="btn-mini-play" title="Play / Pause" style="font-size: 1.1rem;">
          <span id="mini-play-icon">▶</span>
        </button>
        <button class="icon-btn" id="btn-mini-next" title="Next Track" style="font-size: 1.1rem;">
          ⏭
        </button>
      </div>
    </div>
  `;

  const miniPlayer = container.querySelector('#mini-player') as HTMLElement;
  const miniFill = container.querySelector('#mini-fill') as HTMLElement;
  const miniThumb = container.querySelector('#mini-thumb') as HTMLImageElement;
  const miniTitle = container.querySelector('#mini-title') as HTMLElement;
  const miniArtist = container.querySelector('#mini-artist') as HTMLElement;
  const playBtn = container.querySelector('#btn-mini-play');
  const playIcon = container.querySelector('#mini-play-icon');
  const nextBtn = container.querySelector('#btn-mini-next');

  // Clicking bar expands to Now Playing (except when clicking controls)
  miniPlayer.addEventListener('click', (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    appStore.setView('nowPlaying');
  });

  playBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    appStore.togglePlay();
  });

  nextBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    appStore.next();
  });

  appStore.subscribe(state => {
    const track = state.currentTrack;

    // Hide mini player in Now Playing view or Focus mode or when there are no tracks
    if (state.currentView === 'nowPlaying' || state.isFocusMode || !track) {
      miniPlayer.style.display = 'none';
      return;
    }

    miniPlayer.style.display = 'flex';

    if (miniTitle) miniTitle.textContent = track.title;
    if (miniArtist) miniArtist.textContent = track.artist || state.activePlaylist?.name || 'Tracklist';
    if (miniThumb) miniThumb.src = `https://img.youtube.com/vi/${track.videoId}/mqdefault.jpg`;
    if (playIcon) playIcon.textContent = state.isPlaying ? '⏸' : '▶';

    if (miniFill) {
      const pct = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
      miniFill.style.width = `${pct}%`;
    }
  });
}
