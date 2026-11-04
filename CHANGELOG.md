# Changelog

All notable changes to the Tracklist project are documented in this file.

## [1.0.0] - 2026-11-04

### Added
- **Core Architecture & Schema**:
  - `tracklist/1` JSON schema validation with line/field reporting and partial valid track recovery.
  - Playlist Queue engine with stable Fisher-Yates shuffle order, multi-mode repeat ('off' | 'all' | 'one'), and manual Up Next priority queue.
- **YouTube Playback Integration**:
  - Compliant YouTube IFrame Player API integration with error handling for codes 2, 5, 100, 101, 150.
  - Auto-advance on track end and seamless unplayable track skipping.
  - Media Session API support with lock screen metadata and hardware key bindings.
- **User Interface & Design**:
  - Apple Music / HIG inspired design system with light/dark theme support.
  - Library view with multi-playlist CRUD and card grids.
  - Playlist view with drag-and-drop reordering, keyboard accessibility, and direct YouTube link/ID input.
  - Now Playing view with responsive 16:9 player, interactive scrubber, and sleep timer.
  - Persistent bottom mini-player with progress indicator.
  - Distraction-free Focus Mode with 3-second inactivity auto-fading controls.
- **Sharing & Portability**:
  - Zero-backend URL hash sharing (`#playlist=...`).
  - PWA support with manifest and offline app shell caching service worker.
  - Copyable AI assistant prompt template.
- **Verification**:
  - 41 unit and end-to-end integration tests passing via Vitest.
  - Production build producing 62.16 KB JS (<200 KB target).
