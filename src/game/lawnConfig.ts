import type { Difficulty } from "./types";

/** Five lanes, nine planting columns. Zombies walk from the right toward the house. */
export const LCOLS = 9;
export const LROWS = 5;
export const LCELL = 72;
export const LOFFX = 60;
export const LOFFY = 60;

export const LAWN_WAVES = 8;
export const LAWN_LIVES = 5;
export const LAWN_START_SUN = 50;
export const LAWN_HARD_SUN = 25;

/** Natural sun and each Sunbloom pay this much. */
export const SUN_AMOUNT = 25;
/** Seconds between those payments. */
export const SUN_INTERVAL = 20;
/** Opening of a Sun Lawn run. No zombies during this time. */
export const LAWN_PEACE = 30;

export type PlantKind = "sunbloom" | "spitter" | "bulwark" | "chiller" | "boomnut";
export type ZombieKind = "shambler" | "cone" | "runner" | "brute";
export type PlantRole = "producer" | "shooter" | "wall" | "mine";

export interface PlantDef {
  kind: PlantKind;
  name: string;
  cost: number;
  color: string;
  description: string;
  role: PlantRole;
  hp: number;
  damage: number;
  fireRate: number;
  slow: number;
  slowDuration: number;
  splash: number;
}

export interface ZombieDef {
  kind: ZombieKind;
  name: string;
  hp: number;
  speed: number;
  /** Damage per second while chewing a plant. */
  eat: number;
  radius: number;
  color: string;
}

export const PLANTS: Record<PlantKind, PlantDef> = {
  sunbloom: {
    kind: "sunbloom",
    name: "Sunbloom",
    cost: 50,
    color: "#e8c547",
    description: "Pays 25 sun every 20 seconds",
    role: "producer",
    hp: 80,
    damage: 0,
    fireRate: 0,
    slow: 0,
    slowDuration: 0,
    splash: 0,
  },
  spitter: {
    kind: "spitter",
    name: "Spitter",
    cost: 100,
    color: "#5ecf8a",
    description: "Shoots the first zombie in its lane",
    role: "shooter",
    hp: 90,
    damage: 20,
    fireRate: 1.4,
    slow: 0,
    slowDuration: 0,
    splash: 0,
  },
  bulwark: {
    kind: "bulwark",
    name: "Bulwark",
    cost: 50,
    color: "#c4a574",
    description: "A tough wall. Zombies stop and chew it",
    role: "wall",
    hp: 420,
    damage: 0,
    fireRate: 0,
    slow: 0,
    slowDuration: 0,
    splash: 0,
  },
  chiller: {
    kind: "chiller",
    name: "Chiller",
    cost: 175,
    color: "#7ec8e0",
    description: "Weaker shots that slow a lane",
    role: "shooter",
    hp: 90,
    damage: 12,
    fireRate: 1.15,
    slow: 0.45,
    slowDuration: 2.4,
    splash: 0,
  },
  boomnut: {
    kind: "boomnut",
    name: "Boomnut",
    cost: 150,
    color: "#e85d4a",
    description: "Bursts when a zombie reaches it",
    role: "mine",
    hp: 50,
    damage: 180,
    fireRate: 0,
    slow: 0,
    slowDuration: 0,
    splash: 86,
  },
};

export const ZOMBIES: Record<ZombieKind, ZombieDef> = {
  shambler: {
    kind: "shambler",
    name: "Shambler",
    hp: 110,
    speed: 24,
    eat: 16,
    radius: 16,
    color: "#6d8f45",
  },
  cone: {
    kind: "cone",
    name: "Conehead",
    hp: 280,
    speed: 22,
    eat: 16,
    radius: 17,
    color: "#c47a3a",
  },
  runner: {
    kind: "runner",
    name: "Runner",
    hp: 75,
    speed: 44,
    eat: 12,
    radius: 14,
    color: "#d4a84b",
  },
  brute: {
    kind: "brute",
    name: "Brute",
    hp: 560,
    speed: 16,
    eat: 24,
    radius: 22,
    color: "#5a1430",
  },
};

export function lawnStartingSun(d: Difficulty): number {
  return d === "hard" ? LAWN_HARD_SUN : LAWN_START_SUN;
}

export function lawnZombie(kind: ZombieKind, difficulty: Difficulty): ZombieDef {
  const def = ZOMBIES[kind];
  if (difficulty !== "hard") return def;
  return { ...def, hp: Math.round(def.hp * 1.28), speed: Math.round(def.speed * 1.06) };
}

/** Who walks this wave, in spawn order. */
export function lawnWavePlan(wave: number, difficulty: Difficulty): ZombieKind[] {
  const count = 3 + wave + (difficulty === "hard" ? 1 : 0);
  const plan: ZombieKind[] = [];
  for (let i = 0; i < count; i++) {
    if (wave >= LAWN_WAVES && i === count - 1) plan.push("brute");
    else if (wave >= 4 && i % 4 === 3) plan.push("runner");
    else if (wave >= 3 && i % 3 === 2) plan.push("cone");
    else plan.push("shambler");
  }
  return plan;
}

export function lawnSpawnInterval(wave: number, difficulty: Difficulty): number {
  const base = Math.max(1.15, 4.4 - wave * 0.3);
  return difficulty === "hard" ? base * 0.85 : base;
}
