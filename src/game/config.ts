import type {
  Difficulty,
  EnemyDef,
  PatternKind,
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

/** Lives the gate mends on its own when a wave ends. */
export const GATE_AUTO_REPAIR = 1;
/** Lives restored by one paid Repair, and the gold for each of them. */
export const GATE_REPAIR_AMOUNT = 2;
export const GATE_REPAIR_EACH = 12;
/** Extra gate lives from one Reinforce, and how many times it can be bought. */
export const GATE_REINFORCE_LIVES = 4;
export const GATE_REINFORCE_MAX = 3;
/** Volley lets the warden shoot. A little under an Archer's 12 damage and 1.4 shots a second. */
export const GATE_VOLLEY_COST = 90;
export const GATE_DAMAGE = 11;
export const GATE_RATE = 1.25;
export const GATE_RANGE = 2.4;
export const GATE_SHOT_SPEED = 400;

export function gateReinforceCost(rank: number): number {
  return 40 + rank * 30;
}

/** Gold to restore up to two lives. Zero when the gate is already full. */
export function gateRepairCost(lives: number, maxLives: number): number {
  const missing = Math.max(0, maxLives - lives);
  const amount = Math.min(GATE_REPAIR_AMOUNT, missing);
  return amount * GATE_REPAIR_EACH;
}

/** Night Watch. Auto aim reaches this fraction of its range. */
export const FOG_AUTO_RANGE = 0.65;
/** Orchard. A trunk blocks a shot inside this many pixels of its center. */
export const TREE_TRUNK = 15;
/** Quarry. Seconds into a wave before the first rock, then the gap between rocks. */
export const QUARRY_ROCK_FIRST = 5;
export const QUARRY_ROCK_EVERY = 7;
/** Quarry. The shadow hangs for this long, then the rock lands. */
export const QUARRY_ROCK_WARN = 0.85;
/** Quarry. Seconds a landed rock shuts that tower off. */
export const QUARRY_ROCK_STUN = 2.5;

/** Normal mode: wounded enemies restore full health after this many seconds without damage. */
export const REGEN_DELAY = 3;

/** Wasp flight speed in pixels per second. Drones are a little slower. */
export const FLY_SPEED = 240;
export const DRONE_SPEED = 190;
export const DRONE_COUNT = 3;
/** Mini drones deal this fraction of the wasp's shot damage. */
export const DRONE_DAMAGE_RATIO = 0.25;
/** Each Wasp damage rank adds this share of the base shot. */
export const WASP_DAMAGE_STEP = 0.3;

/** Each Banner adds this much damage and attack speed. Upgrades raise it. */
export const BANNER_BUFF = 0.2;
/** Combined banner bonus cannot exceed this, so several banners stay bounded. */
export const BANNER_CAP = 0.6;
/** Banners that can stand at once, including one the shovel is holding. */
export const BANNER_LIMIT = 3;

/** Wave-1 grunt health, before any wave scaling. */
export const BASIC_GRUNT_HP = 40;

/** Thief health before wave scaling. A step above the grunt. */
export const THIEF_HP = 64;
/** Loose gold a living thief takes once a second. */
export const THIEF_STEAL = 1;
/** Share of stolen gold paid back when a thief is killed. */
export const THIEF_REFUND = 0.2;
/** A bandit killed inside this many seconds drops an extra purse. */
export const BANDIT_QUICK_SECONDS = 4;
/** Extra gold in that purse. A bounty of 0, including drought, pays none. */
export const BANDIT_QUICK_GOLD = 8;

/** Sapper health before wave scaling. A step above the thief. */
export const SAPPER_HP = 96;
/** Slow enough that the pack catches the sapper while it works. */
export const SAPPER_SPEED = 46;
/** How long the tower it stops on stays shut off. */
export const SAPPER_SILENCE = 4;
/** Cell distance at which a sapper stops on a tower. Covers the next tile, including a diagonal. */
export const SAPPER_REACH = 1.5;

/** Desert Husk health before wave scaling. A dried shell, tougher than a tank. */
export const HUSK_HP = 130;
/** Speed while the shell is whole. */
export const HUSK_SPEED = 34;
/** Speed after the shell cracks at half health. */
export const HUSK_SPRINT = 108;

/** First wave that crowns pack enemies. Boss waves before this stay plain. */
export const ELITE_FROM_WAVE = 8;
/** Health of a crowned enemy, compared with the same kind on that wave. */
export const ELITE_HP = 2.5;
/** Gold for killing a crowned enemy, compared with the same kind. */
export const ELITE_REWARD = 3;

/** How long a Pyro burn lasts. A slow clears it immediately. */
export const PYRO_BURN_TIME = 2.4;
/** Burn damage per second, as a fraction of the hit that set it. */
export const PYRO_BURN_RATIO = 0.5;
/** Extra hit damage when the target is not already on fire. 1 means double. */
export const PYRO_FRESH_BONUS = 1;
/** Inner Flame multiplies shot range by this. The interior then burns. */
export const PYRO_SPECIAL_RANGE = 0.7;

/** Fraction of current health an enemy keeps after a Nuke. At least 1. */
export const NUKE_SURVIVOR = 0.1;

/** Mace sweep radius in cells, before area upgrades. */
export const MACE_RANGE = 1.8;
/** Damage when a mace passes over an enemy, before upgrades. */
export const MACE_HIT = 18;
/** Seconds for one full turn of the mace. */
export const MACE_PERIOD = 1.35;

/** Sniper shot damage before upgrades. One wave-1 grunt falls to a single hit. */
export const SNIPER_DAMAGE = 58;
/** Shots per second. About one round every three seconds. */
export const SNIPER_RATE = 0.34;
/** Heavy rounds travel slower than the other guns. */
export const SNIPER_BULLET_SPEED = 200;
/** Lives granted by one Supply Drop. */
export const SNIPER_SUPPLY_LIVES = 1;
/** Gold granted by one Supply Drop, before the price is paid. */
export const SNIPER_SUPPLY_GOLD = 35;
/** First Supply Drop price. Each later call costs more. */
export const SNIPER_SUPPLY_BASE = 50;
/** Gold added to the Supply Drop price after every call. */
export const SNIPER_SUPPLY_STEP = 25;

/** Chomp bite radius in cells, before the area upgrade. */
export const CHOMP_RANGE = 1.5;
/** Seconds asleep after a bite, before the sleep upgrade. */
export const CHOMP_SLEEP = 25;
/** Seconds removed from the nap by each sleep upgrade. */
export const CHOMP_SLEEP_STEP = 5;

/** Chance a Storm strike locks onto a living enemy. Hit Chance ranks raise it. */
export const STORM_SURE_HIT = 0.25;
/** Extra lock-on chance from each Hit Chance rank. */
export const STORM_HIT_STEP = 0.12;
/** Pixel radius of a lightning sticker that lands on a random point. */
export const STORM_SPLASH = 40;

/** Cloud Allies join the path on this timer. */
export const CLOUD_INTERVAL = 15;
/** A Storm keeps at most this many living clouds. */
export const CLOUD_CAP = 5;
/** Cloud health. A step under the old five-grunt shell. */
export const CLOUD_HP = 150;
/** Cloud strike. A wave-1 grunt has 40, so one hit leaves it standing. */
export const CLOUD_DAMAGE = 26;
/** Extra damage at the last Storm Damage rank. Lightning and cloud hits share it. */
export const CLOUD_DAMAGE_FINAL = 0.55;
export const CLOUD_SPEED = 72;
export const CLOUD_REACH = 28;
export const CLOUD_HIT_INTERVAL = 1;

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
    cost: 45,
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
    splash: 0.95,
    description: "Tight splash. Damage upgrades widen the blast",
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
    slow: 0.52,
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
    description: "Prints gold only during a wave",
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
    description: "Buffs nearby towers. Up to 3, one Grand Banner",
    support: true,
  },
  storm: {
    kind: "storm",
    name: "Storm",
    cost: 45,
    range: 0,
    damage: 32,
    fireRate: 0.85,
    color: "#7ec8ff",
    projectileSpeed: 0,
    description: "Random lightning. Hit Chance raises how often it locks on",
    storm: true,
  },
  pyro: {
    kind: "pyro",
    name: "Pyro",
    cost: 60,
    range: 1.55,
    damage: 16,
    fireRate: 1,
    color: "#e25822",
    projectileSpeed: 340,
    description: "Short-range fire. Extra damage if the target is not burning",
  },
  mace: {
    kind: "mace",
    name: "Mace",
    cost: 90,
    range: MACE_RANGE,
    damage: MACE_HIT,
    fireRate: 1 / MACE_PERIOD,
    color: "#8d9aab",
    projectileSpeed: 0,
    description: "A mace spins around it and hits every enemy it passes",
    mace: true,
  },
  sniper: {
    kind: "sniper",
    name: "Sniper",
    cost: 130,
    range: 0,
    damage: SNIPER_DAMAGE,
    fireRate: SNIPER_RATE,
    color: "#d1c08a",
    projectileSpeed: SNIPER_BULLET_SPEED,
    description: "No range limit. Slow, heavy shots",
    sniper: true,
  },
  chomp: {
    kind: "chomp",
    name: "Chomp",
    cost: 140,
    range: CHOMP_RANGE,
    damage: 0,
    fireRate: 1 / CHOMP_SLEEP,
    color: "#c4493a",
    projectileSpeed: 0,
    description: "Swallows an enemy, then sleeps for 25 seconds",
    chomp: true,
  },
  nuke: {
    kind: "nuke",
    name: "Nuke",
    cost: 200,
    range: 0,
    damage: 0,
    fireRate: 0,
    color: "#e8c547",
    projectileSpeed: 0,
    description: "Detonates at once. Almost destroys everything. Wrecks a 3×3",
    nuke: true,
  },
};

export const SPECIAL_UPGRADES: Record<TowerKind, SpecialUpgradeDef> = {
  archer: {
    name: "Hawk Eye",
    description: "Bigger range, less shot damage",
    costMultiplier: 1.25,
  },
  cannon: {
    name: "Focus Charge",
    description: "More damage, shorter range, fires faster",
    costMultiplier: 1.35,
  },
  frost: {
    name: "Glacier Field",
    description: "Pulses a chill. Upgrade its area, how long the chill lasts, and how soon it pulses again",
    costMultiplier: 1,
    cost: 180,
  },
  mint: {
    name: "Midas Bank",
    description: "Deposit coins. Each wave pays 25%, and that gold leaves the bank",
    costMultiplier: 1.4,
  },
  wasp: {
    name: "Drone Wing",
    description: "Three mini drones at a quarter of the wasp's damage. Each hunts an enemy until it is destroyed",
    costMultiplier: 1,
    cost: 264,
  },
  banner: {
    name: "Grand Banner",
    description: "The same buff reaches every tower. Only one Grand Banner can stand",
    costMultiplier: 1.35,
  },
  storm: {
    name: "Cloud Allies",
    description: "A cloud ally on the path every 15 seconds. 150 health. Hits for 26, and the last Damage rank is +55%",
    costMultiplier: 1,
    cost: 200,
  },
  pyro: {
    name: "Inner Flame",
    description: "Smaller radius. Everything in that interior takes burn damage",
    costMultiplier: 1.3,
  },
  mace: {
    name: "Two More Maces",
    description: "Two extra maces join the spin",
    costMultiplier: 1.35,
  },
  sniper: {
    name: "Supply Drop",
    description: "Once each wave, gain 1 life and 35 gold. Each call costs more",
    costMultiplier: 1,
    cost: SNIPER_SUPPLY_BASE,
  },
  chomp: {
    name: "Double Bite",
    description: "Swallows two enemies, then takes one nap",
    costMultiplier: 1.35,
  },
  nuke: {
    name: "Detonation",
    description: "The placement is the blast. The tower does not stay to be upgraded",
    costMultiplier: 1,
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

/** Banner buff radius in cells. Each Area rank adds 0.6. */
export function bannerRange(areaLevel: number): number {
  return TOWER_DEFS.banner.range + areaLevel * 0.6;
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
  const special = SPECIAL_UPGRADES[kind];
  if (special.cost !== undefined) return special.cost;
  return Math.round(TOWER_DEFS[kind].cost * special.costMultiplier);
}

/** Lock-on chance for a Storm, including Hit Chance ranks. */
export function stormHitChance(hitLevel: number): number {
  return STORM_SURE_HIT + hitLevel * STORM_HIT_STEP;
}

/** True when this roll is one of the Storm strikes that lock onto an enemy. */
export function stormGuaranteesHit(roll: number, chance = STORM_SURE_HIT): boolean {
  return roll < chance;
}

/**
 * Storm Damage ranks. Three ranks land on +55% for lightning and cloud hits.
 * The last rank is exact, so a full bar is 1.55× and not a rounding of the steps.
 */
export function cloudDamageMultiplier(damageLevel: number): number {
  if (damageLevel >= MAX_UPGRADE) return 1 + CLOUD_DAMAGE_FINAL;
  return 1 + (damageLevel * CLOUD_DAMAGE_FINAL) / MAX_UPGRADE;
}

/** Cloud strike before banner bonuses. Damage upgrades raise it. */
export function cloudStrikeDamage(damageLevel: number): number {
  return CLOUD_DAMAGE * cloudDamageMultiplier(damageLevel);
}

/** Health a cloud loses each time an enemy in reach strikes back. */
export function cloudStrikeBack(enemyMaxHp: number): number {
  return Math.max(6, Math.round(enemyMaxHp * 0.08));
}

/** Gold returned when a thief dies. A leak pays nothing back. */
export function thiefRefund(stolen: number, rate = THIEF_REFUND): number {
  return Math.floor(Math.max(0, stolen) * rate);
}

/** Extra gold when a bandit dies quickly. A zero bounty pays no purse. */
export function banditQuickBonus(reward: number, age: number): number {
  if (reward <= 0 || age > BANDIT_QUICK_SECONDS) return 0;
  return BANDIT_QUICK_GOLD;
}

/** The coin over a bandit, while a quick kill still pays. */
export function banditPurseOpen(age: number): boolean {
  return age <= BANDIT_QUICK_SECONDS;
}

/** Pyro hit. A target that is not already burning takes the extra damage. */
export function pyroHitDamage(damage: number, burning: boolean): number {
  return burning ? damage : damage * (1 + PYRO_FRESH_BONUS);
}

/** Fire damage per second from a Pyro hit of this size. */
export function pyroBurnDps(damage: number): number {
  return damage * PYRO_BURN_RATIO;
}

/** Health left after a Nuke. Nothing is deleted outright. */
export function nukeRemainingHp(hp: number): number {
  return Math.max(1, Math.ceil(hp * NUKE_SURVIVOR));
}

/** How many enemies a Chomp swallows before it sleeps. */
export function chompBiteCount(special: boolean): number {
  return special ? 2 : 1;
}

/** Bite radius in cells. The area upgrade widens it. */
export function chompRange(damageLevel: number): number {
  return CHOMP_RANGE * (1 + damageLevel * 0.4);
}

/**
 * Nap length in seconds. Each sleep upgrade cuts 5 seconds.
 * A banner's attack-speed bonus shortens it further.
 */
export function chompSleepSeconds(speedLevel: number, rateBonus = 0): number {
  const base = Math.max(8, CHOMP_SLEEP - speedLevel * CHOMP_SLEEP_STEP);
  return base / (1 + Math.max(0, rateBonus));
}

/** Price of the next Supply Drop. `uses` is how many this sniper has already called. */
export function supplyDropCost(uses: number): number {
  return SNIPER_SUPPLY_BASE + Math.max(0, uses) * SNIPER_SUPPLY_STEP;
}

/** How many maces are swinging. The special adds two to the first. */
export function maceCount(special: boolean): number {
  return special ? 3 : 1;
}

/**
 * Sweep radius in cells. Damage upgrades and area upgrades both widen it.
 * Area upgrades widen it more.
 */
export function maceRange(damageLevel: number, speedLevel: number): number {
  return MACE_RANGE * (1 + damageLevel * 0.12 + speedLevel * 0.18);
}

/**
 * Damage dealt each time a mace passes an enemy.
 * Damage upgrades and area upgrades both raise it. Damage upgrades raise it more.
 */
export function maceHitDamage(damageLevel: number, speedLevel: number): number {
  return MACE_HIT * (1 + damageLevel * 0.4) * (1 + speedLevel * 0.22);
}

/**
 * True when a forward sweep from `prev` to `next` passes `enemyAngle`.
 * Angles are radians. `prev` and `next` may grow past a full turn.
 */
export function maceSweepHits(prev: number, next: number, enemyAngle: number): boolean {
  const turn = Math.PI * 2;
  let target = enemyAngle;
  while (target <= prev) target += turn;
  while (target - turn > prev) target -= turn;
  return target > prev && target <= next;
}

/** True when a tile sits in the Nuke's 3×3, including the crater. */
export function inNukeBlast(
  col: number,
  row: number,
  originCol: number,
  originRow: number,
): boolean {
  return Math.abs(col - originCol) <= 1 && Math.abs(row - originRow) <= 1;
}

/** Cost to buy the next damage or speed upgrade for a tower. */
export function upgradeCost(baseCost: number, currentLevel: number): number {
  return Math.round(baseCost * 0.55 * (currentLevel + 1));
}

/**
 * Mint Income and Payout Rate cost more than a normal tower upgrade.
 * A 100-gold Mint pays 70, 140, then 210, instead of 55, 110, then 165.
 */
export function mintUpgradeCost(currentLevel: number): number {
  return Math.round(TOWER_DEFS.mint.cost * 0.7 * (currentLevel + 1));
}

/**
 * Storm Damage ranks cost more than a normal upgrade.
 * A 45-gold Storm pays 45, then 90, then 135. Speed and Hit Chance stay on the usual curve.
 */
export function stormDamageUpgradeCost(currentLevel: number): number {
  return Math.round(TOWER_DEFS.storm.cost * (currentLevel + 1));
}

/** How far Glacier Field reaches. Area ranks widen it. */
export function glacierRange(damageLevel: number): number {
  return TOWER_DEFS.frost.range * 1.12 * (1 + damageLevel * 0.18);
}

/** Seconds a Glacier pulse keeps enemies slowed. */
export function glacierDuration(durationLevel: number): number {
  return 1 + durationLevel * 0.45;
}

/** Seconds between Glacier pulses. Cooldown ranks shorten the wait. */
export function glacierCooldown(speedLevel: number): number {
  return 2.6 / (1 + speedLevel * 0.22);
}

/** Glacier chill. Enemies move at this fraction of their speed. */
export const GLACIER_SLOW = 0.4;

export function damageMultiplier(damageLevel: number): number {
  return 1 + damageLevel * 0.4;
}

/** Wasp damage ranks climb a little slower than a normal tower. */
export function waspDamageMultiplier(damageLevel: number): number {
  return 1 + damageLevel * WASP_DAMAGE_STEP;
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

  let range = def.support ? bannerRange(t.durationLevel) : def.range;
  let damage =
    def.damage *
    (t.kind === "wasp"
      ? waspDamageMultiplier(t.damageLevel)
      : t.kind === "storm"
        ? cloudDamageMultiplier(t.damageLevel)
        : damageMultiplier(t.damageLevel));
  let fireRate = def.fireRate * fireRateMultiplier(t.speedLevel);
  let splash = def.splash ?? 0;
  if (t.kind === "cannon") splash *= 1 + t.damageLevel * 0.14;
  let slow = def.slow ?? 0;
  let slowDuration = def.slowDuration ?? 0;
  let auraDamage = 0;
  let auraFreeze = false;
  let firesProjectiles = !def.storm && !def.nuke && !def.mace && !def.chomp;

  if (def.mace) {
    range = maceRange(t.damageLevel, t.speedLevel);
    damage = maceHitDamage(t.damageLevel, t.speedLevel);
  }

  if (def.chomp) {
    range = chompRange(t.damageLevel);
    damage = 0;
  }

  if (t.special) {
    if (t.kind === "archer") {
      range *= 1.5;
      damage *= 0.6;
    } else if (t.kind === "cannon") {
      damage *= 1.65;
      range *= 0.62;
      fireRate *= 1.25;
    } else if (t.kind === "frost") {
      damage = 0;
      firesProjectiles = false;
      auraFreeze = true;
      range = glacierRange(t.damageLevel);
      slow = GLACIER_SLOW;
      slowDuration = glacierDuration(t.durationLevel);
      fireRate = 1 / glacierCooldown(t.speedLevel);
    } else if (t.kind === "pyro") {
      range *= PYRO_SPECIAL_RANGE;
      auraDamage = 8 + t.damageLevel * 3.5;
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
 * How many times the endless ramp has compounded.
 * Same waves as before: 15, 20, 25, 40, then every 15 waves.
 */
export function endlessRampSteps(wave: number): number {
  if (wave < 15) return 0;
  if (wave < 20) return 1;
  if (wave < 25) return 2;
  if (wave < 40) return 3;
  return 4 + Math.floor((wave - 40) / 15);
}

/**
 * Extra endless multiplier. Each step is 10% of the current total,
 * so wave 15 is 10%, wave 20 is 21%, wave 25 is 33.1%, and so on.
 */
export function endlessRamp(wave: number): number {
  return 1.1 ** endlessRampSteps(wave) - 1;
}

/** Endless waves 30 and up: enemies pay nothing, and a Midas Bank prints slower. */
export function endlessDrought(wave: number): boolean {
  return wave >= 30;
}

/** Endless waves 30, 40, 50… send a Challenger as the last enemy. */
export function isChallengerWave(wave: number): boolean {
  return wave >= 30 && wave % 10 === 0;
}

/** A rule laid on top of the endless health ramp. Waves before 15 have none. */
export type EndlessMutator = "none" | "armor" | "marked";

/**
 * From wave 15, every five waves alternate.
 * Armor, then a marked pack, then armor again.
 */
export function endlessMutator(wave: number): EndlessMutator {
  if (wave < 15) return "none";
  const block = Math.floor((wave - 15) / 5);
  return block % 2 === 0 ? "armor" : "marked";
}

/** Damage an armored enemy soaks from each hit. Bosses are not armored. */
export function endlessArmor(wave: number): number {
  if (endlessMutator(wave) !== "armor") return 0;
  return 8 + Math.floor((wave - 15) / 10) * 2;
}

/**
 * Subtract armor from a hit, but always leave at least a fifth of it
 * so a small burn tick is weakened instead of erased or inflated.
 */
export function soakArmor(amount: number, armor: number): number {
  if (armor <= 0 || amount <= 0) return amount;
  const soaked = Math.min(armor, amount * 0.8);
  return amount - soaked;
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

export function isFinalBossWave(wave: number, lastWave = TOTAL_WAVES): boolean {
  return wave === lastWave;
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
      reward: endlessDrought(wave)
        ? 0
        : Math.round(next.reward * (1 + ramp * 0.2)),
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

/**
 * Which roster kind owns this spawn.
 * The first kind takes every even slot. The other kinds take turns in the odd slots.
 */
export function patternEnemy(roster: readonly PatternKind[], index: number): PatternKind {
  const lead = roster[0] ?? "normal";
  if (roster.length <= 1) return lead;
  if (index % 2 === 0) return lead;
  const extra = roster.slice(1);
  return extra[Math.floor(index / 2) % extra.length] ?? lead;
}

function legacyPattern(wave: number, index: number): PatternKind {
  if (wave >= 4 && index === 0) return "sapper";
  const isSpawner = wave >= 5 && index % 7 === 5;
  const isSplitter = wave >= 3 && index % 6 === 3 && !isSpawner;
  const isTank = wave >= 4 && index % 5 === 4 && !isSpawner;
  const isFast = wave >= 3 && index % 4 === 2 && !isSplitter && !isSpawner;
  const isThief =
    wave >= 2 &&
    index % 5 === 1 &&
    !isSpawner &&
    !isSplitter &&
    !isTank &&
    !isFast;
  if (isSpawner) return "spawner";
  if (isSplitter) return "splitter";
  if (isTank) return "tank";
  if (isFast) return "fast";
  if (isThief) return "thief";
  return "normal";
}

/**
 * Waves 1–5 keep the old per-wave health curve.
 * From wave 6 the pack's health is multiplied again.
 * Wave 6 is 1.25×, each later wave adds 0.20×, and from wave 13 each wave adds another 0.12×.
 * Wave 9 is 1.85×, wave 12 is 2.45×, wave 18 is 4.37×, wave 26 is 6.93×.
 * Bosses, the final boss, and Challengers do not use this.
 */
export const PRESSURE_START = 6;

export function pressureMultiplier(wave: number): number {
  if (wave < PRESSURE_START) return 1;
  const steps = wave - PRESSURE_START;
  const mid = 1.25 + steps * 0.2;
  const late = wave < 13 ? 0 : (wave - 12) * 0.12;
  return Math.round((mid + late) * 100) / 100;
}

/**
 * How often a later wave crowns a pack enemy.
 * Wave 8 crowns every 5th, and wave 12 crowns every 3rd.
 * The step stays odd so the crown moves through the warrant instead of sticking to one kind.
 * 0 means the wave has no crowns.
 */
export function eliteStride(wave: number): number {
  if (wave < ELITE_FROM_WAVE) return 0;
  if (wave < 12) return 5;
  return 3;
}

function eliteBlocked(
  wave: number,
  index: number,
  difficulty: Difficulty,
  lastWave: number,
): boolean {
  const count = waveEnemyCount(wave, difficulty);
  if (index < 0 || index >= count) return true;
  if (difficulty === "endless" && isChallengerWave(wave) && index === count - 1) return true;
  if (difficulty !== "endless" && wave === lastWave && index === count - 1) return true;
  if (isBossWave(wave) && index === count - 1) return true;
  return false;
}

/** This spawn slot wears a crown. Bosses, the final boss, and Challengers never do. */
export function isEliteSpawn(
  wave: number,
  index: number,
  difficulty: Difficulty = "normal",
  lastWave = TOTAL_WAVES,
): boolean {
  const stride = eliteStride(wave);
  if (stride === 0) return false;
  if (index % stride !== 1) return false;
  return !eliteBlocked(wave, index, difficulty, lastWave);
}

/** True when this wave crowns at least one pack enemy. */
export function waveSendsElites(
  wave: number,
  difficulty: Difficulty = "normal",
  lastWave = TOTAL_WAVES,
): boolean {
  if (eliteStride(wave) === 0) return false;
  const count = waveEnemyCount(wave, difficulty);
  for (let index = 0; index < count; index++) {
    if (isEliteSpawn(wave, index, difficulty, lastWave)) return true;
  }
  return false;
}

function applyElite(def: EnemyDef): EnemyDef {
  return {
    ...def,
    hp: Math.round(def.hp * ELITE_HP),
    reward: def.reward <= 0 ? 0 : Math.round(def.reward * ELITE_REWARD),
    elite: true,
  };
}

function fodderDef(kind: PatternKind, wave: number): EnemyDef {
  const scale = (1 + (wave - 1) * 0.22) * pressureMultiplier(wave);
  if (kind === "sapper") {
    return {
      kind,
      hp: Math.round(SAPPER_HP * scale),
      speed: SAPPER_SPEED,
      reward: 8 + wave,
      radius: 13,
      color: "#c46a2a",
      leakDamage: 1,
    };
  }
  if (kind === "spawner") {
    return {
      kind,
      hp: Math.round(110 * scale),
      speed: 38,
      reward: 18 + wave * 2,
      radius: 15,
      color: "#6a7a3a",
      leakDamage: 2,
    };
  }
  if (kind === "splitter") {
    return {
      kind,
      hp: Math.round(55 * scale),
      speed: NORMAL_SPEED,
      reward: 10 + wave,
      radius: 13,
      color: "#c978c0",
      leakDamage: 1,
    };
  }
  if (kind === "tank") {
    return {
      kind,
      hp: Math.round(90 * scale),
      speed: 42,
      reward: 12 + wave,
      radius: 14,
      color: "#8b5a3c",
      leakDamage: 1,
    };
  }
  if (kind === "fast") {
    return {
      kind,
      hp: Math.round(28 * scale),
      speed: 95 + wave * 2,
      reward: 8 + Math.floor(wave / 2),
      radius: 9,
      color: "#d4a84b",
      leakDamage: 1,
    };
  }
  if (kind === "thief") {
    return {
      kind,
      hp: Math.round(THIEF_HP * scale),
      speed: 110 + wave * 2,
      reward: 10 + Math.floor(wave / 2),
      radius: 12,
      color: "#6e4b9a",
      leakDamage: 1,
    };
  }
  if (kind === "husk") {
    return {
      kind,
      hp: Math.round(HUSK_HP * scale),
      speed: HUSK_SPEED,
      reward: 14 + wave,
      radius: 15,
      color: "#e0b15a",
      leakDamage: 2,
    };
  }
  return {
    kind: "normal",
    hp: Math.round(BASIC_GRUNT_HP * scale),
    speed: NORMAL_SPEED + wave,
    reward: 6 + Math.floor(wave / 2),
    radius: 11,
    color: "#c45c4a",
    leakDamage: 1,
  };
}

export function enemyForWave(
  wave: number,
  index: number,
  difficulty: Difficulty = "normal",
  lastWave = TOTAL_WAVES,
  roster?: readonly PatternKind[],
): EnemyDef {
  const count = waveEnemyCount(wave, difficulty);

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

  // Final boss — last spawn of the level. Endless keeps going.
  if (difficulty !== "endless" && isFinalBossWave(wave, lastWave) && index === count - 1) {
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

  const kind =
    roster && roster.length > 0
      ? patternEnemy(roster, index)
      : legacyPattern(wave, index);
  const def = applyHard(fodderDef(kind, wave), wave, difficulty);
  return isEliteSpawn(wave, index, difficulty, lastWave) ? applyElite(def) : def;
}

/**
 * One weaker enemy left where a pressured pack enemy died.
 * It does not leave another enemy, and it has none of the parent's tricks.
 */
export function weakerEnemy(
  parent: { maxHp: number; speed: number; radius: number },
  drought: boolean,
): EnemyDef {
  return {
    kind: "normal",
    hp: Math.max(8, Math.round(parent.maxHp * 0.42)),
    speed: Math.max(36, Math.round(parent.speed * 0.75)),
    reward: drought ? 0 : 1,
    radius: Math.max(7, parent.radius - 3),
    color: "#e7b0a2",
    leakDamage: 1,
  };
}

/** Children spawned when a splitter dies — normal speed, no further splits. */
export function splitlingFrom(
  parentHp: number,
  wave: number,
  difficulty: Difficulty = "normal",
  hpFraction = 0.35,
): EnemyDef {
  return applyHard(
    {
      kind: "splitling",
      hp: Math.max(12, Math.round(parentHp * hpFraction)),
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
