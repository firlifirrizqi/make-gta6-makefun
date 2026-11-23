// The player on foot: Raka, a young driver of Teluk Cahaya. He walks the
// sidewalks, runs when the player holds a direction, and slides along walls
// the same way cars do. Health regrows slowly after a few calm seconds.

import { PALETTE, PLAYER } from './config.js';
import { moveCircle } from './city.js';

export function createPlayer(x, y) {
  return {
    x, y,
    angle: 0,
    health: PLAYER.maxHealth,
    money: 50,
    wanted: 0,
    onFoot: true,
    car: null,
    hasPistol: false,
    punchCooldown: 0,
    shootCooldown: 0,
    hurtTimer: 0,
    calmTimer: 0,
    bustedTimer: 0,
    moving: false,
    running: false,
  };
}

/** Step the player on foot for dt seconds from a movement vector. */
export function stepOnFoot(player, move, dt, city) {
  const speed = PLAYER.walkSpeed;
  const dx = move.x * speed * dt;
  const dy = move.y * speed * dt;
  player.moving = dx !== 0 || dy !== 0;
  if (player.moving) player.angle = Math.atan2(dy, dx);
  const moved = moveCircle(city, player.x, player.y, dx, dy, PLAYER.radius);
  player.x = moved.x;
  player.y = moved.y;
  player.punchCooldown = Math.max(0, player.punchCooldown - dt);
  player.shootCooldown = Math.max(0, player.shootCooldown - dt);
  player.hurtTimer = Math.max(0, player.hurtTimer - dt);
  // Health regrows after 5 calm seconds.
  if (player.hurtTimer <= 0) {
    player.calmTimer += dt;
    if (player.calmTimer > 5 && player.health < PLAYER.maxHealth) {
      player.health = Math.min(PLAYER.maxHealth, player.health + 3 * dt);
    }
  } else {
    player.calmTimer = 0;
  }
}

/** Hurt the player by `amount` and restart the calm timer. Returns true when he dies. */
export function damagePlayer(player, amount) {
  player.health -= amount;
  player.hurtTimer = 1.2;
  player.calmTimer = 0;
  return player.health <= 0;
}

/** Heal the player, never past full health. */
export function healPlayer(player, amount) {
  player.health = Math.min(PLAYER.maxHealth, player.health + amount);
}

export function playerColor() {
  return PALETTE.player;
}
