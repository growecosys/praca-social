"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
export default function SkipLink() {
  const pathname = usePathname();
  useEffect(() => {
    const main = document.querySelector("main");
    const target =
      document.getElementById("conteudo-principal") ||
      main?.querySelector<HTMLElement>("article,section") ||
      main;
    if (!target) return;
    const originalId = target.id,
      tab = target.getAttribute("tabindex");
    if (!originalId) target.id = "conteudo-principal";
    target.tabIndex = -1;
    return () => {
      if (!originalId) target.removeAttribute("id");
      if (tab === null) target.removeAttribute("tabindex");
      else target.setAttribute("tabindex", tab);
    };
  }, [pathname]);
  return (
    <a
      href="#conteudo-principal"
      className="skip-link"
      onClick={(e) => {
        const main = document.querySelector("main"),
          target =
            document.getElementById("conteudo-principal") ||
            main?.querySelector<HTMLElement>("article,section") ||
            main;
        if (target) {
          e.preventDefault();
          target.tabIndex = -1;
          target.focus();
          target.scrollIntoView({ block: "start" });
        }
      }}
    >
      Pular para o conteúdo
    </a>
  );
}
