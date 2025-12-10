import { useEffect } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  preventDefault?: boolean;
}

/**
 * Hook to register keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts([
 *   {
 *     key: 'd',
 *     ctrlKey: true,
 *     action: () => exportData(),
 *     description: 'Download data as CSV',
 *   },
 *   {
 *     key: 'Escape',
 *     action: () => closeModal(),
 *     description: 'Close modal',
 *   },
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]): void {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      for (const shortcut of shortcuts) {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey;
        const metaMatches = shortcut.metaKey === undefined || event.metaKey === shortcut.metaKey;
        const shiftMatches = shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey;
        const altMatches = shortcut.altKey === undefined || event.altKey === shortcut.altKey;

        // On Mac, Cmd key is metaKey. On Windows/Linux, it's ctrlKey.
        // Allow either Ctrl or Cmd for shortcuts that specify ctrlKey
        const modifierMatches = shortcut.ctrlKey
          ? (event.ctrlKey || event.metaKey) && metaMatches && shiftMatches && altMatches
          : ctrlMatches && metaMatches && shiftMatches && altMatches;

        if (keyMatches && modifierMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcuts]);
}

/**
 * Common keyboard shortcut configurations
 */
export const commonShortcuts = {
  /**
   * Escape key - typically used to close modals, clear selections, etc.
   */
  escape: (action: () => void): KeyboardShortcut => ({
    key: 'Escape',
    action,
    description: 'Close / Cancel',
    preventDefault: false,
  }),

  /**
   * Ctrl/Cmd + D - Download/Export data
   */
  download: (action: () => void): KeyboardShortcut => ({
    key: 'd',
    ctrlKey: true,
    action,
    description: 'Download data (Ctrl+D / Cmd+D)',
  }),

  /**
   * Ctrl/Cmd + K - Focus search/command palette
   */
  search: (action: () => void): KeyboardShortcut => ({
    key: 'k',
    ctrlKey: true,
    action,
    description: 'Focus search (Ctrl+K / Cmd+K)',
  }),

  /**
   * Ctrl/Cmd + S - Save
   */
  save: (action: () => void): KeyboardShortcut => ({
    key: 's',
    ctrlKey: true,
    action,
    description: 'Save (Ctrl+S / Cmd+S)',
  }),

  /**
   * Ctrl/Cmd + Z - Undo
   */
  undo: (action: () => void): KeyboardShortcut => ({
    key: 'z',
    ctrlKey: true,
    action,
    description: 'Undo (Ctrl+Z / Cmd+Z)',
  }),

  /**
   * Ctrl/Cmd + Shift + Z - Redo
   */
  redo: (action: () => void): KeyboardShortcut => ({
    key: 'z',
    ctrlKey: true,
    shiftKey: true,
    action,
    description: 'Redo (Ctrl+Shift+Z / Cmd+Shift+Z)',
  }),

  /**
   * Arrow keys for navigation
   */
  arrowUp: (action: () => void): KeyboardShortcut => ({
    key: 'ArrowUp',
    action,
    description: 'Navigate up',
    preventDefault: false,
  }),

  arrowDown: (action: () => void): KeyboardShortcut => ({
    key: 'ArrowDown',
    action,
    description: 'Navigate down',
    preventDefault: false,
  }),

  arrowLeft: (action: () => void): KeyboardShortcut => ({
    key: 'ArrowLeft',
    action,
    description: 'Navigate left',
    preventDefault: false,
  }),

  arrowRight: (action: () => void): KeyboardShortcut => ({
    key: 'ArrowRight',
    action,
    description: 'Navigate right',
    preventDefault: false,
  }),
};
