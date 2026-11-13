"use client";
import { compatibleSpots, NATURE_SPOTS, SUPPORTS, type Placement } from "../lib/nature-placement";
export function PlacementPreview({
  url,
  placement,
  spot,
}: {
  url: string;
  placement: Placement;
  spot: string;
}) {
  const width = placement.size === "tiny" ? 62 : placement.size === "small" ? 96 : 136;
  return (
    <div className="relative mt-3 h-28 overflow-hidden rounded-lg bg-[#e7eadf]">
      <div className="absolute inset-x-3 bottom-5 border-b border-[#244e35]/50" />
      <img
        src={url}
        alt=""
        className="absolute object-contain"
        style={{
          width,
          height: 92,
          left: spot === "margin" ? -18 : spot === "button" ? 22 : "45%",
          bottom: 20 - placement.baseline * 0.6,
          objectPosition: "bottom",
        }}
      />
      <span className="absolute bottom-0 left-3 text-[10px] text-[#667064]">
        {NATURE_SPOTS[spot as keyof typeof NATURE_SPOTS]}
      </span>
    </div>
  );
}
export default function NaturePlacementEditor({
  url,
  value,
  onChange,
  disabled = false,
}: {
  url: string;
  value: Placement;
  onChange: (v: Placement) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-4">
      <legend className="font-serif text-2xl">Onde este elemento pode aparecer?</legend>
      <p className="text-sm">
        Escolha os encaixes. As prévias e estas regras acompanham a proposta; só imagens aprovadas
        entram no site.
      </p>
      <label className="block text-sm">
        Como ele se apoia?
        <select
          value={value.support}
          onChange={(e) => {
            const support = e.target.value as Placement["support"];
            onChange({
              ...value,
              support,
              spots: compatibleSpots(support).slice(0, 2),
              motion: support === "ground" ? "stroll" : "sway",
            });
          }}
          className="mt-2 w-full border bg-white p-3"
        >
          {Object.entries(SUPPORTS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        {compatibleSpots(value.support).map((spot) => (
          <label
            key={spot}
            className={`rounded-lg border p-3 text-sm ${value.spots.includes(spot) ? "border-[#244e35] bg-white" : "border-[#c8c0b1]"}`}
          >
            <span className="flex gap-2">
              <input
                type="checkbox"
                checked={value.spots.includes(spot)}
                onChange={(e) =>
                  onChange({
                    ...value,
                    spots: e.target.checked
                      ? [...value.spots, spot]
                      : value.spots.filter((s) => s !== spot),
                  })
                }
              />
              {NATURE_SPOTS[spot]}
            </span>
            <PlacementPreview url={url} placement={value} spot={spot} />
          </label>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Tamanho
          <select
            value={value.size}
            onChange={(e) => onChange({ ...value, size: e.target.value as Placement["size"] })}
            className="mt-2 w-full border bg-white p-3"
          >
            <option value="tiny">Pequeno achado</option>
            <option value="small">Discreto</option>
            <option value="medium">Em destaque</option>
          </select>
        </label>
        <label className="text-sm">
          Movimento
          <select
            value={value.motion}
            onChange={(e) => onChange({ ...value, motion: e.target.value as Placement["motion"] })}
            className="mt-2 w-full border bg-white p-3"
          >
            <option value="still">Parado</option>
            {value.support !== "ground" && <option value="sway">Balanço suave</option>}
            {value.support === "ground" && <option value="stroll">Pequeno deslocamento</option>}
          </select>
        </label>
      </div>
      <label className="block text-sm">
        Ajustar apoio da base · {value.baseline}%
        <input
          type="range"
          min="0"
          max="20"
          value={value.baseline}
          onChange={(e) => onChange({ ...value, baseline: Number(e.target.value) })}
          className="mt-3 block w-full"
        />
      </label>
      <p className="text-xs text-[#667064]">
        No celular, os encaixes são menores. A preferência por movimento reduzido é respeitada.
      </p>
    </fieldset>
  );
}
