import type { Playlist, Track } from './schema';
import type { RepeatMode } from './queue';

export interface AppPersistedState {
  version: number;
  playlists: Playlist[];
  activePlaylistId: string | null;
  activeTrackIndex: number;
  theme: 'system' | 'dark' | 'light';
  repeatMode: RepeatMode;
  isShuffled: boolean;
  volume: number;
}

const STORAGE_KEY = 'tracklist_v1_store';
const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export function extractYouTubeVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();

  // If already a clean 11-character video ID
  if (VIDEO_ID_REGEX.test(trimmed)) {
    return trimmed;
  }

  // Handle various YouTube URL patterns
  // 1. https://youtu.be/ID
  // 2. https://(www|music).youtube.com/watch?v=ID
  // 3. https://www.youtube.com/shorts/ID
  // 4. https://www.youtube.com/embed/ID
  try {
    const urlObj = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);

    if (urlObj.hostname === 'youtu.be') {
      const pathname = urlObj.pathname.slice(1);
      const id = pathname.split('/')[0]?.split('?')[0];
      return id && VIDEO_ID_REGEX.test(id) ? id : null;
    }

    if (urlObj.hostname.includes('youtube.com')) {
      // Check query param v
      const v = urlObj.searchParams.get('v');
      if (v && VIDEO_ID_REGEX.test(v)) {
        return v;
      }

      // Check pathname (e.g., /shorts/ID or /embed/ID)
      const parts = urlObj.pathname.split('/').filter(Boolean);
      if (parts.length >= 2 && (parts[0] === 'shorts' || parts[0] === 'embed')) {
        const id = parts[1];
        return id && VIDEO_ID_REGEX.test(id) ? id : null;
      }
    }
  } catch {
    // Not a valid URL, check if regex can find an embedded 11-char ID
  }

  const urlMatch = /(?:v=|\/embed\/|\/shorts\/|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(trimmed);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  return null;
}

export function parseLinksOrIdsToTracks(rawInput: string): Track[] {
  const lines = rawInput.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const tracks: Track[] = [];

  for (const line of lines) {
    // Check if line contains title information separated by " - " or "\t"
    let idCandidate = line;
    let titleCandidate = '';

    const hyphenSplit = line.split(/\s+-\s+/);
    if (hyphenSplit.length > 1) {
      idCandidate = hyphenSplit[0].trim();
      titleCandidate = hyphenSplit.slice(1).join(' - ').trim();
    }

    const videoId = extractYouTubeVideoId(idCandidate);
    if (videoId) {
      tracks.push({
        videoId,
        title: titleCandidate || `Track ${videoId}`,
        start: 0
      });
    }
  }

  return tracks;
}

export function loadAppState(): AppPersistedState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as AppPersistedState;
    if (parsed && parsed.version === 1 && Array.isArray(parsed.playlists)) {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('Unable to load Tracklist state from localStorage:', err);
    return null;
  }
}

export function saveAppState(state: AppPersistedState): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Unable to save Tracklist state to localStorage:', err);
  }
}

export function clearAppState(): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Unable to clear Tracklist state:', err);
  }
}

export function exportPlaylistAsJson(playlist: Playlist): void {
  const cleanPlaylist = {
    schema: playlist.schema || 'tracklist/1',
    name: playlist.name,
    ...(playlist.description ? { description: playlist.description } : {}),
    tracks: playlist.tracks.map(t => ({
      videoId: t.videoId,
      title: t.title,
      ...(t.artist ? { artist: t.artist } : {}),
      ...(typeof t.start === 'number' ? { start: t.start } : {}),
      ...(typeof t.end === 'number' ? { end: t.end } : {})
    }))
  };

  const jsonString = JSON.stringify(cleanPlaylist, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${playlist.name.replace(/[^a-z0-9_-]/gi, '_').toLowerCase()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

