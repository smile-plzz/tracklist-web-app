import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AppStore } from '../src/store';
import type { Playlist } from '../src/schema';

describe('AppStore', () => {
  let store: AppStore;

  const samplePlaylist: Playlist = {
    schema: 'tracklist/1',
    id: 'pl-test-1',
    name: 'Rock Classics',
    tracks: [
      { videoId: 'dQw4w9WgXcQ', title: 'Rick Astley' },
      { videoId: 'L_LUpnjgPso', title: 'Comfortably Numb' },
      { videoId: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody' }
    ]
  };

  beforeEach(() => {
    localStorage.clear();
    store = new AppStore();
  });

  it('initializes with default state or creates a default playlist', () => {
    const state = store.getState();
    expect(state.playlists).toBeDefined();
    expect(state.currentView).toBe('playlist');
    expect(state.repeatMode).toBe('off');
  });

  it('subscribes and notifies listeners on state changes', () => {
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.createPlaylist('New Test Playlist');
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    store.createPlaylist('Another Playlist');
    // Listener should not have been called after unsubscribe
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('creates, renames, duplicates, and deletes playlists', () => {
    const pl = store.createPlaylist('Synthwave Beats', 'Electronic vibes');
    expect(store.getState().playlists.some(p => p.id === pl.id)).toBe(true);

    store.updatePlaylist(pl.id!, { name: 'Synthwave Relax' });
    expect(store.getState().playlists.find(p => p.id === pl.id)?.name).toBe('Synthwave Relax');

    const duplicate = store.duplicatePlaylist(pl.id!);
    expect(duplicate).not.toBeNull();
    expect(duplicate?.name).toBe('Synthwave Relax (Copy)');

    store.deletePlaylist(pl.id!);
    expect(store.getState().playlists.some(p => p.id === pl.id)).toBe(false);
  });

  it('reorders tracks and updates queue accordingly', () => {
    store.loadPlaylist(samplePlaylist);
    expect(store.getState().activePlaylist?.tracks[0].title).toBe('Rick Astley');

    store.reorderTrack(0, 2);
    const active = store.getState().activePlaylist;
    expect(active?.tracks[2].title).toBe('Rick Astley');
    expect(active?.tracks[0].title).toBe('Comfortably Numb');
  });

  it('imports valid JSON string and selects new playlist', () => {
    const json = JSON.stringify({
      schema: 'tracklist/1',
      name: 'Imported Session',
      tracks: [{ videoId: 'dQw4w9WgXcQ', title: 'Song 1' }]
    });

    const result = store.importFromJSONString(json);
    expect(result.success).toBe(true);
    expect(store.getState().activePlaylist?.name).toBe('Imported Session');
  });

  it('reports validation errors for malformed JSON string without breaking store', () => {
    const badJson = JSON.stringify({
      name: '',
      tracks: []
    });

    const result = store.importFromJSONString(badJson);
    expect(result.success).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('handles sleep timer countdown', () => {
    store.setSleepTimer(15);
    expect(store.getState().sleepTimerRemaining).toBe(15 * 60);

    store.setSleepTimer(null);
    expect(store.getState().sleepTimerRemaining).toBeNull();
  });

  it('generates shareable URL hash with encoded playlist', () => {
    store.loadPlaylist(samplePlaylist);
    const shareUrl = store.generateShareUrl();
    expect(shareUrl).toContain('#playlist=');
  });
});
