# Gemini Project Memories & Context

- **Project**: Tracklist — Static JSON & Link YouTube Playlist Web App.
- **Location**: `C:\Users\ismai\.gemini\antigravity\scratch\tracklist`
- **User**: Ismail (@smile-plzz)
- **GitHub**: https://github.com/smile-plzz
- **Vim Teaching**: Remember to teach practical Vim tips as we collaborate (navigation `h,j,k,l`, visual mode `v`/`V`, text objects `ci"`, `da{`, buffers, search `/`, substitution `:%s/find/replace/g`).
- **Core Architecture**:
  - Vanilla TypeScript + Vite + Vitest.
  - Zero-backend static build for Vercel.
  - Reactive pub/sub store (`src/store.ts`).
  - Persistent YouTube IFrame API wrapper (`src/player.ts`).
  - Safe versioned local storage engine (`src/storage.ts`).
  - Strict JSON schema validator (`src/schema.ts`).
  - Playlist Queue with stable Fisher-Yates shuffle and unplayable track skipping (`src/queue.ts`).
- **Test Suite**: 41 unit and end-to-end integration tests passing (`npm test`).
- **Build Output**: 62.16 KB JS bundle (`npm run build`).
