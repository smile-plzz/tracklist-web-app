import { describe, it, expect, vi, beforeEach } from 'vitest';
import { YouTubePlayerWrapper, PlayerEventType } from '../src/player';

// Mock YT global
const mockYTPlayer = {
  loadVideoById: vi.fn(),
  cueVideoById: vi.fn(),
  playVideo: vi.fn(),
  pauseVideo: vi.fn(),
  seekTo: vi.fn(),
  getCurrentTime: vi.fn(() => 42),
  getDuration: vi.fn(() => 180),
  getPlayerState: vi.fn(() => 1),
  isMuted: vi.fn(() => false),
  mute: vi.fn(),
  unMute: vi.fn(),
  setVolume: vi.fn(),
  destroy: vi.fn()
};

let capturedEvents: Record<string, Function> = {};

class MockYTPlayerConstructor {
  constructor(_el: HTMLElement | string, options: any) {
    capturedEvents = options.events || {};
    // Auto-trigger onReady
    setTimeout(() => {
      if (capturedEvents.onReady) {
        capturedEvents.onReady({ target: mockYTPlayer });
      }
    }, 0);
    return mockYTPlayer;
  }
}

describe('YouTubePlayerWrapper', () => {
  let player: YouTubePlayerWrapper;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedEvents = {};
    (globalThis as any).window = (globalThis as any).window || {};
    (window as any).YT = {
      Player: MockYTPlayerConstructor,
      PlayerState: {
        UNSTARTED: -1,
        ENDED: 0,
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        CUED: 5
      }
    };
    player = new YouTubePlayerWrapper();
  });

  it('initializes and triggers ready listener', async () => {
    const onReady = vi.fn();
    player.on(PlayerEventType.Ready, onReady);

    const dummyContainer = document.createElement('div');
    dummyContainer.id = 'player-container';
    document.body.appendChild(dummyContainer);

    await player.init('player-container');
    expect(onReady).toHaveBeenCalled();
  });

  it('delegates playback commands to underlying YT player', async () => {
    await player.init('dummy');
    player.loadVideo('dQw4w9WgXcQ', 10, 60);
    expect(mockYTPlayer.loadVideoById).toHaveBeenCalledWith({
      videoId: 'dQw4w9WgXcQ',
      startSeconds: 10,
      endSeconds: 60
    });

    player.play();
    expect(mockYTPlayer.playVideo).toHaveBeenCalled();

    player.pause();
    expect(mockYTPlayer.pauseVideo).toHaveBeenCalled();

    player.seekTo(30);
    expect(mockYTPlayer.seekTo).toHaveBeenCalledWith(30, true);
  });

  it('notifies on track ended for auto-advancement', async () => {
    const onEnded = vi.fn();
    player.on(PlayerEventType.Ended, onEnded);
    await player.init('dummy');

    // Simulate YT player emitting state change ENDED (0)
    capturedEvents.onStateChange({ data: 0 });
    expect(onEnded).toHaveBeenCalled();
  });

  it('catches embed errors (100, 101, 150) and emits error event', async () => {
    const onError = vi.fn();
    player.on(PlayerEventType.Error, onError);
    await player.init('dummy');

    // Simulate error 150 (not allowed to embed)
    capturedEvents.onError({ data: 150 });
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 150,
        unplayable: true
      })
    );
  });
});
