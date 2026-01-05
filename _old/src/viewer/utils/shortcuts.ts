// Lightweight keyboard shortcuts manager for Vue Options API components
// Usage:
// const shortcuts = createShortcuts({
//   onReset: () => this.reset(),
//   onToggleUI: () => this.toggleUIVisibility(),
//   onToggleVRButton: () => this.toggleVRButton(),
//   onNavigateScene: (d) => this.navigateScene(d),
//   onNavigatePolicy: (d) => this.navigatePolicy(d),
//   getHelpVisible: () => this.showHelpDialog,
//   setHelpVisible: (v) => { this.showHelpDialog = v },
// });
// ... later on unmount: shortcuts.detach()

interface ShortcutsOptions {
  target?: EventTarget | null;
  onReset?: () => void;
  onToggleUI?: () => void;
  onToggleVRButton?: () => void;
  onNavigateScene?: (direction: number) => void;
  onNavigatePolicy?: (direction: number) => void;
  getHelpVisible?: () => boolean;
  setHelpVisible?: (visible: boolean) => void;
}

export function createShortcuts(options: ShortcutsOptions = {}) {
  const {
    target = typeof document !== 'undefined' ? document : null,
    onReset,
    onToggleUI,
    onToggleVRButton,
    onNavigateScene,
    onNavigatePolicy,
    getHelpVisible,
    setHelpVisible,
  } = options;

  if (!target || typeof target.addEventListener !== 'function') {
    return { detach() { } };
  }

  const handleKeydown = (event) => {
    try {
      // Ignore key events originating from text inputs, textareas or contenteditable elements
      const el = event.target;
      const tag = (el && el.tagName) ? el.tagName.toLowerCase() : '';
      const isEditable = (
        (tag === 'input') ||
        (tag === 'textarea') ||
        (el && el.isContentEditable === true)
      );
      if (isEditable) return;

      if (event.code === 'Backspace') {
        onReset && onReset();
        return;
      }

      const key = event.key;
      if (key === 'i') {
        onToggleUI && onToggleUI();
        return;
      }
      if (key === 'v') {
        onToggleVRButton && onToggleVRButton();
        return;
      }
      if (key === '?') {
        if (getHelpVisible && setHelpVisible) {
          setHelpVisible(!getHelpVisible());
        }
        return;
      }
      if (key === 's') {
        onNavigateScene && onNavigateScene(1);
        return;
      }
      if (key === 'S') {
        onNavigateScene && onNavigateScene(-1);
        return;
      }
      if (key === 'p') {
        onNavigatePolicy && onNavigatePolicy(1);
        return;
      }
      if (key === 'P') {
        onNavigatePolicy && onNavigatePolicy(-1);
        return;
      }
    } catch (e) {
      // fail quietly; shortcuts are non-critical
      // console.warn('Shortcut handler error:', e);
    }
  };

  target.addEventListener('keydown', handleKeydown);

  return {
    detach() {
      try {
        target.removeEventListener('keydown', handleKeydown);
      } catch (_) { }
    },
    toggleHelp() {
      if (getHelpVisible && setHelpVisible) {
        setHelpVisible(!getHelpVisible());
      }
    },
  };
}
