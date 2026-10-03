import "./style.css";
import { TOWER_DEFS } from "./game/config";
import { Game, type HudSnapshot } from "./game/engine";
import type { TowerKind } from "./game/types";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <header class="top-bar">
    <div class="brand">Bastion Breach</div>
    <div class="stats">
      <div class="stat"><span class="stat-label">Gold</span><span class="stat-value gold" id="gold">0</span></div>
      <div class="stat"><span class="stat-label">Lives</span><span class="stat-value lives" id="lives">0</span></div>
      <div class="stat"><span class="stat-label">Wave</span><span class="stat-value wave" id="wave">0</span></div>
    </div>
  </header>

  <div class="game-shell">
    <div class="canvas-wrap">
      <canvas id="game" width="768" height="480"></canvas>
      <div class="overlay" id="start-overlay">
        <div class="overlay-card">
          <h2>Bastion Breach</h2>
          <p>Place towers along the trail. Stop every wave before they reach the red gate. Survive all 12 waves.</p>
          <button class="btn btn-primary" id="start-btn" type="button">Start Defense</button>
        </div>
      </div>
      <div class="overlay hidden" id="end-overlay">
        <div class="overlay-card">
          <h2 id="end-title">Victory</h2>
          <p id="end-msg">The bastion holds.</p>
          <button class="btn btn-primary" id="restart-btn" type="button">Play Again</button>
        </div>
      </div>
    </div>

    <p class="hint" id="hint">Select a tower, then click an empty grass tile to build.</p>

    <div class="toolbar">
      ${(Object.keys(TOWER_DEFS) as TowerKind[])
        .map((kind) => {
          const d = TOWER_DEFS[kind];
          return `
            <button class="tower-btn" type="button" data-kind="${kind}" id="btn-${kind}">
              <span class="name"><span class="swatch ${kind}"></span>${d.name}</span>
              <span class="meta">${d.cost}g · ${d.description}</span>
            </button>
          `;
        })
        .join("")}
      <div class="actions">
        <button class="btn btn-ghost" type="button" id="cancel-btn">Cancel</button>
        <button class="btn btn-primary" type="button" id="wave-btn">Start Wave</button>
      </div>
    </div>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;
const game = new Game();

const goldEl = document.querySelector<HTMLElement>("#gold")!;
const livesEl = document.querySelector<HTMLElement>("#lives")!;
const waveEl = document.querySelector<HTMLElement>("#wave")!;
const hintEl = document.querySelector<HTMLElement>("#hint")!;
const waveBtn = document.querySelector<HTMLButtonElement>("#wave-btn")!;
const cancelBtn = document.querySelector<HTMLButtonElement>("#cancel-btn")!;
const startOverlay = document.querySelector<HTMLElement>("#start-overlay")!;
const endOverlay = document.querySelector<HTMLElement>("#end-overlay")!;
const endTitle = document.querySelector<HTMLElement>("#end-title")!;
const endMsg = document.querySelector<HTMLElement>("#end-msg")!;
const startBtn = document.querySelector<HTMLButtonElement>("#start-btn")!;
const restartBtn = document.querySelector<HTMLButtonElement>("#restart-btn")!;

let started = false;

function syncHud(hud: HudSnapshot): void {
  goldEl.textContent = String(hud.gold);
  livesEl.textContent = String(hud.lives);
  waveEl.textContent = `${hud.wave} / ${hud.totalWaves}`;

  waveBtn.disabled =
    !started || hud.waveInProgress || hud.phase === "won" || hud.phase === "lost";
  waveBtn.textContent = hud.waveInProgress
    ? `Wave ${hud.wave}…`
    : hud.wave >= hud.totalWaves
      ? "Complete"
      : `Start Wave ${hud.wave + 1}`;

  for (const kind of Object.keys(TOWER_DEFS) as TowerKind[]) {
    const btn = document.querySelector<HTMLButtonElement>(`#btn-${kind}`)!;
    const cost = TOWER_DEFS[kind].cost;
    btn.disabled = !started || hud.phase === "won" || hud.phase === "lost" || hud.gold < cost;
    btn.classList.toggle("selected", hud.selected === kind);
  }

  if (hud.phase === "won") {
    endTitle.textContent = "Victory";
    endMsg.textContent = "All twelve waves broken. The bastion holds.";
    endOverlay.classList.remove("hidden");
  } else if (hud.phase === "lost") {
    endTitle.textContent = "Breach";
    endMsg.textContent = `The line fell on wave ${hud.wave}. Rebuild and try again.`;
    endOverlay.classList.remove("hidden");
  }

  if (hud.selected) {
    const d = TOWER_DEFS[hud.selected];
    hintEl.textContent = `${d.name} selected (${d.cost}g). Click grass to build. Path tiles are blocked.`;
  } else {
    hintEl.textContent = "Select a tower type, then click an empty grass tile.";
  }
}

game.onHudChange = syncHud;
syncHud({
  gold: game.gold,
  lives: game.lives,
  wave: game.wave,
  totalWaves: 12,
  phase: game.phase,
  selected: game.selected,
  waveInProgress: false,
  enemiesLeft: 0,
});

for (const kind of Object.keys(TOWER_DEFS) as TowerKind[]) {
  document.querySelector(`#btn-${kind}`)!.addEventListener("click", () => {
    if (!started) return;
    game.selectTower(kind);
  });
}

cancelBtn.addEventListener("click", () => game.selectTower(null));
waveBtn.addEventListener("click", () => {
  if (!started) return;
  game.startWave();
});

startBtn.addEventListener("click", () => {
  started = true;
  startOverlay.classList.add("hidden");
  game.selectTower("archer");
  syncHud({
    gold: game.gold,
    lives: game.lives,
    wave: game.wave,
    totalWaves: 12,
    phase: game.phase,
    selected: game.selected,
    waveInProgress: false,
    enemiesLeft: 0,
  });
});

restartBtn.addEventListener("click", () => {
  endOverlay.classList.add("hidden");
  started = true;
  game.restart();
});

function pointerCell(e: PointerEvent) {
  return game.screenToCell(e.clientX, e.clientY, canvas);
}

canvas.addEventListener("pointermove", (e) => {
  if (!started) return;
  const { col, row } = pointerCell(e);
  game.setHover(col, row);
});

canvas.addEventListener("pointerleave", () => game.setHover(-1, null));

canvas.addEventListener("pointerdown", (e) => {
  if (!started) return;
  const { col, row } = pointerCell(e);
  game.tryPlace(col, row);
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.update(dt);
  game.draw(ctx);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
