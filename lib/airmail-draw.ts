import {
  HEIGHT,
  MAX_FRAMES,
  createRoute,
  birdY,
  windAt,
  predictedLanding,
  flightResult,
  type Flight,
  type Route,
} from "./airmail";
const TAU = Math.PI * 2;
function round(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 5) {
  c.beginPath();
  c.roundRect(x, y, w, h, r);
}
function cloud(c: CanvasRenderingContext2D, x: number, y: number, size: number) {
  c.fillStyle = "#fff9eccc";
  c.beginPath();
  c.ellipse(x, y, size * 1.5, size * 0.38, 0, 0, TAU);
  c.ellipse(x - size * 0.35, y - size * 0.2, size * 0.65, size * 0.48, 0, 0, TAU);
  c.ellipse(x + size * 0.35, y - size * 0.3, size * 0.7, size * 0.6, 0, 0, TAU);
  c.fill();
}
export function drawFlight(
  c: CanvasRenderingContext2D,
  s: Flight,
  route: Route,
  w: number,
  h: number,
  dpr = 1,
  preview = false,
) {
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, w, h);
  const scale = h / HEIGHT,
    view = w / scale,
    planeX = Math.min(180, view * 0.25),
    camera = s.x - planeX;
  c.scale(scale, scale);
  const sky = c.createLinearGradient(0, 0, 0, 520);
  sky.addColorStop(0, "#a1c6c2");
  sky.addColorStop(0.7, "#e4dfbd");
  sky.addColorStop(1, "#eee2b8");
  c.fillStyle = sky;
  c.fillRect(0, 0, view, 520);
  c.fillStyle = "#fff1b2";
  c.beginPath();
  c.arc(view * 0.79, 99, 41, 0, TAU);
  c.fill();
  for (let i = -1; i < 7; i++) {
    const x = (i * 260 - camera * 0.14) % 1900;
    cloud(c, x, 85 + (i % 3) * 45, 35 + (i % 2) * 15);
  }
  for (let layer = 0; layer < 3; layer++) {
    c.fillStyle = ["#a5bba0", "#829c7c", "#557c62"][layer];
    c.beginPath();
    c.moveTo(0, 490);
    for (let x = 0; x <= view + 20; x += 20)
      c.lineTo(
        x,
        380 +
          layer * 30 +
          Math.sin((x + camera * (0.12 + layer * 0.1)) / 160 + layer) * 35 +
          Math.cos((x + camera * 0.08) / 78) * 10,
      );
    c.lineTo(view, 520);
    c.closePath();
    c.fill();
  }
  c.fillStyle = "#9fa772";
  c.fillRect(0, 485, view, 35);
  c.fillStyle = "#738d58";
  c.fillRect(0, 485, view, 5);
  for (let i = 0; i < 85; i++) {
    const x = i * 94 + ((i * 43) % 40) - camera;
    if (x < -60 || x > view + 60) continue;
    const treeY = 492,
      treeH = 30 + ((i * 23) % 40);
    c.fillStyle = "#52694c";
    c.fillRect(x - 2, treeY - treeH, 4, treeH);
    c.fillStyle = i % 2 ? "#466e4d" : "#68864e";
    c.beginPath();
    c.ellipse(x, treeY - treeH, 15 + treeH / 8, treeH * 0.55, 0, 0, TAU);
    c.fill();
  }
  for (const d of route.destinations) {
    const x = d.x - camera;
    if (x < -120 || x > view + 120) continue;
    const done = s.delivered.includes(d.id);
    c.fillStyle = ["#e6bd8c", "#dad2a3", "#c9bd90", "#d2b3a1", "#c8cbb0", "#e1c398"][d.id];
    c.fillRect(x - d.width / 2, d.y + 6, d.width, 490 - d.y);
    c.fillStyle = "#55776b";
    c.beginPath();
    c.moveTo(x - d.width / 2 - 7, d.y + 6);
    c.lineTo(x, d.y - 15);
    c.lineTo(x + d.width / 2 + 7, d.y + 6);
    c.closePath();
    c.fill();
    c.fillStyle = "#8b8c6d";
    c.fillRect(x - 11, 450, 22, 38);
    for (let win = 0; win < 3; win++) {
      c.fillStyle = "#f9ecc5";
      c.fillRect(x - 36 + win * 27, d.y + 26, 14, 21);
      c.fillStyle = "#8a9983";
      c.fillRect(x - 29 + win * 27, d.y + 26, 1, 21);
    }
    c.strokeStyle = done ? "#3f7c52" : "#f4c75e";
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(x - 40, d.y - 5);
    c.lineTo(x + 40, d.y - 5);
    c.stroke();
    c.fillStyle = done ? "#3c7552" : "#e8b64b";
    round(c, x - 11, d.y - 35, 22, 18, 3);
    c.fill();
    c.fillStyle = "#fff8db";
    c.font = "bold 13px Arial";
    c.textAlign = "center";
    c.fillText(done ? "✓" : "✉", x, d.y - 21);
    c.font = "11px Georgia";
    c.fillStyle = "#234d40";
    c.fillText(d.name, x, 510);
  }
  for (let i = 0; i < route.rings.length; i++) {
    const r = route.rings[i],
      x = r.x - camera;
    if (x < -40 || x > view + 40 || s.ringIds.includes(i)) continue;
    c.strokeStyle = "#f3d187";
    c.lineWidth = 7;
    c.setLineDash([8, 5]);
    c.beginPath();
    c.ellipse(x, r.y, 20, 32, 0, 0, TAU);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = "#b9914e";
    c.lineWidth = 1;
    c.beginPath();
    c.ellipse(x, r.y, 23, 35, 0, 0, TAU);
    c.stroke();
  }
  for (const b of route.birds) {
    const x = b.x - camera,
      y = birdY(b, s.frame);
    if (x < -70 || x > view + 70) continue;
    const wing = Math.sin(s.frame * 0.24 + b.phase) * 12;
    c.strokeStyle = "#425b4f";
    c.lineWidth = 5;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(x - 22, y + wing);
    c.quadraticCurveTo(x - 8, y - 13, x, y);
    c.quadraticCurveTo(x + 8, y - 13, x + 22, y + wing);
    c.stroke();
    c.fillStyle = "#c5a563";
    c.beginPath();
    c.arc(x + 3, y, 5, 0, TAU);
    c.fill();
  }
  const predicted = predictedLanding(s, route);
  if (predicted && s.parcels > 0 && !s.done) {
    const x = predicted.x - camera,
      ok = Math.abs(predicted.x - predicted.target.x) < predicted.target.width / 2;
    c.strokeStyle = ok ? "#3f7e57aa" : "#8d8e6e88";
    c.lineWidth = 1;
    c.setLineDash([3, 6]);
    c.beginPath();
    c.moveTo(planeX, s.y + 15);
    c.quadraticCurveTo(planeX + (x - planeX) * 0.65, s.y + 40, x, predicted.y - 9);
    c.stroke();
    c.setLineDash([]);
    c.strokeStyle = ok ? "#3d8250" : "#8a8b63";
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(x, predicted.y - 7, 12, 4, 0, 0, TAU);
    c.stroke();
    if (ok) {
      c.fillStyle = "#2e6b45";
      c.font = "bold 10px Arial";
      c.textAlign = "center";
      c.fillText("SOLTAR", planeX, s.y - 30);
    }
  }
  for (const p of s.packages) {
    if (!p.active) continue;
    const x = p.x - camera;
    c.save();
    c.translate(x, p.y);
    c.rotate(Math.sin(p.y / 22) * 0.15);
    c.fillStyle = "#f1d6a0";
    c.fillRect(-7, -5, 14, 10);
    c.strokeStyle = "#986c43";
    c.lineWidth = 1;
    c.strokeRect(-7, -5, 14, 10);
    c.beginPath();
    c.moveTo(-7, -5);
    c.lineTo(0, 1);
    c.lineTo(7, -5);
    c.stroke();
    c.restore();
  }
  c.save();
  c.translate(planeX, s.y);
  c.rotate(Math.max(-0.35, Math.min(0.35, s.vy / 350)));
  if (s.invulnerable > 0 && s.frame % 8 < 4) c.globalAlpha = 0.4;
  c.fillStyle = "#8a9a7c66";
  c.beginPath();
  c.ellipse(-30, 15, 39, 6, 0, 0, TAU);
  c.fill();
  c.fillStyle = "#db7f4d";
  c.strokeStyle = "#854f35";
  c.lineWidth = 1.5;
  c.beginPath();
  c.moveTo(-39, 3);
  c.lineTo(29, -5);
  c.quadraticCurveTo(44, 0, 28, 10);
  c.lineTo(-34, 9);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#f1c765";
  c.beginPath();
  c.moveTo(-24, -7);
  c.lineTo(13, -7);
  c.lineTo(1, -1);
  c.lineTo(-30, -1);
  c.closePath();
  c.fill();
  c.stroke();
  c.fillStyle = "#d59b56";
  c.fillRect(-12, 7, 29, 5);
  c.strokeRect(-12, 7, 29, 5);
  c.strokeStyle = "#7e6045";
  c.beginPath();
  c.moveTo(-17, -7);
  c.lineTo(-11, 8);
  c.moveTo(10, -7);
  c.lineTo(8, 8);
  c.stroke();
  c.fillStyle = "#294f47";
  c.beginPath();
  c.arc(6, -4, 6, Math.PI, 0);
  c.fill();
  c.fillStyle = "#c66a43";
  c.beginPath();
  c.moveTo(-32, 4);
  c.lineTo(-36, -13);
  c.lineTo(-27, -12);
  c.lineTo(-20, 5);
  c.fill();
  c.strokeStyle = "#668478";
  c.lineWidth = 2;
  c.beginPath();
  const prop = Math.sin(s.frame * 0.9) * 15;
  c.moveTo(36, -prop);
  c.lineTo(36, prop);
  c.stroke();
  c.restore();
  if (s.feedback && s.frame - s.feedback.frame < 65) {
    c.textAlign = "center";
    c.font = "bold 13px Arial";
    c.fillStyle = s.feedback.kind === "hit" ? "#9a4c36" : "#265b40";
    c.fillText(s.feedback.text, view / 2, 77);
  }
  if (preview) {
    c.fillStyle = "#173d3710";
    c.fillRect(0, 0, view, 520);
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
}
