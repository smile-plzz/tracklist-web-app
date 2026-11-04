import { appStore } from '../store';

export function setupKeyboardShortcuts(): () => void {
  const handler = (e: KeyboardEvent) => {
    const activeEl = document.activeElement;
    const isTyping =
      activeEl &&
      (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || (activeEl as HTMLElement).isContentEditable);

    if (isTyping) {
      if (e.code === 'Escape') {
        (activeEl as HTMLElement).blur();
      }
      return;
    }

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        appStore.togglePlay();
        break;

      case 'KeyN':
        e.preventDefault();
        appStore.next();
        break;

      case 'KeyP':
        e.preventDefault();
        appStore.previous();
        break;

      case 'KeyF':
        e.preventDefault();
        appStore.toggleFocusMode();
        break;

      case 'KeyM':
        e.preventDefault();
        appStore.toggleMute();
        break;

      case 'ArrowRight':
        e.preventDefault();
        appStore.seek(appStore.getState().currentTime + 5);
        break;

      case 'ArrowLeft':
        e.preventDefault();
        appStore.seek(Math.max(0, appStore.getState().currentTime - 5));
        break;

      case 'Escape':
        if (appStore.getState().isFocusMode) {
          e.preventDefault();
          appStore.toggleFocusMode();
        }
        break;
    }
  };

  window.addEventListener('keydown', handler);
  return () => {
    window.removeEventListener('keydown', handler);
  };
}

