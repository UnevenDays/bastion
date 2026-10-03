import type { Difficulty } from "./types";

export const DCOLS = 16;
export const DROWS = 10;
export const DCELL = 48;

export const DUNGEON_START_GOLD = 140;
export const DUNGEON_START_LIVES = 12;
export const DUNGEON_HARD_GOLD = 110;
export const DUNGEON_HARD_LIVES = 9;
export const DUNGEON_WAVES = 10;
export const DUNGEON_SELL_REFUND = 0.5;

export type DungeonBuildKind = "spikes" | "snare" | "goblin" | "ogre";
export type AdventurerKind = "scout" | "fighter" | "knight" | "hero";

export interface DungeonBuildDef {
  kind: DungeonBuildKind;
  name: string;
  cost: number;
  color: string;
  description: string;
  /** trap = damages/slows passers; monster = fights adventurers */
  role: "trap" | "monster";
  damage: number;
  /** For traps: damage applied on trigger. For monsters: DPS while fighting. */
  hp?: number;
  fireRate?: number;
  slow?: number;
  slowDuration?: number;
}

export interface AdventurerDef {
  kind: AdventurerKind;
  name: string;
  hp: number;
  speed: number;
  damage: number; // DPS vs monsters
  reward: number;
  radius: number;
  color: string;
  leakDamage: number;
}

/** Dense zigzag road for ambush mode — place traps/monsters ON these tiles. */
export const ZIGZAG_PATH: { col: number; row: number }[] = (() => {
  const path: { col: number; row: number }[] = [];
  const rows = [1, 3, 5, 7, 8];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const leftToRight = i % 2 === 0;
    if (leftToRight) {
      for (let col = 0; col < DCOLS; col++) path.push({ col, row });
    } else {
      for (let col = DCOLS - 1; col >= 0; col--) path.push({ col, row });
    }
    if (i < rows.length - 1) {
      const next = rows[i + 1];
      const joinCol = leftToRight ? DCOLS - 1 : 0;
      for (let r = row + 1; r < next; r++) path.push({ col: joinCol, row: r });
    }
  }
  return path;
})();

export const DUNGEON_BUILDS: Record<DungeonBuildKind, DungeonBuildDef> = {
  spikes: {
    kind: "spikes",
    name: "Spike Trap",
    cost: 40,
    color: "#c45c4a",
    description: "Damages adventurers on the road",
    role: "trap",
    damage: 22,
    fireRate: 0.9,
  },
  snare: {
    kind: "snare",
    name: "Snare",
    cost: 55,
    color: "#5a9eb8",
    description: "Slows adventurers on the road",
    role: "trap",
    damage: 4,
    fireRate: 1.2,
    slow: 0.4,
    slowDuration: 1.8,
  },
  goblin: {
    kind: "goblin",
    name: "Goblin",
    cost: 70,
    color: "#4a9b6e",
    description: "Monster that fights on the road",
    role: "monster",
    damage: 14,
    hp: 90,
    fireRate: 1.1,
  },
  ogre: {
    kind: "ogre",
    name: "Ogre",
    cost: 110,
    color: "#8b5a3c",
    description: "Tanky monster, high damage",
    role: "monster",
    damage: 28,
    hp: 220,
    fireRate: 0.7,
  },
};

export function dungeonStartingGold(d: Difficulty): number {
  return d === "hard" ? DUNGEON_HARD_GOLD : DUNGEON_START_GOLD;
}

export function dungeonStartingLives(d: Difficulty): number {
  return d === "hard" ? DUNGEON_HARD_LIVES : DUNGEON_START_LIVES;
}

export function dungeonWaveCount(wave: number, d: Difficulty): number {
  const base = 5 + wave * 2;
  return d === "hard" ? base + 2 : base;
}

export function dungeonSpawnInterval(wave: number, d: Difficulty): number {
  const base = Math.max(0.4, 0.95 - wave * 0.05);
  return d === "hard" ? base * 0.8 : base;
}

export function adventurerForWave(
  wave: number,
  index: number,
  d: Difficulty,
): AdventurerDef {
  const count = dungeonWaveCount(wave, d);
  const scale = 1 + (wave - 1) * 0.2;
  const hard = d === "hard" ? 1.2 : 1;

  if (wave === DUNGEON_WAVES && index === count - 1) {
    return {
      kind: "hero",
      name: "Hero",
      hp: Math.round(480 * hard),
      speed: 48,
      damage: 38,
      reward: 80,
      radius: 14,
      color: "#e8c547",
      leakDamage: 4,
    };
  }

  if (wave >= 6 && index % 5 === 4) {
    return {
      kind: "knight",
      name: "Knight",
      hp: Math.round(140 * scale * hard),
      speed: 50,
      damage: 22,
      reward: 16 + wave,
      radius: 12,
      color: "#7a8aa0",
      leakDamage: 2,
    };
  }

  if (wave >= 3 && index % 4 === 2) {
    return {
      kind: "scout",
      name: "Scout",
      hp: Math.round(36 * scale * hard),
      speed: 100,
      damage: 10,
      reward: 8 + Math.floor(wave / 2),
      radius: 9,
      color: "#d4a84b",
      leakDamage: 1,
    };
  }

  return {
    kind: "fighter",
    name: "Fighter",
    hp: Math.round(55 * scale * hard),
    speed: 62 + wave,
    damage: 14,
    reward: 7 + Math.floor(wave / 2),
    radius: 11,
    color: "#c4785a",
    leakDamage: 1,
  };
}

export function dungeonUpgradeCost(base: number, level: number): number {
  return Math.round(base * 0.5 * (level + 1));
}

export function dungeonSellValue(invested: number): number {
  return Math.floor(invested * DUNGEON_SELL_REFUND);
}
