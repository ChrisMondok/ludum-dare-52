export const HELD_KEYS = new Map<string, number>();
export const PRESSED_KEYS = new Set<string>();

addEventListener('keydown', evt => {
  HELD_KEYS.set(evt.code, Date.now());
  PRESSED_KEYS.add(evt.code);
});

addEventListener('keyup', evt => {
  HELD_KEYS.delete(evt.code);
});

addEventListener('blur', () => HELD_KEYS.clear());
