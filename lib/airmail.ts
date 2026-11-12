/** Versioned deterministic flight simulation; used in canvas and replayed by the server. */
export const FLIGHT_VERSION = 1;
export const FPS = 30,
  MAX_FRAMES = 1800,
  HEIGHT = 520,
  WORLD_END = 6200;
export const INPUT = { UP: 1, DOWN: 2, SLOW: 4, FAST: 8, DROP: 16 } as const;
export type FlightEvent = [number, number];
export type Destination = { id: number; x: number; y: number; width: number; name: string };
export type Route = {
  destinations: Destination[];
  birds: { x: number; y: number; phase: number }[];
  rings: { x: number; y: number }[];
  seed: number;
};
export type Parcel = { x: number; y: number; vx: number; vy: number; active: boolean };
export type Flight = {
  frame: number;
  x: number;
  y: number;
  vy: number;
  vx: number;
  health: number;
  invulnerable: number;
  parcels: number;
  packages: Parcel[];
  delivered: number[];
  ringIds: number[];
  deliveryScore: number;
  ringScore: number;
  combo: number;
  maxCombo: number;
  lastMask: number;
  done: boolean;
  reason: "time" | "arrived" | "crash" | null;
  feedback: { text: string; frame: number; kind: string } | null;
};
export type FlightResult = {
  score: number;
  deliveries: number;
  rings: number;
  distance: number;
  health: number;
  precisionScore: number;
  maxCombo: number;
  frames: number;
  reason: string;
};
function random(seed: number) {
  let n = seed >>> 0;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
export function createRoute(seed: number): Route {
  const r = random(seed);
  return {
    seed,
    destinations: [780, 1560, 2420, 3260, 4160, 5060].map((x, i) => ({
      id: i,
      x: x + Math.floor(r() * 100),
      y: 365 - Math.floor(r() * 80),
      width: 100,
      name: ["Biblioteca", "Dona Zefa", "Coreto", "Oficina", "Observatório", "Casa do Lago"][i],
    })),
    birds: [1170, 2050, 2850, 3770, 4610, 5540].map((x) => ({
      x,
      y: 130 + r() * 100,
      phase: r() * Math.PI * 2,
    })),
    rings: [480, 1320, 2170, 2940, 3690, 4530, 5370, 5850].map((x) => ({ x, y: 125 + r() * 140 })),
  };
}
export function initialFlight(): Flight {
  return {
    frame: 0,
    x: 100,
    y: 190,
    vy: 0,
    vx: 100,
    health: 3,
    invulnerable: 0,
    parcels: 8,
    packages: [],
    delivered: [],
    ringIds: [],
    deliveryScore: 0,
    ringScore: 0,
    combo: 0,
    maxCombo: 0,
    lastMask: 0,
    done: false,
    reason: null,
    feedback: null,
  };
}
export function birdY(b: Route["birds"][number], frame: number) {
  return b.y + Math.sin(frame / 36 + b.phase) * 42;
}
export function windAt(seed: number, frame: number) {
  return Math.sin(frame / 100 + (seed % 70)) * 0.7 + Math.sin(frame / 43) * 0.3;
}
function feedback(s: Flight, text: string, kind: string) {
  s.feedback = { text, kind, frame: s.frame };
}
function damage(s: Flight) {
  if (s.invulnerable > 0) return;
  s.health--;
  s.invulnerable = 60;
  s.combo = 0;
  s.vy = -65;
  feedback(s, s.health ? "Cuidado com os obstáculos!" : "O voo terminou. Tente outra rota.", "hit");
  if (s.health <= 0) {
    s.done = true;
    s.reason = "crash";
  }
}
export function stepFlight(s: Flight, mask: number, route: Route) {
  if (s.done) return;
  s.frame++;
  const dt = 1 / FPS,
    vertical = (mask & INPUT.DOWN ? 1 : 0) - (mask & INPUT.UP ? 1 : 0);
  s.vx = 100 + (mask & INPUT.FAST ? 30 : 0) - (mask & INPUT.SLOW ? 30 : 0);
  s.vy += (vertical * 265 + windAt(route.seed, s.frame) * 40) * dt;
  s.vy *= 0.965;
  s.vy = Math.max(-155, Math.min(155, s.vy));
  s.x += s.vx * dt;
  s.y += s.vy * dt;
  if (s.invulnerable > 0) s.invulnerable--;
  if (s.y < 48) {
    s.y = 48;
    s.vy = 30;
    damage(s);
  }
  if (s.y > 465) {
    s.y = 465;
    s.vy = -60;
    damage(s);
  }
  if (mask & INPUT.DROP && !(s.lastMask & INPUT.DROP) && s.parcels > 0) {
    s.parcels--;
    s.packages.push({ x: s.x, y: s.y + 13, vx: s.vx * 0.88, vy: 25, active: true });
  }
  s.lastMask = mask;
  for (let i = 0; i < route.rings.length; i++) {
    const ring = route.rings[i];
    if (!s.ringIds.includes(i) && Math.hypot(s.x - ring.x, s.y - ring.y) < 33) {
      s.ringIds.push(i);
      s.ringScore += 50;
      feedback(s, "Rota postal +50", "ring");
    }
  }
  for (const bird of route.birds) {
    if (Math.abs(s.x - bird.x) < 35 && Math.abs(s.y - birdY(bird, s.frame)) < 28) damage(s);
  }
  for (const d of route.destinations) {
    if (Math.abs(s.x - d.x) < d.width / 2 + 18 && s.y > d.y - 16) damage(s);
  }
  for (const p of s.packages) {
    if (!p.active) continue;
    const before = p.y;
    p.vy += 220 * dt;
    p.vx += windAt(route.seed, s.frame) * 8 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    for (const d of route.destinations) {
      if (before <= d.y && p.y >= d.y && Math.abs(p.x - d.x) < d.width / 2) {
        p.active = false;
        if (!s.delivered.includes(d.id)) {
          s.delivered.push(d.id);
          s.combo++;
          s.maxCombo = Math.max(s.maxCombo, s.combo);
          const precision = Math.max(0, 100 - Math.round(Math.abs(p.x - d.x) * 2));
          const points = 200 + precision + (s.combo - 1) * 25;
          s.deliveryScore += points;
          feedback(s, "Entregue! +" + points, "delivery");
        } else {
          feedback(s, "Esse destino já recebeu.", "miss");
        }
        break;
      }
    }
    if (p.active && p.y > 490) {
      p.active = false;
      s.combo = 0;
      feedback(s, "A encomenda não chegou ao destino.", "miss");
    }
  }
  if (s.frame >= MAX_FRAMES) {
    s.done = true;
    s.reason = "time";
  }
  if (s.x >= WORLD_END) {
    s.done = true;
    s.reason = "arrived";
  }
}
export function flightResult(s: Flight): FlightResult {
  return {
    score:
      s.deliveryScore +
      s.ringScore +
      Math.floor((s.x - 100) / 100) +
      (s.delivered.length === 6 ? 300 : 0),
    deliveries: s.delivered.length,
    rings: s.ringIds.length,
    distance: Math.round(s.x - 100),
    health: s.health,
    precisionScore: s.deliveryScore,
    maxCombo: s.maxCombo,
    frames: s.frame,
    reason: s.reason || "unfinished",
  };
}
export function predictedLanding(s: Flight, route: Route) {
  const next = route.destinations.find((d) => d.x > s.x - 30 && !s.delivered.includes(d.id));
  if (!next || s.y + 13 >= next.y) return null;
  const h = next.y - (s.y + 13),
    t = (-25 + Math.sqrt(625 + 440 * h)) / 220;
  return { x: s.x + s.vx * 0.88 * t, y: next.y, target: next };
}
export class FlightError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function replayFlight(seed: number, events: unknown, frames: number) {
  if (!Number.isInteger(frames) || frames < 1 || frames > MAX_FRAMES)
    throw new FlightError("Duração da partida inválida.");
  if (!Array.isArray(events) || events.length > MAX_FRAMES + 1)
    throw new FlightError("Comandos inválidos.");
  let previous = -1;
  for (const e of events) {
    if (
      !Array.isArray(e) ||
      e.length !== 2 ||
      !Number.isInteger(e[0]) ||
      e[0] <= previous ||
      e[0] < 0 ||
      e[0] >= frames ||
      !Number.isInteger(e[1]) ||
      e[1] < 0 ||
      e[1] > 31
    )
      throw new FlightError("Sequência de comandos inválida.");
    previous = e[0];
  }
  const s = initialFlight(),
    route = createRoute(seed);
  let cursor = 0,
    mask = 0;
  for (let frame = 0; frame < frames; frame++) {
    if (s.done) throw new FlightError("Comandos após o fim da partida.");
    if (cursor < events.length && (events[cursor] as FlightEvent)[0] === frame) {
      mask = (events[cursor++] as FlightEvent)[1];
    }
    stepFlight(s, mask, route);
  }
  if (!s.done) throw new FlightError("Termine a partida antes de registrar o resultado.");
  return flightResult(s);
}
export const AIRMAIL_ACHIEVEMENTS = [
  {
    key: "first-flight",
    title: "Primeiro voo",
    description: "Concluir uma partida de Correio Aéreo.",
    xp: 10,
    icon: "🛩️",
    test: (r: FlightResult) => r.frames >= 30,
  },
  {
    key: "first-delivery",
    title: "Tem carta para você",
    description: "Fazer sua primeira entrega.",
    xp: 20,
    icon: "📮",
    test: (r: FlightResult) => r.deliveries >= 1,
  },
  {
    key: "three-deliveries",
    title: "Carteiro dos ares",
    description: "Fazer três entregas em uma partida.",
    xp: 40,
    icon: "✉️",
    test: (r: FlightResult) => r.deliveries >= 3,
  },
  {
    key: "postal-route",
    title: "Pelos bons caminhos",
    description: "Cruzar cinco anéis postais em uma partida.",
    xp: 30,
    icon: "🧭",
    test: (r: FlightResult) => r.rings >= 5,
  },
  {
    key: "thousand",
    title: "Mil nos ares",
    description: "Alcançar 1.000 pontos em uma partida.",
    xp: 50,
    icon: "⭐",
    test: (r: FlightResult) => r.score >= 1000,
  },
  {
    key: "perfect-route",
    title: "Nenhuma carta para trás",
    description: "Entregar nos seis destinos em uma partida.",
    xp: 80,
    icon: "🏅",
    test: (r: FlightResult) => r.deliveries === 6,
  },
] as const;
export function playerLevel(xp: number) {
  const thresholds = [0, 30, 80, 150, 250, 400, 600, 850, 1200, 1600];
  let level = 1;
  for (let i = 0; i < thresholds.length; i++) if (xp >= thresholds[i]) level = i + 1;
  const base = thresholds[level - 1],
    next = thresholds[level] ?? null;
  return {
    level,
    base,
    next,
    progress: next ? Math.min(100, Math.round(((xp - base) / (next - base)) * 100)) : 100,
  };
}
