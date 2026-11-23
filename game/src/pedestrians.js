// Pedestrians: city folk who stroll along the sidewalks, pause at corners,
// chat in place, and run away from a speeding car. A pedestrian a car hits
// is knocked down, lies on the asphalt for a while, then gets up and flees.

import { PALETTE, PEDESTRIANS } from './config.js';
import { moveCircle, nearestRoad } from './city.js';
import { pickRandom, rangeRandom } from './random.js';

export function createPedestrian(city, random, nearX, nearY) {
  const road = nearestRoad(
    nearX !== undefined ? nearX + rangeRandom(random, -500, 500) : rangeRandom(random, 200, 3200),
    nearY !== undefined ? nearY + rangeRandom(random, -500, 500) : rangeRandom(random, 200, 2200),
  );
  const side = random() < 0.5 ? -1 : 1;
  const offset = 62 * side;
  const x = road.axis === 'x' ? road.at + offset : Math.max(60, Math.min(3260, road.along + rangeRandom(random, -200, 200)));
  const y = road.axis === 'y' ? road.at + offset : Math.max(60, Math.min(2260, road.along + rangeRandom(random, -200, 200)));
  return {
    x, y,
    angle: rangeRandom(random, 0, Math.PI * 2),
    speed: PEDESTRIANS.speed + rangeRandom(random, -PEDESTRIANS.speedJitter, PEDESTRIANS.speedJitter),
    shirt: pickRandom(random, PALETTE.pedShirt),
    state: 'walk',
    stateTimer: rangeRandom(random, 2, 8),
    down: 0,
    fleeX: 0,
    fleeY: 0,
  };
}

export function createPedestrians(city, random, count, nearX, nearY) {
  const peds = [];
  for (let i = 0; i < count; i += 1) peds.push(createPedestrian(city, random, nearX, nearY));
  return peds;
}

/** Step one pedestrian: walk, idle, or run from a fast car nearby. */
export function stepPedestrian(ped, city, dt, random, threats) {
  if (ped.down > 0) {
    ped.down -= dt;
    if (ped.down <= 0) {
      ped.state = 'flee';
      ped.stateTimer = 2.5;
    }
    return;
  }
  ped.stateTimer -= dt;
  // A speeding car close by sends pedestrians running.
  let danger = null;
  for (const threat of threats) {
    const d = Math.hypot(threat.x - ped.x, threat.y - ped.y);
    if (Math.abs(threat.speed) > 180 && d < 170) danger = threat;
  }
  if (danger && ped.state !== 'flee') {
    ped.state = 'flee';
    ped.stateTimer = 2;
    const away = Math.atan2(ped.y - danger.y, ped.x - danger.x);
    ped.fleeX = Math.cos(away);
    ped.fleeY = Math.sin(away);
  }
  if (ped.stateTimer <= 0) {
    if (ped.state === 'flee') {
      ped.state = 'walk';
      ped.stateTimer = rangeRandom(random, 3, 9);
    } else if (random() < 0.25) {
      ped.state = 'idle';
      ped.stateTimer = rangeRandom(random, 1.5, 4);
    } else {
      ped.state = 'walk';
      ped.stateTimer = rangeRandom(random, 3, 9);
      ped.angle = rangeRandom(random, 0, Math.PI * 2);
    }
  }
  if (ped.state === 'idle') return;
  const speed = ped.state === 'flee' ? ped.speed * 2.4 : ped.speed;
  let dx;
  let dy;
  if (ped.state === 'flee') {
    dx = ped.fleeX * speed * dt;
    dy = ped.fleeY * speed * dt;
  } else {
    dx = Math.cos(ped.angle) * speed * dt;
    dy = Math.sin(ped.angle) * speed * dt;
  }
  const moved = moveCircle(city, ped.x, ped.y, dx, dy, 10);
  if (moved.hit) {
    // Bounced off a wall: pick a new direction.
    ped.angle = rangeRandom(random, 0, Math.PI * 2);
    ped.stateTimer = Math.min(ped.stateTimer, 0.5);
  }
  ped.x = moved.x;
  ped.y = moved.y;
}

export function stepPedestrians(peds, city, dt, random, threats) {
  for (const ped of peds) stepPedestrian(ped, city, dt, random, threats);
}
