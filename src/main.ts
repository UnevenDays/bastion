import "./style.css";
import { MAX_UPGRADE, TOWER_DEFS } from "./game/config";
import { Game, type HudSnapshot } from "./game/engine";
import type { Difficulty, TowerKind } from "./game/types";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <header class="top-bar">
    <div class="brand-wrap">
      <div class="brand">Bastion Breach</div>
      <span class="mode-badge hidden" id="mode-badge">Hard</span>
    </div>
    <div class="stats">
      <div class="stat"><span class="stat-label">Gold</span><span class="stat-value gold" id="gold">0</span></div>
      <div class="stat"><span class="stat-label">Lives</span><span class="stat-value lives" id="lives">0</span></div>
      <div class="stat"><span class="stat-label">Wave</span><span class="stat-value wave" id="wave">0</span></div>
      <div class="stat"><span class="stat-label">Shovel</span><span class="stat-value shovel" id="shovel-stat">Ready</span></div>
    </div>
  </header>

  <div class="game-shell">
    <div class="canvas-wrap">
      <canvas id="game" width="768" height="480"></canvas>
      <div class="overlay" id="start-overlay">
        <div class="overlay-card">
          <h2>Bastion Breach</h2>
          <p>Place towers, buy special upgrades, and use the shovel once per wave to move or sell. Survive all 12 waves — wave 12 brings the Final Boss.</p>
          <div class="mode-picker" role="group" aria-label="Difficulty">
            <button class="mode-btn selected" type="button" data-mode="normal" id="mode-normal">Normal</button>
            <button class="mode-btn" type="button" data-mode="hard" id="mode-hard">Hard</button>
          </div>
          <p class="mode-blurb" id="mode-blurb">Standard pacing. Good for learning the path.</p>
          <button class="btn btn-primary" id="start-btn" type="button">Start Defense</button>
        </div>
      </div>
      <div class="overlay hidden" id="end-overlay">
        <div class="overlay-card">
          <h2 id="end-title">Victory</h2>
          <p id="end-msg">The bastion holds.</p>
          <div class="mode-picker" role="group" aria-label="Replay difficulty">
            <button class="mode-btn selected" type="button" data-mode="normal" id="end-mode-normal">Normal</button>
            <button class="mode-btn" type="button" data-mode="hard" id="end-mode-hard">Hard</button>
          </div>
          <button class="btn btn-primary" id="restart-btn" type="button">Play Again</button>
        </div>
      </div>
    </div>

    <p class="hint" id="hint">Select a tower, then click an empty grass tile to build.</p>

    <div class="upgrade-bar hidden" id="upgrade-bar">
      <div class="upgrade-info">
        <span class="upgrade-title" id="upgrade-title">Tower</span>
        <span class="upgrade-stats" id="upgrade-stats"></span>
      </div>
      <button class="btn btn-upgrade" type="button" id="upgrade-damage">+ Damage</button>
      <button class="btn btn-upgrade" type="button" id="upgrade-speed">+ Attack Speed</button>
      <button class="btn btn-special" type="button" id="upgrade-special">Special</button>
      <button class="btn btn-sell" type="button" id="sell-btn">Sell</button>
    </div>

    <div class="carry-bar hidden" id="carry-bar">
      <span class="carry-text" id="carry-text">Tower picked up — click grass to move, or sell for refund.</span>
      <button class="btn btn-sell" type="button" id="carry-sell-btn">Sell</button>
    </div>

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
      <button class="tower-btn shovel-btn" type="button" id="btn-shovel">
        <span class="name">Shovel</span>
        <span class="meta">Move or sell · 1× per wave</span>
      </button>
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
const shovelStatEl = document.querySelector<HTMLElement>("#shovel-stat")!;
const hintEl = document.querySelector<HTMLElement>("#hint")!;
const waveBtn = document.querySelector<HTMLButtonElement>("#wave-btn")!;
const cancelBtn = document.querySelector<HTMLButtonElement>("#cancel-btn")!;
const startOverlay = document.querySelector<HTMLElement>("#start-overlay")!;
const endOverlay = document.querySelector<HTMLElement>("#end-overlay")!;
const endTitle = document.querySelector<HTMLElement>("#end-title")!;
const endMsg = document.querySelector<HTMLElement>("#end-msg")!;
const startBtn = document.querySelector<HTMLButtonElement>("#start-btn")!;
const restartBtn = document.querySelector<HTMLButtonElement>("#restart-btn")!;
const upgradeBar = document.querySelector<HTMLElement>("#upgrade-bar")!;
const upgradeTitle = document.querySelector<HTMLElement>("#upgrade-title")!;
const upgradeStats = document.querySelector<HTMLElement>("#upgrade-stats")!;
const upgradeDamageBtn =
  document.querySelector<HTMLButtonElement>("#upgrade-damage")!;
const upgradeSpeedBtn =
  document.querySelector<HTMLButtonElement>("#upgrade-speed")!;
const upgradeSpecialBtn =
  document.querySelector<HTMLButtonElement>("#upgrade-special")!;
const sellBtn = document.querySelector<HTMLButtonElement>("#sell-btn")!;
const carryBar = document.querySelector<HTMLElement>("#carry-bar")!;
const carryText = document.querySelector<HTMLElement>("#carry-text")!;
const carrySellBtn =
  document.querySelector<HTMLButtonElement>("#carry-sell-btn")!;
const shovelBtn = document.querySelector<HTMLButtonElement>("#btn-shovel")!;
const modeBadge = document.querySelector<HTMLElement>("#mode-badge")!;
const modeBlurb = document.querySelector<HTMLElement>("#mode-blurb")!;
const modeNormalBtn = document.querySelector<HTMLButtonElement>("#mode-normal")!;
const modeHardBtn = document.querySelector<HTMLButtonElement>("#mode-hard")!;
const endModeNormalBtn =
  document.querySelector<HTMLButtonElement>("#end-mode-normal")!;
const endModeHardBtn =
  document.querySelector<HTMLButtonElement>("#end-mode-hard")!;

let started = false;
let chosenDifficulty: Difficulty = "normal";

const MODE_BLURBS: Record<Difficulty, string> = {
  normal: "Standard pacing. Good for learning the path.",
  hard: "Enemy HP, speed, and count rise every wave. Fewer starting lives and gold.",
};

function syncModeButtons(difficulty: Difficulty): void {
  chosenDifficulty = difficulty;
  modeNormalBtn.classList.toggle("selected", difficulty === "normal");
  modeHardBtn.classList.toggle("selected", difficulty === "hard");
  endModeNormalBtn.classList.toggle("selected", difficulty === "normal");
  endModeHardBtn.classList.toggle("selected", difficulty === "hard");
  modeBlurb.textContent = MODE_BLURBS[difficulty];
}

function syncHud(hud: HudSnapshot): void {
  goldEl.textContent = String(hud.gold);
  livesEl.textContent = String(hud.lives);
  waveEl.textContent = `${hud.wave} / ${hud.totalWaves}`;
  shovelStatEl.textContent = hud.carrying
    ? "Carrying"
    : hud.shovelReady
      ? "Ready"
      : "Used";
  shovelStatEl.classList.toggle("ready", hud.shovelReady && !hud.carrying);
  shovelStatEl.classList.toggle("used", !hud.shovelReady && !hud.carrying);

  if (hud.difficulty === "hard") {
    modeBadge.classList.remove("hidden");
    modeBadge.textContent = "Hard";
  } else {
    modeBadge.classList.add("hidden");
  }

  waveBtn.disabled =
    !started ||
    hud.waveInProgress ||
    hud.carrying ||
    hud.phase === "won" ||
    hud.phase === "lost";
  waveBtn.textContent = hud.waveInProgress
    ? `Wave ${hud.wave}…`
    : hud.wave >= hud.totalWaves
      ? "Complete"
      : `Start Wave ${hud.wave + 1}`;

  for (const kind of Object.keys(TOWER_DEFS) as TowerKind[]) {
    const btn = document.querySelector<HTMLButtonElement>(`#btn-${kind}`)!;
    const cost = TOWER_DEFS[kind].cost;
    btn.disabled =
      !started ||
      hud.carrying ||
      hud.phase === "won" ||
      hud.phase === "lost" ||
      hud.gold < cost;
    btn.classList.toggle("selected", hud.selected === kind && hud.tool === "build");
  }

  shovelBtn.disabled =
    !started ||
    hud.phase === "won" ||
    hud.phase === "lost" ||
    (!hud.shovelReady && !hud.carrying);
  shovelBtn.classList.toggle("selected", hud.tool === "shovel" || hud.carrying);

  if (hud.carrying) {
    carryBar.classList.remove("hidden");
    upgradeBar.classList.add("hidden");
    carryText.textContent = `Tower picked up — click grass to move, or sell for ${hud.carrySellRefund}g.`;
    carrySellBtn.textContent = `Sell (${hud.carrySellRefund}g)`;
    hintEl.textContent =
      "Shovel: place on empty grass to move, or sell for half the gold invested.";
  } else {
    carryBar.classList.add("hidden");
  }

  if (hud.selectedTower && !hud.carrying) {
    const t = hud.selectedTower;
    upgradeBar.classList.remove("hidden");
    upgradeTitle.textContent = t.special
      ? `${t.name} · ${t.specialName}`
      : `${t.name} selected`;
    upgradeStats.textContent = `DMG ${t.damage} · SPD ${t.fireRate}/s · RNG ${t.range} · DMG Lv ${t.damageLevel}/${MAX_UPGRADE} · SPD Lv ${t.speedLevel}/${MAX_UPGRADE}`;

    if (t.damageCost === null) {
      upgradeDamageBtn.textContent = "Damage Max";
      upgradeDamageBtn.disabled = true;
    } else {
      upgradeDamageBtn.textContent = `+ Damage (${t.damageCost}g)`;
      upgradeDamageBtn.disabled = !started || !t.canAffordDamage;
    }

    if (t.speedCost === null) {
      upgradeSpeedBtn.textContent = "Speed Max";
      upgradeSpeedBtn.disabled = true;
    } else {
      upgradeSpeedBtn.textContent = `+ Attack Speed (${t.speedCost}g)`;
      upgradeSpeedBtn.disabled = !started || !t.canAffordSpeed;
    }

    if (t.specialCost === null) {
      upgradeSpecialBtn.textContent = `${t.specialName} ✓`;
      upgradeSpecialBtn.disabled = true;
      upgradeSpecialBtn.title = t.specialDescription;
    } else {
      upgradeSpecialBtn.textContent = `${t.specialName} (${t.specialCost}g)`;
      upgradeSpecialBtn.disabled = !started || !t.canAffordSpecial;
      upgradeSpecialBtn.title = t.specialDescription;
    }

    sellBtn.textContent = `Sell (${t.sellRefund}g)`;
    sellBtn.disabled = !started || !hud.shovelReady;
    sellBtn.title = hud.shovelReady
      ? "Uses your once-per-wave shovel charge"
      : "Shovel already used this wave";

    hintEl.textContent = t.special
      ? `${t.specialName}: ${t.specialDescription}`
      : `Special: ${t.specialName} — ${t.specialDescription}`;
  } else if (!hud.carrying) {
    upgradeBar.classList.add("hidden");
    if (hud.tool === "shovel") {
      hintEl.textContent = hud.shovelReady
        ? "Shovel ready: click a tower to pick it up, then move or sell."
        : "Shovel already used this wave. Refreshes when the wave ends.";
    } else if (hud.selected) {
      const d = TOWER_DEFS[hud.selected];
      hintEl.textContent = `${d.name} selected (${d.cost}g). Click grass to build, or click a placed tower to upgrade.`;
    } else {
      hintEl.textContent =
        "Select a tower to build, click a placed tower to upgrade, or use the shovel.";
    }
  }

  if (hud.phase === "won") {
    endTitle.textContent = hud.difficulty === "hard" ? "Hard Victory" : "Victory";
    endMsg.textContent =
      hud.difficulty === "hard"
        ? "You held the line on Hard — even against the Final Boss."
        : "The Final Boss fell. The bastion holds.";
    syncModeButtons(hud.difficulty);
    endOverlay.classList.remove("hidden");
  } else if (hud.phase === "lost") {
    endTitle.textContent = "Breach";
    endMsg.textContent =
      hud.difficulty === "hard"
        ? `Hard mode crushed the line on wave ${hud.wave}. Try again or drop to Normal.`
        : `The line fell on wave ${hud.wave}. Rebuild and try again.`;
    syncModeButtons(hud.difficulty);
    endOverlay.classList.remove("hidden");
  }
}

game.onHudChange = syncHud;
syncHud({
  gold: game.gold,
  lives: game.lives,
  wave: game.wave,
  totalWaves: 12,
  phase: game.phase,
  difficulty: game.difficulty,
  selected: game.selected,
  selectedTower: null,
  waveInProgress: false,
  enemiesLeft: 0,
  tool: "build",
  shovelReady: true,
  carrying: false,
  carrySellRefund: 0,
});

modeNormalBtn.addEventListener("click", () => syncModeButtons("normal"));
modeHardBtn.addEventListener("click", () => syncModeButtons("hard"));
endModeNormalBtn.addEventListener("click", () => syncModeButtons("normal"));
endModeHardBtn.addEventListener("click", () => syncModeButtons("hard"));

for (const kind of Object.keys(TOWER_DEFS) as TowerKind[]) {
  document.querySelector(`#btn-${kind}`)!.addEventListener("click", () => {
    if (!started) return;
    game.selectTower(kind);
  });
}

shovelBtn.addEventListener("click", () => {
  if (!started) return;
  game.selectShovel();
});

cancelBtn.addEventListener("click", () => game.clearSelection());

upgradeDamageBtn.addEventListener("click", () => {
  if (!started) return;
  game.upgradeSelected("damage");
});

upgradeSpeedBtn.addEventListener("click", () => {
  if (!started) return;
  game.upgradeSelected("speed");
});

upgradeSpecialBtn.addEventListener("click", () => {
  if (!started) return;
  game.buySpecial();
});

sellBtn.addEventListener("click", () => {
  if (!started) return;
  game.sellWithShovel();
});

carrySellBtn.addEventListener("click", () => {
  if (!started) return;
  game.sellWithShovel();
});

waveBtn.addEventListener("click", () => {
  if (!started) return;
  game.startWave();
});

startBtn.addEventListener("click", () => {
  started = true;
  startOverlay.classList.add("hidden");
  game.beginRun(chosenDifficulty);
  game.selectTower("archer");
});

restartBtn.addEventListener("click", () => {
  endOverlay.classList.add("hidden");
  started = true;
  game.beginRun(chosenDifficulty);
  game.selectTower("archer");
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
  game.handleClick(col, row);
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
