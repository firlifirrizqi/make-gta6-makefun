// Cars: their shape, the driving physics (accelerate, steer, brake, slide
// along walls) and the enter/exit rules. A car is a plain object shared by
// the player's car, parked cars, traffic and police; each system only reads
// the fields it needs.

import { CAR } from './config.js';
import { circleHitsSolid, moveCircle } from './city.js';

const CAR_COLORS = ['#d94f3d', '#3d7dd9', '#e8b93c', '#7d5ad9', '#4fae62', '#d9d9d9', '#e07ab0', '#3fb8b0'];

export function pickCarColor(random) {
  return CAR_COLORS[Math.floor(random() * CAR_COLORS.length) % CAR_COLORS.length];
}

/** A car at (x, y) facing `angle`, of a kind: 'player', 'parked', 'traffic' or 'police'. */
export function makeCar(x, y, angle, color, kind) {
  return {
    x, y, angle, speed: 0, color, kind,
    length: 46, width: 24,
    driver: kind === 'traffic',
    stolen: false,
    brakeLight: false,
    skid: 0,
  };
}

/**
 * Drive one car for dt seconds. `drive` is { throttle, brake, steer } and
 * `topSpeed` caps it. Walls stop the car and cost speed; the return value
 * says how hard it hit, for crash sounds and damage.
 */
export function driveCar(car, drive, dt, city, topSpeed) {
  car.crashCooldown = Math.max(0, (car.crashCooldown || 0) - dt);
  const before = car.speed;
  if (drive.throttle > 0) car.speed += CAR.accel * drive.throttle * dt;
  if (drive.brake > 0) {
    if (car.speed > 20) car.speed -= CAR.brake * drive.brake * dt;
    else car.speed -= CAR.accel * 0.55 * dt;
  }
  // Rolling resistance and drag.
  car.speed -= car.speed * 0.55 * dt;
  if (car.speed > topSpeed) car.speed = topSpeed;
  if (car.speed < -CAR.reverseMax) car.speed = -CAR.reverseMax;
  if (Math.abs(car.speed) < 4 && drive.throttle === 0 && drive.brake === 0) car.speed = 0;
  const steerAuthority = Math.min(1, Math.abs(car.speed) / 140);
  car.angle += drive.steer * CAR.steerRate * steerAuthority * dt * (car.speed < 0 ? -1 : 1);
  const dx = Math.cos(car.angle) * car.speed * dt;
  const dy = Math.sin(car.angle) * car.speed * dt;
  const moved = moveCircle(city, car.x, car.y, dx, dy, CAR.radius);
  // A wall hit counts once, then the car gets a short grace period, so
  // holding the throttle against a wall does not hurt every single step.
  let hitStrength = 0;
  if (moved.hit) {
    if (Math.abs(before) > 120) car.speed *= 0.45;
    if (car.crashCooldown <= 0) {
      car.crashCooldown = 0.8;
      hitStrength = Math.abs(before) / topSpeed;
    }
  }
  car.x = moved.x;
  car.y = moved.y;
  car.brakeLight = drive.brake > 0;
  car.skid = Math.abs(drive.steer) > 0.7 && Math.abs(car.speed) > 260 ? 1 : Math.max(0, car.skid - dt * 3);
  return hitStrength;
}

/** Push two cars apart when their circles overlap, and trade a little speed. */
export function separateCars(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dist = Math.hypot(dx, dy);
  const min = CAR.radius * 2 - 4;
  if (dist >= min || dist === 0) return false;
  const push = (min - dist) / 2;
  const nx = dx / dist;
  const ny = dy / dist;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  // Trade speed only on a real impact — the closing speed along the line
  // between them — so cars resting bumper to bumper do not bleed speed away.
  const va = a.speed * (Math.cos(a.angle) * nx + Math.sin(a.angle) * ny);
  const vb = b.speed * (Math.cos(b.angle) * nx + Math.sin(b.angle) * ny);
  const closing = va - vb;
  if (closing > 100) {
    const exchange = closing * 0.3;
    a.speed -= exchange;
    b.speed += exchange;
  }
  return true;
}

/** True when the car circle overlaps a building or the bay. */
export function carHitsWall(city, car) {
  return circleHitsSolid(city, car.x, car.y, CAR.radius);
}

/** The nearest car to a point within `radius`, or null. */
export function nearestCar(cars, x, y, radius) {
  let best = null;
  let bestDist = radius;
  for (const car of cars) {
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  return best;
}
