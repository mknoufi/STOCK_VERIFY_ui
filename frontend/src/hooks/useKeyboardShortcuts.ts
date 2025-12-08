import { useEffect } from "react";
import { Platform } from "react-native";

export interface KeyboardShortcut {
  key: string;
  shift?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  meta?: boolean;
  preventDefault?: boolean;
  callback: (event: KeyboardEvent) => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatches =
          event.key.toLowerCase() === shortcut.key.toLowerCase();
        const shiftMatches =
          shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const ctrlMatches =
          shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey;
        const altMatches =
          shortcut.alt === undefined || shortcut.alt === event.altKey;
        const metaMatches =
          shortcut.meta === undefined || shortcut.meta === event.metaKey;

        if (
          keyMatches &&
          shiftMatches &&
          ctrlMatches &&
          altMatches &&
          metaMatches
        ) {
          if (shortcut.preventDefault ?? true) {
            event.preventDefault();
          }
          shortcut.callback(event);
          break;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [shortcuts]);
}
