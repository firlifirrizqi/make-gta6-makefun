// The wanted level and the police. Crimes raise stars; quiet time lowers
// them. Police cars spawn on a road near the player, chase him by steering
// toward him, and ram. A player on foot hemmed in by a police car for long
// enough is busted; a player in a car can outrun them.

import { CAR, POLICE, ROADS, WANTED } from './config.js';
import { driveCar, makeCar, separateCars } from './vehicles.js';
import { roadPointNear } from './city.js';

export function addWanted(state, amount) {
  const player = state.player;
  const before = player.wanted;
  player.wanted = Math.max(0, Math.min(5, player.wanted + amount));
  if (player.wanted > before) {
    state.crimeTimer = 0;
    state.wantedFlash = 1.2;
  }
  return player.wanted;
}

/** How many police cars the current wanted level calls for. */
export function policeWanted(wanted) {
  if (wanted <= 0) return 0;
  return Math.min(POLICE.maxCars, wanted);
}

export function spawnPoliceCar(state) {
  const player = state.player;
  const spot = roadPointNear(player.x, player.y, state.random);
  const car = makeCar(spot.x, spot.y, Math.atan2(player.y - spot.y, player.x - spot.x), '#2b3a67', 'police');
  car.targetSpeed = POLICE.chaseSpeed;
  car.speed = 120;
  car.siren = Math.random();
  state.police.push(car);
  return car;
}

/** Steer one police car toward the player and ram him. */
export function stepPoliceCar(car, state, dt) {
  const player = state.player;
  const tx = player.onFoot ? player.x : player.car.x;
  const ty = player.onFoot ? player.y : player.car.y;
  // A traffic car right ahead is overtaken, not pushed: aim at a point
  // offset to one side of the player so the police car swings around it.
  let aimX = tx;
  let aimY = ty;
  const cosA = Math.cos(car.angle);
  const sinA = Math.sin(car.angle);
  for (const other of state.traffic) {
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d < 120 && d > 0 && (dx * cosA + dy * sinA) / d > 0.6) {
      const side = car.siren < 0.5 ? 1 : -1;
      aimX = tx - sinA * 110 * side;
      aimY = ty + cosA * 110 * side;
      break;
    }
  }
  const wantAngle = Math.atan2(aimY - car.y, aimX - car.x);
  let diff = wantAngle - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const steer = Math.max(-1, Math.min(1, diff * 2.2));
  // Ease off when very close, so the car rams instead of orbiting. A player
  // on foot is pinned, not driven through: slow down as the car closes in
  // and stop on top of him, so the busted timer can run.
  const dist = Math.hypot(tx - car.x, ty - car.y);
  let throttle = dist > 60 ? 1 : 0.45;
  let brake = 0;
  if (player.onFoot) {
    if (dist < 300) throttle = Math.min(1, Math.max(0, (dist - 48) / 150));
    if (dist < 300 && car.speed > 160) brake = 1;
    else if (dist < 52 && car.speed > 30) brake = 1;
  }
  const hit = driveCar(car, { throttle, brake, steer }, dt, state.city, POLICE.chaseSpeed);
  if (hit > 0.25) state.audio.crash(hit);
  return hit;
}

export function stepPolice(state, dt) {
  const player = state.player;
  // Keep the number of police cars matched to the wanted level.
  const wanted = policeWanted(player.wanted);
  while (state.police.length < wanted) spawnPoliceCar(state);
  while (state.police.length > wanted) state.police.pop();
  for (const car of state.police) stepPoliceCar(car, state, dt);
  for (let i = 0; i < state.police.length; i += 1) {
    for (const other of state.traffic) separateCars(state.police[i], other);
    for (let j = i + 1; j < state.police.length; j += 1) separateCars(state.police[i], state.police[j]);
    if (player.car) separateCars(state.police[i], player.car);
  }
  // Busted: a police car pins the player on foot.
  if (player.onFoot && player.wanted > 0) {
    let pinned = false;
    for (const car of state.police) {
      if (Math.hypot(car.x - player.x, car.y - player.y) < POLICE.bustedRadius) pinned = true;
    }
    if (pinned) {
      player.bustedTimer += dt;
      if (player.bustedTimer >= POLICE.bustedSeconds) state.busted = true;
    } else {
      player.bustedTimer = Math.max(0, player.bustedTimer - dt * 2);
    }
  } else {
    player.bustedTimer = Math.max(0, player.bustedTimer - dt * 2);
  }
  // Quiet time lowers the wanted level, one star at a time.
  if (player.wanted > 0) {
    state.crimeTimer += dt;
    if (state.crimeTimer > WANTED.decayQuietSeconds + WANTED.decayStepSeconds * (5 - player.wanted)) {
      player.wanted -= 1;
      state.crimeTimer = 0;
    }
  } else {
    state.crimeTimer = 0;
  }
  state.wantedFlash = Math.max(0, state.wantedFlash - dt);
}

/** After being busted or wasted: lose a cut of the cash, lose the heat, wake up at the safehouse. */
export function respawnPlayer(state) {
  const player = state.player;
  player.money = Math.floor(player.money * 0.8);
  player.wanted = 0;
  player.health = 100;
  player.bustedTimer = 0;
  player.onFoot = true;
  player.car = null;
  player.x = 1500;
  player.y = 1820;
  state.police.length = 0;
  state.busted = false;
  state.wasted = false;
  state.camera.x = player.x;
  state.camera.y = player.y;
}
