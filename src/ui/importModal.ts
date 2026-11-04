import { appStore } from '../store';
import { validatePlaylist, type ValidationError } from '../schema';
import { showToast } from './header';

const SAMPLE_ROCK_SESSION = {
  schema: 'tracklist/1',
  name: 'Legendary Rock & Acoustic Sessions',
  description: 'Essential live rock sessions and performances',
  tracks: [
    {
      videoId: 'fJ9rUzIMcZQ',
      title: 'Queen - Bohemian Rhapsody (Live Aid 1985)',
      artist: 'Queen',
      start: 0
    },
    {
      videoId: 'L_LUpnjgPso',
      title: 'Pink Floyd - Comfortably Numb (Pulse 1994)',
      artist: 'Pink Floyd'
    },
    {
      videoId: 'dQw4w9WgXcQ',
      title: 'Rick Astley - Never Gonna Give You Up',
      artist: 'Rick Astley'
    }
  ]
};

export function renderImportModal(container: HTMLElement, onClose: () => void): void {
  container.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-card" id="modal-card">
        <div class="modal-header">
          <h2 class="modal-title">Import Playlist JSON</h2>
          <button class="icon-btn" id="btn-close-modal" title="Close">✕</button>
        </div>

        <div class="dropzone" id="file-dropzone">
          <input type="file" id="file-input" accept=".json,application/json" style="display: none;" />
          <div style="font-size: 2rem; margin-bottom: 8px;">📄</div>
          <div style="font-weight: 600; margin-bottom: 4px;">Drag and drop a .json file here</div>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 12px;">or click to browse your files</div>
          <button class="btn-secondary" id="btn-browse-file" type="button">Select JSON File</button>
        </div>

        <div style="text-align: center; color: var(--text-muted); font-size: 0.85rem; margin: -4px 0;">— OR PASTE JSON —</div>

        <div>
          <textarea id="import-json-textarea" rows="6" style="width: 100%; font-family: var(--font-mono); font-size: 0.82rem;" placeholder='{\n  "schema": "tracklist/1",\n  "name": "My Custom Session",\n  "tracks": [\n    { "videoId": "dQw4w9WgXcQ", "title": "Artist - Song" }\n  ]\n}'></textarea>
        </div>

        <!-- Error & Warning Container -->
        <div id="modal-errors-container" style="display: none;">
          <div class="error-banner" style="margin-bottom: 8px;">
            <div style="font-weight: 600; margin-bottom: 4px;" id="error-summary">Schema Validation Failed</div>
            <ul class="error-list" id="modal-error-list"></ul>
          </div>
          <div id="partial-recovery-container" style="display: none; justify-content: flex-end;">
            <button class="btn-secondary" id="btn-load-valid-tracks" style="font-size: 0.85rem; color: var(--accent);">
              Load Only Valid Tracks (<span id="valid-count">0</span>)
            </button>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary" id="btn-load-sample" type="button">
              ⚡ Sample Session
            </button>
            <button class="btn-secondary" id="btn-copy-prompt" type="button" title="Copy AI prompt template to give to ChatGPT, Claude, or Gemini">
              🤖 Copy AI Prompt
            </button>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary" id="btn-cancel-modal">Cancel</button>
            <button class="btn-primary" id="btn-confirm-import">Load Playlist</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const backdrop = container.querySelector('#modal-backdrop');
  const closeBtn = container.querySelector('#btn-close-modal');
  const cancelBtn = container.querySelector('#btn-cancel-modal');
  const confirmBtn = container.querySelector('#btn-confirm-import');
  const sampleBtn = container.querySelector('#btn-load-sample');
  const copyPromptBtn = container.querySelector('#btn-copy-prompt');
  const textarea = container.querySelector('#import-json-textarea') as HTMLTextAreaElement;

  const dropzone = container.querySelector('#file-dropzone') as HTMLElement;
  const fileInput = container.querySelector('#file-input') as HTMLInputElement;
  const browseBtn = container.querySelector('#btn-browse-file');

  const errorsContainer = container.querySelector('#modal-errors-container') as HTMLElement;
  const errorSummary = container.querySelector('#error-summary') as HTMLElement;
  const errorList = container.querySelector('#modal-error-list') as HTMLUListElement;
  const partialRecovery = container.querySelector('#partial-recovery-container') as HTMLElement;
  const validCountSpan = container.querySelector('#valid-count') as HTMLElement;
  const loadValidBtn = container.querySelector('#btn-load-valid-tracks');

  let currentRawJson = '';

  function displayValidationErrors(errors: ValidationError[], validCount: number): void {
    errorsContainer.style.display = 'block';
    errorSummary.textContent = `Found ${errors.length} validation issue${errors.length === 1 ? '' : 's'}:`;
    errorList.innerHTML = '';

    errors.forEach(err => {
      const li = document.createElement('li');
      li.textContent = err.trackIndex !== undefined ? `[Track ${err.trackIndex + 1}] ${err.message}` : err.message;
      errorList.appendChild(li);
    });

    if (validCount > 0) {
      partialRecovery.style.display = 'flex';
      validCountSpan.textContent = validCount.toString();
    } else {
      partialRecovery.style.display = 'none';
    }
  }

  function handleProcessText(text: string): void {
    currentRawJson = text;
    textarea.value = text;

    try {
      const parsed = JSON.parse(text);
      const res = validatePlaylist(parsed);

      if (res.isValid && res.playlist) {
        errorsContainer.style.display = 'none';
        appStore.loadPlaylist(res.playlist, true);
        appStore.setView('playlist');
        showToast(`Loaded "${res.playlist.name}" with ${res.playlist.tracks.length} tracks!`);
        onClose();
      } else {
        displayValidationErrors(res.errors, res.validTracks.length);
      }
    } catch (e: any) {
      displayValidationErrors([{ field: 'syntax', message: `Invalid JSON syntax: ${e.message}` }], 0);
    }
  }

  // Dismiss listeners
  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) onClose();
  });
  closeBtn?.addEventListener('click', onClose);
  cancelBtn?.addEventListener('click', onClose);

  // Confirm import
  confirmBtn?.addEventListener('click', () => {
    const text = textarea.value.trim();
    if (!text) {
      displayValidationErrors([{ field: 'empty', message: 'Please paste JSON or drop a file first.' }], 0);
      return;
    }
    handleProcessText(text);
  });

  // Partial recovery
  loadValidBtn?.addEventListener('click', () => {
    if (!currentRawJson) return;
    const ok = appStore.loadOnlyValidTracksFromErrors(currentRawJson);
    if (ok) {
      appStore.setView('playlist');
      showToast('Loaded valid tracks successfully!');
      onClose();
    }
  });

  // Sample session
  sampleBtn?.addEventListener('click', () => {
    const sampleStr = JSON.stringify(SAMPLE_ROCK_SESSION, null, 2);
    handleProcessText(sampleStr);
  });

  // Copy AI Prompt Template
  copyPromptBtn?.addEventListener('click', async () => {
    const aiPrompt = `Create a curated music playlist in Tracklist JSON schema format ("tracklist/1").
Requirements:
1. Theme / Mood: [Enter your topic or theme, e.g. "80s synthwave night drive" or "live acoustic rock sessions"]
2. Provide valid, real 11-character YouTube video IDs.
3. Output strictly valid JSON matching this structure:
{
  "schema": "tracklist/1",
  "name": "Playlist Title",
  "description": "Short description of the vibe",
  "tracks": [
    {
      "videoId": "dQw4w9WgXcQ",
      "title": "Artist - Song Title (Version)",
      "artist": "Artist Name"
    }
  ]
}`;
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(aiPrompt);
        showToast('AI prompt template copied to clipboard!');
      } else {
        prompt('Copy this prompt for your AI assistant:', aiPrompt);
      }
    } catch {
      prompt('Copy this prompt for your AI assistant:', aiPrompt);
    }
  });

  // File upload & Drag/Drop
  browseBtn?.addEventListener('click', () => fileInput?.click());
  dropzone?.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).tagName !== 'BUTTON') {
      fileInput?.click();
    }
  });

  fileInput?.addEventListener('change', () => {
    if (fileInput.files && fileInput.files[0]) {
      readFile(fileInput.files[0]);
    }
  });

  dropzone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('drag-active');
  });

  dropzone?.addEventListener('dragleave', () => {
    dropzone.classList.remove('drag-active');
  });

  dropzone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('drag-active');
    if (e.dataTransfer?.files && e.dataTransfer.files[0]) {
      readFile(e.dataTransfer.files[0]);
    }
  });

  function readFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        handleProcessText(content);
      }
    };
    reader.onerror = () => {
      displayValidationErrors([{ field: 'file', message: 'Failed to read file from disk.' }], 0);
    };
    reader.readAsText(file);
  }
}
