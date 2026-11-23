// Combat: Raka's fists, his pistol (Nadia gives it to him in mission two),
// the street thugs who guard the stolen car, and the bullets between them.
// Enemies chase the player on foot and punch; they never follow him into a
// car. A hit enemy flashes and is knocked back; a dead one drops cash.

import { PLAYER } from './config.js';
import { addWanted } from './police.js';
import { damagePlayer } from './player.js';
import { moveCircle } from './city.js';

export function createEnemy(x, y) {
  return {
    x, y,
    angle: 0,
    health: 100,
    speed: 165,
    punchCooldown: 0,
    hurtTimer: 0,
    dead: false,
    dropTimer: 0,
  };
}

/** Raka punches in the direction he faces. Returns the enemy hit, if any. */
export function playerPunch(state) {
  const player = state.player;
  if (!player.onFoot || player.punchCooldown > 0) return null;
  player.punchCooldown = PLAYER.punchCooldown;
  state.audio.punch();
  spawnPunchParticles(state, player.x + Math.cos(player.angle) * 26, player.y + Math.sin(player.angle) * 26);
  let hit = null;
  for (const enemy of state.enemies) {
    if (enemy.dead) continue;
    const d = Math.hypot(enemy.x - player.x, enemy.y - player.y);
    if (d < PLAYER.punchRange) {
      const facing = Math.cos(Math.atan2(enemy.y - player.y, enemy.x - player.x) - player.angle);
      if (facing > 0.2 || d < 24) {
        hit = enemy;
        hurtEnemy(state, enemy, PLAYER.punchDamage, player.angle);
      }
    }
  }
  return hit;
}

function hurtEnemy(state, enemy, damage, angle) {
  enemy.health -= damage;
  enemy.hurtTimer = 0.25;
  enemy.x += Math.cos(angle) * 14;
  enemy.y += Math.sin(angle) * 14;
  spawnBloodParticles(state, enemy.x, enemy.y);
  if (enemy.health <= 0 && !enemy.dead) {
    enemy.dead = true;
    enemy.dropTimer = 0.4;
    state.player.money += 40;
    state.audio.pickup();
  }
}

/** Raka fires his pistol at a world point. Returns true when a shot went out. */
export function playerShoot(state, targetX, targetY) {
  const player = state.player;
  if (!player.onFoot || !player.hasPistol || player.shootCooldown > 0) return false;
  player.shootCooldown = 0.28;
  const angle = Math.atan2(targetY - player.y, targetX - player.x);
  player.angle = angle;
  state.bullets.push({
    x: player.x + Math.cos(angle) * 20,
    y: player.y + Math.sin(angle) * 20,
    vx: Math.cos(angle) * PLAYER.bulletSpeed,
    vy: Math.sin(angle) * PLAYER.bulletSpeed,
    life: 0.8,
  });
  state.audio.shoot();
  state.muzzle = 0.06;
  addWanted(state, 1);
  return true;
}

export function stepBullets(state, dt) {
  for (const bullet of state.bullets) {
    bullet.x += bullet.vx * dt;
    bullet.y += bullet.vy * dt;
    bullet.life -= dt;
    if (bullet.life <= 0) continue;
    for (const enemy of state.enemies) {
      if (enemy.dead) continue;
      if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < 20) {
        bullet.life = 0;
        hurtEnemy(state, enemy, PLAYER.shootDamage, Math.atan2(bullet.vy, bullet.vx));
        break;
      }
    }
  }
  state.bullets = state.bullets.filter((b) => b.life > 0);
  state.muzzle = Math.max(0, state.muzzle - dt);
}

/** Step every living enemy: chase the player on foot and punch when close. */
export function stepEnemies(state, dt) {
  const player = state.player;
  for (const enemy of state.enemies) {
    if (enemy.dead) {
      enemy.dropTimer -= dt;
      continue;
    }
    enemy.punchCooldown = Math.max(0, enemy.punchCooldown - dt);
    enemy.hurtTimer = Math.max(0, enemy.hurtTimer - dt);
    if (!player.onFoot) continue;
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 520) continue;
    enemy.angle = Math.atan2(dy, dx);
    if (dist > 34) {
      const moved = moveCircle(state.city, enemy.x, enemy.y, (dx / dist) * enemy.speed * dt, (dy / dist) * enemy.speed * dt, 13);
      enemy.x = moved.x;
      enemy.y = moved.y;
    } else if (enemy.punchCooldown <= 0) {
      enemy.punchCooldown = 0.9;
      state.audio.punch();
      spawnPunchParticles(state, player.x, player.y);
      if (damagePlayer(player, 10)) state.wasted = true;
    }
  }
  state.enemies = state.enemies.filter((e) => !e.dead || e.dropTimer > 0);
}

export function spawnPunchParticles(state, x, y) {
  for (let i = 0; i < 8; i += 1) {
    state.particles.push({
      x, y,
      vx: (state.random() - 0.5) * 260,
      vy: (state.random() - 0.5) * 260,
      life: 0.35,
      maxLife: 0.35,
      color: '#ffd23f',
      size: 3,
    });
  }
}

export function spawnBloodParticles(state, x, y) {
  for (let i = 0; i < 10; i += 1) {
    state.particles.push({
      x, y,
      vx: (state.random() - 0.5) * 220,
      vy: (state.random() - 0.5) * 220,
      life: 0.45,
      maxLife: 0.45,
      color: '#e5534b',
      size: 3,
    });
  }
}

export function spawnCrashParticles(state, x, y) {
  for (let i = 0; i < 12; i += 1) {
    state.particles.push({
      x, y,
      vx: (state.random() - 0.5) * 300,
      vy: (state.random() - 0.5) * 300,
      life: 0.5,
      maxLife: 0.5,
      color: '#ffb347',
      size: 4,
    });
  }
}

export function stepParticles(state, dt) {
  for (const p of state.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.92;
    p.vy *= 0.92;
    p.life -= dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
}
