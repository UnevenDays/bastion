import {
  BANNER_CAP,
  BANK_DEPOSIT_CHUNK,
  CELL,
  CLOUD_CAP,
  CLOUD_HIT_INTERVAL,
  CLOUD_HP,
  CLOUD_INTERVAL,
  CLOUD_REACH,
  CLOUD_SPEED,
  COLS,
  DRONE_COUNT,
  DRONE_DAMAGE_RATIO,
  DRONE_SPEED,
  FLY_SPEED,
  PATH,
  REGEN_DELAY,
  ROWS,
  STORM_SPLASH,
  TOWER_DEFS,
  SPECIAL_UPGRADES,
  MAX_UPGRADE,
  NORMAL_SPEED,
  bankPayout,
  bannerBonus,
  bossDef,
  cloudStrikeBack,
  cloudStrikeDamage,
  chompBiteCount,
  chompSleepSeconds,
  combatStats,
  endlessDrought,
  enemyForWave,
  makeFlyer,
  mintIncome,
  MACE_PERIOD,
  maceCount,
  maceSweepHits,
  inNukeBlast,
  nestPoint,
  nukeRemainingHp,
  PYRO_BURN_TIME,
  pyroBurnDps,
  pyroHitDamage,
  sellValue,
  specialCost,
  spawnInterval,
  splitlingFrom,
  startingGold,
  startingLives,
  stormGuaranteesHit,
  SNIPER_SUPPLY_GOLD,
  SNIPER_SUPPLY_LIVES,
  supplyDropCost,
  THIEF_STEAL,
  thiefRefund,
  upgradeCost,
  waveEnemyCount,
} from "./config";
import { campaignById, type CampaignLevel } from "./campaign";
import { customEnemyAt, customSpawnCount, normalizeLevel, type CustomLevel } from "./level";
import type {
  Difficulty,
  Enemy,
  Flyer,
  Particle,
  Projectile,
  TargetMode,
  Tower,
  TowerKind,
  Vec2,
} from "./types";

export type GamePhase = "ready" | "playing" | "won" | "lost";
export type UpgradeStat = "damage" | "speed";
export type ToolMode = "build" | "shovel";

export interface SelectedTowerInfo {
  index: number;
  kind: TowerKind;
  name: string;
  damageLevel: number;
  speedLevel: number;
  damageCost: number | null;
  speedCost: number | null;
  canAffordDamage: boolean;
  canAffordSpeed: boolean;
  damage: number;
  fireRate: number;
  range: number;
  special: boolean;
  specialName: string;
  specialDescription: string;
  specialCost: number | null;
  canAffordSpecial: boolean;
  sellRefund: number;
  economy: boolean;
  goldPerTick: number;
  goldInterval: number;
  banked: number;
  /** Gold the Midas Bank will pay when the next wave starts. That gold then leaves the bank. */
  bankPayout: number;
  targeting: TargetMode;
  flying: boolean;
  support: boolean;
  /** Flips this tower's aim. */
  inverted: boolean;
  /** Damage bonus fraction from banners, or the bonus this banner gives. */
  buffDamage: number;
  /** Attack-speed bonus fraction from banners, or the bonus this banner gives. */
  buffRate: number;
  /** Random lightning. Aim buttons do not apply. */
  storm: boolean;
  /** This Sniper can still call a supply drop during the current wave. */
  supplyReady: boolean;
  /** Next Supply Drop price. 0 for other towers. */
  supplyCost: number;
  /** Nap length after a Chomp bite. 0 for other towers. */
  sleepSeconds: number;
  /** Enemies swallowed before the nap. 0 for other towers. */
  bites: number;
}

export interface HudSnapshot {
  gold: number;
  lives: number;
  wave: number;
  totalWaves: number;
  phase: GamePhase;
  difficulty: Difficulty;
  selected: TowerKind | null;
  selectedTower: SelectedTowerInfo | null;
  waveInProgress: boolean;
  enemiesLeft: number;
  tool: ToolMode;
  shovelReady: boolean;
  carrying: boolean;
  carrySellRefund: number;
  /** A level from the editor, with its own road and waves. */
  custom: boolean;
  /** Campaign road name. Empty on an editor level. */
  levelName: string;
  /** This road has water that cannot hold a tower. */
  hasWater: boolean;
}

function pathKey(col: number, row: number): string {
  return `${col},${row}`;
}

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

function isBossKind(kind: Enemy["kind"]): boolean {
  return kind === "boss" || kind === "finalBoss";
}

interface CloudAlly {
  owner: Tower;
  hp: number;
  maxHp: number;
  pathIndex: number;
  progress: number;
  x: number;
  y: number;
  fightCooldown: number;
}

interface LightningSticker {
  x: number;
  y: number;
  fromX: number;
  fromY: number;
  life: number;
  maxLife: number;
  sure: boolean;
}

export class Game {
  readonly width = COLS * CELL;
  readonly height = ROWS * CELL;

  private pathSet = new Set(PATH.map((p) => pathKey(p.col, p.row)));
  private waypoints: Vec2[] = PATH.map((p) => ({
    x: p.col * CELL + CELL / 2,
    y: p.row * CELL + CELL / 2,
  }));
  private custom: CustomLevel | null = null;
  private campaign: CampaignLevel = campaignById("road");
  private water = new Set<string>();
  private grassA = "#1e3a28";
  private grassB = "#1a3324";

  difficulty: Difficulty = "normal";
  gold = startingGold("normal");
  lives = startingLives("normal");
  wave = 0;
  phase: GamePhase = "ready";
  selected: TowerKind | null = "archer";
  selectedTowerIndex: number | null = null;
  tool: ToolMode = "build";
  shovelReady = true;
  /** Tower temporarily lifted by the shovel. */
  carrying: Tower | null = null;

  towers: Tower[] = [];
  enemies: Enemy[] = [];
  projectiles: Projectile[] = [];
  particles: Particle[] = [];
  /** Cloud allies summoned by a Storm special. They march the path and fight. */
  clouds: CloudAlly[] = [];

  private stickers: LightningSticker[] = [];

  private nextEnemyId = 1;
  private spawnQueue = 0;
  private spawnTimer = 0;
  private waveInProgress = false;
  private hover: { col: number; row: number } | null = null;
  private pulse = 0;

  private towerOccupied = new Set<string>();
  /** Grass tiles a Nuke burned out. Nothing can be built there this run. */
  private craters = new Set<string>();
  private blastFlash = 0;

  onHudChange: ((hud: HudSnapshot) => void) | null = null;

  constructor() {
    this.emitHud();
  }

  private selectedTowerInfo(): SelectedTowerInfo | null {
    if (this.selectedTowerIndex === null) return null;
    const t = this.towers[this.selectedTowerIndex];
    if (!t) return null;
    const def = TOWER_DEFS[t.kind];
    const special = SPECIAL_UPGRADES[t.kind];
    const stats = this.effectiveStats(t);
    const income = def.economy ? mintIncome(t) : null;
    const bankSlow =
      !!t.special &&
      this.difficulty === "endless" &&
      endlessDrought(this.wave);
    const shownInterval = income
      ? income.interval * (bankSlow ? 2 : 1)
      : 0;
    const given = def.support ? bannerBonus(t) : null;
    const received = this.bannerBuffFor(t);
    const dCost =
      t.damageLevel < MAX_UPGRADE
        ? upgradeCost(def.cost, t.damageLevel)
        : null;
    const sCost =
      t.speedLevel < MAX_UPGRADE ? upgradeCost(def.cost, t.speedLevel) : null;
    const dropCost = def.sniper ? supplyDropCost(t.supplyUses) : 0;
    const spCost = def.sniper
      ? t.supplyUsed
        ? null
        : dropCost
      : t.special
        ? null
        : specialCost(t.kind);
    return {
      index: this.selectedTowerIndex,
      kind: t.kind,
      name: def.name,
      damageLevel: t.damageLevel,
      speedLevel: t.speedLevel,
      damageCost: dCost,
      speedCost: sCost,
      canAffordDamage: dCost !== null && this.gold >= dCost,
      canAffordSpeed: sCost !== null && this.gold >= sCost,
      damage: Math.round(stats.damage),
      fireRate: Math.round(stats.fireRate * 100) / 100,
      range: Math.round(stats.range * 10) / 10,
      special: t.special,
      specialName: special.name,
      specialDescription: special.description,
      specialCost: spCost,
      canAffordSpecial: spCost !== null && this.gold >= spCost,
      sellRefund: sellValue(t.invested, t.banked),
      economy: !!def.economy,
      goldPerTick: income?.amount ?? 0,
      goldInterval: income ? Math.round(shownInterval * 10) / 10 : 0,
      banked: t.banked,
      bankPayout: t.kind === "mint" && t.special ? bankPayout(t.banked) : 0,
      targeting: t.targeting,
      flying: !!def.flying,
      support: !!def.support,
      inverted: t.inverted,
      buffDamage: given ? given.damage : received.damage,
      buffRate: given ? given.rate : received.rate,
      storm: !!def.storm,
      supplyReady: !!def.sniper && !t.supplyUsed,
      supplyCost: dropCost,
      sleepSeconds: def.chomp
        ? Math.round(chompSleepSeconds(t.speedLevel, received.rate) * 10) / 10
        : 0,
      bites: def.chomp ? chompBiteCount(t.special) : 0,
    };
  }

  private emitHud(): void {
    this.onHudChange?.({
      gold: this.gold,
      lives: this.lives,
      wave: this.wave,
      totalWaves: this.custom
        ? this.custom.waves.length
        : this.difficulty === "endless"
          ? 0
          : this.campaign.waves,
      custom: this.custom !== null,
      levelName: this.custom ? "" : this.campaign.name,
      hasWater: !this.custom && this.campaign.water.length > 0,
      phase: this.phase,
      difficulty: this.difficulty,
      selected: this.selected,
      selectedTower: this.selectedTowerInfo(),
      waveInProgress: this.waveInProgress,
      enemiesLeft: this.enemies.length + this.spawnQueue,
      tool: this.tool,
      shovelReady: this.shovelReady,
      carrying: this.carrying !== null,
      carrySellRefund: this.carrying
        ? sellValue(this.carrying.invested, this.carrying.banked)
        : 0,
    });
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.emitHud();
  }

  selectTower(kind: TowerKind | null): void {
    if (this.carrying) return; // finish move/sell first
    this.tool = "build";
    this.selected = kind;
    if (kind !== null) this.selectedTowerIndex = null;
    this.emitHud();
  }

  selectShovel(): void {
    if (this.phase === "won" || this.phase === "lost") return;
    if (this.carrying) return;
    if (!this.shovelReady) return;
    this.tool = "shovel";
    this.selected = null;
    this.selectedTowerIndex = null;
    this.emitHud();
  }

  clearSelection(): void {
    if (this.carrying) return;
    this.selected = null;
    this.selectedTowerIndex = null;
    this.tool = "build";
    this.emitHud();
  }

  canAfford(kind: TowerKind): boolean {
    return this.gold >= TOWER_DEFS[kind].cost;
  }

  setHover(col: number, row: number | null): void {
    if (row === null || col < 0 || row < 0 || col >= COLS || row >= ROWS) {
      this.hover = null;
      return;
    }
    this.hover = { col, row };
  }

  /** Click a cell: shovel move/pick, select tower, or place. */
  handleClick(col: number, row: number): boolean {
    if (this.phase === "won" || this.phase === "lost") return false;
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;

    if (this.tool === "shovel" || this.carrying) {
      return this.handleShovelClick(col, row);
    }

    const existing = this.towers.findIndex((t) => t.col === col && t.row === row);
    if (existing >= 0) {
      this.selected = null;
      this.selectedTowerIndex = existing;
      this.emitHud();
      return true;
    }

    return this.tryPlace(col, row);
  }

  private handleShovelClick(col: number, row: number): boolean {
    if (this.carrying) {
      return this.placeCarried(col, row);
    }

    if (!this.shovelReady) return false;

    const existing = this.towers.findIndex((t) => t.col === col && t.row === row);
    if (existing < 0) return false;

    const tower = this.towers[existing];
    this.towerOccupied.delete(pathKey(tower.col, tower.row));
    this.towers.splice(existing, 1);
    this.carrying = tower;
    this.selectedTowerIndex = null;
    this.burst(
      tower.col * CELL + CELL / 2,
      tower.row * CELL + CELL / 2,
      TOWER_DEFS[tower.kind].color,
      6,
    );
    this.emitHud();
    return true;
  }

  private placeCarried(col: number, row: number): boolean {
    if (!this.carrying) return false;
    const key = pathKey(col, row);
    if (this.pathSet.has(key) || this.towerOccupied.has(key) || this.craters.has(key) || this.water.has(key)) return false;

    const tower = this.carrying;
    tower.col = col;
    tower.row = row;
    this.towers.push(tower);
    this.towerOccupied.add(key);
    this.carrying = null;
    this.shovelReady = false;
    this.tool = "build";
    this.selectedTowerIndex = this.towers.length - 1;
    this.burst(col * CELL + CELL / 2, row * CELL + CELL / 2, TOWER_DEFS[tower.kind].color, 8);
    this.emitHud();
    return true;
  }

  /** Sell carried tower or currently selected tower (uses shovel charge). */
  sellWithShovel(): boolean {
    if (this.phase === "won" || this.phase === "lost") return false;

    if (this.carrying) {
      if (!this.shovelReady && this.tool === "shovel") {
        // Charge already reserved by pickup — selling finishes the action
      }
      const refund = sellValue(this.carrying.invested, this.carrying.banked);
      this.gold += refund;
      this.burst(this.width / 2, this.height / 2, "#e8c547", 10);
      this.carrying = null;
      this.shovelReady = false;
      this.tool = "build";
      this.emitHud();
      return true;
    }

    if (!this.shovelReady) return false;
    if (this.selectedTowerIndex === null) return false;
    const t = this.towers[this.selectedTowerIndex];
    if (!t) return false;

    const refund = sellValue(t.invested, t.banked);
    this.gold += refund;
    this.towerOccupied.delete(pathKey(t.col, t.row));
    this.burst(t.col * CELL + CELL / 2, t.row * CELL + CELL / 2, "#e8c547", 10);
    this.towers.splice(this.selectedTowerIndex, 1);
    this.selectedTowerIndex = null;
    this.shovelReady = false;
    this.tool = "build";
    this.emitHud();
    return true;
  }

  /**
   * Spend the Nuke. Every enemy keeps a sliver of health. Towers in the
   * 3×3 are destroyed. The center tile is a crater for the rest of the run.
   */
  private detonateNuke(col: number, row: number): void {
    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      e.hp = nukeRemainingHp(e.hp);
      e.sinceDamage = 0;
    }

    const kept: Tower[] = [];
    const removed = new Set<Tower>();
    const selected = this.selectedTowerIndex !== null ? this.towers[this.selectedTowerIndex] : null;
    for (const t of this.towers) {
      if (!inNukeBlast(t.col, t.row, col, row)) {
        kept.push(t);
        continue;
      }
      removed.add(t);
      this.towerOccupied.delete(pathKey(t.col, t.row));
      this.burst(t.col * CELL + CELL / 2, t.row * CELL + CELL / 2, "#e85d4a", 8);
    }
    this.towers = kept;
    this.clouds = this.clouds.filter((c) => !removed.has(c.owner));
    if (selected && removed.has(selected)) this.selectedTowerIndex = null;
    else if (selected) this.selectedTowerIndex = this.towers.indexOf(selected);

    this.craters.add(pathKey(col, row));
    this.blastFlash = 0.55;
    const cx = col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;
    this.burst(cx, cy, "#fff1c9", 28);
    this.burst(cx, cy, "#e25822", 18);
  }

  tryPlace(col: number, row: number): boolean {
    if (this.phase === "won" || this.phase === "lost") return false;
    if (!this.selected || this.tool !== "build") return false;
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;

    const key = pathKey(col, row);
    if (this.pathSet.has(key)) return false;
    if (this.towerOccupied.has(key)) return false;
    if (this.craters.has(key) || this.water.has(key)) return false;

    const def = TOWER_DEFS[this.selected];
    if (this.gold < def.cost) return false;

    this.gold -= def.cost;
    if (def.nuke) {
      this.detonateNuke(col, row);
      this.selectedTowerIndex = null;
      this.emitHud();
      return true;
    }
    const tower: Tower = {
      col,
      row,
      kind: this.selected,
      cooldown: def.economy ? mintIncome({
        col,
        row,
        kind: this.selected,
        cooldown: 0,
        damageLevel: 0,
        speedLevel: 0,
        special: false,
        invested: def.cost,
        banked: 0,
        targeting: "auto",
        flyer: null,
        drones: [],
        inverted: false,
        summonTimer: 0,
        orbit: 0,
        supplyUses: 0,
        supplyUsed: false,
      }).interval * 0.35 : 0,
      damageLevel: 0,
      speedLevel: 0,
      special: false,
      invested: def.cost,
      banked: 0,
      targeting: "auto",
      flyer: def.flying
        ? makeFlyer(nestPoint(col, row, -1).x, nestPoint(col, row, -1).y)
        : null,
      drones: [],
      inverted: false,
      summonTimer: 0,
      orbit: 0,
      supplyUses: 0,
      supplyUsed: false,
    };
    this.towers.push(tower);
    this.towerOccupied.add(key);
    this.selectedTowerIndex = this.towers.length - 1;
    this.burst(col * CELL + CELL / 2, row * CELL + CELL / 2, def.color, 8);
    this.emitHud();
    return true;
  }

  upgradeSelected(stat: UpgradeStat): boolean {
    if (this.selectedTowerIndex === null) return false;
    if (this.phase === "won" || this.phase === "lost") return false;
    const t = this.towers[this.selectedTowerIndex];
    if (!t) return false;

    const def = TOWER_DEFS[t.kind];
    if (stat === "damage" && t.kind === "frost" && t.special) return false;
    const level = stat === "damage" ? t.damageLevel : t.speedLevel;
    if (level >= MAX_UPGRADE) return false;

    const cost = upgradeCost(def.cost, level);
    if (this.gold < cost) return false;

    this.gold -= cost;
    t.invested += cost;
    if (stat === "damage") t.damageLevel += 1;
    else t.speedLevel += 1;

    const cx = t.col * CELL + CELL / 2;
    const cy = t.row * CELL + CELL / 2;
    this.burst(cx, cy, def.color, 10);
    this.emitHud();
    return true;
  }

  buySpecial(): boolean {
    if (this.selectedTowerIndex === null) return false;
    if (this.phase === "won" || this.phase === "lost") return false;
    const t = this.towers[this.selectedTowerIndex];
    if (!t) return false;
    if (t.kind === "sniper") return this.callSupplyDrop(t);
    if (t.special) return false;

    const cost = specialCost(t.kind);
    if (this.gold < cost) return false;

    this.gold -= cost;
    t.invested += cost;
    t.special = true;
    if (t.kind === "frost") {
      let refund = 0;
      for (let i = 0; i < t.damageLevel; i++) {
        refund += upgradeCost(TOWER_DEFS.frost.cost, i);
      }
      if (refund > 0) {
        this.gold += refund;
        t.invested = Math.max(0, t.invested - refund);
        t.damageLevel = 0;
      }
    }
    if (t.kind === "wasp") {
      t.drones = Array.from({ length: DRONE_COUNT }, (_, i) => {
        const spot = nestPoint(t.col, t.row, i);
        return makeFlyer(spot.x, spot.y, 0.12 * i);
      });
    }
    if (t.kind === "storm") t.summonTimer = 0;
    this.burst(
      t.col * CELL + CELL / 2,
      t.row * CELL + CELL / 2,
      TOWER_DEFS[t.kind].color,
      14,
    );
    this.emitHud();
    return true;
  }

  /** Pay the rising price, gain a life and some gold, then lock until the wave ends. */
  private callSupplyDrop(t: Tower): boolean {
    if (t.supplyUsed) return false;
    const cost = supplyDropCost(t.supplyUses);
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.gold += SNIPER_SUPPLY_GOLD;
    this.lives += SNIPER_SUPPLY_LIVES;
    t.supplyUses += 1;
    t.supplyUsed = true;
    const x = t.col * CELL + CELL / 2;
    const y = t.row * CELL + CELL / 2;
    this.burst(x, y, "#e8c547", 12);
    this.burst(x, y - 8, "#8ee0b0", 8);
    this.emitHud();
    return true;
  }

  /** Choose which enemy this tower prefers. Flyers keep their current prey. */
  setTargeting(mode: TargetMode): void {
    if (this.selectedTowerIndex === null) return;
    if (this.phase === "won" || this.phase === "lost") return;
    const t = this.towers[this.selectedTowerIndex];
    if (!t || TOWER_DEFS[t.kind].economy || TOWER_DEFS[t.kind].support || TOWER_DEFS[t.kind].storm || TOWER_DEFS[t.kind].mace) return;
    t.targeting = mode;
    this.emitHud();
  }

  /** Flip First/Last, Strong/Weak, and nearest/farthest for the selected tower. */
  toggleInvert(): void {
    if (this.selectedTowerIndex === null) return;
    if (this.phase === "won" || this.phase === "lost") return;
    const t = this.towers[this.selectedTowerIndex];
    if (!t || TOWER_DEFS[t.kind].economy || TOWER_DEFS[t.kind].support || TOWER_DEFS[t.kind].storm || TOWER_DEFS[t.kind].mace) return;
    t.inverted = !t.inverted;
    this.emitHud();
  }

  /**
   * Store gold in the selected Mint's Midas Bank.
   * The coins leave the player's gold. Pass `all` to deposit every coin held.
   */
  depositIntoSelected(all = false): boolean {
    if (this.selectedTowerIndex === null) return false;
    if (this.phase === "won" || this.phase === "lost") return false;
    const t = this.towers[this.selectedTowerIndex];
    if (!t || t.kind !== "mint" || !t.special) return false;

    const amount = all ? this.gold : Math.min(BANK_DEPOSIT_CHUNK, this.gold);
    if (!all && this.gold < BANK_DEPOSIT_CHUNK) return false;
    if (amount <= 0) return false;

    this.gold -= amount;
    t.banked += amount;
    this.burst(
      t.col * CELL + CELL / 2,
      t.row * CELL + CELL / 2,
      "#e8c547",
      8,
    );
    this.emitHud();
    return true;
  }

  startWave(): void {
    if (this.phase === "won" || this.phase === "lost") return;
    if (this.waveInProgress) return;
    if (this.custom) {
      if (this.wave >= this.custom.waves.length) return;
    } else if (this.difficulty !== "endless" && this.wave >= this.campaign.waves) return;
    if (this.carrying) return; // must finish shovel move/sell first

    this.wave += 1;
    this.phase = "playing";
    this.waveInProgress = true;
    this.spawnQueue = this.queuedSpawns();
    this.spawnTimer = 0.2;
    this.payInvestmentBanks();
    this.emitHud();
  }

  /** Each wave, a Midas Bank pays 25% of stored coins, and that gold leaves the bank. */
  private payInvestmentBanks(): void {
    for (const t of this.towers) {
      if (t.kind !== "mint" || !t.special || t.banked <= 0) continue;
      const payout = bankPayout(t.banked);
      if (payout <= 0) continue;
      this.gold += payout;
      t.banked -= payout;
      this.burst(
        t.col * CELL + CELL / 2,
        t.row * CELL + CELL / 2 - 10,
        "#e8c547",
        12,
      );
    }
  }

  restart(difficulty: Difficulty = this.difficulty): void {
    this.difficulty = difficulty;
    this.gold = startingGold(difficulty);
    this.lives = startingLives(difficulty);
    this.wave = 0;
    this.phase = "ready";
    this.selected = "archer";
    this.selectedTowerIndex = null;
    this.tool = "build";
    this.shovelReady = true;
    this.carrying = null;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.particles = [];
    this.clouds = [];
    this.stickers = [];
    this.craters.clear();
    this.blastFlash = 0;
    this.towerOccupied.clear();
    this.nextEnemyId = 1;
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.waveInProgress = false;
    this.emitHud();
  }

  beginRun(difficulty: Difficulty, levelId = "road"): void {
    this.custom = null;
    this.applyCampaign(campaignById(levelId));
    this.restart(difficulty);
  }

  /** Play a road, purse, and enemy list from the level editor. */
  beginCustom(level: CustomLevel): void {
    const next = normalizeLevel(level);
    this.custom = next;
    this.applyCampaign(campaignById("road"));
    this.water.clear();
    this.usePath(next.path);
    this.restart("normal");
    this.gold = next.gold;
    this.lives = next.lives;
    this.emitHud();
  }

  private applyCampaign(level: CampaignLevel): void {
    this.campaign = level;
    this.usePath(level.path);
    this.water = new Set(level.water.map((p) => pathKey(p.col, p.row)));
    this.grassA = level.grass[0];
    this.grassB = level.grass[1];
  }

  private usePath(path: { col: number; row: number }[]): void {
    this.pathSet = new Set(path.map((p) => pathKey(p.col, p.row)));
    this.waypoints = path.map((p) => ({
      x: p.col * CELL + CELL / 2,
      y: p.row * CELL + CELL / 2,
    }));
  }

  private queuedSpawns(): number {
    return this.custom
      ? customSpawnCount(this.custom, this.wave)
      : waveEnemyCount(this.wave, this.difficulty);
  }

  screenToCell(sx: number, sy: number, canvas: HTMLCanvasElement): {
    col: number;
    row: number;
  } {
    const rect = canvas.getBoundingClientRect();
    const x = ((sx - rect.left) / rect.width) * this.width;
    const y = ((sy - rect.top) / rect.height) * this.height;
    return {
      col: Math.floor(x / CELL),
      row: Math.floor(y / CELL),
    };
  }

  update(dt: number): void {
    if (this.phase === "won" || this.phase === "lost") {
      this.updateParticles(dt);
      return;
    }

    this.pulse += dt;
    this.spawnEnemies(dt);
    this.updateEnemies(dt);
    this.updateSpawners(dt);
    this.updateTowers(dt);
    this.updateClouds(dt);
    this.updateProjectiles(dt);
    this.updateParticles(dt);
    this.checkWaveEnd();
  }

  private makeEnemy(
    def: ReturnType<typeof enemyForWave>,
    pathIndex: number,
    progress: number,
    x: number,
    y: number,
  ): Enemy {
    return {
      id: this.nextEnemyId++,
      kind: def.kind,
      pathIndex,
      progress,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      baseSpeed: def.speed,
      reward: def.reward,
      radius: def.radius,
      color: def.color,
      slowTimer: 0,
      leakDamage: def.leakDamage ?? 1,
      x,
      y,
      spawnTimer: def.kind === "spawner" ? 2.5 : 0,
      sinceDamage: 0,
      stolen: 0,
      stealTimer: 0,
      burnTimer: 0,
      burnDps: 0,
    };
  }

  /** Spawners summon weak enemies every few seconds while alive. */
  private updateSpawners(dt: number): void {
    const spawned: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.kind !== "spawner" || e.hp <= 0) continue;
      e.spawnTimer -= dt;
      if (e.spawnTimer > 0) continue;
      e.spawnTimer = 3.2;
      const scale = 1 + (this.wave - 1) * 0.15;
      spawned.push(
        this.makeEnemy(
          {
            kind: "normal",
            hp: Math.round(22 * scale),
            speed: NORMAL_SPEED + 8,
            reward:
              this.difficulty === "endless" && endlessDrought(this.wave) ? 0 : 3,
            radius: 9,
            color: "#9aaa4a",
            leakDamage: 1,
          },
          e.pathIndex,
          Math.min(0.9, e.progress + 0.05),
          e.x,
          e.y,
        ),
      );
      this.burst(e.x, e.y, "#6a7a3a", 6);
    }
    if (spawned.length) {
      this.enemies.push(...spawned);
      this.emitHud();
    }
  }

  private spawnEnemies(dt: number): void {
    if (!this.waveInProgress || this.spawnQueue <= 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    const index = this.queuedSpawns() - this.spawnQueue;
    const def = this.custom
      ? customEnemyAt(this.custom, this.wave, index)
      : enemyForWave(this.wave, index, this.difficulty, this.campaign.waves);
    const start = this.waypoints[0];
    this.enemies.push(this.makeEnemy(def, 0, 0, start.x, start.y));
    this.spawnQueue -= 1;
    const interval = spawnInterval(this.wave, this.difficulty);
    this.spawnTimer =
      isBossKind(def.kind) || def.kind === "challenger" ? interval + 1.0 : interval;
    this.emitHud();
  }

  private updateEnemies(dt: number): void {
    const survivors: Enemy[] = [];
    const spawned: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        e.burnTimer = 0;
        e.burnDps = 0;
        if (e.slowTimer <= 0) e.speed = e.baseSpeed;
      } else if (e.burnTimer > 0 && e.hp > 0) {
        const step = Math.min(dt, e.burnTimer);
        e.burnTimer -= dt;
        this.damageEnemy(e, e.burnDps * step);
        if (e.burnTimer <= 0) {
          e.burnTimer = 0;
          e.burnDps = 0;
        }
      }

      // Normal mode: only tanks heal back if nothing hurts them for a few seconds.
      if (
        this.difficulty !== "hard" &&
        e.kind === "tank" &&
        e.hp > 0 &&
        e.hp < e.maxHp
      ) {
        e.sinceDamage += dt;
        if (e.sinceDamage >= REGEN_DELAY) {
          e.hp = e.maxHp;
          e.sinceDamage = 0;
          this.burst(e.x, e.y, "#5ecf8a", 12);
        }
      }

      let remaining = e.speed * dt;
      while (remaining > 0 && e.pathIndex < this.waypoints.length - 1) {
        const a = this.waypoints[e.pathIndex];
        const b = this.waypoints[e.pathIndex + 1];
        const segLen = dist(a, b);
        const distLeft = (1 - e.progress) * segLen;
        if (remaining >= distLeft) {
          remaining -= distLeft;
          e.pathIndex += 1;
          e.progress = 0;
          e.x = b.x;
          e.y = b.y;
        } else {
          e.progress += remaining / segLen;
          e.x = a.x + (b.x - a.x) * e.progress;
          e.y = a.y + (b.y - a.y) * e.progress;
          remaining = 0;
        }
      }

      if (e.pathIndex >= this.waypoints.length - 1 && e.progress >= 0) {
        this.lives -= e.leakDamage;
        this.burst(
          e.x,
          e.y,
          e.kind === "finalBoss"
            ? "#5a1430"
            : e.kind === "boss"
              ? "#6b2d8a"
              : "#e85d4a",
          e.kind === "finalBoss" ? 16 : 10,
        );
        if (this.lives <= 0) {
          this.lives = 0;
          this.phase = "lost";
        }
        this.emitHud();
        continue;
      }

      if (this.tickTheft(e, dt)) this.emitHud();

      if (e.hp > 0) survivors.push(e);
      else this.onEnemyDeath(e, spawned);
    }
    this.enemies = survivors;
    if (spawned.length) this.enemies.push(...spawned);
  }

  /** Damage and attack-speed bonus banners apply to a fighting tower. */
  private bannerBuffFor(t: Tower): { damage: number; rate: number } {
    const def = TOWER_DEFS[t.kind];
    if (def.economy || def.support) return { damage: 0, rate: 0 };
    let damage = 0;
    let rate = 0;
    const pad = { x: t.col * CELL + CELL / 2, y: t.row * CELL + CELL / 2 };
    for (const banner of this.towers) {
      if (banner.kind !== "banner" || banner === t) continue;
      const bonus = bannerBonus(banner);
      if (banner.special) {
        damage += bonus.damage;
        rate += bonus.rate;
        continue;
      }
      const reach = combatStats(banner).range * CELL;
      const origin = {
        x: banner.col * CELL + CELL / 2,
        y: banner.row * CELL + CELL / 2,
      };
      if (dist(pad, origin) <= reach) {
        damage += bonus.damage;
        rate += bonus.rate;
      }
    }
    return {
      damage: Math.min(BANNER_CAP, damage),
      rate: Math.min(BANNER_CAP, rate),
    };
  }

  /** Shot stats with banner bonuses applied. Mints and banners are unchanged. */
  private effectiveStats(t: Tower): ReturnType<typeof combatStats> {
    const stats = combatStats(t);
    const def = TOWER_DEFS[t.kind];
    if (def.economy || def.support) return stats;
    const buff = this.bannerBuffFor(t);
    return {
      ...stats,
      damage: stats.damage * (1 + buff.damage),
      fireRate: stats.fireRate * (1 + buff.rate),
      auraDamage: stats.auraDamage * (1 + buff.damage),
    };
  }

  private updateTowers(dt: number): void {
    let minted = false;
    for (const t of this.towers) {
      const def = TOWER_DEFS[t.kind];
      const tx = t.col * CELL + CELL / 2;
      const ty = t.row * CELL + CELL / 2;

      if (def.flying) {
        this.updateFlyingTower(t, this.effectiveStats(t), dt);
        continue;
      }

      // Mint prints only while a wave is running.
      if (def.economy) {
        if (!this.waveInProgress) continue;
        t.cooldown = Math.max(0, t.cooldown - dt);
        if (t.cooldown <= 0) {
          const income = mintIncome(t);
          const slow =
            t.special &&
            this.difficulty === "endless" &&
            endlessDrought(this.wave);
          this.gold += income.amount;
          t.cooldown = income.interval * (slow ? 2 : 1);
          minted = true;
          this.burst(tx, ty - 8, "#e8c547", 8);
        }
        continue;
      }

      if (def.support) continue;

      if (def.storm) {
        this.updateStorm(t, dt);
        continue;
      }

      if (def.nuke) continue;

      if (def.mace) {
        this.updateMace(t, dt);
        continue;
      }

      if (def.chomp) {
        this.updateChomp(t, dt);
        continue;
      }

      const stats = this.effectiveStats(t);
      const rangePx = def.sniper ? Number.POSITIVE_INFINITY : stats.range * CELL;

      // Continuous auras (archer damage / frost freeze)
      if (stats.auraDamage > 0 || stats.auraFreeze) {
        for (const e of this.enemies) {
          if (dist({ x: tx, y: ty }, e) > rangePx) continue;
          if (stats.auraDamage > 0) {
            this.damageEnemy(e, stats.auraDamage * dt);
          }
          if (t.kind === "pyro" && e.hp > 0 && e.slowTimer <= 0) {
            e.burnTimer = Math.max(e.burnTimer, PYRO_BURN_TIME);
            e.burnDps = Math.max(e.burnDps, pyroBurnDps(stats.damage));
          }
          if (stats.auraFreeze) {
            e.speed = e.baseSpeed * stats.slow;
            e.slowTimer = Math.max(e.slowTimer, stats.slowDuration);
            e.burnTimer = 0;
            e.burnDps = 0;
          }
        }
      }

      t.cooldown = Math.max(0, t.cooldown - dt);
      if (t.cooldown > 0) continue;
      if (!stats.firesProjectiles) {
        // Frost glacier still "pulses" visually via cooldown for particles
        if (stats.auraFreeze) {
          t.cooldown = 0.5;
          if (Math.random() < 0.4) {
            this.burst(tx, ty, "rgba(126, 200, 224, 0.8)", 3);
          }
        }
        continue;
      }

      const best = this.pickTarget(
        { x: tx, y: ty },
        t.targeting,
        rangePx,
        new Set(),
        t.inverted,
      );
      if (!best) continue;

      const angle = Math.atan2(best.y - ty, best.x - tx);
      this.projectiles.push({
        x: tx,
        y: ty,
        vx: Math.cos(angle) * stats.projectileSpeed,
        vy: Math.sin(angle) * stats.projectileSpeed,
        damage: stats.damage,
        splash: stats.splash * CELL,
        slow: stats.slow,
        slowDuration: stats.slowDuration,
        color: stats.color,
        targetId: best.id,
        life: def.sniper ? 8 : 1.2,
        fire: t.kind === "pyro",
        heavy: def.sniper,
      });
      t.cooldown = 1 / stats.fireRate;
    }

    if (this.reapEnemies() || minted) this.emitHud();
  }

  /** Drop dead enemies, pay their rewards, and keep anything they spawn. */
  private reapEnemies(): boolean {
    const spawned: Enemy[] = [];
    let killed = false;
    this.enemies = this.enemies.filter((e) => {
      if (e.hp > 0) return true;
      killed = true;
      this.onEnemyDeath(e, spawned);
      return false;
    });
    if (spawned.length) this.enemies.push(...spawned);
    return killed;
  }

  /** Swallow one enemy, or two with the special, then sleep. */
  private updateChomp(t: Tower, dt: number): void {
    if (t.cooldown > 0) {
      t.cooldown = Math.max(0, t.cooldown - dt);
      if (t.cooldown === 0) this.emitHud();
      return;
    }

    const stats = this.effectiveStats(t);
    const tx = t.col * CELL + CELL / 2;
    const ty = t.row * CELL + CELL / 2;
    const rangePx = stats.range * CELL;
    const avoid = new Set<number>();
    const eaten: Enemy[] = [];
    for (let i = 0; i < chompBiteCount(t.special); i++) {
      const best = this.pickTarget(
        { x: tx, y: ty },
        t.targeting,
        rangePx,
        avoid,
        t.inverted,
      );
      if (!best || avoid.has(best.id)) break;
      avoid.add(best.id);
      eaten.push(best);
    }
    if (!eaten.length) return;

    for (const e of eaten) {
      e.hp = 0;
      this.burst(e.x, e.y, TOWER_DEFS.chomp.color, 10);
    }
    this.reapEnemies();
    t.cooldown = chompSleepSeconds(t.speedLevel, this.bannerBuffFor(t).rate);
    this.burst(tx, ty, "#1a2a16", 6);
    this.emitHud();
  }

  /** Sweep one or three maces through the circle and strike whatever they pass. */
  private updateMace(t: Tower, dt: number): void {
    const stats = this.effectiveStats(t);
    const tx = t.col * CELL + CELL / 2;
    const ty = t.row * CELL + CELL / 2;
    const prev = t.orbit;
    t.orbit = prev + ((Math.PI * 2) / MACE_PERIOD) * dt;
    const count = maceCount(t.special);
    const span = (Math.PI * 2) / count;
    const rangePx = stats.range * CELL;

    for (const e of this.enemies) {
      if (e.hp <= 0) continue;
      if (dist({ x: tx, y: ty }, e) > rangePx + e.radius * 0.2) continue;
      const enemyAngle = Math.atan2(e.y - ty, e.x - tx);
      for (let i = 0; i < count; i++) {
        if (!maceSweepHits(prev + i * span, t.orbit + i * span, enemyAngle)) continue;
        this.damageEnemy(e, stats.damage);
        this.burst(e.x, e.y, stats.color, 3);
      }
    }
    this.reapEnemies();
  }

  private updateStorm(t: Tower, dt: number): void {
    const stats = this.effectiveStats(t);
    const tx = t.col * CELL + CELL / 2;
    const ty = t.row * CELL + CELL / 2;

    t.cooldown = Math.max(0, t.cooldown - dt);
    if (t.cooldown <= 0) {
      this.fireStorm(stats.damage, tx, ty);
      t.cooldown = 1 / Math.max(0.05, stats.fireRate);
    }

    if (!t.special || !this.waveInProgress) return;
    t.summonTimer = Math.max(0, t.summonTimer - dt);
    if (t.summonTimer > 0) return;
    this.summonCloud(t);
    t.summonTimer = CLOUD_INTERVAL;
  }

  /** A lightning sticker. One in four strikes is guaranteed to hit a living enemy. */
  private fireStorm(damage: number, tx: number, ty: number): void {
    const living = this.enemies.filter((e) => e.hp > 0);
    const sure = stormGuaranteesHit(Math.random()) && living.length > 0;
    if (sure) {
      const foe = living[Math.floor(Math.random() * living.length)]!;
      this.damageEnemy(foe, damage);
      this.addSticker(foe.x, foe.y, tx, ty, true);
      this.burst(foe.x, foe.y, "#d7f1ff", 8);
      return;
    }

    const x = Math.random() * this.width;
    const y = Math.random() * this.height;
    this.addSticker(x, y, tx, ty, false);
    let hit = false;
    for (const e of living) {
      if (dist({ x, y }, e) <= STORM_SPLASH) {
        this.damageEnemy(e, damage);
        hit = true;
      }
    }
    if (hit) this.burst(x, y, "#9ad7ff", 6);
  }

  private addSticker(x: number, y: number, fromX: number, fromY: number, sure: boolean): void {
    const life = sure ? 0.7 : 0.5;
    this.stickers.push({ x, y, fromX, fromY, life, maxLife: life, sure });
  }

  private summonCloud(owner: Tower): void {
    const mine = this.clouds.filter((c) => c.owner === owner).length;
    if (mine >= CLOUD_CAP) return;
    const start = this.waypoints[0];
    if (!start) return;
    this.clouds.push({
      owner,
      hp: CLOUD_HP,
      maxHp: CLOUD_HP,
      pathIndex: 0,
      progress: 0,
      x: start.x,
      y: start.y,
      fightCooldown: 0.2,
    });
    this.burst(start.x, start.y, "#f4fbff", 10);
  }

  private cloudOwnerLive(owner: Tower): boolean {
    return this.carrying === owner || this.towers.includes(owner);
  }

  private updateClouds(dt: number): void {
    const next: CloudAlly[] = [];
    for (const c of this.clouds) {
      if (!this.cloudOwnerLive(c.owner) || c.hp <= 0) {
        if (c.hp <= 0) this.burst(c.x, c.y, "#d7f1ff", 8);
        continue;
      }
      this.stepCloud(c, dt);
      if (c.hp <= 0) {
        this.burst(c.x, c.y, "#d7f1ff", 8);
        continue;
      }
      const atExit = c.pathIndex >= this.waypoints.length - 1;
      const fighting = this.enemies.some((e) => e.hp > 0 && dist(c, e) <= CLOUD_REACH);
      if (atExit && !fighting) {
        this.burst(c.x, c.y, "#d7f1ff", 6);
        continue;
      }
      next.push(c);
    }
    this.clouds = next;
    if (this.reapEnemies()) this.emitHud();
  }

  /** Walk toward the nearest enemy and trade hits when close. */
  private stepCloud(c: CloudAlly, dt: number): void {
    const living = this.enemies.filter((e) => e.hp > 0);
    if (!living.length) return;

    let foe = living[0]!;
    let best = dist(c, foe);
    for (const e of living) {
      const d = dist(c, e);
      if (d < best) {
        foe = e;
        best = d;
      }
    }

    if (best > CLOUD_REACH) {
      const ahead = this.pathProgress(foe) + 0.02 >= c.pathIndex + c.progress;
      const moved = this.moveAlongPath(
        c.pathIndex,
        c.progress,
        (ahead ? 1 : -1) * CLOUD_SPEED * dt,
      );
      c.pathIndex = moved.pathIndex;
      c.progress = moved.progress;
      const pos = this.pointOnPath(c.pathIndex, c.progress);
      c.x = pos.x;
      c.y = pos.y;
    }

    const near = this.enemies.filter((e) => e.hp > 0 && dist(c, e) <= CLOUD_REACH);
    if (!near.length) return;
    c.fightCooldown -= dt;
    if (c.fightCooldown > 0) return;
    c.fightCooldown = CLOUD_HIT_INTERVAL;

    const target = near.reduce((a, b) => (dist(c, b) < dist(c, a) ? b : a));
    const buff = this.bannerBuffFor(c.owner);
    this.damageEnemy(target, cloudStrikeDamage(c.owner.damageLevel) * (1 + buff.damage));
    this.burst(target.x, target.y, "#f4fbff", 5);
    for (const e of near) c.hp -= cloudStrikeBack(e.maxHp);
  }

  private pointOnPath(pathIndex: number, progress: number): Vec2 {
    const last = this.waypoints.length - 1;
    const a = this.waypoints[Math.min(pathIndex, last)];
    if (!a || pathIndex >= last) return a ?? { x: 0, y: 0 };
    const b = this.waypoints[pathIndex + 1] ?? a;
    return {
      x: a.x + (b.x - a.x) * progress,
      y: a.y + (b.y - a.y) * progress,
    };
  }

  private moveAlongPath(
    pathIndex: number,
    progress: number,
    pixels: number,
  ): { pathIndex: number; progress: number } {
    let index = pathIndex;
    let prog = progress;
    let remaining = Math.abs(pixels);
    const dir = pixels >= 0 ? 1 : -1;
    const last = this.waypoints.length - 1;
    while (remaining > 0.01 && last > 0) {
      if (dir > 0) {
        if (index >= last) break;
        const seg = Math.max(1, dist(this.waypoints[index]!, this.waypoints[index + 1]!));
        const room = (1 - prog) * seg;
        if (remaining >= room) {
          remaining -= room;
          index += 1;
          prog = 0;
        } else {
          prog += remaining / seg;
          remaining = 0;
        }
      } else if (index <= 0 && prog <= 0) {
        prog = 0;
        break;
      } else {
        const seg = Math.max(
          1,
          dist(this.waypoints[index]!, this.waypoints[Math.min(index + 1, last)]!),
        );
        const room = prog * seg;
        if (remaining >= room) {
          remaining -= room;
          if (index <= 0) {
            prog = 0;
            break;
          }
          index -= 1;
          prog = 1;
        } else {
          prog -= remaining / seg;
          remaining = 0;
        }
      }
    }
    return { pathIndex: index, progress: prog };
  }

  /** How far an enemy has walked. Higher means closer to the exit. */
  private pathProgress(e: Enemy): number {
    return e.pathIndex + e.progress;
  }

  /**
   * Pick a living enemy inside range. An empty avoid set is ignored.
   * If every candidate is avoided, fall back to the full list so a
   * drone still attacks when only one enemy is left.
   */
  private pickTarget(
    origin: Vec2,
    mode: TargetMode,
    rangePx: number,
    avoid: Set<number>,
    inverted = false,
  ): Enemy | null {
    const inRange = this.enemies.filter(
      (e) => e.hp > 0 && dist(origin, e) <= rangePx,
    );
    if (!inRange.length) return null;
    const open = inRange.filter((e) => !avoid.has(e.id));
    const list = open.length ? open : inRange;

    let aimed = mode;
    if (inverted) {
      if (mode === "first") aimed = "last";
      else if (mode === "last") aimed = "first";
      else if (mode === "strongest") aimed = "weakest";
      else if (mode === "weakest") aimed = "strongest";
    }
    const farthest = inverted && mode === "auto";

    if (aimed === "first") {
      return list.reduce((a, b) =>
        this.pathProgress(b) > this.pathProgress(a) ? b : a,
      );
    }
    if (aimed === "last") {
      return list.reduce((a, b) =>
        this.pathProgress(b) < this.pathProgress(a) ? b : a,
      );
    }
    if (aimed === "strongest") {
      return list.reduce((a, b) => (b.hp > a.hp ? b : a));
    }
    if (aimed === "weakest") {
      return list.reduce((a, b) => (b.hp < a.hp ? b : a));
    }
    if (farthest) {
      return list.reduce((a, b) => (dist(origin, b) > dist(origin, a) ? b : a));
    }
    return list.reduce((a, b) => (dist(origin, b) < dist(origin, a) ? b : a));
  }

  private steer(unit: Flyer, dest: Vec2, speed: number, dt: number): void {
    const d = dist(unit, dest);
    if (d < 1) return;
    const step = Math.min(d, speed * dt);
    unit.x += ((dest.x - unit.x) / d) * step;
    unit.y += ((dest.y - unit.y) / d) * step;
  }

  /** Fly to the chosen enemy and keep hitting it until it is gone. */
  private hunt(
    tower: Tower,
    unit: Flyer,
    damage: number,
    fireRate: number,
    speed: number,
    color: string,
    slot: number,
    avoid: Set<number>,
    dt: number,
  ): void {
    let target =
      this.enemies.find((e) => e.id === unit.targetId && e.hp > 0) ?? null;
    if (!target) {
      target = this.pickTarget(
        unit,
        tower.targeting,
        Infinity,
        avoid,
        tower.inverted,
      );
      unit.targetId = target?.id ?? null;
    }

    if (!target) {
      this.steer(unit, nestPoint(tower.col, tower.row, slot), speed, dt);
      return;
    }

    if (dist(unit, target) > 28) {
      this.steer(unit, target, speed, dt);
      return;
    }

    const ang = slot < 0 ? -Math.PI / 2 : (slot * Math.PI * 2) / DRONE_COUNT;
    unit.x = target.x + Math.cos(ang) * 12;
    unit.y = target.y + Math.sin(ang) * 12;
    unit.cooldown -= dt;
    if (unit.cooldown > 0) return;
    this.damageEnemy(target, damage);
    unit.cooldown = 1 / Math.max(0.25, fireRate);
    this.burst(target.x, target.y, color, slot < 0 ? 4 : 2);
  }

  private updateFlyingTower(
    t: Tower,
    stats: ReturnType<typeof combatStats>,
    dt: number,
  ): void {
    if (!t.flyer) return;
    const avoid = new Set<number>();
    this.hunt(
      t,
      t.flyer,
      stats.damage,
      stats.fireRate,
      FLY_SPEED,
      stats.color,
      -1,
      avoid,
      dt,
    );
    if (t.flyer.targetId !== null) avoid.add(t.flyer.targetId);
    if (!t.special) return;
    for (let i = 0; i < t.drones.length; i++) {
      const drone = t.drones[i];
      this.hunt(
        t,
        drone,
        stats.damage * DRONE_DAMAGE_RATIO,
        stats.fireRate * 0.9,
        DRONE_SPEED,
        "#e7b6f2",
        i,
        avoid,
        dt,
      );
      if (drone.targetId !== null) avoid.add(drone.targetId);
    }
  }

  private updateProjectiles(dt: number): void {
    const next: Projectile[] = [];
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.life <= 0) continue;

      const target = this.enemies.find((e) => e.id === p.targetId);
      if (target) {
        const angle = Math.atan2(target.y - p.y, target.x - p.x);
        const speed = Math.hypot(p.vx, p.vy);
        p.vx = Math.cos(angle) * speed;
        p.vy = Math.sin(angle) * speed;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      let hit = false;
      if (target && dist(p, target) < target.radius + 6) {
        this.applyHit(p, target);
        hit = true;
      } else {
        for (const e of this.enemies) {
          if (dist(p, e) < e.radius + 5) {
            this.applyHit(p, e);
            hit = true;
            break;
          }
        }
      }

      if (
        !hit &&
        p.x > -20 &&
        p.y > -20 &&
        p.x < this.width + 20 &&
        p.y < this.height + 20
      ) {
        next.push(p);
      }
    }
    this.projectiles = next;
  }

  private applyHit(p: Projectile, primary: Enemy): void {
    const targets =
      p.splash > 0
        ? this.enemies.filter((e) => dist(primary, e) <= p.splash)
        : [primary];

    for (const e of targets) {
      if (p.fire) this.applyFire(e, p.damage);
      else this.damageEnemy(e, p.damage);
      if (p.slow > 0) {
        e.speed = e.baseSpeed * p.slow;
        e.slowTimer = p.slowDuration;
        e.burnTimer = 0;
        e.burnDps = 0;
      }
      this.burst(e.x, e.y, p.color, p.splash > 0 ? 6 : 4);
    }

    const spawned: Enemy[] = [];
    this.enemies = this.enemies.filter((e) => {
      if (e.hp > 0) return true;
      this.onEnemyDeath(e, spawned);
      return false;
    });
    if (spawned.length) this.enemies.push(...spawned);
    this.emitHud();
  }

  /** Ignite a target. Extra damage if it is not already burning. A slow refuses the burn. */
  private applyFire(e: Enemy, damage: number): void {
    if (e.slowTimer > 0) {
      e.burnTimer = 0;
      e.burnDps = 0;
    }
    const burning = e.burnTimer > 0;
    this.damageEnemy(e, pyroHitDamage(damage, burning));
    if (e.slowTimer > 0 || e.hp <= 0) return;
    e.burnTimer = PYRO_BURN_TIME;
    e.burnDps = Math.max(e.burnDps, pyroBurnDps(damage));
  }

  /** HP loss resets the normal-mode regen clock. Slows alone do not. */
  private damageEnemy(e: Enemy, amount: number): void {
    if (amount <= 0 || e.hp <= 0) return;
    e.hp -= amount;
    e.sinceDamage = 0;
  }

  /** A living thief takes a little loose gold once a second. */
  private tickTheft(e: Enemy, dt: number): boolean {
    if (e.kind !== "thief" || e.hp <= 0) return false;
    e.stealTimer += dt;
    let stole = false;
    while (e.stealTimer >= 1) {
      e.stealTimer -= 1;
      const take = Math.min(THIEF_STEAL, this.gold);
      if (take <= 0) continue;
      this.gold -= take;
      e.stolen += take;
      stole = true;
      this.burst(e.x, e.y - e.radius - 4, "#e8c547", 5);
    }
    return stole;
  }

  private onEnemyDeath(e: Enemy, spawned: Enemy[]): void {
    this.gold += e.reward;
    if (e.kind === "thief") this.gold += thiefRefund(e.stolen);
    const burstColor =
      e.kind === "challenger"
        ? "#d4a24a"
        : e.kind === "finalBoss"
          ? "#e8c547"
          : e.kind === "boss"
            ? "#e8c547"
            : e.kind === "splitter"
              ? "#c978c0"
              : "#e8c547";
    this.burst(
      e.x,
      e.y,
      burstColor,
      e.kind === "challenger" || e.kind === "finalBoss"
        ? 28
        : isBossKind(e.kind)
          ? 22
          : 12,
    );

    if (e.kind === "splitter") {
      this.spawnOffspring(
        e,
        spawned,
        splitlingFrom(e.maxHp, this.wave, this.difficulty),
        [-0.08, 0.08],
      );
      return;
    }

    if (e.kind === "challenger") {
      this.spawnOffspring(
        e,
        spawned,
        bossDef(this.wave, this.difficulty),
        [-0.12, 0.12],
      );
    }
  }

  /** Drop children on the path so a death does not end the wave immediately. */
  private spawnOffspring(
    e: Enemy,
    spawned: Enemy[],
    child: ReturnType<typeof splitlingFrom>,
    offsets: number[],
  ): void {
    for (const off of offsets) {
      let pathIndex = e.pathIndex;
      let progress = e.progress + off;
      if (progress < 0 && pathIndex > 0) {
        pathIndex -= 1;
        progress = 0.9;
      }
      progress = Math.min(0.98, Math.max(0, progress));
      const a = this.waypoints[pathIndex];
      const b =
        this.waypoints[Math.min(pathIndex + 1, this.waypoints.length - 1)];
      const x = a.x + (b.x - a.x) * progress;
      const y = a.y + (b.y - a.y) * progress;
      spawned.push(this.makeEnemy(child, pathIndex, progress, x, y));
    }
  }

  private checkWaveEnd(): void {
    if (!this.waveInProgress) return;
    if (this.spawnQueue > 0 || this.enemies.length > 0) return;

    this.waveInProgress = false;
    this.gold += 25 + this.wave * 5;
    this.shovelReady = true; // one shovel action available again
    for (const tower of this.towers) {
      if (tower.kind === "sniper") tower.supplyUsed = false;
    }
    if (this.carrying?.kind === "sniper") this.carrying.supplyUsed = false;
    const cleared = this.custom
      ? this.wave >= this.custom.waves.length
      : this.difficulty !== "endless" && this.wave >= this.campaign.waves;
    this.phase = cleared ? "won" : "ready";
    this.emitHud();
  }

  private burst(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.5,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }

  private updateParticles(dt: number): void {
    if (this.blastFlash > 0) this.blastFlash = Math.max(0, this.blastFlash - dt);
    this.stickers = this.stickers.filter((s) => {
      s.life -= dt;
      return s.life > 0;
    });
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.92;
      p.vy *= 0.92;
      return p.life > 0;
    });
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawTerrain(ctx);
    this.drawPath(ctx);
    this.drawHover(ctx);
    this.drawTowers(ctx);
    this.drawCarryingGhost(ctx);
    this.drawEnemies(ctx);
    this.drawClouds(ctx);
    this.drawFlyers(ctx);
    this.drawProjectiles(ctx);
    this.drawStickers(ctx);
    this.drawParticles(ctx);
    if (this.blastFlash > 0) {
      ctx.fillStyle = `rgba(255, 214, 150, ${Math.min(0.55, this.blastFlash)})`;
      ctx.fillRect(0, 0, this.width, this.height);
    }
    this.drawBaseMarkers(ctx);
  }

  private drawGrassDecor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const pattern = this.campaign.pattern;
    if (pattern === "stripes") {
      ctx.strokeStyle = "rgba(232, 197, 71, 0.1)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + CELL - 10);
      ctx.lineTo(x + CELL - 10, y + 10);
      ctx.moveTo(x + 10, y + 18);
      ctx.lineTo(x + 22, y + 8);
      ctx.stroke();
      return;
    }
    if (pattern === "marsh") {
      ctx.fillStyle = "rgba(120, 180, 150, 0.16)";
      ctx.beginPath();
      ctx.ellipse(x + 16, y + 22, 7, 3, 0.2, 0, Math.PI * 2);
      ctx.ellipse(x + 32, y + 14, 5, 2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    if (pattern === "cobble") {
      ctx.fillStyle = "rgba(190, 198, 186, 0.12)";
      ctx.fillRect(x + 8, y + 8, 12, 9);
      ctx.fillRect(x + 26, y + 16, 12, 9);
      ctx.fillRect(x + 14, y + 30, 12, 9);
      return;
    }
    ctx.fillStyle = "rgba(94, 207, 138, 0.06)";
    ctx.fillRect(x + 8, y + 10, 3, 8);
    ctx.fillRect(x + 22, y + 28, 2, 6);
    ctx.fillRect(x + 34, y + 14, 3, 7);
  }

  private drawTerrain(ctx: CanvasRenderingContext2D): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL;
        const y = r * CELL;
        const crater = this.craters.has(pathKey(c, r));
        const wet = this.water.has(pathKey(c, r));
        const shade = crater
          ? "#140e0c"
          : wet
            ? "#14343c"
            : (c + r) % 2 === 0
              ? this.grassA
              : this.grassB;
        ctx.fillStyle = shade;
        ctx.fillRect(x, y, CELL, CELL);
        if (wet && !crater) {
          ctx.fillStyle = "#2a7584";
          ctx.beginPath();
          ctx.ellipse(x + CELL / 2, y + CELL / 2 + 1, 18, 13, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "rgba(186, 228, 236, 0.45)";
          ctx.beginPath();
          ctx.ellipse(x + CELL / 2 - 5, y + CELL / 2 - 3, 6, 3, -0.5, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }
        if (crater) {
          ctx.fillStyle = "#241610";
          ctx.beginPath();
          ctx.ellipse(x + CELL / 2, y + CELL / 2 + 2, 16, 11, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#5a3a28";
          ctx.lineWidth = 2;
          ctx.stroke();
          ctx.fillStyle = "#0c0908";
          ctx.beginPath();
          ctx.ellipse(x + CELL / 2, y + CELL / 2 + 3, 8, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          continue;
        }

        this.drawGrassDecor(ctx, x, y);
      }
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D): void {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#5a4a35";
    ctx.lineWidth = CELL * 0.72;
    ctx.beginPath();
    this.waypoints.forEach((w, i) => {
      if (i === 0) ctx.moveTo(w.x, w.y);
      else ctx.lineTo(w.x, w.y);
    });
    ctx.stroke();

    ctx.strokeStyle = "#3d3428";
    ctx.lineWidth = CELL * 0.52;
    ctx.beginPath();
    this.waypoints.forEach((w, i) => {
      if (i === 0) ctx.moveTo(w.x, w.y);
      else ctx.lineTo(w.x, w.y);
    });
    ctx.stroke();

    ctx.strokeStyle = "rgba(232, 197, 71, 0.15)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 10]);
    ctx.beginPath();
    this.waypoints.forEach((w, i) => {
      if (i === 0) ctx.moveTo(w.x, w.y);
      else ctx.lineTo(w.x, w.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawBaseMarkers(ctx: CanvasRenderingContext2D): void {
    const start = this.waypoints[0];
    const end = this.waypoints[this.waypoints.length - 1];
    const pulse = 0.5 + 0.5 * Math.sin(this.pulse * 3);

    ctx.fillStyle = `rgba(94, 207, 138, ${0.25 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5ecf8a";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = `rgba(232, 93, 74, ${0.25 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(end.x, end.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e85d4a";
    ctx.stroke();

    ctx.fillStyle = "#e8efe6";
    ctx.font = "600 11px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("IN", start.x, start.y);
    ctx.fillText("OUT", end.x, end.y);
  }

  private drawHover(ctx: CanvasRenderingContext2D): void {
    if (!this.hover) return;
    if (this.phase === "won" || this.phase === "lost") return;

    const { col, row } = this.hover;
    const key = pathKey(col, row);
    const cx = col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;

    if (this.carrying || this.tool === "shovel") {
      const validPlace =
        this.carrying !== null &&
        !this.pathSet.has(key) &&
        !this.towerOccupied.has(key) &&
        !this.craters.has(key) &&
        !this.water.has(key);
      const hasTower = this.towerOccupied.has(key);
      ctx.fillStyle = this.carrying
        ? validPlace
          ? "rgba(94, 207, 138, 0.25)"
          : "rgba(232, 93, 74, 0.25)"
        : hasTower && this.shovelReady
          ? "rgba(232, 197, 71, 0.25)"
          : "rgba(232, 93, 74, 0.15)";
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
      if (this.carrying && validPlace) {
        const stats = combatStats(this.carrying);
        ctx.beginPath();
        ctx.arc(cx, cy, stats.range * CELL, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(232, 197, 71, 0.45)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
      return;
    }

    if (!this.selected) return;

    const def = TOWER_DEFS[this.selected];
    const occupied = this.towerOccupied.has(key);
    const crater = this.craters.has(key);
    const valid =
      !this.pathSet.has(key) &&
      !occupied &&
      !crater &&
      !this.water.has(key) &&
      this.gold >= def.cost;

    if (occupied) {
      ctx.fillStyle = "rgba(232, 197, 71, 0.15)";
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
      return;
    }

    if (crater || this.water.has(key)) {
      ctx.fillStyle = "rgba(232, 93, 74, 0.35)";
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
      return;
    }

    if (def.nuke) {
      for (let dc = -1; dc <= 1; dc++) {
        for (let dr = -1; dr <= 1; dr++) {
          const c = col + dc;
          const r = row + dr;
          if (c < 0 || r < 0 || c >= COLS || r >= ROWS) continue;
          const center = dc === 0 && dr === 0;
          ctx.fillStyle = center
            ? valid
              ? "rgba(80, 40, 16, 0.55)"
              : "rgba(232, 93, 74, 0.35)"
            : "rgba(232, 93, 74, 0.28)";
          ctx.fillRect(c * CELL, r * CELL, CELL, CELL);
        }
      }
    } else {
      ctx.fillStyle = valid ? "rgba(94, 207, 138, 0.2)" : "rgba(232, 93, 74, 0.25)";
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
    }

    if (!def.economy && def.range > 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, def.range * CELL, 0, Math.PI * 2);
      ctx.strokeStyle = valid
        ? "rgba(232, 197, 71, 0.45)"
        : "rgba(232, 93, 74, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = valid ? def.color : "#666";
    ctx.globalAlpha = 0.7;
    this.drawTowerGlyph(ctx, cx, cy, this.selected);
    ctx.globalAlpha = 1;
  }

  private drawCarryingGhost(ctx: CanvasRenderingContext2D): void {
    if (!this.carrying || !this.hover) return;
    const { col, row } = this.hover;
    const key = pathKey(col, row);
    if (this.pathSet.has(key) || this.towerOccupied.has(key) || this.water.has(key) || this.craters.has(key)) return;
    const cx = col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = TOWER_DEFS[this.carrying.kind].color;
    this.drawTowerGlyph(ctx, cx, cy, this.carrying.kind);
    ctx.globalAlpha = 1;
  }

  private drawTowers(ctx: CanvasRenderingContext2D): void {
    this.towers.forEach((t, i) => {
      const cx = t.col * CELL + CELL / 2;
      const cy = t.row * CELL + CELL / 2;
      const def = TOWER_DEFS[t.kind];
      const stats = combatStats(t);
      const selected = this.selectedTowerIndex === i;

      if (def.support && (selected || t.special)) {
        if (t.special) {
          ctx.save();
          ctx.strokeStyle = selected
            ? "rgba(212, 162, 74, 0.75)"
            : "rgba(212, 162, 74, 0.35)";
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 4]);
          ctx.strokeRect(3, 3, this.width - 6, this.height - 6);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(cx, cy, stats.range * CELL, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(212, 162, 74, 0.5)";
          ctx.lineWidth = selected ? 2 : 1;
          ctx.stroke();
        }
      } else if (
        !def.economy &&
        !def.flying &&
        !def.storm &&
        !def.mace &&
        stats.range > 0 &&
        (selected || t.special || t.cooldown < 0.15)
      ) {
        ctx.beginPath();
        ctx.arc(cx, cy, stats.range * CELL, 0, Math.PI * 2);
        if (t.special && t.kind === "frost") {
          ctx.fillStyle = "rgba(90, 158, 184, 0.08)";
          ctx.fill();
        } else if (t.special && t.kind === "archer") {
          ctx.fillStyle = "rgba(74, 155, 110, 0.06)";
          ctx.fill();
        } else if (t.special && t.kind === "pyro") {
          ctx.fillStyle = "rgba(226, 88, 34, 0.16)";
          ctx.fill();
        }
        ctx.strokeStyle = selected
          ? "rgba(232, 197, 71, 0.4)"
          : t.special
            ? "rgba(232, 197, 71, 0.22)"
            : "rgba(232, 197, 71, 0.08)";
        ctx.lineWidth = selected ? 2 : 1;
        ctx.stroke();
      }

      const size = 16 + (t.damageLevel + t.speedLevel) * 1.5 + (t.special ? 2 : 0);
      ctx.fillStyle = "#152219";
      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = selected ? "#e8c547" : def.color;
      ctx.lineWidth = selected ? 3 : 2.5;
      ctx.stroke();

      if (t.special) {
        ctx.strokeStyle = "#e8c547";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, size + 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const asleep = def.chomp && t.cooldown > 0.15;
      ctx.save();
      if (asleep) ctx.globalAlpha = 0.55;
      ctx.fillStyle = def.color;
      this.drawTowerGlyph(ctx, cx, cy, t.kind, t.special && t.kind === "mint", asleep);
      ctx.restore();
      if (def.mace) this.drawMaces(ctx, t, cx, cy);

      if (t.inverted) {
        ctx.fillStyle = "#e8c547";
        ctx.font = "700 9px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "bottom";
        ctx.fillText("INV", cx, cy - size - 1);
      }

      const total = t.damageLevel + t.speedLevel + (t.special ? 1 : 0);
      if (total > 0) {
        ctx.fillStyle = "#e8c547";
        ctx.font = "600 10px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(t.special ? `★${total}` : `+${total}`, cx, cy + size + 2);
      }
    });
  }

  private drawTowerGlyph(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    kind: TowerKind,
    investmentBank = false,
    asleep = false,
  ): void {
    ctx.save();
    ctx.translate(cx, cy);
    if (kind === "archer") {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "cannon") {
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(2, -3, 10, 6);
    } else if (kind === "mint") {
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1a1508";
      ctx.font = "700 11px 'Chakra Petch', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(investmentBank ? "B" : "G", 0, 1);
    } else if (kind === "wasp") {
      ctx.beginPath();
      ctx.ellipse(-7, 0, 6, 2.4, -0.5, 0, Math.PI * 2);
      ctx.ellipse(7, 0, 6, 2.4, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "banner") {
      ctx.fillRect(-1.5, -10, 3, 18);
      ctx.beginPath();
      ctx.moveTo(1.5, -10);
      ctx.lineTo(11, -5);
      ctx.lineTo(1.5, 0);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "nuke") {
      ctx.beginPath();
      ctx.arc(0, 2, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-1.4, -8, 2.8, 6);
    } else if (kind === "pyro") {
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(5, 1);
      ctx.lineTo(2, 0);
      ctx.lineTo(3, 8);
      ctx.lineTo(-3, 8);
      ctx.lineTo(-2, 0);
      ctx.lineTo(-5, 1);
      ctx.closePath();
      ctx.fill();
    } else if (kind === "chomp") {
      if (asleep) {
        ctx.fillRect(-6, -1.2, 12, 2.4);
        ctx.fillStyle = "#f4efe4";
        ctx.font = "700 9px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("z", 8, -8);
      } else {
        ctx.beginPath();
        ctx.ellipse(0, 1, 7, 6, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a120c";
        ctx.beginPath();
        ctx.ellipse(0, 2.2, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f4efe4";
        ctx.beginPath();
        ctx.moveTo(-5, -2);
        ctx.lineTo(-1.5, 2);
        ctx.lineTo(-5, 3);
        ctx.closePath();
        ctx.moveTo(5, -2);
        ctx.lineTo(1.5, 2);
        ctx.lineTo(5, 3);
        ctx.closePath();
        ctx.fill();
      }
    } else if (kind === "sniper") {
      ctx.fillRect(-11, -1.4, 18, 2.8);
      ctx.fillRect(-3, -3.2, 5, 6.4);
      ctx.beginPath();
      ctx.arc(-7, 0, 2.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === "mace") {
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-1.5, 2, 3, 7);
    } else if (kind === "storm") {
      ctx.beginPath();
      ctx.moveTo(3, -9);
      ctx.lineTo(-4, 0);
      ctx.lineTo(1, 0);
      ctx.lineTo(-3, 9);
      ctx.lineTo(6, -1);
      ctx.lineTo(1, -1);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 8);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  private drawMaces(
    ctx: CanvasRenderingContext2D,
    t: Tower,
    cx: number,
    cy: number,
  ): void {
    const reach = combatStats(t).range * CELL;
    const count = maceCount(t.special);
    const span = (Math.PI * 2) / count;
    const color = TOWER_DEFS.mace.color;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (let i = 0; i < count; i++) {
      const angle = t.orbit + i * span;
      const x = cx + Math.cos(angle) * reach;
      const y = cy + Math.sin(angle) * reach;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d5dde6";
      ctx.beginPath();
      ctx.arc(x - 2, y - 2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = color;
    }
    if (this.selectedTowerIndex !== null && this.towers[this.selectedTowerIndex] === t) {
      ctx.beginPath();
      ctx.arc(cx, cy, reach, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(232, 197, 71, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawCraft(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    scale: number,
  ): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(-8, 0, 7, 2.6, -0.45, 0, Math.PI * 2);
    ctx.ellipse(8, 0, 7, 2.6, 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.beginPath();
    ctx.arc(-1, -1, 1.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private drawClouds(ctx: CanvasRenderingContext2D): void {
    for (const c of this.clouds) {
      ctx.save();
      ctx.fillStyle = "rgba(244, 251, 255, 0.94)";
      ctx.beginPath();
      ctx.ellipse(c.x, c.y - 2, 14, 9, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x - 10, c.y + 1, 8, 6, 0, 0, Math.PI * 2);
      ctx.ellipse(c.x + 10, c.y + 1, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#3a6fd8";
      ctx.beginPath();
      ctx.moveTo(c.x + 1, c.y - 6);
      ctx.lineTo(c.x - 3, c.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(c.x - 1, c.y + 5);
      ctx.lineTo(c.x + 4, c.y - 1);
      ctx.lineTo(c.x + 1, c.y - 1);
      ctx.closePath();
      ctx.fill();
      const bar = 22;
      const ratio = Math.max(0, c.hp / c.maxHp);
      ctx.fillStyle = "#152219";
      ctx.fillRect(c.x - bar / 2, c.y - 16, bar, 3);
      ctx.fillStyle = "#7ec8ff";
      ctx.fillRect(c.x - bar / 2, c.y - 16, bar * ratio, 3);
      ctx.restore();
    }
  }

  private drawStickers(ctx: CanvasRenderingContext2D): void {
    for (const s of this.stickers) {
      const alpha = Math.max(0, s.life / s.maxLife);
      if (s.life > s.maxLife - 0.16) {
        this.drawBolt(ctx, s.fromX, s.fromY, s.x, s.y, alpha);
      }
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(-0.35);
      ctx.globalAlpha = 0.35 + alpha * 0.65;
      ctx.fillStyle = s.sure ? "#fff8d6" : "#f4fbff";
      ctx.strokeStyle = s.sure ? "#e8c547" : "#7ec8ff";
      ctx.lineWidth = 2;
      ctx.fillRect(-8, -11, 16, 22);
      ctx.strokeRect(-8, -11, 16, 22);
      ctx.fillStyle = "#3a6fd8";
      ctx.beginPath();
      ctx.moveTo(2, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(-2, 8);
      ctx.lineTo(5, -1);
      ctx.lineTo(1, -1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  private drawBolt(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    alpha: number,
  ): void {
    const segs = 6;
    ctx.save();
    ctx.strokeStyle = `rgba(190, 230, 255, ${alpha})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const x = x1 + (x2 - x1) * t + Math.sin(i * 2.1 + this.pulse * 24) * 8;
      const y = y1 + (y2 - y1) * t + Math.cos(i * 1.7) * 6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  private drawFlyers(ctx: CanvasRenderingContext2D): void {
    for (const t of this.towers) {
      if (!t.flyer) continue;
      const pad = nestPoint(t.col, t.row, -1);
      const selected = this.towers[this.selectedTowerIndex ?? -1] === t;
      ctx.strokeStyle = selected
        ? "rgba(196, 106, 212, 0.55)"
        : "rgba(196, 106, 212, 0.28)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 5]);
      ctx.beginPath();
      ctx.moveTo(pad.x, pad.y + 14);
      ctx.lineTo(t.flyer.x, t.flyer.y);
      ctx.stroke();
      ctx.setLineDash([]);
      this.drawCraft(ctx, t.flyer.x, t.flyer.y, TOWER_DEFS.wasp.color, 1);
      t.drones.forEach((d) => {
        ctx.setLineDash([2, 4]);
        ctx.strokeStyle = "rgba(231, 182, 242, 0.35)";
        ctx.beginPath();
        ctx.moveTo(t.flyer!.x, t.flyer!.y);
        ctx.lineTo(d.x, d.y);
        ctx.stroke();
        ctx.setLineDash([]);
        this.drawCraft(ctx, d.x, d.y, "#e7b6f2", 0.62);
      });
    }
  }

  private drawEnemies(ctx: CanvasRenderingContext2D): void {
    for (const e of this.enemies) {
      const slowed = e.slowTimer > 0;
      const boss = isBossKind(e.kind);

      if (e.kind === "finalBoss") {
        ctx.fillStyle = "rgba(90, 20, 48, 0.35)";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 10, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === "boss") {
        ctx.fillStyle = "rgba(107, 45, 138, 0.25)";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 6, 0, Math.PI * 2);
        ctx.fill();
      } else if (e.kind === "challenger") {
        ctx.fillStyle = "rgba(212, 162, 74, 0.3)";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 8, 0, Math.PI * 2);
        ctx.fill();
      }

      if (e.kind === "splitter") {
        ctx.strokeStyle = "rgba(201, 120, 192, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (e.kind === "spawner") {
        ctx.strokeStyle = "rgba(154, 170, 74, 0.85)";
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (e.burnTimer > 0) {
        ctx.fillStyle = "rgba(226, 88, 34, 0.35)";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = e.color;
      ctx.beginPath();
      if (boss) {
        const r = e.radius;
        ctx.moveTo(e.x, e.y - r);
        ctx.lineTo(e.x + r * 0.85, e.y - r * 0.2);
        ctx.lineTo(e.x + r * 0.7, e.y + r * 0.75);
        ctx.lineTo(e.x - r * 0.7, e.y + r * 0.75);
        ctx.lineTo(e.x - r * 0.85, e.y - r * 0.2);
        ctx.closePath();
      } else if (e.kind === "spawner") {
        const r = e.radius;
        ctx.moveTo(e.x - r, e.y - r * 0.6);
        ctx.lineTo(e.x + r, e.y - r * 0.6);
        ctx.lineTo(e.x + r * 0.7, e.y + r);
        ctx.lineTo(e.x - r * 0.7, e.y + r);
        ctx.closePath();
      } else if (e.kind === "challenger") {
        const r = e.radius;
        for (let i = 0; i < 6; i++) {
          const a = -Math.PI / 2 + (i * Math.PI) / 3;
          const px = e.x + Math.cos(a) * r;
          const py = e.y + Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
      } else {
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      }
      ctx.fill();

      if (slowed) {
        ctx.strokeStyle = "#7ec8e0";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      if (e.kind === "finalBoss") {
        ctx.fillStyle = "#e8c547";
        ctx.font = "700 11px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("FINAL", e.x, e.y);
      } else if (e.kind === "boss") {
        ctx.fillStyle = "#e8c547";
        ctx.font = "700 10px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("BOSS", e.x, e.y);
      } else if (e.kind === "challenger") {
        ctx.fillStyle = "#1a1408";
        ctx.font = "700 8px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("RIVAL", e.x, e.y);
      } else if (e.kind === "spawner") {
        ctx.fillStyle = "#e8efe6";
        ctx.font = "700 8px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SPAWN", e.x, e.y);
      } else if (e.kind === "thief") {
        ctx.fillStyle = "#e8c547";
        ctx.beginPath();
        ctx.arc(e.x + 5, e.y - 1, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1408";
        ctx.font = "700 8px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("$", e.x + 5, e.y - 1);
      }

      const barW = boss ? e.radius * 2.8 : e.radius * 2.2;
      const barH = boss ? 6 : 4;
      const bx = e.x - barW / 2;
      const by = e.y - e.radius - (boss ? 14 : 10);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx, by, barW, barH);
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle =
        e.kind === "finalBoss"
          ? "#e8a0b8"
          : e.kind === "boss"
            ? "#c47ae0"
            : e.kind === "challenger"
              ? "#e8c547"
              : pct > 0.4
                ? "#5ecf8a"
                : "#e85d4a";
      ctx.fillRect(bx, by, barW * pct, barH);

      if (this.difficulty !== "hard" && e.kind === "tank") {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(94, 207, 138, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (this.difficulty !== "hard" && e.kind === "tank" && e.hp < e.maxHp) {
        const regenPct = Math.min(1, e.sinceDamage / REGEN_DELAY);
        const ry = by + barH + 2;
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(bx, ry, barW, 3);
        ctx.fillStyle = regenPct > 0.72 ? "#e8c547" : "#5ecf8a";
        ctx.fillRect(bx, ry, barW * regenPct, 3);
        if (regenPct > 0.72) {
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(94, 207, 138, 0.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }
  }

  private drawProjectiles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.projectiles) {
      if (p.heavy) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx));
        ctx.fillStyle = p.color;
        ctx.fillRect(-9, -2.4, 16, 4.8);
        ctx.fillStyle = "#f4e7b5";
        ctx.fillRect(4, -1.4, 4, 2.8);
        ctx.restore();
        continue;
      }
      if (p.fire) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(p.vy, p.vx) + Math.PI / 2);
        ctx.fillStyle = "#ffb15a";
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(4, 4);
        ctx.lineTo(0, 2);
        ctx.lineTo(-4, 4);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#e25822";
        ctx.beginPath();
        ctx.moveTo(0, -3);
        ctx.lineTo(2, 4);
        ctx.lineTo(-2, 4);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        continue;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.splash > 0 ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.arc(p.x - 1, p.y - 1, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
