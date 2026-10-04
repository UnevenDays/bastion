import "./style.css";
import { buildAlmanac, chapterFor, paintAlmanac, type AlmanacChapter } from "./almanac";
import {
  BANNER_CAP,
  BANNER_LIMIT,
  BANK_DEPOSIT_CHUNK,
  CLOUD_HP,
  TOWER_DEFS,
  cloudStrikeDamage,
  stormDamageUpgradeCost,
} from "./game/config";
import { DUNGEON_BUILDS, type DungeonBuildKind } from "./game/dungeonConfig";
import { DungeonGame, type DungeonHud } from "./game/dungeonEngine";
import { mountEditor } from "./editorPanel";
import { Game, type HudSnapshot } from "./game/engine";
import { PLANTS, type PlantKind } from "./game/lawnConfig";
import { LawnGame, type LawnHud } from "./game/lawnEngine";
import { CAMPAIGN, portalNote } from "./game/campaign";
import { TICKET_CAP, grantTickets, hallowPayout, loadTickets } from "./game/hallow";
import { loadScores, saveScore, type EndlessScore } from "./game/leaderboard";
import type { CustomLevel } from "./game/level";
import type { DeathRecap, Difficulty, GameMode, PatternKind, TargetMode, TowerKind } from "./game/types";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.classList.add("at-gate");

app.innerHTML = `
  <section class="gate" id="boot-screen" aria-label="Loading">
    <p class="gate-kicker">Bastion Breach</p>
    <h1 class="gate-title">Loading</h1>
    <p class="gate-tip" id="boot-tip"></p>
    <div class="load-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="boot-progress">
      <div class="load-bar" id="boot-bar"></div>
    </div>
    <p class="load-label" id="boot-label">0%</p>
  </section>

  <section class="gate hidden" id="home-screen">
    <p class="gate-kicker">Tower defense</p>
    <h1 class="gate-title">Bastion Breach</h1>
    <p class="home-lead">Hold the road across eight maps. Bring a short bench of towers, then spend the gold they earn.</p>
    <div class="home-actions">
      <button class="home-choice" type="button" id="home-classic">
        <span class="home-choice-name">Classic</span>
        <span class="home-choice-meta">Roads, bosses, and Endless</span>
      </button>
      <button class="home-choice" type="button" id="home-minigames">
        <span class="home-choice-name">Minigames</span>
        <span class="home-choice-meta">Dungeon Crawler and Sun Lawn</span>
      </button>
      <button class="home-choice" type="button" id="home-editor">
        <span class="home-choice-name">Level editor</span>
        <span class="home-choice-meta">Lay a road and choose its enemies</span>
      </button>
      <button class="home-choice" type="button" id="home-event">
        <span class="home-choice-name">Event</span>
        <span class="home-choice-meta">Hallow Gate pays event tickets</span>
      </button>
      <button class="home-choice" type="button" id="home-tutorial">
        <span class="home-choice-name">Tutorial</span>
        <span class="home-choice-meta">One Archer on the first bend, then the controls</span>
      </button>
      <button class="home-choice" type="button" id="home-almanac">
        <span class="home-choice-name">Almanac</span>
        <span class="home-choice-meta">What you have, and what works together</span>
      </button>
    </div>
  </section>

  <section class="gate hidden" id="draft-screen">
    <p class="gate-kicker">Classic</p>
    <h1 class="gate-title">Choose your towers</h1>
    <p class="home-lead" id="draft-lead">The tower limit is 8. Select which towers you want to bring.</p>
    <p class="draft-count" id="draft-count">0 / 8</p>
    <div class="draft-grid" id="draft-grid"></div>
    <div class="draft-actions">
      <button class="btn btn-ghost" type="button" id="draft-tutorial">Tutorial</button>
      <button class="btn btn-ghost" type="button" id="draft-almanac">Almanac</button>
      <button class="btn btn-ghost" type="button" id="draft-back">Back</button>
      <button class="btn btn-primary" type="button" id="draft-continue" disabled>Continue</button>
    </div>
  </section>

  <header class="top-bar">
    <div class="brand-wrap">
      <div class="brand" id="brand-title">Bastion Breach</div>
      <button class="almanac-open" type="button" id="tutorial-open">Tutorial</button>
      <button class="almanac-open" type="button" id="almanac-open">Almanac</button>
      <span class="mode-badge hidden" id="mode-badge">Hard</span>
      <span class="mode-badge warrant hidden" id="warrant-badge">Red Column</span>
    </div>
    <div class="stats" id="stats">
      <div class="stat"><span class="stat-label" id="gold-label">Gold</span><span class="stat-value gold" id="gold">0</span></div>
      <div class="speed-row" id="speed-row" role="group" aria-label="Game speed">
        <span class="speed-label">Speed</span>
        <button class="speed-btn" type="button" data-speed="0.5" title="Half speed. Click again for 1×.">0.5×</button>
        <button class="speed-btn" type="button" data-speed="1.25" title="1.25× speed. Click again for 1×.">1.25×</button>
        <button class="speed-btn" type="button" data-speed="2" title="Double speed. Click again for 1×.">2×</button>
        <button class="speed-btn" type="button" data-speed="5" title="5× speed. Click again for 1×.">5×</button>
      </div>
      <div class="stat"><span class="stat-label" id="lives-label">Lives</span><span class="stat-value lives" id="lives">0</span></div>
      <div class="stat"><span class="stat-label">Wave</span><span class="stat-value wave" id="wave">0</span></div>
      <div class="stat" id="shovel-stat-wrap"><span class="stat-label">Shovel</span><span class="stat-value shovel" id="shovel-stat">Ready</span></div>
    </div>
  </header>

  <div class="game-shell">
    <div class="canvas-wrap">
      <canvas id="game" width="768" height="480"></canvas>
      <div class="tutorial hidden" id="tutorial">
        <p class="tutorial-kicker" id="tutorial-kicker">Tutorial</p>
        <h2 id="tutorial-title">The first road</h2>
        <p class="tutorial-body" id="tutorial-body"></p>
        <div class="tutorial-actions">
          <button class="btn btn-ghost" type="button" id="tutorial-skip">Skip</button>
          <button class="btn btn-primary" type="button" id="tutorial-next">Next</button>
        </div>
      </div>
      <div class="overlay hidden" id="start-overlay">
        <div class="overlay-card overlay-wide">
          <button class="btn btn-ghost menu-home" type="button" id="back-home">Main menu</button>
          <div class="menu-tabs" role="tablist" aria-label="Menu">
            <button class="menu-tab selected" type="button" role="tab" id="tab-classic" aria-selected="true">Classic</button>
            <button class="menu-tab" type="button" role="tab" id="tab-minigames" aria-selected="false">Minigames</button>
            <button class="menu-tab" type="button" role="tab" id="tab-editor" aria-selected="false">Editor</button>
            <button class="menu-tab" type="button" role="tab" id="tab-event" aria-selected="false">Event</button>
          </div>
          <h2 id="start-heading">Classic</h2>

          <div id="panel-classic" class="menu-panel">
            <p class="mode-blurb" id="start-desc">Eight roads. Each one has its own ground, and three warrants. A warrant is a company: it sends one to four enemy kinds, and the button states its trick. Desert sends the Desert Husk. Marsh water, Orchard trees, Quarry rocks, and Night Watch fog each fight the line.</p>
            <p class="roster-note" id="roster-note"></p>
            <div class="level-picker" id="level-picker" role="group" aria-label="Level"></div>
            <p class="warrant-label">Warrant</p>
            <div class="warrant-picker" id="warrant-picker" role="group" aria-label="Warrant"></div>
            <p class="warrant-blurb" id="warrant-blurb"></p>
            <div id="menu-board" class="score-board hidden">
              <p class="score-title">Endless leaderboard</p>
              <p class="score-note">Saved on this browser. Highest wave, then gold.</p>
              <ol id="menu-score-list"></ol>
            </div>
          </div>
          <div id="panel-editor" class="menu-panel hidden"></div>
          <div id="panel-event" class="menu-panel hidden">
            <p class="mode-blurb">Hallow Gate is one night on a pumpkin road. Lanterns, wisps, coffins, tricks, crows, and cauldrons, then the Pumpkin King. A coffin heals if nothing hits it. A trick steals gold.</p>
            <div class="ticket-bar">
              <div class="ticket-bar-head">
                <span>Event tickets</span>
                <span id="ticket-count">0 / 24</span>
              </div>
              <div class="ticket-track" id="ticket-track" role="progressbar" aria-valuemin="0" aria-valuemax="24" aria-valuenow="0" aria-label="Event tickets">
                <div class="ticket-fill" id="ticket-fill"></div>
              </div>
              <p class="ticket-note" id="ticket-note">Clear Hallow Gate. The lives still on the gate become tickets.</p>
            </div>
            <div class="event-card">
              <span class="minigame-name">Hallow Gate</span>
              <span class="minigame-meta">Six waves. The yard is dark, and the last wave is the Pumpkin King.</span>
            </div>
          </div>
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
          <div id="death-recap" class="death-recap hidden">
            <p id="death-leaked"></p>
            <p id="death-spent"></p>
            <p id="death-tip"></p>
          </div>
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
        <button class="btn btn-upgrade hidden" type="button" id="upgrade-duration">+ Chill</button>
        <button class="btn btn-upgrade" type="button" id="upgrade-speed">+ Attack Speed</button>
        <button class="btn btn-special" type="button" id="upgrade-special">Special</button>
        <button class="btn btn-special hidden" type="button" id="mint-deposit">Bank 25g</button>
        <button class="btn btn-upgrade hidden" type="button" id="mint-deposit-all">Bank All</button>
      </div>
      <div id="target-row" class="target-row hidden" role="group" aria-label="Target priority">
        <span class="target-label">Aim</span>
        <button class="target-btn" type="button" data-target="first" title="Enemy closest to the exit"><span>First</span><span class="target-note">To the exit</span></button>
        <button class="target-btn" type="button" data-target="strongest" title="Enemy with the most health"><span>Strong</span><span class="target-note">Most health</span></button>
        <button class="target-btn" type="button" data-target="weakest" title="Enemy with the least health"><span>Weak</span><span class="target-note">Least health</span></button>
        <button class="target-btn" type="button" data-target="last" title="Enemy closest to the entrance"><span>Last</span><span class="target-note">To the entrance</span></button>
        <button class="target-btn" type="button" data-target="auto" title="Nearest enemy"><span>Auto</span><span class="target-note">Nearest</span></button>
        <button class="target-btn invert" type="button" data-invert="1" title="Flip First and Last, Strong and Weak, and nearest and farthest"><span>Invert</span><span class="target-note">Flip aim</span></button>
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
      <div class="tower-tray">
        <p class="bench-line hidden" id="bench-line"></p>
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
      </div>
      <div class="dock-rail">
        <button class="dock-toggle" type="button" aria-expanded="false" id="dock-bastion" title="Show the towers">
          <span class="dock-name" id="dock-bastion-name">Towers</span>
          <span class="dock-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="actions">
          <button class="btn btn-ghost" type="button" id="cancel-btn">Cancel</button>
          <button class="btn btn-primary" type="button" id="wave-btn">Start Wave</button>
        </div>
      </div>
    </div>

    <div class="toolbar hidden" id="toolbar-dungeon">
      <div class="tower-tray">
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
      </div>
      <div class="dock-rail">
        <button class="dock-toggle" type="button" aria-expanded="false" id="dock-dungeon" title="Show the defenses">
          <span class="dock-name" id="dock-dungeon-name">Defenses</span>
          <span class="dock-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="actions">
          <button class="btn btn-ghost" type="button" id="dcancel-btn">Cancel</button>
          <button class="btn btn-primary" type="button" id="dwave-btn">Start Wave</button>
        </div>
      </div>
    </div>

    <div class="toolbar hidden" id="toolbar-lawn">
      <div class="tower-tray">
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
      </div>
      <div class="dock-rail">
        <button class="dock-toggle" type="button" aria-expanded="false" id="dock-lawn" title="Show the plants">
          <span class="dock-name" id="dock-lawn-name">Plants</span>
          <span class="dock-chevron" aria-hidden="true">▾</span>
        </button>
        <div class="actions">
          <button class="btn btn-ghost" type="button" id="lcancel-btn">Cancel</button>
          <button class="btn btn-primary" type="button" id="lwave-btn">Start Wave</button>
        </div>
      </div>
    </div>
  </div>

  <div class="almanac hidden" id="almanac">
    <div class="book" role="dialog" aria-modal="true" aria-labelledby="almanac-title">
      <div class="book-top">
        <div>
          <p class="book-series">Field almanac</p>
          <h2 id="almanac-title">Classic</h2>
          <p id="almanac-sub"></p>
        </div>
        <button class="btn btn-ghost" type="button" id="almanac-close">Close</button>
      </div>
      <div class="book-tabs" role="tablist">
        <button class="book-tab selected" type="button" id="almanac-towers" data-chapter="towers">Towers</button>
        <button class="book-tab" type="button" id="almanac-enemies" data-chapter="enemies">Enemies</button>
      </div>
      <div class="book-spread">
        <nav class="book-index" id="almanac-index" aria-label="Entries"></nav>
        <article class="book-page" id="almanac-page"></article>
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
const statsEl = document.querySelector<HTMLElement>("#stats")!;
const goldLabel = document.querySelector<HTMLElement>("#gold-label")!;
const goldEl = document.querySelector<HTMLElement>("#gold")!;
const livesLabel = document.querySelector<HTMLElement>("#lives-label")!;
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
const deathRecapEl = document.querySelector<HTMLElement>("#death-recap")!;
const deathLeakedEl = document.querySelector<HTMLElement>("#death-leaked")!;
const deathSpentEl = document.querySelector<HTMLElement>("#death-spent")!;
const deathTipEl = document.querySelector<HTMLElement>("#death-tip")!;
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
const upgradeDurationBtn =
  document.querySelector<HTMLButtonElement>("#upgrade-duration")!;
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
const tabEvent = document.querySelector<HTMLButtonElement>("#tab-event")!;
const panelEditor = document.querySelector<HTMLElement>("#panel-editor")!;
const panelEvent = document.querySelector<HTMLElement>("#panel-event")!;
const ticketCountEl = document.querySelector<HTMLElement>("#ticket-count")!;
const ticketFillEl = document.querySelector<HTMLElement>("#ticket-fill")!;
const ticketTrackEl = document.querySelector<HTMLElement>("#ticket-track")!;
const ticketNoteEl = document.querySelector<HTMLElement>("#ticket-note")!;
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
const dockBastionName = document.querySelector<HTMLElement>("#dock-bastion-name")!;
const dockDungeonName = document.querySelector<HTMLElement>("#dock-dungeon-name")!;
const dockLawnName = document.querySelector<HTMLElement>("#dock-lawn-name")!;

function bindDock(toolbar: HTMLElement): void {
  const toggle = toolbar.querySelector<HTMLButtonElement>(".dock-toggle");
  if (!toggle) return;
  let coarse = false;
  const setOpen = (open: boolean) => {
    toolbar.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", String(open));
  };
  toolbar.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    setOpen(true);
  });
  toolbar.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") return;
    setOpen(false);
  });
  toggle.addEventListener("pointerup", (event) => {
    coarse = event.pointerType !== "mouse";
    if (!coarse) return;
    setOpen(!toolbar.classList.contains("open"));
  });
  toolbar.addEventListener("click", (event) => {
    if (!coarse) return;
    if (!(event.target as HTMLElement).closest(".tower-btn")) return;
    setOpen(false);
  });
}

bindDock(toolbarBastion);
bindDock(toolbarDungeon);
bindDock(toolbarLawn);
const lawnCard = document.querySelector<HTMLButtonElement>("#minigame-lawn")!;
const dungeonCard = document.querySelector<HTMLButtonElement>("#minigame-dungeon")!;
const levelPicker = document.querySelector<HTMLElement>("#level-picker")!;
const warrantPicker = document.querySelector<HTMLElement>("#warrant-picker")!;
const warrantBlurb = document.querySelector<HTMLElement>("#warrant-blurb")!;
const warrantBadge = document.querySelector<HTMLElement>("#warrant-badge")!;
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
const bootScreen = document.querySelector<HTMLElement>("#boot-screen")!;
const homeScreen = document.querySelector<HTMLElement>("#home-screen")!;
const draftScreen = document.querySelector<HTMLElement>("#draft-screen")!;
const bootTip = document.querySelector<HTMLElement>("#boot-tip")!;
const bootBar = document.querySelector<HTMLElement>("#boot-bar")!;
const bootLabel = document.querySelector<HTMLElement>("#boot-label")!;
const bootProgress = document.querySelector<HTMLElement>("#boot-progress")!;
const draftGrid = document.querySelector<HTMLElement>("#draft-grid")!;
const draftCount = document.querySelector<HTMLElement>("#draft-count")!;
const draftLead = document.querySelector<HTMLElement>("#draft-lead")!;
const draftContinue = document.querySelector<HTMLButtonElement>("#draft-continue")!;
const rosterNote = document.querySelector<HTMLElement>("#roster-note")!;
const almanacEl = document.querySelector<HTMLElement>("#almanac")!;
const almanacIndex = document.querySelector<HTMLElement>("#almanac-index")!;
const almanacPage = document.querySelector<HTMLElement>("#almanac-page")!;
const almanacTitle = document.querySelector<HTMLElement>("#almanac-title")!;
const almanacSub = document.querySelector<HTMLElement>("#almanac-sub")!;
const almanacTowersTab = document.querySelector<HTMLButtonElement>("#almanac-towers")!;
const almanacEnemiesTab = document.querySelector<HTMLButtonElement>("#almanac-enemies")!;
const tutorialEl = document.querySelector<HTMLElement>("#tutorial")!;
const tutorialKicker = document.querySelector<HTMLElement>("#tutorial-kicker")!;
const tutorialTitle = document.querySelector<HTMLElement>("#tutorial-title")!;
const tutorialBody = document.querySelector<HTMLElement>("#tutorial-body")!;
const tutorialNext = document.querySelector<HTMLButtonElement>("#tutorial-next")!;
const benchLine = document.querySelector<HTMLElement>("#bench-line")!;
const speedRow = document.querySelector<HTMLElement>("#speed-row")!;
const speedButtons = [
  ...speedRow.querySelectorAll<HTMLButtonElement>(".speed-btn"),
];

const GAME_SPEEDS = [0.5, 1.25, 2, 5] as const;
type GameSpeed = (typeof GAME_SPEEDS)[number];
/** 1× until a speed button is on. Clicking the lit rate again returns here. */
let gameSpeed = 1;

function isGameSpeed(value: number): value is GameSpeed {
  return GAME_SPEEDS.some((speed) => speed === value);
}

function paintSpeedButtons(): void {
  for (const btn of speedButtons) {
    btn.classList.toggle("selected", Number(btn.dataset.speed) === gameSpeed);
  }
}

const TOWER_LIMIT = 8;
const LOAD_TIPS = [
  "A Sapper stops on one tower and shuts it off for 4 seconds.",
  "From wave 15, Endless alternates Armor and Marked every five waves.",
  "Marked enemies ignore every tower that is not set to Strongest.",
  "Marsh water cannot hold a tower. The other roads leave the grass open.",
  "The Shovel can move or sell one tower each wave.",
  "A Mint prints gold only while a wave is running.",
  "The Nuke leaves a crater. Nothing can be built there for the rest of the run.",
  "A Chomp on a Marked wave bites only if it is set to Strongest.",
  "Kill a Bandit within 4 seconds and it drops 8 extra gold. A kill still returns 20% of what it stole.",
  "Night Watch glimmers, Quarry is cut stone, and Orchard carries blossom.",
  "A Desert Husk cracks at half health, then it sprints.",
  "From wave 6 the pack's health is multiplied, and a kill leaves a weaker enemy.",
  "From wave 8, a gold crown marks an elite: more health, and more gold when it dies.",
  "The field holds 3 banners. Only one of them can be a Grand Banner.",
  "The bastion holds the exit. Leaks crack the gate, and it mends between waves.",
  "The almanac lists your bench, the enemies on the road, and which towers work together.",
  "The tutorial puts one Archer on the first bend and shows the range over both roads.",
  "Hallow Gate pays event tickets for the lives still on the gate.",
];

let loadout: TowerKind[] = [];

const TUTORIAL_KEY = "bastion-tutorial-seen";
const TUTORIAL_TILE = { col: 3, row: 3 };
const TUTORIAL_STEPS = [
  {
    id: "road",
    kicker: "1 · The road",
    title: "Hold the first road",
    body: "Enemies enter at IN and walk to the gate. The gate is your lives. Gold pays for towers. This lesson places one Archer.",
    accept: false,
    blockWave: true,
    next: "Next",
  },
  {
    id: "board",
    kicker: "2 · Board control",
    title: "Corners cover two roads",
    body: "Build on grass. The road itself is blocked. The gold ring is an Archer's range over the first bend. It covers the road into the corner and the road leaving it.",
    accept: false,
    blockWave: true,
    next: "Next",
  },
  {
    id: "place",
    kicker: "3 · Place",
    title: "Put the Archer on the lit tile",
    body: "Click the lit grass inside the ring. This lesson accepts only that tile.",
    accept: true,
    blockWave: true,
    next: "Waiting for the Archer",
  },
  {
    id: "range",
    kicker: "4 · Range",
    title: "The ring stays on the bend",
    body: "The Archer is down. Enemies on both legs of the corner walk through that circle. A tower on a straight covers one line. This one covers two.",
    accept: false,
    blockWave: true,
    next: "Next",
  },
  {
    id: "mechanics",
    kicker: "5 · Mechanics",
    title: "Aim, gold, and the wave",
    body: "Start Wave sends the pack. The Archer aims First, the enemy closest to the gate. Select the tower to switch to Strong, Weak, Last, or Auto. Invert flips that choice. Damage and Attack Speed spend gold between waves.",
    accept: false,
    blockWave: true,
    next: "Next",
  },
  {
    id: "control",
    kicker: "6 · The board",
    title: "Shovel, gate, and the book",
    body: "The Shovel moves or sells one tower each wave. Between waves the gate mends, and Repair or Reinforce spend gold on it. The Almanac lists your bench and which towers work together. Start the wave when you are ready.",
    accept: false,
    blockWave: false,
    next: "Start Wave",
  },
] as const;

let tutorialIndex: number | null = null;
let almanacChapter: AlmanacChapter = "towers";
let almanacId: string | null = null;

function randomTip(): string {
  return LOAD_TIPS[Math.floor(Math.random() * LOAD_TIPS.length)]!;
}

function showStage(stage: "boot" | "home" | "draft" | "menu" | "play"): void {
  bootScreen.classList.toggle("hidden", stage !== "boot");
  homeScreen.classList.toggle("hidden", stage !== "home");
  draftScreen.classList.toggle("hidden", stage !== "draft");
  const inMatch = stage === "menu" || stage === "play";
  app.classList.toggle("at-gate", !inMatch);
  if (stage !== "menu") startOverlay.classList.add("hidden");
  if (stage === "menu") startOverlay.classList.remove("hidden");
  if (stage !== "play") warrantBadge.classList.add("hidden");
}

function runLoad(then: () => void): void {
  const tip = randomTip();
  bootTip.textContent = tip;
  bootBar.style.width = "0%";
  bootLabel.textContent = "0%";
  bootProgress.setAttribute("aria-valuenow", "0");
  showStage("boot");
  const began = performance.now();
  const duration = 1700;
  const step = (now: number) => {
    const t = Math.min(1, (now - began) / duration);
    const pct = Math.round(t * 100);
    bootBar.style.width = `${pct}%`;
    bootLabel.textContent = `${pct}%`;
    bootProgress.setAttribute("aria-valuenow", String(pct));
    if (t < 1) requestAnimationFrame(step);
    else then();
  };
  requestAnimationFrame(step);
}

function paintDraft(): void {
  draftCount.textContent = `${loadout.length} / ${TOWER_LIMIT}`;
  draftLead.textContent =
    loadout.length >= TOWER_LIMIT
      ? "The tower limit is 8. Deselect one if you want a different tower."
      : "The tower limit is 8. Select which towers you want to bring.";
  draftContinue.disabled = loadout.length === 0;
  draftGrid.innerHTML = (Object.keys(TOWER_DEFS) as TowerKind[])
    .map((kind) => {
      const def = TOWER_DEFS[kind];
      const on = loadout.includes(kind);
      return `<button class="draft-card${on ? " selected" : ""}" type="button" data-draft="${kind}" aria-pressed="${on}">
        <span class="name"><span class="swatch ${kind}"></span>${def.name}<span class="added">${on ? "Added" : "Add"}</span></span>
        <span class="meta">${def.cost}g · ${def.description}</span>
      </button>`;
    })
    .join("");
}

function toggleDraft(kind: TowerKind): void {
  if (loadout.includes(kind)) {
    loadout = loadout.filter((item) => item !== kind);
  } else if (loadout.length < TOWER_LIMIT) {
    loadout = [...loadout, kind];
  }
  paintDraft();
}

function rosterNames(): string[] {
  return loadout.map((kind) => TOWER_DEFS[kind].name);
}

function almanacMode(): GameMode {
  const menuOpen = !startOverlay.classList.contains("hidden");
  if (started && !menuOpen) return activeMode;
  if (menuOpen && menuView === "minigames") return chosenMode === "lawn" ? "lawn" : "dungeon";
  return "bastion";
}

function currentAlmanacQuery() {
  const mode = almanacMode();
  const menuOpen = !startOverlay.classList.contains("hidden");
  const editor =
    mode === "bastion" && ((started && activeLevel !== null) || (menuOpen && menuView === "editor"));
  const level = CAMPAIGN.find((item) => item.id === chosenLevel) ?? CAMPAIGN[0]!;
  const warrant = level.warrants[warrantByLevel.get(level.id) ?? 0] ?? level.warrants[0]!;
  const faced = new Set<string>();
  let roadLabel = `${level.name} · ${warrant.name}. ${warrant.gimmick}`;
  if (editor) {
    roadLabel = "This level";
    if (activeLevel) {
      for (const wave of activeLevel.waves) {
        for (const group of wave.enemies) faced.add(group.kind);
      }
    }
  } else if (mode === "bastion") {
    for (const kind of warrant.enemies) faced.add(kind);
    if (level.portals.length > 1) {
      roadLabel += ` ${level.portals.length} blue portals. Later ones open along the road, and each adds 10% more enemies.`;
    }
    faced.add("boss");
    faced.add(chosenDifficulty === "endless" ? "challenger" : "finalBoss");
  }
  return {
    mode,
    bench: loadout,
    benchLimited: mode === "bastion" && !editor && loadout.length > 0,
    built: started && mode === "bastion" ? bastion.placedCounts() : {},
    volley: started && mode === "bastion" ? bastion.gateHasVolley() : false,
    faced: [...faced],
    roadLabel,
    custom: editor,
  };
}

function refreshAlmanac(): void {
  const book = buildAlmanac(currentAlmanacQuery());
  almanacTowersTab.classList.toggle("selected", almanacChapter === "towers");
  almanacEnemiesTab.classList.toggle("selected", almanacChapter === "enemies");
  almanacId = paintAlmanac(
    almanacIndex,
    almanacPage,
    almanacTitle,
    almanacSub,
    book,
    almanacChapter,
    almanacId,
  );
}

function openAlmanac(): void {
  almanacEl.classList.remove("hidden");
  refreshAlmanac();
}

function closeAlmanac(): void {
  almanacEl.classList.add("hidden");
}

function paintRosterNote(): void {
  const names = rosterNames();
  rosterNote.textContent =
    names.length === 0
      ? "No towers added yet. Start Classic opens the list so you can add up to 8."
      : `Added: ${names.join(", ")}.`;
}

function applyTowerRoster(): void {
  const limited = started && activeMode === "bastion" && menuView !== "editor" && loadout.length > 0;
  const names = rosterNames();
  benchLine.classList.toggle("hidden", !limited);
  benchLine.textContent = limited ? `Added: ${names.join(", ")}` : "";
  for (const kind of Object.keys(TOWER_DEFS) as TowerKind[]) {
    const btn = document.querySelector<HTMLButtonElement>(`#btn-${kind}`)!;
    const hide = limited && !loadout.includes(kind);
    btn.classList.toggle("out-of-loadout", hide);
    btn.style.display = hide ? "none" : "";
  }
}

function showTutorialStep(index: number): void {
  const step = TUTORIAL_STEPS[index];
  if (!step) {
    finishTutorial(false);
    return;
  }
  tutorialIndex = index;
  tutorialKicker.textContent = step.kicker;
  tutorialTitle.textContent = step.title;
  tutorialBody.textContent = step.body;
  const waiting = step.id === "place" && !bastion.tutorialPlaced();
  tutorialNext.textContent = step.next;
  tutorialNext.disabled = waiting;
  tutorialEl.classList.remove("hidden");
  bastion.setTutorial(TUTORIAL_TILE, { accept: step.accept && waiting, blockWave: step.blockWave });
}

function startTutorial(): void {
  closeAlmanac();
  chosenMode = "bastion";
  chosenDifficulty = "normal";
  chosenLevel = "road";
  warrantByLevel.set("road", 0);
  menuView = "classic";
  activeLevel = null;
  loadout = ["archer"];
  startChosen();
  showTutorialStep(0);
}

function finishTutorial(startWave: boolean): void {
  localStorage.setItem(TUTORIAL_KEY, "1");
  tutorialIndex = null;
  tutorialEl.classList.add("hidden");
  bastion.setTutorial(null);
  if (startWave) bastion.startWave();
}

function abandonTutorial(): void {
  localStorage.setItem(TUTORIAL_KEY, "1");
  tutorialIndex = null;
  tutorialEl.classList.add("hidden");
  bastion.setTutorial(null);
  showHome();
}

function showHome(): void {
  if (tutorialIndex !== null) {
    tutorialIndex = null;
    tutorialEl.classList.add("hidden");
    bastion.setTutorial(null);
  }
  started = false;
  endOverlay.classList.add("hidden");
  deathRecapEl.classList.add("hidden");
  modeBadge.classList.add("hidden");
  showStage("home");
  applyChrome(activeMode);
}

let started = false;
let chosenDifficulty: Difficulty = "normal";
let chosenMode: GameMode = "bastion";
let chosenLevel = "road";
const warrantByLevel = new Map<string, number>();
let activeMode: GameMode = "bastion";
let menuView: "classic" | "minigames" | "editor" | "event" = "classic";
let eventAwarded = false;
let eventGrant = { gained: 0, total: 0 };
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
    return "No final wave. Next to gold, the match can run at 0.5×, 1.25×, 2×, or 5×. Enemy health compounds by 10% of the current total at waves 15, 20, 25, 40, then every 15 waves. From wave 15, every five waves alternate: Armor soaks damage off each hit, then Marked, where only towers set to Strongest can hurt the pack. From wave 30, enemies drop no gold. A normal Mint is unchanged. Only a Midas Bank prints twice as slowly. A Challenger on waves 30, 40, and every 10 after leaves two bosses.";
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

function paintTickets(): void {
  const total = loadTickets(localStorage);
  ticketCountEl.textContent = `${total} / ${TICKET_CAP}`;
  ticketFillEl.style.width = `${(total / TICKET_CAP) * 100}%`;
  ticketTrackEl.setAttribute("aria-valuemax", String(TICKET_CAP));
  ticketTrackEl.setAttribute("aria-valuenow", String(total));
  ticketNoteEl.textContent =
    total >= TICKET_CAP
      ? "The ticket bar is full."
      : total > 0
        ? "Another clear adds the lives still on the gate."
        : "Clear Hallow Gate. The lives still on the gate become tickets.";
}

function ticketPhrase(count: number): string {
  return count === 1 ? "1 event ticket" : `${count} event tickets`;
}

function syncGameModeButtons(mode: GameMode): void {
  chosenMode = mode;
  const editor = menuView === "editor";
  const event = menuView === "event";
  const minigames = !editor && !event && mode !== "bastion";
  tabClassic.classList.toggle("selected", menuView === "classic");
  tabMinigames.classList.toggle("selected", menuView === "minigames");
  tabEditor.classList.toggle("selected", editor);
  tabEvent.classList.toggle("selected", event);
  tabClassic.setAttribute("aria-selected", String(menuView === "classic"));
  tabMinigames.setAttribute("aria-selected", String(menuView === "minigames"));
  tabEditor.setAttribute("aria-selected", String(editor));
  tabEvent.setAttribute("aria-selected", String(event));
  panelClassic.classList.toggle("hidden", menuView !== "classic");
  panelMinigames.classList.toggle("hidden", menuView !== "minigames");
  panelEditor.classList.toggle("hidden", !editor);
  panelEvent.classList.toggle("hidden", !event);
  if (event) paintTickets();
  startOverlay.classList.toggle("editor-open", editor && !started);
  modePicker.classList.toggle("hidden", editor || event);
  modeBlurb.classList.toggle("hidden", editor || event);
  startBtn.classList.toggle("hidden", editor);
  dungeonCard.classList.toggle("selected", mode === "dungeon");
  lawnCard.classList.toggle("selected", mode === "lawn");
  modeEndlessBtn.classList.toggle("hidden", minigames || editor || event);
  endModeEndlessBtn.classList.toggle("hidden", minigames || editor || event);
  if (minigames && chosenDifficulty === "endless") {
    syncDifficultyButtons("normal");
  }
  menuBoard.classList.toggle(
    "hidden",
    menuView !== "classic" || chosenDifficulty !== "endless",
  );
  startHeading.textContent = editor
    ? "Level Editor"
    : event
      ? "Event"
      : minigames
        ? "Minigames"
        : "Classic";
  startBtn.textContent = event
    ? "Enter Hallow Gate"
    : mode === "lawn"
      ? "Play Sun Lawn"
      : mode === "dungeon"
        ? "Play Dungeon Crawler"
        : "Start Classic";
  if (!minigames && !editor && !event) paintRosterNote();
  if (!editor) modeBlurb.textContent = difficultyBlurb(mode, chosenDifficulty);
  if (!started) {
    hintEl.textContent = editor
      ? "Lay the road, set gold and lives, then set the enemies in each wave."
      : event
        ? "Hallow Gate is a night yard. Build on the dark grass."
        : mode === "lawn"
        ? "Plant on the lawn. The first 30 seconds have no zombies."
        : mode === "dungeon"
          ? "Select a trap or monster, then place it on the zigzag road."
          : "Select a tower, then click an empty grass tile to build.";
  }
  applyChrome(editor || event ? "bastion" : mode);
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
  toolbarBastion.classList.toggle("hidden", mode !== "bastion" || !started);
  toolbarDungeon.classList.toggle("hidden", mode !== "dungeon" || !started);
  toolbarLawn.classList.toggle("hidden", mode !== "lawn" || !started);
  hintEl.classList.toggle("hidden", !started);
  statsEl.classList.toggle("hidden", !started);
  shovelStatWrap.classList.toggle("hidden", mode !== "bastion");
  bastionUpgrades.classList.toggle("hidden", mode !== "bastion");
  dungeonUpgrades.classList.toggle("hidden", mode !== "dungeon");
  carryBar.classList.add("hidden");
}

function syncBastionHud(hud: HudSnapshot): void {
  if (activeMode !== "bastion") return;
  goldEl.textContent = String(hud.gold);
  livesLabel.textContent = "Gate";
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

  modeBadge.classList.remove(
    "hidden",
    "regen",
    "classic",
    "dungeon",
    "lawn",
    "endless",
    "custom",
    "hallow",
    "armor",
    "marked",
  );
  if (hud.event === "hallow") {
    modeBadge.classList.add("hallow");
    modeBadge.textContent = "Hallow";
    brandTitle.textContent = "Hallow Gate";
  } else if (hud.custom) {
    modeBadge.classList.add("custom");
    modeBadge.textContent = "Custom";
  } else if (hud.difficulty === "hard") {
    modeBadge.textContent = "Hard";
  } else if (hud.difficulty === "endless") {
    const mutator =
      hud.mutator === "armor" ? "Armor" : hud.mutator === "marked" ? "Marked" : "Endless";
    modeBadge.classList.add(hud.mutator === "none" ? "endless" : hud.mutator);
    modeBadge.textContent = mutator;
  } else {
    modeBadge.classList.add("classic");
    modeBadge.textContent = "Classic";
  }

  warrantBadge.textContent = hud.warrantName;
  warrantBadge.title = hud.warrantGimmick;
  warrantBadge.classList.toggle("hidden", !started || hud.custom || !hud.warrantName);

  const lesson = tutorialIndex !== null ? TUTORIAL_STEPS[tutorialIndex] : null;
  waveBtn.disabled =
    !started ||
    hud.waveInProgress ||
    hud.carrying ||
    hud.phase === "won" ||
    hud.phase === "lost" ||
    !!lesson?.blockWave;
  const mutatorTag =
    hud.mutator === "armor" ? " · Armor" : hud.mutator === "marked" ? " · Marked" : "";
  const pressureTag = hud.pressure > 1 ? ` · ×${hud.pressure.toFixed(2)}` : "";
  const eliteTag = hud.elites ? " · Crown" : "";
  const portalTag = hud.portalOpens ? " · Portal" : "";
  waveBtn.textContent = hud.waveInProgress
    ? `Wave ${hud.wave}${pressureTag}${mutatorTag}${eliteTag}${portalTag}…`
    : hud.difficulty === "endless" || hud.wave < hud.totalWaves
      ? `Start Wave ${hud.wave + 1}${pressureTag}${mutatorTag}${eliteTag}${portalTag}`
      : "Complete";

  applyTowerRoster();
  for (const kind of Object.keys(TOWER_DEFS) as TowerKind[]) {
    const btn = document.querySelector<HTMLButtonElement>(`#btn-${kind}`)!;
    btn.disabled =
      !started ||
      hud.carrying ||
      hud.phase === "won" ||
      hud.phase === "lost" ||
      hud.gold < TOWER_DEFS[kind].cost ||
      (kind === "banner" && hud.banners >= BANNER_LIMIT);
    btn.title =
      kind === "banner" && hud.banners >= BANNER_LIMIT
        ? "Three banners is the limit"
        : "";
    btn.classList.toggle(
      "selected",
      hud.selected === kind && hud.tool === "build",
    );
  }

  shovelBtn.disabled =
    !started ||
    hud.phase === "won" ||
    hud.phase === "lost" ||
    (!hud.shovelReady && !hud.carrying) ||
    lesson !== null;
  shovelBtn.classList.toggle("selected", hud.tool === "shovel" || hud.carrying);
  dockBastionName.textContent = hud.carrying || hud.tool === "shovel"
    ? "Shovel"
    : hud.selected
      ? TOWER_DEFS[hud.selected].name
      : "Towers";

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
    upgradeDurationBtn.classList.add("hidden");
    upgradeSpeedBtn.classList.remove("hidden");
    sellBtn.classList.remove("hidden");
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
        : `Buff +${dmg}% DMG · +${spd}% SPD · Area ${t.range}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Damage Buff Max" : `+ Damage Buff (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Speed Buff Max" : `+ Speed Buff (${t.speedCost}g)`;
      hintEl.textContent = t.special
        ? `Grand Banner raises damage and attack speed of every tower. Only one Grand Banner can stand. Area ranks are for a normal Banner. Banners stack, up to +${Math.round(BANNER_CAP * 100)}% each.`
        : t.grandTaken
          ? `Only one Grand Banner can stand. This banner still buffs towers in range. Area widens that circle. Banners on the field: ${hud.banners} of ${BANNER_LIMIT}.`
          : `Banner does not shoot. Towers inside its range hit harder and faster. Area widens that circle. Banners on the field: ${hud.banners} of ${BANNER_LIMIT}. Only one can be a Grand Banner.`;
      upgradeDurationBtn.classList.remove("hidden");
      upgradeDurationBtn.textContent = t.special
        ? "Whole map"
        : t.durationCost === null
          ? "Area Max"
          : `+ Area (${t.durationCost}g)`;
      mintDepositBtn.classList.add("hidden");
      mintDepositAllBtn.classList.add("hidden");
      syncTargeting(null);
    } else if (t.storm) {
      const buffLine =
        t.buffDamage > 0 || t.buffRate > 0
          ? ` · Banner +${Math.round(t.buffDamage * 100)}% DMG +${Math.round(t.buffRate * 100)}% SPD`
          : "";
      upgradeStats.textContent = `DMG ${t.damage} · SPD ${t.fireRate}/s · Hit ${Math.round(t.hitChance * 100)}%${buffLine}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Damage Max" : `+ Damage (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Speed Max" : `+ Attack Speed (${t.speedCost}g)`;
      upgradeDurationBtn.classList.remove("hidden");
      upgradeDurationBtn.textContent =
        t.durationCost === null ? "Hit Chance Max" : `+ Hit Chance (${t.durationCost}g)`;
      const cloudHit = Math.round(cloudStrikeDamage(t.damageLevel));
      const rankPrice = [0, 1, 2].map((level) => `${stormDamageUpgradeCost(level)}`).join(", then ");
      hintEl.textContent = t.special
        ? `Cloud Allies send a cloud onto the path every 15 seconds, up to five. Each has ${CLOUD_HP} health and hits for ${cloudHit}. The last Damage rank is +55%, and those ranks cost ${rankPrice}. Enemies strike back. A small cloud marks this tower.`
        : `Storm sticks lightning on random spots. Damage ranks end at +55% and cost ${rankPrice}. Hit Chance makes more of those strikes lock onto a living enemy.`;
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
    } else if (t.kind === "sniper") {
      const buffLine =
        t.buffDamage > 0 || t.buffRate > 0
          ? ` · Banner +${Math.round(t.buffDamage * 100)}% DMG +${Math.round(t.buffRate * 100)}% SPD`
          : "";
      upgradeStats.textContent = `DMG ${t.damage} · SPD ${t.fireRate}/s · no range limit${buffLine}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Damage Max" : `+ Damage (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Speed Max" : `+ Attack Speed (${t.speedCost}g)`;
      hintEl.textContent = t.supplyReady
        ? "No range limit. The bullet is slow and heavy. Supply Drop gives 1 life and 35 gold, once this wave."
        : "Supply Drop was already called this wave. It is ready again when the wave ends, at a higher price.";
      mintDepositBtn.classList.add("hidden");
      mintDepositAllBtn.classList.add("hidden");
      syncTargeting(t.targeting, t.inverted);
    } else if (t.kind === "cannon") {
      const buffLine =
        t.buffDamage > 0 || t.buffRate > 0
          ? ` · Banner +${Math.round(t.buffDamage * 100)}% DMG +${Math.round(t.buffRate * 100)}% SPD`
          : "";
      upgradeStats.textContent = `DMG ${t.damage} · Blast ${t.splash} · SPD ${t.fireRate}/s · RNG ${t.range}${buffLine}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Area Damage Max" : `+ Area Damage (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Speed Max" : `+ Attack Speed (${t.speedCost}g)`;
      hintEl.textContent = t.special
        ? "Focus Charge hits harder, reaches less far, and fires faster. Area Damage widens the blast and raises its damage."
        : "The blast is tight. Area Damage widens it and hits harder. Focus Charge adds damage, shortens range, and fires faster.";
      mintDepositBtn.classList.add("hidden");
      mintDepositAllBtn.classList.add("hidden");
      syncTargeting(t.targeting, t.inverted);
    } else if (t.kind === "chomp") {
      const buffLine =
        t.buffRate > 0 ? ` · Banner shortens the nap` : "";
      upgradeStats.textContent = `Sleep ${t.sleepSeconds}s · Area ${t.range} · eats ${t.bites}${buffLine}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Area Max" : `+ Area (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Sleep Max" : `+ Shorter Sleep (${t.speedCost}g)`;
      hintEl.textContent = t.special
        ? "Double Bite swallows two enemies in the circle, then the Chomp sleeps once. Area widens the circle. Shorter Sleep cuts the nap."
        : "The Chomp swallows one enemy in its circle, then sleeps for 25 seconds. Area widens the circle. Shorter Sleep cuts 5 seconds off the nap. Double Bite swallows two.";
      mintDepositBtn.classList.add("hidden");
      mintDepositAllBtn.classList.add("hidden");
      syncTargeting(t.targeting, t.inverted);
    } else if (t.kind === "frost" && t.special) {
      upgradeDurationBtn.classList.remove("hidden");
      upgradeStats.textContent = `Moves at ${Math.round(t.slow * 100)}% speed · Area ${t.range} · Chill ${t.slowDuration}s · Pulse ${t.pulse}s`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Area Max" : `+ Area (${t.damageCost}g)`;
      upgradeDurationBtn.textContent =
        t.durationCost === null ? "Chill Max" : `+ Chill (${t.durationCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Cooldown Max" : `+ Shorter Cooldown (${t.speedCost}g)`;
      hintEl.textContent =
        "Glacier Field pulses a chill. Area widens the circle. Chill makes the slow last longer. Shorter Cooldown makes the next pulse come sooner. Damage ranks are refunded when you buy it.";
      mintDepositBtn.classList.add("hidden");
      mintDepositAllBtn.classList.add("hidden");
      syncTargeting(t.targeting, t.inverted);
    } else {
      const buffLine =
        t.buffDamage > 0 || t.buffRate > 0
          ? ` · Banner +${Math.round(t.buffDamage * 100)}% DMG +${Math.round(t.buffRate * 100)}% SPD`
          : "";
      upgradeStats.textContent = t.flying
        ? `DMG ${t.damage} · SPD ${t.fireRate}/s · Hunts the whole map${buffLine}`
        : t.kind === "frost"
          ? `DMG ${t.damage} · SPD ${t.fireRate}/s · Slow ${Math.round(t.slow * 100)}% speed for ${t.slowDuration}s · RNG ${t.range}${buffLine}`
          : `DMG ${t.damage} · SPD ${t.fireRate}/s · RNG ${t.range}${buffLine}`;
      upgradeDamageBtn.textContent =
        t.damageCost === null ? "Damage Max" : `+ Damage (${t.damageCost}g)`;
      upgradeSpeedBtn.textContent =
        t.speedCost === null ? "Speed Max" : `+ Attack Speed (${t.speedCost}g)`;
      hintEl.textContent = t.flying
        ? t.special
          ? "The wasp and its three drones each stick to one enemy until that enemy is destroyed. Each drone hits for a quarter of the wasp."
          : "No range circle. The wasp flies to its target and stays until that enemy falls. Damage ranks add 30% each. Drone Wing adds three mini drones."
        : t.kind === "pyro"
          ? t.special
            ? "Inner Flame shrinks the radius and burns every enemy inside it. A slow still puts the fire out."
            : "Short range. A target that is not already burning takes extra damage. A slow removes the fire."
          : t.kind === "frost"
            ? "Shots slow enemies to 52% speed for 1.6 seconds. Glacier Field costs 180 and pulses a wider chill."
            : `${t.specialName}: ${t.specialDescription}`;
      mintDepositBtn.classList.add("hidden");
      mintDepositAllBtn.classList.add("hidden");
      syncTargeting(t.targeting, t.inverted);
    }

    if (t.silenced > 0) {
      upgradeStats.textContent += " · shut off";
      hintEl.textContent = "This tower is shut off for a few seconds, then it works again.";
    }

    upgradeDamageBtn.disabled =
      !started || t.damageCost === null || !t.canAffordDamage;
    upgradeDurationBtn.disabled =
      !started || t.durationCost === null || !t.canAffordDuration;
    upgradeSpeedBtn.disabled =
      !started || t.speedCost === null || !t.canAffordSpeed;
    upgradeSpecialBtn.textContent = t.grandTaken
      ? "Grand Banner taken"
      : t.kind === "sniper"
        ? t.supplyReady
          ? `Supply Drop (${t.supplyCost}g)`
          : `Used this wave · next ${t.supplyCost}g`
        : t.specialCost === null
          ? `${t.specialName} ✓`
          : `${t.specialName} (${t.specialCost}g)`;
    upgradeSpecialBtn.disabled =
      !started || t.specialCost === null || !t.canAffordSpecial;
    upgradeSpecialBtn.title = t.specialDescription;
    sellBtn.textContent = `Sell (${t.sellRefund}g)`;
    sellBtn.disabled = !started || !hud.shovelReady;
  } else if (hud.gateSelected && !hud.carrying) {
    upgradeBar.classList.remove("hidden");
    upgradeDurationBtn.classList.remove("hidden");
    upgradeSpeedBtn.classList.add("hidden");
    sellBtn.classList.add("hidden");
    mintDepositBtn.classList.add("hidden");
    mintDepositAllBtn.classList.add("hidden");
    syncTargeting(null);
    upgradeTitle.textContent = hud.gateVolley ? "Bastion · Volley" : "Bastion";
    const volleyLine = hud.gateVolley ? " · bow ready" : "";
    upgradeStats.textContent = `Gate ${hud.gateLives}/${hud.gateMax}${volleyLine}`;
    upgradeDamageBtn.textContent =
      hud.waveInProgress
        ? "Repair"
        : hud.gateRepairCost === null
          ? "Gate mended"
          : `Repair (${hud.gateRepairCost}g)`;
    upgradeDurationBtn.textContent =
      hud.gateReinforceCost === null ? "Reinforce Max" : `Reinforce (${hud.gateReinforceCost}g)`;
    upgradeSpecialBtn.textContent = hud.gateVolley
      ? "Volley ✓"
      : `Volley (${hud.gateVolleyCost}g)`;
    upgradeDamageBtn.disabled = !started || hud.gateRepairCost === null || hud.gold < hud.gateRepairCost;
    upgradeDurationBtn.disabled =
      !started ||
      hud.waveInProgress ||
      hud.gateReinforceCost === null ||
      hud.gold < (hud.gateReinforceCost ?? 0);
    upgradeSpeedBtn.disabled = true;
    upgradeSpecialBtn.disabled =
      !started || hud.gateVolley || hud.gateVolleyCost === null || hud.gold < hud.gateVolleyCost;
    upgradeSpecialBtn.title = "The warden shoots. 11 damage, a little under an Archer.";
    hintEl.textContent = hud.waveInProgress
      ? "Leaks crack the gate. Repair and Reinforce wait until the wave ends. Volley is a bow, a little softer than an Archer."
      : "Between waves the gate mends 1 life. Repair spends 12 gold a life, up to 2. Reinforce adds 4 lives. Volley lets the warden shoot.";
  } else if (!hud.carrying) {
    upgradeBar.classList.add("hidden");
    mintDepositBtn.classList.add("hidden");
    mintDepositAllBtn.classList.add("hidden");
    syncTargeting(null);
    if (hud.tool === "shovel") {
      hintEl.textContent = hud.shovelReady
        ? "Shovel ready: click a tower to pick it up, then move or sell."
        : "Shovel already used this wave.";
    } else if (hud.selected === "chomp") {
      hintEl.textContent =
        "Chomp swallows an enemy, then sleeps for 25 seconds. One upgrade widens the bite. The other shortens the nap. Double Bite swallows two." +
        terrainNote(hud);
    } else if (hud.selected === "sniper") {
      hintEl.textContent =
        "Sniper has no range limit. Shots are slow and heavy. Supply Drop gives 1 life and 35 gold once each wave, and each call costs more." +
        terrainNote(hud);
    } else if (hud.selected === "nuke") {
      hintEl.textContent =
        "Nuke detonates where you place it. Every enemy is left with a sliver of health. Your towers in the 3×3 are destroyed. That crater cannot be built on for the rest of the run." +
        terrainNote(hud);
    } else if (hud.selected === "banner") {
      hintEl.textContent =
        hud.banners >= BANNER_LIMIT
          ? `Three banners is the limit. Sell one before placing another. Only one can be a Grand Banner.${terrainNote(hud)}`
          : `The field holds ${hud.banners} of ${BANNER_LIMIT} banners. Only one can be a Grand Banner. Click grass to build.${terrainNote(hud)}`;
    } else if (hud.selected) {
      const onBench = menuView === "classic" && loadout.includes(hud.selected);
      hintEl.textContent = `${TOWER_DEFS[hud.selected].name} ${onBench ? "is on your bench" : "selected"}. Click grass to build.${terrainNote(hud)}`;
    } else if (hud.event === "hallow") {
      hintEl.textContent = "Hallow Gate. Lanterns walk the orange road. Build on the dark grass.";
    } else {
      const portalHint = hud.portalSoon ? ` ${hud.portalSoon} Each new portal adds 10% more enemies.` : "";
      hintEl.textContent = `Select a tower, or click a placed tower to upgrade.${terrainNote(hud)}${portalHint}`;
    }
  }

  showEndIfNeeded(
    hud.phase,
    hud.difficulty,
    hud.wave,
    "bastion",
    hud.custom,
    hud.gold,
    hud.event,
    hud.lives,
  );
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
  livesLabel.textContent = "Lives";
  livesEl.textContent = String(hud.lives);
  waveEl.textContent = `${hud.wave} / ${hud.totalWaves}`;

  modeBadge.classList.remove(
    "hidden",
    "regen",
    "classic",
    "dungeon",
    "lawn",
    "endless",
    "custom",
    "hallow",
    "armor",
    "marked",
  );
  warrantBadge.classList.add("hidden");
  if (hud.difficulty === "hard") {
    modeBadge.textContent = "Hard";
  } else {
    modeBadge.classList.add("dungeon");
    modeBadge.textContent = "Dungeon Crawler";
  }

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
  dockDungeonName.textContent = hud.selected ? DUNGEON_BUILDS[hud.selected].name : "Defenses";

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
  livesLabel.textContent = "Lives";
  livesEl.textContent = String(hud.lives);
  waveEl.textContent = `${hud.wave} / ${hud.totalWaves}`;
  goldLabel.textContent = "Sun";

  modeBadge.classList.remove(
    "hidden",
    "regen",
    "classic",
    "dungeon",
    "lawn",
    "endless",
    "custom",
    "hallow",
    "armor",
    "marked",
  );
  warrantBadge.classList.add("hidden");
  if (hud.difficulty === "hard") {
    modeBadge.textContent = "Hard";
  } else {
    modeBadge.classList.add("lawn");
    modeBadge.textContent = "Sun Lawn";
  }

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
  dockLawnName.textContent = hud.digging
    ? "Dig"
    : hud.selected
      ? PLANTS[hud.selected].name
      : "Plants";

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
  event: "" | "hallow" = "",
  lives = 0,
): void {
  const endlessLoss = phase === "lost" && mode === "bastion" && difficulty === "endless" && !custom;
  endlessScore.classList.toggle("hidden", !endlessLoss);
  endModePicker.classList.toggle("hidden", custom);
  if (endlessLoss) {
    pendingScore = { wave, gold };
    scoreSaveBtn.disabled = savedThisRun;
    refreshBoards();
  }
  if (phase === "won" && event === "hallow" && !eventAwarded) {
    eventAwarded = true;
    eventGrant = grantTickets(localStorage, hallowPayout(lives));
    paintTickets();
  }
  if (phase === "won") {
    deathRecapEl.classList.add("hidden");
    endTitle.textContent =
      event === "hallow"
        ? "Yard Held"
        : mode === "lawn"
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
      event === "hallow"
        ? eventGrant.gained > 0
          ? `The Pumpkin King fell. You earned ${ticketPhrase(eventGrant.gained)}. The Event tab bar reads ${eventGrant.total} of ${TICKET_CAP}.`
          : `The Pumpkin King fell. The ticket bar is already full at ${TICKET_CAP}.`
        : mode === "lawn"
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
      event === "hallow"
        ? "Yard Fell"
        : mode === "lawn"
          ? "They Reached the House"
          : mode === "dungeon"
            ? "Breach Escape"
            : custom
              ? "Road Fell"
              : "Breach";
    endMsg.textContent =
      event === "hallow"
        ? `The yard broke through on wave ${wave}. A clear turns the lives you have left into tickets.`
        : mode === "lawn"
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
    paintDeathRecap(mode, difficulty, custom);
    syncDifficultyButtons(difficulty);
    endOverlay.classList.remove("hidden");
  }
}

function paintDeathRecap(mode: GameMode, difficulty: Difficulty, custom: boolean): void {
  const recap =
    mode === "lawn" ? lawn.deathRecap() : mode === "dungeon" ? dungeon.deathRecap() : bastion.deathRecap();
  deathLeakedEl.textContent = `Leaked: ${formatLeaks(mode, recap.leaks)}`;
  deathSpentEl.textContent = `Spent: ${recap.spent} ${recap.currency}`;
  deathTipEl.textContent = `Tip: ${deathTip(mode, difficulty, custom, recap)}`;
  deathRecapEl.classList.remove("hidden");
}

function formatLeaks(mode: GameMode, leaks: DeathRecap["leaks"]): string {
  if (leaks.length === 0) return "None";
  return leaks.map((leak) => leakLabel(mode, leak.kind, leak.count)).join(", ");
}

function leakLabel(mode: GameMode, kind: string, count: number): string {
  const names = leakNames(mode, kind);
  return `${count} ${count === 1 ? names[0] : names[1]}`;
}

function leakNames(mode: GameMode, kind: string): [string, string] {
  if (mode === "lawn") {
    if (kind === "shambler") return ["Shambler", "Shamblers"];
    if (kind === "cone") return ["Conehead", "Coneheads"];
    if (kind === "runner") return ["Runner", "Runners"];
    return ["Brute", "Brutes"];
  }
  if (mode === "dungeon") {
    if (kind === "spikeRaider") return ["Spike Raider", "Spike Raiders"];
    if (kind === "snareScout") return ["Snare Scout", "Snare Scouts"];
    if (kind === "goblinHunter") return ["Goblin Hunter", "Goblin Hunters"];
    return ["Ogre Slayer", "Ogre Slayers"];
  }
  if (menuView === "event") {
    if (kind === "normal") return ["Lantern", "Lanterns"];
    if (kind === "fast") return ["Wisp", "Wisps"];
    if (kind === "tank") return ["Coffin", "Coffins"];
    if (kind === "splitter") return ["Split Pumpkin", "Split Pumpkins"];
    if (kind === "splitling") return ["Pip", "Pips"];
    if (kind === "thief") return ["Trick", "Tricks"];
    if (kind === "sapper") return ["Crow", "Crows"];
    if (kind === "spawner") return ["Cauldron", "Cauldrons"];
    if (kind === "boss") return ["Pumpkin King", "Pumpkin Kings"];
  }
  if (kind === "normal") return ["Grunt", "Grunts"];
  if (kind === "fast") return ["Runner", "Runners"];
  if (kind === "tank") return ["Tank", "Tanks"];
  if (kind === "splitter") return ["Splitter", "Splitters"];
  if (kind === "splitling") return ["Splitling", "Splitlings"];
  if (kind === "spawner") return ["Spawner", "Spawners"];
  if (kind === "thief") return ["Bandit", "Bandits"];
  if (kind === "sapper") return ["Sapper", "Sappers"];
  if (kind === "husk") return ["Desert Husk", "Desert Husks"];
  if (kind === "boss") return ["Boss", "Bosses"];
  if (kind === "finalBoss") return ["Final Boss", "Final Bosses"];
  if (kind === "challenger") return ["Challenger", "Challengers"];
  return ["Enemy", "Enemies"];
}

function leakCount(leaks: DeathRecap["leaks"], kind: string): number {
  return leaks.find((leak) => leak.kind === kind)?.count ?? 0;
}

function runnersDominate(leaks: DeathRecap["leaks"]): boolean {
  const runners = leakCount(leaks, "fast");
  if (runners <= 0) return false;
  return leaks.every((leak) => leak.kind === "fast" || leak.count < runners);
}

function deathTip(mode: GameMode, difficulty: Difficulty, custom: boolean, recap: DeathRecap): string {
  const leaks = recap.leaks;
  if (menuView === "event") {
    if (recap.spent === 0) return "Place an Archer on the dark grass before the lanterns walk.";
    if (leakCount(leaks, "boss") > 0) return "The Pumpkin King costs several lives. Slow it before the gate.";
    if (leakCount(leaks, "thief") > 0) return "A trick that reaches the gate keeps the gold it stole.";
    if (runnersDominate(leaks)) return "Wisps are fast. Frost, or a corner, gives the line more shots.";
    if (leakCount(leaks, "tank") > 0) return "A coffin heals to full after 3 quiet seconds. Keep a shot on it.";
    return "Hold the yard through six waves. Lives left become event tickets.";
  }
  if (mode === "lawn") {
    if (recap.spent === 0) return "The lawn pays 25 sun before the first wave. Plant with it.";
    const runners = leakCount(leaks, "runner");
    const brutes = leakCount(leaks, "brute");
    if (runners > 0 && runners >= brutes) return "A Chiller holds runners in the lane.";
    if (brutes > 0) return "Open a brute with a Boomnut, then hold it on a Bulwark.";
    return "Put a Spitter behind a Bulwark.";
  }
  if (mode === "dungeon") {
    if (recap.spent === 0) return "Place a trap on the road before you start the wave.";
    if (leakCount(leaks, "snareScout") > 0) return "A snare holds them on the spikes.";
    if (leakCount(leaks, "ogreSlayer") > 0) return "Meet an Ogre Slayer with an Ogre.";
    return "Lay snares and spikes on the same stretch.";
  }
  if (recap.spent === 0) {
    return custom
      ? "Place a tower on the grass before you start the wave."
      : "Place an Archer on the grass at the first bend before you start the wave.";
  }
  if (
    leakCount(leaks, "boss") > 0 ||
    leakCount(leaks, "finalBoss") > 0 ||
    leakCount(leaks, "challenger") > 0 ||
    leakCount(leaks, "husk") > 0
  ) {
    return "That leak costs several lives. Slow it before it reaches the gate.";
  }
  if (runnersDominate(leaks)) return "Runners leaked the most. Frost, or a corner, gives the line more shots.";
  if (leakCount(leaks, "tank") > 0) {
    return difficulty === "hard"
      ? "Splash a tank before it reaches the gate."
      : "A tank heals to full after 3 quiet seconds. Keep a shot on it.";
  }
  if (leakCount(leaks, "thief") > 0) return "A bandit that reaches the gate keeps the gold it stole.";
  if (leakCount(leaks, "sapper") > 0) return "Kill a sapper before it steps off the road. The shutdown lasts 4 seconds.";
  if (leakCount(leaks, "splitter") > 0 || leakCount(leaks, "splitling") > 0) {
    return "Splash a splitter so the children die in the same blast.";
  }
  return "The Almanac names the tower that answers this pack.";
}

bastion.onHudChange = syncBastionHud;
dungeon.onHudChange = syncDungeonHud;
lawn.onHudChange = syncLawnHud;

function patternLabel(kind: PatternKind): string {
  if (kind === "normal") return "Grunts";
  if (kind === "fast") return "Runners";
  if (kind === "tank") return "Tanks";
  if (kind === "splitter") return "Splitters";
  if (kind === "spawner") return "Spawners";
  if (kind === "thief") return "Bandits";
  if (kind === "husk") return "Desert Husks";
  return "Sappers";
}

function patternList(kinds: readonly PatternKind[]): string {
  const names = kinds.map(patternLabel);
  if (names.length <= 1) return names[0] ?? "Grunts";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function terrainTags(level: (typeof CAMPAIGN)[number]): string {
  const tags: string[] = [];
  if (level.water.length > 0) tags.push("water");
  if (level.trees.length > 0) tags.push("trees");
  if (level.rocks) tags.push("rocks");
  if (level.fog) tags.push("fog");
  return tags.length ? ` · ${tags.join(", ")}` : "";
}

function terrainNote(hud: { hasWater: boolean; hasTrees: boolean; hasRocks: boolean; hasFog: boolean }): string {
  const notes: string[] = [];
  if (hud.hasWater) notes.push("Water puddles cannot hold a tower.");
  if (hud.hasTrees) notes.push("Trees block shots that pass through their trunks.");
  if (hud.hasRocks) notes.push("Rocks fall during a wave and shut a tower off.");
  if (hud.hasFog) notes.push("Fog shortens Auto range. Other aim keeps full range.");
  return notes.length ? ` ${notes.join(" ")}` : "";
}

function paintLevels(): void {
  levelPicker.innerHTML = CAMPAIGN.map((level) => {
    return `<button class="level-btn${level.id === chosenLevel ? " selected" : ""}" type="button" data-level="${level.id}">
      <span class="level-name">${level.name}</span>
      <span class="level-meta">${level.waves} waves${terrainTags(level)}${level.portals.length > 1 ? ` · ${level.portals.length} portals` : ""}</span>
    </button>`;
  }).join("");
  paintWarrants();
}

function paintWarrants(): void {
  const level = CAMPAIGN.find((item) => item.id === chosenLevel) ?? CAMPAIGN[0]!;
  const picked = warrantByLevel.get(level.id) ?? 0;
  warrantPicker.innerHTML = level.warrants
    .map((warrant, index) => {
      return `<button class="warrant-btn${index === picked ? " selected" : ""}" type="button" data-warrant="${index}">
        <span class="level-name">${warrant.name}</span>
        <span class="level-meta">${warrant.gimmick}</span>
      </button>`;
    })
    .join("");
  const warrant = level.warrants[picked] ?? level.warrants[0]!;
  const huskNote = warrant.enemies.includes("husk")
    ? " A Desert Husk cracks at half health and sprints."
    : "";
  warrantBlurb.textContent = `${level.blurb}${portalNote(level)} ${warrant.name}: ${warrant.gimmick} It sends ${patternList(warrant.enemies)}. The first kind leads the line. Bosses still close waves 6 and 9, and the last wave of the road.${huskNote}`;
  if (!started) {
    bastion.beginRun(chosenDifficulty, level.id, picked);
  }
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

warrantPicker.addEventListener("click", (event) => {
  const btn = (event.target as HTMLElement).closest<HTMLButtonElement>(".warrant-btn");
  if (!btn?.dataset.warrant) return;
  const index = Number(btn.dataset.warrant);
  if (!Number.isInteger(index)) return;
  warrantByLevel.set(chosenLevel, index);
  paintWarrants();
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
  if (!isGameSpeed(next)) return;
  gameSpeed = gameSpeed === next ? 1 : next;
  paintSpeedButtons();
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
tabEvent.addEventListener("click", () => {
  menuView = "event";
  activeLevel = null;
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

cancelBtn.addEventListener("click", () => {
  if (tutorialIndex !== null) {
    bastion.selectTower("archer");
    return;
  }
  bastion.clearSelection();
});
dcancelBtn.addEventListener("click", () => dungeon.clearSelection());
lcancelBtn.addEventListener("click", () => lawn.clearSelection());

upgradeDamageBtn.addEventListener("click", () => {
  if (!started || activeMode !== "bastion") return;
  if (!bastion.repairGate()) bastion.upgradeSelected("damage");
});
upgradeDurationBtn.addEventListener("click", () => {
  if (!started || activeMode !== "bastion") return;
  if (!bastion.reinforceGate()) bastion.upgradeSelected("duration");
});
upgradeSpeedBtn.addEventListener("click", () => {
  if (started && activeMode === "bastion") bastion.upgradeSelected("speed");
});
upgradeSpecialBtn.addEventListener("click", () => {
  if (!started || activeMode !== "bastion") return;
  if (!bastion.buyGateVolley()) bastion.buySpecial();
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
  if (!(started && activeMode === "bastion")) return;
  if (tutorialIndex !== null) {
    const step = TUTORIAL_STEPS[tutorialIndex];
    if (!step || step.blockWave) return;
    finishTutorial(true);
    return;
  }
  bastion.startWave();
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
  eventAwarded = false;
  startOverlay.classList.remove("editor-open");
  startOverlay.classList.add("hidden");
  endOverlay.classList.add("hidden");
  deathRecapEl.classList.add("hidden");
  applyChrome(chosenMode);
  showStage("play");
  if (chosenMode === "bastion" && menuView === "event") {
    activeLevel = null;
    bastion.setRoster(null);
    bastion.beginHallow();
    bastion.selectTower("archer");
  } else if (chosenMode === "bastion" && activeLevel && menuView === "editor") {
    bastion.setRoster(null);
    bastion.beginCustom(activeLevel);
    bastion.selectTower("archer");
  } else if (chosenMode === "bastion") {
    activeLevel = null;
    bastion.setRoster(loadout);
    bastion.beginRun(chosenDifficulty, chosenLevel, warrantByLevel.get(chosenLevel) ?? 0);
    bastion.selectTower(loadout[0] ?? null);
  } else if (chosenMode === "lawn") {
    lawn.beginRun(chosenDifficulty);
    lawn.selectPlant("sunbloom");
  } else {
    dungeon.beginRun(chosenDifficulty);
    dungeon.selectBuild("spikes");
  }
  applyTowerRoster();
}

startBtn.addEventListener("click", () => {
  if (chosenMode === "bastion" && menuView === "classic" && loadout.length === 0) {
    paintDraft();
    showStage("draft");
    return;
  }
  startChosen();
});
restartBtn.addEventListener("click", startChosen);
menuBtn.addEventListener("click", showHome);
document.querySelector("#back-home")!.addEventListener("click", showHome);
document.querySelector("#home-classic")!.addEventListener("click", () => {
  if (!localStorage.getItem(TUTORIAL_KEY)) {
    startTutorial();
    return;
  }
  paintDraft();
  showStage("draft");
});
document.querySelector("#home-tutorial")!.addEventListener("click", startTutorial);
document.querySelector("#draft-tutorial")!.addEventListener("click", startTutorial);
document.querySelector("#tutorial-open")!.addEventListener("click", startTutorial);
document.querySelector("#tutorial-skip")!.addEventListener("click", abandonTutorial);
tutorialNext.addEventListener("click", () => {
  if (tutorialIndex === null) return;
  const step = TUTORIAL_STEPS[tutorialIndex];
  if (step.id === "place") return;
  if (step.id === "control") {
    finishTutorial(true);
    return;
  }
  showTutorialStep(tutorialIndex + 1);
});
document.querySelector("#home-almanac")!.addEventListener("click", openAlmanac);
document.querySelector("#draft-almanac")!.addEventListener("click", openAlmanac);
document.querySelector("#almanac-open")!.addEventListener("click", openAlmanac);
document.querySelector("#almanac-close")!.addEventListener("click", closeAlmanac);
almanacTowersTab.addEventListener("click", () => {
  almanacChapter = "towers";
  almanacId = null;
  refreshAlmanac();
});
almanacEnemiesTab.addEventListener("click", () => {
  almanacChapter = "enemies";
  almanacId = null;
  refreshAlmanac();
});
almanacEl.addEventListener("click", (event) => {
  if (event.target === almanacEl) closeAlmanac();
});
almanacIndex.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-almanac-id]");
  if (!button?.dataset.almanacId) return;
  almanacId = button.dataset.almanacId;
  refreshAlmanac();
});
almanacPage.addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-almanac-jump]");
  const id = button?.dataset.almanacJump;
  if (!id) return;
  const next = chapterFor(buildAlmanac(currentAlmanacQuery()), id);
  if (!next) return;
  almanacChapter = next;
  almanacId = id;
  refreshAlmanac();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !almanacEl.classList.contains("hidden")) closeAlmanac();
});
document.querySelector("#home-minigames")!.addEventListener("click", () => {
  menuView = "minigames";
  activeLevel = null;
  syncGameModeButtons(chosenMode === "lawn" ? "lawn" : "dungeon");
  showStage("menu");
});
document.querySelector("#home-editor")!.addEventListener("click", () => {
  menuView = "editor";
  syncGameModeButtons("bastion");
  showStage("menu");
});
document.querySelector("#home-event")!.addEventListener("click", () => {
  menuView = "event";
  activeLevel = null;
  syncGameModeButtons("bastion");
  showStage("menu");
});
document.querySelector("#draft-back")!.addEventListener("click", showHome);
draftContinue.addEventListener("click", () => {
  if (loadout.length === 0 || loadout.length > TOWER_LIMIT) return;
  runLoad(() => {
    menuView = "classic";
    activeLevel = null;
    syncGameModeButtons("bastion");
    showStage("menu");
  });
});
draftGrid.addEventListener("click", (event) => {
  const card = (event.target as HTMLElement).closest<HTMLButtonElement>("[data-draft]");
  if (!card?.dataset.draft) return;
  toggleDraft(card.dataset.draft as TowerKind);
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
runLoad(() => showHome());

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
  if (activeMode === "bastion") {
    const placedBefore = bastion.tutorialPlaced();
    bastion.handleClick(col, row);
    if (
      tutorialIndex !== null &&
      TUTORIAL_STEPS[tutorialIndex]?.id === "place" &&
      !placedBefore &&
      bastion.tutorialPlaced()
    ) {
      showTutorialStep(tutorialIndex + 1);
    }
  } else if (activeMode === "lawn") lawn.handleClick(col, row);
  else dungeon.handleClick(col, row);
});

let last = performance.now();
function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const reading = !almanacEl.classList.contains("hidden");
  const advance = (update: (step: number) => void) => {
    if (reading) return;
    let left = dt * gameSpeed;
    while (left > 0) {
      const step = Math.min(0.05, left);
      update(step);
      left -= step;
    }
  };
  if (activeMode === "bastion") {
    advance((step) => bastion.update(step));
    bastion.draw(ctx);
  } else if (activeMode === "lawn") {
    advance((step) => lawn.update(step));
    lawn.draw(ctx);
  } else {
    advance((step) => dungeon.update(step));
    dungeon.draw(ctx);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
