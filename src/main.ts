import "./style.css";
import { BANK_DEPOSIT_CHUNK, TOWER_DEFS } from "./game/config";
import { DUNGEON_BUILDS, type DungeonBuildKind } from "./game/dungeonConfig";
import { DungeonGame, type DungeonHud } from "./game/dungeonEngine";
import { Game, type HudSnapshot } from "./game/engine";
import type { Difficulty, GameMode, TowerKind } from "./game/types";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <header class="top-bar">
    <div class="brand-wrap">
      <div class="brand" id="brand-title">Bastion Breach</div>
      <span class="mode-badge hidden" id="mode-badge">Hard</span>
    </div>
    <div class="stats">
      <div class="stat"><span class="stat-label">Gold</span><span class="stat-value gold" id="gold">0</span></div>
      <div class="stat"><span class="stat-label">Lives</span><span class="stat-value lives" id="lives">0</span></div>
      <div class="stat"><span class="stat-label">Wave</span><span class="stat-value wave" id="wave">0</span></div>
      <div class="stat" id="shovel-stat-wrap"><span class="stat-label">Shovel</span><span class="stat-value shovel" id="shovel-stat">Ready</span></div>
    </div>
  </header>

  <div class="game-shell">
    <div class="canvas-wrap">
      <canvas id="game" width="768" height="480"></canvas>
      <div class="overlay" id="start-overlay">
        <div class="overlay-card overlay-wide">
          <h2 id="start-heading">Bastion Breach</h2>
          <p id="start-desc">Choose how you want to play.</p>

          <div class="mode-picker game-mode-picker" role="group" aria-label="Game mode">
            <button class="mode-btn selected" type="button" data-gamemode="bastion" id="gm-bastion">
              Bastion Defense
            </button>
            <button class="mode-btn" type="button" data-gamemode="dungeon" id="gm-dungeon">
              Dungeon Ambush
            </button>
          </div>
          <p class="mode-blurb" id="gamemode-blurb">Towers beside the path. Stop waves before they reach the gate.</p>

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
          <button class="btn btn-ghost" id="menu-btn" type="button" style="margin-top:8px;width:100%">Mode Select</button>
        </div>
      </div>
    </div>

    <p class="hint" id="hint">Select a tower, then click an empty grass tile to build.</p>

    <div class="upgrade-bar hidden" id="upgrade-bar">
      <div class="upgrade-info">
        <span class="upgrade-title" id="upgrade-title">Tower</span>
        <span class="upgrade-stats" id="upgrade-stats"></span>
      </div>
      <div id="bastion-upgrades" class="upgrade-actions">
        <button class="btn btn-upgrade" type="button" id="upgrade-damage">+ Damage</button>
        <button class="btn btn-upgrade" type="button" id="upgrade-speed">+ Attack Speed</button>
        <button class="btn btn-special" type="button" id="upgrade-special">Special</button>
        <button class="btn btn-special hidden" type="button" id="mint-deposit">Bank 25g</button>
        <button class="btn btn-upgrade hidden" type="button" id="mint-deposit-all">Bank All</button>
      </div>
      <div id="dungeon-upgrades" class="upgrade-actions hidden">
        <button class="btn btn-upgrade" type="button" id="dungeon-upgrade">+ Power</button>
      </div>
      <button class="btn btn-sell" type="button" id="sell-btn">Sell</button>
    </div>

    <div class="carry-bar hidden" id="carry-bar">
      <span class="carry-text" id="carry-text">Tower picked up — click grass to move, or sell for refund.</span>
      <button class="btn btn-sell" type="button" id="carry-sell-btn">Sell</button>
    </div>

    <div class="toolbar" id="toolbar-bastion">
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

    <div class="toolbar hidden" id="toolbar-dungeon">
      ${(Object.keys(DUNGEON_BUILDS) as DungeonBuildKind[])
        .map((kind) => {
          const d = DUNGEON_BUILDS[kind];
          return `
            <button class="tower-btn" type="button" data-dkind="${kind}" id="dbtn-${kind}">
              <span class="name"><span class="swatch ${kind}"></span>${d.name}</span>
              <span class="meta">${d.cost}g · ${d.description}</span>
            </button>
          `;
        })
        .join("")}
      <div class="actions">
        <button class="btn btn-ghost" type="button" id="dcancel-btn">Cancel</button>
        <button class="btn btn-primary" type="button" id="dwave-btn">Start Wave</button>
      </div>
    </div>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;
const bastion = new Game();
const dungeon = new DungeonGame();

const brandTitle = document.querySelector<HTMLElement>("#brand-title")!;
const goldEl = document.querySelector<HTMLElement>("#gold")!;
const livesEl = document.querySelector<HTMLElement>("#lives")!;
const waveEl = document.querySelector<HTMLElement>("#wave")!;
const shovelStatEl = document.querySelector<HTMLElement>("#shovel-stat")!;
const shovelStatWrap = document.querySelector<HTMLElement>("#shovel-stat-wrap")!;
const hintEl = document.querySelector<HTMLElement>("#hint")!;
const waveBtn = document.querySelector<HTMLButtonElement>("#wave-btn")!;
const dwaveBtn = document.querySelector<HTMLButtonElement>("#dwave-btn")!;
const cancelBtn = document.querySelector<HTMLButtonElement>("#cancel-btn")!;
const dcancelBtn = document.querySelector<HTMLButtonElement>("#dcancel-btn")!;
const startOverlay = document.querySelector<HTMLElement>("#start-overlay")!;
const endOverlay = document.querySelector<HTMLElement>("#end-overlay")!;
const endTitle = document.querySelector<HTMLElement>("#end-title")!;
const endMsg = document.querySelector<HTMLElement>("#end-msg")!;
const startBtn = document.querySelector<HTMLButtonElement>("#start-btn")!;
const restartBtn = document.querySelector<HTMLButtonElement>("#restart-btn")!;
const menuBtn = document.querySelector<HTMLButtonElement>("#menu-btn")!;
const upgradeBar = document.querySelector<HTMLElement>("#upgrade-bar")!;
const upgradeTitle = document.querySelector<HTMLElement>("#upgrade-title")!;
const upgradeStats = document.querySelector<HTMLElement>("#upgrade-stats")!;
const bastionUpgrades = document.querySelector<HTMLElement>("#bastion-upgrades")!;
const dungeonUpgrades = document.querySelector<HTMLElement>("#dungeon-upgrades")!;
const upgradeDamageBtn =
  document.querySelector<HTMLButtonElement>("#upgrade-damage")!;
const upgradeSpeedBtn =
  document.querySelector<HTMLButtonElement>("#upgrade-speed")!;
const upgradeSpecialBtn =
  document.querySelector<HTMLButtonElement>("#upgrade-special")!;
const mintDepositBtn =
  document.querySelector<HTMLButtonElement>("#mint-deposit")!;
const mintDepositAllBtn =
  document.querySelector<HTMLButtonElement>("#mint-deposit-all")!;
const dungeonUpgradeBtn =
  document.querySelector<HTMLButtonElement>("#dungeon-upgrade")!;
const sellBtn = document.querySelector<HTMLButtonElement>("#sell-btn")!;
const carryBar = document.querySelector<HTMLElement>("#carry-bar")!;
const carryText = document.querySelector<HTMLElement>("#carry-text")!;
const carrySellBtn =
  document.querySelector<HTMLButtonElement>("#carry-sell-btn")!;
const shovelBtn = document.querySelector<HTMLButtonElement>("#btn-shovel")!;
const modeBadge = document.querySelector<HTMLElement>("#mode-badge")!;
const modeBlurb = document.querySelector<HTMLElement>("#mode-blurb")!;
const gamemodeBlurb = document.querySelector<HTMLElement>("#gamemode-blurb")!;
const startDesc = document.querySelector<HTMLElement>("#start-desc")!;
const startHeading = document.querySelector<HTMLElement>("#start-heading")!;
const toolbarBastion = document.querySelector<HTMLElement>("#toolbar-bastion")!;
const toolbarDungeon = document.querySelector<HTMLElement>("#toolbar-dungeon")!;
const modeNormalBtn = document.querySelector<HTMLButtonElement>("#mode-normal")!;
const modeHardBtn = document.querySelector<HTMLButtonElement>("#mode-hard")!;
const endModeNormalBtn =
  document.querySelector<HTMLButtonElement>("#end-mode-normal")!;
const endModeHardBtn =
  document.querySelector<HTMLButtonElement>("#end-mode-hard")!;
const gmBastionBtn = document.querySelector<HTMLButtonElement>("#gm-bastion")!;
const gmDungeonBtn = document.querySelector<HTMLButtonElement>("#gm-dungeon")!;

let started = false;
let chosenDifficulty: Difficulty = "normal";
let chosenMode: GameMode = "bastion";
let activeMode: GameMode = "bastion";

function difficultyBlurb(mode: GameMode, difficulty: Difficulty): string {
  if (mode === "dungeon") {
    return difficulty === "hard"
      ? "A few more adventurers, with a milder health bonus. 120 gold and 10 lives."
      : "Adventurers are softer. Spikes, snares, goblins, and ogres are stronger.";
  }
  return difficulty === "hard"
    ? "More enemies and health each wave, with a gentler ramp. 110 gold and 17 lives."
    : "Wounded enemies heal to full health if nothing hits them for 3 seconds.";
}

const GAME_BLURBS: Record<GameMode, string> = {
  bastion:
    "Towers beside the path. Upgrade damage, speed, and specials. Survive 12 waves.",
  dungeon:
    "Place traps and monsters ON the zigzag road. Adventurers fight your monsters and try to escape.",
};

function syncDifficultyButtons(difficulty: Difficulty): void {
  chosenDifficulty = difficulty;
  modeNormalBtn.classList.toggle("selected", difficulty === "normal");
  modeHardBtn.classList.toggle("selected", difficulty === "hard");
  endModeNormalBtn.classList.toggle("selected", difficulty === "normal");
  endModeHardBtn.classList.toggle("selected", difficulty === "hard");
  modeBlurb.textContent = difficultyBlurb(chosenMode, difficulty);
}

function syncGameModeButtons(mode: GameMode): void {
  chosenMode = mode;
  gmBastionBtn.classList.toggle("selected", mode === "bastion");
  gmDungeonBtn.classList.toggle("selected", mode === "dungeon");
  gamemodeBlurb.textContent = GAME_BLURBS[mode];
  modeBlurb.textContent = difficultyBlurb(mode, chosenDifficulty);
  startBtn.textContent =
    mode === "bastion" ? "Start Defense" : "Start Ambush";
  startHeading.textContent =
    mode === "bastion" ? "Bastion Breach" : "Dungeon Ambush";
  startDesc.textContent =
    mode === "bastion"
      ? "Hold the gate with roadside towers."
      : "Line the zigzag road with traps and monsters.";
  // Only show build buttons for the selected mode
  applyChrome(mode);
}

function applyChrome(mode: GameMode): void {
  activeMode = mode;
  brandTitle.textContent =
    mode === "bastion" ? "Bastion Breach" : "Dungeon Ambush";
  toolbarBastion.classList.toggle("hidden", mode !== "bastion");
  toolbarDungeon.classList.toggle("hidden", mode !== "dungeon");
  shovelStatWrap.classList.toggle("hidden", mode !== "bastion");
  bastionUpgrades.classList.toggle("hidden", mode !== "bastion");
  dungeonUpgrades.classList.toggle("hidden", mode !== "dungeon");
  carryBar.classList.add("hidden");
}

function syncBastionHud(hud: HudSnapshot): void {
  if (activeMode !== "bastion") return;
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

  modeBadge.classList.remove("hidden");
  if (hud.difficulty === "hard") {
    modeBadge.classList.remove("regen");
    modeBadge.textContent = "Hard";
  } else {
    modeBadge.classList.add("regen");
    modeBadge.textContent = "Regen";
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
    btn.disabled =
      !started ||
      hud.carrying ||
      hud.phase === "won" ||
      hud.phase === "lost" ||
      hud.gold < TOWER_DEFS[kind].cost;
    btn.classList.toggle(
      "selected",
      hud.selected === kind && hud.tool === "build",
    );
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
      "Shovel: place on empty grass to move, or sell. Banked coins come back in full.";
  } else {
    carryBar.classList.add("hidden");
  }

  if (hud.selectedTower && !hud.carrying) {
    const t = hud.selectedTower;
    upgradeBar.classList.remove("hidden");
    upgradeTitle.textContent = t.special
      ? `${t.name} · ${t.specialName}`
      : `${t.name} selected`;

    if (t.economy) {
      const bankLine = t.special
        ? ` · Bank ${t.banked}g → +${t.bankPayout}g next wave`
        : "";
      upgradeStats.textContent = `During waves: ${t.goldPerTick}g / ${t.goldInterval}s${bankLine}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Income Max" : `+ Income (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Rate Max" : `+ Payout Rate (${t.speedCost}g)`;
      hintEl.textContent = t.special
        ? "Investment Bank pays 25% of stored coins when a wave starts. Selling returns the deposit in full."
        : "Mints only print gold while a wave is running. Investment Bank stores coins for 25% back each wave.";
      const showBank = t.special;
      mintDepositBtn.classList.toggle("hidden", !showBank);
      mintDepositAllBtn.classList.toggle("hidden", !showBank);
      mintDepositBtn.textContent = `Bank ${BANK_DEPOSIT_CHUNK}g`;
      mintDepositBtn.disabled = !started || hud.gold < BANK_DEPOSIT_CHUNK;
      mintDepositAllBtn.disabled = !started || hud.gold <= 0;
    } else {
      upgradeStats.textContent = `DMG ${t.damage} · SPD ${t.fireRate}/s · RNG ${t.range}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Damage Max" : `+ Damage (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Speed Max" : `+ Attack Speed (${t.speedCost}g)`;
      hintEl.textContent = `${t.specialName}: ${t.specialDescription}`;
      mintDepositBtn.classList.add("hidden");
      mintDepositAllBtn.classList.add("hidden");
    }

    upgradeDamageBtn.disabled =
      !started || t.damageCost === null || !t.canAffordDamage;
    upgradeSpeedBtn.disabled =
      !started || t.speedCost === null || !t.canAffordSpeed;
    upgradeSpecialBtn.textContent =
      t.specialCost === null
        ? `${t.specialName} ✓`
        : `${t.specialName} (${t.specialCost}g)`;
    upgradeSpecialBtn.disabled =
      !started || t.specialCost === null || !t.canAffordSpecial;
    upgradeSpecialBtn.title = t.specialDescription;
    sellBtn.textContent = `Sell (${t.sellRefund}g)`;
    sellBtn.disabled = !started || !hud.shovelReady;
  } else if (!hud.carrying) {
    upgradeBar.classList.add("hidden");
    mintDepositBtn.classList.add("hidden");
    mintDepositAllBtn.classList.add("hidden");
    if (hud.tool === "shovel") {
      hintEl.textContent = hud.shovelReady
        ? "Shovel ready: click a tower to pick it up, then move or sell."
        : "Shovel already used this wave.";
    } else if (hud.selected) {
      hintEl.textContent = `${TOWER_DEFS[hud.selected].name} selected. Click grass to build.`;
    } else {
      hintEl.textContent = "Select a tower, or click a placed tower to upgrade.";
    }
  }

  showEndIfNeeded(hud.phase, hud.difficulty, hud.wave, "bastion");
}

function syncDungeonHud(hud: DungeonHud): void {
  if (activeMode !== "dungeon") return;
  goldEl.textContent = String(hud.gold);
  livesEl.textContent = String(hud.lives);
  waveEl.textContent = `${hud.wave} / ${hud.totalWaves}`;

  modeBadge.classList.remove("regen");
  modeBadge.classList.toggle("hidden", hud.difficulty !== "hard");
  if (hud.difficulty === "hard") modeBadge.textContent = "Hard";

  dwaveBtn.disabled =
    !started ||
    hud.waveInProgress ||
    hud.phase === "won" ||
    hud.phase === "lost";
  dwaveBtn.textContent = hud.waveInProgress
    ? `Wave ${hud.wave}…`
    : hud.wave >= hud.totalWaves
      ? "Complete"
      : `Start Wave ${hud.wave + 1}`;

  for (const kind of Object.keys(DUNGEON_BUILDS) as DungeonBuildKind[]) {
    const btn = document.querySelector<HTMLButtonElement>(`#dbtn-${kind}`)!;
    btn.disabled =
      !started ||
      hud.phase === "won" ||
      hud.phase === "lost" ||
      hud.gold < DUNGEON_BUILDS[kind].cost;
    btn.classList.toggle("selected", hud.selected === kind);
  }

  if (hud.selectedUnit) {
    const u = hud.selectedUnit;
    upgradeBar.classList.remove("hidden");
    upgradeTitle.textContent = `${u.name} on the road`;
    upgradeStats.textContent =
      u.role === "monster"
        ? `HP ${u.hp}/${u.maxHp} · Power Lv ${u.damageLevel}/3 · ${u.role}`
        : `Power Lv ${u.damageLevel}/3 · ${u.role}`;
    dungeonUpgradeBtn.textContent =
      u.upgradeCost === null ? "Power Max" : `+ Power (${u.upgradeCost}g)`;
    dungeonUpgradeBtn.disabled =
      !started || u.upgradeCost === null || !u.canAffordUpgrade;
    sellBtn.textContent = `Sell (${u.sellRefund}g)`;
    sellBtn.disabled = !started || !hud.shovelReady;
    hintEl.textContent =
      u.kind === "goblin"
        ? "Goblin attacks this tile and one tile ahead, toward incoming adventurers. They stop there and fight back."
        : u.role === "monster"
          ? "Adventurers will stop and fight this monster. Upgrade its power or sell with shovel charge."
          : "Trap triggers on adventurers walking this tile. Upgrade power or sell (1× per wave).";
  } else {
    upgradeBar.classList.add("hidden");
    if (hud.selected) {
      const d = DUNGEON_BUILDS[hud.selected];
      hintEl.textContent = `${d.name} selected (${d.cost}g). Click a ROAD tile to place.`;
    } else {
      hintEl.textContent =
        "Select a trap or monster, then place it ON the zigzag road.";
    }
  }

  showEndIfNeeded(hud.phase, hud.difficulty, hud.wave, "dungeon");
}

function showEndIfNeeded(
  phase: string,
  difficulty: Difficulty,
  wave: number,
  mode: GameMode,
): void {
  if (phase === "won") {
    endTitle.textContent =
      mode === "dungeon"
        ? difficulty === "hard"
          ? "Ambush Perfected"
          : "Dungeon Cleared"
        : difficulty === "hard"
          ? "Hard Victory"
          : "Victory";
    endMsg.textContent =
      mode === "dungeon"
        ? "No adventurer escaped the zigzag. Your traps and monsters held the road."
        : difficulty === "hard"
          ? "You held the line on Hard — even against the Final Boss."
          : "The Final Boss fell. The bastion holds.";
    syncDifficultyButtons(difficulty);
    endOverlay.classList.remove("hidden");
  } else if (phase === "lost") {
    endTitle.textContent = mode === "dungeon" ? "Breach Escape" : "Breach";
    endMsg.textContent =
      mode === "dungeon"
        ? `Adventurers escaped on wave ${wave}. Fortify the road and try again.`
        : difficulty === "hard"
          ? `Hard mode crushed the line on wave ${wave}.`
          : `The line fell on wave ${wave}. Rebuild and try again.`;
    syncDifficultyButtons(difficulty);
    endOverlay.classList.remove("hidden");
  }
}

bastion.onHudChange = syncBastionHud;
dungeon.onHudChange = syncDungeonHud;

syncGameModeButtons("bastion");
syncDifficultyButtons("normal");
applyChrome("bastion");

modeNormalBtn.addEventListener("click", () => syncDifficultyButtons("normal"));
modeHardBtn.addEventListener("click", () => syncDifficultyButtons("hard"));
endModeNormalBtn.addEventListener("click", () => syncDifficultyButtons("normal"));
endModeHardBtn.addEventListener("click", () => syncDifficultyButtons("hard"));
gmBastionBtn.addEventListener("click", () => syncGameModeButtons("bastion"));
gmDungeonBtn.addEventListener("click", () => syncGameModeButtons("dungeon"));

for (const kind of Object.keys(TOWER_DEFS) as TowerKind[]) {
  document.querySelector(`#btn-${kind}`)!.addEventListener("click", () => {
    if (!started || activeMode !== "bastion") return;
    bastion.selectTower(kind);
  });
}

for (const kind of Object.keys(DUNGEON_BUILDS) as DungeonBuildKind[]) {
  document.querySelector(`#dbtn-${kind}`)!.addEventListener("click", () => {
    if (!started || activeMode !== "dungeon") return;
    dungeon.selectBuild(kind);
  });
}

shovelBtn.addEventListener("click", () => {
  if (!started || activeMode !== "bastion") return;
  bastion.selectShovel();
});

cancelBtn.addEventListener("click", () => bastion.clearSelection());
dcancelBtn.addEventListener("click", () => dungeon.clearSelection());

upgradeDamageBtn.addEventListener("click", () => {
  if (started && activeMode === "bastion") bastion.upgradeSelected("damage");
});
upgradeSpeedBtn.addEventListener("click", () => {
  if (started && activeMode === "bastion") bastion.upgradeSelected("speed");
});
upgradeSpecialBtn.addEventListener("click", () => {
  if (started && activeMode === "bastion") bastion.buySpecial();
});
mintDepositBtn.addEventListener("click", () => {
  if (started && activeMode === "bastion") bastion.depositIntoSelected(false);
});
mintDepositAllBtn.addEventListener("click", () => {
  if (started && activeMode === "bastion") bastion.depositIntoSelected(true);
});
dungeonUpgradeBtn.addEventListener("click", () => {
  if (started && activeMode === "dungeon") dungeon.upgradeSelected();
});
sellBtn.addEventListener("click", () => {
  if (!started) return;
  if (activeMode === "bastion") bastion.sellWithShovel();
  else dungeon.sellSelected();
});
carrySellBtn.addEventListener("click", () => {
  if (started && activeMode === "bastion") bastion.sellWithShovel();
});

waveBtn.addEventListener("click", () => {
  if (started && activeMode === "bastion") bastion.startWave();
});
dwaveBtn.addEventListener("click", () => {
  if (started && activeMode === "dungeon") dungeon.startWave();
});

function startChosen(): void {
  started = true;
  startOverlay.classList.add("hidden");
  endOverlay.classList.add("hidden");
  applyChrome(chosenMode);
  if (chosenMode === "bastion") {
    bastion.beginRun(chosenDifficulty);
    bastion.selectTower("archer");
  } else {
    dungeon.beginRun(chosenDifficulty);
    dungeon.selectBuild("spikes");
  }
}

startBtn.addEventListener("click", startChosen);
restartBtn.addEventListener("click", startChosen);
menuBtn.addEventListener("click", () => {
  endOverlay.classList.add("hidden");
  startOverlay.classList.remove("hidden");
  started = false;
  modeBadge.classList.add("hidden");
  syncGameModeButtons(chosenMode);
});

function pointerCell(e: PointerEvent) {
  if (activeMode === "bastion") {
    return bastion.screenToCell(e.clientX, e.clientY, canvas);
  }
  return dungeon.screenToCell(e.clientX, e.clientY, canvas);
}

canvas.addEventListener("pointermove", (e) => {
  if (!started) return;
  const { col, row } = pointerCell(e);
  if (activeMode === "bastion") bastion.setHover(col, row);
  else dungeon.setHover(col, row);
});

canvas.addEventListener("pointerleave", () => {
  bastion.setHover(-1, null);
  dungeon.setHover(-1, null);
});

canvas.addEventListener("pointerdown", (e) => {
  if (!started) return;
  const { col, row } = pointerCell(e);
  if (activeMode === "bastion") bastion.handleClick(col, row);
  else dungeon.handleClick(col, row);
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (activeMode === "bastion") {
    bastion.update(dt);
    bastion.draw(ctx);
  } else {
    dungeon.update(dt);
    dungeon.draw(ctx);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
