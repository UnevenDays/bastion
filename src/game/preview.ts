import type { LevelWarrant } from "./campaign";
import {
  SAPPER_SILENCE,
  isBossWave,
  isChallengerWave,
  waveSendsElites,
} from "./config";
import type { Difficulty, PatternKind } from "./types";

const LEAD: Record<string, string> = {
  normal: "Grunt",
  fast: "Runner",
  tank: "Tank",
  splitter: "Splitter",
  spawner: "Spawner",
  thief: "Bandit",
  sapper: "Sapper",
  husk: "Husk",
  boss: "Boss",
  finalBoss: "Final Boss",
  challenger: "Challenger",
  splitling: "Bit",
};

const FOLLOW: Record<string, string> = {
  normal: "grunts",
  fast: "runners",
  tank: "tanks",
  splitter: "splitters",
  spawner: "spawners",
  thief: "bandits",
  sapper: "sappers",
  husk: "husks",
  boss: "the boss",
  finalBoss: "the final boss",
  challenger: "the challenger",
  splitling: "bits",
};

const HALLOW_LEAD: Record<string, string> = {
  normal: "Lantern",
  fast: "Wisp",
  tank: "Coffin",
  splitter: "Split",
  spawner: "Cauldron",
  thief: "Trick",
  sapper: "Crow",
  boss: "Pumpkin King",
};

const HALLOW_FOLLOW: Record<string, string> = {
  normal: "lanterns",
  fast: "wisps",
  tank: "coffins",
  splitter: "splits",
  spawner: "cauldrons",
  thief: "tricks",
  sapper: "crows",
  boss: "the Pumpkin King",
};

function leadWord(kind: string, hallow: boolean): string {
  const table = hallow ? HALLOW_LEAD : LEAD;
  return table[kind] ?? kind;
}

function followWord(kind: string, hallow: boolean): string {
  const table = hallow ? HALLOW_FOLLOW : FOLLOW;
  return table[kind] ?? kind;
}

function joinFollow(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

/** "Wave 4: Sapper leads, then runners." Kinds stay in first-seen order. */
export function leadLine(wave: number, kinds: readonly string[], hallow = false, extra = ""): string {
  const unique: string[] = [];
  for (const kind of kinds) {
    if (!kind || unique.includes(kind)) continue;
    unique.push(kind);
  }
  if (wave < 1 || unique.length === 0) return "";
  const [first, ...rest] = unique;
  const body =
    rest.length === 0
      ? `${leadWord(first!, hallow)} leads.`
      : `${leadWord(first!, hallow)} leads, then ${joinFollow(rest.map((kind) => followWord(kind, hallow)))}.`;
  return `Wave ${wave}: ${body}${extra}`;
}

/**
 * The pack you are about to face, from the warrant's lead kind.
 * Bosses, crowns, and a portal that opens on this wave are named after the pack.
 */
export function campaignPreview(
  wave: number,
  roster: readonly PatternKind[],
  difficulty: Difficulty,
  lastWave: number,
  portalOpens = false,
  trainCrosses = false,
): string {
  let extra = "";
  if (difficulty !== "endless" && wave === lastWave) extra += " The final boss closes the wave.";
  else if (isBossWave(wave)) extra += " A boss closes the wave.";
  else if (difficulty === "endless" && isChallengerWave(wave)) extra += " A challenger closes the wave.";
  if (waveSendsElites(wave, difficulty, lastWave)) extra += " Some wear a crown.";
  if (portalOpens) extra += " A new portal sends more of the lead.";
  if (trainCrosses) extra += " A train crosses the rails.";
  return leadLine(wave, roster, false, extra);
}

/** Editor and Hallow Gate waves, in the order the groups are written. */
export function customPreview(wave: number, kinds: readonly string[], hallow = false): string {
  return leadLine(wave, kinds, hallow);
}

function more(mult: number | undefined): number {
  return Math.round(((mult ?? 1) - 1) * 100);
}

function silenceSeconds(warrant: LevelWarrant): number {
  return warrant.silence ?? SAPPER_SILENCE;
}

/**
 * What to bring against this company, before the first wave.
 * Red Column: "Splash or slow helps; Sapper shuts a tower for 4s."
 */
export function draftAdvice(warrant: LevelWarrant): string {
  const silence = silenceSeconds(warrant);
  const speed = more(warrant.speed);
  const health = more(warrant.hp);
  const crack = Math.round((warrant.crack ?? 0.5) * 100);
  switch (warrant.id) {
    case "red-column":
      return `Splash or slow helps; Sapper shuts a tower for ${silence}s.`;
    case "cutpurse":
      return `Kill Bandits quickly; they steal ${warrant.steal ?? 3} gold a second.`;
    case "runner-nest":
      return "Watch the side paths; Runners and summons leave the road.";
    case "sprinters":
      return `Slow the pack; it moves ${speed}% faster, and Bandits steal.`;
    case "iron-fold":
      return `Bring heavy damage; the pack has ${health}% more health.`;
    case "breach-crew":
      return `Keep a spare tower; Sapper shuts one off for ${silence}s.`;
    case "bog-shields":
      return `Splash or slow helps; the pack soaks ${warrant.soak ?? 6} off every hit.`;
    case "reed-split":
      return `Splash the Splitter; it leaves ${warrant.children ?? 3} children, and Sapper shuts a tower for ${silence}s.`;
    case "flood-purse":
      return "Kill Bandits on sight; they steal every half second.";
    case "long-split":
      return "Splash early; Splitter children keep half the parent's health.";
    case "bulwark":
      return `Bring heavy damage; Tanks have ${health}% more health and move slower.`;
    case "hole-hive":
      return `Clear the nest; it summons every ${warrant.brood ?? 2} seconds, and Sapper shuts a tower for ${silence}s.`;
    case "petal-rush":
      return `Slow the front; the pack is ${speed}% faster, and Bandits steal.`;
    case "bloom-nest":
      return "Splash the nest; it summons two at a time.";
    case "root-crew":
      return `Set towers back; Sappers reach ${warrant.reach ?? 2.2} cells off the road and shut one off for ${silence}s.`;
    case "stone-line":
      return `Bring heavy damage; the pack has ${health}% more health, and Sapper shuts a tower for ${silence}s.`;
    case "dust-pockets":
      return "Kill Bandits quickly; a kill returns none of the gold they stole.";
    case "pit-hive":
      return "Focus the nest; its summons have double health.";
    case "lantern-thieves":
      return `Kill Bandits quickly; they steal ${warrant.steal ?? 2} gold, the pack is faster, and Sapper shuts a tower for ${silence}s.`;
    case "full-dark":
      return `Splash the nest; summons come every ${warrant.brood ?? 2.2} seconds, and the pack has more health.`;
    case "single-spark":
      return `Slow the lane; Runners move ${speed}% faster.`;
    case "husk-line":
      return `Slow the Husk; it cracks at ${crack}% health and sprints.`;
    case "dry-wind":
      return "Slow before the crack; a cracked Husk sprints harder, and Bandits steal.";
    case "shell-breach":
      return `Keep a spare tower; Sapper shuts one off for ${silence}s, and a Husk cracks at ${crack}% health.`;
    default:
      return warrant.gimmick;
  }
}
