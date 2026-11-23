// The city of Teluk Cahaya: a grid of roads around blocks of buildings and
// parks, a beach and a bay along the east edge, lamps and trees. Everything
// is generated once from the seed, then read by the traffic, pedestrians,
// police and renderer. Collision is circle-vs-building-rectangle, resolved
// one axis at a time so a car slides along a wall instead of sticking.

import { PALETTE, ROADS, WORLD } from './config.js';
import { pickRandom, rangeRandom } from './random.js';

export const WATER_X = 3360;
export const BEACH_X = 3280;

function blockBounds(col, row) {
  const x0 = ROADS.vertical[col] + ROADS.width / 2 + 14;
  const x1 = ROADS.vertical[col + 1] - ROADS.width / 2 - 14;
  const y0 = ROADS.horizontal[row] + ROADS.width / 2 + 14;
  const y1 = ROADS.horizontal[row + 1] - ROADS.width / 2 - 14;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

export function buildCity(random) {
  const buildings = [];
  const parks = [];
  const trees = [];
  const lamps = [];
  const cols = ROADS.vertical.length - 1;
  const rows = ROADS.horizontal.length - 1;
  for (let col = 0; col < cols; col += 1) {
    for (let row = 0; row < rows; row += 1) {
      const block = blockBounds(col, row);
      // A few blocks are parks instead of buildings.
      if ((col + row * 2) % 5 === 2) {
        parks.push({ x: block.x, y: block.y, w: block.w, h: block.h });
        const treeCount = 6 + Math.floor(random() * 5);
        for (let i = 0; i < treeCount; i += 1) {
          trees.push({
            x: block.x + 20 + random() * (block.w - 40),
            y: block.y + 20 + random() * (block.h - 40),
            r: 9 + random() * 6,
          });
        }
        continue;
      }
      const count = random() < 0.5 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const bw = count === 1 ? block.w * (0.55 + random() * 0.2) : block.w * 0.42;
        const bh = count === 1 ? block.h * (0.5 + random() * 0.25) : block.h * 0.42;
        const bx = count === 1
          ? block.x + (block.w - bw) / 2
          : block.x + (i === 0 ? 4 : block.w - bw - 4);
        const by = count === 1
          ? block.y + (block.h - bh) / 2
          : block.y + (i === 0 ? 4 : block.h - bh - 4);
        buildings.push({
          x: bx,
          y: by,
          w: bw,
          h: bh,
          color: pickRandom(random, PALETTE.buildingRoof),
          height: 14 + random() * 26,
        });
      }
      // A street tree on the block corner.
      trees.push({
        x: block.x + 16 + random() * 20,
        y: block.y + 16 + random() * 20,
        r: 8 + random() * 4,
      });
    }
  }
  // Lamps at every intersection corner.
  for (const rx of ROADS.vertical) {
    for (const ry of ROADS.horizontal) {
      lamps.push({ x: rx + ROADS.width / 2 + 6, y: ry + ROADS.width / 2 + 6 });
      lamps.push({ x: rx - ROADS.width / 2 - 6, y: ry - ROADS.width / 2 - 6 });
    }
  }
  return { buildings, parks, trees, lamps };
}

/** True when the circle at (x, y) with radius r overlaps a building, the bay, or the map edge. */
export function circleHitsSolid(city, x, y, r) {
  if (x - r < 8 || y - r < 8 || x + r > WORLD.width - 8 || y + r > WORLD.height - 8) return true;
  if (x + r > WATER_X) return true;
  for (let i = 0; i < city.buildings.length; i += 1) {
    const b = city.buildings[i];
    if (x + r > b.x && x - r < b.x + b.w && y + r > b.y && y - r < b.y + b.h) return true;
  }
  return false;
}

/**
 * Move a circle one axis at a time: try the full step, then x only, then y
 * only, so it slides along walls. When the circle already overlaps a wall
 * (another car pushed it there), nudge it out first, a little at a time, so
 * it never sits wedged in a gap narrower than itself.
 */
export function moveCircle(city, x, y, dx, dy, r) {
  if (circleHitsSolid(city, x, y, r)) {
    for (const [ox, oy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      let nx = x;
      let ny = y;
      for (let i = 0; i < 40; i += 1) {
        nx += ox * 2;
        ny += oy * 2;
        if (!circleHitsSolid(city, nx, ny, r)) return { x: nx, y: ny, hit: true };
      }
    }
    return { x, y, hit: true };
  }
  let hit = false;
  let nx = x + dx;
  let ny = y + dy;
  if (!circleHitsSolid(city, nx, ny, r)) return { x: nx, y: ny, hit: false };
  if (!circleHitsSolid(city, nx, y, r)) return { x: nx, y, hit: true };
  if (!circleHitsSolid(city, x, ny, r)) return { x, y: ny, hit: true };
  return { x, y, hit: true };
}

/** True when the point is on a road (asphalt, not sidewalk or block). */
export function isOnRoad(x, y) {
  const half = ROADS.width / 2;
  for (const rx of ROADS.vertical) if (Math.abs(x - rx) <= half) return true;
  for (const ry of ROADS.horizontal) if (Math.abs(y - ry) <= half) return true;
  return false;
}

/** The nearest road centre line to a point, used to snap pedestrians onto sidewalks. */
export function nearestRoad(x, y) {
  let best = null;
  let bestDist = Infinity;
  for (const rx of ROADS.vertical) {
    const d = Math.abs(x - rx);
    if (d < bestDist) {
      bestDist = d;
      best = { axis: 'x', at: rx, along: y };
    }
  }
  for (const ry of ROADS.horizontal) {
    const d = Math.abs(y - ry);
    if (d < bestDist) {
      bestDist = d;
      best = { axis: 'y', at: ry, along: x };
    }
  }
  return best;
}

/** A point on a road near (x, y), for spawning cars and police. */
export function roadPointNear(x, y, random) {
  const road = nearestRoad(x, y);
  if (!road) return { x, y };
  const offset = (random() < 0.5 ? -1 : 1) * ROADS.lane;
  if (road.axis === 'x') return { x: road.at + offset, y: Math.max(80, Math.min(WORLD.height - 80, y)) };
  return { x: Math.max(80, Math.min(WORLD.width - 80, x)), y: road.at + offset };
}
