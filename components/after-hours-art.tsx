import type { Design } from "../lib/after-hours";
export function MapArt() {
  return (
    <svg
      preserveAspectRatio="none"
      viewBox="0 0 1000 650"
      aria-hidden="true"
      className="ah-map-art"
    >
      <defs>
        <pattern id="ah-grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#c9dfbe" strokeOpacity=".055" />
        </pattern>
        <pattern id="ah-water" width="40" height="26" patternUnits="userSpaceOnUse">
          <path
            d="M5 13q10-8 20 0"
            fill="none"
            stroke="#b1d7c5"
            strokeOpacity=".23"
            strokeWidth="1.5"
          />
        </pattern>
        <radialGradient id="ah-glow">
          <stop stopColor="#9ab677" stopOpacity=".18" />
          <stop offset="1" stopColor="#163e35" stopOpacity="0" />
        </radialGradient>
        <symbol id="ah-tree" viewBox="0 0 48 70">
          <path d="M24 46v23" stroke="#b8aa79" strokeWidth="3" />
          <path
            d="M24 2L5 28h10L0 50h48L33 28h10z"
            fill="#54765b"
            stroke="#7f9971"
            strokeWidth="1"
          />
        </symbol>
      </defs>
      <rect width="1000" height="650" fill="#153c34" />
      <rect width="1000" height="650" fill="url(#ah-grid)" />
      <ellipse cx="400" cy="280" rx="460" ry="350" fill="url(#ah-glow)" />
      <path
        d="M520 180C640 115 800 155 809 275s-15 223-133 252-209-25-196-116 97-86 50-149z"
        fill="#346b67"
        stroke="#8fb5a0"
        strokeWidth="2"
      />
      <path
        d="M520 180C640 115 800 155 809 275s-15 223-133 252-209-25-196-116 97-86 50-149z"
        fill="url(#ah-water)"
      />
      <path
        d="M624 251q46-16 72 28t-20 53q-56 12-61-28z"
        fill="#8f9b71"
        stroke="#c6c8a0"
        strokeWidth="2"
      />
      <path
        d="M127 517Q126 354 250 313T389 146Q518 49 689 117L852 228M127 517L351 552 491 416 250 313M689 117L648 299"
        fill="none"
        stroke="#b5ba8d"
        strokeWidth="3"
        strokeDasharray="6 10"
        opacity=".5"
      />
      <path
        d="M491 416L648 299"
        fill="none"
        stroke="#e0c16f"
        strokeWidth="2"
        strokeDasharray="3 9"
      />
      <g opacity=".7">
        {[
          [90, 230, 45],
          [150, 260, 40],
          [190, 160, 52],
          [270, 145, 43],
          [210, 400, 40],
          [300, 420, 42],
          [365, 350, 36],
          [425, 70, 42],
          [480, 95, 32],
          [80, 415, 40],
          [820, 75, 45],
          [870, 99, 40],
          [890, 455, 56],
          [830, 485, 42],
          [910, 350, 42],
          [410, 570, 48],
          [710, 560, 40],
        ].map(([x, y, w], i) => (
          <use key={i} href="#ah-tree" x={x} y={y} width={w} height={w * 1.45} />
        ))}
      </g>
      <g fill="none" stroke="#c1c49b" opacity=".4">
        <path d="M82 78h70m-35-35v70" />
        <circle cx="117" cy="78" r="24" />
        <path d="m117 48 5 30-5 9-5-9z" fill="#c1c49b" />
      </g>
      <text x="112" y="35" fill="#c1c49b" fontSize="12" fontFamily="serif">
        N
      </text>
      <text
        x="570"
        y="450"
        fill="#cee0cb"
        opacity=".5"
        fontSize="17"
        fontStyle="italic"
        fontFamily="serif"
        transform="rotate(-18 570 450)"
      >
        Lago do quase
      </text>
      <path d="M65 595h110m-110-5v10m110-10v10" stroke="#b5ba8d" opacity=".5" />
      <text x="65" y="620" fill="#b5ba8d" fontFamily="monospace" fontSize="11">
        DISTÂNCIAS IMAGINÁRIAS
      </text>
    </svg>
  );
}
export function PlaceIcon({ kind }: { kind: string }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...common}>
      {kind === "tent" ? (
        <>
          <path d="m3 27 13-22 13 22zM16 5v22m0-12 7 12H9z" />
        </>
      ) : kind === "tree" ? (
        <>
          <path d="m16 2-9 12h5L4 24h24l-8-10h5zM16 24v6" />
        </>
      ) : kind === "glass" ? (
        <>
          <path d="M3 28V14L16 3l13 11v14zM3 14h26M16 3v25M9 9v19m14-19v19" />
        </>
      ) : kind === "station" ? (
        <>
          <path d="M10 29h12l-6-18zM5 4q-4 8 3 13m19-13q4 8-3 13M10 6q-3 4 0 8m12-8q3 4 0 8" />
          <circle cx="16" cy="9" r="2" />
        </>
      ) : kind === "wheel" ? (
        <>
          <circle cx="16" cy="16" r="11" />
          <circle cx="16" cy="16" r="3" />
          <path d="M16 2v11m0 6v11M2 16h11m6 0h11M6 6l8 8m4 4 8 8M6 26l8-8m4-4 8-8" />
        </>
      ) : kind === "boat" ? (
        <>
          <path d="m3 21 5 7h17l4-7zM16 3v18M16 4 5 17h11m3-10 7 10h-7" />
        </>
      ) : kind === "island" ? (
        <>
          <path d="M3 28q13-10 26 0M16 25V9m0 0q-8-10-12 0 8-3 12 0 7-11 12-2-7-1-12 2 7-1 9 6-6-4-9-6" />
        </>
      ) : (
        <>
          <path d="M3 26h26M7 26V15h18v11M10 15V7h12v8M13 7V3h6v4" />
          <path d="M12 19h3m3 0h3M12 23h3m3 0h3" />
        </>
      )}
    </svg>
  );
}
export function BoatArt({ design, small = false }: { design: Design; small?: boolean }) {
  return (
    <svg
      viewBox="0 0 360 240"
      aria-hidden="true"
      className={small ? "ah-boat-small" : "ah-boat-art"}
    >
      <ellipse cx="180" cy="204" rx="140" ry="13" fill="#0d2d29" opacity=".12" />
      {design.hull === "bottles" ? (
        <g fill="#91b8a0" stroke="#315c50" strokeWidth="2">
          {[80, 110, 140, 170, 200, 230, 260].map((x) => (
            <rect key={x} x={x} y="167" width="24" height="36" rx="10" />
          ))}
        </g>
      ) : (
        <path d="M55 160h258l-32 43H89z" fill="#ad774b" stroke="#634b37" strokeWidth="3" />
      )}
      <path d="M65 165h235v13H65z" fill="#e2c382" stroke="#6b6548" strokeWidth="2" />
      {design.drive === "sail" ? (
        <>
          <path d="M180 165V28" stroke="#776348" strokeWidth="5" />
          <path d="M177 32 86 145h91z" fill="#f0d991" stroke="#b39c64" strokeWidth="2" />
          <path d="m187 61 62 84h-62z" fill="#e5b86a" />
          <path d="m138 84 18 8m-30 6 30 7" stroke="#b39c64" strokeWidth="1.5" />
        </>
      ) : design.drive === "propeller" ? (
        <>
          <path d="M90 159V92" stroke="#635a45" strokeWidth="5" />
          <circle cx="90" cy="86" r="9" fill="#d0b97e" />
          <g fill="#51776c" stroke="#2c5248" strokeWidth="2">
            <path d="M86 81Q40 43 62 35q27 0 30 43M96 81q52-16 49 8-12 22-49 1M87 93q-12 52-33 39-10-18 27-43" />
          </g>
          <rect x="72" y="145" width="40" height="18" rx="3" fill="#d9ae64" />
        </>
      ) : (
        <>
          <path d="M92 162v-32h82v32" fill="#c3c7b2" stroke="#637b68" strokeWidth="2" />
          <path
            d="m100 145 6-10 6 20 6-20 6 20 6-20 6 20 6-20 6 20 6-20 6 10"
            fill="none"
            stroke="#61735b"
            strokeWidth="2"
          />
          <path d="M133 130v-20h17" stroke="#61735b" strokeWidth="3" />
        </>
      )}
      <g transform={`translate(${(design.trim - 2) * 25} 0)`}>
        {Array.from({ length: design.cells }, (_, i) => (
          <g key={i}>
            <rect
              x={210 + i * 22}
              y={137 - i * 3}
              width="18"
              height="26"
              rx="3"
              fill="#739879"
              stroke="#355b47"
              strokeWidth="1.5"
            />
            <path d={`M${215 + i * 22} ${134 - i * 3}h8v3h-8z`} fill="#355b47" />
            <path
              d={`m${220 + i * 22} ${143 - i * 3}-4 7h7l-4 7`}
              fill="none"
              stroke="#f1dd98"
              strokeWidth="1.5"
            />
          </g>
        ))}
        <rect x="178" y="143" width="25" height="20" rx="3" fill="#d4a868" stroke="#846b43" />
        <path d="M190 144v18m-11-10h23" stroke="#846b43" />
      </g>
      <path
        d="M46 212q24-10 48 0t48 0m110 0q24-10 48 0t28-2"
        stroke="#5e998b"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}
