import {
  BANNER_BUFF,
  BANNER_CAP,
  BANNER_LIMIT,
  BASIC_GRUNT_HP,
  CHOMP_RANGE,
  CHOMP_SLEEP,
  GATE_DAMAGE,
  GATE_RANGE,
  GATE_RATE,
  GATE_REINFORCE_LIVES,
  GATE_REPAIR_AMOUNT,
  GATE_REPAIR_EACH,
  GATE_VOLLEY_COST,
  HUSK_HP,
  HUSK_SPEED,
  HUSK_SPRINT,
  MACE_HIT,
  MACE_PERIOD,
  MACE_RANGE,
  SAPPER_HP,
  SAPPER_SILENCE,
  SNIPER_DAMAGE,
  SNIPER_RATE,
  SNIPER_SUPPLY_BASE,
  SNIPER_SUPPLY_GOLD,
  SNIPER_SUPPLY_LIVES,
  SPECIAL_UPGRADES,
  THIEF_HP,
  THIEF_STEAL,
  TOWER_DEFS,
  gateReinforceCost,
  specialCost,
  stormHitChance,
} from "./game/config";
import { DUNGEON_BUILDS } from "./game/dungeonConfig";
import { PLANTS, ZOMBIES } from "./game/lawnConfig";
import type { TowerKind } from "./game/types";

export type AlmanacChapter = "towers" | "enemies";

export interface AlmanacPair {
  id: string;
  name: string;
  note: string;
}

export interface AlmanacEntry {
  id: string;
  name: string;
  color: string;
  role: string;
  /** yours = on the bench or always held. armory = not added. road = walks this road. follows = spawned by something on the road. elsewhere = in the book, not on this road. */
  place: "yours" | "armory" | "road" | "follows" | "elsewhere";
  placeLabel: string;
  stats: [string, string][];
  about: string;
  pairsTitle: string;
  pairs: AlmanacPair[];
}

export interface AlmanacBook {
  title: string;
  subtitle: string;
  towers: AlmanacEntry[];
  enemies: AlmanacEntry[];
}

export interface AlmanacQuery {
  mode: "bastion" | "dungeon" | "lawn";
  bench: readonly TowerKind[];
  benchLimited: boolean;
  built: Partial<Record<TowerKind, number>>;
  volley: boolean;
  faced: readonly string[];
  roadLabel: string;
  custom: boolean;
}

function rate(shotsPerSecond: number): string {
  const rounded = Math.round(shotsPerSecond * 100) / 100;
  return `${rounded}/s`;
}

function gold(amount: number): string {
  return `${amount}g`;
}

function esc(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function towerPlace(
  query: AlmanacQuery,
  kind: TowerKind,
): Pick<AlmanacEntry, "place" | "placeLabel"> {
  const built = query.built[kind] ?? 0;
  const builtNote = built > 0 ? ` · built ${built}` : "";
  if (!query.benchLimited || query.bench.includes(kind)) {
    return {
      place: "yours",
      placeLabel: `${query.benchLimited ? "On your bench" : "Available"}${builtNote}`,
    };
  }
  return { place: "armory", placeLabel: "Not added" };
}

function enemyPlace(
  query: AlmanacQuery,
  id: string,
  follows: boolean,
): Pick<AlmanacEntry, "place" | "placeLabel"> {
  if (query.faced.includes(id)) return { place: "road", placeLabel: "On this road" };
  if (follows) return { place: "follows", placeLabel: "Comes with them" };
  return { place: "elsewhere", placeLabel: "Not on this road" };
}

function classicBook(query: AlmanacQuery): AlmanacBook {
  const archer = TOWER_DEFS.archer;
  const cannon = TOWER_DEFS.cannon;
  const frost = TOWER_DEFS.frost;
  const mint = TOWER_DEFS.mint;
  const wasp = TOWER_DEFS.wasp;
  const banner = TOWER_DEFS.banner;
  const storm = TOWER_DEFS.storm;
  const pyro = TOWER_DEFS.pyro;
  const mace = TOWER_DEFS.mace;
  const sniper = TOWER_DEFS.sniper;
  const chomp = TOWER_DEFS.chomp;
  const nuke = TOWER_DEFS.nuke;
  const hit = Math.round(stormHitChance(0) * 100);
  const hitMax = Math.round(stormHitChance(3) * 100);

  const towers: AlmanacEntry[] = [
    {
      id: "bastion",
      name: "Bastion",
      color: "#d7c4a3",
      role: "Gate",
      place: "yours",
      placeLabel: query.volley ? "Your gate · bow ready" : "Your gate",
      stats: [
        ["Lives", "The gate"],
        ["Mend", "1 life between waves"],
        ["Repair", `${GATE_REPAIR_EACH}g a life, up to ${GATE_REPAIR_AMOUNT}`],
        ["Reinforce", `+${GATE_REINFORCE_LIVES} lives · ${gold(gateReinforceCost(0))}, then ${gold(gateReinforceCost(1))}, then ${gold(gateReinforceCost(2))}`],
        ["Volley", `${gold(GATE_VOLLEY_COST)} · ${GATE_DAMAGE} damage · ${rate(GATE_RATE)} · range ${GATE_RANGE}`],
      ],
      about:
        "The warden stands in the gate at the exit. A leak cracks the wood. Between waves the gate mends 1 life. Repair and Reinforce wait until the wave ends. Volley is a bow, a little softer than an Archer, and it aims First.",
      pairsTitle: "Works with",
      pairs: [
        { id: "banner", name: "Banner", note: "A banner that reaches the exit, or a Grand Banner, raises the bow's damage and speed." },
        { id: "sniper", name: "Sniper", note: "Supply Drop gives the gate a life and gold." },
        { id: "frost", name: "Frost", note: "Slowed enemies spend longer inside the bow's range." },
      ],
    },
    {
      id: "archer",
      name: archer.name,
      color: archer.color,
      role: "Shooter",
      ...towerPlace(query, "archer"),
      stats: [
        ["Cost", gold(archer.cost)],
        ["Damage", String(archer.damage)],
        ["Rate", rate(archer.fireRate)],
        ["Range", String(archer.range)],
        [SPECIAL_UPGRADES.archer.name, `${gold(specialCost("archer"))} · range ×1.5, damage ×0.6`],
      ],
      about: "A fast single-target bow. Damage ranks add 40% of the base shot. Hawk Eye reaches farther and hits lighter. Its circle does not deal damage.",
      pairsTitle: "Works with",
      pairs: [
        { id: "frost", name: "Frost", note: "Slowed enemies stay inside the 2.6 range long enough for several shots." },
        { id: "banner", name: "Banner", note: "The bow is already quick, so the attack-speed buff piles up." },
        { id: "cannon", name: "Cannon", note: "The blast opens a pack. The bow finishes whoever is left standing." },
        { id: "runner", name: "Runner", note: "Place the bow early on the road. Runners are thin and die in a few shots." },
      ],
    },
    {
      id: "cannon",
      name: cannon.name,
      color: cannon.color,
      role: "Splash",
      ...towerPlace(query, "cannon"),
      stats: [
        ["Cost", gold(cannon.cost)],
        ["Damage", String(cannon.damage)],
        ["Rate", rate(cannon.fireRate)],
        ["Range", String(cannon.range)],
        ["Splash", `${cannon.splash} cells, wider with damage ranks`],
        [SPECIAL_UPGRADES.cannon.name, `${gold(specialCost("cannon"))} · damage ×1.65, range ×0.62, rate ×1.25`],
      ],
      about: "A tight blast. Each damage rank also widens the splash. Focus Charge hits harder, reaches less, and fires faster.",
      pairsTitle: "Works with",
      pairs: [
        { id: "frost", name: "Frost", note: "A chill packs enemies into the same blast." },
        { id: "banner", name: "Banner", note: "The cannon is slow. The rate buff is the piece it wants." },
        { id: "splitter", name: "Splitter", note: "One blast can catch the parent and the two children together." },
      ],
    },
    {
      id: "frost",
      name: frost.name,
      color: frost.color,
      role: "Slow",
      ...towerPlace(query, "frost"),
      stats: [
        ["Cost", gold(frost.cost)],
        ["Damage", String(frost.damage)],
        ["Rate", rate(frost.fireRate)],
        ["Range", String(frost.range)],
        ["Slow", "52% speed for 1.6s"],
        [SPECIAL_UPGRADES.frost.name, `${gold(specialCost("frost"))} · pulse at 40% speed`],
      ],
      about: "Shots slow whoever they hit. Glacier Field stops shooting and pulses a chill. Area widens that pulse, Chill lengthens it, and the speed upgrade brings the next pulse sooner. A slow puts fire out.",
      pairsTitle: "Works with",
      pairs: [
        { id: "cannon", name: "Cannon", note: "Held enemies overlap inside the splash." },
        { id: "mace", name: "Mace", note: "A slowed enemy takes more than one pass of the spin." },
        { id: "chomp", name: "Chomp", note: "The chill keeps a tank inside the bite." },
        { id: "pyro", name: "Pyro", note: "Keep them on different stretches. Frost clears Pyro's burn." },
      ],
    },
    {
      id: "mint",
      name: mint.name,
      color: mint.color,
      role: "Gold",
      ...towerPlace(query, "mint"),
      stats: [
        ["Cost", gold(mint.cost)],
        ["Tick", "5 gold, then more from Income"],
        ["Upgrades", "70g, 140g, 210g"],
        [SPECIAL_UPGRADES.mint.name, `${gold(specialCost("mint"))} · each wave pays 25%`],
      ],
      about: "Prints gold only while a wave is running. Income raises the payout. Payout Rate shortens the wait, down to 1.4 seconds. Midas Bank takes coins off your gold and pays 25% when the next wave starts. That payout leaves the bank.",
      pairsTitle: "Works with",
      pairs: [
        { id: "wasp", name: "Wasp", note: "The press pays for the expensive hunters." },
        { id: "sniper", name: "Sniper", note: "Supply Drop and the rifle both want a full purse." },
        { id: "nuke", name: "Nuke", note: "Bank gold early, then spend it on the blast when a boss appears." },
      ],
    },
    {
      id: "wasp",
      name: wasp.name,
      color: wasp.color,
      role: "Hunter",
      ...towerPlace(query, "wasp"),
      stats: [
        ["Cost", gold(wasp.cost)],
        ["Damage", String(wasp.damage)],
        ["Rate", rate(wasp.fireRate)],
        ["Ranks", "+30% damage each"],
        [SPECIAL_UPGRADES.wasp.name, `${gold(specialCost("wasp"))} · 3 drones at 25% damage`],
      ],
      about: "No range circle. It flies to one enemy and stays until that enemy falls, then picks another. Drone Wing sends three smaller hunters that spread across the pack.",
      pairsTitle: "Works with",
      pairs: [
        { id: "frost", name: "Frost", note: "The pack crawls while the wasp stays on one target." },
        { id: "sniper", name: "Sniper", note: "The rifle opens a tank. The wasp stays on what is left." },
        { id: "banner", name: "Banner", note: "The nest tile takes the buff, so the wasp and its drones hit harder." },
        { id: "tank", name: "Tank", note: "Constant hits stop a tank from regenerating." },
      ],
    },
    {
      id: "banner",
      name: banner.name,
      color: banner.color,
      role: "Support",
      ...towerPlace(query, "banner"),
      stats: [
        ["Cost", gold(banner.cost)],
        ["Buff", `${Math.round(BANNER_BUFF * 100)}% damage and speed`],
        ["Cap", `${Math.round(BANNER_CAP * 100)}% from every banner together`],
        ["Limit", `${BANNER_LIMIT} banners, one Grand`],
        ["Area", "2.6, then +0.6 a rank"],
        [SPECIAL_UPGRADES.banner.name, `${gold(specialCost("banner"))} · the whole map`],
      ],
      about: "It does not shoot. Towers in the circle gain damage and attack speed, and each upgrade raises that side. Grand Banner uses the same buff on every tower, including the gate. Area is closed on a Grand Banner.",
      pairsTitle: "Works with",
      pairs: [
        { id: "archer", name: "Archer", note: "A fast tower makes the most of the speed buff." },
        { id: "cannon", name: "Cannon", note: "The slow cannon wants the rate." },
        { id: "storm", name: "Storm", note: "Lightning and the clouds both hit harder inside the buff." },
        { id: "chomp", name: "Chomp", note: "The speed buff shortens the nap." },
      ],
    },
    {
      id: "storm",
      name: storm.name,
      color: storm.color,
      role: "Lightning",
      ...towerPlace(query, "storm"),
      stats: [
        ["Cost", gold(storm.cost)],
        ["Damage", String(storm.damage)],
        ["Rate", rate(storm.fireRate)],
        ["Hit Chance", `${hit}%, +12% a rank, up to ${hitMax}%`],
        [SPECIAL_UPGRADES.storm.name, `${gold(specialCost("storm"))} · 150 health, 26 damage`],
      ],
      about: "No range circle and no aim. Lightning strikes across the map. Hit Chance raises how often a bolt locks onto a living enemy. The rest only hurt enemies standing in the splash. Cloud Allies summons a cloud at the entrance every 15 seconds, up to five. A small cloud circles the tower once the special is bought.",
      pairsTitle: "Works with",
      pairs: [
        { id: "banner", name: "Banner", note: "The buff raises the lightning and the cloud's hits." },
        { id: "frost", name: "Frost", note: "Slowed enemies sit in the splash and on the clouds." },
        { id: "runner", name: "Runner", note: "A bolt does not have to travel, so a runner cannot outrun the shot." },
      ],
    },
    {
      id: "pyro",
      name: pyro.name,
      color: pyro.color,
      role: "Fire",
      ...towerPlace(query, "pyro"),
      stats: [
        ["Cost", gold(pyro.cost)],
        ["Damage", String(pyro.damage)],
        ["Rate", rate(pyro.fireRate)],
        ["Range", String(pyro.range)],
        ["Burn", "2.4s, half the hit each second"],
        [SPECIAL_UPGRADES.pyro.name, `${gold(specialCost("pyro"))} · range ×0.7, the interior burns`],
      ],
      about: "Short range. A target that is not already burning takes the hit again as extra damage, then the burn ticks. Inner Flame shrinks the circle and burns everything inside it.",
      pairsTitle: "Works with",
      pairs: [
        { id: "mace", name: "Mace", note: "Both want a corner where the road bends." },
        { id: "cannon", name: "Cannon", note: "The blast groups a pack into the short fire." },
        { id: "frost", name: "Frost", note: "A slow puts the fire out. Give them different tiles." },
      ],
    },
    {
      id: "mace",
      name: mace.name,
      color: mace.color,
      role: "Spin",
      ...towerPlace(query, "mace"),
      stats: [
        ["Cost", gold(mace.cost)],
        ["Hit", String(MACE_HIT)],
        ["Spin", `${MACE_PERIOD}s a turn`],
        ["Range", String(MACE_RANGE)],
        [SPECIAL_UPGRADES.mace.name, `${gold(specialCost("mace"))} · 3 maces`],
      ],
      about: "One mace spins around the tower and strikes every enemy it passes. Damage upgrades and area upgrades both raise the hit and the width. Area widens it more. Damage raises the hit more.",
      pairsTitle: "Works with",
      pairs: [
        { id: "frost", name: "Frost", note: "A slowed enemy stays in the circle for extra passes." },
        { id: "banner", name: "Banner", note: "The buff raises the hit. The spin keeps its own pace." },
        { id: "tank", name: "Tank", note: "The spin keeps touching a tank, so its regen never finishes." },
      ],
    },
    {
      id: "sniper",
      name: sniper.name,
      color: sniper.color,
      role: "Rifle",
      ...towerPlace(query, "sniper"),
      stats: [
        ["Cost", gold(sniper.cost)],
        ["Damage", String(SNIPER_DAMAGE)],
        ["Rate", rate(SNIPER_RATE)],
        ["Range", "The whole map"],
        [SPECIAL_UPGRADES.sniper.name, `${gold(SNIPER_SUPPLY_BASE)} first · ${SNIPER_SUPPLY_LIVES} life, ${SNIPER_SUPPLY_GOLD} gold`],
      ],
      about: "No range limit. The round is slow and heavy. A wave-1 grunt falls to one hit. Supply Drop can be called once each wave, and every later call costs 25 gold more. Set it to Strongest on a Marked wave.",
      pairsTitle: "Works with",
      pairs: [
        { id: "bastion", name: "Bastion", note: "The drop mends the gate and refills the purse." },
        { id: "wasp", name: "Wasp", note: "The rifle wounds a boss. The wasp stays to finish it." },
        { id: "boss", name: "Boss", note: "A map-wide shot is how you start on a boss the moment it appears." },
      ],
    },
    {
      id: "chomp",
      name: chomp.name,
      color: chomp.color,
      role: "Swallow",
      ...towerPlace(query, "chomp"),
      stats: [
        ["Cost", gold(chomp.cost)],
        ["Bite", "1 enemy, any health"],
        ["Nap", `${CHOMP_SLEEP}s, then 20, 15, 10`],
        ["Range", String(CHOMP_RANGE)],
        [SPECIAL_UPGRADES.chomp.name, `${gold(specialCost("chomp"))} · two bites, one nap`],
      ],
      about: "It swallows one enemy in the circle, pays that bounty, then sleeps. Area widens the bite. The speed upgrade cuts 5 seconds off the nap. A banner's speed buff shortens it further. On a Marked wave the bite lands only if the aim is Strongest.",
      pairsTitle: "Works with",
      pairs: [
        { id: "frost", name: "Frost", note: "The chill holds a target inside the circle." },
        { id: "banner", name: "Banner", note: "The speed buff cuts the nap." },
        { id: "tank", name: "Tank", note: "Health does not matter. One bite removes the tank." },
        { id: "husk", name: "Desert Husk", note: "Swallow it before the shell cracks and it sprints." },
      ],
    },
    {
      id: "nuke",
      name: nuke.name,
      color: nuke.color,
      role: "Blast",
      ...towerPlace(query, "nuke"),
      stats: [
        ["Cost", gold(nuke.cost)],
        ["Blast", "Leaves a tenth of each enemy's health, at least 1"],
        ["Crater", "The center tile, for the rest of the run"],
        ["Friendly", "Destroys your towers in the 3×3"],
      ],
      about: "It detonates the moment you place it, then it is gone. Every enemy on the field is left with a tenth of its health, and at least 1. Towers in the 3×3 are destroyed, including coins in a Midas Bank there.",
      pairsTitle: "Works with",
      pairs: [
        { id: "archer", name: "Archer", note: "The bow clears the sliver the blast leaves." },
        { id: "storm", name: "Storm", note: "Lightning finishes enemies scattered across the map." },
        { id: "boss", name: "Boss", note: "Spend it when a boss and a pack share the road." },
      ],
    },
  ];

  const splitterHere = query.faced.includes("splitter");
  const enemies: AlmanacEntry[] = [
    {
      id: "normal",
      name: "Grunt",
      color: "#c45c4a",
      role: "Pack",
      ...enemyPlace(query, "normal", false),
      stats: [
        ["Wave 1 health", String(BASIC_GRUNT_HP)],
        ["Speed", "Rises a little each wave"],
        ["Leak", "1 life"],
        ["Bounty", "6, then a little more"],
      ],
      about: "The ordinary soldier. From wave 6 on a campaign road, killing one leaves a weaker enemy with 42% of its health, a slower step, and 1 gold. That leftover does not leave another. An editor level skips this.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "archer", name: "Archer", note: "A few shots end a grunt, and the bow is cheap enough to cover the first waves." },
        { id: "storm", name: "Storm", note: "Lightning covers the whole road while the pack is still thin." },
      ],
    },
    {
      id: "fast",
      name: "Runner",
      color: "#d4a84b",
      role: "Fast",
      ...enemyPlace(query, "fast", false),
      stats: [
        ["Health", "28 before the wave scale"],
        ["Speed", "95, plus 2 each wave"],
        ["Leak", "1 life"],
      ],
      about: "Thin and quick. A tower aimed at First will chase the runner and let the pack behind it walk. Last or Auto holds the line while a sniper or a storm picks the runner off.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "frost", name: "Frost", note: "A chill is the reliable way to keep a runner inside a short range." },
        { id: "storm", name: "Storm", note: "The bolt does not travel down the road." },
        { id: "sniper", name: "Sniper", note: "One heavy round is more than a runner has." },
      ],
    },
    {
      id: "tank",
      name: "Tank",
      color: "#8b5a3c",
      role: "Armor",
      ...enemyPlace(query, "tank", false),
      stats: [
        ["Health", "90 before the wave scale"],
        ["Speed", "42"],
        ["Regen", "Full health after 3s without a hit"],
        ["Hard", "No regen"],
      ],
      about: "Slow and thick. On Normal and Endless, three quiet seconds restore all of its health. A dashed green ring marks that wait. Hard mode turns the regen off.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "mace", name: "Mace", note: "The spin keeps touching it, so the regen never completes." },
        { id: "wasp", name: "Wasp", note: "It stays on the tank until the tank falls." },
        { id: "chomp", name: "Chomp", note: "One bite removes it, health and all." },
        { id: "sniper", name: "Sniper", note: "The heavy round opens the fight before the tank reaches your corner." },
      ],
    },
    {
      id: "splitter",
      name: "Splitter",
      color: "#c978c0",
      role: "Split",
      ...enemyPlace(query, "splitter", false),
      stats: [
        ["Health", "55 before the wave scale"],
        ["On death", "Two splitlings"],
        ["Child health", "35% of the parent's max"],
      ],
      about: "Pink, and it splits into two when it dies. The children move at a normal step and do not split again. Killing it on top of the gate gives the children almost no road left.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "cannon", name: "Cannon", note: "The splash can hit the parent and both children." },
        { id: "frost", name: "Frost", note: "Slow the children before they separate down the road." },
        { id: "splitling", name: "Splitling", note: "Plan for two more bodies every time one of these falls." },
      ],
    },
    {
      id: "splitling",
      name: "Splitling",
      color: "#e0a8d8",
      role: "Child",
      ...enemyPlace(query, "splitling", splitterHere),
      stats: [
        ["Health", "35% of the parent"],
        ["Speed", "A normal step"],
        ["Split", "Does not split"],
        ["Leak", "1 life"],
      ],
      about: "The two children a Splitter leaves behind. They pay a small bounty and leak like a grunt.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "cannon", name: "Cannon", note: "They spawn on top of each other, inside one blast." },
        { id: "archer", name: "Archer", note: "Each child is a short target for the bow." },
      ],
    },
    {
      id: "spawner",
      name: "Spawner",
      color: "#6a7a3a",
      role: "Nest",
      ...enemyPlace(query, "spawner", false),
      stats: [
        ["Health", "110 before the wave scale"],
        ["Speed", "38"],
        ["Brood", "A weak grunt every 3.2s"],
        ["Leak", "2 lives"],
      ],
      about: "It walks slowly and summons a small grunt every few seconds while it lives. The summons are ordinary grunts with less health. Kill the nest before the road fills.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "sniper", name: "Sniper", note: "Aim Strongest and the rifle stays on the nest." },
        { id: "chomp", name: "Chomp", note: "Swallow the nest. The summons already on the road still have to be shot." },
        { id: "cannon", name: "Cannon", note: "The splash clears the brood gathered around it." },
      ],
    },
    {
      id: "thief",
      name: "Thief",
      color: "#6e4b9a",
      role: "Thief",
      ...enemyPlace(query, "thief", false),
      stats: [
        ["Health", String(THIEF_HP) + " before the wave scale"],
        ["Speed", "110, plus 2 each wave"],
        ["Steal", `${THIEF_STEAL} gold each second`],
        ["Refund", "20% of what it took, if you kill it"],
      ],
      about: "Faster than a runner, and tougher than a grunt. It picks up gold while it lives. A leak keeps that gold. A kill returns a fifth of it.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "frost", name: "Frost", note: "Slow it before it has seconds to steal." },
        { id: "sniper", name: "Sniper", note: "One heavy hit ends the theft early." },
        { id: "storm", name: "Storm", note: "A lock-on bolt reaches a thief that has already sprinted ahead." },
      ],
    },
    {
      id: "sapper",
      name: "Sapper",
      color: "#c46a2a",
      role: "Saboteur",
      ...enemyPlace(query, "sapper", false),
      stats: [
        ["Health", String(SAPPER_HP) + " before the wave scale"],
        ["Speed", "46"],
        ["Shutdown", `${SAPPER_SILENCE}s on one tower`],
        ["Reach", "1.5 cells off the road"],
      ],
      about: "It steps off the road onto one tower, shuts that tower off for 4 seconds, and then walks on. The shutdown stays even if the sapper dies. A full line loses that one tower while the pack passes.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "sniper", name: "Sniper", note: "A tower far from the road is harder for it to reach, and the rifle still shoots." },
        { id: "storm", name: "Storm", note: "Lightning keeps falling while one roadside tower is shut off." },
        { id: "chomp", name: "Chomp", note: "Swallow it before it latches, if the bite is set and awake." },
      ],
    },
    {
      id: "husk",
      name: "Desert Husk",
      color: "#e0b15a",
      role: "Shell",
      ...enemyPlace(query, "husk", false),
      stats: [
        ["Health", String(HUSK_HP) + " before the wave scale"],
        ["Speed", String(HUSK_SPEED)],
        ["Crack", "At half health"],
        ["Sprint", String(HUSK_SPRINT)],
        ["Leak", "2 lives"],
      ],
      about: "A dried shell on the Desert roads. At half health it cracks, turns pale, and sprints. The leak is 2 lives.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "chomp", name: "Chomp", note: "Swallow the shell before it cracks." },
        { id: "frost", name: "Frost", note: "The chill still applies after the sprint starts." },
        { id: "sniper", name: "Sniper", note: "Front-load the damage so the sprint is a short one." },
      ],
    },
    {
      id: "boss",
      name: "Boss",
      color: "#6b2d8a",
      role: "Boss",
      ...enemyPlace(query, "boss", false),
      stats: [
        ["When", "Last enemy on waves 6 and 9"],
        ["Health", "700, plus 180 a wave"],
        ["Leak", "5 lives"],
        ["Armor mutator", "Bosses are not armored"],
      ],
      about: "The mid-road boss. It is slow and thick, and a leak costs 5 lives. On a campaign it arrives even when the warrant is a thin mix.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "sniper", name: "Sniper", note: "Start the fight the moment it steps onto the road." },
        { id: "wasp", name: "Wasp", note: "Park the hunter on it and leave the pack to the splash." },
        { id: "nuke", name: "Nuke", note: "The blast cuts it to a tenth, then the rest of the bench finishes it." },
        { id: "frost", name: "Frost", note: "A chill buys the whole line more shots." },
      ],
    },
    {
      id: "finalBoss",
      name: "Final Boss",
      color: "#5a1430",
      role: "Boss",
      ...enemyPlace(query, "finalBoss", false),
      stats: [
        ["When", "Last enemy of the road"],
        ["Health", "3200"],
        ["Leak", "10 lives"],
        ["Endless", "Does not appear"],
      ],
      about: "The last enemy of a Normal or Hard road. Endless keeps going and sends Challengers instead.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "nuke", name: "Nuke", note: "A tenth of 3200 is still a long fight. Spend the blast, then keep firing." },
        { id: "banner", name: "Banner", note: "A Grand Banner on the whole line is the damage you want for this one." },
        { id: "mint", name: "Mint", note: "The purse for that line is earned on the waves before it." },
      ],
    },
    {
      id: "challenger",
      name: "Challenger",
      color: "#d4a24a",
      role: "Endless",
      ...enemyPlace(query, "challenger", false),
      stats: [
        ["When", "Waves 30, 40, 50, then every 10"],
        ["Health", "520, plus 110 a wave"],
        ["On death", "Two bosses"],
        ["Leak", "4 lives"],
      ],
      about: "Endless only. It is the last enemy of those waves. Killing it spawns two bosses.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "sniper", name: "Sniper", note: "Keep the rifle on Strongest so a Marked wave still lets it shoot." },
        { id: "nuke", name: "Nuke", note: "Cut the challenger down, and be ready for the two bosses it leaves." },
        { id: "frost", name: "Frost", note: "Slow all three once the bosses appear." },
      ],
    },
  ];

  return {
    title: "Classic",
    subtitle: query.roadLabel
      ? `${query.roadLabel}. Your bench is marked, and so are the enemies on that warrant.`
      : "Your bench is marked. Pick a road to mark its enemies.",
    towers,
    enemies,
  };
}

function dungeonBook(): AlmanacBook {
  const spikes = DUNGEON_BUILDS.spikes;
  const snare = DUNGEON_BUILDS.snare;
  const goblin = DUNGEON_BUILDS.goblin;
  const ogre = DUNGEON_BUILDS.ogre;
  const towers: AlmanacEntry[] = [
    {
      id: "spikes",
      name: spikes.name,
      color: spikes.color,
      role: "Trap",
      place: "yours",
      placeLabel: "Your kit",
      stats: [
        ["Cost", gold(spikes.cost)],
        ["Damage", String(spikes.damage)],
        ["Rate", rate(spikes.fireRate ?? 1)],
      ],
      about: "Sits on the road and hits adventurers who step on it. Place it where a snare has already slowed them.",
      pairsTitle: "Works with",
      pairs: [
        { id: "snare", name: "Snare", note: "The snare holds them on the spikes." },
        { id: "spikeRaider", name: "Spike Raider", note: "The common adventurer. Spikes are the cheap answer." },
      ],
    },
    {
      id: "snare",
      name: snare.name,
      color: snare.color,
      role: "Trap",
      place: "yours",
      placeLabel: "Your kit",
      stats: [
        ["Cost", gold(snare.cost)],
        ["Damage", String(snare.damage)],
        ["Slow", "32% speed for 2.4s"],
      ],
      about: "Slows adventurers hard and chips them. It is the setup for every other piece on the zigzag.",
      pairsTitle: "Works with",
      pairs: [
        { id: "spikes", name: "Spike Trap", note: "Put spikes on the tiles the snare feeds." },
        { id: "goblin", name: "Goblin", note: "A slowed line stands in the goblin's strike tile." },
        { id: "snareScout", name: "Snare Scout", note: "The fast scout is who the snare is for." },
      ],
    },
    {
      id: "goblin",
      name: goblin.name,
      color: goblin.color,
      role: "Monster",
      place: "yours",
      placeLabel: "Your kit",
      stats: [
        ["Cost", gold(goblin.cost)],
        ["Health", String(goblin.hp)],
        ["Damage", String(goblin.damage)],
        ["Rate", rate(goblin.fireRate ?? 1)],
      ],
      about: "Hits everyone one tile ahead, toward the entrance. Adventurers fight on that tile. They do not step onto the goblin.",
      pairsTitle: "Works with",
      pairs: [
        { id: "snare", name: "Snare", note: "Hold the line on the strike tile." },
        { id: "ogre", name: "Ogre", note: "The ogre soaks the hits while the goblin keeps swinging." },
      ],
    },
    {
      id: "ogre",
      name: ogre.name,
      color: ogre.color,
      role: "Monster",
      place: "yours",
      placeLabel: "Your kit",
      stats: [
        ["Cost", gold(ogre.cost)],
        ["Health", String(ogre.hp)],
        ["Damage", String(ogre.damage)],
        ["Rate", rate(ogre.fireRate ?? 1)],
      ],
      about: "The tank of the dungeon. High health, heavy hits, and it stands on the road to fight.",
      pairsTitle: "Works with",
      pairs: [
        { id: "goblin", name: "Goblin", note: "The goblin hits the tile in front while the ogre holds." },
        { id: "ogreSlayer", name: "Ogre Slayer", note: "The last wave sends one. The ogre is who you want waiting." },
      ],
    },
  ];
  const enemies: AlmanacEntry[] = [
    {
      id: "spikeRaider",
      name: "Spike Raider",
      color: "#c45c4a",
      role: "Adventurer",
      place: "road",
      placeLabel: "On the road",
      stats: [
        ["Health", "44, and it climbs"],
        ["Speed", "54, plus the wave"],
        ["Leak", "1 life"],
      ],
      about: "The default adventurer. Most of a wave is these.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "spikes", name: "Spike Trap", note: "Cheap damage on the tiles they must cross." },
        { id: "goblin", name: "Goblin", note: "One goblin hits a whole clump on the tile ahead." },
      ],
    },
    {
      id: "snareScout",
      name: "Snare Scout",
      color: "#5a9eb8",
      role: "Adventurer",
      place: "road",
      placeLabel: "From wave 3",
      stats: [
        ["Health", "28, and it climbs"],
        ["Speed", "86"],
        ["Leak", "1 life"],
      ],
      about: "A fast adventurer mixed into the wave from wave 3.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "snare", name: "Snare", note: "The slow is what stops a scout from slipping the line." },
      ],
    },
    {
      id: "goblinHunter",
      name: "Goblin Hunter",
      color: "#4a9b6e",
      role: "Adventurer",
      place: "road",
      placeLabel: "From wave 6",
      stats: [
        ["Health", "110, and it climbs"],
        ["Damage", "17"],
        ["Leak", "2 lives"],
      ],
      about: "Tougher than a raider, and it fights your monsters.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "ogre", name: "Ogre", note: "The ogre outlasts the hunter's swings." },
        { id: "spikes", name: "Spike Trap", note: "Chip the hunter down before it reaches the ogre." },
      ],
    },
    {
      id: "ogreSlayer",
      name: "Ogre Slayer",
      color: "#8b5a3c",
      role: "Adventurer",
      place: "road",
      placeLabel: "Last of wave 10",
      stats: [
        ["Health", "380"],
        ["Damage", "30"],
        ["Leak", "3 lives"],
      ],
      about: "The last adventurer of the dungeon. Slow, thick, and the leak is 3 lives.",
      pairsTitle: "Answer them with",
      pairs: [
        { id: "ogre", name: "Ogre", note: "Meet it with your own tank." },
        { id: "snare", name: "Snare", note: "A snare in front of the ogre buys the extra swings." },
      ],
    },
  ];
  return {
    title: "Dungeon Crawler",
    subtitle: "Your traps and monsters, and the adventurers on the zigzag.",
    towers,
    enemies,
  };
}

function lawnBook(): AlmanacBook {
  const towers: AlmanacEntry[] = (Object.keys(PLANTS) as (keyof typeof PLANTS)[]).map((kind) => {
    const plant = PLANTS[kind];
    const stats: [string, string][] = [
      ["Cost", `${plant.cost} sun`],
      ["Health", String(plant.hp)],
    ];
    if (plant.damage > 0) stats.push(["Damage", String(plant.damage)]);
    if (plant.fireRate > 0) stats.push(["Rate", rate(plant.fireRate)]);
    if (plant.slow > 0) stats.push(["Slow", `${Math.round(plant.slow * 100)}% speed`]);
    const pairs: Record<string, AlmanacPair[]> = {
      sunbloom: [
        { id: "spitter", name: "Spitter", note: "The bloom pays for the guns." },
        { id: "chiller", name: "Chiller", note: "175 sun is a bloom's job." },
      ],
      spitter: [
        { id: "bulwark", name: "Bulwark", note: "The wall holds a zombie in the lane the spitter shoots." },
        { id: "chiller", name: "Chiller", note: "A slowed zombie takes more of the lane's shots." },
      ],
      bulwark: [
        { id: "spitter", name: "Spitter", note: "Plant the gun behind the wall." },
        { id: "boomnut", name: "Boomnut", note: "A nut in front of the wall bursts the zombie that would chew it." },
      ],
      chiller: [
        { id: "spitter", name: "Spitter", note: "The slow makes the spitter's lane much longer." },
        { id: "runner", name: "Runner", note: "This is the plant that catches a runner." },
      ],
      boomnut: [
        { id: "brute", name: "Brute", note: "180 damage is the opener on a brute." },
        { id: "bulwark", name: "Bulwark", note: "The wall is the backup if the nut is already spent." },
      ],
    };
    const about: Record<string, string> = {
      sunbloom: "Pays 25 sun every 20 seconds, on the same timer as the lawn.",
      spitter: "Shoots the first zombie in its lane.",
      bulwark: "A tough wall. Zombies stop and chew it.",
      chiller: "Weaker shots that slow a lane.",
      boomnut: "Bursts for 180 damage when a zombie reaches it, across a wide splash.",
    };
    return {
      id: kind,
      name: plant.name,
      color: plant.color,
      role: plant.role === "producer" ? "Sun" : plant.role === "wall" ? "Wall" : plant.role === "mine" ? "Mine" : "Shooter",
      place: "yours" as const,
      placeLabel: "Your garden",
      stats,
      about: about[kind] ?? plant.description,
      pairsTitle: "Works with",
      pairs: pairs[kind] ?? [],
    };
  });

  const enemies: AlmanacEntry[] = (Object.keys(ZOMBIES) as (keyof typeof ZOMBIES)[]).map((kind) => {
    const zombie = ZOMBIES[kind];
    const about: Record<string, string> = {
      shambler: "The ordinary zombie. Slow, and it chews a plant at 16 a second.",
      cone: "A thicker shambler. The cone is health, not a trick.",
      runner: "Thin and about twice as fast. It slips a lane that has only one spitter.",
      brute: "The last threat of the lawn. Huge health, a slow step, and a hard chew.",
    };
    const pairs: Record<string, AlmanacPair[]> = {
      shambler: [
        { id: "spitter", name: "Spitter", note: "One lane of spitters handles the early shamblers." },
      ],
      cone: [
        { id: "spitter", name: "Spitter", note: "Give the lane a second spitter." },
        { id: "bulwark", name: "Bulwark", note: "The wall buys the extra shots." },
      ],
      runner: [
        { id: "chiller", name: "Chiller", note: "The slow is what keeps a runner in the lane." },
        { id: "boomnut", name: "Boomnut", note: "A nut on the right ends a runner that got through." },
      ],
      brute: [
        { id: "boomnut", name: "Boomnut", note: "Open with the burst." },
        { id: "bulwark", name: "Bulwark", note: "Then let the wall hold while the spitters finish." },
        { id: "chiller", name: "Chiller", note: "A slowed brute is a long target." },
      ],
    };
    const when: Record<string, string> = {
      shambler: "Every wave",
      cone: "From wave 3",
      runner: "From wave 4",
      brute: "The last zombie of wave 8",
    };
    return {
      id: kind,
      name: zombie.name,
      color: zombie.color,
      role: "Zombie",
      place: "road" as const,
      placeLabel: when[kind] ?? "On the lawn",
      stats: [
        ["Health", String(zombie.hp)],
        ["Speed", String(zombie.speed)],
        ["Chew", `${zombie.eat}/s`],
      ],
      about: about[kind] ?? zombie.name,
      pairsTitle: "Answer them with",
      pairs: pairs[kind] ?? [],
    };
  });

  return {
    title: "Sun Lawn",
    subtitle: "Your plants, and the zombies in the lanes.",
    towers,
    enemies,
  };
}

export function buildAlmanac(query: AlmanacQuery): AlmanacBook {
  if (query.mode === "dungeon") return dungeonBook();
  if (query.mode === "lawn") return lawnBook();
  return classicBook(query);
}

const GROUP_LABEL: Record<AlmanacEntry["place"], string> = {
  yours: "What you have",
  armory: "Not on this bench",
  road: "On this road",
  follows: "Comes with them",
  elsewhere: "Elsewhere",
};

function groupEntries(entries: AlmanacEntry[]): { label: string; entries: AlmanacEntry[] }[] {
  const order: AlmanacEntry["place"][] = ["yours", "road", "follows", "armory", "elsewhere"];
  return order
    .map((place) => ({
      label: GROUP_LABEL[place],
      entries: entries.filter((entry) => entry.place === place),
    }))
    .filter((group) => group.entries.length > 0);
}

export function paintAlmanac(
  index: HTMLElement,
  page: HTMLElement,
  heading: HTMLElement,
  sub: HTMLElement,
  book: AlmanacBook,
  chapter: AlmanacChapter,
  selectedId: string | null,
): string {
  heading.textContent = book.title;
  sub.textContent = book.subtitle;
  const entries = chapter === "towers" ? book.towers : book.enemies;
  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0];
  index.innerHTML = groupEntries(entries)
    .map(
      (group) => `
        <p class="book-group">${esc(group.label)}</p>
        ${group.entries
          .map(
            (entry) => `
              <button class="book-link${entry.id === selected?.id ? " selected" : ""}" type="button" data-almanac-id="${esc(entry.id)}">
                <span class="book-dot" style="background:${esc(entry.color)}"></span>
                <span class="book-link-name">${esc(entry.name)}</span>
                <span class="book-link-tag">${esc(entry.placeLabel)}</span>
              </button>`,
          )
          .join("")}`,
    )
    .join("");

  if (!selected) {
    page.innerHTML = "";
    return "";
  }

  page.innerHTML = `
    <p class="book-kicker">${esc(selected.role)} · ${esc(selected.placeLabel)}</p>
    <h3 class="book-name"><span class="book-dot lg" style="background:${esc(selected.color)}"></span>${esc(selected.name)}</h3>
    <dl class="book-stats">
      ${selected.stats
        .map(
          ([label, value]) =>
            `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`,
        )
        .join("")}
    </dl>
    <p class="book-about">${esc(selected.about)}</p>
    <h4 class="book-pairs-title">${esc(selected.pairsTitle)}</h4>
    <ul class="book-pairs">
      ${selected.pairs
        .map(
          (pair) => `
            <li>
              <button type="button" data-almanac-jump="${esc(pair.id)}">${esc(pair.name)}</button>
              <span>${esc(pair.note)}</span>
            </li>`,
        )
        .join("")}
    </ul>
  `;
  return selected.id;
}

/** Chapter that contains this id, if the book has it. */
export function chapterFor(book: AlmanacBook, id: string): AlmanacChapter | null {
  if (book.towers.some((entry) => entry.id === id)) return "towers";
  if (book.enemies.some((entry) => entry.id === id)) return "enemies";
  return null;
}
