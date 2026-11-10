"use client";

import PageBack from "../../components/page-back";
import { useEffect, useState } from "react";
import { Clock3, Crown, Eye, Heart, LoaderCircle, MessageCircle, Share2, Sparkles, Trophy, Users } from "lucide-react";

type Row = { id: number; slug: string; title: string; author: string; authorUsername: string | null; authorAvatar: string | null; createdAt: string; image: string | null; likes: number; comments: number; shares: number; shareClicks: number; shareVisitors: number; uniqueViews: number; score: number };
type PersonRow = { id: string; username: string; displayName: string; avatar: string; posts: number; likes: number; comments: number; links: number; uniqueViews: number; linkVisitors: number; peopleAttracted: number; score: number };
const primaryFilters = [["all","Desde o começo"],["7d","Semana"],["24h","Hoje"]] as const;
const extraFilters = [["3d","3 dias"],["4h","4 horas"],["1h","1 hora"],["30m","30 minutos"]] as const;
const medals = ["#f0c64b", "#bfc9c2", "#cb8b55"];

export default function Leaderboard() {
  const [windowKey, setWindowKey] = useState("7d");
  const [rows, setRows] = useState<Row[]>([]);
  const [people, setPeople] = useState<PersonRow[]>([]);
  const [mode, setMode] = useState<"posts" | "people">("posts");
  const [loading, setLoading] = useState(true);
  const [formula, setFormula] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    fetch(`/api/leaderboard?window=${windowKey}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("O placar não respondeu.");
        return response.json();
      })
      .then((data) => { setRows(data.ranking || []); setPeople(data.people || []); setFormula(data.formula || ""); })
      .catch(() => { setRows([]); setPeople([]); setError("O placar está se reorganizando. Tente novamente em instantes."); })
      .finally(() => setLoading(false));
  }, [windowKey]);

  const top = rows.slice(0, 3);
  return <section id="conteudo-principal" tabIndex={-1} className="relative mx-auto max-w-[1180px] px-5 pb-28 pt-14 sm:px-8 md:pt-20">
    <div className="relative"><PageBack/>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#f0c64b]"><Sparkles size={14} /> energia circulando</p>
      <div className="mt-4 flex flex-col justify-between gap-8 border-b border-white/15 pb-10 lg:flex-row lg:items-end">
        <div><h1 className="font-serif text-[clamp(4rem,11vw,9rem)] font-medium leading-[0.78] tracking-[-0.07em]">Placar<br /><span className="text-[#f0c64b]">da Praça</span></h1></div>
        <div className="max-w-sm"><p className="text-lg leading-8 text-white/70">Um termômetro vivo das publicações que estão abrindo conversa.</p><details className="mt-3 text-xs text-white/55"><summary className="cursor-pointer font-semibold uppercase tracking-[0.14em] text-white/70">Como funciona a pontuação</summary><p className="mt-3 leading-5">{formula}. Visualizações repetidas não pontuam. A primeira pessoa da semana encerrada renova os créditos de papel.</p></details></div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2" aria-label="Período do placar">{primaryFilters.map(([value,label]) => <button key={value} onClick={() => setWindowKey(value)} className={`border px-3 py-2 text-sm transition-all ${windowKey === value ? "border-[#f0c64b] bg-[#f0c64b] text-[#14261b] shadow-[4px_4px_0_#df5c45]" : "border-white/20 text-white/70 hover:border-white/60 hover:text-white"}`}><Clock3 className="mr-1.5 inline" size={13} />{label}</button>)}<label className="sr-only" htmlFor="extra-period">Mais períodos</label><select id="extra-period" value={extraFilters.some(([value]) => value === windowKey) ? windowKey : ""} onChange={(event) => event.target.value && setWindowKey(event.target.value)} className="border border-white/20 bg-[#14261b] px-3 py-2 text-sm text-white/70"><option value="">Mais períodos</option>{extraFilters.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="mt-5 flex gap-2"><button onClick={() => setMode("posts")} className={`border px-4 py-2 text-sm ${mode === "posts" ? "border-white bg-white text-[#14261b]" : "border-white/20 text-white/70"}`}>Publicações</button><button onClick={() => setMode("people")} className={`border px-4 py-2 text-sm ${mode === "people" ? "border-white bg-white text-[#14261b]" : "border-white/20 text-white/70"}`}><Users className="mr-2 inline" size={14} />Pessoas · prêmio semanal</button></div>

      {loading ? <div className="grid min-h-96 place-items-center"><LoaderCircle className="animate-spin text-[#f0c64b]" size={30} /></div> : error ? <div role="status" className="mt-10 border border-white/20 p-6 text-white/70">{error}</div> : mode === "people" ? <PeopleRanking rows={people} /> : <>
        <div className="mt-12 grid items-end gap-4 md:grid-cols-3">
          {top.map((row, index) => <a key={row.id} href={`/p/${row.slug}`} className={`group relative overflow-hidden border border-white/15 bg-white/[.055] p-5 transition-transform hover:-translate-y-2 ${index === 0 ? "md:min-h-[390px] md:order-2" : index === 1 ? "md:min-h-[330px] md:order-1" : "md:min-h-[300px] md:order-3"}`}>
            {row.image && <img src={row.image} alt="" className="absolute inset-0 size-full object-cover opacity-15 grayscale transition group-hover:scale-105 group-hover:opacity-25" />}
            <div className="relative flex h-full min-h-64 flex-col justify-between">
              <div className="flex items-center justify-between"><span className="grid size-12 place-items-center rounded-full text-xl font-black text-[#14261b]" style={{ background: medals[index] }}>{index + 1}</span>{index === 0 ? <Crown className="text-[#f0c64b]" size={30} /> : <Trophy className="text-white/40" size={24} />}</div>
              <div><Author row={row} /><h2 className="mt-3 font-serif text-3xl leading-[1.02] tracking-[-0.035em] group-hover:text-[#f0c64b]">{row.title}</h2><Stats row={row} /></div>
            </div>
          </a>)}
        </div>

        <div className="mt-14 border-t border-white/15">
          {rows.slice(3).map((row, index) => <a key={row.id} href={`/p/${row.slug}`} className="group grid gap-4 border-b border-white/15 py-6 sm:grid-cols-[72px_1fr_auto] sm:items-center"><span className="font-mono text-3xl text-white/30">{String(index + 4).padStart(2, "0")}</span><div><h3 className="font-serif text-2xl leading-tight group-hover:text-[#f0c64b]">{row.title}</h3><Author row={row} compact /></div><Stats row={row} compact /></a>)}
        </div>
      </>}
    </div>
  </section>;
}

function Author({ row, compact = false }: { row: Row; compact?: boolean }) {
  return <div className={`flex items-center gap-2 text-sm text-white/55 ${compact ? "mt-2" : ""}`}>{row.authorAvatar && <img src={row.authorAvatar} alt="" className="size-8 rounded-full border border-white/25 object-cover" />}<span>por <span className="text-white">{row.author}</span></span></div>;
}

function Stats({ row, compact = false }: { row: Row; compact?: boolean }) {
  return <div className={`flex flex-wrap items-center gap-4 text-sm ${compact ? "mt-2 sm:mt-0" : "mt-5"}`}><span className="font-bold text-[#f0c64b]">{row.score} pts</span><span className="flex items-center gap-1 text-white/55"><Eye size={14} /> {row.uniqueViews}</span><span className="flex items-center gap-1 text-white/55"><Heart size={14} /> {row.likes}</span><span className="flex items-center gap-1 text-white/55"><MessageCircle size={14} /> {row.comments}</span><span className="flex items-center gap-1 text-white/55" title={`${row.shareVisitors} visitantes únicos · ${row.shareClicks} acessos totais`}><Share2 size={14} /> {row.shares}</span></div>;
}

function PeopleRanking({ rows }: { rows: PersonRow[] }) {
  return <div className="mt-10"><p className="mb-6 max-w-2xl text-sm leading-6 text-white/55">A primeira posição da semana encerrada renova apenas os créditos de geração de papel. Visualizações repetidas não pontuam.</p><div className="border-t border-white/15">{rows.map((row, index) => <a key={row.id} href={`/u/${row.username}`} className="grid gap-4 border-b border-white/15 py-6 sm:grid-cols-[64px_1fr_auto] sm:items-center"><span className="font-mono text-3xl text-white/30">{String(index + 1).padStart(2, "0")}</span><div className="flex items-center gap-3"><img src={row.avatar} alt="" className="size-11 rounded-full border border-white/25 object-cover" /><div><h2 className="font-serif text-2xl">{row.displayName}</h2><p className="text-xs text-white/45">@{row.username}</p></div></div><div className="flex flex-wrap items-center gap-3 text-xs text-white/55"><strong className="text-base text-[#f0c64b]">{row.score} pts</strong><span>{row.posts} textos</span><span>{row.comments} comentários</span><span>{row.uniqueViews} visitantes</span><span>{row.peopleAttracted} pessoas atraídas</span></div></a>)}</div></div>;
}
