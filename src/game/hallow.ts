import type { CustomLevel } from "./level";

/** The ticket bar on the Event tab fills to this. */
export const TICKET_CAP = 24;

const TICKET_KEY = "bastion-event-tickets";

export interface TicketStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Lives still on the gate. A clear always pays at least one ticket. */
export function hallowPayout(lives: number): number {
  const n = Math.floor(lives);
  return Math.max(1, Number.isFinite(n) ? n : 1);
}

export function loadTickets(storage: TicketStore): number {
  const n = Number(storage.getItem(TICKET_KEY));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(TICKET_CAP, Math.floor(n));
}

/** Add tickets from a clear. The bar never passes the cap. */
export function grantTickets(
  storage: TicketStore,
  amount: number,
): { total: number; gained: number } {
  const before = loadTickets(storage);
  const add = Math.max(0, Math.floor(amount));
  const total = Math.min(TICKET_CAP, before + add);
  storage.setItem(TICKET_KEY, String(total));
  return { total, gained: total - before };
}

function march(corners: { col: number; row: number }[]): { col: number; row: number }[] {
  const out: { col: number; row: number }[] = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i]!;
    const b = corners[i + 1]!;
    const dc = Math.sign(b.col - a.col);
    const dr = Math.sign(b.row - a.row);
    const steps = Math.abs(b.col - a.col) + Math.abs(b.row - a.row);
    const start = i === 0 ? 0 : 1;
    for (let s = start; s <= steps; s++) {
      out.push({ col: a.col + dc * s, row: a.row + dr * s });
    }
  }
  return out;
}

/** A stitched lane through the pumpkin yard, ending at the right-hand gate. */
export const HALLOW_LEVEL: CustomLevel = {
  path: march([
    { col: 0, row: 2 },
    { col: 4, row: 2 },
    { col: 4, row: 5 },
    { col: 8, row: 5 },
    { col: 8, row: 2 },
    { col: 12, row: 2 },
    { col: 12, row: 6 },
    { col: 15, row: 6 },
  ]),
  gold: 160,
  lives: 18,
  waves: [
    { enemies: [{ kind: "normal", count: 8, hp: 40, speed: 58, reward: 7 }] },
    {
      enemies: [
        { kind: "normal", count: 5, hp: 46, speed: 60, reward: 7 },
        { kind: "fast", count: 6, hp: 26, speed: 108, reward: 8 },
      ],
    },
    {
      enemies: [
        { kind: "tank", count: 4, hp: 150, speed: 40, reward: 16 },
        { kind: "fast", count: 4, hp: 28, speed: 110, reward: 8 },
      ],
    },
    {
      enemies: [
        { kind: "thief", count: 6, hp: 48, speed: 92, reward: 10 },
        { kind: "splitter", count: 3, hp: 90, speed: 52, reward: 12 },
      ],
    },
    {
      enemies: [
        { kind: "spawner", count: 2, hp: 170, speed: 36, reward: 18 },
        { kind: "sapper", count: 3, hp: 70, speed: 68, reward: 11 },
      ],
    },
    {
      enemies: [
        { kind: "fast", count: 6, hp: 30, speed: 112, reward: 8 },
        { kind: "boss", count: 1, hp: 1200, speed: 42, reward: 80 },
      ],
    },
  ],
};

/** Yard dressing that stays off the lane. */
export const HALLOW_MARKS: { col: number; row: number; kind: "pumpkin" | "grave" }[] = [
  { col: 1, row: 0, kind: "grave" },
  { col: 2, row: 4, kind: "pumpkin" },
  { col: 6, row: 1, kind: "pumpkin" },
  { col: 6, row: 7, kind: "grave" },
  { col: 7, row: 8, kind: "pumpkin" },
  { col: 10, row: 0, kind: "grave" },
  { col: 10, row: 4, kind: "pumpkin" },
  { col: 14, row: 1, kind: "grave" },
  { col: 14, row: 3, kind: "pumpkin" },
  { col: 13, row: 8, kind: "pumpkin" },
  { col: 3, row: 8, kind: "grave" },
];
