import type { EnemyDef, TowerDef, TowerKind } from "./types";

export const COLS = 16;
export const ROWS = 10;
export const CELL = 48;

export const START_GOLD = 120;
export const START_LIVES = 20;
export const TOTAL_WAVES = 12;

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

export function waveEnemyCount(wave: number): number {
  return 6 + wave * 2;
}

export function enemyForWave(wave: number, index: number): EnemyDef {
  const isTank = wave >= 4 && index % 5 === 4;
  const isFast = wave >= 3 && index % 4 === 2;
  const scale = 1 + (wave - 1) * 0.22;

  if (isTank) {
    return {
      hp: Math.round(90 * scale),
      speed: 42,
      reward: 12 + wave,
      radius: 14,
      color: "#8b5a3c",
    };
  }
  if (isFast) {
    return {
      hp: Math.round(28 * scale),
      speed: 95 + wave * 2,
      reward: 8 + Math.floor(wave / 2),
      radius: 9,
      color: "#d4a84b",
    };
  }
  return {
    hp: Math.round(40 * scale),
    speed: 58 + wave,
    reward: 6 + Math.floor(wave / 2),
    radius: 11,
    color: "#c45c4a",
  };
}

export function spawnInterval(wave: number): number {
  return Math.max(0.35, 0.85 - wave * 0.04);
}
