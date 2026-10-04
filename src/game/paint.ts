export interface RoadPaint {
  edge: string;
  fill: string;
  dash: string;
}

/** A short name under a tower, enemy, or plant, drawn so it stays readable on the board. */
export function paintTag(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color = "#f4efe4",
): void {
  ctx.save();
  ctx.font = "700 9px 'Chakra Petch', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.lineJoin = "round";
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(8, 12, 10, 0.92)";
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function tileHash(n: number): number {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

export function paintWideRoad(
  ctx: CanvasRenderingContext2D,
  points: readonly { x: number; y: number }[],
  road: RoadPaint,
  cell: number,
): void {
  if (points.length < 2) return;
  const trace = (): void => {
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const p = points[i]!;
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    }
  };

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.translate(0, 5);
  ctx.strokeStyle = "rgba(0, 0, 0, 0.42)";
  ctx.lineWidth = cell * 1.16;
  trace();
  ctx.stroke();
  ctx.translate(0, -5);

  ctx.strokeStyle = road.edge;
  ctx.lineWidth = cell * 1.08;
  trace();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.16)";
  ctx.lineWidth = cell * 0.98;
  trace();
  ctx.stroke();

  ctx.strokeStyle = road.fill;
  ctx.lineWidth = cell * 0.9;
  trace();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.07)";
  ctx.lineWidth = cell * 0.34;
  trace();
  ctx.stroke();

  ctx.strokeStyle = "rgba(0, 0, 0, 0.22)";
  ctx.lineWidth = 2;
  const span = cell * 0.36;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i]!;
    const b = points[i + 1]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 8) continue;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    for (let d = 14; d < len - 8; d += 18) {
      const wobble = (tileHash(i * 40 + d) - 0.5) * 4;
      const x = a.x + ux * d;
      const y = a.y + uy * d;
      ctx.beginPath();
      ctx.moveTo(x + px * (span + wobble), y + py * (span + wobble));
      ctx.lineTo(x - px * (span - wobble), y - py * (span - wobble));
      ctx.stroke();
    }
  }

  ctx.strokeStyle = road.dash;
  ctx.lineWidth = 3.5;
  ctx.setLineDash([12, 16]);
  trace();
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

export function speckleTile(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  cell: number,
  col: number,
  row: number,
  color: string,
): void {
  ctx.fillStyle = color;
  for (let i = 0; i < 6; i++) {
    const h = tileHash(col * 17 + row * 31 + i * 13);
    const h2 = tileHash(col * 9 + row * 19 + i * 7);
    ctx.globalAlpha = 0.12 + h * 0.22;
    const s = 1.5 + (i % 3);
    ctx.fillRect(x + 3 + h * (cell - 8), y + 3 + h2 * (cell - 8), s, s);
  }
  ctx.globalAlpha = 1;
}

export function paintBoardLight(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "rgba(255, 255, 255, 0.08)");
  sky.addColorStop(0.4, "rgba(255, 255, 255, 0)");
  sky.addColorStop(1, "rgba(0, 0, 0, 0.24)");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(
    w * 0.5,
    h * 0.42,
    Math.min(w, h) * 0.18,
    w * 0.5,
    h * 0.5,
    Math.max(w, h) * 0.72,
  );
  glow.addColorStop(0, "rgba(0, 0, 0, 0)");
  glow.addColorStop(1, "rgba(0, 0, 0, 0.4)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
}

export type CrewKind =
  | "grunt"
  | "fast"
  | "tank"
  | "splitter"
  | "bit"
  | "bandit"
  | "sapper"
  | "husk"
  | "spawner"
  | "boss"
  | "final"
  | "rival"
  | "shambler"
  | "cone"
  | "runner"
  | "brute"
  | "raider"
  | "scout"
  | "hunter"
  | "slayer";

function hexMix(hex: string, target: number, amount: number): string {
  const raw = hex.replace("#", "");
  if (raw.length !== 6) return hex;
  const channel = (index: number) => parseInt(raw.slice(index, index + 2), 16);
  const mix = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value + (target - value) * amount)));
  const hexByte = (value: number) => mix(value).toString(16).padStart(2, "0");
  return `#${hexByte(channel(0))}${hexByte(channel(2))}${hexByte(channel(4))}`;
}

function paintShape(
  ctx: CanvasRenderingContext2D,
  color: string,
  draw: () => void,
): void {
  ctx.beginPath();
  draw();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "rgba(16, 12, 10, 0.92)";
  ctx.lineWidth = 1.15;
  ctx.stroke();
}

/**
 * A side-view fighter inside the old radius, so the health bar and the name
 * stay where they were. Each kind keeps a prop you can tell apart on the road.
 */
export function paintCrew(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  kind: CrewKind,
  options: { faceLeft?: boolean; walk?: number; cracked?: boolean; purse?: boolean } = {},
): void {
  const zombie =
    kind === "shambler" || kind === "cone" || kind === "runner" || kind === "brute";
  const skin = zombie ? "#93b86e" : kind === "husk" ? "#e6d3b0" : "#f2c6a4";
  const cloth = color;
  const dark = hexMix(color, 0, 0.42);
  const step = Math.sin(options.walk ?? 0) * (options.cracked ? 3.2 : 2.3);
  const scale = radius / 9.2;

  ctx.save();
  ctx.translate(x, y + radius * 0.08);
  ctx.scale(options.faceLeft ? -scale : scale, scale);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (kind === "fast" || kind === "runner" || kind === "scout") {
    paintShape(ctx, kind === "scout" ? "#d7eef6" : "#f4efe4", () => {
      ctx.moveTo(-2, -7);
      ctx.lineTo(-11, -2 + step * 0.3);
      ctx.lineTo(-8, 1);
      ctx.lineTo(-1, -3);
      ctx.closePath();
    });
  }
  if (kind === "final" || kind === "boss" || kind === "bandit" || kind === "spawner") {
    paintShape(ctx, dark, () => {
      ctx.moveTo(-2, -8);
      ctx.lineTo(-8, 2);
      ctx.lineTo(-5, 7);
      ctx.lineTo(0, -2);
      ctx.closePath();
    });
  }

  const wide = kind === "tank" || kind === "brute" || kind === "boss" || kind === "final" || kind === "rival";
  const slim = kind === "fast" || kind === "runner" || kind === "bit" || kind === "scout";
  const bodyW = wide ? 8.4 : slim ? 5 : 6.6;
  const hip = bodyW / 2;

  paintShape(ctx, dark, () => {
    ctx.rect(-hip - 0.2, 1 + step * 0.15, 2.5, 7);
  });
  paintShape(ctx, dark, () => {
    ctx.rect(hip - 2.4, 1 - step * 0.15, 2.5, 7);
  });

  if (kind === "splitter") {
    paintShape(ctx, cloth, () => {
      ctx.moveTo(-7, -2);
      ctx.lineTo(0, -9);
      ctx.lineTo(7, -2);
      ctx.lineTo(5, 5);
      ctx.lineTo(-5, 5);
      ctx.closePath();
    });
    paintShape(ctx, skin, () => ctx.arc(-3.1, -8, 2.5, 0, Math.PI * 2));
    paintShape(ctx, skin, () => ctx.arc(3.1, -8, 2.5, 0, Math.PI * 2));
    ctx.fillStyle = "#1a1408";
    ctx.beginPath();
    ctx.arc(-2.2, -8.1, 0.45, 0, Math.PI * 2);
    ctx.arc(2.2, -8.1, 0.45, 0, Math.PI * 2);
    ctx.arc(4, -8.1, 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "spawner") {
    paintShape(ctx, cloth, () => {
      ctx.moveTo(-8, 4);
      ctx.quadraticCurveTo(-9, -8, 0, -11);
      ctx.quadraticCurveTo(9, -8, 8, 4);
      ctx.closePath();
    });
    paintShape(ctx, skin, () => ctx.arc(1.5, -2, 2.6, 0, Math.PI * 2));
    for (const egg of [-4.2, -0.4, 3.4]) {
      paintShape(ctx, "#dfe8b0", () => ctx.ellipse(egg, 2.2, 1.5, 2, 0, 0, Math.PI * 2));
    }
    ctx.fillStyle = "#1a1408";
    ctx.beginPath();
    ctx.arc(2.3, -2.1, 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "husk") {
    if (!options.cracked) {
      paintShape(ctx, hexMix(cloth, 255, 0.25), () => {
        ctx.ellipse(0, -1, 8.5, 6.2, -0.2, 0, Math.PI * 2);
      });
    } else {
      ctx.strokeStyle = dark;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-2, -6);
      ctx.lineTo(-9, -1);
      ctx.moveTo(-1, -2);
      ctx.lineTo(-8, 3);
      ctx.stroke();
    }
    paintShape(ctx, cloth, () => ctx.rect(-3, -6, 6, 8));
    paintShape(ctx, skin, () => ctx.arc(1.4, -8.2, 3, 0, Math.PI * 2));
    ctx.strokeStyle = options.cracked ? "#6a3a18" : "rgba(90, 58, 24, 0.85)";
    ctx.lineWidth = options.cracked ? 1.6 : 1.1;
    ctx.beginPath();
    ctx.moveTo(-2, -4);
    ctx.lineTo(2, -1);
    ctx.lineTo(-1, 2);
    ctx.stroke();
    ctx.fillStyle = "#1a1408";
    ctx.beginPath();
    ctx.arc(2.4, -8.3, 0.45, 0, Math.PI * 2);
    ctx.fill();
  } else {
    paintShape(ctx, cloth, () => {
      ctx.moveTo(-hip, -6);
      ctx.lineTo(hip, -6);
      ctx.lineTo(hip - 0.4, 3);
      ctx.lineTo(-hip + 0.4, 3);
      ctx.closePath();
    });
    if (kind === "brute") {
      paintShape(ctx, dark, () => ctx.rect(-hip - 1.4, -5, 3, 3.2));
      paintShape(ctx, dark, () => ctx.rect(hip - 1.6, -5, 3, 3.2));
    }
    paintShape(ctx, skin, () => ctx.arc(1.5, -9, kind === "brute" ? 3.8 : 3.2, 0, Math.PI * 2));
    ctx.fillStyle = "#1a1408";
    ctx.beginPath();
    ctx.arc(2.6, -9.1, 0.5, 0, Math.PI * 2);
    ctx.fill();

    if (kind === "grunt" || kind === "raider") {
      paintShape(ctx, "#8d97a3", () => {
        ctx.moveTo(-1.2, -12.2);
        ctx.lineTo(4.4, -12.2);
        ctx.lineTo(3.6, -9.4);
        ctx.lineTo(-0.4, -9.4);
        ctx.closePath();
      });
      ctx.strokeStyle = "#d7dde4";
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(5.2, -2);
      ctx.lineTo(10.5, -12);
      ctx.stroke();
      paintShape(ctx, "#d7dde4", () => {
        ctx.moveTo(9.4, -13.2);
        ctx.lineTo(12.2, -11.2);
        ctx.lineTo(9.6, -10.2);
        ctx.closePath();
      });
    } else if (kind === "fast" || kind === "runner") {
      paintShape(ctx, "#f4efe4", () => {
        ctx.moveTo(4.2, -1);
        ctx.lineTo(9.5, 1.2);
        ctx.lineTo(4.6, 2.2);
        ctx.closePath();
      });
    } else if (kind === "tank" || kind === "slayer") {
      paintShape(ctx, "#c5ccd4", () => {
        ctx.moveTo(3, -8);
        ctx.lineTo(10, -6);
        ctx.lineTo(10, 4);
        ctx.lineTo(3, 5);
        ctx.closePath();
      });
      ctx.strokeStyle = "#6a7380";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(5.2, -4);
      ctx.lineTo(8.2, -4);
      ctx.stroke();
      if (kind === "slayer") {
        ctx.strokeStyle = "#d7dde4";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(6, 1);
        ctx.lineTo(12, -11);
        ctx.stroke();
      }
    } else if (kind === "bit") {
      paintShape(ctx, dark, () => {
        ctx.moveTo(-1.5, -10);
        ctx.lineTo(4.6, -10);
        ctx.lineTo(1.6, -5.5);
        ctx.closePath();
      });
    } else if (kind === "bandit") {
      ctx.fillStyle = "#1a1408";
      ctx.fillRect(-0.6, -10.1, 5.2, 1.5);
      paintShape(ctx, "#e8c547", () => ctx.arc(-4.2, 1.2, 2.3, 0, Math.PI * 2));
      ctx.fillStyle = "#1a1408";
      ctx.font = "700 4px 'Chakra Petch', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("$", -4.2, 1.4);
      if (options.purse) {
        paintShape(ctx, "#fff1a8", () => ctx.arc(0.4, -14.2, 2.1, 0, Math.PI * 2));
      }
    } else if (kind === "sapper") {
      paintShape(ctx, "#f0d24a", () => ctx.rect(-1.4, -13.2, 6, 2.4));
      paintShape(ctx, dark, () => ctx.rect(-7.2, -5, 3.4, 5));
      paintShape(ctx, "#2a140c", () => ctx.arc(7.2, -1, 2.2, 0, Math.PI * 2));
      ctx.strokeStyle = "#2a140c";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(7.2, -3.2);
      ctx.lineTo(8.4, -5.4);
      ctx.stroke();
    } else if (kind === "boss" || kind === "final" || kind === "rival") {
      const horn = kind === "rival" ? "#e8c547" : kind === "final" ? "#e8c547" : "#c9b27a";
      paintShape(ctx, horn, () => {
        ctx.moveTo(-0.4, -11.2);
        ctx.lineTo(-2.4, -15.4);
        ctx.lineTo(1.2, -11);
        ctx.closePath();
      });
      paintShape(ctx, horn, () => {
        ctx.moveTo(2.2, -11.4);
        ctx.lineTo(4.6, -15.6);
        ctx.lineTo(4.8, -11);
        ctx.closePath();
      });
      if (kind === "final") {
        paintShape(ctx, "#e8c547", () => ctx.rect(-1.2, -13.4, 5.4, 1.6));
      }
    } else if (kind === "shambler" || kind === "brute") {
      paintShape(ctx, skin, () => ctx.rect(-8, -4, 4.2, 1.6));
      paintShape(ctx, skin, () => ctx.rect(hip - 1, -3, 5, 1.6));
    } else if (kind === "cone") {
      paintShape(ctx, "#e25822", () => {
        ctx.moveTo(-1.2, -11);
        ctx.lineTo(1.6, -16);
        ctx.lineTo(4.6, -11);
        ctx.closePath();
      });
    } else if (kind === "scout") {
      ctx.strokeStyle = "#d7dde4";
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(6, -4, 4.2, -1.1, 1.1);
      ctx.stroke();
    } else if (kind === "hunter") {
      ctx.strokeStyle = "#2a140c";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(3, -4);
      ctx.lineTo(11, -5);
      ctx.moveTo(11, -5);
      ctx.lineTo(11, -2);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function blobShadow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rx: number,
  ry: number,
): void {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.34)";
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
