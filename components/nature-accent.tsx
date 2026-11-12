"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { readPlacement, type Placement } from "../lib/nature-placement";
import {
  natureCandidates,
  rotateNature,
  natureScale,
  type NatureRole,
} from "../lib/nature-rotation";
type Asset = { id: string; url: string; placement: Placement };
type Decoration = {
  asset: Asset;
  target: HTMLElement;
  role: NatureRole;
  key: string;
  ambient?: "top" | "bottom" | "visitor";
};
export default function NatureAccent() {
  const pathname = usePathname(),
    [items, setItems] = useState<Decoration[]>([]),
    [grass, setGrass] = useState<string | null>(null),
    [waterPad, setWaterPad] = useState<string | null>(null);
  useEffect(() => {
    let alive = true,
      observer: MutationObserver | undefined,
      pool: Asset[] = [];
    const selected = new Map<string, string>();
    const media = window.matchMedia("(max-width:639px)");
    setItems([]);
    const choose = () => {
      if (!alive || !pool.length) return;
      const main = document.querySelector<HTMLElement>("main");
      if (!main) return;
      const next: Decoration[] = [],
        used: string[] = [];
      const pick = (
        role: NatureRole,
        key: string,
        target: HTMLElement,
        spot = "title",
        ambient?: Decoration["ambient"],
      ) => {
        const candidates = natureCandidates(pool, role, pathname, spot);
        let asset = candidates.find((a) => a.id === selected.get(key) && !used.includes(a.id));
        if (!asset) {
          let previous = "";
          try {
            previous = sessionStorage.getItem("praca-nature:" + pathname + ":" + key) || "";
          } catch {}
          asset = rotateNature(candidates, previous, used);
          if (asset) {
            selected.set(key, asset.id);
            try {
              sessionStorage.setItem("praca-nature:" + pathname + ":" + key, asset.id);
            } catch {}
          }
        }
        if (asset) {
          used.push(asset.id);
          next.push({ asset, target, role, key, ambient });
        }
      };
      const anchors = Array.from(main.querySelectorAll<HTMLElement>("[data-nature-spot]")).filter(
        (el) =>
          el.getClientRects().length &&
          el.dataset.natureSpot !== "map" &&
          (el.dataset.natureSpot !== "header" || pathname === "/escrever" || pathname === "/jogar"),
      );
      const scenes = anchors.filter((el) => el.dataset.natureScene);
      for (const [i, target] of scenes.entries()) {
        const scene = target.dataset.natureScene || "";
        pick(
          pathname === "/" || scene === "hero" || scene === "branch"
            ? "hero"
            : scene === "waterline"
              ? "waterline"
              : "background",
          "scene:" + scene + ":" + i,
          target,
          target.dataset.natureSpot,
        );
      }
      if (pathname !== "/") {
        if (!scenes.length) pick("background", "ambient:top", main, "margin", "top");
        // A single small visitor uses an existing ledge, never the global header.
        const target =
          anchors.find((el) => !el.dataset.natureScene && el.dataset.natureSpot === "header") ||
          anchors.find((el) => !el.dataset.natureScene);
        if (target) pick("visitor", "visitor", target, target.dataset.natureSpot);
        else pick("visitor", "visitor", main, "title", "visitor");
        if (
          !media.matches &&
          !scenes.some((el) => el.dataset.natureScene === "waterline") &&
          main.scrollHeight > 1600
        )
          pick("background", "ambient:bottom", main, "margin", "bottom");
      }
      setItems(next);
    };
    fetch("/api/common-space/assets", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!alive) return;
        pool = (data.assets || []).map((a: any) => ({
          ...a,
          placement: readPlacement(a.placement || a.placement_json, a.id),
        }));
        setGrass(pool.find((a) => a.id === "acervo-capim")?.url || null);
        setWaterPad(pool.find((a) => a.id === "acervo-vitoria-regia")?.url || null);
        choose();
        observer = new MutationObserver((records) => {
          if (
            records.some((r) =>
              Array.from(r.addedNodes).some(
                (n) =>
                  n instanceof Element &&
                  (n.matches("[data-nature-spot]") || n.querySelector("[data-nature-spot]")),
              ),
            )
          )
            choose();
        });
        observer.observe(mainElement(), { childList: true, subtree: true });
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    function mainElement() {
      return document.querySelector("main") || document.body;
    }
    media.addEventListener("change", choose);
    return () => {
      alive = false;
      observer?.disconnect();
      media.removeEventListener("change", choose);
    };
  }, [pathname]);
  useEffect(() => {
    document.body.dataset.surface =
      pathname.startsWith("/placar") || pathname === "/perfil/concluir" ? "dark" : "light";
    return () => {
      delete document.body.dataset.surface;
    };
  }, [pathname]);
  return (
    <>
      {items.map(({ asset, target, role, key, ambient }) => {
        const size = natureScale(asset.id, role),
          ground = asset.placement.support === "ground";
        return createPortal(
          <div
            className={`nature-inhabitant nature-role-${role} ${ambient ? "nature-ambient nature-ambient-" + ambient : ""} ${ground ? "nature-ground" : ""} ${ambient === "top" && items.some((i) => i.role === "visitor" && !i.ambient) ? "nature-separated-background" : ""}`}
            style={
              {
                "--inhabitant-width": size.width + "px",
                "--inhabitant-height": size.height + "px",
                "--nature-opacity": size.opacity,
                "--inhabitant-baseline": asset.placement.baseline + "%",
              } as React.CSSProperties
            }
            data-nature-asset={asset.id}
            data-nature-role={role}
            data-no-translate
            aria-hidden="true"
          >
            {waterPad && asset.id === "acervo-jacana" && (
              <img src={waterPad} alt="" draggable={false} className="nature-water-pad" />
            )}
            {grass && ground && (
              <img src={grass} alt="" draggable={false} className="nature-ground-habitat" />
            )}
            <img src={asset.url} alt="" draggable={false} className="nature-specimen" />
          </div>,
          target,
          key,
        );
      })}
    </>
  );
}
