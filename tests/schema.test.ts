import { describe, it, expect } from 'vitest';
import { validatePlaylist, type Playlist } from '../src/schema';

describe('validatePlaylist', () => {
  const validPlaylist: Playlist = {
    schema: 'tracklist/1',
    name: 'Top Hits',
    description: 'A great list of music',
    tracks: [
      {
        videoId: 'dQw4w9WgXcQ',
        title: 'Never Gonna Give You Up',
        artist: 'Rick Astley',
        start: 0,
        end: 212
      },
      {
        videoId: 'L_LUpnjgPso',
        title: 'Comfortably Numb',
        artist: 'Pink Floyd'
      }
    ]
  };

  it('validates a completely valid playlist', () => {
    const result = validatePlaylist(validPlaylist);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.validTracks).toHaveLength(2);
    expect(result.playlist?.name).toBe('Top Hits');
  });

  it('allows optional schema and defaults to tracklist/1', () => {
    const { schema: _, ...noSchema } = validPlaylist;
    const result = validatePlaylist(noSchema);
    expect(result.isValid).toBe(true);
    expect(result.playlist?.schema).toBe('tracklist/1');
  });

  it('rejects invalid schema format', () => {
    const bad = { ...validPlaylist, schema: 'invalid-schema/2' };
    const result = validatePlaylist(bad);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'schema')).toBe(true);
  });

  it('rejects missing or empty name', () => {
    const emptyName = { ...validPlaylist, name: '   ' };
    const result = validatePlaylist(emptyName);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'name')).toBe(true);
  });

  it('rejects name exceeding 100 characters', () => {
    const longName = { ...validPlaylist, name: 'a'.repeat(101) };
    const result = validatePlaylist(longName);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'name')).toBe(true);
  });

  it('rejects empty tracks array or non-array', () => {
    const emptyTracks = { ...validPlaylist, tracks: [] };
    const result = validatePlaylist(emptyTracks);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'tracks')).toBe(true);
  });

  it('rejects tracks exceeding 500 items', () => {
    const tooMany = {
      ...validPlaylist,
      tracks: Array.from({ length: 501 }, (_, i) => ({
        videoId: 'dQw4w9WgXcQ',
        title: `Track ${i}`
      }))
    };
    const result = validatePlaylist(tooMany);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.field === 'tracks')).toBe(true);
  });

  it('validates videoId format (must be 11 characters matching ^[A-Za-z0-9_-]{11}$)', () => {
    const badVideoId = {
      ...validPlaylist,
      tracks: [
        { videoId: 'too-short', title: 'Invalid' },
        { videoId: 'dQw4w9WgXcQ', title: 'Valid' }
      ]
    };
    const result = validatePlaylist(badVideoId);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.trackIndex === 0 && e.field === 'videoId')).toBe(true);
    // Should still identify valid tracks for partial recovery
    expect(result.validTracks).toHaveLength(1);
    expect(result.validTracks[0].videoId).toBe('dQw4w9WgXcQ');
  });

  it('rejects empty track titles', () => {
    const badTitle = {
      ...validPlaylist,
      tracks: [{ videoId: 'dQw4w9WgXcQ', title: '   ' }]
    };
    const result = validatePlaylist(badTitle);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.trackIndex === 0 && e.field === 'title')).toBe(true);
  });

  it('validates start and end time rules', () => {
    const badTimes = {
      ...validPlaylist,
      tracks: [
        { videoId: 'dQw4w9WgXcQ', title: 'Track 1', start: -5 },
        { videoId: 'L_LUpnjgPso', title: 'Track 2', start: 100, end: 50 },
        { videoId: 'fJ9rUzIMcZQ', title: 'Track 3', start: 10.5 }
      ]
    };
    const result = validatePlaylist(badTimes);
    expect(result.isValid).toBe(false);
    expect(result.errors.some(e => e.trackIndex === 0 && e.field === 'start')).toBe(true);
    expect(result.errors.some(e => e.trackIndex === 1 && e.field === 'end')).toBe(true);
    expect(result.errors.some(e => e.trackIndex === 2 && e.field === 'start')).toBe(true);
  });

  it('flags duplicate video IDs as warnings without failing validity', () => {
    const duplicates = {
      ...validPlaylist,
      tracks: [
        { videoId: 'dQw4w9WgXcQ', title: 'Track 1' },
        { videoId: 'dQw4w9WgXcQ', title: 'Track 2' }
      ]
    };
    const result = validatePlaylist(duplicates);
    expect(result.isValid).toBe(true);
    expect(result.warnings.some(w => w.includes('dQw4w9WgXcQ'))).toBe(true);
  });
});
