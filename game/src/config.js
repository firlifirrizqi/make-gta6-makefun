// Every tuning number and colour in one place for Teluk Cahaya, an original
// sun-soaked bay city. The camera shows a 1280x800 logical view of a much
// larger world; no rule below depends on the window size.

export const VIEW = { width: 1280, height: 800 };

export const WORLD = { width: 3600, height: 2400 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

export const ROADS = {
  vertical: [300, 700, 1100, 1500, 1900, 2300, 2700, 3100],
  horizontal: [300, 700, 1100, 1500, 1900],
  width: 96,
  lane: 24,
};

export const PLAYER = {
  radius: 13,
  walkSpeed: 235,
  runSpeed: 300,
  maxHealth: 100,
  punchRange: 46,
  punchDamage: 34,
  punchCooldown: 0.38,
  shootDamage: 50,
  bulletSpeed: 920,
};

export const CAR = {
  accel: 430,
  brake: 620,
  reverseMax: 190,
  maxSpeed: 540,
  grip: 2.6,
  steerRate: 2.5,
  radius: 20,
};

export const TRAFFIC = { count: 14, speed: 150, speedJitter: 45 };
export const PEDESTRIANS = { count: 24, speed: 55, speedJitter: 25 };

export const POLICE = {
  maxCars: 5,
  chaseSpeed: 560,
  ramDamage: 6,
  bustedRadius: 52,
  bustedSeconds: 1.6,
};

export const WANTED = {
  stealCar: 1,
  hitPedestrian: 1,
  shootPublic: 1,
  killEnemy: 0,
  decayQuietSeconds: 18,
  decayStepSeconds: 9,
};

export const MISSIONS = { reward: [150, 300, 500] };

/** Where a save is kept between visits (this browser only). */
export const SAVE_KEY = 'teluk-cahaya.save.v1';
export const BEST_KEY = 'teluk-cahaya.best.v1';

export const PALETTE = {
  grass: '#7fae62',
  grassDark: '#74a158',
  sidewalk: '#c9bda6',
  road: '#3d3f45',
  roadLine: '#e8d44f',
  curb: '#9a8f78',
  water: '#3f8fd2',
  waterDeep: '#2f74b8',
  sand: '#e6d29a',
  buildingRoof: ['#c96f4a', '#4a7fb5', '#b5a04a', '#7d5a9e', '#4a9e7d', '#b54a5a'],
  buildingWall: '#8d8578',
  park: '#5d9e4f',
  tree: '#2f7a3d',
  treeLight: '#4da34d',
  player: '#ffd23f',
  playerShirt: '#2f6fd2',
  police: '#2b3a67',
  policeLight: '#ff3b30',
  enemy: '#8e2f2f',
  pedShirt: ['#e07a5f', '#81b29a', '#f2cc8f', '#6d597a', '#e07a5f', '#3d8bfd'],
  text: '#f5f1e6',
  muted: '#c9c2ae',
  panel: 'rgba(16, 20, 28, 0.82)',
  panelEdge: 'rgba(245, 241, 230, 0.25)',
  gold: '#ffd23f',
  danger: '#ff5252',
  ok: '#7ddb8a',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_BOLD = '700 16px system-ui, -apple-system, "Segoe UI", sans-serif';
