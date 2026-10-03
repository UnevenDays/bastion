export interface EndlessScore {
  name: string;
  wave: number;
  gold: number;
  at: number;
}

export interface ScoreStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const BOARD_KEY = "bastion-endless-board";
export const BOARD_LIMIT = 10;

export function cleanName(name: string): string {
  const trimmed = name.replace(/\s+/g, " ").trim().slice(0, 16);
  return trimmed.length > 0 ? trimmed : "Warden";
}

function sortScores(scores: EndlessScore[]): EndlessScore[] {
  return [...scores].sort((a, b) => b.wave - a.wave || b.gold - a.gold || a.at - b.at);
}

export function loadScores(store: ScoreStore): EndlessScore[] {
  try {
    const raw = store.getItem(BOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const scores: EndlessScore[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== "object") continue;
      const item = row as Partial<EndlessScore>;
      const wave = Number(item.wave);
      const gold = Number(item.gold);
      const at = Number(item.at);
      if (!Number.isFinite(wave) || wave < 1) continue;
      scores.push({
        name: cleanName(String(item.name ?? "")),
        wave: Math.round(wave),
        gold: Number.isFinite(gold) ? Math.max(0, Math.round(gold)) : 0,
        at: Number.isFinite(at) ? at : 0,
      });
    }
    return sortScores(scores).slice(0, BOARD_LIMIT);
  } catch {
    return [];
  }
}

export function saveScore(store: ScoreStore, score: EndlessScore): EndlessScore[] {
  const next = sortScores([
    ...loadScores(store),
    {
      name: cleanName(score.name),
      wave: Math.max(1, Math.round(score.wave)),
      gold: Math.max(0, Math.round(score.gold)),
      at: score.at,
    },
  ]).slice(0, BOARD_LIMIT);
  store.setItem(BOARD_KEY, JSON.stringify(next));
  return next;
}
