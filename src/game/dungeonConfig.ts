import type { Difficulty } from "./types";

export const DCOLS = 16;
export const DROWS = 10;
export const DCELL = 48;

export const DUNGEON_START_GOLD = 140;
export const DUNGEON_START_LIVES = 12;
export const DUNGEON_HARD_GOLD = 120;
export const DUNGEON_HARD_LIVES = 10;
export const DUNGEON_WAVES = 10;
export const DUNGEON_SELL_REFUND = 0.5;

export type DungeonBuildKind = "spikes" | "snare" | "goblin" | "ogre";
/** Adventurers themed to match traps/monsters (drawn as triangles). */
export type AdventurerKind = "spikeRaider" | "snareScout" | "goblinHunter" | "ogreSlayer";

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

/**
 * Shorter zigzag road for ambush mode — fewer rows, place traps/monsters ON these tiles.
 */
export const ZIGZAG_PATH: { col: number; row: number }[] = (() => {
  const path: { col: number; row: number }[] = [];
  // Three short horizontal runs with short connectors
  const rows = [2, 4, 6];
  const colStart = 1;
  const colEnd = 12; // shorter than full width
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const leftToRight = i % 2 === 0;
    if (leftToRight) {
      for (let col = colStart; col <= colEnd; col++) path.push({ col, row });
    } else {
      for (let col = colEnd; col >= colStart; col--) path.push({ col, row });
    }
    if (i < rows.length - 1) {
      const next = rows[i + 1];
      const joinCol = leftToRight ? colEnd : colStart;
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
    description: "Heavy damage to adventurers on the road",
    role: "trap",
    damage: 28,
    fireRate: 1.05,
  },
  snare: {
    kind: "snare",
    name: "Snare",
    cost: 55,
    color: "#5a9eb8",
    description: "Slows adventurers hard and chips them",
    role: "trap",
    damage: 7,
    fireRate: 1.35,
    slow: 0.32,
    slowDuration: 2.4,
  },
  goblin: {
    kind: "goblin",
    name: "Goblin",
    cost: 70,
    color: "#4a9b6e",
    description: "Sturdier fighter on the road",
    role: "monster",
    damage: 18,
    hp: 125,
    fireRate: 1.25,
  },
  ogre: {
    kind: "ogre",
    name: "Ogre",
    cost: 110,
    color: "#8b5a3c",
    description: "Orc-sized tank. High health and heavy hits",
    role: "monster",
    damage: 40,
    hp: 310,
    fireRate: 0.85,
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
  return d === "hard" ? base + 1 : base;
}

export function dungeonSpawnInterval(wave: number, d: Difficulty): number {
  const base = Math.max(0.4, 0.95 - wave * 0.05);
  return d === "hard" ? base * 0.88 : base;
}

export function adventurerForWave(
  wave: number,
  index: number,
  d: Difficulty,
): AdventurerDef {
  const count = dungeonWaveCount(wave, d);
  const scale = 1 + (wave - 1) * 0.2;
  const hard = d === "hard" ? 1.1 : 1;

  // Final ogre-slayer (matches Ogre) — softer than the defenders they hunt
  if (wave === DUNGEON_WAVES && index === count - 1) {
    return {
      kind: "ogreSlayer",
      name: "Ogre Slayer",
      hp: Math.round(380 * hard),
      speed: 44,
      damage: 30,
      reward: 80,
      radius: 14,
      color: "#8b5a3c",
      leakDamage: 3,
    };
  }

  // Goblin hunters (match Goblin) — tougher mid-wave
  if (wave >= 6 && index % 5 === 4) {
    return {
      kind: "goblinHunter",
      name: "Goblin Hunter",
      hp: Math.round(110 * scale * hard),
      speed: 46,
      damage: 17,
      reward: 16 + wave,
      radius: 12,
      color: "#4a9b6e",
      leakDamage: 2,
    };
  }

  // Snare scouts (match Snare) — fast
  if (wave >= 3 && index % 4 === 2) {
    return {
      kind: "snareScout",
      name: "Snare Scout",
      hp: Math.round(28 * scale * hard),
      speed: 86,
      damage: 8,
      reward: 8 + Math.floor(wave / 2),
      radius: 9,
      color: "#5a9eb8",
      leakDamage: 1,
    };
  }

  // Spike raiders (match Spike Trap) — default
  return {
    kind: "spikeRaider",
    name: "Spike Raider",
    hp: Math.round(44 * scale * hard),
    speed: 54 + wave,
    damage: 11,
    reward: 7 + Math.floor(wave / 2),
    radius: 11,
    color: "#c45c4a",
    leakDamage: 1,
  };
}

export function dungeonUpgradeCost(base: number, level: number): number {
  return Math.round(base * 0.5 * (level + 1));
}

export function dungeonSellValue(invested: number): number {
  return Math.floor(invested * DUNGEON_SELL_REFUND);
}
