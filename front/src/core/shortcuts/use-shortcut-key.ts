import { useEffect } from "react";
import { useAtom } from "jotai";
import Mousetrap from "mousetrap";
import { defaultData } from "../../store/jotai";
import { getActionById } from "./shortcut.registry";

/**
 * Returns the current key combo for a given action ID.
 * Falls back to the default key if no custom mapping exists.
 */
export function useShortcutKey(actionId: string): string {
  const [data] = useAtom(defaultData);
  const action = getActionById(actionId);
  return data.customShortcuts?.[actionId] ?? action?.defaultKey ?? '';
}

/**
 * Binds a keyboard shortcut for the given action ID.
 * Automatically resolves the current key from jotai (custom or default).
 * Respects enableShortcuts setting.
 */
export function useBindShortcut(
  actionId: string,
  handler: (e: KeyboardEvent) => void,
  deps: any[] = []
) {
  const [data] = useAtom(defaultData);
  const key = useShortcutKey(actionId);
  const enabled = data.enableShortcuts !== false;

  useEffect(() => {
    if (!enabled || !key) return;

    const wrappedHandler = (e: any) => {
      if (!document.body.classList.contains("ReactModal__Body--open")) {
        e.preventDefault();
        e.stopPropagation();
        handler(e);
      }
      return false;
    };

    Mousetrap.bind(key, wrappedHandler);
    return () => { Mousetrap.unbind(key); };
  }, [key, enabled, ...deps]);
}

/**
 * Binds a keyboard shortcut that works even when modals are open.
 * Used for shortcuts like Escape that need to work in modal context.
 */
export function useBindShortcutGlobal(
  actionId: string,
  handler: (e: KeyboardEvent) => void,
  deps: any[] = []
) {
  const [data] = useAtom(defaultData);
  const key = useShortcutKey(actionId);
  const enabled = data.enableShortcuts !== false;

  useEffect(() => {
    if (!enabled || !key) return;

    const wrappedHandler = (e: any) => {
      e.preventDefault();
      handler(e);
      return false;
    };

    Mousetrap.bind(key, wrappedHandler);
    return () => { Mousetrap.unbind(key); };
  }, [key, enabled, ...deps]);
}

/**
 * Binds a raw shortcut key (not from registry) — for dynamic shortcuts
 * like alt+p+0, alt+p+1, etc. that depend on runtime data.
 */
export function useBindRawShortcut(
  key: string,
  handler: (e: KeyboardEvent) => void,
  enabled: boolean = true,
  deps: any[] = []
) {
  useEffect(() => {
    if (!enabled || !key) return;
    Mousetrap.bind(key, (e: any) => {
      e.preventDefault();
      handler(e);
      return false;
    });
    return () => { Mousetrap.unbind(key); };
  }, [key, enabled, ...deps]);
}
