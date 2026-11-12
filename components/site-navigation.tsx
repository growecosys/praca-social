"use client";
import Link from "next/link";
import NatureSpot from "./nature-spot";
import { usePathname } from "next/navigation";
import { Feather, LogOut } from "lucide-react";
import LanguageToggle from "./language-toggle";
import NotificationBell from "./notification-bell";
export type Section =
  "home" | "mural" | "placar" | "escrever" | "perfil" | "conexoes" | "comum" | "jogar";
export default function SiteNavigation({
  active = "home",
  dark = false,
  signedIn = false,
  complete = false,
  avatarUrl,
}: {
  active?: Section;
  dark?: boolean;
  signedIn?: boolean;
  complete?: boolean;
  avatarUrl?: string;
}) {
  const pathname = usePathname();
  const walkingHeader = pathname === "/escrever" || pathname === "/jogar";
  const link = (section: Section) =>
    `inline-flex min-h-11 items-center gap-2 px-2 text-sm font-semibold ${active === section ? "underline decoration-2 underline-offset-8" : "opacity-80 hover:opacity-100"}`;
  return (
    <header
      className={`relative z-30 border-b ${walkingHeader ? "nature-walking-header" : ""} ${dark ? "border-white/20 bg-[#14261b] text-white" : "border-[#d8d0c1] bg-[#f5f1e8] text-[#244e35]"}`}
    >
      {walkingHeader && (
        <div className="nature-writing-header mx-auto max-w-[1180px] px-4 sm:px-8">
          <NatureSpot kind="header" />
        </div>
      )}
      <div className="mx-auto max-w-[1180px] px-4 sm:px-8">
        <div className="flex min-h-16 flex-wrap items-center gap-1 py-2 sm:gap-2">
          <Link href="/" className="mr-auto flex min-h-11 items-center gap-2 font-semibold">
            <Feather size={22} />
            praça
          </Link>
          <div className="flex flex-wrap items-center justify-end gap-1">
            <a
              href="/espaco-comum"
              className={link("comum")}
              aria-current={active === "comum" ? "page" : undefined}
            >
              Espaço Comum
            </a>
            {signedIn && <NotificationBell dark={dark} />}
            <LanguageToggle dark={dark} />
            <a
              href={complete ? "/perfil" : "/entrar"}
              className={link("perfil")}
              aria-current={active === "perfil" ? "page" : undefined}
            >
              {avatarUrl && (
                <img src={avatarUrl} alt="" className="size-7 rounded-full object-cover" />
              )}
              {complete ? "Perfil" : "Entrar"}
            </a>
            {signedIn && (
              <form action="/api/auth/logout" method="post">
                <button
                  className="inline-flex min-h-11 items-center gap-2 border-l border-current/20 px-3 text-sm font-semibold"
                  type="submit"
                  title="Sair da sua conta"
                >
                  <LogOut size={16} />
                  Retirar-se
                </button>
              </form>
            )}
          </div>
        </div>
        <nav
          aria-label="Navegação principal"
          className="flex flex-wrap items-center gap-x-2 border-t border-current/15 pb-1 sm:gap-x-4"
        >
          {(
            [
              ["mural", "/mural", "Mural"],
              ["escrever", "/escrever", "Escrever"],
              ["placar", "/placar", "Placar de atividades"],
              ["conexoes", "/conexoes", "Conexões"],
              ["jogar", "/jogar", "Jogar"],
            ] as [Section, string, string][]
          ).map(([key, href, label]) => (
            <a
              key={key}
              href={href}
              className={link(key)}
              aria-current={active === key ? "page" : undefined}
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
