import {
  CELL,
  COLS,
  PATH,
  ROWS,
  START_GOLD,
  START_LIVES,
  TOTAL_WAVES,
  TOWER_DEFS,
  enemyForWave,
  spawnInterval,
  waveEnemyCount,
} from "./config";
import type {
  Enemy,
  Particle,
  Projectile,
  Tower,
  TowerKind,
  Vec2,
} from "./types";

export type GamePhase = "ready" | "playing" | "won" | "lost";

export interface HudSnapshot {
  gold: number;
  lives: number;
  wave: number;
  totalWaves: number;
  phase: GamePhase;
  selected: TowerKind | null;
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

  gold = START_GOLD;
  lives = START_LIVES;
  wave = 0;
  phase: GamePhase = "ready";
  selected: TowerKind | null = "archer";

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

  private emitHud(): void {
    this.onHudChange?.({
      gold: this.gold,
      lives: this.lives,
      wave: this.wave,
      totalWaves: TOTAL_WAVES,
      phase: this.phase,
      selected: this.selected,
      waveInProgress: this.waveInProgress,
      enemiesLeft: this.enemies.length + this.spawnQueue,
    });
  }

  selectTower(kind: TowerKind | null): void {
    this.selected = kind;
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
    this.towers.push({ col, row, kind: this.selected, cooldown: 0 });
    this.towerOccupied.add(key);
    this.burst(col * CELL + CELL / 2, row * CELL + CELL / 2, def.color, 8);
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
    this.spawnQueue = waveEnemyCount(this.wave);
    this.spawnTimer = 0.2;
    this.emitHud();
  }

  restart(): void {
    this.gold = START_GOLD;
    this.lives = START_LIVES;
    this.wave = 0;
    this.phase = "ready";
    this.selected = "archer";
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

  private spawnEnemies(dt: number): void {
    if (!this.waveInProgress || this.spawnQueue <= 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    const index = waveEnemyCount(this.wave) - this.spawnQueue;
    const def = enemyForWave(this.wave, index);
    const start = this.waypoints[0];
    this.enemies.push({
      id: this.nextEnemyId++,
      pathIndex: 0,
      progress: 0,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      baseSpeed: def.speed,
      reward: def.reward,
      radius: def.radius,
      color: def.color,
      slowTimer: 0,
      x: start.x,
      y: start.y,
    });
    this.spawnQueue -= 1;
    this.spawnTimer = spawnInterval(this.wave);
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
        this.lives -= 1;
        this.burst(e.x, e.y, "#e85d4a", 10);
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
        damage: def.damage,
        splash: (def.splash ?? 0) * CELL,
        slow: def.slow ?? 0,
        slowDuration: def.slowDuration ?? 0,
        color: def.color,
        targetId: best.id,
        life: 1.2,
      });
      t.cooldown = 1 / def.fireRate;
    }
  }

  private updateProjectiles(dt: number): void {
    const next: Projectile[] = [];
    for (const p of this.projectiles) {
      p.life -= dt;
      if (p.life <= 0) continue;

      // Homing lightly toward current target
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

      if (!hit && p.x > -20 && p.y > -20 && p.x < this.width + 20 && p.y < this.height + 20) {
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

    this.enemies = this.enemies.filter((e) => {
      if (e.hp > 0) return true;
      this.gold += e.reward;
      this.burst(e.x, e.y, "#e8c547", 12);
      return false;
    });
    this.emitHud();
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

        // subtle grass ticks
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

    // path edge dashes
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
    const valid =
      !this.pathSet.has(key) &&
      !this.towerOccupied.has(key) &&
      this.gold >= def.cost;

    const cx = col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;

    ctx.fillStyle = valid ? "rgba(94, 207, 138, 0.2)" : "rgba(232, 93, 74, 0.25)";
    ctx.fillRect(col * CELL, row * CELL, CELL, CELL);

    ctx.beginPath();
    ctx.arc(cx, cy, def.range * CELL, 0, Math.PI * 2);
    ctx.strokeStyle = valid ? "rgba(232, 197, 71, 0.45)" : "rgba(232, 93, 74, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = valid ? def.color : "#666";
    ctx.globalAlpha = 0.7;
    this.drawTowerGlyph(ctx, cx, cy, this.selected);
    ctx.globalAlpha = 1;
  }

  private drawTowers(ctx: CanvasRenderingContext2D): void {
    for (const t of this.towers) {
      const cx = t.col * CELL + CELL / 2;
      const cy = t.row * CELL + CELL / 2;
      const def = TOWER_DEFS[t.kind];

      // range hint when idle-ish
      if (t.cooldown < 0.15) {
        ctx.beginPath();
        ctx.arc(cx, cy, def.range * CELL, 0, Math.PI * 2);
        ctx.strokeStyle = "rgba(232, 197, 71, 0.08)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.fillStyle = "#152219";
      ctx.beginPath();
      ctx.arc(cx, cy, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = def.color;
      this.drawTowerGlyph(ctx, cx, cy, t.kind);
    }
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
      // frost crystal
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
      ctx.fillStyle = e.color;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
      ctx.fill();

      if (slowed) {
        ctx.strokeStyle = "#7ec8e0";
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.strokeStyle = "rgba(0,0,0,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // HP bar
      const barW = e.radius * 2.2;
      const barH = 4;
      const bx = e.x - barW / 2;
      const by = e.y - e.radius - 10;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx, by, barW, barH);
      const pct = Math.max(0, e.hp / e.maxHp);
      ctx.fillStyle = pct > 0.4 ? "#5ecf8a" : "#e85d4a";
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
