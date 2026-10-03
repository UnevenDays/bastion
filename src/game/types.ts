export type Vec2 = { x: number; y: number };

export type TowerKind = "archer" | "cannon" | "frost";

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
}

export interface EnemyDef {
  hp: number;
  speed: number;
  reward: number;
  radius: number;
  color: string;
}

export interface Tower {
  col: number;
  row: number;
  kind: TowerKind;
  cooldown: number;
}

export interface Enemy {
  id: number;
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
  x: number;
  y: number;
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
