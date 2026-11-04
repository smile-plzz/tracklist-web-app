# Architecture & Design Decisions (DECISIONS.md)

This log documents key architectural choices, deviations, or trade-offs made during development.

## Decision 1: Pure Vanilla TypeScript with Reactive State Store
- **Choice**: Implemented vanilla TypeScript with a lightweight pub/sub store (`store.ts`) instead of a heavy framework like React.
- **Reason**: Zero runtime framework overhead, sub-second build times, tiny bundle size (<200KB target), completely static deployment to Vercel.

## Decision 2: YouTube Player Embedding Strategy
- **Choice**: Directly load `https://www.youtube.com/iframe_api` via a promise-cached loader with safety guards against multiple script injection.
- **Reason**: Comply with YouTube terms of service; no OAuth required; access to accurate player events (`YT.PlayerState.ENDED`, `onError`).

## Decision 3: Shareable URL Hash Encoding
- **Choice**: Encode lightweight playlist payloads into standard URL hashes using base64 with URI escaping or JSON stringification.
- **Reason**: Enables zero-backend playlist sharing across devices and users without database hosting costs.
