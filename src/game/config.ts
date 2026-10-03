import type {
  Difficulty,
  EnemyDef,
  SpecialUpgradeDef,
  Tower,
  TowerDef,
  TowerKind,
  Flyer,
} from "./types";

export const COLS = 16;
export const ROWS = 10;
export const CELL = 48;

export const START_GOLD = 120;
export const START_LIVES = 20;
export const HARD_START_GOLD = 110;
export const HARD_START_LIVES = 17;
export const TOTAL_WAVES = 12;

export const MAX_UPGRADE = 3;
/** Normal path speed used by splitlings and baseline units. */
export const NORMAL_SPEED = 62;

/** Sell refund fraction of invested gold. Bank deposits are returned in full. */
export const SELL_REFUND = 0.5;

/** Midas Bank pays this fraction of stored coins when a wave starts, then that gold leaves the bank. */
export const BANK_PAYOUT_RATE = 0.25;

/** Chunk size for the Bank button. */
export const BANK_DEPOSIT_CHUNK = 25;

/** Normal mode: wounded enemies restore full health after this many seconds without damage. */
export const REGEN_DELAY = 3;

/** Wasp flight speed in pixels per second. Drones are a little slower. */
export const FLY_SPEED = 240;
export const DRONE_SPEED = 190;
export const DRONE_COUNT = 3;
/** Mini drones deal this fraction of the wasp's shot damage. */
export const DRONE_DAMAGE_RATIO = 0.3;

/** Each Banner adds this much damage and attack speed. Upgrades raise it. */
export const BANNER_BUFF = 0.2;
/** Combined banner bonus cannot exceed this, so several banners stay bounded. */
export const BANNER_CAP = 0.6;

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
    cost: 100,
    range: 0,
    damage: 0,
    fireRate: 0.22,
    color: "#e8c547",
    projectileSpeed: 0,
    description: "Prints gold while a wave is running",
    economy: true,
  },
  wasp: {
    kind: "wasp",
    name: "Wasp",
    cost: 180,
    range: 0,
    damage: 8,
    fireRate: 1.4,
    color: "#c46ad4",
    projectileSpeed: 0,
    description: "Flies to one enemy and stays until it falls",
    flying: true,
  },
  banner: {
    kind: "banner",
    name: "Banner",
    cost: 75,
    range: 2.6,
    damage: 0,
    fireRate: 0,
    color: "#d4a24a",
    projectileSpeed: 0,
    description: "Buffs damage and attack speed of towers in range",
    support: true,
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
    description: "Area freeze. Damage upgrades are refunded",
    costMultiplier: 1.3,
  },
  mint: {
    name: "Midas Bank",
    description: "Deposit coins. Each wave pays 25%, and that gold leaves the bank",
    costMultiplier: 1.4,
  },
  wasp: {
    name: "Drone Wing",
    description: "Three mini drones. Each hunts an enemy until it is destroyed",
    costMultiplier: 1.3,
  },
  banner: {
    name: "Grand Banner",
    description: "The same buff reaches every tower on the map",
    costMultiplier: 1.35,
  },
};

/**
 * Gold paid per Mint tick, and seconds between ticks.
 * Ticks run only while a wave is in progress.
 */
export function mintIncome(t: Tower): { amount: number; interval: number } {
  const investBonus = Math.floor(t.invested / 90);
  const amount = 5 + t.damageLevel * 4 + investBonus;
  const interval = 4.2 / (1 + t.speedLevel * 0.28);
  return { amount, interval: Math.max(1.4, interval) };
}

/** Gold a Midas Bank pays at the start of a wave. That amount then leaves the bank. */
export function bankPayout(banked: number): number {
  return Math.floor(banked * BANK_PAYOUT_RATE);
}

/** Damage and attack-speed bonus one Banner gives. Upgrades raise each side. */
export function bannerBonus(t: Tower): { damage: number; rate: number } {
  return {
    damage: BANNER_BUFF * (1 + t.damageLevel * 0.35),
    rate: BANNER_BUFF * (1 + t.speedLevel * 0.35),
  };
}

/** Parking spot for the wasp (slot < 0) or one mini drone. */
export function nestPoint(
  col: number,
  row: number,
  slot: number,
): { x: number; y: number } {
  const x = col * CELL + CELL / 2;
  const y = row * CELL + CELL / 2 - 14;
  if (slot < 0) return { x, y };
  const ang = -Math.PI / 2 + (slot - 1) * 0.9;
  return { x: x + Math.cos(ang) * 18, y: y + Math.sin(ang) * 12 };
}

export function makeFlyer(x: number, y: number, cooldown = 0): Flyer {
  return { x, y, targetId: null, cooldown };
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
 * Hard mode still ramps every wave, a step down from the old curve:
 * wave 1 ~1.15× HP, wave 12 ~2.36× HP, with milder speed and count pressure.
 */
export function hardWaveMultiplier(wave: number): number {
  return 1.15 + (wave - 1) * 0.11;
}

/**
 * Extra Endless multiplier. 10% from wave 15, 20% at 20, 30% at 25,
 * 40% at 40, then another 10% every 15 waves.
 */
export function endlessRamp(wave: number): number {
  if (wave < 15) return 0;
  if (wave < 20) return 0.1;
  if (wave < 25) return 0.2;
  if (wave < 40) return 0.3;
  return 0.4 + Math.floor((wave - 40) / 15) * 0.1;
}

/** Endless waves 30, 40, 50… send a Challenger as the last enemy. */
export function isChallengerWave(wave: number): boolean {
  return wave >= 30 && wave % 10 === 0;
}

export function waveEnemyCount(
  wave: number,
  difficulty: Difficulty = "normal",
): number {
  const base = 6 + wave * 2;
  if (difficulty === "hard") return base + 1 + Math.floor(wave / 3);
  if (difficulty === "endless") {
    return Math.max(base, Math.round(base * (1 + endlessRamp(wave))));
  }
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
  let next = def;
  if (difficulty === "hard") {
    const m = hardWaveMultiplier(wave);
    const speedBoost = 1.05 + (wave - 1) * 0.012;
    const isBoss = def.kind === "boss" || def.kind === "finalBoss";
    next = {
      ...def,
      hp: Math.round(def.hp * m * (isBoss ? 1.15 : 1)),
      speed: Math.round(def.speed * speedBoost),
      reward: Math.round(def.reward * (1.15 + wave * 0.02)),
      leakDamage: isBoss
        ? (def.leakDamage ?? 5) + 1
        : (def.leakDamage ?? 1),
    };
  }
  if (difficulty === "endless") {
    const ramp = endlessRamp(wave);
    next = {
      ...next,
      hp: Math.round(next.hp * (1 + ramp)),
      speed: Math.round(next.speed * (1 + ramp * 0.5)),
      reward: Math.round(next.reward * (1 + ramp * 0.2)),
    };
  }
  return next;
}

export function bossDef(wave: number, difficulty: Difficulty = "normal"): EnemyDef {
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

export function enemyForWave(
  wave: number,
  index: number,
  difficulty: Difficulty = "normal",
): EnemyDef {
  const count = waveEnemyCount(wave, difficulty);
  const scale = 1 + (wave - 1) * 0.22;

  if (
    difficulty === "endless" &&
    isChallengerWave(wave) &&
    index === count - 1
  ) {
    return applyHard(
      {
        kind: "challenger",
        hp: Math.round(520 + wave * 110),
        speed: NORMAL_SPEED * 0.6,
        reward: 60 + wave * 4,
        radius: 18,
        color: "#d4a24a",
        leakDamage: 4,
      },
      wave,
      difficulty,
    );
  }

  // Final boss — last spawn on wave 12, much more health. Endless keeps going.
  if (difficulty !== "endless" && isFinalBossWave(wave) && index === count - 1) {
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
    return bossDef(wave, difficulty);
  }

  const isSpawner = wave >= 5 && index % 7 === 5;
  const isSplitter = wave >= 3 && index % 6 === 3 && !isSpawner;
  const isTank = wave >= 4 && index % 5 === 4 && !isSpawner;
  const isFast = wave >= 3 && index % 4 === 2 && !isSplitter && !isSpawner;

  if (isSpawner) {
    return applyHard(
      {
        kind: "spawner",
        hp: Math.round(110 * scale),
        speed: 38,
        reward: 18 + wave * 2,
        radius: 15,
        color: "#6a7a3a",
        leakDamage: 2,
      },
      wave,
      difficulty,
    );
  }
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
  if (difficulty === "hard") return Math.max(0.28, base * 0.85);
  return base;
}

export function startingGold(difficulty: Difficulty): number {
  return difficulty === "hard" ? HARD_START_GOLD : START_GOLD;
}

export function startingLives(difficulty: Difficulty): number {
  return difficulty === "hard" ? HARD_START_LIVES : START_LIVES;
}

export function sellValue(invested: number, banked = 0): number {
  return Math.floor(invested * SELL_REFUND) + Math.max(0, Math.floor(banked));
}
