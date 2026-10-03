export type Vec2 = { x: number; y: number };

export type Difficulty = "normal" | "hard";

/** Classic roadside towers vs on-road traps & monsters. */
export type GameMode = "bastion" | "dungeon" | "lawn";

export type TowerKind = "archer" | "cannon" | "frost" | "mint" | "wasp" | "banner";

/** Who a tower prefers. Auto means the nearest enemy. */
export type TargetMode = "auto" | "first" | "last" | "strongest" | "weakest";

export type EnemyKind =
  | "normal"
  | "fast"
  | "tank"
  | "splitter"
  | "splitling"
  | "spawner"
  | "boss"
  | "finalBoss";

export interface TowerDef {
  kind: TowerKind;
  name: string;
  cost: number;
  range: number;
  damage: number;
  fireRate: number; // shots per second
  color: string;
  projectileSpeed: number;
  splash?: number;
  slow?: number; // multiplier, e.g. 0.5 = half speed
  slowDuration?: number;
  description: string;
  /** Economy towers produce gold instead of fighting. */
  economy?: boolean;
  /** Leaves its perch and hunts. No range circle. */
  flying?: boolean;
  /** Buffs other towers instead of shooting. */
  support?: boolean;
}

/** A wasp or one of its mini drones. */
export interface Flyer {
  x: number;
  y: number;
  targetId: number | null;
  cooldown: number;
}

export interface SpecialUpgradeDef {
  name: string;
  description: string;
  /** Multiplier of tower base cost. */
  costMultiplier: number;
}

export interface EnemyDef {
  kind: EnemyKind;
  hp: number;
  speed: number;
  reward: number;
  radius: number;
  color: string;
  leakDamage?: number;
}

export interface Tower {
  col: number;
  row: number;
  kind: TowerKind;
  cooldown: number;
  damageLevel: number;
  speedLevel: number;
  special: boolean;
  /** Gold sunk into this tower (for sell refund). */
  invested: number;
  /** Coins stored in a Midas Bank. Each wave pays 25%, and that gold leaves the bank. */
  banked: number;
  /** Which enemy this tower prefers. */
  targeting: TargetMode;
  /** Body of a flying tower. Null for towers that stay on their tile. */
  flyer: Flyer | null;
  /** Mini drones from the wasp special. */
  drones: Flyer[];
  /** Flips First/Last, Strong/Weak, and nearest/farthest. */
  inverted: boolean;
}

export interface Enemy {
  id: number;
  kind: EnemyKind;
  pathIndex: number;
  progress: number; // 0..1 along current segment
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  reward: number;
  radius: number;
  color: string;
  slowTimer: number;
  leakDamage: number;
  x: number;
  y: number;
  /** Spawner: countdown until next summoned enemy. */
  spawnTimer: number;
  /** Seconds since this enemy last lost health. */
  sinceDamage: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  splash: number;
  slow: number;
  slowDuration: number;
  color: string;
  targetId: number | null;
  life: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}
