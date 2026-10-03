import { PATH, TOTAL_WAVES } from "./config";

export interface CampaignCell {
  col: number;
  row: number;
}

export type TilePattern = "tufts" | "stripes" | "marsh" | "cobble";

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
}

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
  },
];

export function campaignById(id: string): CampaignLevel {
  return CAMPAIGN.find((level) => level.id === id) ?? CAMPAIGN[0]!;
}
