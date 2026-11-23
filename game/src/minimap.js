// The minimap: a small live map of Teluk Cahaya in the corner of the HUD.
// Roads, the bay, the player's car or feet, police, traffic and the yellow
// mission marker, all drawn from the same world the main view shows.

import { ROADS, WORLD } from './config.js';
import { BEACH_X, WATER_X } from './city.js';

export function drawMinimap(ctx, state, x, y, w, h) {
  const scaleX = w / WORLD.width;
  const scaleY = h / WORLD.height;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = 'rgba(20, 26, 20, 0.85)';
  ctx.fillRect(x, y, w, h);
  // Bay and beach.
  ctx.fillStyle = '#3f8fd2';
  ctx.fillRect(x + WATER_X * scaleX, y, w - WATER_X * scaleX, h);
  ctx.fillStyle = '#e6d29a';
  ctx.fillRect(x + BEACH_X * scaleX, y, (WATER_X - BEACH_X) * scaleX, h);
  // Roads.
  ctx.fillStyle = '#5a5e66';
  for (const rx of ROADS.vertical) ctx.fillRect(x + (rx - ROADS.width / 2) * scaleX, y, ROADS.width * scaleX, h);
  for (const ry of ROADS.horizontal) ctx.fillRect(x, y + (ry - ROADS.width / 2) * scaleY, w, ROADS.width * scaleY);
  // Parks.
  ctx.fillStyle = '#4d8a44';
  for (const park of state.city.parks) ctx.fillRect(x + park.x * scaleX, y + park.y * scaleY, park.w * scaleX, park.h * scaleY);
  // Buildings.
  ctx.fillStyle = '#8d8578';
  for (const b of state.city.buildings) ctx.fillRect(x + b.x * scaleX, y + b.y * scaleY, b.w * scaleX, b.h * scaleY);
  // Traffic dots.
  ctx.fillStyle = '#b9bec7';
  for (const car of state.traffic) {
    ctx.fillRect(x + car.x * scaleX - 1, y + car.y * scaleY - 1, 2.5, 2.5);
  }
  // Police dots, flashing red and blue.
  const flash = Math.floor(state.time * 4) % 2 === 0;
  ctx.fillStyle = flash ? '#ff5252' : '#5f8dff';
  for (const car of state.police) {
    ctx.beginPath();
    ctx.arc(x + car.x * scaleX, y + car.y * scaleY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Mission marker, pulsing yellow.
  const marker = state.missionMarker;
  if (marker) {
    const pulse = 3 + Math.sin(state.time * 5) * 1.5;
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.arc(x + marker.x * scaleX, y + marker.y * scaleY, pulse + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // The player, white with a dark ring, always on top.
  const px = state.player.onFoot ? state.player.x : state.player.car.x;
  const py = state.player.onFoot ? state.player.y : state.player.car.y;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + px * scaleX, y + py * scaleY, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
  // Frame and label.
  ctx.strokeStyle = 'rgba(245, 241, 230, 0.5)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#f5f1e6';
  ctx.font = '700 11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('TELUK CAHAYA', x + 6, y + 14);
}
