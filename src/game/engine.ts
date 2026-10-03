import {
  CELL,
  COLS,
  PATH,
  ROWS,
  TOTAL_WAVES,
  TOWER_DEFS,
  MAX_UPGRADE,
  damageMultiplier,
  enemyForWave,
  fireRateMultiplier,
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
  Particle,
  Projectile,
  Tower,
  TowerKind,
  Vec2,
} from "./types";

export type GamePhase = "ready" | "playing" | "won" | "lost";
export type UpgradeStat = "damage" | "speed";

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
}

function pathKey(col: number, row: number): string {
  return `${col},${row}`;
}

function dist(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
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
    const dCost =
      t.damageLevel < MAX_UPGRADE
        ? upgradeCost(def.cost, t.damageLevel)
        : null;
    const sCost =
      t.speedLevel < MAX_UPGRADE ? upgradeCost(def.cost, t.speedLevel) : null;
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
      damage: Math.round(def.damage * damageMultiplier(t.damageLevel)),
      fireRate:
        Math.round(def.fireRate * fireRateMultiplier(t.speedLevel) * 100) /
        100,
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
    });
  }

  setDifficulty(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.emitHud();
  }

  selectTower(kind: TowerKind | null): void {
    this.selected = kind;
    if (kind !== null) this.selectedTowerIndex = null;
    this.emitHud();
  }

  clearSelection(): void {
    this.selected = null;
    this.selectedTowerIndex = null;
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

  /** Click a cell: upgrade-select existing tower, or place a new one. */
  handleClick(col: number, row: number): boolean {
    if (this.phase === "won" || this.phase === "lost") return false;
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;

    const existing = this.towers.findIndex((t) => t.col === col && t.row === row);
    if (existing >= 0) {
      this.selected = null;
      this.selectedTowerIndex = existing;
      this.emitHud();
      return true;
    }

    return this.tryPlace(col, row);
  }

  tryPlace(col: number, row: number): boolean {
    if (this.phase === "won" || this.phase === "lost") return false;
    if (!this.selected) return false;
    if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;

    const key = pathKey(col, row);
    if (this.pathSet.has(key)) return false;
    if (this.towerOccupied.has(key)) return false;

    const def = TOWER_DEFS[this.selected];
    if (this.gold < def.cost) return false;

    this.gold -= def.cost;
    this.towers.push({
      col,
      row,
      kind: this.selected,
      cooldown: 0,
      damageLevel: 0,
      speedLevel: 0,
    });
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
    const level = stat === "damage" ? t.damageLevel : t.speedLevel;
    if (level >= MAX_UPGRADE) return false;

    const cost = upgradeCost(def.cost, level);
    if (this.gold < cost) return false;

    this.gold -= cost;
    if (stat === "damage") t.damageLevel += 1;
    else t.speedLevel += 1;

    const cx = t.col * CELL + CELL / 2;
    const cy = t.row * CELL + CELL / 2;
    this.burst(cx, cy, def.color, 10);
    this.emitHud();
    return true;
  }

  startWave(): void {
    if (this.phase === "won" || this.phase === "lost") return;
    if (this.waveInProgress) return;
    if (this.wave >= TOTAL_WAVES) return;

    this.wave += 1;
    this.phase = "playing";
    this.waveInProgress = true;
    this.spawnQueue = waveEnemyCount(this.wave, this.difficulty);
    this.spawnTimer = 0.2;
    this.emitHud();
  }

  restart(difficulty: Difficulty = this.difficulty): void {
    this.difficulty = difficulty;
    this.gold = startingGold(difficulty);
    this.lives = startingLives(difficulty);
    this.wave = 0;
    this.phase = "ready";
    this.selected = "archer";
    this.selectedTowerIndex = null;
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
    };
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
    // Bosses take longer between prior spawn and themselves
    this.spawnTimer = def.kind === "boss" ? interval + 0.8 : interval;
    this.emitHud();
  }

  private updateEnemies(dt: number): void {
    const survivors: Enemy[] = [];
    for (const e of this.enemies) {
      if (e.slowTimer > 0) {
        e.slowTimer -= dt;
        if (e.slowTimer <= 0) e.speed = e.baseSpeed;
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
        this.burst(e.x, e.y, e.kind === "boss" ? "#6b2d8a" : "#e85d4a", 10);
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

  private updateTowers(dt: number): void {
    for (const t of this.towers) {
      t.cooldown = Math.max(0, t.cooldown - dt);
      if (t.cooldown > 0) continue;

      const def = TOWER_DEFS[t.kind];
      const dmg = def.damage * damageMultiplier(t.damageLevel);
      const rate = def.fireRate * fireRateMultiplier(t.speedLevel);
      const tx = t.col * CELL + CELL / 2;
      const ty = t.row * CELL + CELL / 2;
      const rangePx = def.range * CELL;

      let best: Enemy | null = null;
      let bestDist = Infinity;
      for (const e of this.enemies) {
        const d = dist({ x: tx, y: ty }, e);
        if (d <= rangePx && d < bestDist) {
          best = e;
          bestDist = d;
        }
      }
      if (!best) continue;

      const angle = Math.atan2(best.y - ty, best.x - tx);
      this.projectiles.push({
        x: tx,
        y: ty,
        vx: Math.cos(angle) * def.projectileSpeed,
        vy: Math.sin(angle) * def.projectileSpeed,
        damage: dmg,
        splash: (def.splash ?? 0) * CELL,
        slow: def.slow ?? 0,
        slowDuration: def.slowDuration ?? 0,
        color: def.color,
        targetId: best.id,
        life: 1.2,
      });
      t.cooldown = 1 / rate;
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
      e.hp -= p.damage;
      if (p.slow > 0) {
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

  private onEnemyDeath(e: Enemy, spawned: Enemy[]): void {
    this.gold += e.reward;
    this.burst(
      e.x,
      e.y,
      e.kind === "boss" ? "#e8c547" : e.kind === "splitter" ? "#c978c0" : "#e8c547",
      e.kind === "boss" ? 22 : 12,
    );

    if (e.kind !== "splitter") return;

    const child = splitlingFrom(e.maxHp, this.wave, this.difficulty);
    // Slight path offsets so the two don't stack perfectly
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
    this.drawEnemies(ctx);
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
    if (!this.hover || !this.selected) return;
    if (this.phase === "won" || this.phase === "lost") return;

    const { col, row } = this.hover;
    const key = pathKey(col, row);
    const def = TOWER_DEFS[this.selected];
    const occupied = this.towerOccupied.has(key);
    const valid =
      !this.pathSet.has(key) && !occupied && this.gold >= def.cost;

    const cx = col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;

    if (occupied) {
      ctx.fillStyle = "rgba(232, 197, 71, 0.15)";
      ctx.fillRect(col * CELL, row * CELL, CELL, CELL);
      return;
    }

    ctx.fillStyle = valid ? "rgba(94, 207, 138, 0.2)" : "rgba(232, 93, 74, 0.25)";
    ctx.fillRect(col * CELL, row * CELL, CELL, CELL);

    ctx.beginPath();
    ctx.arc(cx, cy, def.range * CELL, 0, Math.PI * 2);
    ctx.strokeStyle = valid
      ? "rgba(232, 197, 71, 0.45)"
      : "rgba(232, 93, 74, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = valid ? def.color : "#666";
    ctx.globalAlpha = 0.7;
    this.drawTowerGlyph(ctx, cx, cy, this.selected);
    ctx.globalAlpha = 1;
  }

  private drawTowers(ctx: CanvasRenderingContext2D): void {
    this.towers.forEach((t, i) => {
      const cx = t.col * CELL + CELL / 2;
      const cy = t.row * CELL + CELL / 2;
      const def = TOWER_DEFS[t.kind];
      const selected = this.selectedTowerIndex === i;

      if (selected || t.cooldown < 0.15) {
        ctx.beginPath();
        ctx.arc(cx, cy, def.range * CELL, 0, Math.PI * 2);
        ctx.strokeStyle = selected
          ? "rgba(232, 197, 71, 0.4)"
          : "rgba(232, 197, 71, 0.08)";
        ctx.lineWidth = selected ? 2 : 1;
        ctx.stroke();
      }

      const size = 16 + (t.damageLevel + t.speedLevel) * 1.5;
      ctx.fillStyle = "#152219";
      ctx.beginPath();
      ctx.arc(cx, cy, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = selected ? "#e8c547" : def.color;
      ctx.lineWidth = selected ? 3 : 2.5;
      ctx.stroke();

      ctx.fillStyle = def.color;
      this.drawTowerGlyph(ctx, cx, cy, t.kind);

      // Upgrade pips under tower
      const total = t.damageLevel + t.speedLevel;
      if (total > 0) {
        ctx.fillStyle = "#e8c547";
        ctx.font = "600 10px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`+${total}`, cx, cy + size + 2);
      }
    });
  }

  private drawTowerGlyph(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    kind: TowerKind,
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

  private drawEnemies(ctx: CanvasRenderingContext2D): void {
    for (const e of this.enemies) {
      const slowed = e.slowTimer > 0;

      if (e.kind === "boss") {
        ctx.fillStyle = "rgba(107, 45, 138, 0.25)";
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (e.kind === "splitter") {
        // Outer ring hint that it will split
        ctx.strokeStyle = "rgba(201, 120, 192, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius + 3, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = e.color;
      ctx.beginPath();
      if (e.kind === "boss") {
        // Squarish boss silhouette
        const r = e.radius;
        ctx.moveTo(e.x, e.y - r);
        ctx.lineTo(e.x + r * 0.85, e.y - r * 0.2);
        ctx.lineTo(e.x + r * 0.7, e.y + r * 0.75);
        ctx.lineTo(e.x - r * 0.7, e.y + r * 0.75);
        ctx.lineTo(e.x - r * 0.85, e.y - r * 0.2);
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

      if (e.kind === "boss") {
        ctx.fillStyle = "#e8c547";
        ctx.font = "700 10px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("BOSS", e.x, e.y);
      }

      const barW = e.kind === "boss" ? e.radius * 2.8 : e.radius * 2.2;
      const barH = e.kind === "boss" ? 6 : 4;
      const bx = e.x - barW / 2;
      const by = e.y - e.radius - (e.kind === "boss" ? 14 : 10);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx, by, barW, barH);
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle =
        e.kind === "boss"
          ? "#c47ae0"
          : pct > 0.4
            ? "#5ecf8a"
            : "#e85d4a";
      ctx.fillRect(bx, by, barW * pct, barH);
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
