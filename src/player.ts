// YouTube Player API Types & Wrapper

export enum PlayerState {
  Unstarted = -1,
  Ended = 0,
  Playing = 1,
  Paused = 2,
  Buffering = 3,
  Cued = 5
}

export enum PlayerEventType {
  Ready = 'ready',
  StateChange = 'stateChange',
  Ended = 'ended',
  Error = 'error',
  TimeUpdate = 'timeUpdate'
}

export interface PlayerErrorEvent {
  code: number;
  message: string;
  unplayable: boolean;
}

export interface PlayerTimeEvent {
  currentTime: number;
  duration: number;
}

type EventCallback = (payload?: any) => void;

let apiLoadPromise: Promise<void> | null = null;

export function loadYouTubeIFrameAPI(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  // If already loaded
  if ((window as any).YT && (window as any).YT.Player) {
    return Promise.resolve();
  }

  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise<void>((resolve, reject) => {
    // Check if script tag already exists
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
    if (!existingScript) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => reject(new Error('Failed to load YouTube IFrame API script.'));
      const firstScriptTag = document.getElementsByTagName('script')[0];
      if (firstScriptTag && firstScriptTag.parentNode) {
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      } else {
        document.head.appendChild(tag);
      }
    }

    const previousOnReady = (window as any).onYouTubeIframeAPIReady;
    (window as any).onYouTubeIframeAPIReady = () => {
      if (typeof previousOnReady === 'function') {
        previousOnReady();
      }
      resolve();
    };

    // Fallback polling in case callback was already missed
    const interval = setInterval(() => {
      if ((window as any).YT && (window as any).YT.Player) {
        clearInterval(interval);
        resolve();
      }
    }, 100);

    setTimeout(() => {
      clearInterval(interval);
      if ((window as any).YT && (window as any).YT.Player) {
        resolve();
      } else {
        reject(new Error('Timeout waiting for YouTube IFrame API to initialize.'));
      }
    }, 10000);
  });

  return apiLoadPromise;
}

export class YouTubePlayerWrapper {
  private player: any = null;
  private isReady: boolean = false;
  private listeners: Map<PlayerEventType, Set<EventCallback>> = new Map();
  private tickerInterval: number | null = null;
  private currentVideoId: string | null = null;

  constructor() {
    Object.values(PlayerEventType).forEach(type => {
      this.listeners.set(type as PlayerEventType, new Set());
    });
  }

  on(event: PlayerEventType, callback: EventCallback): () => void {
    const set = this.listeners.get(event);
    if (set) {
      set.add(callback);
    }
    return () => {
      set?.delete(callback);
    };
  }

  private emit(event: PlayerEventType, payload?: any): void {
    const set = this.listeners.get(event);
    if (set) {
      set.forEach(cb => {
        try {
          cb(payload);
        } catch (e) {
          console.error(`Error in player listener for ${event}:`, e);
        }
      });
    }
  }

  async init(elementId: string): Promise<void> {
    await loadYouTubeIFrameAPI();

    return new Promise<void>((resolve, reject) => {
      try {
        const YT = (window as any).YT;
        this.player = new YT.Player(elementId, {
          width: '100%',
          height: '100%',
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            playsinline: 1,
            enablejsapi: 1,
            origin: typeof window !== 'undefined' && window.location ? window.location.origin : ''
          },
          events: {
            onReady: (_event: any) => {
              this.isReady = true;
              this.emit(PlayerEventType.Ready);
              resolve();
            },
            onStateChange: (event: any) => {
              this.handleStateChange(event.data);
            },
            onError: (event: any) => {
              this.handleError(event.data);
            }
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleStateChange(state: number): void {
    this.emit(PlayerEventType.StateChange, state);

    if (state === PlayerState.Playing) {
      this.startProgressTicker();
    } else {
      this.stopProgressTicker();
    }

    if (state === PlayerState.Ended) {
      this.emit(PlayerEventType.Ended, { videoId: this.currentVideoId });
    }
  }

  private handleError(code: number): void {
    // YouTube Error codes:
    // 2: Invalid parameter
    // 5: HTML5 player error
    // 100: Video not found, removed or private
    // 101: Embedding not allowed by owner
    // 150: Same as 101 (disallowed embedding)
    const isUnplayable = [2, 5, 100, 101, 150].includes(code);
    let message = 'An error occurred while playing the video.';
    if (code === 2) message = 'Invalid YouTube video ID.';
    else if (code === 100) message = 'Video not found, removed, or private.';
    else if (code === 101 || code === 150) message = 'The video owner disallows playback outside YouTube.';

    const payload: PlayerErrorEvent = {
      code,
      message,
      unplayable: isUnplayable
    };

    this.emit(PlayerEventType.Error, payload);
  }

  private startProgressTicker(): void {
    this.stopProgressTicker();
    this.tickerInterval = window.setInterval(() => {
      if (!this.player || !this.isReady) return;
      try {
        const currentTime = this.getCurrentTime();
        const duration = this.getDuration();
        this.emit(PlayerEventType.TimeUpdate, { currentTime, duration });
      } catch {
        // Ignore read errors during transitions
      }
    }, 250);
  }

  private stopProgressTicker(): void {
    if (this.tickerInterval !== null) {
      clearInterval(this.tickerInterval);
      this.tickerInterval = null;
    }
  }

  loadVideo(videoId: string, startSeconds?: number, endSeconds?: number | null): void {
    this.currentVideoId = videoId;
    if (!this.player || !this.isReady) return;

    const options: any = { videoId };
    if (typeof startSeconds === 'number' && startSeconds >= 0) {
      options.startSeconds = startSeconds;
    }
    if (typeof endSeconds === 'number' && endSeconds > 0) {
      options.endSeconds = endSeconds;
    }

    this.player.loadVideoById(options);
  }

  cueVideo(videoId: string, startSeconds?: number, endSeconds?: number | null): void {
    this.currentVideoId = videoId;
    if (!this.player || !this.isReady) return;

    const options: any = { videoId };
    if (typeof startSeconds === 'number' && startSeconds >= 0) {
      options.startSeconds = startSeconds;
    }
    if (typeof endSeconds === 'number' && endSeconds > 0) {
      options.endSeconds = endSeconds;
    }

    this.player.cueVideoById(options);
  }

  play(): void {
    if (this.player && this.isReady) {
      this.player.playVideo();
    }
  }

  pause(): void {
    if (this.player && this.isReady) {
      this.player.pauseVideo();
    }
  }

  seekTo(seconds: number, allowSeekAhead: boolean = true): void {
    if (this.player && this.isReady) {
      this.player.seekTo(seconds, allowSeekAhead);
      // Immediately emit updated time
      const duration = this.getDuration();
      this.emit(PlayerEventType.TimeUpdate, { currentTime: seconds, duration });
    }
  }

  getCurrentTime(): number {
    if (this.player && this.isReady && typeof this.player.getCurrentTime === 'function') {
      return this.player.getCurrentTime() || 0;
    }
    return 0;
  }

  getDuration(): number {
    if (this.player && this.isReady && typeof this.player.getDuration === 'function') {
      return this.player.getDuration() || 0;
    }
    return 0;
  }

  getPlayerState(): number {
    if (this.player && this.isReady && typeof this.player.getPlayerState === 'function') {
      return this.player.getPlayerState();
    }
    return PlayerState.Unstarted;
  }

  setVolume(volume: number): void {
    if (this.player && this.isReady && typeof this.player.setVolume === 'function') {
      this.player.setVolume(Math.max(0, Math.min(100, volume)));
    }
  }

  mute(): void {
    if (this.player && this.isReady && typeof this.player.mute === 'function') {
      this.player.mute();
    }
  }

  unMute(): void {
    if (this.player && this.isReady && typeof this.player.unMute === 'function') {
      this.player.unMute();
    }
  }

  isMuted(): boolean {
    if (this.player && this.isReady && typeof this.player.isMuted === 'function') {
      return this.player.isMuted();
    }
    return false;
  }

  destroy(): void {
    this.stopProgressTicker();
    if (this.player && typeof this.player.destroy === 'function') {
      this.player.destroy();
    }
    this.player = null;
    this.isReady = false;
  }
}
