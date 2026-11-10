"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Eye, Heart, LoaderCircle, MessageCircle, Send, Share2, Trash2 } from "lucide-react";
import { clearAutosave, useAutosave } from "../../../lib/use-autosave";
import PostPokeButton from "../../../components/post-poke-button";

type Comment = { id: number; name: string; body: string; createdAt: string; mine: boolean; deletable: boolean; username: string | null; avatar: string | null };
type State = { likes: number; liked: boolean; comments: Comment[] };

export default function Interactions({ slug, title, signedIn, people }: { slug: string; title: string; signedIn: boolean; people: { username: string; displayName: string }[] }) {
  const [state, setState] = useState<State>({ likes: 0, liked: false, comments: [] });
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shared, setShared] = useState(false);
  const [anonymous, setAnonymous] = useState(false);
  const [views, setViews] = useState({ uniqueViews: 0, totalViews: 0 });
  const commentDraftKey = `praca_comment_draft_${slug}`;
  const restoreComment = useCallback((draft: { name: string; body: string }) => {
    if (typeof draft?.name === "string") setName(draft.name);
    if (typeof draft?.body === "string") setBody(draft.body);
  }, []);
  useAutosave(commentDraftKey, { name, body }, restoreComment);

  async function share() {
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/posts/${slug}/share`, { method: "POST" });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Não foi possível criar o link.");
      if (navigator.share) await navigator.share({ title, text: `${title} — publicado na Praça`, url: data.url });
      else await navigator.clipboard.writeText(data.url);
      setShared(true); setTimeout(() => setShared(false), 2400);
    } catch (cause) { if ((cause as Error).name !== "AbortError") setError(cause instanceof Error ? cause.message : "Não foi possível compartilhar."); }
    finally { setBusy(false); }
  }

  async function refresh() {
    const response = await fetch(`/api/posts/${slug}/interactions`, { cache: "no-store" });
    if (response.ok) setState(await response.json());
    setLoading(false);
  }

  useEffect(() => {
    setName(localStorage.getItem("praca_comment_name") || "");
    fetch(`/api/posts/${slug}/view`, { method: "POST" }).then((response) => response.json()).then((data) => setViews({ uniqueViews: data.uniqueViews || 0, totalViews: data.totalViews || 0 })).catch(() => {});
    refresh();
  }, [slug]);

  async function act(payload: object) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/posts/${slug}/interactions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível concluir.");
      setState(data);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível concluir.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function comment(event: React.FormEvent) {
    event.preventDefault();
    const posted = await act({ action: "comment", name: anonymous ? "" : name, body, anonymous });
    if (posted) {
      if (!anonymous && !signedIn) localStorage.setItem("praca_comment_name", name);
      clearAutosave(commentDraftKey);
      setBody("");
    }
  }

  async function remove(id: number) {
    setBusy(true);
    const response = await fetch(`/api/comments/${id}`, { method: "DELETE" });
    if (response.ok) await refresh();
    else setError((await response.json()).error || "Não foi possível apagar.");
    setBusy(false);
  }

  return <section className="mt-16 border-t border-[#c8c0b1] pt-8">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#667064]">a conversa continua</p><h2 className="mt-2 font-serif text-3xl">Reações da praça</h2></div>
      <a href="/placar" className="text-sm font-medium underline decoration-[#aab7aa] underline-offset-4 hover:text-[#244e35]">Ver placar</a>
    </div>

    <div className="mt-7 flex flex-wrap gap-3"><span className="inline-flex items-center gap-2 border border-[#c8c0b1] px-4 py-3 text-sm text-[#667064]" title={`${views.totalViews} visualizações totais`}><Eye size={18} /> {views.uniqueViews} visitantes</span><button type="button" onClick={() => act({ action: "toggle_like" })} disabled={busy || loading} className={`inline-flex items-center gap-2 border px-4 py-3 text-sm font-semibold transition-all ${state.liked ? "border-[#c84e43] bg-[#c84e43] text-white shadow-[4px_4px_0_#244e35]" : "border-[#c8c0b1] hover:border-[#c84e43] hover:text-[#c84e43]"}`}><Heart size={18} fill={state.liked ? "currentColor" : "none"} /> {state.liked ? "Curtido" : "Curtir"} · {state.likes}</button><button type="button" onClick={share} disabled={busy} aria-describedby="share-help" className="inline-flex items-center gap-2 border border-[#244e35] bg-[#244e35] px-4 py-3 text-sm font-semibold text-white shadow-[4px_4px_0_#f0c64b] hover:bg-[#193a27]">{shared ? <Check size={18} /> : <Share2 size={18} />}{shared ? "Link pronto" : "Compartilhar"}</button>{signedIn && <PostPokeButton slug={slug} people={people} />}</div>
    <p id="share-help" role={shared ? "status" : undefined} className="mt-3 max-w-xl text-xs leading-5 text-[#667064]">{shared ? signedIn ? "Link criado em seu nome. Visitas e entradas concluídas por ele poderão aparecer na sua circulação." : "Link criado neste navegador. Entre na Praça antes de compartilhar para vincular a circulação ao seu perfil." : signedIn ? "O link será associado ao seu perfil para registrar a circulação desta publicação." : "Você pode compartilhar sem entrar, mas a circulação não ficará associada a um perfil."}</p>

    <form onSubmit={comment} className="mt-9 border-y border-[#d8d0c1] py-7">
      <label className="text-sm font-semibold" htmlFor="comment-body">Deixe um comentário</label>
      <div className={`mt-4 grid gap-3 ${!signedIn && !anonymous ? "sm:grid-cols-[180px_1fr]" : ""}`}>{!signedIn && !anonymous && <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} placeholder="Seu nome (opcional)" aria-label="Seu nome opcional" className="border border-[#c8c0b1] bg-[#fbf8f1] px-3 py-3 text-sm outline-none focus:border-[#244e35]" />}<textarea id="comment-body" value={body} onChange={(event) => setBody(event.target.value)} maxLength={800} rows={3} placeholder="O que este texto provocou em você?" className="resize-y border border-[#c8c0b1] bg-[#fbf8f1] px-3 py-3 text-sm leading-6 outline-none focus:border-[#244e35]" /></div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4"><label className="flex cursor-pointer items-center gap-2 text-xs text-[#667064]"><input type="checkbox" checked={anonymous} onChange={(event) => setAnonymous(event.target.checked)} className="size-4 accent-[#244e35]" /> Publicar anonimamente</label><button disabled={busy || body.trim().length < 2} className="flex items-center gap-2 bg-[#244e35] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-45">{busy ? <LoaderCircle size={15} className="animate-spin" /> : <Send size={15} />} Comentar</button></div>
      {error && <p role="alert" className="mt-3 text-sm text-[#9b3a2f]">{error}</p>}
    </form>

    <div className="mt-7 space-y-5">{loading ? <LoaderCircle className="animate-spin text-[#667064]" size={20} /> : state.comments.length ? state.comments.map((comment) => <article key={comment.id} className="group border-l-2 border-[#c8c0b1] pl-4"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2">{comment.avatar && <a href={`/u/${comment.username}`}><img src={comment.avatar} alt="" className="size-8 rounded-full border object-cover" /></a>}{comment.username ? <a href={`/u/${comment.username}`} className="text-sm font-semibold hover:underline">{comment.name}</a> : <p className="text-sm font-semibold">{comment.name}</p>}</div>{comment.deletable && <button type="button" onClick={() => remove(comment.id)} aria-label={comment.mine ? "Apagar seu comentário" : "Moderar comentário"} className="p-1 text-[#8a8d86] hover:text-[#9b3a2f]"><Trash2 size={14} /></button>}</div><p className="mt-2 whitespace-pre-wrap text-base leading-7">{comment.body}</p><p className="mt-2 text-xs text-[#8a8d86]">{formatDate(comment.createdAt)}</p></article>) : <p className="flex items-center gap-2 text-sm text-[#667064]"><MessageCircle size={16} /> Ainda não há comentários. Abra a roda.</p>}</div>
  </section>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(`${value.replace(" ", "T")}Z`));
}
