import type { Track } from './schema';

export type RepeatMode = 'off' | 'all' | 'one';

export class PlaylistQueue {
  private _tracks: Track[];
  private _currentIndex: number;
  private _repeatMode: RepeatMode = 'off';
  private _isShuffled: boolean = false;
  private _shuffleOrder: number[] = [];
  private _shufflePosition: number = 0;
  private _upNextQueue: Track[] = [];
  private _unplayableIds: Set<string> = new Set();

  constructor(tracks: Track[] = [], startIndex: number = 0) {
    this._tracks = [...tracks];
    this._currentIndex = tracks.length > 0 ? Math.max(0, Math.min(startIndex, tracks.length - 1)) : 0;
  }

  get tracks(): Track[] {
    return [...this._tracks];
  }

  get currentIndex(): number {
    return this._currentIndex;
  }

  get currentTrack(): Track | null {
    if (this._tracks.length === 0 || this._currentIndex < 0 || this._currentIndex >= this._tracks.length) {
      return null;
    }
    return this._tracks[this._currentIndex];
  }

  get repeatMode(): RepeatMode {
    return this._repeatMode;
  }

  get isShuffled(): boolean {
    return this._isShuffled;
  }

  get upNextQueue(): Track[] {
    return [...this._upNextQueue];
  }

  get unplayableIds(): Set<string> {
    return new Set(this._unplayableIds);
  }

  setRepeatMode(mode: RepeatMode): void {
    this._repeatMode = mode;
  }

  setShuffle(enabled: boolean): void {
    if (this._isShuffled === enabled) return;
    this._isShuffled = enabled;

    if (enabled && this._tracks.length > 0) {
      this.generateShuffleOrder();
    } else {
      this._shuffleOrder = [];
      this._shufflePosition = 0;
    }
  }

  private generateShuffleOrder(): void {
    const n = this._tracks.length;
    const indices = Array.from({ length: n }, (_, i) => i);

    // Keep current track at position 0 so playback doesn't jump abruptly
    const curr = this._currentIndex;
    const remaining = indices.filter(i => i !== curr);

    // Fisher-Yates shuffle on remaining
    for (let i = remaining.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
    }

    this._shuffleOrder = [curr, ...remaining];
    this._shufflePosition = 0;
  }

  jumpTo(index: number): Track | null {
    if (index < 0 || index >= this._tracks.length) return null;
    this._currentIndex = index;

    if (this._isShuffled) {
      const pos = this._shuffleOrder.indexOf(index);
      if (pos !== -1) {
        this._shufflePosition = pos;
      } else {
        this.generateShuffleOrder();
      }
    }

    return this.currentTrack;
  }

  next(): Track | null {
    // 1. Check if there's a manually queued Up Next track
    if (this._upNextQueue.length > 0) {
      const queued = this._upNextQueue.shift()!;
      // Find or insert into tracks if not present, or return as transient
      return queued;
    }

    if (this._tracks.length === 0) return null;

    // 2. Repeat one mode
    if (this._repeatMode === 'one') {
      return this.currentTrack;
    }

    // 3. Shuffled traversal
    if (this._isShuffled) {
      let attempts = 0;
      let nextPos = this._shufflePosition;

      while (attempts < this._shuffleOrder.length) {
        nextPos++;
        attempts++;

        if (nextPos >= this._shuffleOrder.length) {
          if (this._repeatMode === 'all') {
            nextPos = 0;
          } else {
            return null; // reached end of shuffle
          }
        }

        const candidateIdx = this._shuffleOrder[nextPos];
        const candidateTrack = this._tracks[candidateIdx];

        if (candidateTrack && !this._unplayableIds.has(candidateTrack.videoId)) {
          this._shufflePosition = nextPos;
          this._currentIndex = candidateIdx;
          return candidateTrack;
        }
      }

      return null;
    }

    // 4. Sequential traversal
    let candidateIndex = this._currentIndex;
    let attempts = 0;

    while (attempts < this._tracks.length) {
      candidateIndex++;
      attempts++;

      if (candidateIndex >= this._tracks.length) {
        if (this._repeatMode === 'all') {
          candidateIndex = 0;
        } else {
          return null; // end of playlist
        }
      }

      const candidate = this._tracks[candidateIndex];
      if (candidate && !this._unplayableIds.has(candidate.videoId)) {
        this._currentIndex = candidateIndex;
        return candidate;
      }
    }

    return null;
  }

  previous(): Track | null {
    if (this._tracks.length === 0) return null;

    if (this._repeatMode === 'one') {
      return this.currentTrack;
    }

    if (this._isShuffled) {
      let attempts = 0;
      let prevPos = this._shufflePosition;

      while (attempts < this._shuffleOrder.length) {
        prevPos--;
        attempts++;

        if (prevPos < 0) {
          if (this._repeatMode === 'all') {
            prevPos = this._shuffleOrder.length - 1;
          } else {
            prevPos = 0;
            break;
          }
        }

        const candidateIdx = this._shuffleOrder[prevPos];
        const candidateTrack = this._tracks[candidateIdx];

        if (candidateTrack && !this._unplayableIds.has(candidateTrack.videoId)) {
          this._shufflePosition = prevPos;
          this._currentIndex = candidateIdx;
          return candidateTrack;
        }
      }

      return this.currentTrack;
    }

    // Sequential previous
    let candidateIndex = this._currentIndex;
    let attempts = 0;

    while (attempts < this._tracks.length) {
      candidateIndex--;
      attempts++;

      if (candidateIndex < 0) {
        if (this._repeatMode === 'all') {
          candidateIndex = this._tracks.length - 1;
        } else {
          candidateIndex = 0;
          break;
        }
      }

      const candidate = this._tracks[candidateIndex];
      if (candidate && !this._unplayableIds.has(candidate.videoId)) {
        this._currentIndex = candidateIndex;
        return candidate;
      }
    }

    return this.currentTrack;
  }

  markUnplayable(videoId: string): void {
    this._unplayableIds.add(videoId);
  }

  isUnplayable(videoId: string): boolean {
    return this._unplayableIds.has(videoId);
  }

  reorder(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 ||
      fromIndex >= this._tracks.length ||
      toIndex < 0 ||
      toIndex >= this._tracks.length ||
      fromIndex === toIndex
    ) {
      return;
    }

    const currentTrackRef = this.currentTrack;
    const [moved] = this._tracks.splice(fromIndex, 1);
    this._tracks.splice(toIndex, 0, moved);

    // Maintain current track selection
    if (currentTrackRef) {
      this._currentIndex = this._tracks.indexOf(currentTrackRef);
    }

    if (this._isShuffled) {
      this.generateShuffleOrder();
    }
  }

  addToUpNext(track: Track): void {
    this._upNextQueue.push(track);
  }

  removeTrack(index: number): Track | null {
    if (index < 0 || index >= this._tracks.length) return null;

    const [removed] = this._tracks.splice(index, 1);

    if (this._currentIndex >= this._tracks.length) {
      this._currentIndex = Math.max(0, this._tracks.length - 1);
    } else if (index < this._currentIndex) {
      this._currentIndex--;
    }

    if (this._isShuffled) {
      this.generateShuffleOrder();
    }

    return removed;
  }

  setTracks(tracks: Track[], startIndex: number = 0): void {
    this._tracks = [...tracks];
    this._currentIndex = tracks.length > 0 ? Math.max(0, Math.min(startIndex, tracks.length - 1)) : 0;
    this._unplayableIds.clear();
    this._upNextQueue = [];

    if (this._isShuffled) {
      this.generateShuffleOrder();
    }
  }
}
