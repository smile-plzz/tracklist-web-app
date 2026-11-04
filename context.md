# Context: Tracklist Architecture & Constraints

## Goals
- Provide a static, client-side web application ("Tracklist") that plays playlists defined in JSON or generated through URL pasting.
- Seamlessly advance between tracks using the official YouTube IFrame Player API.
- Support robust listener features: library management, drag-to-reorder, mini player, focus mode, shuffle, repeat, keyboard shortcuts, media session, share links, and sleep timer.
- Zero backend, zero OAuth, zero YouTube Data API keys required; respect all YouTube embedding policies.

## Technology Stack
- Language: TypeScript (strict mode)
- Bundler / Build Tool: Vite
- Architecture: Vanilla DOM with unidirectional state store & subscription pattern
- Styling: Modern CSS with custom properties, responsive design (375px mobile to 4K desktop), Apple HIG inspired aesthetic
- Testing: Vitest for schema, queue, and player store logic
- Persistence: Safe versioned localStorage with fallback for incognito/restricted environments

## Constraints & YouTube Embed Rules
- Do not hide or cover the YouTube player iframe; keep it at or above compliant minimum dimensions.
- Respect browser autoplay policies: require user initiation for unmuted playback.
- Gracefully handle blocked/unembeddable videos (error codes 2, 5, 100, 101, 150) without infinite retry loops.
- Static bundle size must remain lightweight (< 200 KB JS before external YouTube API script).
