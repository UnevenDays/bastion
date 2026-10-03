import { COLS, PATH, ROWS } from "./config";
import type { EnemyDef, EnemyKind } from "./types";

export interface Cell {
  col: number;
  row: number;
}

/** Enemy groups the editor can place. Splitlings are spawned by splitters. */
export type EditableKind =
  | "normal"
  | "fast"
  | "tank"
  | "splitter"
  | "spawner"
  | "boss"
  | "challenger";

export const EDITABLE_KINDS: { kind: EditableKind; label: string }[] = [
  { kind: "normal", label: "Grunt" },
  { kind: "fast", label: "Runner" },
  { kind: "tank", label: "Tank" },
  { kind: "splitter", label: "Splitter" },
  { kind: "spawner", label: "Spawner" },
  { kind: "boss", label: "Boss" },
  { kind: "challenger", label: "Challenger" },
];

export interface EnemyGroup {
  kind: EditableKind;
  count: number;
  hp: number;
  speed: number;
  reward: number;
}

export interface LevelWave {
  enemies: EnemyGroup[];
}

export interface CustomLevel {
  path: Cell[];
  gold: number;
  lives: number;
  waves: LevelWave[];
}

const LOOKS: Record<EditableKind, { color: string; radius: number; leak: number }> = {
  normal: { color: "#c45c4a", radius: 11, leak: 1 },
  fast: { color: "#d4a84b", radius: 9, leak: 1 },
  tank: { color: "#8b5a3c", radius: 14, leak: 1 },
  splitter: { color: "#c978c0", radius: 13, leak: 1 },
  spawner: { color: "#6a7a3a", radius: 15, leak: 2 },
  boss: { color: "#6b2d8a", radius: 20, leak: 5 },
  challenger: { color: "#d4a24a", radius: 18, leak: 4 },
};

const KIND_SET = new Set<string>(EDITABLE_KINDS.map((k) => k.kind));

export function defaultLevel(): CustomLevel {
  return {
    path: PATH.map((p) => ({ col: p.col, row: p.row })),
    gold: 120,
    lives: 20,
    waves: [
      { enemies: [{ kind: "normal", count: 8, hp: 40, speed: 63, reward: 6 }] },
      {
        enemies: [
          { kind: "normal", count: 6, hp: 48, speed: 64, reward: 7 },
          { kind: "fast", count: 4, hp: 30, speed: 99, reward: 9 },
        ],
      },
      {
        enemies: [
          { kind: "tank", count: 3, hp: 110, speed: 42, reward: 14 },
          { kind: "boss", count: 1, hp: 900, speed: 45, reward: 90 },
        ],
      },
    ],
  };
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function cellKey(c: Cell): string {
  return `${c.col},${c.row}`;
}

export function pathError(path: Cell[]): string | null {
  if (path.length < 2) return "The road needs at least two connected tiles.";
  const seen = new Set<string>();
  for (let i = 0; i < path.length; i++) {
    const cell = path[i];
    if (
      cell.col < 0 ||
      cell.row < 0 ||
      cell.col >= COLS ||
      cell.row >= ROWS
    ) {
      return "A road tile is off the map.";
    }
    const key = cellKey(cell);
    if (seen.has(key)) return "The road cannot cross itself.";
    seen.add(key);
    if (i === 0) continue;
    const prev = path[i - 1];
    const step = Math.abs(prev.col - cell.col) + Math.abs(prev.row - cell.row);
    if (step !== 1) return "Each tile has to touch the previous one.";
  }
  return null;
}

function groupFrom(raw: unknown): EnemyGroup | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<EnemyGroup>;
  const kind = KIND_SET.has(String(row.kind)) ? (row.kind as EditableKind) : "normal";
  return {
    kind,
    count: clampInt(row.count, 1, 40, 1),
    hp: clampInt(row.hp, 1, 100000, 40),
    speed: clampInt(row.speed, 8, 400, 62),
    reward: clampInt(row.reward, 0, 10000, 6),
  };
}

/** Keep a saved draft playable. An unfinished road is left as-is for the editor. */
export function normalizeLevel(raw: unknown): CustomLevel {
  const base = defaultLevel();
  if (!raw || typeof raw !== "object") return base;
  const src = raw as Partial<CustomLevel>;
  const path = Array.isArray(src.path)
    ? src.path
        .filter(
          (c): c is Cell =>
            !!c &&
            typeof c === "object" &&
            Number.isFinite((c as Cell).col) &&
            Number.isFinite((c as Cell).row),
        )
        .map((c) => ({ col: Math.round(c.col), row: Math.round(c.row) }))
        .slice(0, COLS * ROWS)
    : base.path;
  const waves = Array.isArray(src.waves)
    ? src.waves
        .map((wave) => {
          const enemies = Array.isArray(wave?.enemies)
            ? wave.enemies.map(groupFrom).filter((g): g is EnemyGroup => g !== null)
            : [];
          return { enemies };
        })
        .filter((wave) => wave.enemies.length > 0)
        .slice(0, 24)
    : [];
  return {
    path: path.length > 0 ? path : base.path,
    gold: clampInt(src.gold, 0, 99999, base.gold),
    lives: clampInt(src.lives, 1, 999, base.lives),
    waves: waves.length > 0 ? waves : base.waves,
  };
}

export function levelProblems(level: CustomLevel): string | null {
  const road = pathError(level.path);
  if (road) return road;
  if (level.waves.length === 0) return "Add at least one wave.";
  for (let i = 0; i < level.waves.length; i++) {
    const count = customSpawnCount(level, i + 1);
    if (count < 1) return `Wave ${i + 1} needs an enemy.`;
  }
  return null;
}

export function customSpawnCount(level: CustomLevel, wave: number): number {
  const groups = level.waves[wave - 1]?.enemies ?? [];
  return groups.reduce((sum, group) => sum + group.count, 0);
}

export function customEnemyAt(
  level: CustomLevel,
  wave: number,
  index: number,
): EnemyDef {
  const groups = level.waves[wave - 1]?.enemies ?? [];
  let cursor = 0;
  for (const group of groups) {
    if (index < cursor + group.count) return groupToDef(group);
    cursor += group.count;
  }
  return groupToDef(groups[0] ?? defaultLevel().waves[0].enemies[0]);
}

function groupToDef(group: EnemyGroup): EnemyDef {
  const look = LOOKS[group.kind];
  const kind: EnemyKind = group.kind;
  return {
    kind,
    hp: group.hp,
    speed: group.speed,
    reward: group.reward,
    radius: look.radius,
    color: look.color,
    leakDamage: look.leak,
  };
}

/** Click a tile: start the road, extend it, or pull it back to that tile. */
export function editPath(path: Cell[], col: number, row: number): Cell[] {
  const next = { col, row };
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return path;
  const index = path.findIndex((c) => c.col === col && c.row === row);
  if (index >= 0 && index === path.length - 1) return path.slice(0, -1);
  if (index >= 0) return path.slice(0, index + 1);
  if (path.length === 0) return [next];
  const last = path[path.length - 1];
  const step = Math.abs(last.col - col) + Math.abs(last.row - row);
  if (step !== 1) return path;
  return [...path, next];
}
