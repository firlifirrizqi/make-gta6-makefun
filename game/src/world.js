// The world: everything that exists in Teluk Cahaya and one step() that moves
// it all. No drawing and no browser in here — the renderer paints this state
// and main.js feeds it input. The state is plain objects so the screenshot
// scenes can stage it directly.

import { CAR, PEDESTRIANS, PLAYER, ROADS, STEP, TRAFFIC, VIEW, WORLD } from './config.js';
import { buildCity, isOnRoad } from './city.js';
import { createRandom, rangeRandom } from './random.js';
import { createAudio } from './audio.js';
import { createTraffic, stepTraffic } from './traffic.js';
import { createPedestrian, createPedestrians, stepPedestrians } from './pedestrians.js';
import { driveCar, makeCar, nearestCar, pickCarColor, separateCars } from './vehicles.js';
import { createPlayer, damagePlayer, healPlayer, stepOnFoot } from './player.js';
import { addWanted, respawnPlayer, stepPolice } from './police.js';
import { playerPunch, playerShoot, spawnCrashParticles, stepBullets, stepEnemies, stepParticles } from './combat.js';
import { beginStory, createMissionState, missionMarker, updateMission } from './missions.js';

export const EVENT_NONE = 0;
export const EVENT_MISSION_DONE = 1;

export function createWorld(random) {
  const audio = createAudio();
  const state = {
    random,
    audio,
    city: null,
    player: null,
    cars: [],
    traffic: [],
    peds: [],
    police: [],
    enemies: [],
    bullets: [],
    particles: [],
    pickups: [],
    camera: { x: 700, y: 700 },
    time: 0,
    clockMinutes: 480,
    crimeTimer: 0,
    wantedFlash: 0,
    busted: false,
    wasted: false,
    mission: null,
    missionMarker: null,
    muzzle: 0,
    pedHitCooldown: 0,
  };
  state.reset = function resetWorld() {
    state.city = buildCity(random);
    state.player = createPlayer(700, 760);
    state.cars = [];
    state.traffic = createTraffic(state.city, random, TRAFFIC.count, 700, 760);
    state.peds = createPedestrians(state.city, random, PEDESTRIANS.count, 700, 760);
    state.police = [];
    state.enemies = [];
    state.bullets = [];
    state.particles = [];
    state.pickups = [];
    state.camera = { x: 700, y: 700 };
    state.time = 0;
    state.clockMinutes = 480;
    state.crimeTimer = 0;
    state.wantedFlash = 0;
    state.busted = false;
    state.wasted = false;
    state.muzzle = 0;
    state.pedHitCooldown = 0;
    state.mission = createMissionState();
    // Raka's own car: a blue sedan parked by the intersection, free to drive.
    const ownCar = makeCar(770, 700, 0, '#3d7dd9', 'player');
    ownCar.own = true;
    state.cars.push(ownCar);
    // Parked cars along the roads, waiting to be borrowed.
    for (let i = 0; i < 8; i += 1) {
      const vertical = random() < 0.5;
      let car;
      if (vertical) {
        const road = ROADS.vertical[Math.floor(random() * ROADS.vertical.length)];
        const side = random() < 0.5 ? -1 : 1;
        car = makeCar(
          road + side * (ROADS.width / 2 + 16),
          rangeRandom(random, 200, 2200),
          side > 0 ? Math.PI / 2 : -Math.PI / 2,
          pickCarColor(random),
          'parked',
        );
      } else {
        const road = ROADS.horizontal[Math.floor(random() * ROADS.horizontal.length)];
        const side = random() < 0.5 ? -1 : 1;
        car = makeCar(
          rangeRandom(random, 200, 3200),
          road + side * (ROADS.width / 2 + 16),
          side > 0 ? 0 : Math.PI,
          pickCarColor(random),
          'parked',
        );
      }
      state.cars.push(car);
    }
    // Cash and food scattered around the city.
    for (let i = 0; i < 8; i += 1) {
      state.pickups.push({
        x: rangeRandom(random, 200, 3200),
        y: rangeRandom(random, 200, 2200),
        kind: 'cash',
        taken: false,
      });
    }
    for (let i = 0; i < 4; i += 1) {
      const park = state.city.parks[Math.floor(random() * state.city.parks.length)];
      state.pickups.push({
        x: park.x + rangeRandom(random, 20, park.w - 20),
        y: park.y + rangeRandom(random, 20, park.h - 20),
        kind: 'health',
        taken: false,
      });
    }
    state.missionMarker = missionMarker(state);
  };
  state.reset();
  return state;
}

/** Raka gets into the nearest car, or out of the one he is driving. */
export function enterOrExitCar(state) {
  const player = state.player;
  if (!player.onFoot) {
    // Get out: step out beside the car and leave it parked.
    const car = player.car;
    car.speed = 0;
    car.kind = car.own ? 'player' : 'parked';
    player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    player.onFoot = true;
    player.car = null;
    state.cars.push(car);
    state.audio.enterCar();
    return 'exit';
  }
  const car = nearestCar(state.cars, player.x, player.y, 72)
    || nearestCar(state.traffic, player.x, player.y, 72);
  if (!car) {
    state.audio.denied();
    return null;
  }
  if (car.kind === 'traffic') {
    // Steal it: the driver runs off, the police take notice.
    state.traffic = state.traffic.filter((c) => c !== car);
    const driver = createPedestrian(state.city, state.random, car.x, car.y);
    driver.state = 'flee';
    driver.stateTimer = 3;
    state.peds.push(driver);
    addWanted(state, 1);
  } else if (!car.own && !car.target) {
    addWanted(state, 1);
  } else if (car.target) {
    addWanted(state, 1);
  }
  state.cars = state.cars.filter((c) => c !== car);
  car.driver = false;
  player.car = car;
  player.onFoot = false;
  player.x = car.x;
  player.y = car.y;
  state.audio.enterCar();
  return 'enter';
}

/** One fixed step of the whole world from the player's controls. */
export function stepWorld(state, controls, dt = STEP) {
  const player = state.player;
  state.time += dt;
  state.clockMinutes += dt * 0.5;
  state.pedHitCooldown = Math.max(0, state.pedHitCooldown - dt);
  // Dialogue: the first queued line shows until the player advances it.
  if (!state.mission.dialogActive && state.mission.dialog.length > 0) {
    state.mission.dialogActive = state.mission.dialog.shift();
  }
  if (controls.advanceDialog && state.mission.dialogActive) {
    state.mission.dialogActive = state.mission.dialog.shift() ?? null;
    controls.advanceDialog = false;
  }
  // The player, on foot or behind the wheel.
  if (player.onFoot) {
    stepOnFoot(player, controls.move, dt, state.city);
    if (controls.punch) playerPunch(state);
    if (controls.shoot) playerShoot(state, controls.shoot.x, controls.shoot.y);
  } else if (player.car) {
    const car = player.car;
    const hit = driveCar(car, controls.drive, dt, state.city, CAR.maxSpeed);
    if (hit > 0.65) {
      spawnCrashParticles(state, car.x, car.y);
      state.audio.crash(hit);
      if (damagePlayer(player, Math.floor(hit * 14))) state.wasted = true;
    }
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    // Running over a pedestrian is a crime, and it is messy.
    for (const ped of state.peds) {
      if (ped.down > 0) continue;
      if (Math.hypot(ped.x - car.x, ped.y - car.y) < 26 && Math.abs(car.speed) > 60) {
        ped.down = 4;
        spawnCrashParticles(state, ped.x, ped.y);
        if (state.pedHitCooldown <= 0) {
          state.pedHitCooldown = 2;
          addWanted(state, 1);
        }
      }
    }
    // Bump into other cars.
    for (const other of state.traffic) {
      if (separateCars(car, other)) state.audio.crash(0.2);
    }
    for (const other of state.cars) {
      if (separateCars(car, other)) state.audio.crash(0.2);
    }
  }
  if (controls.enter) enterOrExitCar(state);
  // The city lives on around him.
  stepTraffic(state.traffic, dt, state.random);
  const threats = [...state.traffic];
  if (player.car) threats.push(player.car);
  for (const cop of state.police) threats.push(cop);
  stepPedestrians(state.peds, state.city, dt, state.random, threats);
  stepPolice(state, dt);
  stepEnemies(state, dt);
  stepBullets(state, dt);
  stepParticles(state, dt);
  // Pickups.
  for (const pickup of state.pickups) {
    if (pickup.taken) continue;
    if (Math.hypot(pickup.x - player.x, pickup.y - player.y) < 30) {
      pickup.taken = true;
      if (pickup.kind === 'cash') {
        player.money += 25;
        state.audio.pickup();
      } else {
        healPlayer(player, 30);
        state.audio.pickup();
      }
    }
  }
  // The story advances.
  updateMission(state, dt);
  state.missionMarker = missionMarker(state);
  // The camera follows the player, clamped to the map.
  const targetX = Math.max(VIEW.width / 2, Math.min(WORLD.width - VIEW.width / 2, player.x));
  const targetY = Math.max(VIEW.height / 2, Math.min(WORLD.height - VIEW.height / 2, player.y));
  const follow = Math.min(1, dt * 6);
  state.camera.x += (targetX - state.camera.x) * follow;
  state.camera.y += (targetY - state.camera.y) * follow;
  // Sound follows the action.
  const engineAmount = player.car ? Math.abs(player.car.speed) / CAR.maxSpeed : 0;
  state.audio.setEngine(engineAmount);
  state.audio.setSiren(player.wanted > 0 && state.police.length > 0, dt);
  if (state.busted || state.wasted) return EVENT_NONE;
  return EVENT_NONE;
}

/** Start the story the first time the player begins a game. */
export function startStory(state) {
  beginStory(state);
  state.audio.ensure();
  state.audio.startMusic();
}
