export const HELD_KEYS = new Map<string, number>();
export const PRESSED_KEYS = new Set<string>();

addEventListener('keydown', evt => {
  HELD_KEYS.set(evt.key, Date.now());
  PRESSED_KEYS.add(evt.key);
});

addEventListener('keyup', evt => {
  HELD_KEYS.delete(evt.key);
});

addEventListener('blur', () => HELD_KEYS.clear());
