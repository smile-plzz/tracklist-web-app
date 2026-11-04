# Tracklist

A clean, modern, zero-backend static web app that plays curated YouTube playlists loaded from JSON or link input. Built with vanilla TypeScript, Vite, and the official YouTube IFrame Player API.

Designed in the spirit of Apple Music and Apple's Human Interface Guidelines: content-first, neutral surfaces, refined typography, and responsive audio-visual playback.

## Features

- **Listener-first Experience**:
  - One-tap resume from local storage.
  - Interactive Library with multiple playlists.
  - Playlist creation, direct YouTube URL/ID pasting, and drag-and-drop JSON import.
  - Drag-and-drop track reordering with keyboard accessibility.
  - Mini player bar, Now Playing sheet, and immersive Focus Mode (auto-fading controls).
  - Stable shuffle and multi-mode repeat (off / all / one).
  - Media Session API integration (lock screen & hardware controls).
  - URL hash sharing (share playlists directly with zero backend).
  - Sleep timer & customizable themes (System / Dark / Light).
- **Compliant & Private**:
  - Zero server, zero YouTube API keys required.
  - Uses YouTube's official embedded player without breaking embed rules.
  - Auto-skips blocked or unplayable videos gracefully without halting playback.

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm or pnpm

### Setup

```bash
# Navigate to directory
cd tracklist

# Install dependencies
npm install

# Start development server
npm run dev

# Run unit and integration tests
npm test

# Build for production
npm run build
```

## JSON Schema

Playlists adhere to the `tracklist/1` schema:

```json
{
  "schema": "tracklist/1",
  "name": "Live Acoustic Sessions",
  "description": "Intimate live sets and unreleased studio acoustic takes",
  "tracks": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "Rick Astley - Never Gonna Give You Up (Pianoforte)",
      "artist": "Rick Astley"
    }
  ]
}
```

## Deployment

Deploy directly to Vercel, Netlify, or GitHub Pages as a static site:
- Build command: `npm run build`
- Output directory: `dist`
