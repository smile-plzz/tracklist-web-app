import { describe, it, expect, beforeEach } from 'vitest';
import { PlaylistQueue } from '../src/queue';
import type { Track } from '../src/schema';

describe('PlaylistQueue', () => {
  const sampleTracks: Track[] = [
    { videoId: 'track_11111', title: 'Song 1', artist: 'Artist A' },
    { videoId: 'track_22222', title: 'Song 2', artist: 'Artist B' },
    { videoId: 'track_33333', title: 'Song 3', artist: 'Artist C' },
    { videoId: 'track_44444', title: 'Song 4', artist: 'Artist D' }
  ];

  let queue: PlaylistQueue;

  beforeEach(() => {
    queue = new PlaylistQueue(sampleTracks);
  });

  it('initializes with first track selected', () => {
    expect(queue.currentIndex).toBe(0);
    expect(queue.currentTrack?.title).toBe('Song 1');
  });

  it('navigates next and previous sequentially', () => {
    const nextTrack = queue.next();
    expect(nextTrack?.title).toBe('Song 2');
    expect(queue.currentIndex).toBe(1);

    const prevTrack = queue.previous();
    expect(prevTrack?.title).toBe('Song 1');
    expect(queue.currentIndex).toBe(0);
  });

  it('handles repeat modes: off, all, one', () => {
    // Jump to last track
    queue.jumpTo(3);
    expect(queue.currentIndex).toBe(3);

    // Repeat 'off' (default) -> next at end returns null
    queue.setRepeatMode('off');
    expect(queue.next()).toBeNull();
    expect(queue.currentIndex).toBe(3);

    // Repeat 'all' -> loops back to 0
    queue.setRepeatMode('all');
    expect(queue.next()?.title).toBe('Song 1');
    expect(queue.currentIndex).toBe(0);

    // Repeat 'one' -> stays on current track
    queue.setRepeatMode('one');
    expect(queue.next()?.title).toBe('Song 1');
    expect(queue.currentIndex).toBe(0);
  });

  it('maintains a stable shuffle order so previous track works correctly', () => {
    queue.setShuffle(true);
    expect(queue.isShuffled).toBe(true);

    const firstTrackInShuffle = queue.currentTrack;
    expect(firstTrackInShuffle).toBeDefined();

    const secondTrack = queue.next();
    expect(secondTrack).toBeDefined();

    // Previous must return back to the first track in shuffle order
    const backTrack = queue.previous();
    expect(backTrack?.videoId).toBe(firstTrackInShuffle?.videoId);

    // Disabling shuffle restores original index tracking
    queue.setShuffle(false);
    expect(queue.isShuffled).toBe(false);
  });

  it('supports unplayable track marking and auto-skipping', () => {
    queue.markUnplayable('track_22222');
    expect(queue.isUnplayable('track_22222')).toBe(true);

    // Advancing from track 1 should automatically skip unplayable track 2 and land on track 3
    const nextPlayable = queue.next();
    expect(nextPlayable?.videoId).toBe('track_33333');
    expect(queue.currentIndex).toBe(2);
  });

  it('supports reordering tracks (drag and drop simulation)', () => {
    // Move track at index 3 (Song 4) to index 1
    queue.reorder(3, 1);
    const titles = queue.tracks.map(t => t.title);
    expect(titles).toEqual(['Song 1', 'Song 4', 'Song 2', 'Song 3']);
  });

  it('supports manual Up Next queue taking priority', () => {
    const bonusTrack: Track = { videoId: 'track_99999', title: 'Bonus Song' };
    queue.addToUpNext(bonusTrack);

    expect(queue.upNextQueue).toHaveLength(1);
    const nextTrack = queue.next();
    expect(nextTrack?.videoId).toBe('track_99999');
    expect(queue.upNextQueue).toHaveLength(0);

    // Next track after manual queue returns back to sequence
    const regularNext = queue.next();
    expect(regularNext?.videoId).toBe('track_22222');
  });
});

