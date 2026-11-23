// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens: title,
// play, paused, busted and wasted. Progress (cash, mission, pistol, health,
// clock) saves to localStorage; the title screen offers to continue it.
//
// ?seed=N fixes the city, traffic and pedestrians. ?shot=title|drive|chase|
// mission (with &seed=N) stages that scene instead of running the loop,
// paints it twice and sets window.__shotReady for a screenshot.
import { BEST_KEY, SAVE_KEY, STEP, VIEW } from './config.js';
import { createRandom } from './random.js';
import { createWorld, startStory, stepWorld } from './world.js';
import { respawnPlayer } from './police.js';
import {
  ACTION_CONFIRM,
  ACTION_ENTER_CAR,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_PUNCH,
  ACTION_SAVE,
  createInput,
} from './input.js';
import {
  createRenderer,
  SCREEN_BUSTED,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WASTED,
} from './render.js';
import { stageShot } from './shots.js';
import { jumpToMission } from './missions.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

// Test hook: lets automated play-tests read the live world (harmless in play).
window.__telukCahaya = { world };

/** Fit the 1280x800 view into the window, keeping its shape. */
function fitCanvas() {
  const scale = Math.min(window.innerWidth / VIEW.width, window.innerHeight / VIEW.height);
  canvas.style.width = `${Math.floor(VIEW.width * scale)}px`;
  canvas.style.height = `${Math.floor(VIEW.height * scale)}px`;
}
window.addEventListener('resize', fitCanvas);
fitCanvas();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw);
    if (typeof save !== 'object' || save === null) return null;
    return save;
  } catch {
    return null;
  }
}

function writeSave() {
  try {
    const player = world.player;
    const save = {
      money: player.money,
      missionIndex: world.mission.allDone ? 3 : world.mission.index,
      hasPistol: player.hasPistol,
      health: Math.round(player.health),
      clockMinutes: Math.round(world.clockMinutes),
      x: Math.round(player.x),
      y: Math.round(player.y),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene.screen, false, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  window.__telukCahaya.getScreen = () => screen;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let newGameKey = false;

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyN' && screen === SCREEN_TITLE) newGameKey = true;
  });

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startNewGame() {
    world.reset();
    startStory(world);
    screen = SCREEN_PLAY;
    announce('Bermain. Nadia punya pekerjaan untukmu: ambil paket di Warung Kopi Senja.');
  }

  function continueGame(save) {
    world.reset();
    world.player.money = save.money ?? 50;
    world.player.health = save.health ?? 100;
    world.player.hasPistol = !!save.hasPistol;
    world.clockMinutes = save.clockMinutes ?? 480;
    if (typeof save.x === 'number' && typeof save.y === 'number') {
      world.player.x = save.x;
      world.player.y = save.y;
      world.camera.x = save.x;
      world.camera.y = save.y;
    }
    const missionIndex = save.missionIndex ?? 0;
    if (missionIndex >= 3) {
      world.mission.allDone = true;
    } else if (missionIndex > 0) {
      jumpToMission(world, missionIndex);
      world.player.wanted = 0;
      world.police.length = 0;
    } else {
      startStory(world);
    }
    world.audio.ensure();
    world.audio.startMusic();
    screen = SCREEN_PLAY;
    announce('Melanjutkan permainan.');
  }

  function saveGame() {
    if (writeSave()) announce('Progres disimpan.');
    else announce('Penyimpanan gagal — browser ini menolak localStorage.');
  }

  /** Screen changes from this frame's one-shot presses and click. */
  function handleActions(pressed, click) {
    if (pressed & ACTION_MUTE) {
      const muted = world.audio.toggleMute();
      announce(muted ? 'Suara dimatikan.' : 'Suara dinyalakan.');
    }
    if (screen === SCREEN_TITLE) {
      if (newGameKey) {
        newGameKey = false;
        startNewGame();
      } else if (pressed & ACTION_CONFIRM) {
        const save = readSave();
        if (save) continueGame(save);
        else startNewGame();
      }
      return;
    }
    if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED) {
      if (pressed & ACTION_CONFIRM) {
        respawnPlayer(world);
        screen = SCREEN_PLAY;
        announce('Bangun di Rumah Lentera. Coba lagi.');
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (pressed & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Lanjut main.');
      } else if (pressed & ACTION_SAVE) {
        saveGame();
      }
      return;
    }
    // SCREEN_PLAY.
    if (pressed & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
      return;
    }
    if (pressed & ACTION_SAVE) saveGame();
    if (world.player.money > best) {
      best = world.player.money;
      saveBest(best);
    }
  }

  /** One fixed step from this frame's one-shot presses (first step only) and held keys. */
  function step(pressed, click) {
    const controls = {
      move: input.moveVector(),
      drive: input.drive(),
      enter: false,
      punch: false,
      shoot: null,
      advanceDialog: false,
    };
    if (pressed & ACTION_ENTER_CAR) controls.enter = true;
    if (pressed & ACTION_PUNCH) controls.punch = true;
    // Dialogue eats confirm and click first; otherwise a click is a shot.
    if (world.mission.dialogActive) {
      if (click || (pressed & ACTION_CONFIRM)) controls.advanceDialog = true;
    } else if (click && world.player.onFoot && world.player.hasPistol) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = VIEW.width / rect.width;
      const scaleY = VIEW.height / rect.height;
      const cam = world.camera;
      controls.shoot = {
        x: click.x * scaleX + cam.x - VIEW.width / 2,
        y: click.y * scaleY + cam.y - VIEW.height / 2,
      };
    }
    stepWorld(world, controls);
    if (world.busted) {
      world.audio.busted();
      screen = SCREEN_BUSTED;
      announce('Tertangkap polisi!');
    } else if (world.wasted) {
      world.audio.busted();
      screen = SCREEN_WASTED;
      announce('Kamu tewas.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Drain the one-shot queue exactly once per frame; only the first fixed
    // step of the frame sees the presses, later steps see held keys only.
    const pressed = input.takeActions();
    const click = input.takeClick();
    handleActions(pressed, click);
    if (screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step(first ? pressed : 0, first ? click : null);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world, screen, readSave() !== null, best);
  }

  // Leaving the tab pauses a running game rather than letting the police close in unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });

  announce('Teluk Cahaya. Tekan Spasi atau klik untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
