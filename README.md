# Tracklist — JSON YouTube Playlist Player

Tracklist is a fast, minimalist, zero-backend static web application that turns any JSON playlist or raw list of YouTube links into a continuous, auto-advancing audio-visual player using YouTube's official embedded IFrame Player API.

Designed in the spirit of Apple Music and Apple's Human Interface Guidelines: content-first, neutral surfaces, refined typography, and responsive audio-visual playback.

---

## Key Highlights

- **Zero Backend & Zero API Keys**: Runs 100% in the browser. Fully adheres to YouTube's embedding terms.
- **Auto-Advance & Error Recovery**: Automatically moves to the next track on track end; detects unplayable/blocked videos (error codes 2, 5, 100, 101, 150), marks them, and skips ahead smoothly without halting playback.
- **Smart Queue & Stable Shuffle**: Shuffle uses an unskewed Fisher-Yates permutation preserving current track index so the "Previous" button walks backward correctly.
- **Library & Multi-Playlist Management**: Create, rename, duplicate, reorder, and delete playlists stored safely in versioned `localStorage`.
- **Drag-to-Reorder & Keyboard Accessibility**: Drag handles with smooth pointer events and accessible Move Up/Down buttons.
- **Mini Player & Focus Mode**: Persistent translucent bottom mini-player bar, plus an immersive, distraction-free fullscreen Focus Mode with auto-fading controls after 3 seconds of inactivity.
- **Zero-Backend Link Sharing**: Encodes playlists into URL hash fragments (`#playlist=...`) allowing instant sharing without a database.
- **Media Session API**: Full lock screen and hardware media key integration (track title, artist, YouTube thumbnails, and scrubber synchronization).
- **PWA & Offline Shell**: Installable progressive web application with service worker caching for instant loading.

---

## Keyboard Shortcuts

| Shortcut | Action |
| --- | --- |
| `Space` | Toggle Play / Pause |
| `N` | Next Track |
| `P` | Previous Track |
| `→` (Right Arrow) | Seek forward 5 seconds |
| `←` (Left Arrow) | Seek backward 5 seconds |
| `F` | Toggle Focus Mode |
| `M` | Toggle Mute |
| `Esc` | Exit Focus Mode / Close Modal |

---

## JSON Schema (`tracklist/1`)

```json
{
  "schema": "tracklist/1",
  "name": "Live Acoustic & Studio Sessions",
  "description": "Essential acoustic and unreleased live cuts",
  "tracks": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up (Live)",
      "artist": "Rick Astley",
      "start": 0,
      "end": 212
    }
  ]
}
```

### Schema Rules

- `schema`: Optional string. Defaults to `"tracklist/1"`. Must start with `"tracklist/"`.
- `name`: Required non-empty string, 1 to 100 characters.
- `tracks`: Required array of 1 to 500 track items.
- `tracks[].videoId`: Required exact 11-character YouTube video ID (`^[A-Za-z0-9_-]{11}$`).
- `tracks[].title`: Required non-empty string.
- `tracks[].artist`: Optional string.
- `tracks[].start`, `tracks[].end`: Optional non-negative integer seconds (`end > start`).

---

## AI Assistant Prompt Template

To have an AI assistant (like Gemini, ChatGPT, or Claude) generate a compatible playlist, use this prompt:

```text
Create a curated music playlist in Tracklist JSON schema format ("tracklist/1").
Requirements:
1. Theme / Mood: [Describe your theme or genre here]
2. Provide valid, real 11-character YouTube video IDs.
3. Output strictly valid JSON matching this structure:
{
  "schema": "tracklist/1",
  "name": "Playlist Title",
  "description": "Short description of the vibe",
  "tracks": [
    {
      "videoId": "11_CHAR_ID",
      "title": "Artist - Song Title (Version)",
      "artist": "Artist Name"
    }
  ]
}
```

---

## Development & Testing

```bash
# Install dependencies
npm install

# Start Vite local development server
npm run dev

# Run unit and integration tests (Vitest)
npm test

# Production build (TypeScript check + Vite bundler)
npm run build
```

---

## Deployment to Vercel

Tracklist builds directly into static HTML, CSS, and JS.

1. Push your repository to GitHub.
2. In Vercel, select **Add New Project** and import your repository.
3. Framework Preset: **Vite** (Build Command: `npm run build`, Output Directory: `dist`).
4. Click **Deploy**.

---

## 💡 Vim Tip of the Day

When editing JSON playlists or TypeScript files in Vim/Neovim:
- To quickly change anything inside quotes without retyping quotes: use **`ci"`** (*change inside quotes*).
- To delete an entire object or track dictionary inside braces: use **`da{`** (*delete around curly braces*).
- To duplicate a track block: select it with **`V`** (visual line mode), hit **`y`** to yank, and **`p`** to paste!
