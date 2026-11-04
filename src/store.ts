import { type Playlist, type Track, type ValidationError, validatePlaylist } from './schema';
import { PlaylistQueue, type RepeatMode } from './queue';
import { YouTubePlayerWrapper, PlayerEventType, PlayerState, type PlayerErrorEvent } from './player';
import { loadAppState, saveAppState, exportPlaylistAsJson, type AppPersistedState } from './storage';

export type ViewMode = 'library' | 'playlist' | 'nowPlaying';
export type ThemeMode = 'system' | 'dark' | 'light';

export interface AppState {
  playlists: Playlist[];
  activePlaylistId: string | null;
  activePlaylist: Playlist | null;
  activeTrackIndex: number;
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: RepeatMode;
  isShuffled: boolean;
  theme: ThemeMode;
  currentView: ViewMode;
  isFocusMode: boolean;
  isEditMode: boolean;
  sleepTimerRemaining: number | null; // in seconds
  upNext: Track[];
  unplayableVideoIds: Set<string>;
  lastError: string | null;
  validationErrors: ValidationError[];
}

type StoreListener = (state: AppState) => void;

function createUniqueId(): string {
  return 'pl_' + Math.random().toString(36).slice(2, 9) + '_' + Date.now().toString(36);
}

const DEFAULT_SAMPLE_PLAYLIST: Playlist = {
  schema: 'tracklist/1',
  id: 'pl_legendary_rock',
  name: 'Legendary Rock & Acoustic',
  description: 'Iconic live sessions and timeless acoustic performances',
  coverColor: '#e0245e',
  updatedAt: Date.now(),
  tracks: [
    {
      videoId: 'fJ9rUzIMcZQ',
      title: 'Queen - Bohemian Rhapsody (Live Aid 1985)',
      artist: 'Queen',
      start: 0
    },
    {
      videoId: 'L_LUpnjgPso',
      title: 'Pink Floyd - Comfortably Numb (Pulse Live)',
      artist: 'Pink Floyd'
    },
    {
      videoId: 'dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up',
      artist: 'Rick Astley'
    }
  ]
};

export class AppStore {
  private queue: PlaylistQueue;
  private player: YouTubePlayerWrapper;
  private listeners: Set<StoreListener> = new Set();
  private sleepInterval: number | null = null;

  private state: AppState;

  constructor() {
    this.player = new YouTubePlayerWrapper();

    // Try loading persisted state
    const saved = loadAppState();
    let initialPlaylists: Playlist[] = [DEFAULT_SAMPLE_PLAYLIST];
    let activeId: string | null = DEFAULT_SAMPLE_PLAYLIST.id!;
    let activeTrackIdx = 0;
    let initialTheme: ThemeMode = 'system';
    let initialRepeat: RepeatMode = 'off';
    let initialShuffled = false;
    let initialVolume = 100;

    if (saved && saved.playlists && saved.playlists.length > 0) {
      initialPlaylists = saved.playlists;
      activeId = saved.activePlaylistId || initialPlaylists[0].id || null;
      activeTrackIdx = saved.activeTrackIndex || 0;
      initialTheme = saved.theme || 'system';
      initialRepeat = saved.repeatMode || 'off';
      initialShuffled = saved.isShuffled || false;
      initialVolume = typeof saved.volume === 'number' ? saved.volume : 100;
    }

    const activePlaylist = initialPlaylists.find(p => p.id === activeId) || initialPlaylists[0];
    const initialTracks = activePlaylist ? activePlaylist.tracks : [];

    this.queue = new PlaylistQueue(initialTracks, activeTrackIdx);
    this.queue.setRepeatMode(initialRepeat);
    this.queue.setShuffle(initialShuffled);

    this.state = {
      playlists: initialPlaylists,
      activePlaylistId: activePlaylist?.id || null,
      activePlaylist: activePlaylist || null,
      activeTrackIndex: this.queue.currentIndex,
      currentTrack: this.queue.currentTrack,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: initialVolume,
      isMuted: false,
      repeatMode: initialRepeat,
      isShuffled: initialShuffled,
      theme: initialTheme,
      currentView: 'playlist',
      isFocusMode: false,
      isEditMode: false,
      sleepTimerRemaining: null,
      upNext: [],
      unplayableVideoIds: new Set(),
      lastError: null,
      validationErrors: []
    };

    this.setupPlayerEvents();
  }

  private setupPlayerEvents(): void {
    this.player.on(PlayerEventType.StateChange, (state: number) => {
      const isPlaying = state === PlayerState.Playing;
      this.setState({ isPlaying });
      this.updateMediaSessionPlaybackState();
    });

    this.player.on(PlayerEventType.TimeUpdate, (timeInfo: { currentTime: number; duration: number }) => {
      this.setState({
        currentTime: timeInfo.currentTime,
        duration: timeInfo.duration
      });
      this.updateMediaSessionPosition();
    });

    this.player.on(PlayerEventType.Ended, () => {
      // Auto-advance to next track
      this.next(true);
    });

    this.player.on(PlayerEventType.Error, (err: PlayerErrorEvent) => {
      console.warn('Player reported error:', err);
      if (err.unplayable && this.state.currentTrack) {
        const badId = this.state.currentTrack.videoId;
        this.queue.markUnplayable(badId);
        const unplayableVideoIds = new Set(this.state.unplayableVideoIds);
        unplayableVideoIds.add(badId);

        this.setState({
          lastError: `"${this.state.currentTrack.title}" cannot be played in embedded player. Skipping to next...`,
          unplayableVideoIds
        });

        // Automatically advance to skip unplayable video
        setTimeout(() => {
          this.next(true);
        }, 1200);
      } else {
        this.setState({ lastError: err.message });
      }
    });
  }

  getState(): AppState {
    return { ...this.state };
  }

  getPlayer(): YouTubePlayerWrapper {
    return this.player;
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private setState(updates: Partial<AppState>): void {
    this.state = {
      ...this.state,
      ...updates
    };

    this.persist();
    this.listeners.forEach(fn => {
      try {
        fn(this.state);
      } catch (e) {
        console.error('Error in store listener:', e);
      }
    });
  }

  private persist(): void {
    const persisted: AppPersistedState = {
      version: 1,
      playlists: this.state.playlists,
      activePlaylistId: this.state.activePlaylistId,
      activeTrackIndex: this.state.activeTrackIndex,
      theme: this.state.theme,
      repeatMode: this.state.repeatMode,
      isShuffled: this.state.isShuffled,
      volume: this.state.volume
    };
    saveAppState(persisted);
  }

  // --- Playback Actions ---

  async initPlayer(containerId: string): Promise<void> {
    try {
      await this.player.init(containerId);
      // If we have a current track, cue it
      if (this.state.currentTrack) {
        this.player.cueVideo(
          this.state.currentTrack.videoId,
          this.state.currentTrack.start,
          this.state.currentTrack.end
        );
      }
      this.updateMediaSessionMetadata();
    } catch (err) {
      console.error('Failed to init YouTube player:', err);
    }
  }

  play(): void {
    if (!this.state.currentTrack && this.queue.tracks.length > 0) {
      this.playTrackAtIndex(0);
      return;
    }
    this.player.play();
    this.setState({ isPlaying: true, lastError: null });
  }

  pause(): void {
    this.player.pause();
    this.setState({ isPlaying: false });
  }

  togglePlay(): void {
    if (this.state.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  playTrackAtIndex(index: number): void {
    const track = this.queue.jumpTo(index);
    if (!track) return;

    this.setState({
      activeTrackIndex: this.queue.currentIndex,
      currentTrack: track,
      currentTime: 0,
      lastError: null
    });

    this.player.loadVideo(track.videoId, track.start, track.end);
    this.updateMediaSessionMetadata();
  }

  next(autoPlay: boolean = true): void {
    const nextTrack = this.queue.next();
    if (!nextTrack) {
      // Reached the end of playlist without repeat
      this.pause();
      this.setState({ isPlaying: false, currentTime: 0 });
      return;
    }

    this.setState({
      activeTrackIndex: this.queue.currentIndex,
      currentTrack: nextTrack,
      currentTime: 0,
      upNext: this.queue.upNextQueue,
      lastError: null
    });

    if (autoPlay) {
      this.player.loadVideo(nextTrack.videoId, nextTrack.start, nextTrack.end);
    } else {
      this.player.cueVideo(nextTrack.videoId, nextTrack.start, nextTrack.end);
    }

    this.updateMediaSessionMetadata();
  }

  previous(): void {
    // If more than 3 seconds into the song, restart it instead
    if (this.state.currentTime > 3) {
      this.seek(0);
      return;
    }

    const prevTrack = this.queue.previous();
    if (!prevTrack) return;

    this.setState({
      activeTrackIndex: this.queue.currentIndex,
      currentTrack: prevTrack,
      currentTime: 0,
      lastError: null
    });

    this.player.loadVideo(prevTrack.videoId, prevTrack.start, prevTrack.end);
    this.updateMediaSessionMetadata();
  }

  seek(seconds: number): void {
    this.player.seekTo(seconds, true);
    this.setState({ currentTime: seconds });
  }

  setVolume(volume: number): void {
    this.player.setVolume(volume);
    this.setState({ volume, isMuted: volume === 0 });
  }

  toggleMute(): void {
    if (this.state.isMuted) {
      this.player.unMute();
      this.setState({ isMuted: false });
    } else {
      this.player.mute();
      this.setState({ isMuted: true });
    }
  }

  toggleShuffle(): void {
    const nextShuffle = !this.state.isShuffled;
    this.queue.setShuffle(nextShuffle);
    this.setState({ isShuffled: nextShuffle });
  }

  cycleRepeatMode(): void {
    const modes: RepeatMode[] = ['off', 'all', 'one'];
    const currentIdx = modes.indexOf(this.state.repeatMode);
    const nextMode = modes[(currentIdx + 1) % modes.length];
    this.queue.setRepeatMode(nextMode);
    this.setState({ repeatMode: nextMode });
  }

  // --- Playlist & Library Management ---

  loadPlaylist(playlist: Playlist, autoPlay: boolean = false): void {
    const playlistId = playlist.id || createUniqueId();
    const existingIndex = this.state.playlists.findIndex(p => p.id === playlistId);
    let updatedPlaylists = [...this.state.playlists];

    const preparedPlaylist: Playlist = {
      ...playlist,
      id: playlistId,
      updatedAt: Date.now()
    };

    if (existingIndex >= 0) {
      updatedPlaylists[existingIndex] = preparedPlaylist;
    } else {
      updatedPlaylists.unshift(preparedPlaylist);
    }

    this.queue.setTracks(preparedPlaylist.tracks, 0);

    this.setState({
      playlists: updatedPlaylists,
      activePlaylistId: playlistId,
      activePlaylist: preparedPlaylist,
      activeTrackIndex: 0,
      currentTrack: this.queue.currentTrack,
      currentTime: 0,
      upNext: [],
      unplayableVideoIds: new Set(),
      lastError: null
    });

    if (this.queue.currentTrack) {
      if (autoPlay) {
        this.player.loadVideo(this.queue.currentTrack.videoId, this.queue.currentTrack.start);
      } else {
        this.player.cueVideo(this.queue.currentTrack.videoId, this.queue.currentTrack.start);
      }
    }

    this.updateMediaSessionMetadata();
  }

  selectPlaylist(id: string): void {
    const found = this.state.playlists.find(p => p.id === id);
    if (!found) return;
    this.loadPlaylist(found, false);
    this.setView('playlist');
  }

  createPlaylist(name: string, description?: string, tracks: Track[] = []): Playlist {
    const newPlaylist: Playlist = {
      schema: 'tracklist/1',
      id: createUniqueId(),
      name: name.trim() || 'Untitled Playlist',
      description: description?.trim(),
      tracks,
      coverColor: this.getRandomColor(),
      updatedAt: Date.now()
    };

    const playlists = [newPlaylist, ...this.state.playlists];
    this.queue.setTracks(tracks, 0);

    this.setState({
      playlists,
      activePlaylistId: newPlaylist.id!,
      activePlaylist: newPlaylist,
      activeTrackIndex: 0,
      currentTrack: this.queue.currentTrack
    });

    return newPlaylist;
  }

  updatePlaylist(id: string, updates: Partial<Playlist>): void {
    const index = this.state.playlists.findIndex(p => p.id === id);
    if (index === -1) return;

    const current = this.state.playlists[index];
    const updated: Playlist = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };

    const playlists = [...this.state.playlists];
    playlists[index] = updated;

    let activePlaylist = this.state.activePlaylist;
    if (this.state.activePlaylistId === id) {
      activePlaylist = updated;
      if (updates.tracks) {
        this.queue.setTracks(updates.tracks, this.state.activeTrackIndex);
      }
    }

    this.setState({
      playlists,
      activePlaylist,
      currentTrack: this.queue.currentTrack
    });
  }

  deletePlaylist(id: string): void {
    const filtered = this.state.playlists.filter(p => p.id !== id);
    let nextActiveId = this.state.activePlaylistId;
    let nextActivePlaylist = this.state.activePlaylist;

    if (this.state.activePlaylistId === id) {
      nextActivePlaylist = filtered[0] || null;
      nextActiveId = nextActivePlaylist ? nextActivePlaylist.id! : null;
      if (nextActivePlaylist) {
        this.queue.setTracks(nextActivePlaylist.tracks, 0);
      } else {
        this.queue.setTracks([], 0);
      }
    }

    this.setState({
      playlists: filtered,
      activePlaylistId: nextActiveId,
      activePlaylist: nextActivePlaylist,
      activeTrackIndex: this.queue.currentIndex,
      currentTrack: this.queue.currentTrack
    });
  }

  duplicatePlaylist(id: string): Playlist | null {
    const target = this.state.playlists.find(p => p.id === id);
    if (!target) return null;

    const duplicated: Playlist = {
      ...target,
      id: createUniqueId(),
      name: `${target.name} (Copy)`,
      updatedAt: Date.now(),
      coverColor: this.getRandomColor()
    };

    const playlists = [duplicated, ...this.state.playlists];
    this.setState({ playlists });
    return duplicated;
  }

  reorderTrack(fromIndex: number, toIndex: number): void {
    if (!this.state.activePlaylist) return;

    const tracks = [...this.state.activePlaylist.tracks];
    const [moved] = tracks.splice(fromIndex, 1);
    tracks.splice(toIndex, 0, moved);

    this.queue.reorder(fromIndex, toIndex);

    this.updatePlaylist(this.state.activePlaylist.id!, { tracks });
    this.setState({
      activeTrackIndex: this.queue.currentIndex,
      currentTrack: this.queue.currentTrack
    });
  }

  removeTrack(index: number): void {
    if (!this.state.activePlaylist) return;

    const tracks = [...this.state.activePlaylist.tracks];
    tracks.splice(index, 1);
    this.queue.removeTrack(index);

    this.updatePlaylist(this.state.activePlaylist.id!, { tracks });
    this.setState({
      activeTrackIndex: this.queue.currentIndex,
      currentTrack: this.queue.currentTrack
    });
  }

  addTracksToCurrent(newTracks: Track[]): void {
    if (!this.state.activePlaylist) {
      this.createPlaylist('New Playlist', undefined, newTracks);
      return;
    }

    const merged = [...this.state.activePlaylist.tracks, ...newTracks];
    this.updatePlaylist(this.state.activePlaylist.id!, { tracks: merged });
  }

  addToUpNext(track: Track): void {
    this.queue.addToUpNext(track);
    this.setState({ upNext: this.queue.upNextQueue });
  }

  // --- UI & View Navigation ---

  setView(view: ViewMode): void {
    this.setState({ currentView: view });
  }

  toggleFocusMode(): void {
    this.setState({ isFocusMode: !this.state.isFocusMode });
  }

  toggleEditMode(): void {
    this.setState({ isEditMode: !this.state.isEditMode });
  }

  setTheme(theme: ThemeMode): void {
    this.setState({ theme });
    this.applyTheme(theme);
  }

  applyTheme(theme: ThemeMode): void {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }

  // --- Sleep Timer ---

  setSleepTimer(minutes: number | null): void {
    if (this.sleepInterval !== null) {
      clearInterval(this.sleepInterval);
      this.sleepInterval = null;
    }

    if (minutes === null || minutes <= 0) {
      this.setState({ sleepTimerRemaining: null });
      return;
    }

    let remainingSeconds = minutes * 60;
    this.setState({ sleepTimerRemaining: remainingSeconds });

    this.sleepInterval = window.setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds <= 0) {
        if (this.sleepInterval) clearInterval(this.sleepInterval);
        this.sleepInterval = null;
        this.pause();
        this.setState({ sleepTimerRemaining: null });
      } else {
        this.setState({ sleepTimerRemaining: remainingSeconds });
      }
    }, 1000);
  }

  // --- Import / Export / Share ---

  importFromJSONString(jsonStr: string): { success: boolean; errors: ValidationError[]; warnings: string[] } {
    try {
      const parsed = JSON.parse(jsonStr);
      const validation = validatePlaylist(parsed);

      if (validation.isValid && validation.playlist) {
        this.loadPlaylist(validation.playlist, true);
        this.setState({ validationErrors: [], lastError: null });
        return { success: true, errors: [], warnings: validation.warnings };
      }

      this.setState({ validationErrors: validation.errors });
      return { success: false, errors: validation.errors, warnings: validation.warnings };
    } catch (e: any) {
      const parseError: ValidationError = {
        field: 'json',
        message: `Invalid JSON syntax: ${e.message}`
      };
      this.setState({ validationErrors: [parseError] });
      return { success: false, errors: [parseError], warnings: [] };
    }
  }

  loadOnlyValidTracksFromErrors(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      const validation = validatePlaylist(parsed);

      if (validation.validTracks.length > 0) {
        const recoveredPlaylist: Playlist = {
          schema: 'tracklist/1',
          name: typeof parsed.name === 'string' && parsed.name.trim() ? `${parsed.name.trim()} (Recovered)` : 'Recovered Playlist',
          tracks: validation.validTracks
        };
        this.loadPlaylist(recoveredPlaylist, true);
        this.setState({ validationErrors: [], lastError: null });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  exportCurrentPlaylist(): void {
    if (this.state.activePlaylist) {
      exportPlaylistAsJson(this.state.activePlaylist);
    }
  }

  generateShareUrl(): string {
    if (!this.state.activePlaylist) return window.location.href;

    const payload = {
      name: this.state.activePlaylist.name,
      tracks: this.state.activePlaylist.tracks.map(t => ({
        videoId: t.videoId,
        title: t.title,
        ...(t.artist ? { artist: t.artist } : {})
      }))
    };

    const json = JSON.stringify(payload);
    // Base64 encode URL safe
    const base64 = btoa(encodeURIComponent(json));
    const url = new URL(window.location.origin + window.location.pathname);
    url.hash = `playlist=${base64}`;
    return url.toString();
  }

  importFromUrlHash(): boolean {
    if (typeof window === 'undefined' || !window.location.hash) return false;
    try {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const encoded = params.get('playlist');
      if (!encoded) return false;

      const json = decodeURIComponent(atob(encoded));
      const result = this.importFromJSONString(json);
      if (result.success) {
        // Clear hash from URL to avoid re-triggering
        history.replaceState(null, '', window.location.pathname);
        return true;
      }
      return false;
    } catch (e) {
      console.warn('Failed to parse playlist from URL hash:', e);
      return false;
    }
  }

  // --- Media Session API ---

  private updateMediaSessionMetadata(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const track = this.state.currentTrack;
    if (!track) {
      navigator.mediaSession.metadata = null;
      return;
    }

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || this.state.activePlaylist?.name || 'Tracklist',
      album: this.state.activePlaylist?.name || 'Tracklist Playlist',
      artwork: [
        {
          src: `https://img.youtube.com/vi/${track.videoId}/hqdefault.jpg`,
          sizes: '480x360',
          type: 'image/jpeg'
        },
        {
          src: `https://img.youtube.com/vi/${track.videoId}/mqdefault.jpg`,
          sizes: '320x180',
          type: 'image/jpeg'
        }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => this.previous());
    navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
    navigator.mediaSession.setActionHandler('seekto', details => {
      if (typeof details.seekTime === 'number') {
        this.seek(details.seekTime);
      }
    });
  }

  private updateMediaSessionPlaybackState(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = this.state.isPlaying ? 'playing' : 'paused';
  }

  private updateMediaSessionPosition(): void {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator) || !navigator.mediaSession.setPositionState) {
      return;
    }
    if (this.state.duration > 0 && this.state.currentTime >= 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.state.duration,
          playbackRate: 1,
          position: Math.min(this.state.currentTime, this.state.duration)
        });
      } catch {
        // Can fail if position > duration during seek
      }
    }
  }

  private getRandomColor(): string {
    const colors = [
      '#fa2d48', // Apple Music Red
      '#fc3c44', // Coral
      '#ff2d55', // Pink
      '#5856d6', // Indigo
      '#007aff', // Blue
      '#34c759', // Green
      '#af52de', // Purple
      '#ff9500'  // Orange
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

export const appStore = new AppStore();
