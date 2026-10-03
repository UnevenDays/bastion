import "./style.css";
import { BANNER_CAP, BANK_DEPOSIT_CHUNK, TOWER_DEFS } from "./game/config";
import { DUNGEON_BUILDS, type DungeonBuildKind } from "./game/dungeonConfig";
import { DungeonGame, type DungeonHud } from "./game/dungeonEngine";
import { mountEditor } from "./editorPanel";
import { Game, type HudSnapshot } from "./game/engine";
import { PLANTS, type PlantKind } from "./game/lawnConfig";
import { LawnGame, type LawnHud } from "./game/lawnEngine";
import { CAMPAIGN } from "./game/campaign";
import { loadScores, saveScore, type EndlessScore } from "./game/leaderboard";
import type { CustomLevel } from "./game/level";
import type { Difficulty, GameMode, TargetMode, TowerKind } from "./game/types";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = `
  <header class="top-bar">
    <div class="brand-wrap">
      <div class="brand" id="brand-title">Bastion Breach</div>
      <span class="mode-badge hidden" id="mode-badge">Hard</span>
    </div>
    <div class="stats">
      <div class="stat"><span class="stat-label" id="gold-label">Gold</span><span class="stat-value gold" id="gold">0</span></div>
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
          <div class="menu-tabs" role="tablist" aria-label="Menu">
            <button class="menu-tab selected" type="button" role="tab" id="tab-classic" aria-selected="true">Classic</button>
            <button class="menu-tab" type="button" role="tab" id="tab-minigames" aria-selected="false">Minigames</button>
            <button class="menu-tab" type="button" role="tab" id="tab-editor" aria-selected="false">Editor</button>
          </div>
          <h2 id="start-heading">Classic</h2>

          <div id="panel-classic" class="menu-panel">
            <p class="mode-blurb" id="start-desc">Four roads. Each one after the first is longer, and each road lays the tiles differently. Marsh has water you cannot build on.</p>
            <div class="level-picker" id="level-picker" role="group" aria-label="Level"></div>
            <div id="menu-board" class="score-board hidden">
              <p class="score-title">Endless leaderboard</p>
              <p class="score-note">Saved on this browser. Highest wave, then gold.</p>
              <ol id="menu-score-list"></ol>
            </div>
          </div>
          <div id="panel-editor" class="menu-panel hidden"></div>
          <div id="panel-minigames" class="menu-panel hidden">
            <button class="minigame-card selected" type="button" id="minigame-dungeon">
              <span class="minigame-name">Dungeon Crawler</span>
              <span class="minigame-meta">Place traps and monsters on the zigzag road. Adventurers fight through and try to escape.</span>
            </button>
            <button class="minigame-card" type="button" id="minigame-lawn">
              <span class="minigame-name">Sun Lawn</span>
              <span class="minigame-meta">Five lanes. 30 seconds with no zombies, then the waves. 50 sun to start, 25 more every 20 seconds.</span>
            </button>
          </div>

          <div class="mode-picker" role="group" aria-label="Difficulty">
            <button class="mode-btn selected" type="button" data-mode="normal" id="mode-normal">Normal</button>
            <button class="mode-btn" type="button" data-mode="hard" id="mode-hard">Hard</button>
            <button class="mode-btn" type="button" data-mode="endless" id="mode-endless">Endless</button>
          </div>
          <p class="mode-blurb" id="mode-blurb">Standard pacing. Good for learning the path.</p>
          <button class="btn btn-primary" id="start-btn" type="button">Start Classic</button>
        </div>
      </div>
      <div class="overlay hidden" id="end-overlay">
        <div class="overlay-card">
          <h2 id="end-title">Victory</h2>
          <p id="end-msg">The bastion holds.</p>
          <div id="endless-score" class="score-board hidden">
            <label class="score-name">Name <input id="score-name" maxlength="16" value="Warden" /></label>
            <button class="btn btn-primary" type="button" id="score-save">Save score</button>
            <ol id="end-score-list"></ol>
          </div>
          <div class="mode-picker" id="end-mode-picker" role="group" aria-label="Replay difficulty">
            <button class="mode-btn selected" type="button" data-mode="normal" id="end-mode-normal">Normal</button>
            <button class="mode-btn" type="button" data-mode="hard" id="end-mode-hard">Hard</button>
            <button class="mode-btn" type="button" data-mode="endless" id="end-mode-endless">Endless</button>
          </div>
          <button class="btn btn-primary" id="restart-btn" type="button">Play Again</button>
          <button class="btn btn-ghost" id="menu-btn" type="button" style="margin-top:8px;width:100%">Main Menu</button>
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
      <div id="target-row" class="target-row hidden" role="group" aria-label="Target priority">
        <span class="target-label">Aim</span>
        <button class="target-btn" type="button" data-target="first" title="Enemy closest to the exit">First</button>
        <button class="target-btn" type="button" data-target="strongest" title="Enemy with the most health">Strong</button>
        <button class="target-btn" type="button" data-target="weakest" title="Enemy with the least health">Weak</button>
        <button class="target-btn" type="button" data-target="last" title="Enemy closest to the entrance">Last</button>
        <button class="target-btn" type="button" data-target="auto" title="Nearest enemy">Auto</button>
        <button class="target-btn invert" type="button" data-invert="1" title="Flip First and Last, Strong and Weak, and nearest and farthest">Invert</button>
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
        <div class="speed-row hidden" id="speed-row" role="group" aria-label="Endless speed">
          <span class="speed-label">Speed</span>
          <button class="speed-btn selected" type="button" data-speed="1">1×</button>
          <button class="speed-btn" type="button" data-speed="2">2×</button>
          <button class="speed-btn" type="button" data-speed="5">5×</button>
          <button class="speed-btn" type="button" data-speed="10">10×</button>
        </div>
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

    <div class="toolbar hidden" id="toolbar-lawn">
      ${(Object.keys(PLANTS) as PlantKind[])
        .map((kind) => {
          const d = PLANTS[kind];
          return `
            <button class="tower-btn" type="button" data-pkind="${kind}" id="pbtn-${kind}">
              <span class="name"><span class="swatch ${kind}"></span>${d.name}</span>
              <span class="meta">${d.cost} sun · ${d.description}</span>
            </button>
          `;
        })
        .join("")}
      <button class="tower-btn shovel-btn" type="button" id="btn-dig">
        <span class="name">Dig</span>
        <span class="meta">Remove a plant · no refund</span>
      </button>
      <div class="actions">
        <button class="btn btn-ghost" type="button" id="lcancel-btn">Cancel</button>
        <button class="btn btn-primary" type="button" id="lwave-btn">Start Wave</button>
      </div>
    </div>
  </div>
`;

const canvas = document.querySelector<HTMLCanvasElement>("#game")!;
const ctx = canvas.getContext("2d")!;
const bastion = new Game();
const dungeon = new DungeonGame();
const lawn = new LawnGame();

const brandTitle = document.querySelector<HTMLElement>("#brand-title")!;
const goldLabel = document.querySelector<HTMLElement>("#gold-label")!;
const goldEl = document.querySelector<HTMLElement>("#gold")!;
const livesEl = document.querySelector<HTMLElement>("#lives")!;
const waveEl = document.querySelector<HTMLElement>("#wave")!;
const shovelStatEl = document.querySelector<HTMLElement>("#shovel-stat")!;
const shovelStatWrap = document.querySelector<HTMLElement>("#shovel-stat-wrap")!;
const hintEl = document.querySelector<HTMLElement>("#hint")!;
const waveBtn = document.querySelector<HTMLButtonElement>("#wave-btn")!;
const dwaveBtn = document.querySelector<HTMLButtonElement>("#dwave-btn")!;
const lwaveBtn = document.querySelector<HTMLButtonElement>("#lwave-btn")!;
const cancelBtn = document.querySelector<HTMLButtonElement>("#cancel-btn")!;
const dcancelBtn = document.querySelector<HTMLButtonElement>("#dcancel-btn")!;
const lcancelBtn = document.querySelector<HTMLButtonElement>("#lcancel-btn")!;
const digBtn = document.querySelector<HTMLButtonElement>("#btn-dig")!;
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
const targetRow = document.querySelector<HTMLElement>("#target-row")!;
const carryBar = document.querySelector<HTMLElement>("#carry-bar")!;
const carryText = document.querySelector<HTMLElement>("#carry-text")!;
const carrySellBtn =
  document.querySelector<HTMLButtonElement>("#carry-sell-btn")!;
const shovelBtn = document.querySelector<HTMLButtonElement>("#btn-shovel")!;
const modeBadge = document.querySelector<HTMLElement>("#mode-badge")!;
const modeBlurb = document.querySelector<HTMLElement>("#mode-blurb")!;
const startHeading = document.querySelector<HTMLElement>("#start-heading")!;
const panelClassic = document.querySelector<HTMLElement>("#panel-classic")!;
const panelMinigames = document.querySelector<HTMLElement>("#panel-minigames")!;
const tabClassic = document.querySelector<HTMLButtonElement>("#tab-classic")!;
const tabMinigames = document.querySelector<HTMLButtonElement>("#tab-minigames")!;
const tabEditor = document.querySelector<HTMLButtonElement>("#tab-editor")!;
const panelEditor = document.querySelector<HTMLElement>("#panel-editor")!;
const menuBoard = document.querySelector<HTMLElement>("#menu-board")!;
const menuScoreList = document.querySelector<HTMLOListElement>("#menu-score-list")!;
const endlessScore = document.querySelector<HTMLElement>("#endless-score")!;
const endScoreList = document.querySelector<HTMLOListElement>("#end-score-list")!;
const scoreNameInput = document.querySelector<HTMLInputElement>("#score-name")!;
const scoreSaveBtn = document.querySelector<HTMLButtonElement>("#score-save")!;
const endModePicker = document.querySelector<HTMLElement>("#end-mode-picker")!;
const modePicker = document.querySelector<HTMLElement>(".mode-picker")!;
const toolbarBastion = document.querySelector<HTMLElement>("#toolbar-bastion")!;
const toolbarDungeon = document.querySelector<HTMLElement>("#toolbar-dungeon")!;
const toolbarLawn = document.querySelector<HTMLElement>("#toolbar-lawn")!;
const lawnCard = document.querySelector<HTMLButtonElement>("#minigame-lawn")!;
const dungeonCard = document.querySelector<HTMLButtonElement>("#minigame-dungeon")!;
const levelPicker = document.querySelector<HTMLElement>("#level-picker")!;
const modeNormalBtn = document.querySelector<HTMLButtonElement>("#mode-normal")!;
const modeHardBtn = document.querySelector<HTMLButtonElement>("#mode-hard")!;
const modeEndlessBtn =
  document.querySelector<HTMLButtonElement>("#mode-endless")!;
const endModeNormalBtn =
  document.querySelector<HTMLButtonElement>("#end-mode-normal")!;
const endModeHardBtn =
  document.querySelector<HTMLButtonElement>("#end-mode-hard")!;
const endModeEndlessBtn =
  document.querySelector<HTMLButtonElement>("#end-mode-endless")!;
const speedRow = document.querySelector<HTMLElement>("#speed-row")!;
const speedButtons = [
  ...speedRow.querySelectorAll<HTMLButtonElement>(".speed-btn"),
];

const GAME_SPEEDS = [1, 2, 5, 10] as const;
let gameSpeed: (typeof GAME_SPEEDS)[number] = 1;

let started = false;
let chosenDifficulty: Difficulty = "normal";
let chosenMode: GameMode = "bastion";
let chosenLevel = "road";
let activeMode: GameMode = "bastion";
let menuView: "classic" | "minigames" | "editor" = "classic";
let activeLevel: CustomLevel | null = null;
let savedThisRun = false;
let pendingScore: { wave: number; gold: number } | null = null;

function renderScoreList(list: HTMLOListElement, scores: EndlessScore[]): void {
  list.innerHTML = scores.length
    ? scores
        .map(
          (score, index) =>
            `<li><span>${index + 1}. ${escapeHtml(score.name)}</span><span>Wave ${score.wave} · ${score.gold}g</span></li>`,
        )
        .join("")
    : `<li class="empty">No endless runs yet.</li>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function refreshBoards(): void {
  const scores = loadScores(localStorage);
  renderScoreList(menuScoreList, scores);
  renderScoreList(endScoreList, scores);
}

function difficultyBlurb(mode: GameMode, difficulty: Difficulty): string {
  if (difficulty === "endless") {
    return "No final wave. Speed is 1×, 2×, 5×, or 10×. Enemy health compounds by 10% of the current total at waves 15, 20, 25, 40, then every 15 waves. From wave 30, enemies drop no gold. A normal Mint is unchanged. Only a Midas Bank prints twice as slowly. A Challenger on waves 30, 40, and every 10 after leaves two bosses.";
  }
  if (difficulty === "hard") {
    return "More enemies, more health, and a steeper ramp. Only true gamers would choose this.";
  }
  if (mode === "dungeon") {
    return "Adventurers are softer. Spikes, snares, goblins, and ogres are stronger.";
  }
  if (mode === "lawn") {
    return "30 seconds with no zombies. 50 sun to start. The lawn and each Sunbloom pay 25 sun every 20 seconds.";
  }
  return "Tanks heal to full health if nothing hits them for 3 seconds.";
}

function syncDifficultyButtons(difficulty: Difficulty): void {
  chosenDifficulty = difficulty;
  modeNormalBtn.classList.toggle("selected", difficulty === "normal");
  modeHardBtn.classList.toggle("selected", difficulty === "hard");
  modeEndlessBtn.classList.toggle("selected", difficulty === "endless");
  endModeNormalBtn.classList.toggle("selected", difficulty === "normal");
  endModeHardBtn.classList.toggle("selected", difficulty === "hard");
  endModeEndlessBtn.classList.toggle("selected", difficulty === "endless");
  modeBlurb.textContent = difficultyBlurb(chosenMode, difficulty);
  menuBoard.classList.toggle(
    "hidden",
    menuView !== "classic" || difficulty !== "endless",
  );
}

function syncGameModeButtons(mode: GameMode): void {
  chosenMode = mode;
  const editor = menuView === "editor";
  const minigames = !editor && mode !== "bastion";
  tabClassic.classList.toggle("selected", menuView === "classic");
  tabMinigames.classList.toggle("selected", menuView === "minigames");
  tabEditor.classList.toggle("selected", editor);
  tabClassic.setAttribute("aria-selected", String(menuView === "classic"));
  tabMinigames.setAttribute("aria-selected", String(menuView === "minigames"));
  tabEditor.setAttribute("aria-selected", String(editor));
  panelClassic.classList.toggle("hidden", menuView !== "classic");
  panelMinigames.classList.toggle("hidden", menuView !== "minigames");
  panelEditor.classList.toggle("hidden", !editor);
  startOverlay.classList.toggle("editor-open", editor && !started);
  modePicker.classList.toggle("hidden", editor);
  modeBlurb.classList.toggle("hidden", editor);
  startBtn.classList.toggle("hidden", editor);
  dungeonCard.classList.toggle("selected", mode === "dungeon");
  lawnCard.classList.toggle("selected", mode === "lawn");
  modeEndlessBtn.classList.toggle("hidden", minigames || editor);
  endModeEndlessBtn.classList.toggle("hidden", minigames || editor);
  if (minigames && chosenDifficulty === "endless") {
    syncDifficultyButtons("normal");
  }
  menuBoard.classList.toggle(
    "hidden",
    menuView !== "classic" || chosenDifficulty !== "endless",
  );
  startHeading.textContent = editor ? "Level Editor" : minigames ? "Minigames" : "Classic";
  startBtn.textContent =
    mode === "lawn"
      ? "Play Sun Lawn"
      : mode === "dungeon"
        ? "Play Dungeon Crawler"
        : "Start Classic";
  if (!editor) modeBlurb.textContent = difficultyBlurb(mode, chosenDifficulty);
  if (!started) {
    hintEl.textContent = editor
      ? "Lay the road, set gold and lives, then set the enemies in each wave."
      : mode === "lawn"
        ? "Plant on the lawn. The first 30 seconds have no zombies."
        : mode === "dungeon"
          ? "Select a trap or monster, then place it on the zigzag road."
          : "Select a tower, then click an empty grass tile to build.";
  }
  applyChrome(editor ? "bastion" : mode);
  if (editor && !started) {
    toolbarBastion.classList.add("hidden");
    toolbarDungeon.classList.add("hidden");
    toolbarLawn.classList.add("hidden");
  }
}

function applyChrome(mode: GameMode): void {
  activeMode = mode;
  brandTitle.textContent =
    mode === "lawn"
      ? "Sun Lawn"
      : mode === "dungeon"
        ? "Dungeon Crawler"
        : "Bastion Breach";
  goldLabel.textContent = mode === "lawn" ? "Sun" : "Gold";
  toolbarBastion.classList.toggle("hidden", mode !== "bastion");
  toolbarDungeon.classList.toggle("hidden", mode !== "dungeon");
  toolbarLawn.classList.toggle("hidden", mode !== "lawn");
  shovelStatWrap.classList.toggle("hidden", mode !== "bastion");
  bastionUpgrades.classList.toggle("hidden", mode !== "bastion");
  dungeonUpgrades.classList.toggle("hidden", mode !== "dungeon");
  carryBar.classList.add("hidden");
}

function syncBastionHud(hud: HudSnapshot): void {
  if (activeMode !== "bastion") return;
  goldEl.textContent = String(hud.gold);
  livesEl.textContent = String(hud.lives);
  waveEl.textContent =
    hud.difficulty === "endless" ? String(hud.wave) : `${hud.wave} / ${hud.totalWaves}`;
  shovelStatEl.textContent = hud.carrying
    ? "Carrying"
    : hud.shovelReady
      ? "Ready"
      : "Used";
  shovelStatEl.classList.toggle("ready", hud.shovelReady && !hud.carrying);
  shovelStatEl.classList.toggle("used", !hud.shovelReady && !hud.carrying);

  speedRow.classList.toggle("hidden", hud.difficulty !== "endless" || hud.custom);
  for (const btn of speedButtons) {
    btn.classList.toggle("selected", Number(btn.dataset.speed) === gameSpeed);
  }

  modeBadge.classList.remove("hidden", "regen", "endless", "custom");
  if (hud.custom) {
    modeBadge.classList.add("custom");
    modeBadge.textContent = "Custom";
  } else if (hud.difficulty === "hard") {
    modeBadge.textContent = "Hard";
  } else if (hud.difficulty === "endless") {
    modeBadge.classList.add("endless");
    modeBadge.textContent = "Endless";
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
    : hud.difficulty === "endless" || hud.wave < hud.totalWaves
      ? `Start Wave ${hud.wave + 1}`
      : "Complete";

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
      "Shovel: place on empty grass to move, or sell. Coins left in a Midas Bank come back in full.";
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
        ? ` · Bank ${t.banked}g → +${t.bankPayout}g next wave, then it leaves the bank`
        : "";
      upgradeStats.textContent = `During waves: ${t.goldPerTick}g / ${t.goldInterval}s${bankLine}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Income Max" : `+ Income (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Rate Max" : `+ Payout Rate (${t.speedCost}g)`;
      hintEl.textContent = t.special
        ? hud.difficulty === "endless" && hud.wave >= 30
          ? "From wave 30, this Midas Bank prints twice as slowly. The 25% deposit payout each wave stays the same. A normal Mint is not slowed."
          : "Midas Bank takes coins off your gold. Each wave pays 25% of what is stored, and that payout leaves the bank. Selling returns whatever is left."
        : "A Mint prints gold only while a wave is running, then stops. Endless does not change a normal Mint.";
      const showBank = t.special;
      mintDepositBtn.classList.toggle("hidden", !showBank);
      mintDepositAllBtn.classList.toggle("hidden", !showBank);
      mintDepositBtn.textContent = `Bank ${BANK_DEPOSIT_CHUNK}g`;
      mintDepositBtn.disabled = !started || hud.gold < BANK_DEPOSIT_CHUNK;
      mintDepositAllBtn.disabled = !started || hud.gold <= 0;
      syncTargeting(null);
    } else if (t.support) {
      const dmg = Math.round(t.buffDamage * 100);
      const spd = Math.round(t.buffRate * 100);
      upgradeStats.textContent = t.special
        ? `Buff +${dmg}% DMG · +${spd}% SPD · every tower`
        : `Buff +${dmg}% DMG · +${spd}% SPD · RNG ${t.range}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Damage Buff Max" : `+ Damage Buff (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Speed Buff Max" : `+ Speed Buff (${t.speedCost}g)`;
      hintEl.textContent = t.special
        ? `Grand Banner raises damage and attack speed of every tower. Banners stack, up to +${Math.round(BANNER_CAP * 100)}% each.`
        : "Banner does not shoot. Towers inside its range hit harder and faster.";
      mintDepositBtn.classList.add("hidden");
      mintDepositAllBtn.classList.add("hidden");
      syncTargeting(null);
    } else if (t.storm) {
      const buffLine =
        t.buffDamage > 0 || t.buffRate > 0
          ? ` · Banner +${Math.round(t.buffDamage * 100)}% DMG +${Math.round(t.buffRate * 100)}% SPD`
          : "";
      upgradeStats.textContent = `DMG ${t.damage} · SPD ${t.fireRate}/s · strikes anywhere${buffLine}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Damage Max" : `+ Damage (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Speed Max" : `+ Attack Speed (${t.speedCost}g)`;
      hintEl.textContent = t.special
        ? "Cloud Allies step onto the path every 15 seconds during a wave. Each has 200 health and hits for 40. Enemies strike back."
        : "Storm slaps lightning stickers on random spots. One in four strikes is guaranteed to hit a living enemy.";
      mintDepositBtn.classList.add("hidden");
      mintDepositAllBtn.classList.add("hidden");
      syncTargeting(null);
    } else if (t.kind === "mace") {
      const buffLine =
        t.buffDamage > 0 || t.buffRate > 0
          ? ` · Banner +${Math.round(t.buffDamage * 100)}% DMG`
          : "";
      upgradeStats.textContent = `Hit ${t.damage} · Area ${t.range} · ${t.special ? "3 maces" : "1 mace"}${buffLine}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Damage Max" : `+ Damage (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Area Max" : `+ Area (${t.speedCost}g)`;
      hintEl.textContent = t.special
        ? "Three maces spin through the circle. Damage and area upgrades both make the hits harder and the circle wider."
        : "One mace spins around the tower and strikes enemies it passes. Damage and area upgrades both raise the hit and the circle. Two More Maces adds two flails.";
      mintDepositBtn.classList.add("hidden");
      mintDepositAllBtn.classList.add("hidden");
      syncTargeting(null);
    } else {
      const buffLine =
        t.buffDamage > 0 || t.buffRate > 0
          ? ` · Banner +${Math.round(t.buffDamage * 100)}% DMG +${Math.round(t.buffRate * 100)}% SPD`
          : "";
      upgradeStats.textContent = t.flying
        ? `DMG ${t.damage} · SPD ${t.fireRate}/s · Hunts the whole map${buffLine}`
        : `DMG ${t.damage} · SPD ${t.fireRate}/s · RNG ${t.range}${buffLine}`;
      const glacier = t.kind === "frost" && t.special;
      upgradeDamageBtn.textContent = glacier
        ? "Damage refunded"
        : t.damageCost === null
          ? "Damage Max"
          : `+ Damage (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Speed Max" : `+ Attack Speed (${t.speedCost}g)`;
      hintEl.textContent = t.flying
        ? t.special
          ? "The wasp and its three drones each stick to one enemy until that enemy is destroyed."
          : "No range circle. The wasp flies to its target and stays until that enemy falls. Drone Wing adds three mini drones."
        : t.kind === "pyro"
          ? t.special
            ? "Inner Flame shrinks the radius and burns every enemy inside it. A slow still puts the fire out."
            : "Short range. A target that is not already burning takes extra damage. A slow removes the fire."
        : glacier
          ? "Glacier Field freezes in an area and refunds every damage upgrade on this tower."
          : `${t.specialName}: ${t.specialDescription}`;
      mintDepositBtn.classList.add("hidden");
      mintDepositAllBtn.classList.add("hidden");
      syncTargeting(t.targeting, t.inverted);
    }

    const glacierLocked = t.kind === "frost" && t.special;
    upgradeDamageBtn.disabled =
      !started || glacierLocked || t.damageCost === null || !t.canAffordDamage;
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
    syncTargeting(null);
    if (hud.tool === "shovel") {
      hintEl.textContent = hud.shovelReady
        ? "Shovel ready: click a tower to pick it up, then move or sell."
        : "Shovel already used this wave.";
    } else if (hud.selected === "nuke") {
      hintEl.textContent =
        "Nuke detonates where you place it. Every enemy is left with a sliver of health. Your towers in the 3×3 are destroyed. That crater cannot be built on for the rest of the run." +
        (hud.hasWater ? " Water puddles cannot hold a tower." : "");
    } else if (hud.selected) {
      hintEl.textContent = `${TOWER_DEFS[hud.selected].name} selected. Click grass to build.${hud.hasWater ? " Water puddles cannot hold a tower." : ""}`;
    } else {
      hintEl.textContent = "Select a tower, or click a placed tower to upgrade.";
    }
  }

  showEndIfNeeded(hud.phase, hud.difficulty, hud.wave, "bastion", hud.custom, hud.gold);
}

function syncTargeting(mode: TargetMode | null, inverted = false): void {
  targetRow.classList.toggle("hidden", mode === null);
  for (const btn of targetRow.querySelectorAll<HTMLButtonElement>(".target-btn")) {
    if (btn.dataset.invert) {
      btn.classList.toggle("selected", inverted);
      continue;
    }
    btn.classList.toggle("selected", btn.dataset.target === mode);
  }
}

function syncDungeonHud(hud: DungeonHud): void {
  if (activeMode !== "dungeon") return;
  speedRow.classList.add("hidden");
  syncTargeting(null);
  goldEl.textContent = String(hud.gold);
  livesEl.textContent = String(hud.lives);
  waveEl.textContent = `${hud.wave} / ${hud.totalWaves}`;

  modeBadge.classList.remove("regen", "endless", "custom");
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
        ? "Goblin hits everyone on the tile ahead. Adventurers have to attack there, not on the goblin itself."
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

function syncLawnHud(hud: LawnHud): void {
  if (activeMode !== "lawn") return;
  speedRow.classList.add("hidden");
  syncTargeting(null);
  goldEl.textContent = String(hud.gold);
  livesEl.textContent = String(hud.lives);
  waveEl.textContent = `${hud.wave} / ${hud.totalWaves}`;
  goldLabel.textContent = "Sun";

  modeBadge.classList.remove("regen", "endless", "custom");
  modeBadge.classList.toggle("hidden", hud.difficulty !== "hard");
  if (hud.difficulty === "hard") modeBadge.textContent = "Hard";

  const peace = hud.peaceLeft > 0;
  lwaveBtn.disabled =
    !started ||
    peace ||
    hud.waveInProgress ||
    hud.phase === "won" ||
    hud.phase === "lost";
  lwaveBtn.textContent = peace
    ? `No zombies · ${Math.ceil(hud.peaceLeft)}s`
    : hud.waveInProgress
      ? `Wave ${hud.wave}…`
      : hud.wave >= hud.totalWaves
        ? "Complete"
        : `Start Wave ${hud.wave + 1}`;

  for (const kind of Object.keys(PLANTS) as PlantKind[]) {
    const btn = document.querySelector<HTMLButtonElement>(`#pbtn-${kind}`)!;
    btn.disabled =
      !started ||
      hud.phase === "won" ||
      hud.phase === "lost" ||
      hud.gold < PLANTS[kind].cost;
    btn.classList.toggle("selected", hud.selected === kind && !hud.digging);
  }
  digBtn.classList.toggle("selected", hud.digging);

  if (hud.selectedPlant) {
    const plant = hud.selectedPlant;
    upgradeBar.classList.remove("hidden");
    upgradeTitle.textContent = `${plant.name} on the lawn`;
    upgradeStats.textContent = `HP ${plant.hp}/${plant.maxHp}`;
    sellBtn.textContent = "Dig";
    sellBtn.disabled = !started;
    hintEl.textContent = `${PLANTS[plant.kind].description}. Dig removes it and pays nothing back.`;
  } else {
    upgradeBar.classList.add("hidden");
    if (hud.digging) {
      hintEl.textContent = "Dig: click a plant to remove it. Sun is not refunded.";
    } else if (hud.selected) {
      const d = PLANTS[hud.selected];
      hintEl.textContent = peace
        ? `${Math.ceil(hud.peaceLeft)}s with no zombies. ${d.name} selected (${d.cost} sun). Click an empty lawn tile.`
        : `${d.name} selected (${d.cost} sun). Click an empty lawn tile.`;
    } else {
      hintEl.textContent = peace
        ? "The first 30 seconds have no zombies. Plant, then start the wave."
        : "The lawn drops 25 sun every 20 seconds. Sunblooms add another 25. Spitters cost 100.";
    }
  }

  showEndIfNeeded(hud.phase, hud.difficulty, hud.wave, "lawn");
}

function showEndIfNeeded(
  phase: string,
  difficulty: Difficulty,
  wave: number,
  mode: GameMode,
  custom = false,
  gold = 0,
): void {
  const endlessLoss = phase === "lost" && mode === "bastion" && difficulty === "endless" && !custom;
  endlessScore.classList.toggle("hidden", !endlessLoss);
  endModePicker.classList.toggle("hidden", custom);
  if (endlessLoss) {
    pendingScore = { wave, gold };
    scoreSaveBtn.disabled = savedThisRun;
    refreshBoards();
  }
  if (phase === "won") {
    endTitle.textContent =
      mode === "lawn"
        ? difficulty === "hard"
          ? "Lawn Held"
          : "Lawn Clear"
        : mode === "dungeon"
          ? difficulty === "hard"
            ? "Crawler Cleared"
            : "Dungeon Cleared"
          : custom
            ? "Level Clear"
            : difficulty === "hard"
              ? "Hard Victory"
              : "Victory";
    endMsg.textContent =
      mode === "lawn"
        ? "The last shambler fell before it reached the house."
        : mode === "dungeon"
          ? "No adventurer escaped the zigzag. Your traps and monsters held the road."
          : custom
            ? "Every wave on your road is down."
            : difficulty === "hard"
              ? "You held the line on Hard — even against the Final Boss."
              : "The Final Boss fell. The bastion holds.";
    syncDifficultyButtons(difficulty);
    endOverlay.classList.remove("hidden");
  } else if (phase === "lost") {
    endTitle.textContent =
      mode === "lawn"
        ? "They Reached the House"
        : mode === "dungeon"
          ? "Breach Escape"
          : custom
            ? "Road Fell"
            : "Breach";
    endMsg.textContent =
      mode === "lawn"
        ? `Shamblers crossed on wave ${wave}. Plant earlier and hold the lanes.`
        : mode === "dungeon"
          ? `Adventurers escaped on wave ${wave}. Fortify the road and try again.`
          : custom
            ? `Your level fell on wave ${wave}.`
            : difficulty === "endless"
              ? `The endless run ended on wave ${wave}. Put your name on the board.`
              : difficulty === "hard"
                ? `Hard mode crushed the line on wave ${wave}.`
                : `The line fell on wave ${wave}. Rebuild and try again.`;
    syncDifficultyButtons(difficulty);
    endOverlay.classList.remove("hidden");
  }
}

bastion.onHudChange = syncBastionHud;
dungeon.onHudChange = syncDungeonHud;
lawn.onHudChange = syncLawnHud;

function paintLevels(): void {
  levelPicker.innerHTML = CAMPAIGN.map((level) => {
    const water = level.water.length > 0 ? " · water" : "";
    return `<button class="level-btn${level.id === chosenLevel ? " selected" : ""}" type="button" data-level="${level.id}">
      <span class="level-name">${level.name}</span>
      <span class="level-meta">${level.waves} waves${water}</span>
    </button>`;
  }).join("");
}

syncGameModeButtons("bastion");
syncDifficultyButtons("normal");
applyChrome("bastion");
paintLevels();

levelPicker.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>(".level-btn");
  if (!btn?.dataset.level) return;
  chosenLevel = btn.dataset.level;
  paintLevels();
});

modeNormalBtn.addEventListener("click", () => syncDifficultyButtons("normal"));
modeHardBtn.addEventListener("click", () => syncDifficultyButtons("hard"));
modeEndlessBtn.addEventListener("click", () => syncDifficultyButtons("endless"));
speedRow.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>(
    ".speed-btn",
  );
  if (!btn?.dataset.speed) return;
  const next = Number(btn.dataset.speed);
  if (next !== 1 && next !== 2 && next !== 5 && next !== 10) return;
  gameSpeed = next;
  for (const other of speedButtons) {
    other.classList.toggle("selected", other === btn);
  }
});
endModeNormalBtn.addEventListener("click", () => syncDifficultyButtons("normal"));
endModeHardBtn.addEventListener("click", () => syncDifficultyButtons("hard"));
endModeEndlessBtn.addEventListener("click", () =>
  syncDifficultyButtons("endless"),
);
tabClassic.addEventListener("click", () => {
  menuView = "classic";
  activeLevel = null;
  syncGameModeButtons("bastion");
});
tabMinigames.addEventListener("click", () => {
  menuView = "minigames";
  activeLevel = null;
  syncGameModeButtons(chosenMode === "lawn" ? "lawn" : "dungeon");
});
tabEditor.addEventListener("click", () => {
  menuView = "editor";
  syncGameModeButtons("bastion");
});
dungeonCard.addEventListener("click", () => syncGameModeButtons("dungeon"));
lawnCard.addEventListener("click", () => syncGameModeButtons("lawn"));

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

for (const kind of Object.keys(PLANTS) as PlantKind[]) {
  document.querySelector(`#pbtn-${kind}`)!.addEventListener("click", () => {
    if (!started || activeMode !== "lawn") return;
    lawn.selectPlant(kind);
  });
}
digBtn.addEventListener("click", () => {
  if (!started || activeMode !== "lawn") return;
  lawn.selectDig();
});

cancelBtn.addEventListener("click", () => bastion.clearSelection());
dcancelBtn.addEventListener("click", () => dungeon.clearSelection());
lcancelBtn.addEventListener("click", () => lawn.clearSelection());

upgradeDamageBtn.addEventListener("click", () => {
  if (started && activeMode === "bastion") bastion.upgradeSelected("damage");
});
upgradeSpeedBtn.addEventListener("click", () => {
  if (started && activeMode === "bastion") bastion.upgradeSelected("speed");
});
upgradeSpecialBtn.addEventListener("click", () => {
  if (started && activeMode === "bastion") bastion.buySpecial();
});
targetRow.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>(
    ".target-btn",
  );
  if (!btn || !started || activeMode !== "bastion") return;
  if (btn.dataset.invert) {
    bastion.toggleInvert();
    return;
  }
  if (!btn.dataset.target) return;
  bastion.setTargeting(btn.dataset.target as TargetMode);
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
  else if (activeMode === "lawn") lawn.digSelected();
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
lwaveBtn.addEventListener("click", () => {
  if (started && activeMode === "lawn") lawn.startWave();
});

function startChosen(): void {
  started = true;
  savedThisRun = false;
  pendingScore = null;
  startOverlay.classList.remove("editor-open");
  startOverlay.classList.add("hidden");
  endOverlay.classList.add("hidden");
  applyChrome(chosenMode);
  if (chosenMode === "bastion" && activeLevel && menuView === "editor") {
    bastion.beginCustom(activeLevel);
    bastion.selectTower("archer");
  } else if (chosenMode === "bastion") {
    activeLevel = null;
    bastion.beginRun(chosenDifficulty, chosenLevel);
    bastion.selectTower("archer");
  } else if (chosenMode === "lawn") {
    lawn.beginRun(chosenDifficulty);
    lawn.selectPlant("sunbloom");
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
  syncGameModeButtons(menuView === "editor" ? "bastion" : chosenMode);
});
scoreSaveBtn.addEventListener("click", () => {
  if (!pendingScore || savedThisRun || pendingScore.wave < 1) return;
  const scores = saveScore(localStorage, {
    name: scoreNameInput.value,
    wave: pendingScore.wave,
    gold: pendingScore.gold,
    at: Date.now(),
  });
  savedThisRun = true;
  scoreSaveBtn.disabled = true;
  renderScoreList(menuScoreList, scores);
  renderScoreList(endScoreList, scores);
});
mountEditor(panelEditor, (level) => {
  activeLevel = level;
  menuView = "editor";
  chosenMode = "bastion";
  startChosen();
});
refreshBoards();

function pointerCell(e: PointerEvent) {
  if (activeMode === "bastion") {
    return bastion.screenToCell(e.clientX, e.clientY, canvas);
  }
  if (activeMode === "lawn") {
    return lawn.screenToCell(e.clientX, e.clientY, canvas);
  }
  return dungeon.screenToCell(e.clientX, e.clientY, canvas);
}

canvas.addEventListener("pointermove", (e) => {
  if (!started) return;
  const { col, row } = pointerCell(e);
  if (activeMode === "bastion") bastion.setHover(col, row);
  else if (activeMode === "lawn") lawn.setHover(col, row);
  else dungeon.setHover(col, row);
});

canvas.addEventListener("pointerleave", () => {
  bastion.setHover(-1, null);
  dungeon.setHover(-1, null);
  lawn.setHover(-1, null);
});

canvas.addEventListener("pointerdown", (e) => {
  if (!started) return;
  const { col, row } = pointerCell(e);
  if (activeMode === "bastion") bastion.handleClick(col, row);
  else if (activeMode === "lawn") lawn.handleClick(col, row);
  else dungeon.handleClick(col, row);
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (activeMode === "bastion") {
    const speed = bastion.difficulty === "endless" ? gameSpeed : 1;
    let left = dt * speed;
    while (left > 0) {
      const step = Math.min(0.05, left);
      bastion.update(step);
      left -= step;
    }
    bastion.draw(ctx);
  } else if (activeMode === "lawn") {
    lawn.update(dt);
    lawn.draw(ctx);
  } else {
    dungeon.update(dt);
    dungeon.draw(ctx);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
