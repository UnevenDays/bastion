import { COLS, ROWS } from "./game/config";
import {
  EDITABLE_KINDS,
  customSpawnCount,
  defaultLevel,
  editPath,
  levelProblems,
  normalizeLevel,
  type CustomLevel,
  type EditableKind,
  type EnemyGroup,
} from "./game/level";

const DRAFT_KEY = "bastion-level-draft";

export function mountEditor(
  root: HTMLElement,
  onPlay: (level: CustomLevel) => void,
): void {
  let level = readDraft();

  root.innerHTML = `
    <p class="editor-lead">Click tiles in order to lay the road. Click the last tile to take it back. Click an earlier tile to end the road there.</p>
    <div class="editor-grid" id="editor-grid" role="grid" aria-label="Road tiles"></div>
    <p class="editor-status" id="editor-status"></p>
    <div class="editor-stats">
      <label>Gold <input id="editor-gold" type="number" min="0" max="99999" /></label>
      <label>Lives <input id="editor-lives" type="number" min="1" max="999" /></label>
      <button class="btn btn-primary" type="button" id="editor-play">Play level</button>
    </div>
    <div class="editor-waves" id="editor-waves"></div>
    <div class="editor-actions">
      <button class="btn btn-ghost" type="button" id="editor-add-wave">Add wave</button>
    </div>
  `;

  const grid = root.querySelector<HTMLElement>("#editor-grid")!;
  const status = root.querySelector<HTMLElement>("#editor-status")!;
  const goldInput = root.querySelector<HTMLInputElement>("#editor-gold")!;
  const livesInput = root.querySelector<HTMLInputElement>("#editor-lives")!;
  const wavesEl = root.querySelector<HTMLElement>("#editor-waves")!;
  const playBtn = root.querySelector<HTMLButtonElement>("#editor-play")!;

  const cells: HTMLButtonElement[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "editor-cell";
      btn.dataset.col = String(col);
      btn.dataset.row = String(row);
      grid.append(btn);
      cells.push(btn);
    }
  }

  function persist(): void {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(level));
    } catch {
      /* private mode can refuse storage */
    }
  }

  function paintGrid(): void {
    const indexAt = new Map(level.path.map((c, i) => [`${c.col},${c.row}`, i]));
    for (const btn of cells) {
      const key = `${btn.dataset.col},${btn.dataset.row}`;
      const index = indexAt.get(key);
      btn.classList.toggle("on", index !== undefined);
      btn.classList.toggle("start", index === 0);
      btn.classList.toggle("end", index === level.path.length - 1 && level.path.length > 1);
      btn.textContent = index === undefined ? "" : String(index + 1);
    }
  }

  function paintStatus(): void {
    const problem = levelProblems(level);
    status.textContent = problem ?? `${level.path.length} road tiles · ${level.waves.length} waves · ready to play.`;
    playBtn.disabled = problem !== null;
  }

  function renderWaves(): void {
    wavesEl.innerHTML = level.waves
      .map((wave, waveIndex) => {
        const rows = wave.enemies
          .map((enemy, enemyIndex) => enemyRow(enemy, waveIndex, enemyIndex))
          .join("");
        return `
          <section class="wave-block">
            <div class="wave-head">
              <span>Wave ${waveIndex + 1} · ${customSpawnCount(level, waveIndex + 1)} enemies</span>
              <button class="btn btn-ghost tiny" type="button" data-remove-wave="${waveIndex}">Remove wave</button>
            </div>
            ${rows}
            <button class="btn btn-ghost tiny" type="button" data-add-enemy="${waveIndex}">Add enemy</button>
          </section>
        `;
      })
      .join("");
  }

  function refresh(): void {
    goldInput.value = String(level.gold);
    livesInput.value = String(level.lives);
    paintGrid();
    renderWaves();
    paintStatus();
    persist();
  }

  grid.addEventListener("click", (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>(".editor-cell");
    if (!btn) return;
    level.path = editPath(level.path, Number(btn.dataset.col), Number(btn.dataset.row));
    paintGrid();
    paintStatus();
    persist();
  });

  goldInput.addEventListener("input", () => {
    level.gold = clampField(goldInput.value, 0, 99999, level.gold);
    paintStatus();
    persist();
  });
  livesInput.addEventListener("input", () => {
    level.lives = clampField(livesInput.value, 1, 999, level.lives);
    paintStatus();
    persist();
  });

  root.querySelector("#editor-add-wave")!.addEventListener("click", () => {
    level.waves.push({
      enemies: [{ kind: "normal", count: 6, hp: 40, speed: 62, reward: 6 }],
    });
    refresh();
  });

  wavesEl.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const removeWave = target.closest<HTMLButtonElement>("[data-remove-wave]");
    const addEnemy = target.closest<HTMLButtonElement>("[data-add-enemy]");
    const removeEnemy = target.closest<HTMLButtonElement>("[data-remove-enemy]");
    if (removeWave) {
      level.waves.splice(Number(removeWave.dataset.removeWave), 1);
      refresh();
      return;
    }
    if (addEnemy) {
      level.waves[Number(addEnemy.dataset.addEnemy)]?.enemies.push({
        kind: "fast",
        count: 4,
        hp: 30,
        speed: 95,
        reward: 8,
      });
      refresh();
      return;
    }
    if (removeEnemy) {
      const wave = level.waves[Number(removeEnemy.dataset.wave)];
      wave?.enemies.splice(Number(removeEnemy.dataset.removeEnemy), 1);
      if (wave && wave.enemies.length === 0) level.waves.splice(Number(removeEnemy.dataset.wave), 1);
      refresh();
    }
  });

  wavesEl.addEventListener("change", (event) => {
    const input = event.target as HTMLInputElement | HTMLSelectElement;
    const waveIndex = Number(input.dataset.wave);
    const enemyIndex = Number(input.dataset.enemy);
    const group = level.waves[waveIndex]?.enemies[enemyIndex];
    if (!group || !input.dataset.field) return;
    const field = input.dataset.field;
    if (field === "kind") {
      group.kind = input.value as EditableKind;
    } else if (field === "count") {
      group.count = clampField(input.value, 1, 40, group.count);
    } else if (field === "hp") {
      group.hp = clampField(input.value, 1, 100000, group.hp);
    } else if (field === "speed") {
      group.speed = clampField(input.value, 8, 400, group.speed);
    } else if (field === "reward") {
      group.reward = clampField(input.value, 0, 10000, group.reward);
    }
    paintStatus();
    persist();
  });

  playBtn.addEventListener("click", () => {
    const problem = levelProblems(level);
    if (problem) {
      status.textContent = problem;
      return;
    }
    persist();
    onPlay(normalizeLevel(level));
  });

  refresh();
}

function clampField(value: string, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function enemyRow(enemy: EnemyGroup, waveIndex: number, enemyIndex: number): string {
  const options = EDITABLE_KINDS.map(
    (item) =>
      `<option value="${item.kind}" ${item.kind === enemy.kind ? "selected" : ""}>${item.label}</option>`,
  ).join("");
  const data = `data-wave="${waveIndex}" data-enemy="${enemyIndex}"`;
  return `
    <div class="enemy-row">
      <label>Kind <select ${data} data-field="kind">${options}</select></label>
      <label>Count <input ${data} data-field="count" type="number" min="1" max="40" value="${enemy.count}" /></label>
      <label>Health <input ${data} data-field="hp" type="number" min="1" max="100000" value="${enemy.hp}" /></label>
      <label>Speed <input ${data} data-field="speed" type="number" min="8" max="400" value="${enemy.speed}" /></label>
      <label>Gold <input ${data} data-field="reward" type="number" min="0" max="10000" value="${enemy.reward}" /></label>
      <button class="btn btn-ghost tiny" type="button" data-remove-enemy="${enemyIndex}" data-wave="${waveIndex}">Remove</button>
    </div>
  `;
}

function readDraft(): CustomLevel {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return defaultLevel();
    return normalizeLevel(JSON.parse(raw));
  } catch {
    return defaultLevel();
  }
}
