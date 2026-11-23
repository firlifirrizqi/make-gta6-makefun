// Traffic: cars that follow the road grid, one lane each way, turning at
// intersections. Each car owns one road and a direction along it; at an
// intersection it may turn onto the crossing road. Cars slow for the car
// ahead so traffic bunches up instead of driving through each other.

import { ROADS, TRAFFIC } from './config.js';
import { makeCar, pickCarColor, separateCars } from './vehicles.js';
import { rangeRandom } from './random.js';

function spawnOnRoad(random, nearX, nearY) {
  const vertical = random() < 0.5;
  if (vertical) {
    const road = ROADS.vertical[Math.floor(random() * ROADS.vertical.length)];
    const dir = random() < 0.5 ? 1 : -1;
    const lane = dir === 1 ? ROADS.lane : -ROADS.lane;
    const along = nearY !== undefined
      ? Math.max(120, Math.min(2280, nearY + rangeRandom(random, -700, 700)))
      : rangeRandom(random, 120, 2280);
    return { x: road + lane, y: along, angle: dir === 1 ? Math.PI / 2 : -Math.PI / 2, axis: 'x', road, dir };
  }
  const road = ROADS.horizontal[Math.floor(random() * ROADS.horizontal.length)];
  const dir = random() < 0.5 ? 1 : -1;
  const lane = dir === 1 ? ROADS.lane : -ROADS.lane;
  const along = nearX !== undefined
    ? Math.max(120, Math.min(3480, nearX + rangeRandom(random, -700, 700)))
    : rangeRandom(random, 120, 3480);
  return { x: along, y: road + lane, angle: dir === 1 ? 0 : Math.PI, axis: 'y', road, dir };
}

export function createTrafficCar(city, random, nearX, nearY) {
  const spot = spawnOnRoad(random, nearX, nearY);
  const car = makeCar(spot.x, spot.y, spot.angle, pickCarColor(random), 'traffic');
  car.axis = spot.axis;
  car.road = spot.road;
  car.dir = spot.dir;
  car.targetSpeed = TRAFFIC.speed + rangeRandom(random, -TRAFFIC.speedJitter, TRAFFIC.speedJitter);
  car.speed = car.targetSpeed;
  car.turnCooldown = 0;
  return car;
}

export function createTraffic(city, random, count, nearX, nearY) {
  const cars = [];
  for (let i = 0; i < count; i += 1) cars.push(createTrafficCar(city, random, nearX, nearY));
  return cars;
}

/** Is the point (x, y) inside an intersection box? */
function atIntersection(x, y) {
  const half = ROADS.width / 2 + 4;
  let onV = false;
  let onH = false;
  for (const rx of ROADS.vertical) if (Math.abs(x - rx) <= half) onV = true;
  for (const ry of ROADS.horizontal) if (Math.abs(y - ry) <= half) onH = true;
  return onV && onH;
}

function nearestRoadLine(list, value) {
  let best = list[0];
  let bestDist = Math.abs(value - list[0]);
  for (const line of list) {
    const d = Math.abs(value - line);
    if (d < bestDist) {
      bestDist = d;
      best = line;
    }
  }
  return best;
}

/** Step one traffic car: cruise along its road, turn at intersections, slow for the car ahead. */
export function stepTrafficCar(car, cars, dt, random) {
  car.turnCooldown = Math.max(0, (car.turnCooldown || 0) - dt);
  // Slow down for a car ahead on the same road.
  let ahead = Infinity;
  for (const other of cars) {
    if (other === car || other.axis !== car.axis || other.road !== car.road || other.dir !== car.dir) continue;
    const along = car.axis === 'x' ? (other.y - car.y) * car.dir : (other.x - car.x) * car.dir;
    if (along > 0 && along < ahead) ahead = along;
  }
  let speed = car.targetSpeed;
  if (ahead < 110) speed = Math.max(0, car.targetSpeed * (ahead - 55) / 55);
  car.speed += (speed - car.speed) * Math.min(1, dt * 2.5);
  const dx = Math.cos(car.angle) * car.speed * dt;
  const dy = Math.sin(car.angle) * car.speed * dt;
  car.x += dx;
  car.y += dy;
  // Wrap around the map edges so traffic never runs out.
  if (car.axis === 'x') {
    if (car.y < 100) car.y = 2300;
    if (car.y > 2300) car.y = 100;
  } else {
    if (car.x < 100) car.x = 3500;
    if (car.x > 3500) car.x = 100;
  }
  // At an intersection, sometimes turn onto the crossing road.
  if (car.turnCooldown <= 0 && atIntersection(car.x, car.y) && random() < 0.35) {
    car.turnCooldown = 2.5;
    if (car.axis === 'x') {
      const cross = nearestRoadLine(ROADS.horizontal, car.y);
      const dir = random() < 0.5 ? 1 : -1;
      car.axis = 'y';
      car.road = cross;
      car.dir = dir;
      car.y = cross + (dir === 1 ? ROADS.lane : -ROADS.lane);
      car.angle = dir === 1 ? 0 : Math.PI;
    } else {
      const cross = nearestRoadLine(ROADS.vertical, car.x);
      const dir = random() < 0.5 ? 1 : -1;
      car.axis = 'x';
      car.road = cross;
      car.dir = dir;
      car.x = cross + (dir === 1 ? ROADS.lane : -ROADS.lane);
      car.angle = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
    }
  }
}

export function stepTraffic(cars, dt, random) {
  for (const car of cars) stepTrafficCar(car, cars, dt, random);
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) separateCars(cars[i], cars[j]);
  }
}
