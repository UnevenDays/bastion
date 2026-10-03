import type { EnemyDef, TowerDef, TowerKind } from "./types";

export const COLS = 16;
export const ROWS = 10;
export const CELL = 48;

export const START_GOLD = 120;
export const START_LIVES = 20;
export const TOTAL_WAVES = 12;

export const MAX_UPGRADE = 3;
/** Normal path speed used by splitlings and baseline units. */
export const NORMAL_SPEED = 62;

/** Path as grid cell coordinates the enemies walk through. */
export const PATH: { col: number; row: number }[] = [
  { col: 0, row: 2 },
  { col: 1, row: 2 },
  { col: 2, row: 2 },
  { col: 3, row: 2 },
  { col: 4, row: 2 },
  { col: 4, row: 3 },
  { col: 4, row: 4 },
  { col: 4, row: 5 },
  { col: 5, row: 5 },
  { col: 6, row: 5 },
  { col: 7, row: 5 },
  { col: 8, row: 5 },
  { col: 8, row: 4 },
  { col: 8, row: 3 },
  { col: 8, row: 2 },
  { col: 9, row: 2 },
  { col: 10, row: 2 },
  { col: 11, row: 2 },
  { col: 11, row: 3 },
  { col: 11, row: 4 },
  { col: 11, row: 5 },
  { col: 11, row: 6 },
  { col: 11, row: 7 },
  { col: 12, row: 7 },
  { col: 13, row: 7 },
  { col: 14, row: 7 },
  { col: 15, row: 7 },
];

export const TOWER_DEFS: Record<TowerKind, TowerDef> = {
  archer: {
    kind: "archer",
    name: "Archer",
    cost: 50,
    range: 2.6,
    damage: 12,
    fireRate: 1.4,
    color: "#4a9b6e",
    projectileSpeed: 420,
    description: "Fast single-target shots",
  },
  cannon: {
    kind: "cannon",
    name: "Cannon",
    cost: 80,
    range: 2.2,
    damage: 35,
    fireRate: 0.55,
    color: "#c47a3a",
    projectileSpeed: 300,
    splash: 1.1,
    description: "Slow splash damage",
  },
  frost: {
    kind: "frost",
    name: "Frost",
    cost: 70,
    range: 2.4,
    damage: 8,
    fireRate: 1.0,
    color: "#5a9eb8",
    projectileSpeed: 360,
    slow: 0.45,
    slowDuration: 1.6,
    description: "Slows enemies on hit",
  },
};

/** Cost to buy the next damage or speed upgrade for a tower. */
export function upgradeCost(baseCost: number, currentLevel: number): number {
  return Math.round(baseCost * 0.55 * (currentLevel + 1));
}

export function damageMultiplier(damageLevel: number): number {
  return 1 + damageLevel * 0.4;
}

export function fireRateMultiplier(speedLevel: number): number {
  return 1 + speedLevel * 0.3;
}

export function waveEnemyCount(wave: number): number {
  return 6 + wave * 2;
}

export function isBossWave(wave: number): boolean {
  return wave === 6 || wave === 9 || wave === 12;
}

export function enemyForWave(wave: number, index: number): EnemyDef {
  const count = waveEnemyCount(wave);
  const scale = 1 + (wave - 1) * 0.22;

  // Boss as the last spawn on boss waves
  if (isBossWave(wave) && index === count - 1) {
    return {
      kind: "boss",
      hp: Math.round(700 + wave * 180),
      speed: NORMAL_SPEED * 0.72,
      reward: 80 + wave * 10,
      radius: 20,
      color: "#6b2d8a",
      leakDamage: 5,
    };
  }

  const isSplitter = wave >= 3 && index % 6 === 3;
  const isTank = wave >= 4 && index % 5 === 4;
  const isFast = wave >= 3 && index % 4 === 2 && !isSplitter;

  if (isSplitter) {
    return {
      kind: "splitter",
      hp: Math.round(55 * scale),
      speed: NORMAL_SPEED,
      reward: 10 + wave,
      radius: 13,
      color: "#c978c0",
      leakDamage: 1,
    };
  }
  if (isTank) {
    return {
      kind: "tank",
      hp: Math.round(90 * scale),
      speed: 42,
      reward: 12 + wave,
      radius: 14,
      color: "#8b5a3c",
      leakDamage: 1,
    };
  }
  if (isFast) {
    return {
      kind: "fast",
      hp: Math.round(28 * scale),
      speed: 95 + wave * 2,
      reward: 8 + Math.floor(wave / 2),
      radius: 9,
      color: "#d4a84b",
      leakDamage: 1,
    };
  }
  return {
    kind: "normal",
    hp: Math.round(40 * scale),
    speed: NORMAL_SPEED + wave,
    reward: 6 + Math.floor(wave / 2),
    radius: 11,
    color: "#c45c4a",
    leakDamage: 1,
  };
}

/** Children spawned when a splitter dies — normal speed, no further splits. */
export function splitlingFrom(parentHp: number, wave: number): EnemyDef {
  return {
    kind: "splitling",
    hp: Math.max(12, Math.round(parentHp * 0.35)),
    speed: NORMAL_SPEED,
    reward: 3 + Math.floor(wave / 3),
    radius: 8,
    color: "#e0a8d8",
    leakDamage: 1,
  };
}

export function spawnInterval(wave: number): number {
  return Math.max(0.35, 0.85 - wave * 0.04);
}
