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
3. Click a placed tower to upgrade **Damage** or **Attack Speed** (cost scales with that tower’s base price, up to 3 levels each).
4. Press **Start Wave** when you are ready.
5. Earn gold from kills and cleared waves. Survive all 12 waves with lives remaining.

**Hard mode** ramps every wave: more enemy HP/speed/count, faster spawns, 100 starting gold and 15 lives. Bosses hit harder if they leak.

| Tower  | Role                          |
|--------|-------------------------------|
| Archer | Cheap, fast single-target     |
| Cannon | Slow, splash damage           |
| Frost  | Slows enemies on hit          |

| Enemy    | Notes                                      |
|----------|--------------------------------------------|
| Splitter | Pink units that split into two on death    |
| Boss     | Huge health; appears on waves 6, 9, and 12 |

## Build

```bash
npm run build
npm run preview
```
