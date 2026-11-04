import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveAppState,
  loadAppState,
  extractYouTubeVideoId,
  parseLinksOrIdsToTracks,
  type AppPersistedState
} from '../src/storage';

describe('Storage & URL Parsing', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('extractYouTubeVideoId', () => {
    it('extracts ID from standard watch URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
      expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from youtu.be short URL', () => {
      expect(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?si=abcdef')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from shorts URL', () => {
      expect(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('extracts ID from music.youtube.com URL', () => {
      expect(extractYouTubeVideoId('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('accepts raw 11-character video IDs directly', () => {
      expect(extractYouTubeVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('returns null for invalid strings', () => {
      expect(extractYouTubeVideoId('not_an_id')).toBeNull();
      expect(extractYouTubeVideoId('https://google.com')).toBeNull();
      expect(extractYouTubeVideoId('https://youtube.com/')).toBeNull();
    });
  });

  describe('parseLinksOrIdsToTracks', () => {
    it('parses multiple links / IDs across lines into Track items', () => {
      const multiline = `
        https://youtu.be/dQw4w9WgXcQ
        dQw4w9WgXcQ - Optional Title
        https://www.youtube.com/watch?v=fJ9rUzIMcZQ
      `;
      const tracks = parseLinksOrIdsToTracks(multiline);
      expect(tracks).toHaveLength(3);
      expect(tracks[0].videoId).toBe('dQw4w9WgXcQ');
      expect(tracks[1].videoId).toBe('dQw4w9WgXcQ');
      expect(tracks[1].title).toBe('Optional Title');
      expect(tracks[2].videoId).toBe('fJ9rUzIMcZQ');
    });
  });

  describe('Safe LocalStorage Persistence', () => {
    const mockState: AppPersistedState = {
      version: 1,
      playlists: [
        {
          schema: 'tracklist/1',
          id: 'pl-1',
          name: 'My Playlist',
          tracks: [{ videoId: 'dQw4w9WgXcQ', title: 'Rick Roll' }]
        }
      ],
      activePlaylistId: 'pl-1',
      activeTrackIndex: 0,
      theme: 'dark',
      repeatMode: 'all',
      isShuffled: false,
      volume: 80
    };

    it('saves and restores app state cleanly', () => {
      saveAppState(mockState);
      const restored = loadAppState();
      expect(restored).not.toBeNull();
      expect(restored?.playlists).toHaveLength(1);
      expect(restored?.activePlaylistId).toBe('pl-1');
      expect(restored?.theme).toBe('dark');
    });

    it('handles localStorage errors gracefully without throwing', () => {
      // Mock setItem throwing quota error
      vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      expect(() => saveAppState(mockState)).not.toThrow();

      // Mock getItem throwing error
      vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => {
        throw new Error('SecurityError: access denied');
      });

      const loaded = loadAppState();
      expect(loaded).toBeNull();
    });
  });
});
