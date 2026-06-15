import { useEffect, useRef } from "react";
import type { HudState } from "./game/engine";

const SIZE = 132;

export function Minimap({ hud }: { hud: HudState }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const half = hud.mapSize / 2;
    const scale = SIZE / hud.mapSize;
    const toX = (x: number) => (x + half) * scale;
    const toY = (z: number) => (z + half) * scale;

    ctx.clearRect(0, 0, SIZE, SIZE);
    // ground
    ctx.fillStyle = "#1d3a24";
    ctx.fillRect(0, 0, SIZE, SIZE);
    // grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const p = (i / 4) * SIZE;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, SIZE);
      ctx.moveTo(0, p);
      ctx.lineTo(SIZE, p);
      ctx.stroke();
    }

    // safe zone circle
    const cx = toX(0);
    const cy = toY(0);
    const r = hud.zoneRadius * scale;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = hud.zoneShrinking ? "rgba(53,167,255,0.12)" : "rgba(53,167,255,0.08)";
    ctx.fill();
    ctx.strokeStyle = hud.zoneShrinking ? "#ff5050" : "#35a7ff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // enemies
    ctx.fillStyle = "#ff4444";
    for (const e of hud.enemies) {
      ctx.beginPath();
      ctx.arc(toX(e.x), toY(e.z), 2.6, 0, Math.PI * 2);
      ctx.fill();
    }

    // player (arrow)
    const px = toX(hud.playerX);
    const py = toY(hud.playerZ);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-hud.playerAngle);
    ctx.fillStyle = "#fde047";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(0, 2);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [hud]);

  return (
    <div className="overflow-hidden rounded-lg border-2 border-white/30 bg-black/60 shadow-lg backdrop-blur">
      <canvas ref={ref} width={SIZE} height={SIZE} className="block" />
    </div>
  );
}
