import {
  BANNER_CAP,
  BANK_DEPOSIT_CHUNK,
  CELL,
  COLS,
  DRONE_COUNT,
  DRONE_DAMAGE_RATIO,
  DRONE_SPEED,
  FLY_SPEED,
  PATH,
  REGEN_DELAY,
  ROWS,
  TOTAL_WAVES,
  TOWER_DEFS,
  SPECIAL_UPGRADES,
  MAX_UPGRADE,
  NORMAL_SPEED,
  bankPayout,
  bannerBonus,
  combatStats,
  enemyForWave,
  makeFlyer,
  mintIncome,
  nestPoint,
  sellValue,
  specialCost,
  spawnInterval,
  splitlingFrom,
  startingGold,
  startingLives,
  upgradeCost,
  waveEnemyCount,
} from "./config";
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

export class Game {
  readonly width = COLS * CELL;
  readonly height = ROWS * CELL;

  private pathSet = new Set(PATH.map((p) => pathKey(p.col, p.row)));
  private waypoints: Vec2[] = PATH.map((p) => ({
    x: p.col * CELL + CELL / 2,
    y: p.row * CELL + CELL / 2,
  }));

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

  private nextEnemyId = 1;
  private spawnQueue = 0;
  private spawnTimer = 0;
  private waveInProgress = false;
  private hover: { col: number; row: number } | null = null;
  private pulse = 0;

  private towerOccupied = new Set<string>();

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
    const given = def.support ? bannerBonus(t) : null;
    const received = this.bannerBuffFor(t);
    const dCost =
      t.damageLevel < MAX_UPGRADE
        ? upgradeCost(def.cost, t.damageLevel)
        : null;
    const sCost =
      t.speedLevel < MAX_UPGRADE ? upgradeCost(def.cost, t.speedLevel) : null;
    const spCost = t.special ? null : specialCost(t.kind);
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
      goldInterval: income ? Math.round(income.interval * 10) / 10 : 0,
      banked: t.banked,
      bankPayout: t.kind === "mint" && t.special ? bankPayout(t.banked) : 0,
      targeting: t.targeting,
      flying: !!def.flying,
      support: !!def.support,
      inverted: t.inverted,
      buffDamage: given ? given.damage : received.damage,
      buffRate: given ? given.rate : received.rate,
    };
  }

  private emitHud(): void {
    this.onHudChange?.({
      gold: this.gold,
      lives: this.lives,
      wave: this.wave,
      totalWaves: TOTAL_WAVES,
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
    if (this.pathSet.has(key) || this.towerOccupied.has(key)) return false;

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

  tryPlace(col: number, row: number): boolean {
    if (this.phase === "won" || this.phase === "lost") return false;
    if (!this.selected || this.tool !== "build") return false;
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;

    const key = pathKey(col, row);
    if (this.pathSet.has(key)) return false;
    if (this.towerOccupied.has(key)) return false;

    const def = TOWER_DEFS[this.selected];
    if (this.gold < def.cost) return false;

    this.gold -= def.cost;
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
    if (!t || t.special) return false;

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
    this.burst(
      t.col * CELL + CELL / 2,
      t.row * CELL + CELL / 2,
      TOWER_DEFS[t.kind].color,
      14,
    );
    this.emitHud();
    return true;
  }

  /** Choose which enemy this tower prefers. Flyers keep their current prey. */
  setTargeting(mode: TargetMode): void {
    if (this.selectedTowerIndex === null) return;
    if (this.phase === "won" || this.phase === "lost") return;
    const t = this.towers[this.selectedTowerIndex];
    if (!t || TOWER_DEFS[t.kind].economy || TOWER_DEFS[t.kind].support) return;
    t.targeting = mode;
    this.emitHud();
  }

  /** Flip First/Last, Strong/Weak, and nearest/farthest for the selected tower. */
  toggleInvert(): void {
    if (this.selectedTowerIndex === null) return;
    if (this.phase === "won" || this.phase === "lost") return;
    const t = this.towers[this.selectedTowerIndex];
    if (!t || TOWER_DEFS[t.kind].economy || TOWER_DEFS[t.kind].support) return;
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
    if (this.wave >= TOTAL_WAVES) return;
    if (this.carrying) return; // must finish shovel move/sell first

    this.wave += 1;
    this.phase = "playing";
    this.waveInProgress = true;
    this.spawnQueue = waveEnemyCount(this.wave, this.difficulty);
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
    this.towerOccupied.clear();
    this.nextEnemyId = 1;
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.waveInProgress = false;
    this.emitHud();
  }

  beginRun(difficulty: Difficulty): void {
    this.restart(difficulty);
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
            reward: 3,
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

    const index =
      waveEnemyCount(this.wave, this.difficulty) - this.spawnQueue;
    const def = enemyForWave(this.wave, index, this.difficulty);
    const start = this.waypoints[0];
    this.enemies.push(this.makeEnemy(def, 0, 0, start.x, start.y));
    this.spawnQueue -= 1;
    const interval = spawnInterval(this.wave, this.difficulty);
    this.spawnTimer = isBossKind(def.kind) ? interval + 1.0 : interval;
    this.emitHud();
  }

  private updateEnemies(dt: number): void {
    const survivors: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        if (e.slowTimer <= 0) e.speed = e.baseSpeed;
      }

      // Normal mode: only tanks heal back if nothing hurts them for a few seconds.
      if (
        this.difficulty === "normal" &&
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

      if (e.hp > 0) survivors.push(e);
    }
    this.enemies = survivors;
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
          this.gold += income.amount;
          t.cooldown = income.interval;
          minted = true;
          this.burst(tx, ty - 8, "#e8c547", 8);
        }
        continue;
      }

      if (def.support) continue;

      const stats = this.effectiveStats(t);
      const rangePx = stats.range * CELL;

      // Continuous auras (archer damage / frost freeze)
      if (stats.auraDamage > 0 || stats.auraFreeze) {
        for (const e of this.enemies) {
          if (dist({ x: tx, y: ty }, e) > rangePx) continue;
          if (stats.auraDamage > 0) {
            this.damageEnemy(e, stats.auraDamage * dt);
          }
          if (stats.auraFreeze) {
            e.speed = e.baseSpeed * stats.slow;
            e.slowTimer = Math.max(e.slowTimer, stats.slowDuration);
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
        life: 1.2,
      });
      t.cooldown = 1 / stats.fireRate;
    }

    // Resolve aura kills
    const spawned: Enemy[] = [];
    let killed = false;
    this.enemies = this.enemies.filter((e) => {
      if (e.hp > 0) return true;
      killed = true;
      this.onEnemyDeath(e, spawned);
      return false;
    });
    if (spawned.length) this.enemies.push(...spawned);
    if (killed || minted) this.emitHud();
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
      this.damageEnemy(e, p.damage);
      if (p.slow > 0 && p.damage > 0) {
        e.speed = e.baseSpeed * p.slow;
        e.slowTimer = p.slowDuration;
      } else if (p.slow > 0 && p.damage === 0) {
        e.speed = e.baseSpeed * p.slow;
        e.slowTimer = p.slowDuration;
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

  /** HP loss resets the normal-mode regen clock. Slows alone do not. */
  private damageEnemy(e: Enemy, amount: number): void {
    if (amount <= 0 || e.hp <= 0) return;
    e.hp -= amount;
    e.sinceDamage = 0;
  }

  private onEnemyDeath(e: Enemy, spawned: Enemy[]): void {
    this.gold += e.reward;
    const burstColor =
      e.kind === "finalBoss"
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
      e.kind === "finalBoss" ? 28 : isBossKind(e.kind) ? 22 : 12,
    );

    if (e.kind !== "splitter") return;

    const child = splitlingFrom(e.maxHp, this.wave, this.difficulty);
    const offsets = [-0.08, 0.08];
    for (const off of offsets) {
      let pathIndex = e.pathIndex;
      let progress = Math.min(0.98, Math.max(0, e.progress + off));
      if (progress < 0 && pathIndex > 0) {
        pathIndex -= 1;
        progress = 0.9;
      }
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
    if (this.wave >= TOTAL_WAVES) {
      this.phase = "won";
    } else {
      this.phase = "ready";
    }
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
    this.drawFlyers(ctx);
    this.drawProjectiles(ctx);
    this.drawParticles(ctx);
    this.drawBaseMarkers(ctx);
  }

  private drawTerrain(ctx: CanvasRenderingContext2D): void {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const x = c * CELL;
        const y = r * CELL;
        const shade = (c + r) % 2 === 0 ? "#1e3a28" : "#1a3324";
        ctx.fillStyle = shade;
        ctx.fillRect(x, y, CELL, CELL);

        ctx.fillStyle = "rgba(94, 207, 138, 0.06)";
        ctx.fillRect(x + 8, y + 10, 3, 8);
        ctx.fillRect(x + 22, y + 28, 2, 6);
        ctx.fillRect(x + 34, y + 14, 3, 7);
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
        !this.towerOccupied.has(key);
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
    const valid =
      !this.pathSet.has(key) && !occupied && this.gold >= def.cost;

    if (occupied) {
      ctx.fillStyle = "rgba(232, 197, 71, 0.15)";
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
      return;
    }

    ctx.fillStyle = valid ? "rgba(94, 207, 138, 0.2)" : "rgba(232, 93, 74, 0.25)";
    ctx.fillRect(col * CELL, row * CELL, CELL, CELL);

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
    if (this.pathSet.has(key) || this.towerOccupied.has(key)) return;
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
      } else if (!def.economy && !def.flying && (selected || t.special || t.cooldown < 0.15)) {
        ctx.beginPath();
        ctx.arc(cx, cy, stats.range * CELL, 0, Math.PI * 2);
        if (t.special && t.kind === "frost") {
          ctx.fillStyle = "rgba(90, 158, 184, 0.08)";
          ctx.fill();
        } else if (t.special && t.kind === "archer") {
          ctx.fillStyle = "rgba(74, 155, 110, 0.06)";
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

      ctx.fillStyle = def.color;
      this.drawTowerGlyph(ctx, cx, cy, t.kind, t.special && t.kind === "mint");

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
      } else if (e.kind === "spawner") {
        ctx.fillStyle = "#e8efe6";
        ctx.font = "700 8px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SPAWN", e.x, e.y);
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
            : pct > 0.4
              ? "#5ecf8a"
              : "#e85d4a";
      ctx.fillRect(bx, by, barW * pct, barH);

      if (this.difficulty === "normal" && e.kind === "tank") {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 5, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(94, 207, 138, 0.85)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 2]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      if (this.difficulty === "normal" && e.kind === "tank" && e.hp < e.maxHp) {
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
