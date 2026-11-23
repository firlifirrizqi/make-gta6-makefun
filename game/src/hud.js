// The HUD: health bar, cash, wanted stars, the in-game clock, the current
// mission objective, dialogue from Nadia and Raka, banners, and the minimap.
// Everything is drawn in the logical 1280x800 view, so it scales with the window.

import { PALETTE, VIEW } from './config.js';
import { MISSION_TITLES, currentObjective } from './missions.js';
import { drawMinimap } from './minimap.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

function formatClock(minutes) {
  const total = Math.floor(minutes);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function drawStars(ctx, x, y, wanted, flash) {
  ctx.font = '22px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < 5; i += 1) {
    const lit = i < wanted;
    ctx.fillStyle = lit ? (flash ? '#ff8a80' : '#ffd23f') : 'rgba(245, 241, 230, 0.25)';
    ctx.fillText('★', x + i * 26, y);
  }
}

export function drawHUD(ctx, state) {
  const player = state.player;
  ctx.textBaseline = 'alphabetic';
  // Top-left: health and cash.
  panel(ctx, 16, 14, 250, 64);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('RAKA', 28, 34);
  ctx.fillStyle = '#3a1512';
  ctx.fillRect(28, 42, 200, 12);
  const healthFrac = Math.max(0, player.health / 100);
  ctx.fillStyle = healthFrac > 0.5 ? PALETTE.ok : healthFrac > 0.25 ? '#ffb347' : PALETTE.danger;
  ctx.fillRect(28, 42, 200 * healthFrac, 12);
  ctx.strokeStyle = 'rgba(245,241,230,0.4)';
  ctx.strokeRect(28.5, 42.5, 200, 12);
  ctx.fillStyle = PALETTE.gold;
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.fillText(`$${player.money}`, 28, 72);
  // Pistol hint on its own pill under the panel, so it never overlaps the cash.
  if (player.hasPistol) {
    ctx.fillStyle = 'rgba(16, 20, 28, 0.65)';
    ctx.fillRect(16, 86, 232, 22);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText('Pistol siap — klik untuk menembak', 26, 101);
  }
  // Top-right: wanted stars on the first row, clock beside them; the status
  // line sits on its own row below, so nothing overlaps the stars.
  panel(ctx, VIEW.width - 266, 14, 250, 64);
  drawStars(ctx, VIEW.width - 254, 34, player.wanted, state.wantedFlash > 0);
  ctx.fillStyle = PALETTE.text;
  ctx.font = '700 16px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(formatClock(state.clockMinutes), VIEW.width - 28, 40);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(player.wanted > 0 ? 'POLISI MENGEJAR!' : 'Teluk Cahaya', VIEW.width - 254, 66);
  // Top-centre: the current objective.
  const objective = currentObjective(state);
  if (objective) {
    const label = `${MISSION_TITLES[state.mission.index]}  •  ${objective.label}`;
    ctx.font = '700 14px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 28;
    panel(ctx, (VIEW.width - w) / 2, 14, w, 34);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(label, VIEW.width / 2, 37);
  } else if (state.mission.allDone) {
    const label = 'Cerita selesai — Teluk Cahaya milikmu. Jelajahi kotanya!';
    ctx.font = '700 14px system-ui, sans-serif';
    const w = ctx.measureText(label).width + 28;
    panel(ctx, (VIEW.width - w) / 2, 14, w, 34);
    ctx.fillStyle = PALETTE.gold;
    ctx.textAlign = 'center';
    ctx.fillText(label, VIEW.width / 2, 37);
  }
  // Bottom-right: the minimap.
  drawMinimap(ctx, state, VIEW.width - 236, VIEW.height - 186, 220, 170);
  // Bottom-left: controls, fading out once the player has played a while.
  if (state.time < 25) {
    ctx.fillStyle = 'rgba(16, 20, 28, 0.65)';
    ctx.fillRect(16, VIEW.height - 100, 330, 84);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('WASD / Panah — jalan & mengemudi', 26, VIEW.height - 78);
    ctx.fillText('E — masuk / keluar mobil    F — pukul', 26, VIEW.height - 58);
    ctx.fillText('Klik — tembak (pistol)    P — jeda', 26, VIEW.height - 38);
    ctx.fillText('G — simpan    M — bisu', 26, VIEW.height - 18);
  }
  // Centre banner (mission title, rewards).
  if (state.mission.banner) {
    ctx.font = '700 30px system-ui, sans-serif';
    const w = ctx.measureText(state.mission.banner).width + 40;
    const alpha = Math.min(1, state.mission.bannerTimer);
    ctx.save();
    ctx.globalAlpha = alpha;
    panel(ctx, (VIEW.width - w) / 2, 120, w, 52);
    ctx.fillStyle = PALETTE.gold;
    ctx.textAlign = 'center';
    ctx.fillText(state.mission.banner, VIEW.width / 2, 156);
    ctx.restore();
  }
  // Busted warning while a police car pins the player.
  if (player.bustedTimer > 0.4 && player.onFoot) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, player.bustedTimer);
    ctx.fillStyle = PALETTE.danger;
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('POLISI MENANGKAPMU — LARI!', VIEW.width / 2, 220);
    ctx.restore();
  }
  // Dialogue box.
  const dialog = state.mission.dialogActive;
  if (dialog) {
    const boxW = 760;
    const boxH = 96;
    const boxX = (VIEW.width - boxW) / 2;
    const boxY = VIEW.height - boxH - 18;
    panel(ctx, boxX, boxY, boxW, boxH);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = '700 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(dialog.who.toUpperCase(), boxX + 20, boxY + 26);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '15px system-ui, sans-serif';
    wrapText(ctx, dialog.text, boxX + 20, boxY + 50, boxW - 40, 20);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('E / klik — lanjut', boxX + boxW - 16, boxY + boxH - 12);
  }
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, lineY);
}
