export interface Track {
  videoId: string;
  title: string;
  artist?: string;
  start?: number;
  end?: number | null;
}

export interface Playlist {
  schema?: string;
  id?: string;
  name: string;
  description?: string;
  tracks: Track[];
  coverColor?: string;
  updatedAt?: number;
}

export interface ValidationError {
  trackIndex?: number;
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: string[];
  validTracks: Track[];
  playlist: Playlist | null;
}

const VIDEO_ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export function validatePlaylist(input: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: string[] = [];
  const validTracks: Track[] = [];

  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {
      isValid: false,
      errors: [{ field: 'root', message: 'Playlist payload must be a JSON object.' }],
      warnings: [],
      validTracks: [],
      playlist: null
    };
  }

  const raw = input as Record<string, unknown>;

  // 1. Schema check
  let schema = 'tracklist/1';
  if (raw.schema !== undefined) {
    if (typeof raw.schema !== 'string' || !raw.schema.startsWith('tracklist/')) {
      errors.push({
        field: 'schema',
        message: 'Schema must start with "tracklist/" (e.g. "tracklist/1").'
      });
    } else {
      schema = raw.schema;
    }
  }

  // 2. Name check
  let name = '';
  if (typeof raw.name !== 'string') {
    errors.push({ field: 'name', message: 'Playlist name is required and must be a string.' });
  } else {
    name = raw.name.trim();
    if (name.length === 0 || name.length > 100) {
      errors.push({
        field: 'name',
        message: 'Playlist name must be between 1 and 100 characters.'
      });
    }
  }

  // 3. Description check (optional)
  let description: string | undefined;
  if (raw.description !== undefined) {
    if (typeof raw.description === 'string') {
      description = raw.description.trim();
    } else {
      warnings.push('Ignoring non-string description field.');
    }
  }

  // 4. Tracks array check
  if (!Array.isArray(raw.tracks)) {
    errors.push({ field: 'tracks', message: 'Tracks must be an array of 1 to 500 items.' });
  } else {
    if (raw.tracks.length === 0 || raw.tracks.length > 500) {
      errors.push({
        field: 'tracks',
        message: `Track count (${raw.tracks.length}) must be between 1 and 500 items.`
      });
    }

    const seenVideoIds = new Set<string>();

    raw.tracks.forEach((item: unknown, index: number) => {
      let isTrackValid = true;

      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        errors.push({
          trackIndex: index,
          field: `tracks[${index}]`,
          message: `Track ${index + 1} must be an object.`
        });
        return;
      }

      const t = item as Record<string, unknown>;

      // videoId check
      let videoId = '';
      if (typeof t.videoId !== 'string' || !VIDEO_ID_REGEX.test(t.videoId)) {
        errors.push({
          trackIndex: index,
          field: 'videoId',
          message: `Track ${index + 1}: videoId must be exactly 11 valid characters (A-Z, a-z, 0-9, _, -).`
        });
        isTrackValid = false;
      } else {
        videoId = t.videoId;
        if (seenVideoIds.has(videoId)) {
          warnings.push(`Track ${index + 1} has duplicate videoId: "${videoId}".`);
        } else {
          seenVideoIds.add(videoId);
        }
      }

      // title check
      let title = '';
      if (typeof t.title !== 'string' || t.title.trim().length === 0) {
        errors.push({
          trackIndex: index,
          field: 'title',
          message: `Track ${index + 1}: title must be a non-empty string.`
        });
        isTrackValid = false;
      } else {
        title = t.title.trim();
      }

      // artist check (optional)
      let artist: string | undefined;
      if (t.artist !== undefined) {
        if (typeof t.artist === 'string') {
          artist = t.artist.trim();
        } else {
          warnings.push(`Track ${index + 1}: non-string artist ignored.`);
        }
      }

      // start & end checks
      let start: number | undefined;
      if (t.start !== undefined && t.start !== null) {
        if (typeof t.start !== 'number' || !Number.isInteger(t.start) || t.start < 0) {
          errors.push({
            trackIndex: index,
            field: 'start',
            message: `Track ${index + 1}: start must be an integer >= 0.`
          });
          isTrackValid = false;
        } else {
          start = t.start;
        }
      }

      let end: number | null | undefined;
      if (t.end !== undefined && t.end !== null) {
        if (typeof t.end !== 'number' || !Number.isInteger(t.end) || t.end < 0) {
          errors.push({
            trackIndex: index,
            field: 'end',
            message: `Track ${index + 1}: end must be an integer >= 0.`
          });
          isTrackValid = false;
        } else if (start !== undefined && t.end <= start) {
          errors.push({
            trackIndex: index,
            field: 'end',
            message: `Track ${index + 1}: end (${t.end}s) must be greater than start (${start}s).`
          });
          isTrackValid = false;
        } else {
          end = t.end;
        }
      }

      if (isTrackValid) {
        validTracks.push({
          videoId,
          title,
          ...(artist ? { artist } : {}),
          ...(start !== undefined ? { start } : {}),
          ...(end !== undefined ? { end } : {})
        });
      }
    });
  }

  const isValid = errors.length === 0;

  const playlist: Playlist | null = isValid
    ? {
        schema,
        id: typeof raw.id === 'string' ? raw.id : undefined,
        name,
        ...(description ? { description } : {}),
        tracks: validTracks,
        coverColor: typeof raw.coverColor === 'string' ? raw.coverColor : undefined,
        updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now()
      }
    : null;

  return {
    isValid,
    errors,
    warnings,
    validTracks,
    playlist
  };
}

