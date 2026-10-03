import { PATH, TOTAL_WAVES } from "./config";

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
  | "embers";

export interface CampaignLevel {
  id: string;
  name: string;
  /** Waves to clear. Endless ignores this and keeps going. */
  waves: number;
  blurb: string;
  path: CampaignCell[];
  water: CampaignCell[];
  grass: [string, string];
  pattern: TilePattern;
  /** Edge, fill, and center dash of the road. */
  road: { edge: string; fill: string; dash: string };
  /** Soft tint over the grass. Empty on the original four roads. */
  wash: string;
}

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
    grass: ["#1e3a28", "#1a3324"],
    pattern: "tufts",
    road: DIRT,
    wash: "",
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
    grass: ["#3a3424", "#322c20"],
    pattern: "stripes",
    road: DIRT,
    wash: "",
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
    grass: ["#163830", "#12322c"],
    pattern: "marsh",
    road: DIRT,
    wash: "",
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
    grass: ["#2a3038", "#242a32"],
    pattern: "cobble",
    road: DIRT,
    wash: "",
  },
  {
    id: "orchard",
    name: "Orchard",
    waves: 20,
    blurb: "Twenty waves. Blossom on the grass, and a pale road.",
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
    grass: ["#243528", "#1c2c22"],
    pattern: "blossom",
    road: {
      edge: "#7a5a48",
      fill: "#5c4034",
      dash: "rgba(244, 190, 200, 0.4)",
    },
    wash: "rgba(255, 186, 196, 0.08)",
  },
  {
    id: "quarry",
    name: "Quarry",
    waves: 22,
    blurb: "Twenty-two waves. Cut stone under a gray field.",
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
    grass: ["#2a3134", "#23292c"],
    pattern: "slate",
    road: {
      edge: "#6a6e68",
      fill: "#4a4e48",
      dash: "rgba(214, 218, 210, 0.32)",
    },
    wash: "rgba(170, 196, 206, 0.07)",
  },
  {
    id: "night",
    name: "Night Watch",
    waves: 24,
    blurb: "Twenty-four waves. A dark field, and tiles that glimmer.",
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
    grass: ["#1b1d30", "#141626"],
    pattern: "embers",
    road: {
      edge: "#3c3e52",
      fill: "#2a2c3e",
      dash: "rgba(232, 208, 140, 0.4)",
    },
    wash: "rgba(16, 14, 36, 0.2)",
  },
];

export function campaignById(id: string): CampaignLevel {
  return CAMPAIGN.find((level) => level.id === id) ?? CAMPAIGN[0]!;
}
