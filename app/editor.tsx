"use client";

import {useEditorHistory} from "../lib/use-editor-history";
import BlockList from "../components/block-list";
import InlineEditor from "../components/inline-editor";
import { useCallback, useRef, useState } from "react";
import { Bot, Feather, Hand, Heading2, ImagePlus, Link2, LoaderCircle, Plus, Quote, RotateCcw, RotateCw, Send, Sparkles, Type, WandSparkles, X } from "lucide-react";
import type { ContentBlock } from "../lib/content";
import { MediaEmbed } from "../lib/content";
import PostImageGenerator from "../components/post-image-generator";
import { prepareImage, readImageResponse } from "../lib/image-upload";
import SiteNavigation from "../components/site-navigation";
import { clearAutosave, useAutosave } from "../lib/use-autosave";
import NotificationBell from "../components/notification-bell";

type Action = "link_to_draft" | "improve" | "summarize" | "expand" | "chat";
type ContextScope = "none" | "selected" | "all";
type AiResult = { title: string; message: string; blocks: ContentBlock[] };

const makeBlock = (type: ContentBlock["type"], extras: Partial<ContentBlock> = {}): ContentBlock => ({ id: crypto.randomUUID(), type, ...extras });

export default function Editor({ author, signOutPath, avatarUrl, initialTitle = "", initialBlocks, editSlug }: { author: string; signOutPath: string; avatarUrl: string; initialTitle?: string; initialBlocks?: ContentBlock[]; editSlug?: string }) {
  const history=useEditorHistory({title:initialTitle,blocks:initialBlocks?.length?initialBlocks:[makeBlock("paragraph",{text:""})]});
  const {title,blocks}=history.history.present;
  const {setTitle,setBlocks}=history;
  const undoStack=history.history.past,redoStack=history.history.future;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [action, setAction] = useState<Action>("link_to_draft");
  const [contextScope, setContextScope] = useState<ContextScope>("all");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [instruction, setInstruction] = useState("");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const draftKey = `praca_editor_draft_${editSlug || "new"}`;
  const restoreDraft = useCallback((draft: { title: string; blocks: ContentBlock[]; sourceUrl: string; instruction: string; undoStack?: Array<{ title: string; blocks: ContentBlock[] }>;redoStack?:Array<{title:string;blocks:ContentBlock[]}> }) => {
    if(typeof draft?.title==='string'&&Array.isArray(draft.blocks)&&draft.blocks.length)history.restore({title:draft.title,blocks:draft.blocks},Array.isArray(draft.undoStack)?draft.undoStack:[],Array.isArray(draft.redoStack)?draft.redoStack:[]);
    if(typeof draft?.sourceUrl==='string')setSourceUrl(draft.sourceUrl);
    if(typeof draft?.instruction==='string')setInstruction(draft.instruction);
  }, []);
  const markSaved = useCallback((date: Date) => setDraftSavedAt(date), []);
  useAutosave(draftKey, { title, blocks, sourceUrl, instruction, undoStack,redoStack }, restoreDraft, 600, markSaved);

  function updateBlock(id: string, patch: Partial<ContentBlock>,checkpoint=false) {
    history.commit(d=>({...d,blocks:d.blocks.map(block=>block.id===id?{...block,...patch}:block)}),checkpoint?"":"typing:"+id);
  }

  function addBlock(type: ContentBlock["type"]) {
    setBlocks((current) => [...current, makeBlock(type, type === "embed" ? { url: "", caption: "" } : { text: "" })]);
  }

  async function uploadPhoto(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", await prepareImage(file));
      const response = await fetch("/api/media", { method: "POST", body: form });
      const data = await readImageResponse(response) as { url?: string; mediaType?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Não foi possível enviar a foto.");
      setBlocks((current) => [...current, makeBlock("image", { url: data.url, mediaType: data.mediaType, caption: "" })]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível enviar a foto.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function publish() {
    const usefulBlocks = blocks.filter((block) => (block.text || block.url)?.trim());
    if (!title.trim() || !usefulBlocks.length) return setError("Adicione um título e algum conteúdo.");
    setSaving(true);
    setError("");
    try {
      const response = await fetch(editSlug ? `/api/posts/${editSlug}` : "/api/posts", { method: editSlug ? "PUT" : "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ title, blocks: usefulBlocks }) });
      const data = await response.json() as { slug?: string; error?: string };
      if (!response.ok || !data.slug) throw new Error(data.error || "Não foi possível publicar.");
      clearAutosave(draftKey);
      window.location.href = `/p/${data.slug}`;
    } catch (cause) {
      setSaving(false);
      setError(cause instanceof Error ? cause.message : "Não foi possível publicar.");
    }
  }

  async function askAssistant(nextAction = action, scope = contextScope, directInstruction?: string) {
    setAssistantOpen(true);
    setAssistantBusy(true);
    setAiResult(null);
    setError("");
    try {
      const selected = blocks.find((block) => block.id === selectedBlockId);
      const contextBlocks = scope === "all" ? blocks : scope === "selected" && selected ? [selected] : [];
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ language: localStorage.getItem("praca_language") === "en" ? "en" : "pt", action: nextAction, instruction: directInstruction || instruction, sourceUrl, context: { title: scope === "none" ? "" : title, blocks: contextBlocks, selectedBlockId: scope === "selected" ? selectedBlockId : null } }),
      });
      const data = await response.json() as AiResult & { error?: string };
      if (!response.ok) throw new Error(data.error || "O assistente não conseguiu responder.");
      setAction(nextAction);
      setContextScope(scope);
      setAiResult(data);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "O assistente não conseguiu responder.");
    } finally {
      setAssistantBusy(false);
    }
  }

  function applyResult() {
    if (!aiResult) return;
    let next=blocks;
    if(aiResult.blocks.length){if(contextScope==='selected'&&selectedBlockId)next=blocks.flatMap(b=>b.id===selectedBlockId?aiResult.blocks:[b]);else if(action!=='chat'&&(contextScope==='all'||action==='link_to_draft'))next=aiResult.blocks;else next=[...blocks,...aiResult.blocks];}
    history.commit({title:aiResult.title.trim()?aiResult.title:title,blocks:next});
    setAiResult(null);
  }

  const undoChange=history.undo,redoChange=history.redo;

  return <main className="min-h-screen bg-[#f5f1e8] text-[#1f241d]">
    <SiteNavigation active="escrever" signedIn complete avatarUrl={avatarUrl}/>
    <div className="border-b border-[#d8d0c1] bg-[#f5f1e8]"><div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3 px-5 py-3"><a href={editSlug ? `/p/${editSlug}` : "/mural"} onClick={() => {try {localStorage.setItem(draftKey,JSON.stringify({value:{title,blocks,sourceUrl,instruction,undoStack,redoStack},savedAt:new Date().toISOString()}));}catch{}}} className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">← {editSlug ? "Cancelar edição" : "Voltar ao Mural"}</a><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setAssistantOpen(value=>!value)} aria-expanded={assistantOpen} className="min-h-11 border border-[#b7ae9f] px-4 text-sm font-semibold">Assistente</button><button type="button" onClick={publish} disabled={saving||uploading} className="min-h-11 bg-[#244e35] px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Salvando…" : editSlug ? "Salvar nova versão" : "Publicar"}</button></div></div></div>

    <div className={`transition-[padding] duration-200 ${assistantOpen ? "xl:pr-[390px]" : ""}`}><article id="conteudo-principal" tabIndex={-1} onKeyDownCapture={e=>{if(!(e.ctrlKey||e.metaKey)||e.altKey||(e.target as HTMLElement).closest('form'))return;const key=e.key.toLowerCase();if(key==='z'||key==='y'){e.preventDefault();e.stopPropagation();if(key==='y'||e.shiftKey)redoChange();else undoChange();}}} className="mx-auto max-w-[780px] px-5 pb-36 pt-8 sm:px-10 md:pt-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#667064]"><p>{editSlug ? "nova versão" : "nova publicação"}</p><p className="normal-case tracking-normal">{draftSavedAt ? `Rascunho salvo às ${draftSavedAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "Salvamento automático ativo"}</p></div>
      <textarea value={title} onChange={(event) => setTitle(event.target.value)} rows={2} placeholder="Título" aria-label="Título" className="block w-full resize-none bg-transparent font-serif text-[clamp(2.8rem,7vw,5.6rem)] font-medium leading-[0.98] tracking-[-0.045em] outline-none placeholder:text-[#99978f]" />
      <p className="mt-7 border-b border-[#d8d0c1] pb-5 text-sm text-[#667064]">por <span className="text-[#1f241d]">{author}</span></p>
      <div className="mt-5 flex flex-wrap items-center justify-end gap-2"><button type="button" disabled={!undoStack.length} onClick={undoChange} className="inline-flex min-h-11 items-center gap-2 border border-[#c8c0b1] px-3 text-sm disabled:opacity-35"><RotateCcw size={16}/>Desfazer</button><button type="button" disabled={!redoStack.length} onClick={redoChange} title="Ctrl+Y ou Ctrl+Shift+Z" className="inline-flex min-h-11 items-center gap-2 border border-[#c8c0b1] px-3 text-sm disabled:opacity-35"><RotateCw size={16}/>Refazer</button></div>
      <BlockList blocks={blocks} onReorder={(next)=>{setBlocks(next);}} onRemove={(id)=>{const next=blocks.filter(b=>b.id!==id);setBlocks(next.length?next:[makeBlock("paragraph",{text:""})]);if(selectedBlockId===id)setSelectedBlockId(null);}} renderBlock={(block,index)=><BlockEditor block={block} index={index} selected={selectedBlockId === block.id} select={() => setSelectedBlockId(block.id)} update={updateBlock} runAi={(nextAction) => askAssistant(nextAction, "selected")} />}/>

      <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-[#d8d0c1] pt-5" aria-label="Adicionar conteúdo"><span className="mr-2 flex items-center gap-1 text-sm text-[#667064]"><Plus size={16} /> adicionar</span><ToolButton onClick={() => addBlock("paragraph")} icon={<Type size={16} />} label="Texto" /><ToolButton onClick={() => addBlock("heading")} icon={<Heading2 size={16} />} label="Título" /><ToolButton onClick={() => addBlock("quote")} icon={<Quote size={16} />} label="Citação" /><ToolButton onClick={() => addBlock("embed")} icon={<Link2 size={16} />} label="Link ou mídia" /><ToolButton onClick={() => fileInput.current?.click()} icon={uploading ? <LoaderCircle size={16} className="animate-spin" /> : <ImagePlus size={16} />} label="Foto" disabled={uploading} /><PostImageGenerator content={[title,...blocks.map(block=>block.text||"")].join("\n\n")} onInsert={(url)=>setBlocks(current=>[...current,makeBlock("image",{url,mediaType:"image/webp",caption:""})])}/><input ref={fileInput} type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif" onChange={(event) => uploadPhoto(event.target.files?.[0])} className="hidden" /></div>
      <p className="mt-3 text-sm text-[#7c8179]">Cole uma URL comum, de imagem, vídeo, YouTube, Vimeo ou uma mensagem pública do Telegram.</p>{error && <p role="alert" className="mt-6 border-l-2 border-[#9b3a2f] pl-3 text-sm text-[#8a3329]">{error}</p>}
    </article></div>
    {assistantOpen && <AssistantPanel action={action} setAction={setAction} contextScope={contextScope} setContextScope={setContextScope} selectedBlockId={selectedBlockId} sourceUrl={sourceUrl} setSourceUrl={setSourceUrl} instruction={instruction} setInstruction={setInstruction} busy={assistantBusy} result={aiResult} canUndo={undoStack.length > 0} run={() => askAssistant()} apply={applyResult} undo={undoChange} close={() => setAssistantOpen(false)} />}
  </main>;
}

function AssistantPanel({ action, setAction, contextScope, setContextScope, selectedBlockId, sourceUrl, setSourceUrl, instruction, setInstruction, busy, result, canUndo, run, apply, undo, close }: { action: Action; setAction: (value: Action) => void; contextScope: ContextScope; setContextScope: (value: ContextScope) => void; selectedBlockId: string | null; sourceUrl: string; setSourceUrl: (value: string) => void; instruction: string; setInstruction: (value: string) => void; busy: boolean; result: AiResult | null; canUndo: boolean; run: () => void; apply: () => void; undo: () => void; close: () => void }) {
  return <aside onKeyDown={event=>{if(event.key==="Escape")close();}} aria-label="Copiloto da Praça" className="fixed inset-x-0 bottom-0 z-40 max-h-[82vh] overflow-y-auto border-t border-[#b7ae9f] bg-[#eee8dc] shadow-[0_-16px_50px_rgba(31,36,29,.16)] xl:inset-y-16 xl:left-auto xl:right-0 xl:w-[390px] xl:max-h-none xl:border-l xl:border-t-0 xl:shadow-[-16px_0_50px_rgba(31,36,29,.12)]"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#cfc6b7] bg-[#eee8dc]/95 px-5 py-4 backdrop-blur"><div className="flex items-center gap-2 font-semibold"><Bot size={18} /> Copiloto da Praça</div><button onClick={close} aria-label="Fechar assistente" className="p-2 hover:bg-[#ddd4c5]"><X size={18} /></button></div><div className="space-y-5 p-5">
    <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#667064]">Ação</label><select value={action} onChange={(event) => setAction(event.target.value as Action)} className="w-full border border-[#b7ae9f] bg-[#f8f5ee] px-3 py-3 text-sm outline-none focus:border-[#244e35]"><option value="link_to_draft">Link → rascunho</option><option value="improve">Melhorar texto</option><option value="summarize">Resumir</option><option value="expand">Expandir</option><option value="chat">Conversar</option></select></div>
    {action === "link_to_draft" && <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#667064]">URL da fonte</label><input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" className="w-full border border-[#b7ae9f] bg-[#f8f5ee] px-3 py-3 text-sm outline-none focus:border-[#244e35]" /></div>}
    <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#667064]">Contexto desta ação</label><div className="grid grid-cols-3 border border-[#b7ae9f] bg-[#f8f5ee] p-1">{([['none','Nenhum'],['selected','Bloco'],['all','Artigo']] as const).map(([value, label]) => <button key={value} type="button" disabled={value === "selected" && !selectedBlockId} onClick={() => setContextScope(value)} className={`px-2 py-2 text-xs font-medium ${contextScope === value ? "bg-[#244e35] text-white" : "hover:bg-[#e7e0d4] disabled:opacity-35"}`}>{label}</button>)}</div></div>
    <div><label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-[#667064]">Pedido opcional</label><textarea value={instruction} onChange={(event) => setInstruction(event.target.value)} rows={4} placeholder="Tom, foco, extensão, idioma…" className="w-full resize-y border border-[#b7ae9f] bg-[#f8f5ee] px-3 py-3 text-sm leading-relaxed outline-none focus:border-[#244e35]" /></div>
    <button type="button" disabled={busy || (action === "link_to_draft" && !sourceUrl.trim())} onClick={run} className="flex w-full items-center justify-center gap-2 bg-[#244e35] px-4 py-3 text-sm font-semibold text-white hover:bg-[#193a27] disabled:opacity-50">{busy ? <LoaderCircle size={17} className="animate-spin" /> : <WandSparkles size={17} />}{busy ? "Pensando…" : "Gerar sugestão"}</button>
    {result && <div className="border-t border-[#cfc6b7] pt-5"><p className="text-sm leading-relaxed">{result.message}</p>{result.title && <p className="mt-4 font-serif text-xl font-medium">{result.title}</p>}<p className="mt-3 text-xs uppercase tracking-[0.12em] text-[#667064]">{result.blocks.length} bloco(s) prontos</p><button type="button" onClick={apply} className="mt-4 flex w-full items-center justify-center gap-2 border border-[#244e35] px-4 py-3 text-sm font-semibold text-[#244e35] hover:bg-[#244e35] hover:text-white"><Sparkles size={16} /> Aplicar ao rascunho</button></div>}{canUndo && <button type="button" onClick={undo} className="flex w-full items-center justify-center gap-2 border border-[#b7ae9f] px-4 py-3 text-sm font-semibold hover:border-[#244e35] hover:text-[#244e35]"><RotateCcw size={16} /> Desfazer última alteração</button>}<p className="text-xs leading-relaxed text-[#747970]">A sugestão só altera o rascunho quando você escolher aplicar. Você pode desfazer as últimas aplicações.</p>
  </div></aside>;
}

function ToolButton({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) { return <button type="button" onClick={onClick} disabled={disabled} className="flex items-center gap-2 border border-[#c8c0b1] px-3 py-2 text-sm hover:border-[#244e35] hover:text-[#244e35] disabled:opacity-50">{icon}{label}</button>; }

function BlockEditor({ block, index, selected, select, update, runAi }: { block: ContentBlock; index: number; selected: boolean; select: () => void; update: (id: string, patch: Partial<ContentBlock>,checkpoint?:boolean) => void; runAi: (action: Action) => void }) {
  const labels = { paragraph: "Parágrafo", heading: "Intertítulo", quote: "Citação", embed: "Link ou mídia", image: "Foto" };
  return <section onFocus={select} onClick={select} className={`group relative border-l-2 pl-4 ${selected ? "border-[#244e35]" : "border-transparent focus-within:border-[#244e35]"}`}><div className="mb-1 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.14em] text-[#8a8d86]"><span>{index + 1}. {labels[block.type]}</span><details className="relative normal-case tracking-normal"><summary className="min-h-11 cursor-pointer py-3">Opções do bloco</summary><div className="flex flex-wrap items-center gap-1"><button type="button" onClick={() => runAi("improve")} className="px-2 py-1 normal-case tracking-normal hover:bg-[#e6dfd2] hover:text-[#244e35]">Melhorar</button><button type="button" onClick={() => runAi("summarize")} className="px-2 py-1 normal-case tracking-normal hover:bg-[#e6dfd2] hover:text-[#244e35]">Resumir</button><button type="button" onClick={() => runAi("expand")} className="px-2 py-1 normal-case tracking-normal hover:bg-[#e6dfd2] hover:text-[#244e35]">Expandir</button></div></details></div>{block.type === "embed" ? <><input value={block.url || ""} onChange={(event) => update(block.id, { url: event.target.value })} placeholder="https://…" aria-label="URL da mídia" className="w-full border-b border-[#d8d0c1] bg-transparent py-3 font-sans text-base outline-none focus:border-[#244e35]" /><input value={block.caption || ""} onChange={(event) => update(block.id, { caption: event.target.value })} placeholder="Legenda opcional" aria-label="Legenda" className="mt-2 w-full bg-transparent py-2 text-sm outline-none" />{block.url && <MediaEmbed url={block.url} caption={block.caption} />}</> : block.type === "image" ? <><img src={block.url} alt={block.caption || "Foto enviada"} className="mt-3 max-h-[70vh] w-auto max-w-full" /><input value={block.caption || ""} onChange={(event) => update(block.id, { caption: event.target.value })} placeholder="Legenda opcional" aria-label="Legenda da foto" className="mt-2 w-full bg-transparent py-2 text-sm outline-none" /></> : <InlineEditor value={block.text || ""} onChange={(text,checkpoint) => update(block.id, { text, inlineFormat: "markdown" },checkpoint)} label={`Texto do bloco ${index+1}`} rows={block.type === "paragraph" ? 5 : 2} placeholder={block.type === "heading" ? "Intertítulo" : block.type === "quote" ? "Citação" : "Escreva…"} className={`w-full resize-y bg-transparent outline-none placeholder:text-[#99978f] ${block.type === "heading" ? "font-serif text-3xl leading-tight" : block.type === "quote" ? "font-serif text-2xl italic leading-relaxed" : "font-serif text-xl leading-[1.8]"}`} />}</section>;
}
