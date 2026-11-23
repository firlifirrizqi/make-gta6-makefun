// The renderer: paints Teluk Cahaya from the camera, then the HUD, then the
// screens (title, paused, busted, wasted). The world is drawn top-down in
// warm daylight: grass, sidewalks and asphalt, rooftops with a south-east
// shadow, parks, the beach and the bay, lamps and trees, then every car,
// person, bullet and particle, and a pulsing marker over the mission goal.

import { PALETTE, ROADS, VIEW, WORLD } from './config.js';
import { BEACH_X, WATER_X } from './city.js';
import { drawHUD } from './hud.js';
import { currentObjective } from './missions.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCarShape(ctx, car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.fillRect(-car.length / 2 + 3, -car.width / 2 + 4, car.length, car.width);
  // Body.
  ctx.fillStyle = car.color;
  roundRect(ctx, -car.length / 2, -car.width / 2, car.length, car.width, 7);
  ctx.fill();
  // Roof and windshield.
  ctx.fillStyle = 'rgba(20, 28, 40, 0.85)';
  ctx.fillRect(-6, -car.width / 2 + 4, 14, car.width - 8);
  ctx.fillStyle = 'rgba(180, 220, 255, 0.7)';
  ctx.fillRect(10, -car.width / 2 + 5, 6, car.width - 10);
  // Headlights.
  ctx.fillStyle = '#fff8c0';
  ctx.fillRect(car.length / 2 - 2, -car.width / 2 + 2, 2, 5);
  ctx.fillRect(car.length / 2 - 2, car.width / 2 - 7, 2, 5);
  if (car.brakeLight) {
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-car.length / 2, -car.width / 2 + 2, 3, 5);
    ctx.fillRect(-car.length / 2, car.width / 2 - 7, 3, 5);
  }
  // Police livery and light bar.
  if (car.kind === 'police') {
    ctx.fillStyle = '#f5f1e6';
    ctx.fillRect(-10, -car.width / 2, 20, car.width);
    ctx.fillStyle = '#2b3a67';
    ctx.font = '700 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLISI', 0, 3);
    const flash = Math.floor(performance.now() / 260) % 2 === 0;
    ctx.fillStyle = flash ? '#ff3b30' : '#3b82ff';
    ctx.fillRect(-4, -car.width / 2 - 3, 4, 4);
    ctx.fillStyle = flash ? '#3b82ff' : '#ff3b30';
    ctx.fillRect(0, -car.width / 2 - 3, 4, 4);
  }
  // A yellow ring marks the mission's target car.
  if (car.target) {
    ctx.strokeStyle = '#ffd23f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 36 + Math.sin(performance.now() / 300) * 4, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, radius, down, hurt) {
  ctx.save();
  ctx.translate(x, y);
  if (down > 0) {
    ctx.rotate(Math.PI / 2);
    ctx.globalAlpha = 0.85;
  }
  // Shadow.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.beginPath();
  ctx.ellipse(2, 3, radius, radius * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body.
  ctx.fillStyle = hurt > 0 ? '#ff8a80' : shirt;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  // Head.
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(Math.cos(angle) * 3, Math.sin(angle) * 3, radius * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function drawWorld(state) {
    const cam = state.camera;
    const left = cam.x - VIEW.width / 2;
    const top = cam.y - VIEW.height / 2;
    ctx.save();
    ctx.clearRect(0, 0, VIEW.width, VIEW.height);
    ctx.translate(-Math.round(left), -Math.round(top));
    const viewLeft = left - 60;
    const viewTop = top - 60;
    const viewRight = left + VIEW.width + 60;
    const viewBottom = top + VIEW.height + 60;
    const inView = (x, y, w, h) => x + w > viewLeft && x < viewRight && y + h > viewTop && y < viewBottom;
    // Grass base.
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(left - 10, top - 10, VIEW.width + 20, VIEW.height + 20);
    // Mown stripes for a little texture.
    ctx.fillStyle = PALETTE.grassDark;
    const stripe = 120;
    for (let y = Math.floor(top / stripe) * stripe; y < top + VIEW.height + stripe; y += stripe * 2) {
      ctx.fillRect(left - 10, y, VIEW.width + 20, stripe);
    }
    // Beach and bay.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(BEACH_X, top - 10, WATER_X - BEACH_X, VIEW.height + 20);
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(WATER_X, top - 10, WORLD.width - WATER_X + 20, VIEW.height + 20);
    ctx.fillStyle = PALETTE.waterDeep;
    for (let y = Math.floor(top / 90) * 90; y < top + VIEW.height + 90; y += 90) {
      ctx.fillRect(WATER_X + 30, y, 60, 4);
      ctx.fillRect(WATER_X + 140, y + 45, 80, 4);
    }
    // Parks.
    for (const park of state.city.parks) {
      if (!inView(park.x, park.y, park.w, park.h)) continue;
      ctx.fillStyle = PALETTE.park;
      ctx.fillRect(park.x, park.y, park.w, park.h);
    }
    // Sidewalks (pale) under the asphalt (dark).
    for (const rx of ROADS.vertical) {
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(rx - ROADS.width / 2 - 14, top - 10, ROADS.width + 28, VIEW.height + 20);
    }
    for (const ry of ROADS.horizontal) {
      ctx.fillStyle = PALETTE.sidewalk;
      ctx.fillRect(left - 10, ry - ROADS.width / 2 - 14, VIEW.width + 20, ROADS.width + 28);
    }
    for (const rx of ROADS.vertical) {
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(rx - ROADS.width / 2, top - 10, ROADS.width, VIEW.height + 20);
    }
    for (const ry of ROADS.horizontal) {
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(left - 10, ry - ROADS.width / 2, VIEW.width + 20, ROADS.width);
    }
    // Dashed centre lines.
    ctx.fillStyle = PALETTE.roadLine;
    for (const rx of ROADS.vertical) {
      for (let y = Math.floor(top / 56) * 56; y < top + VIEW.height + 56; y += 56) {
        ctx.fillRect(rx - 2, y, 4, 28);
      }
    }
    for (const ry of ROADS.horizontal) {
      for (let x = Math.floor(left / 56) * 56; x < left + VIEW.width + 56; x += 56) {
        ctx.fillRect(x, ry - 2, 28, 4);
      }
    }
    // Buildings with a south-east shadow and a lighter roof edge.
    for (const b of state.city.buildings) {
      if (!inView(b.x, b.y, b.w, b.h)) continue;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.fillRect(b.x + 6, b.y + 7, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
      ctx.fillRect(b.x, b.y, b.w, 6);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      ctx.fillRect(b.x, b.y + b.h - 6, b.w, 6);
      // Rooftop details: a vent and a skylight.
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(b.x + b.w * 0.2, b.y + b.h * 0.25, 14, 10);
      ctx.fillStyle = 'rgba(180, 220, 255, 0.5)';
      ctx.fillRect(b.x + b.w * 0.6, b.y + b.h * 0.55, 18, 12);
    }
    // Trees.
    for (const tree of state.city.trees) {
      if (!inView(tree.x - tree.r, tree.y - tree.r, tree.r * 2, tree.r * 2)) continue;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(tree.x + 3, tree.y + 4, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.tree;
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, tree.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PALETTE.treeLight;
      ctx.beginPath();
      ctx.arc(tree.x - tree.r * 0.25, tree.y - tree.r * 0.25, tree.r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    // Lamps.
    ctx.fillStyle = '#5a5148';
    for (const lamp of state.city.lamps) {
      if (!inView(lamp.x - 4, lamp.y - 4, 8, 8)) continue;
      ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
    }
    // Pickups: cash and food.
    for (const pickup of state.pickups) {
      if (pickup.taken || !inView(pickup.x - 20, pickup.y - 20, 40, 40)) continue;
      const bob = Math.sin(state.time * 4 + pickup.x) * 3;
      ctx.save();
      ctx.translate(pickup.x, pickup.y + bob);
      ctx.fillStyle = pickup.kind === 'cash' ? PALETTE.gold : '#ff9d5c';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#1a1a1a';
      ctx.font = '700 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pickup.kind === 'cash' ? '$' : '+', 0, 1);
      ctx.restore();
    }
    // Mission marker: a pulsing ring and a bouncing arrow over the goal.
    const marker = state.missionMarker;
    const objective = currentObjective(state);
    if (marker && objective) {
      const pulse = 26 + Math.sin(state.time * 5) * 6;
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 210, 63, 0.18)';
      ctx.beginPath();
      ctx.arc(marker.x, marker.y, pulse, 0, Math.PI * 2);
      ctx.fill();
      const arrowY = marker.y - 52 + Math.sin(state.time * 4) * 6;
      ctx.fillStyle = '#ffd23f';
      ctx.beginPath();
      ctx.moveTo(marker.x, arrowY + 14);
      ctx.lineTo(marker.x - 10, arrowY - 4);
      ctx.lineTo(marker.x + 10, arrowY - 4);
      ctx.closePath();
      ctx.fill();
    }
    // Cars: parked and traffic first, then the player's car, then police.
    for (const car of state.cars) {
      if (inView(car.x - 40, car.y - 40, 80, 80)) drawCarShape(ctx, car);
    }
    for (const car of state.traffic) {
      if (inView(car.x - 40, car.y - 40, 80, 80)) drawCarShape(ctx, car);
    }
    if (state.player.car && inView(state.player.car.x - 40, state.player.car.y - 40, 80, 80)) {
      drawCarShape(ctx, state.player.car);
    }
    for (const car of state.police) {
      if (inView(car.x - 40, car.y - 40, 80, 80)) drawCarShape(ctx, car);
    }
    // Pedestrians.
    for (const ped of state.peds) {
      if (inView(ped.x - 16, ped.y - 16, 32, 32)) {
        drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, 10, ped.down, 0);
      }
    }
    // Enemies, with a health bar when hurt.
    for (const enemy of state.enemies) {
      if (!inView(enemy.x - 20, enemy.y - 20, 40, 40)) continue;
      drawPerson(ctx, enemy.x, enemy.y, enemy.angle, '#8e2f2f', 12, 0, enemy.hurtTimer);
      if (enemy.health < 100) {
        ctx.fillStyle = '#3a1512';
        ctx.fillRect(enemy.x - 18, enemy.y - 24, 36, 5);
        ctx.fillStyle = '#ff5252';
        ctx.fillRect(enemy.x - 18, enemy.y - 24, 36 * (enemy.health / 100), 5);
      }
    }
    // The player on foot.
    const player = state.player;
    if (player.onFoot && inView(player.x - 20, player.y - 20, 40, 40)) {
      drawPerson(ctx, player.x, player.y, player.angle, PALETTE.playerShirt, 13, 0, player.hurtTimer);
      // A white ring so Raka is easy to find in a crowd.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Bullets and the muzzle flash.
    ctx.fillStyle = '#ffe27a';
    for (const bullet of state.bullets) {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    if (state.muzzle > 0 && player.onFoot) {
      ctx.fillStyle = 'rgba(255, 226, 122, 0.8)';
      ctx.beginPath();
      ctx.arc(player.x + Math.cos(player.angle) * 26, player.y + Math.sin(player.angle) * 26, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    // Particles.
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    // Skid marks under a drifting car.
    if (player.car && player.car.skid > 0) {
      ctx.strokeStyle = 'rgba(20, 20, 20, 0.4)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(player.car.x - Math.cos(player.car.angle) * 24, player.car.y - Math.sin(player.car.angle) * 24);
      ctx.lineTo(player.car.x, player.car.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function overlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(10, 14, 20, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = accent;
    ctx.font = '700 52px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW.width / 2, 300);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '18px system-ui, sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 350 + i * 30));
  }

  function drawTitle(state, hasSave, best) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(10, 14, 20, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 76px system-ui, sans-serif';
    ctx.fillText('TELUK CAHAYA', VIEW.width / 2, 220);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('Kota terbuka di tepi teluk — curi mobil, kabur dari polisi, selesaikan misinya.', VIEW.width / 2, 262);
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText('Raka butuh uang. Nadia punya pekerjaan. Tiga misi, satu kota, dan polisi di setiap sudut.', VIEW.width / 2, 292);
    const boxW = 520;
    const boxX = (VIEW.width - boxW) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(boxX, 330, boxW, 190);
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.strokeRect(boxX + 0.5, 330.5, boxW - 1, 189);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '15px system-ui, sans-serif';
    const controls = [
      'WASD / Panah — jalan kaki & mengemudi',
      'E — masuk / keluar mobil      F — pukul',
      'Klik mouse — tembak (setelah dapat pistol)',
      'P — jeda      G — simpan      M — bisu',
    ];
    controls.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 362 + i * 28));
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText(hasSave ? 'Tekan Spasi — Lanjutkan / Mulai Baru' : 'Tekan Spasi atau Klik untuk Mulai', VIEW.width / 2, 560);
    if (best > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '15px system-ui, sans-serif';
      ctx.fillText(`Uang terbanyak yang pernah dibawa pulang: $${best}`, VIEW.width / 2, 592);
    }
    ctx.fillStyle = 'rgba(245, 241, 230, 0.6)';
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText('Game orisinal — kota, tokoh, dan cerita buatan sendiri. Bukan GTA.', VIEW.width / 2, 640);
  }

  function drawPaused(state) {
    drawWorld(state);
    drawHUD(ctx, state);
    overlay('JEDA', ['Tekan P atau Spasi untuk lanjut main.', 'G — simpan progres.  M — bisu / nyalakan suara.'], PALETTE.text);
  }

  function drawBusted(state) {
    drawWorld(state);
    overlay('TERTANGKAP!', [`Polisi menangkap Raka. Kamu kehilangan $${Math.floor(state.player.money * 0.2)} dari uangmu.`, 'Tekan Enter untuk bangun di Rumah Lentera dan coba lagi.'], PALETTE.danger);
  }

  function drawWasted(state) {
    drawWorld(state);
    overlay('KAMU TEWAS', ['Raka tumbang di jalanan Teluk Cahaya.', 'Tekan Enter untuk bangun di Rumah Lentera dan coba lagi.'], PALETTE.danger);
  }

  return {
    draw(state, screen, hasSave, best) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.textBaseline = 'alphabetic';
      if (screen === SCREEN_TITLE) {
        drawTitle(state, hasSave, best);
        return;
      }
      if (screen === SCREEN_PAUSED) {
        drawPaused(state);
        return;
      }
      if (screen === SCREEN_BUSTED) {
        drawBusted(state);
        return;
      }
      if (screen === SCREEN_WASTED) {
        drawWasted(state);
        return;
      }
      drawWorld(state);
      drawHUD(ctx, state);
    },
  };
}
