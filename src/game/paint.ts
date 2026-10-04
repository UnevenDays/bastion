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
