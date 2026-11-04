# Architecture & Design Decisions (DECISIONS.md)

This log documents key architectural choices, deviations, and design trade-offs made during development.

## Decision 1: Pure Vanilla TypeScript with Reactive State Store
- **Choice**: Built using vanilla TypeScript with a lightweight pub/sub store (`store.ts`) instead of a heavy framework like React.
- **Reason**: Zero runtime framework overhead, sub-second build times, tiny bundle size (62 KB total JS, well under the 200 KB target), completely static deployment to Vercel.

## Decision 2: YouTube Player Embedding Strategy & Compliant Docking
- **Choice**: Directly load `https://www.youtube.com/iframe_api` via a promise-cached loader with safety guards against duplicate script injection. Player iframe is hosted in a single persistent container (`#global-player-anchor` / `#yt-player-target`) and dynamically reparented across views without re-mounting.
- **Reason**: Comply with YouTube terms of service; ensure uninterrupted playback when navigating between Library, Playlist, Now Playing, and Focus Mode; access to accurate player events (`YT.PlayerState.ENDED`, `onError`).

## Decision 3: Shareable URL Hash Encoding
- **Choice**: Encode lightweight playlist payloads into standard URL hashes using Base64 URI encoding (`#playlist=...`).
- **Reason**: Enables zero-backend playlist sharing across devices and users without database hosting costs.

## Decision 4: Safe LocalStorage Persistence
- **Choice**: Wrapped all `localStorage` reads and writes in `try/catch` and tested against simulated `QuotaExceededError` and `SecurityError`.
- **Reason**: Guarantees the application never crashes in private browsing mode, restricted iframes, or environments where local storage is disabled.

## Decision 5: Stable Fisher-Yates Shuffle Algorithm
- **Choice**: Generated an unskewed index permutation preserving the active track at index 0 when shuffle is toggled on.
- **Reason**: Ensures navigating to the "Previous" track during shuffle mode reliably visits the previously heard song rather than randomly picking another track.
