# Bastion Breach

A simple browser tower defense game. Place Archer, Cannon, and Frost towers along a winding trail and stop twelve waves of enemies before they reach the gate.

## Play

```bash
npm install
npm run dev
```

Open the URL Vite prints (default: `http://localhost:3847`).

## How to play

1. Pick **Normal** or **Hard**, then click **Start Defense**.
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

| Enemy      | Notes                                         |
|------------|-----------------------------------------------|
| Splitter   | Pink units that split into two on death       |
| Boss       | High health; waves 6 and 9                    |
| Final Boss | Much more health; last enemy on wave 12       |

## Build

```bash
npm run build
npm run preview
```
