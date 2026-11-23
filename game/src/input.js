// Keyboard and mouse input. Held keys give a movement vector and driving
// controls; one-shot presses (confirm, pause, enter car, punch, mute) are
// queued as bit flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice. The mouse aims and shoots.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER_CAR = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;
export const ACTION_SAVE = 32;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER_CAR = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const MUTE = new Set(['KeyM']);
const SAVE = new Set(['KeyG']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouse = { x: 0, y: 0, down: false, clicked: false, clickX: 0, clickY: 0 };

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code)) {
      keys.add(event.code);
      event.preventDefault();
      return;
    }
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (ENTER_CAR.has(event.code)) {
      if (!event.repeat) actions |= ACTION_ENTER_CAR;
    } else if (PUNCH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PUNCH;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (SAVE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SAVE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    keys.clear();
    mouse.down = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.down = true;
    mouse.clicked = true;
    mouse.clickX = mouse.x;
    mouse.clickY = mouse.y;
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointerup', () => {
    mouse.down = false;
  });

  function hasAny(set) {
    for (const code of set) if (keys.has(code)) return true;
    return false;
  }

  return {
    /** Movement vector from held keys, each component in [-1, 1]. */
    moveVector() {
      const x = (hasAny(RIGHT) ? 1 : 0) - (hasAny(LEFT) ? 1 : 0);
      const y = (hasAny(DOWN) ? 1 : 0) - (hasAny(UP) ? 1 : 0);
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.SQRT2;
        return { x: x * inv, y: y * inv };
      }
      return { x, y };
    },
    /** Driving: throttle 0..1, brake 0..1, steer -1..1. */
    drive() {
      return {
        throttle: hasAny(UP) ? 1 : 0,
        brake: hasAny(DOWN) ? 1 : 0,
        steer: (hasAny(LEFT) ? -1 : 0) + (hasAny(RIGHT) ? 1 : 0),
      };
    },
    mouse() {
      return mouse;
    },
    /** Take (and clear) the one-shot click since the last call. */
    takeClick() {
      const clicked = mouse.clicked;
      mouse.clicked = false;
      return clicked ? { x: mouse.clickX, y: mouse.clickY } : null;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
