import {
  LAWN_LIVES,
  LAWN_WAVES,
  LCELL,
  LCOLS,
  LOFFX,
  LOFFY,
  LROWS,
  PLANTS,
  LAWN_PEACE,
  SUN_AMOUNT,
  SUN_INTERVAL,
  lawnSpawnInterval,
  lawnStartingSun,
  lawnWavePlan,
  lawnZombie,
  type PlantKind,
  type ZombieKind,
} from "./lawnConfig";
import type { Difficulty, Particle, Vec2 } from "./types";

export type LawnPhase = "ready" | "playing" | "won" | "lost";

interface Plant {
  col: number;
  row: number;
  kind: PlantKind;
  hp: number;
  maxHp: number;
  cooldown: number;
}

interface Zombie {
  id: number;
  kind: ZombieKind;
  row: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  eat: number;
  radius: number;
  color: string;
  x: number;
  y: number;
  slowTimer: number;
}

interface Pea {
  x: number;
  y: number;
  row: number;
  damage: number;
  slow: number;
  slowDuration: number;
  color: string;
}

export interface LawnHud {
  gold: number;
  lives: number;
  wave: number;
  totalWaves: number;
  phase: LawnPhase;
  difficulty: Difficulty;
  selected: PlantKind | null;
  selectedPlant: {
    name: string;
    kind: PlantKind;
    hp: number;
    maxHp: number;
  } | null;
  waveInProgress: boolean;
  digging: boolean;
  /** Seconds left in the opening with no zombies. */
  peaceLeft: number;
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class LawnGame {
  readonly width = 768;
  readonly height = 480;

  difficulty: Difficulty = "normal";
  sun = lawnStartingSun("normal");
  lives = LAWN_LIVES;
  wave = 0;
  phase: LawnPhase = "ready";
  selected: PlantKind | null = "sunbloom";
  selectedPlant: number | null = null;
  digging = false;

  private plants: Plant[] = [];
  private zombies: Zombie[] = [];
  private peas: Pea[] = [];
  private particles: Particle[] = [];
  private queue: ZombieKind[] = [];
  private spawnTimer = 0;
  private waveInProgress = false;
  private skyTimer = SUN_INTERVAL;
  peaceLeft = 0;
  private nextId = 1;
  private hover: { col: number; row: number } | null = null;

  onHudChange: ((hud: LawnHud) => void) | null = null;

  constructor() {
    this.emitHud();
  }

  private cellCenter(col: number, row: number): Vec2 {
    return {
      x: LOFFX + col * LCELL + LCELL / 2,
      y: LOFFY + row * LCELL + LCELL / 2,
    };
  }

  private emitHud(): void {
    const plant =
      this.selectedPlant !== null ? this.plants[this.selectedPlant] : null;
    this.onHudChange?.({
      gold: this.sun,
      lives: this.lives,
      wave: this.wave,
      totalWaves: LAWN_WAVES,
      phase: this.phase,
      difficulty: this.difficulty,
      selected: this.digging ? null : this.selected,
      selectedPlant: plant
        ? {
            name: PLANTS[plant.kind].name,
            kind: plant.kind,
            hp: Math.ceil(plant.hp),
            maxHp: plant.maxHp,
          }
        : null,
      waveInProgress: this.waveInProgress,
      digging: this.digging,
      peaceLeft: this.peaceLeft,
    });
  }

  beginRun(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.sun = lawnStartingSun(difficulty);
    this.lives = LAWN_LIVES;
    this.wave = 0;
    this.phase = "ready";
    this.selected = "sunbloom";
    this.selectedPlant = null;
    this.digging = false;
    this.plants = [];
    this.zombies = [];
    this.peas = [];
    this.particles = [];
    this.queue = [];
    this.spawnTimer = 0;
    this.waveInProgress = false;
    this.skyTimer = SUN_INTERVAL;
    this.peaceLeft = LAWN_PEACE;
    this.nextId = 1;
    this.emitHud();
  }

  selectPlant(kind: PlantKind): void {
    this.selected = kind;
    this.digging = false;
    this.selectedPlant = null;
    this.emitHud();
  }

  selectDig(): void {
    this.digging = !this.digging;
    if (this.digging) this.selected = null;
    this.emitHud();
  }

  clearSelection(): void {
    this.selected = null;
    this.digging = false;
    this.selectedPlant = null;
    this.emitHud();
  }

  digSelected(): boolean {
    if (this.selectedPlant === null) return false;
    return this.removePlant(this.selectedPlant);
  }

  screenToCell(sx: number, sy: number, canvas: HTMLCanvasElement): {
    col: number;
    row: number;
  } {
    const rect = canvas.getBoundingClientRect();
    const x = ((sx - rect.left) / rect.width) * this.width;
    const y = ((sy - rect.top) / rect.height) * this.height;
    return {
      col: Math.floor((x - LOFFX) / LCELL),
      row: Math.floor((y - LOFFY) / LCELL),
    };
  }

  setHover(col: number, row: number | null): void {
    if (row === null || col < 0) {
      this.hover = null;
      return;
    }
    this.hover = { col, row };
  }

  handleClick(col: number, row: number): void {
    if (this.phase === "won" || this.phase === "lost") return;
    if (col < 0 || row < 0 || col >= LCOLS || row >= LROWS) {
      this.selectedPlant = null;
      this.emitHud();
      return;
    }
    const index = this.plants.findIndex((p) => p.col === col && p.row === row);
    if (this.digging) {
      if (index >= 0) this.removePlant(index);
      return;
    }
    if (index >= 0) {
      this.selectedPlant = index;
      this.emitHud();
      return;
    }
    this.tryPlant(col, row);
  }

  private tryPlant(col: number, row: number): boolean {
    if (!this.selected) return false;
    const def = PLANTS[this.selected];
    if (this.sun < def.cost) return false;
    if (this.plants.some((p) => p.col === col && p.row === row)) return false;
    this.sun -= def.cost;
    this.plants.push({
      col,
      row,
      kind: def.kind,
      hp: def.hp,
      maxHp: def.hp,
      cooldown: def.role === "producer" ? SUN_INTERVAL : 0.2,
    });
    const c = this.cellCenter(col, row);
    this.burst(c.x, c.y, def.color, 8);
    this.selectedPlant = this.plants.length - 1;
    this.emitHud();
    return true;
  }

  private removePlant(index: number): boolean {
    const plant = this.plants[index];
    if (!plant) return false;
    const c = this.cellCenter(plant.col, plant.row);
    this.burst(c.x, c.y, "#e8efe6", 6);
    this.plants.splice(index, 1);
    this.selectedPlant = null;
    this.emitHud();
    return true;
  }

  startWave(): void {
    if (this.phase === "won" || this.phase === "lost") return;
    if (this.waveInProgress) return;
    if (this.wave >= LAWN_WAVES) return;
    if (this.peaceLeft > 0) return;
    this.wave += 1;
    this.phase = "playing";
    this.waveInProgress = true;
    this.queue = lawnWavePlan(this.wave, this.difficulty);
    this.spawnTimer = 0.4;
    this.emitHud();
  }

  update(dt: number): void {
    if (this.phase === "won" || this.phase === "lost") {
      this.updateParticles(dt);
      return;
    }
    this.tickPeace(dt);
    this.tickSun(dt);
    this.spawn(dt);
    this.updateZombies(dt);
    this.updatePlants(dt);
    this.updatePeas(dt);
    this.updateParticles(dt);
    this.checkWave();
  }

  private tickPeace(dt: number): void {
    if (this.peaceLeft <= 0) return;
    const before = Math.ceil(this.peaceLeft);
    this.peaceLeft = Math.max(0, this.peaceLeft - dt);
    if (Math.ceil(this.peaceLeft) !== before) this.emitHud();
  }

  private tickSun(dt: number): void {
    this.skyTimer -= dt;
    if (this.skyTimer > 0) return;
    this.skyTimer = SUN_INTERVAL;
    this.sun += SUN_AMOUNT;
    this.burst(this.width - 36, 28, "#e8c547", 8);
    this.emitHud();
  }

  private spawn(dt: number): void {
    if (this.peaceLeft > 0) return;
    if (!this.waveInProgress || this.queue.length === 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;
    const kind = this.queue.shift()!;
    const def = lawnZombie(kind, this.difficulty);
    const row = Math.floor(Math.random() * LROWS);
    const spot = this.cellCenter(LCOLS - 1, row);
    this.zombies.push({
      id: this.nextId++,
      kind,
      row,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      baseSpeed: def.speed,
      eat: def.eat,
      radius: def.radius,
      color: def.color,
      x: LOFFX + LCOLS * LCELL + 18,
      y: spot.y,
      slowTimer: 0,
    });
    this.spawnTimer = lawnSpawnInterval(this.wave, this.difficulty);
  }

  /** The plant a zombie is currently chewing, if it has reached one. */
  private meal(z: Zombie): Plant | null {
    let best: Plant | null = null;
    for (const plant of this.plants) {
      if (plant.row !== z.row || plant.hp <= 0) continue;
      const px = this.cellCenter(plant.col, plant.row).x;
      if (z.x + 8 < px) continue;
      if (z.x - px > 40) continue;
      if (!best || plant.col > best.col) best = plant;
    }
    return best;
  }

  private updateZombies(dt: number): void {
    const next: Zombie[] = [];
    for (const z of this.zombies) {
      if (z.slowTimer > 0) {
        z.slowTimer -= dt;
        if (z.slowTimer <= 0) z.speed = z.baseSpeed;
      }
      const meal = this.meal(z);
      if (meal) {
        meal.hp -= z.eat * dt;
        if (meal.hp <= 0) {
          const index = this.plants.indexOf(meal);
          if (index >= 0) this.removePlant(index);
        }
      } else {
        z.x -= z.speed * dt;
      }
      if (z.x < LOFFX - 8) {
        this.lives -= 1;
        this.burst(LOFFX, z.y, "#e85d4a", 10);
        if (this.lives <= 0) {
          this.lives = 0;
          this.phase = "lost";
        }
        this.emitHud();
        continue;
      }
      if (z.hp > 0) next.push(z);
    }
    this.zombies = next;
  }

  private updatePlants(dt: number): void {
    for (const plant of this.plants) {
      const def = PLANTS[plant.kind];
      const origin = this.cellCenter(plant.col, plant.row);
      if (def.role === "producer") {
        plant.cooldown -= dt;
        if (plant.cooldown <= 0) {
          plant.cooldown = SUN_INTERVAL;
          this.sun += SUN_AMOUNT;
          this.burst(origin.x, origin.y - 16, "#e8c547", 8);
          this.emitHud();
        }
        continue;
      }
      if (def.role === "mine") {
        const victims = this.zombies.filter(
          (z) =>
            Math.abs(z.row - plant.row) <= 1 &&
            dist(origin, z) <= def.splash,
        );
        if (!victims.length) continue;
        for (const z of victims) z.hp -= def.damage;
        this.burst(origin.x, origin.y, def.color, 16);
        plant.hp = 0;
        continue;
      }
      if (def.role !== "shooter") continue;
      plant.cooldown -= dt;
      if (plant.cooldown > 0) continue;
      const target = this.zombies
        .filter((z) => z.row === plant.row && z.hp > 0 && z.x > origin.x)
        .sort((a, b) => a.x - b.x)[0];
      if (!target) continue;
      this.peas.push({
        x: origin.x + 12,
        y: origin.y,
        row: plant.row,
        damage: def.damage,
        slow: def.slow,
        slowDuration: def.slowDuration,
        color: def.color,
      });
      plant.cooldown = 1 / def.fireRate;
    }
    if (this.plants.some((p) => p.hp <= 0)) {
      this.plants = this.plants.filter((p) => p.hp > 0);
      this.selectedPlant = null;
      this.emitHud();
    }
  }

  private updatePeas(dt: number): void {
    const next: Pea[] = [];
    for (const pea of this.peas) {
      pea.x += 280 * dt;
      if (pea.x > this.width + 8) continue;
      const hit = this.zombies.find(
        (z) => z.row === pea.row && z.hp > 0 && Math.abs(z.x - pea.x) < z.radius + 4 && z.x >= pea.x - 20,
      );
      if (!hit) {
        next.push(pea);
        continue;
      }
      hit.hp -= pea.damage;
      if (pea.slow > 0) {
        hit.speed = hit.baseSpeed * pea.slow;
        hit.slowTimer = pea.slowDuration;
      }
      this.burst(hit.x, hit.y, pea.color, 4);
    }
    this.peas = next;
    this.zombies = this.zombies.filter((z) => z.hp > 0);
  }

  private checkWave(): void {
    if (!this.waveInProgress) return;
    if (this.queue.length > 0 || this.zombies.length > 0) return;
    this.waveInProgress = false;
    if (this.lives <= 0) {
      this.phase = "lost";
    } else if (this.wave >= LAWN_WAVES) {
      this.phase = "won";
    } else {
      this.phase = "ready";
    }
    this.emitHud();
  }

  private burst(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 30 + Math.random() * 50;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 20,
        life: 0.4 + Math.random() * 0.2,
        maxLife: 0.55,
        color,
        size: 2 + Math.random() * 2.5,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawLawn(ctx);
    this.drawPeace(ctx);
    this.drawPlants(ctx);
    this.drawZombies(ctx);
    this.drawPeas(ctx);
    this.drawHover(ctx);
    this.drawParticles(ctx);
  }

  private drawLawn(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "#142016";
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.fillStyle = "#3d3428";
    ctx.fillRect(0, LOFFY, LOFFX, LROWS * LCELL);
    ctx.fillStyle = "#e8efe6";
    ctx.font = "700 11px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("HOME", LOFFX / 2, LOFFY + (LROWS * LCELL) / 2);

    for (let row = 0; row < LROWS; row++) {
      for (let col = 0; col < LCOLS; col++) {
        ctx.fillStyle = (col + row) % 2 === 0 ? "#2a6b34" : "#245c2d";
        ctx.fillRect(LOFFX + col * LCELL, LOFFY + row * LCELL, LCELL, LCELL);
      }
    }
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.strokeRect(LOFFX, LOFFY, LCOLS * LCELL, LROWS * LCELL);
  }

  private drawPeace(ctx: CanvasRenderingContext2D): void {
    if (this.peaceLeft <= 0) return;
    ctx.fillStyle = "rgba(8, 14, 10, 0.72)";
    ctx.fillRect(this.width / 2 - 132, 18, 264, 32);
    ctx.fillStyle = "#e8c547";
    ctx.font = "700 15px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`No zombies · ${Math.ceil(this.peaceLeft)}s`, this.width / 2, 34);
  }

  private drawPlants(ctx: CanvasRenderingContext2D): void {
    this.plants.forEach((plant, index) => {
      const c = this.cellCenter(plant.col, plant.row);
      const def = PLANTS[plant.kind];
      const selected = this.selectedPlant === index;
      ctx.fillStyle = "#152219";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = selected ? "#e8c547" : def.color;
      ctx.lineWidth = selected ? 3 : 2;
      ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.save();
      ctx.translate(c.x, c.y);
      if (plant.kind === "sunbloom") {
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          ctx.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
          ctx.lineTo(Math.cos(a + 0.3) * 5, Math.sin(a + 0.3) * 5);
        }
        ctx.closePath();
        ctx.fill();
      } else if (plant.kind === "spitter" || plant.kind === "chiller") {
        ctx.beginPath();
        ctx.arc(-2, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(2, -3, 12, 6);
      } else if (plant.kind === "bulwark") {
        ctx.fillRect(-12, -14, 24, 28);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#1a1508";
        ctx.font = "700 11px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("!", 0, 1);
      }
      ctx.restore();
      const pct = Math.max(0, plant.hp / plant.maxHp);
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(c.x - 16, c.y + 22, 32, 4);
      ctx.fillStyle = pct > 0.4 ? "#5ecf8a" : "#e85d4a";
      ctx.fillRect(c.x - 16, c.y + 22, 32 * pct, 4);
    });
  }

  private drawZombies(ctx: CanvasRenderingContext2D): void {
    for (const z of this.zombies) {
      ctx.fillStyle = z.color;
      ctx.beginPath();
      ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
      ctx.fill();
      if (z.kind === "cone") {
        ctx.beginPath();
        ctx.moveTo(z.x - 8, z.y - z.radius + 4);
        ctx.lineTo(z.x, z.y - z.radius - 10);
        ctx.lineTo(z.x + 8, z.y - z.radius + 4);
        ctx.closePath();
        ctx.fill();
      }
      if (z.slowTimer > 0) {
        ctx.strokeStyle = "#7ec8e0";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      const pct = Math.max(0, z.hp / z.maxHp);
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(z.x - 16, z.y - z.radius - 10, 32, 4);
      ctx.fillStyle = pct > 0.4 ? "#c45c4a" : "#e8c547";
      ctx.fillRect(z.x - 16, z.y - z.radius - 10, 32 * pct, 4);
      if (z.kind === "brute") {
        ctx.fillStyle = "#e8c547";
        ctx.font = "700 9px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("BRUTE", z.x, z.y);
      }
    }
  }

  private drawPeas(ctx: CanvasRenderingContext2D): void {
    for (const pea of this.peas) {
      ctx.fillStyle = pea.color;
      ctx.beginPath();
      ctx.arc(pea.x, pea.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawHover(ctx: CanvasRenderingContext2D): void {
    if (!this.hover) return;
    if (this.phase === "won" || this.phase === "lost") return;
    const { col, row } = this.hover;
    if (col < 0 || row < 0 || col >= LCOLS || row >= LROWS) return;
    const occupied = this.plants.some((p) => p.col === col && p.row === row);
    const def = this.selected ? PLANTS[this.selected] : null;
    const valid = !this.digging && !!def && !occupied && this.sun >= def.cost;
    ctx.fillStyle = this.digging
      ? occupied
        ? "rgba(232, 93, 74, 0.28)"
        : "rgba(232, 93, 74, 0.12)"
      : valid
        ? "rgba(94, 207, 138, 0.28)"
        : "rgba(232, 93, 74, 0.22)";
    ctx.fillRect(LOFFX + col * LCELL, LOFFY + row * LCELL, LCELL, LCELL);
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
