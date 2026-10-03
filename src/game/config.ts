import type {
  Difficulty,
  EnemyDef,
  SpecialUpgradeDef,
  Tower,
  TowerDef,
  TowerKind,
} from "./types";

export const COLS = 16;
export const ROWS = 10;
export const CELL = 48;

export const START_GOLD = 120;
export const START_LIVES = 20;
export const HARD_START_GOLD = 100;
export const HARD_START_LIVES = 15;
export const TOTAL_WAVES = 12;

export const MAX_UPGRADE = 3;
/** Normal path speed used by splitlings and baseline units. */
export const NORMAL_SPEED = 62;

/** Sell refund fraction of invested gold. */
export const SELL_REFUND = 0.5;

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
  mint: {
    kind: "mint",
    name: "Mint",
    cost: 65,
    range: 0,
    damage: 0,
    fireRate: 0.22,
    color: "#e8c547",
    projectileSpeed: 0,
    description: "Produces gold; invest upgrades to earn more",
    economy: true,
  },
};

export const SPECIAL_UPGRADES: Record<TowerKind, SpecialUpgradeDef> = {
  archer: {
    name: "Hawk Eye",
    description: "Bigger range + attack aura, less shot damage",
    costMultiplier: 1.25,
  },
  cannon: {
    name: "Focus Charge",
    description: "Much more damage, shorter blast range",
    costMultiplier: 1.35,
  },
  frost: {
    name: "Glacier Field",
    description: "Area freeze aura, stops dealing damage",
    costMultiplier: 1.3,
  },
  mint: {
    name: "Midas Vault",
    description: "Bigger payouts from every gold tick",
    costMultiplier: 1.4,
  },
};

/** Gold paid per Mint tick, and seconds between ticks. Scales with investment. */
export function mintIncome(t: Tower): { amount: number; interval: number } {
  const investBonus = Math.floor(t.invested / 90);
  let amount = 5 + t.damageLevel * 4 + investBonus;
  let interval = 4.2 / (1 + t.speedLevel * 0.28);
  if (t.special) amount = Math.round(amount * 1.45);
  return { amount, interval: Math.max(1.4, interval) };
}

export function specialCost(kind: TowerKind): number {
  return Math.round(
    TOWER_DEFS[kind].cost * SPECIAL_UPGRADES[kind].costMultiplier,
  );
}

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

export interface CombatStats {
  range: number;
  damage: number;
  fireRate: number;
  splash: number;
  slow: number;
  slowDuration: number;
  auraDamage: number;
  auraFreeze: boolean;
  firesProjectiles: boolean;
  color: string;
  projectileSpeed: number;
}

export function combatStats(t: Tower): CombatStats {
  const def = TOWER_DEFS[t.kind];

  if (def.economy) {
    const income = mintIncome(t);
    return {
      range: 0,
      damage: 0,
      fireRate: 1 / income.interval,
      splash: 0,
      slow: 0,
      slowDuration: 0,
      auraDamage: 0,
      auraFreeze: false,
      firesProjectiles: false,
      color: def.color,
      projectileSpeed: 0,
    };
  }

  let range = def.range;
  let damage = def.damage * damageMultiplier(t.damageLevel);
  const fireRate = def.fireRate * fireRateMultiplier(t.speedLevel);
  let splash = def.splash ?? 0;
  let slow = def.slow ?? 0;
  let slowDuration = def.slowDuration ?? 0;
  let auraDamage = 0;
  let auraFreeze = false;
  let firesProjectiles = true;

  if (t.special) {
    if (t.kind === "archer") {
      range *= 1.5;
      damage *= 0.6;
      // Aura scales slightly with damage upgrades
      auraDamage = 5 + t.damageLevel * 2.5;
    } else if (t.kind === "cannon") {
      damage *= 1.65;
      range *= 0.62;
      splash *= 0.9;
    } else if (t.kind === "frost") {
      damage = 0;
      firesProjectiles = false;
      auraFreeze = true;
      range *= 1.15;
      slow = 0.28;
      slowDuration = 0.4;
    }
  }

  return {
    range,
    damage,
    fireRate,
    splash,
    slow,
    slowDuration,
    auraDamage,
    auraFreeze,
    firesProjectiles,
    color: def.color,
    projectileSpeed: def.projectileSpeed,
  };
}

/**
 * Hard mode ramps every wave:
 * wave 1 ~1.25× HP, wave 12 ~2.9× HP, plus speed/count pressure.
 */
export function hardWaveMultiplier(wave: number): number {
  return 1.25 + (wave - 1) * 0.15;
}

export function waveEnemyCount(
  wave: number,
  difficulty: Difficulty = "normal",
): number {
  const base = 6 + wave * 2;
  if (difficulty === "hard") return base + 2 + Math.floor(wave / 2);
  return base;
}

export function isBossWave(wave: number): boolean {
  return wave === 6 || wave === 9;
}

export function isFinalBossWave(wave: number): boolean {
  return wave === TOTAL_WAVES;
}

function applyHard(
  def: EnemyDef,
  wave: number,
  difficulty: Difficulty,
): EnemyDef {
  if (difficulty !== "hard") return def;
  const m = hardWaveMultiplier(wave);
  const speedBoost = 1.08 + (wave - 1) * 0.02;
  const isBoss = def.kind === "boss" || def.kind === "finalBoss";
  return {
    ...def,
    hp: Math.round(def.hp * m * (isBoss ? 1.25 : 1)),
    speed: Math.round(def.speed * speedBoost),
    reward: Math.round(def.reward * (1.15 + wave * 0.02)),
    leakDamage: isBoss
      ? (def.leakDamage ?? 5) + 2
      : (def.leakDamage ?? 1),
  };
}

export function enemyForWave(
  wave: number,
  index: number,
  difficulty: Difficulty = "normal",
): EnemyDef {
  const count = waveEnemyCount(wave, difficulty);
  const scale = 1 + (wave - 1) * 0.22;

  // Final boss — last spawn on wave 12, much more health
  if (isFinalBossWave(wave) && index === count - 1) {
    return applyHard(
      {
        kind: "finalBoss",
        hp: 3200,
        speed: NORMAL_SPEED * 0.52,
        reward: 220,
        radius: 26,
        color: "#5a1430",
        leakDamage: 10,
      },
      wave,
      difficulty,
    );
  }

  // Mid-game bosses
  if (isBossWave(wave) && index === count - 1) {
    return applyHard(
      {
        kind: "boss",
        hp: Math.round(700 + wave * 180),
        speed: NORMAL_SPEED * 0.72,
        reward: 80 + wave * 10,
        radius: 20,
        color: "#6b2d8a",
        leakDamage: 5,
      },
      wave,
      difficulty,
    );
  }

  const isSplitter = wave >= 3 && index % 6 === 3;
  const isTank = wave >= 4 && index % 5 === 4;
  const isFast = wave >= 3 && index % 4 === 2 && !isSplitter;

  if (isSplitter) {
    return applyHard(
      {
        kind: "splitter",
        hp: Math.round(55 * scale),
        speed: NORMAL_SPEED,
        reward: 10 + wave,
        radius: 13,
        color: "#c978c0",
        leakDamage: 1,
      },
      wave,
      difficulty,
    );
  }
  if (isTank) {
    return applyHard(
      {
        kind: "tank",
        hp: Math.round(90 * scale),
        speed: 42,
        reward: 12 + wave,
        radius: 14,
        color: "#8b5a3c",
        leakDamage: 1,
      },
      wave,
      difficulty,
    );
  }
  if (isFast) {
    return applyHard(
      {
        kind: "fast",
        hp: Math.round(28 * scale),
        speed: 95 + wave * 2,
        reward: 8 + Math.floor(wave / 2),
        radius: 9,
        color: "#d4a84b",
        leakDamage: 1,
      },
      wave,
      difficulty,
    );
  }
  return applyHard(
    {
      kind: "normal",
      hp: Math.round(40 * scale),
      speed: NORMAL_SPEED + wave,
      reward: 6 + Math.floor(wave / 2),
      radius: 11,
      color: "#c45c4a",
      leakDamage: 1,
    },
    wave,
    difficulty,
  );
}

/** Children spawned when a splitter dies — normal speed, no further splits. */
export function splitlingFrom(
  parentHp: number,
  wave: number,
  difficulty: Difficulty = "normal",
): EnemyDef {
  return applyHard(
    {
      kind: "splitling",
      hp: Math.max(12, Math.round(parentHp * 0.35)),
      speed: NORMAL_SPEED,
      reward: 3 + Math.floor(wave / 3),
      radius: 8,
      color: "#e0a8d8",
      leakDamage: 1,
    },
    wave,
    difficulty,
  );
}

export function spawnInterval(
  wave: number,
  difficulty: Difficulty = "normal",
): number {
  const base = Math.max(0.35, 0.85 - wave * 0.04);
  if (difficulty === "hard") return Math.max(0.22, base * 0.75);
  return base;
}

export function startingGold(difficulty: Difficulty): number {
  return difficulty === "hard" ? HARD_START_GOLD : START_GOLD;
}

export function startingLives(difficulty: Difficulty): number {
  return difficulty === "hard" ? HARD_START_LIVES : START_LIVES;
}

export function sellValue(invested: number): number {
  return Math.floor(invested * SELL_REFUND);
}
