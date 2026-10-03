import {
  DCELL,
  DCOLS,
  DROWS,
  DUNGEON_BUILDS,
  DUNGEON_WAVES,
  ZIGZAG_PATH,
  adventurerForWave,
  dungeonSellValue,
  dungeonSpawnInterval,
  dungeonStartingGold,
  dungeonStartingLives,
  dungeonUpgradeCost,
  dungeonWaveCount,
  type AdventurerKind,
  type DungeonBuildKind,
} from "./dungeonConfig";
import type { Difficulty, Particle, Vec2 } from "./types";

export type DungeonPhase = "ready" | "playing" | "won" | "lost";

export interface RoadUnit {
  col: number;
  row: number;
  pathIndex: number;
  kind: DungeonBuildKind;
  cooldown: number;
  damageLevel: number;
  hp: number;
  maxHp: number;
  invested: number;
}

export interface Adventurer {
  id: number;
  kind: AdventurerKind;
  name: string;
  pathIndex: number;
  progress: number;
  hp: number;
  maxHp: number;
  speed: number;
  baseSpeed: number;
  damage: number;
  reward: number;
  radius: number;
  color: string;
  leakDamage: number;
  slowTimer: number;
  fightCooldown: number;
  /** Path indices of traps already triggered this life (optional reuse via cooldown instead) */
  x: number;
  y: number;
  fightingUnitId: number | null;
}

export interface DungeonHud {
  gold: number;
  lives: number;
  wave: number;
  totalWaves: number;
  phase: DungeonPhase;
  difficulty: Difficulty;
  selected: DungeonBuildKind | null;
  selectedUnit: {
    index: number;
    kind: DungeonBuildKind;
    name: string;
    role: "trap" | "monster";
    damageLevel: number;
    upgradeCost: number | null;
    canAffordUpgrade: boolean;
    hp: number;
    maxHp: number;
    sellRefund: number;
  } | null;
  waveInProgress: boolean;
  shovelReady: boolean;
  enemiesLeft: number;
}

function pathKey(col: number, row: number): string {
  return `${col},${row}`;
}

function dist(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class DungeonGame {
  readonly width = DCOLS * DCELL;
  readonly height = DROWS * DCELL;

  private pathSet = new Set(ZIGZAG_PATH.map((p) => pathKey(p.col, p.row)));
  private pathIndexAt = new Map(
    ZIGZAG_PATH.map((p, i) => [pathKey(p.col, p.row), i]),
  );
  private waypoints: Vec2[] = ZIGZAG_PATH.map((p) => ({
    x: p.col * DCELL + DCELL / 2,
    y: p.row * DCELL + DCELL / 2,
  }));

  difficulty: Difficulty = "normal";
  gold = dungeonStartingGold("normal");
  lives = dungeonStartingLives("normal");
  wave = 0;
  phase: DungeonPhase = "ready";
  selected: DungeonBuildKind | null = "spikes";
  selectedUnitIndex: number | null = null;
  shovelReady = true;

  units: RoadUnit[] = [];
  adventurers: Adventurer[] = [];
  particles: Particle[] = [];

  private occupied = new Set<string>();
  private nextId = 1;
  private spawnQueue = 0;
  private spawnTimer = 0;
  private waveInProgress = false;
  private hover: { col: number; row: number } | null = null;
  private pulse = 0;
  private unitSeq = 1;
  private unitIds = new WeakMap<RoadUnit, number>();

  onHudChange: ((hud: DungeonHud) => void) | null = null;

  constructor() {
    this.emitHud();
  }

  private unitId(u: RoadUnit): number {
    let id = this.unitIds.get(u);
    if (id === undefined) {
      id = this.unitSeq++;
      this.unitIds.set(u, id);
    }
    return id;
  }

  private emitHud(): void {
    let selectedUnit: DungeonHud["selectedUnit"] = null;
    if (this.selectedUnitIndex !== null) {
      const u = this.units[this.selectedUnitIndex];
      if (u) {
        const def = DUNGEON_BUILDS[u.kind];
        const upCost =
          u.damageLevel < 3
            ? dungeonUpgradeCost(def.cost, u.damageLevel)
            : null;
        selectedUnit = {
          index: this.selectedUnitIndex,
          kind: u.kind,
          name: def.name,
          role: def.role,
          damageLevel: u.damageLevel,
          upgradeCost: upCost,
          canAffordUpgrade: upCost !== null && this.gold >= upCost,
          hp: Math.round(u.hp),
          maxHp: u.maxHp,
          sellRefund: dungeonSellValue(u.invested),
        };
      }
    }

    this.onHudChange?.({
      gold: this.gold,
      lives: this.lives,
      wave: this.wave,
      totalWaves: DUNGEON_WAVES,
      phase: this.phase,
      difficulty: this.difficulty,
      selected: this.selected,
      selectedUnit,
      waveInProgress: this.waveInProgress,
      shovelReady: this.shovelReady,
      enemiesLeft: this.adventurers.length + this.spawnQueue,
    });
  }

  beginRun(difficulty: Difficulty): void {
    this.difficulty = difficulty;
    this.gold = dungeonStartingGold(difficulty);
    this.lives = dungeonStartingLives(difficulty);
    this.wave = 0;
    this.phase = "ready";
    this.selected = "spikes";
    this.selectedUnitIndex = null;
    this.shovelReady = true;
    this.units = [];
    this.adventurers = [];
    this.particles = [];
    this.occupied.clear();
    this.nextId = 1;
    this.spawnQueue = 0;
    this.spawnTimer = 0;
    this.waveInProgress = false;
    this.emitHud();
  }

  selectBuild(kind: DungeonBuildKind | null): void {
    this.selected = kind;
    if (kind) this.selectedUnitIndex = null;
    this.emitHud();
  }

  clearSelection(): void {
    this.selected = null;
    this.selectedUnitIndex = null;
    this.emitHud();
  }

  setHover(col: number, row: number | null): void {
    if (row === null || col < 0 || row < 0 || col >= DCOLS || row >= DROWS) {
      this.hover = null;
      return;
    }
    this.hover = { col, row };
  }

  screenToCell(sx: number, sy: number, canvas: HTMLCanvasElement): {
    col: number;
    row: number;
  } {
    const rect = canvas.getBoundingClientRect();
    const x = ((sx - rect.left) / rect.width) * this.width;
    const y = ((sy - rect.top) / rect.height) * this.height;
    return { col: Math.floor(x / DCELL), row: Math.floor(y / DCELL) };
  }

  handleClick(col: number, row: number): boolean {
    if (this.phase === "won" || this.phase === "lost") return false;
    const existing = this.units.findIndex((u) => u.col === col && u.row === row);
    if (existing >= 0) {
      this.selected = null;
      this.selectedUnitIndex = existing;
      this.emitHud();
      return true;
    }
    return this.tryPlace(col, row);
  }

  tryPlace(col: number, row: number): boolean {
    if (!this.selected) return false;
    const key = pathKey(col, row);
    if (!this.pathSet.has(key)) return false;
    if (this.occupied.has(key)) return false;

    const def = DUNGEON_BUILDS[this.selected];
    if (this.gold < def.cost) return false;

    const pathIndex = this.pathIndexAt.get(key) ?? 0;
    this.gold -= def.cost;
    const unit: RoadUnit = {
      col,
      row,
      pathIndex,
      kind: this.selected,
      cooldown: 0,
      damageLevel: 0,
      hp: def.hp ?? 1,
      maxHp: def.hp ?? 1,
      invested: def.cost,
    };
    this.units.push(unit);
    this.unitId(unit);
    this.occupied.add(key);
    this.selectedUnitIndex = this.units.length - 1;
    this.burst(col * DCELL + DCELL / 2, row * DCELL + DCELL / 2, def.color, 8);
    this.emitHud();
    return true;
  }

  upgradeSelected(): boolean {
    if (this.selectedUnitIndex === null) return false;
    const u = this.units[this.selectedUnitIndex];
    if (!u || u.damageLevel >= 3) return false;
    const def = DUNGEON_BUILDS[u.kind];
    const cost = dungeonUpgradeCost(def.cost, u.damageLevel);
    if (this.gold < cost) return false;
    this.gold -= cost;
    u.invested += cost;
    u.damageLevel += 1;
    if (def.role === "monster") {
      const bonus = Math.round(def.hp! * 0.35);
      u.maxHp += bonus;
      u.hp += bonus;
    }
    this.burst(
      u.col * DCELL + DCELL / 2,
      u.row * DCELL + DCELL / 2,
      def.color,
      10,
    );
    this.emitHud();
    return true;
  }

  sellSelected(): boolean {
    if (!this.shovelReady || this.selectedUnitIndex === null) return false;
    const u = this.units[this.selectedUnitIndex];
    if (!u) return false;
    this.gold += dungeonSellValue(u.invested);
    this.occupied.delete(pathKey(u.col, u.row));
    this.burst(
      u.col * DCELL + DCELL / 2,
      u.row * DCELL + DCELL / 2,
      "#e8c547",
      10,
    );
    this.units.splice(this.selectedUnitIndex, 1);
    this.selectedUnitIndex = null;
    this.shovelReady = false;
    this.emitHud();
    return true;
  }

  startWave(): void {
    if (this.phase === "won" || this.phase === "lost") return;
    if (this.waveInProgress) return;
    if (this.wave >= DUNGEON_WAVES) return;
    this.wave += 1;
    this.phase = "playing";
    this.waveInProgress = true;
    this.spawnQueue = dungeonWaveCount(this.wave, this.difficulty);
    this.spawnTimer = 0.25;
    this.emitHud();
  }

  update(dt: number): void {
    if (this.phase === "won" || this.phase === "lost") {
      this.updateParticles(dt);
      return;
    }
    this.pulse += dt;
    this.spawnAdventurers(dt);
    this.updateAdventurers(dt);
    this.updateTraps(dt);
    this.updateCombat(dt);
    this.updateParticles(dt);
    this.checkWaveEnd();
  }

  private spawnAdventurers(dt: number): void {
    if (!this.waveInProgress || this.spawnQueue <= 0) return;
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0) return;

    const index =
      dungeonWaveCount(this.wave, this.difficulty) - this.spawnQueue;
    const def = adventurerForWave(this.wave, index, this.difficulty);
    const start = this.waypoints[0];
    this.adventurers.push({
      id: this.nextId++,
      kind: def.kind,
      name: def.name,
      pathIndex: 0,
      progress: 0,
      hp: def.hp,
      maxHp: def.hp,
      speed: def.speed,
      baseSpeed: def.speed,
      damage: def.damage,
      reward: def.reward,
      radius: def.radius,
      color: def.color,
      leakDamage: def.leakDamage,
      slowTimer: 0,
      fightCooldown: 0,
      x: start.x,
      y: start.y,
      fightingUnitId: null,
    });
    this.spawnQueue -= 1;
    this.spawnTimer = dungeonSpawnInterval(this.wave, this.difficulty);
    this.emitHud();
  }

  private monsterAtPathIndex(pathIndex: number): RoadUnit | null {
    for (const u of this.units) {
      if (DUNGEON_BUILDS[u.kind].role !== "monster") continue;
      if (u.hp <= 0) continue;
      if (u.pathIndex === pathIndex) return u;
    }
    return null;
  }

  /**
   * Goblin on the next path tile. It faces incoming adventurers and
   * strikes one tile ahead of itself, so this is the tile it threatens.
   */
  private goblinReachingTile(pathIndex: number): RoadUnit | null {
    for (const u of this.units) {
      if (u.kind !== "goblin" || u.hp <= 0) continue;
      if (u.pathIndex - 1 === pathIndex) return u;
    }
    return null;
  }

  private holdOnTile(a: Adventurer, progress: number): void {
    a.progress = progress;
    const p0 = this.waypoints[a.pathIndex];
    const p1 =
      this.waypoints[Math.min(a.pathIndex + 1, this.waypoints.length - 1)];
    a.x = p0.x + (p1.x - p0.x) * a.progress;
    a.y = p0.y + (p1.y - p0.y) * a.progress;
  }

  private updateAdventurers(dt: number): void {
    const survivors: Adventurer[] = [];
    for (const a of this.adventurers) {
      if (a.slowTimer > 0) {
        a.slowTimer -= dt;
        if (a.slowTimer <= 0) a.speed = a.baseSpeed;
      }

      // Engage / stay in fight with monster on current tile
      const monster = this.monsterAtPathIndex(a.pathIndex);
      if (monster && a.progress < 0.55) {
        a.fightingUnitId = this.unitId(monster);
        // Hold near the monster
        a.progress = Math.min(a.progress, 0.35);
        const wp = this.waypoints[a.pathIndex];
        a.x = wp.x;
        a.y = wp.y;
        survivors.push(a);
        continue;
      }

      // Goblin reaches one tile ahead of itself, toward the entrance.
      const reach = this.goblinReachingTile(a.pathIndex);
      if (reach && a.progress >= 0.45) {
        a.fightingUnitId = this.unitId(reach);
        this.holdOnTile(a, Math.min(Math.max(a.progress, 0.62), 0.72));
        survivors.push(a);
        continue;
      }
      a.fightingUnitId = null;

      let remaining = a.speed * dt;
      while (remaining > 0 && a.pathIndex < this.waypoints.length - 1) {
        // Blocked by monster ahead on next tile?
        const nextMonster = this.monsterAtPathIndex(a.pathIndex + 1);
        if (nextMonster && a.progress > 0.85) {
          a.fightingUnitId = this.unitId(nextMonster);
          a.pathIndex += 1;
          a.progress = 0.2;
          const wp = this.waypoints[a.pathIndex];
          a.x = wp.x;
          a.y = wp.y;
          remaining = 0;
          break;
        }

        const p0 = this.waypoints[a.pathIndex];
        const p1 = this.waypoints[a.pathIndex + 1];
        const segLen = dist(p0, p1);
        const left = (1 - a.progress) * segLen;
        if (remaining >= left) {
          remaining -= left;
          a.pathIndex += 1;
          a.progress = 0;
          a.x = p1.x;
          a.y = p1.y;
        } else {
          a.progress += remaining / segLen;
          a.x = p0.x + (p1.x - p0.x) * a.progress;
          a.y = p0.y + (p1.y - p0.y) * a.progress;
          remaining = 0;
        }
      }

      if (a.pathIndex >= this.waypoints.length - 1) {
        this.lives -= a.leakDamage;
        this.burst(a.x, a.y, "#e85d4a", 10);
        if (this.lives <= 0) {
          this.lives = 0;
          this.phase = "lost";
        }
        this.emitHud();
        continue;
      }

      if (a.hp > 0) survivors.push(a);
    }
    this.adventurers = survivors;
  }

  private updateTraps(dt: number): void {
    for (const u of this.units) {
      const def = DUNGEON_BUILDS[u.kind];
      if (def.role !== "trap") continue;
      u.cooldown = Math.max(0, u.cooldown - dt);
      if (u.cooldown > 0) continue;

      const dmg = def.damage * (1 + u.damageLevel * 0.35);
      let hit = false;
      for (const a of this.adventurers) {
        if (a.pathIndex !== u.pathIndex) continue;
        if (a.progress > 0.85) continue;
        a.hp -= dmg;
        if (def.slow) {
          a.speed = a.baseSpeed * def.slow;
          a.slowTimer = def.slowDuration ?? 1;
        }
        this.burst(a.x, a.y, def.color, 5);
        hit = true;
        break; // one adventurer per pulse
      }
      if (hit) {
        u.cooldown = 1 / (def.fireRate ?? 1);
      }
    }

    // Remove dead adventurers from traps
    this.adventurers = this.adventurers.filter((a) => {
      if (a.hp > 0) return true;
      this.gold += a.reward;
      this.burst(a.x, a.y, "#e8c547", 12);
      return false;
    });
  }

  private updateCombat(dt: number): void {
    // Adventurers damage monsters; monsters damage adventurers
    for (const a of this.adventurers) {
      if (a.fightingUnitId === null) continue;
      const unit = this.units.find((u) => this.unitId(u) === a.fightingUnitId);
      if (!unit || unit.hp <= 0) {
        a.fightingUnitId = null;
        continue;
      }
      const def = DUNGEON_BUILDS[unit.kind];
      if (def.role !== "monster") continue;

      a.fightCooldown -= dt;
      unit.cooldown = Math.max(0, unit.cooldown - dt);

      // Adventurer strikes
      if (a.fightCooldown <= 0) {
        unit.hp -= a.damage;
        a.fightCooldown = 0.55;
        this.burst(unit.col * DCELL + DCELL / 2, unit.row * DCELL + DCELL / 2, a.color, 4);
      }

      // Monster strikes
      if (unit.cooldown <= 0 && unit.hp > 0) {
        const mdmg = def.damage * (1 + unit.damageLevel * 0.3);
        a.hp -= mdmg;
        unit.cooldown = 1 / (def.fireRate ?? 1);
        this.burst(a.x, a.y, def.color, 4);
      }
    }

    // Dead monsters
    this.units = this.units.filter((u) => {
      if (u.hp > 0) return true;
      this.occupied.delete(pathKey(u.col, u.row));
      this.burst(
        u.col * DCELL + DCELL / 2,
        u.row * DCELL + DCELL / 2,
        "#e85d4a",
        14,
      );
      return false;
    });
    if (
      this.selectedUnitIndex !== null &&
      this.selectedUnitIndex >= this.units.length
    ) {
      this.selectedUnitIndex = null;
    }

    // Dead adventurers from combat
    let killed = false;
    this.adventurers = this.adventurers.filter((a) => {
      if (a.hp > 0) return true;
      killed = true;
      this.gold += a.reward;
      this.burst(a.x, a.y, "#e8c547", 12);
      return false;
    });
    if (killed) this.emitHud();
  }

  private checkWaveEnd(): void {
    if (!this.waveInProgress) return;
    if (this.spawnQueue > 0 || this.adventurers.length > 0) return;
    this.waveInProgress = false;
    this.gold += 30 + this.wave * 6;
    this.shovelReady = true;
    if (this.wave >= DUNGEON_WAVES) this.phase = "won";
    else this.phase = "ready";
    this.emitHud();
  }

  private burst(x: number, y: number, color: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const ang = Math.random() * Math.PI * 2;
      const s = 40 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(ang) * s,
        vy: Math.sin(ang) * s,
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
    this.drawUnits(ctx);
    this.drawAdventurers(ctx);
    this.drawParticles(ctx);
    this.drawGates(ctx);
  }

  private drawTerrain(ctx: CanvasRenderingContext2D): void {
    for (let r = 0; r < DROWS; r++) {
      for (let c = 0; c < DCOLS; c++) {
        const x = c * DCELL;
        const y = r * DCELL;
        const onPath = this.pathSet.has(pathKey(c, r));
        if (onPath) {
          ctx.fillStyle = (c + r) % 2 === 0 ? "#3a3228" : "#332c24";
        } else {
          ctx.fillStyle = (c + r) % 2 === 0 ? "#1a221c" : "#151c18";
        }
        ctx.fillRect(x, y, DCELL, DCELL);
        if (!onPath) {
          ctx.fillStyle = "rgba(80, 100, 70, 0.05)";
          ctx.fillRect(x + 10, y + 12, 3, 8);
        }
      }
    }
  }

  private drawPath(ctx: CanvasRenderingContext2D): void {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#5c4a35";
    ctx.lineWidth = DCELL * 0.78;
    ctx.beginPath();
    this.waypoints.forEach((w, i) => {
      if (i === 0) ctx.moveTo(w.x, w.y);
      else ctx.lineTo(w.x, w.y);
    });
    ctx.stroke();

    ctx.strokeStyle = "#423628";
    ctx.lineWidth = DCELL * 0.55;
    ctx.beginPath();
    this.waypoints.forEach((w, i) => {
      if (i === 0) ctx.moveTo(w.x, w.y);
      else ctx.lineTo(w.x, w.y);
    });
    ctx.stroke();

    ctx.strokeStyle = "rgba(232, 197, 71, 0.18)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 8]);
    ctx.beginPath();
    this.waypoints.forEach((w, i) => {
      if (i === 0) ctx.moveTo(w.x, w.y);
      else ctx.lineTo(w.x, w.y);
    });
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private drawGates(ctx: CanvasRenderingContext2D): void {
    const start = this.waypoints[0];
    const end = this.waypoints[this.waypoints.length - 1];
    const pulse = 0.5 + 0.5 * Math.sin(this.pulse * 3);

    ctx.fillStyle = `rgba(232, 197, 71, ${0.2 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(start.x, start.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e8c547";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = `rgba(94, 207, 138, ${0.2 + pulse * 0.2})`;
    ctx.beginPath();
    ctx.arc(end.x, end.y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#5ecf8a";
    ctx.stroke();

    ctx.fillStyle = "#e8efe6";
    ctx.font = "600 10px 'Chakra Petch', sans-serif";
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
    const def = DUNGEON_BUILDS[this.selected];
    const onPath = this.pathSet.has(key);
    const free = !this.occupied.has(key);
    const valid = onPath && free && this.gold >= def.cost;

    ctx.fillStyle = valid
      ? "rgba(94, 207, 138, 0.28)"
      : "rgba(232, 93, 74, 0.28)";
    ctx.fillRect(col * DCELL, row * DCELL, DCELL, DCELL);

    if (onPath) {
      ctx.globalAlpha = 0.75;
      this.drawUnitGlyph(
        ctx,
        col * DCELL + DCELL / 2,
        row * DCELL + DCELL / 2,
        this.selected,
        valid ? def.color : "#666",
      );
      ctx.globalAlpha = 1;
      if (this.selected === "goblin") {
        const idx = this.pathIndexAt.get(key);
        if (idx !== undefined) this.drawReachAt(ctx, idx, true);
      }
    }
  }

  private drawUnits(ctx: CanvasRenderingContext2D): void {
    this.units.forEach((u, i) => {
      const def = DUNGEON_BUILDS[u.kind];
      const cx = u.col * DCELL + DCELL / 2;
      const cy = u.row * DCELL + DCELL / 2;
      const selected = this.selectedUnitIndex === i;

      if (def.role === "trap") {
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillRect(cx - 16, cy - 16, 32, 32);
        ctx.strokeStyle = selected ? "#e8c547" : def.color;
        ctx.lineWidth = selected ? 2.5 : 1.5;
        ctx.strokeRect(cx - 16, cy - 16, 32, 32);
      } else {
        ctx.fillStyle = "#1a1510";
        ctx.beginPath();
        ctx.arc(cx, cy, 17, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = selected ? "#e8c547" : def.color;
        ctx.lineWidth = selected ? 3 : 2;
        ctx.stroke();
      }

      this.drawUnitGlyph(ctx, cx, cy, u.kind, def.color);

      if (u.damageLevel > 0) {
        ctx.fillStyle = "#e8c547";
        ctx.font = "600 10px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(`+${u.damageLevel}`, cx, cy + 18);
      }

      if (u.kind === "goblin") this.drawReachAt(ctx, u.pathIndex, selected);

      if (def.role === "monster") {
        const barW = 28;
        const bx = cx - barW / 2;
        const by = cy - 26;
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(bx, by, barW, 4);
        ctx.fillStyle = "#5ecf8a";
        ctx.fillRect(bx, by, barW * Math.max(0, u.hp / u.maxHp), 4);
      }
    });
  }

  /** Dashed mark on the tile a goblin strikes ahead of itself. */
  private drawReachAt(
    ctx: CanvasRenderingContext2D,
    goblinPathIndex: number,
    selected: boolean,
  ): void {
    const ahead = goblinPathIndex - 1;
    if (ahead < 0) return;
    const cell = ZIGZAG_PATH[ahead];
    const x = cell.col * DCELL;
    const y = cell.row * DCELL;
    ctx.save();
    ctx.strokeStyle = selected
      ? "rgba(74, 155, 110, 0.95)"
      : "rgba(74, 155, 110, 0.55)";
    ctx.fillStyle = selected
      ? "rgba(74, 155, 110, 0.16)"
      : "rgba(74, 155, 110, 0.08)";
    ctx.lineWidth = selected ? 2 : 1.5;
    ctx.setLineDash([5, 4]);
    ctx.fillRect(x + 6, y + 6, DCELL - 12, DCELL - 12);
    ctx.strokeRect(x + 6, y + 6, DCELL - 12, DCELL - 12);
    ctx.setLineDash([]);
    ctx.fillStyle = selected ? "#d7f5e4" : "rgba(215, 245, 228, 0.8)";
    ctx.font = "600 9px 'Chakra Petch', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("AHEAD", x + DCELL / 2, y + DCELL / 2);
    ctx.restore();
  }

  private drawUnitGlyph(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    kind: DungeonBuildKind,
    color: string,
  ): void {
    ctx.fillStyle = color;
    ctx.save();
    ctx.translate(cx, cy);
    if (kind === "spikes") {
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 8 - 3, 8);
        ctx.lineTo(i * 8, -8);
        ctx.lineTo(i * 8 + 3, 8);
        ctx.closePath();
        ctx.fill();
      }
    } else if (kind === "snare") {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(8, 8);
      ctx.moveTo(8, -8);
      ctx.lineTo(-8, 8);
      ctx.stroke();
    } else if (kind === "goblin") {
      ctx.beginPath();
      ctx.arc(0, -2, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-6, 4, 12, 8);
    } else {
      // ogre
      ctx.beginPath();
      ctx.arc(0, -1, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-8, 5, 16, 10);
    }
    ctx.restore();
  }

  private drawAdventurers(ctx: CanvasRenderingContext2D): void {
    for (const a of this.adventurers) {
      const fighting = a.fightingUnitId !== null;
      const r = a.radius;
      // All adventurers are triangles, colored to match trap/monster types
      ctx.fillStyle = a.color;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - r);
      ctx.lineTo(a.x + r * 0.9, a.y + r * 0.75);
      ctx.lineTo(a.x - r * 0.9, a.y + r * 0.75);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = fighting
        ? "#e85d4a"
        : a.slowTimer > 0
          ? "#7ec8e0"
          : "rgba(0,0,0,0.35)";
      ctx.lineWidth = fighting || a.slowTimer > 0 ? 2 : 1;
      ctx.stroke();

      const barW = a.radius * 2.2;
      const bx = a.x - barW / 2;
      const by = a.y - a.radius - 10;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(bx, by, barW, 4);
      ctx.fillStyle = a.hp / a.maxHp > 0.4 ? "#5ecf8a" : "#e85d4a";
      ctx.fillRect(bx, by, barW * Math.max(0, a.hp / a.maxHp), 4);

      if (a.kind === "ogreSlayer") {
        ctx.fillStyle = "#e8efe6";
        ctx.font = "700 8px 'Chakra Petch', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("SLAYER", a.x, a.y + 1);
      }
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
