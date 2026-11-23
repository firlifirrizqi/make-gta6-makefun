// The story of Teluk Cahaya: Raka, a young driver who needs money fast,
// and Nadia, who runs jobs out of a noodle stall by the bay. Three jobs,
// one after another, each with its own objectives, dialogue and pay. The
// mission system only tracks objectives and rewards; the world does the rest.

import { MISSIONS } from './config.js';
import { makeCar } from './vehicles.js';
import { createEnemy } from './combat.js';
import { addWanted } from './police.js';

export const STORY = {
  hero: 'Raka',
  contact: 'Nadia',
  city: 'Teluk Cahaya',
  intro: 'Raka baru sebulan di Teluk Cahaya. Uang tinggal lima puluh dolar, dan Nadia — pemilik warung mi di dermaga — punya pekerjaan untuknya.',
};

const DIALOGS = {
  intro: [
    { who: 'Nadia', text: 'Raka! Kamu cari uang, kan? Aku punya kerjaan. Antar paket dulu, yang gampang-gampang.' },
    { who: 'Raka', text: 'Berapa bayarannya?' },
    { who: 'Nadia', text: 'Seratus lima puluh. Ambil paketnya di Warung Kopi Senja, antar ke Gedung Pelangi. Mobilmu sudah menunggu.' },
  ],
  mission2: [
    { who: 'Nadia', text: 'Bagus, Raka. Sekarang kerjaan beneran: ada mobil oranye di parkir Dermaga. Bawa ke Bengkel Jaya.' },
    { who: 'Raka', text: 'Mobil siapa itu?' },
    { who: 'Nadia', text: 'Bukan urusanmu. Hati-hati, ada preman yang jagain. Nih, pistol — jangan ditembak sembarangan.' },
  ],
  mission3: [
    { who: 'Nadia', text: 'Polisi sudah mengendusmu, Raka. Mereka mengejar. Pulang ke Rumah Lentera, sekarang!' },
    { who: 'Raka', text: 'Kalau mereka menangkapku?' },
    { who: 'Nadia', text: 'Jangan sampai ketangkap. Lari, Raka!' },
  ],
  done: [
    { who: 'Nadia', text: 'Kamu berhasil, Raka. Lima ratus dolar, dan polisi kehilangan jejakmu. Teluk Cahaya sekarang kotamu.' },
    { who: 'Raka', text: 'Baru permulaan. Aku masih di sini, Nadia.' },
  ],
};

function missionObjectives(index) {
  if (index === 0) {
    return [
      { type: 'goto', x: 1100, y: 1100, r: 70, label: 'Ambil paket di Warung Kopi Senja' },
      { type: 'goto', x: 2300, y: 700, r: 80, label: 'Antar paket ke Gedung Pelangi' },
    ];
  }
  if (index === 1) {
    return [
      { type: 'reach', x: 3100, y: 1500, r: 220, label: 'Datangi mobil oranye di Parkir Dermaga' },
      { type: 'enterCar', label: 'Curi mobil oranye itu' },
      { type: 'deliver', x: 700, y: 1500, r: 90, label: 'Bawa mobilnya ke Bengkel Jaya' },
    ];
  }
  return [
    { type: 'reach', x: 1900, y: 1900, r: 90, label: 'Kabur ke Rumah Lentera — jangan ketangkap!' },
  ];
}

export const MISSION_TITLES = [
  'Misi 1 — Kurir Kilat',
  'Misi 2 — Mobil Pesanan',
  'Misi 3 — Jalan Pulang',
];

export function createMissionState() {
  return {
    index: 0,
    stage: 0,
    objectives: missionObjectives(0),
    banner: null,
    bannerTimer: 0,
    dialog: [],
    dialogActive: null,
    enemiesSpawned: false,
    targetCar: null,
    allDone: false,
    started: false,
  };
}

/** Queue dialogue lines; the renderer shows the first until the player advances it. */
export function queueDialog(state, lines) {
  state.mission.dialog.push(...lines);
}

export function showBanner(state, text, seconds = 3) {
  state.mission.banner = text;
  state.mission.bannerTimer = seconds;
}

export function currentObjective(state) {
  if (state.mission.allDone) return null;
  return state.mission.objectives[state.mission.stage] ?? null;
}

export function missionMarker(state) {
  const objective = currentObjective(state);
  if (!objective || objective.x === undefined) {
    if (objective && objective.type === 'enterCar' && state.mission.targetCar) {
      return { x: state.mission.targetCar.x, y: state.mission.targetCar.y };
    }
    return null;
  }
  return { x: objective.x, y: objective.y };
}

function startMission(state, index) {
  state.mission.index = index;
  state.mission.stage = 0;
  state.mission.objectives = missionObjectives(index);
  state.mission.enemiesSpawned = false;
  state.mission.targetCar = null;
  if (index === 1) {
    state.player.hasPistol = true;
    queueDialog(state, DIALOGS.mission2);
    const car = makeCar(3100, 1470, Math.PI / 2, '#e8762a', 'parked');
    car.target = true;
    state.cars.push(car);
    state.mission.targetCar = car;
    state.enemies.push(createEnemy(3060, 1420));
    state.enemies.push(createEnemy(3140, 1560));
    state.mission.enemiesSpawned = true;
  } else if (index === 2) {
    queueDialog(state, DIALOGS.mission3);
    addWanted(state, 3);
  }
  showBanner(state, MISSION_TITLES[index], 3.5);
}

export function beginStory(state) {
  if (state.mission.started) return;
  state.mission.started = true;
  queueDialog(state, DIALOGS.intro);
  showBanner(state, MISSION_TITLES[0], 3.5);
}

/** Continue a saved game straight into mission `index`, without the intro. */
export function jumpToMission(state, index) {
  state.mission.started = true;
  startMission(state, index);
}

function completeMission(state) {
  const reward = MISSIONS.reward[state.mission.index];
  state.player.money += reward;
  state.audio.missionDone();
  showBanner(state, `Misi selesai! +$${reward}`, 3.5);
  const next = state.mission.index + 1;
  if (next >= MISSION_TITLES.length) {
    state.mission.allDone = true;
    queueDialog(state, DIALOGS.done);
    showBanner(state, 'TAMAT — Teluk Cahaya Milikmu!', 5);
    return;
  }
  startMission(state, next);
}

function objectiveDone(state, objective) {
  const player = state.player;
  if (objective.type === 'goto' || objective.type === 'reach' || objective.type === 'deliver') {
    const px = player.onFoot ? player.x : player.car.x;
    const py = player.onFoot ? player.y : player.car.y;
    if (objective.type === 'deliver' && player.onFoot) return false;
    return Math.hypot(px - objective.x, py - objective.y) < objective.r;
  }
  if (objective.type === 'enterCar') {
    return !player.onFoot && player.car === state.mission.targetCar;
  }
  return false;
}

/** Advance the story: check the current objective, pay out, start the next job. */
export function updateMission(state, dt) {
  state.mission.bannerTimer = Math.max(0, state.mission.bannerTimer - dt);
  if (state.mission.bannerTimer <= 0) state.mission.banner = null;
  if (state.mission.allDone) return;
  const objective = currentObjective(state);
  if (!objective) return;
  if (objectiveDone(state, objective)) {
    if (objective.type === 'goto' && state.mission.index === 0 && state.mission.stage === 0) {
      state.audio.pickup();
      showBanner(state, 'Paket didapat! Antar ke Gedung Pelangi.', 2.5);
    }
    state.mission.stage += 1;
    if (state.mission.stage >= state.mission.objectives.length) completeMission(state);
  }
}
