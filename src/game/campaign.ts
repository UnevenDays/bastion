import { COLS, PATH, ROWS, TOTAL_WAVES } from "./config";
import type { PatternKind } from "./types";

export interface CampaignCell {
  col: number;
  row: number;
}

export type TilePattern =
  | "tufts"
  | "stripes"
  | "marsh"
  | "cobble"
  | "blossom"
  | "slate"
  | "embers"
  | "dunes";

export interface CampaignLevel {
  id: string;
  name: string;
  /** Waves to clear. Endless ignores this and keeps going. */
  waves: number;
  blurb: string;
  path: CampaignCell[];
  water: CampaignCell[];
  /** Trunks on the grass. A shot through a trunk stops. */
  trees: CampaignCell[];
  /** Rocks fall on towers during a wave. */
  rocks: boolean;
  /** Auto aim uses a shorter range. */
  fog: boolean;
  grass: [string, string];
  pattern: TilePattern;
  /** Edge, fill, and center dash of the road. */
  road: { edge: string; fill: string; dash: string };
  /** Soft tint over the grass. Empty on the original four roads. */
  wash: string;
  /** Blue mouths on the later roads. Empty on the original road. */
  portals: readonly LevelPortal[];
  /** Three enemy patterns. Each one sends one to four kinds. */
  warrants: readonly [LevelWarrant, LevelWarrant, LevelWarrant];
}

/** A blue mouth. An empty lane is the entrance that used to say IN. */
export interface LevelPortal {
  /** First wave this mouth sends. The entrance is wave 1. */
  openWave: number;
  /** Mouth first, not including the main-road tile it steps onto. */
  cells: readonly CampaignCell[];
  /** Main-road tile this lane joins. The entrance uses the start of the road. */
  join: CampaignCell;
}

export interface LevelWarrant {
  id: string;
  name: string;
  /** Spawn order. The first kind leads. One to four, with no repeats. */
  enemies: WarrantEnemies;
  /** The company's trick, written on the warrant button. */
  gimmick: string;
  /** Gold a bandit takes each steal. */
  steal?: number;
  /** Seconds between steals. */
  stealEvery?: number;
  /** Share of stolen gold returned on a kill. */
  refund?: number;
  /** Pack health multiplier. Bosses are left out. */
  hp?: number;
  /** Pack speed multiplier. Bosses are left out. */
  speed?: number;
  /** Damage soaked off each hit. */
  soak?: number;
  /** Seconds a sapper shuts a tower off. */
  silence?: number;
  /** Cells off the road a sapper can reach. */
  reach?: number;
  /** Children a splitter leaves. */
  children?: number;
  /** Splitling health as a fraction of the parent. */
  childHp?: number;
  /** Seconds between nest summons. */
  brood?: number;
  /** The nest summons two at once. */
  twins?: boolean;
  /** Summon health multiplier. */
  broodHp?: number;
  /** Fast enemies and summons walk side paths. */
  side?: boolean;
  /** A husk cracks at this fraction of health. */
  crack?: number;
  /** Extra multiplier on the cracked sprint. */
  sprint?: number;
}

export interface SideSpur {
  leave: number;
  rejoin: number;
  cells: CampaignCell[];
}

type WarrantEnemies =
  | readonly [PatternKind]
  | readonly [PatternKind, PatternKind]
  | readonly [PatternKind, PatternKind, PatternKind]
  | readonly [PatternKind, PatternKind, PatternKind, PatternKind];

const DIRT = {
  edge: "#5a4a35",
  fill: "#3d3428",
  dash: "rgba(232, 197, 71, 0.15)",
};

/** Orthogonal corners, including both ends. Joints are not repeated. */
function march(corners: CampaignCell[]): CampaignCell[] {
  const out: CampaignCell[] = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i]!;
    const b = corners[i + 1]!;
    const dc = Math.sign(b.col - a.col);
    const dr = Math.sign(b.row - a.row);
    if (dc !== 0 && dr !== 0) {
      throw new Error(`Campaign road bends diagonally at ${a.col},${a.row}`);
    }
    const steps = Math.abs(b.col - a.col) + Math.abs(b.row - a.row);
    const start = i === 0 ? 0 : 1;
    for (let s = start; s <= steps; s++) {
      out.push({ col: a.col + dc * s, row: a.row + dr * s });
    }
  }
  return out;
}

export const CAMPAIGN: CampaignLevel[] = [
  {
    id: "road",
    name: "Road",
    waves: TOTAL_WAVES,
    blurb: "The original road. Twelve waves.",
    path: PATH.map((p) => ({ col: p.col, row: p.row })),
    water: [],
    trees: [],
    rocks: false,
    fog: false,
    grass: ["#1e3a28", "#1a3324"],
    pattern: "tufts",
    road: DIRT,
    wash: "",
    portals: [],
    warrants: [
      { id: "red-column", name: "Red Column", enemies: ["normal", "fast", "tank", "sapper"], gimmick: "Soaks 4 damage off every hit.", soak: 4 },
      { id: "cutpurse", name: "Cutpurse Line", enemies: ["normal", "thief", "splitter"], gimmick: "Bandits steal 3 gold a second.", steal: 3 },
      { id: "runner-nest", name: "Runner Nest", enemies: ["fast", "spawner"], gimmick: "Runners and summons take side paths.", side: true },
    ],
  },
  {
    id: "switchback",
    name: "Switchback",
    waves: 14,
    blurb: "The road folds back on itself. Fourteen waves.",
    path: march([
      { col: 0, row: 8 },
      { col: 11, row: 8 },
      { col: 11, row: 4 },
      { col: 2, row: 4 },
      { col: 2, row: 1 },
      { col: 15, row: 1 },
    ]),
    water: [],
    trees: [],
    rocks: false,
    fog: false,
    grass: ["#3a3424", "#322c20"],
    pattern: "stripes",
    road: DIRT,
    wash: "",
    portals: [
      { openWave: 1, cells: [], join: { col: 0, row: 8 } },
      { openWave: 7, cells: [{ col: 0, row: 1 }, { col: 1, row: 1 }], join: { col: 2, row: 1 } },
    ],
    warrants: [
      { id: "sprinters", name: "Sprinters", enemies: ["fast", "thief"], gimmick: "The pack moves 30% faster.", speed: 1.3 },
      { id: "iron-fold", name: "Iron Fold", enemies: ["tank", "splitter", "normal"], gimmick: "The pack has 30% more health.", hp: 1.3 },
      { id: "breach-crew", name: "Breach Crew", enemies: ["sapper", "fast", "tank", "thief"], gimmick: "A sapper shuts a tower off for 6 seconds.", silence: 6 },
    ],
  },
  {
    id: "marsh",
    name: "Marsh",
    waves: 16,
    blurb: "Sixteen waves. Water puddles cannot hold a tower.",
    path: march([
      { col: 0, row: 3 },
      { col: 5, row: 3 },
      { col: 5, row: 8 },
      { col: 14, row: 8 },
      { col: 14, row: 1 },
      { col: 15, row: 1 },
    ]),
    water: [
      { col: 1, row: 0 },
      { col: 2, row: 0 },
      { col: 3, row: 0 },
      { col: 2, row: 1 },
      { col: 3, row: 1 },
      { col: 8, row: 3 },
      { col: 9, row: 3 },
      { col: 10, row: 3 },
      { col: 8, row: 4 },
      { col: 9, row: 4 },
      { col: 10, row: 4 },
      { col: 9, row: 5 },
      { col: 7, row: 6 },
      { col: 8, row: 6 },
      { col: 9, row: 6 },
      { col: 8, row: 7 },
      { col: 11, row: 2 },
      { col: 12, row: 2 },
      { col: 13, row: 2 },
      { col: 12, row: 3 },
      { col: 13, row: 3 },
    ],
    trees: [],
    rocks: false,
    fog: false,
    grass: ["#163830", "#12322c"],
    pattern: "marsh",
    road: DIRT,
    wash: "",
    portals: [
      { openWave: 1, cells: [], join: { col: 0, row: 3 } },
      {
        openWave: 8,
        cells: [
          { col: 0, row: 8 },
          { col: 1, row: 8 },
          { col: 2, row: 8 },
          { col: 3, row: 8 },
          { col: 4, row: 8 },
        ],
        join: { col: 5, row: 8 },
      },
    ],
    warrants: [
      { id: "bog-shields", name: "Bog Shields", enemies: ["tank", "spawner", "normal"], gimmick: "Soaks 6 damage off every hit.", soak: 6 },
      { id: "reed-split", name: "Reed Split", enemies: ["normal", "splitter", "sapper"], gimmick: "A splitter leaves three children.", children: 3 },
      { id: "flood-purse", name: "Flood Purse", enemies: ["thief", "tank", "fast", "spawner"], gimmick: "Bandits steal every half second.", stealEvery: 0.5 },
    ],
  },
  {
    id: "causeway",
    name: "Causeway",
    waves: 18,
    blurb: "A long loop that ends in the middle. Eighteen waves.",
    path: march([
      { col: 0, row: 1 },
      { col: 15, row: 1 },
      { col: 15, row: 8 },
      { col: 2, row: 8 },
      { col: 2, row: 4 },
      { col: 12, row: 4 },
      { col: 12, row: 6 },
      { col: 6, row: 6 },
    ]),
    water: [],
    trees: [],
    rocks: false,
    fog: false,
    grass: ["#2a3038", "#242a32"],
    pattern: "cobble",
    road: DIRT,
    wash: "",
    portals: [
      { openWave: 1, cells: [], join: { col: 0, row: 1 } },
      { openWave: 7, cells: [{ col: 0, row: 8 }, { col: 1, row: 8 }], join: { col: 2, row: 8 } },
      { openWave: 13, cells: [{ col: 0, row: 4 }, { col: 1, row: 4 }], join: { col: 2, row: 4 } },
    ],
    warrants: [
      { id: "long-split", name: "Long Split", enemies: ["splitter", "fast", "normal"], gimmick: "Splitter children keep half the parent's health.", childHp: 0.5 },
      { id: "bulwark", name: "Bulwark", enemies: ["tank"], gimmick: "Tanks have 50% more health and move slower.", hp: 1.5, speed: 0.85 },
      { id: "hole-hive", name: "Hole and Hive", enemies: ["sapper", "spawner", "thief"], gimmick: "The nest summons every 2 seconds.", brood: 2 },
    ],
  },
  {
    id: "orchard",
    name: "Orchard",
    waves: 20,
    blurb: "Twenty waves. Trees block shots that pass through their trunks.",
    path: march([
      { col: 0, row: 2 },
      { col: 12, row: 2 },
      { col: 12, row: 6 },
      { col: 1, row: 6 },
      { col: 1, row: 8 },
      { col: 15, row: 8 },
      { col: 15, row: 4 },
      { col: 13, row: 4 },
    ]),
    water: [],
    trees: [
      { col: 2, row: 1 },
      { col: 5, row: 1 },
      { col: 8, row: 1 },
      { col: 11, row: 1 },
      { col: 3, row: 3 },
      { col: 6, row: 3 },
      { col: 9, row: 3 },
      { col: 4, row: 4 },
      { col: 7, row: 4 },
      { col: 10, row: 4 },
      { col: 3, row: 5 },
      { col: 8, row: 5 },
      { col: 6, row: 7 },
      { col: 10, row: 7 },
      { col: 14, row: 5 },
      { col: 14, row: 7 },
    ],
    rocks: false,
    fog: false,
    grass: ["#243528", "#1c2c22"],
    pattern: "blossom",
    road: {
      edge: "#7a5a48",
      fill: "#5c4034",
      dash: "rgba(244, 190, 200, 0.4)",
    },
    wash: "rgba(255, 186, 196, 0.08)",
    portals: [
      { openWave: 1, cells: [], join: { col: 0, row: 2 } },
      { openWave: 9, cells: [{ col: 0, row: 7 }, { col: 0, row: 8 }], join: { col: 1, row: 8 } },
    ],
    warrants: [
      { id: "petal-rush", name: "Petal Rush", enemies: ["fast", "normal", "thief"], gimmick: "The pack moves 25% faster.", speed: 1.25 },
      { id: "bloom-nest", name: "Bloom Nest", enemies: ["splitter", "spawner"], gimmick: "The nest summons two at a time.", twins: true },
      { id: "root-crew", name: "Root Crew", enemies: ["tank", "sapper", "splitter", "thief"], gimmick: "Sappers reach 2.2 cells off the road.", reach: 2.2 },
    ],
  },
  {
    id: "quarry",
    name: "Quarry",
    waves: 22,
    blurb: "Twenty-two waves. Rocks fall during a wave and shut a tower off for 2.5 seconds.",
    path: march([
      { col: 0, row: 8 },
      { col: 12, row: 8 },
      { col: 12, row: 5 },
      { col: 2, row: 5 },
      { col: 2, row: 1 },
      { col: 14, row: 1 },
      { col: 14, row: 3 },
      { col: 8, row: 3 },
    ]),
    water: [],
    trees: [],
    rocks: true,
    fog: false,
    grass: ["#2a3134", "#23292c"],
    pattern: "slate",
    road: {
      edge: "#6a6e68",
      fill: "#4a4e48",
      dash: "rgba(214, 218, 210, 0.32)",
    },
    wash: "rgba(170, 196, 206, 0.07)",
    portals: [
      { openWave: 1, cells: [], join: { col: 0, row: 8 } },
      { openWave: 8, cells: [{ col: 0, row: 1 }, { col: 1, row: 1 }], join: { col: 2, row: 1 } },
      {
        openWave: 15,
        cells: [
          { col: 15, row: 8 },
          { col: 14, row: 8 },
          { col: 13, row: 8 },
        ],
        join: { col: 12, row: 8 },
      },
    ],
    warrants: [
      { id: "stone-line", name: "Stone Line", enemies: ["tank", "normal", "splitter", "sapper"], gimmick: "The pack has 25% more health.", hp: 1.25 },
      { id: "dust-pockets", name: "Dust Pockets", enemies: ["thief", "splitter"], gimmick: "Bandits steal 2 gold, and a kill returns none of it.", steal: 2, refund: 0 },
      { id: "pit-hive", name: "Pit Hive", enemies: ["spawner", "tank"], gimmick: "Nest summons have double health.", broodHp: 2 },
    ],
  },
  {
    id: "night",
    name: "Night Watch",
    waves: 24,
    blurb: "Twenty-four waves. Fog shortens Auto range to 65%. Other aim keeps full range.",
    path: march([
      { col: 0, row: 1 },
      { col: 15, row: 1 },
      { col: 15, row: 4 },
      { col: 2, row: 4 },
      { col: 2, row: 8 },
      { col: 13, row: 8 },
      { col: 13, row: 6 },
      { col: 6, row: 6 },
    ]),
    water: [],
    trees: [],
    rocks: false,
    fog: true,
    grass: ["#1b1d30", "#141626"],
    pattern: "embers",
    road: {
      edge: "#3c3e52",
      fill: "#2a2c3e",
      dash: "rgba(232, 208, 140, 0.4)",
    },
    wash: "rgba(16, 14, 36, 0.2)",
    portals: [
      { openWave: 1, cells: [], join: { col: 0, row: 1 } },
      { openWave: 11, cells: [{ col: 0, row: 8 }, { col: 1, row: 8 }], join: { col: 2, row: 8 } },
    ],
    warrants: [
      { id: "lantern-thieves", name: "Lantern Bandits", enemies: ["thief", "sapper", "fast"], gimmick: "Bandits steal 2 gold, and the pack is faster.", steal: 2, speed: 1.2 },
      { id: "full-dark", name: "Full Dark", enemies: ["spawner", "splitter", "normal", "tank"], gimmick: "The pack has more health, and summons come sooner.", hp: 1.15, brood: 2.2 },
      { id: "single-spark", name: "Single Spark", enemies: ["fast"], gimmick: "The runners move 45% faster.", speed: 1.45 },
    ],
  },
  {
    id: "desert",
    name: "Desert",
    waves: 26,
    blurb: "Twenty-six waves. Sand dunes, and the Desert Husk.",
    path: march([
      { col: 0, row: 2 },
      { col: 15, row: 2 },
      { col: 15, row: 5 },
      { col: 2, row: 5 },
      { col: 2, row: 8 },
      { col: 12, row: 8 },
      { col: 12, row: 6 },
      { col: 6, row: 6 },
    ]),
    water: [],
    trees: [],
    rocks: false,
    fog: false,
    grass: ["#6b4e2e", "#5c4126"],
    pattern: "dunes",
    road: {
      edge: "#c4a36a",
      fill: "#8d6b3e",
      dash: "rgba(255, 236, 196, 0.4)",
    },
    wash: "rgba(214, 168, 92, 0.12)",
    portals: [
      { openWave: 1, cells: [], join: { col: 0, row: 2 } },
      { openWave: 9, cells: [{ col: 0, row: 8 }, { col: 1, row: 8 }], join: { col: 2, row: 8 } },
      { openWave: 18, cells: [{ col: 0, row: 5 }, { col: 1, row: 5 }], join: { col: 2, row: 5 } },
    ],
    warrants: [
      { id: "husk-line", name: "Husk Line", enemies: ["husk"], gimmick: "A Desert Husk cracks at 70% health.", crack: 0.7 },
      { id: "dry-wind", name: "Dry Wind", enemies: ["husk", "fast", "thief"], gimmick: "The pack is faster, and a cracked husk sprints harder.", speed: 1.2, sprint: 1.25 },
      { id: "shell-breach", name: "Shell Breach", enemies: ["husk", "sapper", "tank", "splitter"], gimmick: "Sappers silence for 6 seconds, and a husk cracks at 60% health.", silence: 6, crack: 0.6 },
    ],
  },
];

/** Extra enemies from portals that have opened, 10% of the pack for each one. */
export function portalEnemyBonus(base: number, openSides: number): number {
  if (base <= 0 || openSides <= 0) return 0;
  return openSides * Math.max(1, Math.round(base * 0.1));
}

/** One sentence for the road card. Empty on the original road. */
export function portalNote(level: CampaignLevel): string {
  const later = level.portals.filter((portal) => portal.openWave > 1);
  if (later.length === 0) return "";
  const waves = later.map((portal) => `wave ${portal.openWave}`).join(" and ");
  const mouths = later.length === 1 ? "A second portal opens" : "Two more portals open";
  return ` ${mouths} on ${waves}. Each one adds 10% more enemies, and its lane joins the road to the bastion.`;
}

export function campaignById(id: string): CampaignLevel {
  return CAMPAIGN.find((level) => level.id === id) ?? CAMPAIGN[0]!;
}

function cellKey(cell: CampaignCell): string {
  return `${cell.col},${cell.row}`;
}

/**
 * Two short lanes beside a straight stretch. Fast enemies leave the road,
 * walk the lane, and rejoin a couple of tiles ahead.
 */
export function openSideSpurs(
  path: readonly CampaignCell[],
  blocked: ReadonlySet<string>,
): SideSpur[] {
  const occupied = new Set(path.map(cellKey));
  for (const key of blocked) occupied.add(key);
  const spurs: SideSpur[] = [];
  let i = 2;
  while (i < path.length - 4 && spurs.length < 2) {
    const here = path[i];
    const next = path[i + 1];
    const after = path[i + 2];
    if (!here || !next || !after) break;
    const dirCol = Math.sign(next.col - here.col);
    const dirRow = Math.sign(next.row - here.row);
    const straight =
      Math.sign(after.col - next.col) === dirCol &&
      Math.sign(after.row - next.row) === dirRow &&
      Math.abs(next.col - here.col) + Math.abs(next.row - here.row) === 1 &&
      Math.abs(after.col - next.col) + Math.abs(after.row - next.row) === 1;
    if (!straight) {
      i += 1;
      continue;
    }
    const perps = [
      { col: -dirRow, row: dirCol },
      { col: dirRow, row: -dirCol },
    ];
    let placed = false;
    for (const perp of perps) {
      const cells = [0, 1, 2].map((step) => ({
        col: path[i + step]!.col + perp.col,
        row: path[i + step]!.row + perp.row,
      }));
      const free = cells.every(
        (cell) =>
          cell.col >= 0 &&
          cell.row >= 0 &&
          cell.col < COLS &&
          cell.row < ROWS &&
          !occupied.has(cellKey(cell)),
      );
      if (!free) continue;
      for (const cell of cells) occupied.add(cellKey(cell));
      spurs.push({ leave: i, rejoin: i + 2, cells });
      placed = true;
      break;
    }
    i += placed ? 6 : 1;
  }
  return spurs;
}
