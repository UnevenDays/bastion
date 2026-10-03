# Bastion Breach

A browser tower defense game with two modes:

- **Bastion Defense** — classic roadside towers, upgrades, shovel, and bosses
- **Dungeon Ambush** — place traps and monsters on a zigzag road; adventurers fight your monsters and try to escape

## Play locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (default: `http://localhost:3847`).

## Permanent hosting (GitHub Pages)

This repo includes a GitHub Actions workflow that publishes the game to **GitHub Pages** on every push to `main`.

1. Create / connect a **GitHub** repository for this project (in Cursor: use **Create repo** if you have not yet).
2. On GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or re-run the **Deploy to GitHub Pages** workflow).
4. Open the site URL GitHub shows (usually `https://<you>.github.io/<repo>/`).

Until that is set up, temporary tunnel links from the cloud agent will expire when the session ends.

## How to play

1. Pick **Bastion Defense** or **Dungeon Ambush**, then **Normal** / **Hard**, and start.
2. Select a tower type, then click an empty grass tile to build (path tiles are blocked).
3. Click a placed tower to upgrade **Damage**, **Attack Speed**, or its **Special**.
4. Use the **Shovel** once per wave to move a tower or sell it for 50% of gold invested.
5. Press **Start Wave** when you are ready. Survive all 12 waves — wave 12 is the Final Boss.

**Hard mode** ramps every wave: more enemy HP/speed/count, faster spawns, 100 starting gold and 15 lives. Bosses hit harder if they leak.

| Tower  | Special upgrade                                      |
|--------|------------------------------------------------------|
| Archer | Hawk Eye — bigger range + attack aura, less shot dmg |
| Cannon | Focus Charge — more damage, shorter range            |
| Frost  | Glacier Field — area freeze aura, no damage          |
| Mint   | Midas Vault — gold producer; invest to earn more     |

| Enemy      | Notes                                         |
|------------|-----------------------------------------------|
| Splitter   | Pink units that split into two on death       |
| Spawner    | Summons extra enemies every few seconds       |
| Boss       | High health; waves 6 and 9                    |
| Final Boss | Much more health; last enemy on wave 12       |

### Dungeon Ambush

Place **Spike Traps**, **Snares**, **Goblins**, and **Ogres** on the zigzag road only. Adventurers walk the path, take trap damage, and stop to fight monsters (they deal damage back). If they reach the exit, you lose lives. Survive 10 waves; the last spawns a Hero.

## Build

```bash
npm run build
npm run preview
```
