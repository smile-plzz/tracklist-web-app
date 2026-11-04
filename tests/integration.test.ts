import { describe, it, expect, beforeEach } from 'vitest';
import { AppStore } from '../src/store';
import { validatePlaylist } from '../src/schema';
import { parseLinksOrIdsToTracks } from '../src/storage';

describe('End-to-End App Integration Flow', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('completes the entire user journey: import, playback, advance, error skip, reorder, and share', async () => {
    const store = new AppStore();

    // 1. Initial state has default sample playlist
    expect(store.getState().activePlaylist).not.toBeNull();
    expect(store.getState().playlists.length).toBeGreaterThanOrEqual(1);

    // 2. User pastes/imports custom playlist JSON with 3 tracks (one valid, one unplayable, one end track)
    const customJson = JSON.stringify({
      schema: 'tracklist/1',
      name: 'Indie Rock Sessions',
      tracks: [
        { videoId: 'track_11111', title: 'Track 1' },
        { videoId: 'track_bad01', title: 'Blocked Track' },
        { videoId: 'track_33333', title: 'Track 3' }
      ]
    });

    const importRes = store.importFromJSONString(customJson);
    expect(importRes.success).toBe(true);
    expect(store.getState().activePlaylist?.name).toBe('Indie Rock Sessions');
    expect(store.getState().activePlaylist?.tracks).toHaveLength(3);

    // 3. Start playback on track 1
    store.playTrackAtIndex(0);
    expect(store.getState().currentTrack?.title).toBe('Track 1');

    // 4. Auto-advance when track 1 ends
    store.next(true);
    expect(store.getState().currentTrack?.title).toBe('Blocked Track');

    // 5. Simulate YouTube player emitting error 150 (embedding disallowed)
    // The player wrapper emits error, which marks row unplayable and auto-advances
    store.getPlayer()['handleError'](150);
    expect(store.getState().unplayableVideoIds.has('track_bad01')).toBe(true);
    expect(store.getState().lastError).toContain('cannot be played');

    // 6. User reorders track 3 to index 0 (drag-to-reorder check)
    store.reorderTrack(2, 0);
    const reorderedTracks = store.getState().activePlaylist?.tracks;
    expect(reorderedTracks?.[0].title).toBe('Track 3');

    // 7. Verify localStorage persistence after reload
    const restoredStore = new AppStore();
    const restoredActive = restoredStore.getState().activePlaylist;
    expect(restoredActive?.name).toBe('Indie Rock Sessions');
    expect(restoredActive?.tracks[0].title).toBe('Track 3');

    // 8. User adds tracks by pasting YouTube links
    const pastedInput = `
      https://www.youtube.com/watch?v=dQw4w9WgXcQ - Rick Roll
      https://youtu.be/fJ9rUzIMcZQ - Live Aid
    `;
    const parsedTracks = parseLinksOrIdsToTracks(pastedInput);
    expect(parsedTracks).toHaveLength(2);
    expect(parsedTracks[0].videoId).toBe('dQw4w9WgXcQ');
    expect(parsedTracks[0].title).toBe('Rick Roll');

    store.addTracksToCurrent(parsedTracks);
    expect(store.getState().activePlaylist?.tracks).toHaveLength(5);

    // 9. User generates a zero-backend share link
    const shareUrl = store.generateShareUrl();
    expect(shareUrl).toContain('#playlist=');

    // 10. Focus mode toggle and keyboard controls
    store.toggleFocusMode();
    expect(store.getState().isFocusMode).toBe(true);
    store.toggleFocusMode();
    expect(store.getState().isFocusMode).toBe(false);

    // 11. Sleep timer
    store.setSleepTimer(30);
    expect(store.getState().sleepTimerRemaining).toBe(1800);
    store.setSleepTimer(null);
    expect(store.getState().sleepTimerRemaining).toBeNull();
  });

  it('validates and handles edge cases with bad tracks and allows partial recovery', () => {
    const invalidJson = {
      schema: 'tracklist/1',
      name: 'Faulty Mix',
      tracks: [
        { videoId: 'dQw4w9WgXcQ', title: 'Good Track' },
        { videoId: 'invalid-id-too-long', title: 'Bad Track' }
      ]
    };

    const val = validatePlaylist(invalidJson);
    expect(val.isValid).toBe(false);
    expect(val.errors.length).toBe(1);
    expect(val.validTracks).toHaveLength(1);
    expect(val.validTracks[0].videoId).toBe('dQw4w9WgXcQ');

    const store = new AppStore();
    const recovered = store.loadOnlyValidTracksFromErrors(JSON.stringify(invalidJson));
    expect(recovered).toBe(true);
    expect(store.getState().activePlaylist?.tracks).toHaveLength(1);
    expect(store.getState().activePlaylist?.tracks[0].videoId).toBe('dQw4w9WgXcQ');
  });
});
