// The screenshot scenes behind ?shot=title|drive|chase|mission. Each one
// plays the real rules forward from a fresh world for a fixed number of
// steps, steered by a tiny scripted driver, so the frame is what a short
// game really looks like and the same seed always gives the same frame.

import { STEP } from './config.js';
import { enterOrExitCar, stepWorld } from './world.js';
import { addWanted } from './police.js';
import { SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const TITLE_SECONDS = 5;
const DRIVE_SECONDS = 4.5;
const CHASE_SECONDS = 4.5;
const MISSION_SECONDS = 3;

function idleControls() {
  return {
    move: { x: 0, y: 0 },
    drive: { throttle: 0, brake: 0, steer: 0 },
    enter: false,
    punch: false,
    shoot: null,
    advanceDialog: false,
  };
}

/** Step the world forward for `seconds` with the controls `steer` returns each step. */
function playForward(world, seconds, steer) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const controls = idleControls();
    if (steer) steer(controls, world, i);
    stepWorld(world, controls, STEP);
  }
}

function enterOwnCar(world) {
  world.player.x = 770;
  world.player.y = 660;
  enterOrExitCar(world);
}

function stageTitle(world) {
  world.reset();
  playForward(world, TITLE_SECONDS);
  return { screen: SCREEN_TITLE, best: 0 };
}

function stageDrive(world) {
  world.reset();
  world.mission.started = true;
  enterOwnCar(world);
  playForward(world, DRIVE_SECONDS, (controls) => {
    controls.drive = { throttle: 1, brake: 0, steer: 0 };
  });
  return { screen: SCREEN_PLAY, best: 0 };
}

function stageChase(world) {
  world.reset();
  world.mission.started = true;
  enterOwnCar(world);
  addWanted(world, 3);
  playForward(world, CHASE_SECONDS, (controls) => {
    controls.drive = { throttle: 1, brake: 0, steer: 0 };
  });
  return { screen: SCREEN_PLAY, best: 0 };
}

function stageMission(world) {
  world.reset();
  world.mission.started = true;
  // Finish mission one by walking Raka through its two goals.
  world.player.x = 1100;
  world.player.y = 1100;
  playForward(world, 0.1);
  world.player.x = 2300;
  world.player.y = 700;
  playForward(world, 0.1);
  // Mission two has now begun: the orange car, its guards, and the pistol.
  world.mission.dialog = [];
  world.mission.dialogActive = null;
  world.player.x = 3040;
  world.player.y = 1480;
  playForward(world, MISSION_SECONDS, (controls, state) => {
    const enemy = state.enemies.find((e) => !e.dead);
    if (!enemy) return;
    const dx = enemy.x - state.player.x;
    const dy = enemy.y - state.player.y;
    const dist = Math.hypot(dx, dy);
    state.player.angle = Math.atan2(dy, dx);
    if (dist < 120) {
      controls.move = { x: dx / dist, y: dy / dist };
    }
    if (dist < 46) controls.punch = true;
  });
  return { screen: SCREEN_PLAY, best: 0 };
}

/**
 * Set `world` to the named scene (title, drive, chase or mission; any other
 * name is title) and return the screen to draw over it and the best score
 * to show.
 */
export function stageShot(name, world) {
  if (name === 'drive') return stageDrive(world);
  if (name === 'chase') return stageChase(world);
  if (name === 'mission') return stageMission(world);
  return stageTitle(world);
}
