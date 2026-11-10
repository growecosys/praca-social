import InlineText from "../components/inline-text";
import type { ReactNode } from "react";

export type ContentBlock = {
  id: string;
  type: "paragraph" | "heading" | "quote" | "embed" | "image";
  text?: string;
  url?: string;
  caption?: string;
  mediaType?: string;
  inlineFormat?: "markdown";
};

export function parseBlocks(value: string | null | undefined, legacy = ""): ContentBlock[] {
  try {
    const parsed = JSON.parse(value || "[]");
    if (Array.isArray(parsed) && parsed.length) return parsed as ContentBlock[];
  } catch {}
  return legacy ? [{ id: "legacy", type: "paragraph", text: legacy }] : [];
}

function safeUrl(value = "") {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url : null;
  } catch {
    return null;
  }
}

export function LinkifiedText({ text = "" }: { text?: string }) {
  const pieces = text.split(/(https?:\/\/[^\s]+)/g);
  return <>{pieces.map((piece, index) => {
    const url = safeUrl(piece.replace(/[),.;!?]+$/, ""));
    return url ? <a key={index} href={url.href} target="_blank" rel="noopener noreferrer" className="underline decoration-[#7a8f7d] underline-offset-4 hover:text-[#244e35]">{piece}</a> : <span key={index}>{piece}</span>;
  })}</>;
}

export function MediaEmbed({ url: rawUrl, caption }: { url?: string; caption?: string }) {
  const url = safeUrl(rawUrl);
  if (!url) return null;
  const telegram = url.pathname.match(/^\/(?:s\/)?([^/]+)\/(\d+)/);
  if (url.hostname === "t.me" && telegram) {
    const src = `https://t.me/${telegram[1]}/${telegram[2]}?embed=1&mode=tme`;
    return <figure className="my-10"><iframe src={src} title={caption || "Publicação do Telegram"} loading="lazy" className="mx-auto min-h-[420px] w-full max-w-[560px] border-0" /><Caption>{caption}</Caption></figure>;
  }
  const youtubeId = url.hostname.includes("youtu.be") ? url.pathname.slice(1) : url.searchParams.get("v");
  if ((url.hostname.includes("youtube.com") || url.hostname.includes("youtu.be")) && youtubeId) {
    return <figure className="my-10"><div className="aspect-video overflow-hidden bg-black"><iframe src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youtubeId)}`} title={caption || "Vídeo do YouTube"} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="size-full border-0" /></div><Caption>{caption}</Caption></figure>;
  }
  const vimeo = url.hostname.includes("vimeo.com") && url.pathname.match(/\/(\d+)/)?.[1];
  if (vimeo) return <figure className="my-10"><div className="aspect-video overflow-hidden bg-black"><iframe src={`https://player.vimeo.com/video/${vimeo}`} title={caption || "Vídeo do Vimeo"} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen className="size-full border-0" /></div><Caption>{caption}</Caption></figure>;
  if (/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(url.href)) return <figure className="my-10"><img src={url.href} alt={caption || "Imagem incorporada"} loading="lazy" className="mx-auto max-h-[80vh] w-auto max-w-full" /><Caption>{caption}</Caption></figure>;
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url.href)) return <figure className="my-10"><video src={url.href} controls preload="metadata" className="w-full bg-black" /><Caption>{caption}</Caption></figure>;
  return <a href={url.href} target="_blank" rel="noopener noreferrer" className="my-8 block border-y border-[#d8d0c1] py-5 hover:border-[#244e35]"><span className="block text-xs uppercase tracking-[0.16em] text-[#667064]">{url.hostname}</span><span className="mt-2 block break-all font-sans text-base underline underline-offset-4">{url.href}</span></a>;
}

function Caption({ children }: { children?: ReactNode }) {
  return children ? <figcaption className="mt-3 text-center font-sans text-sm text-[#667064]">{children}</figcaption> : null;
}

export function ArticleBlocks({ blocks }: { blocks: ContentBlock[] }) {
  const mediaUrls = new Set(blocks.filter((block) => block.type === "image" || block.type === "embed").map((block) => block.url?.trim()).filter(Boolean));
  const visibleBlocks = blocks.filter((block) => {
    if (block.type !== "paragraph") return true;
    const text = block.text?.trim() || "";
    if (!/^https?:\/\/\S+$/.test(text)) return true;
    return !mediaUrls.has(text) && !/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i.test(text) && !/\/media\//.test(text);
  });
  return <div className="article-blocks mt-12">{visibleBlocks.map((block) => {
    if (block.type === "heading") return <h2 key={block.id} id={`bloco-${block.id}`} className="mb-5 mt-12 font-serif text-3xl font-medium leading-tight">{block.inlineFormat === "markdown" ? <InlineText text={block.text}/> : <LinkifiedText text={block.text}/>}</h2>;
    if (block.type === "quote") return <blockquote key={block.id} id={`bloco-${block.id}`} className="my-10 border-l-2 border-[#244e35] pl-6 font-serif text-2xl italic leading-relaxed">{block.inlineFormat === "markdown" ? <InlineText text={block.text}/> : <LinkifiedText text={block.text}/>}</blockquote>;
    if (block.type === "embed") return <MediaEmbed key={block.id} url={block.url} caption={block.caption} />;
    if (block.type === "image") return <figure key={block.id} id={`bloco-${block.id}`} className="my-10"><img src={block.url} alt={block.caption || "Foto do artigo"} loading="lazy" className="mx-auto max-h-[85vh] w-auto max-w-full" /><Caption>{block.caption}</Caption></figure>;
    return <p key={block.id} id={`bloco-${block.id}`} className="mb-7 whitespace-pre-wrap font-serif text-xl leading-[1.8]">{block.inlineFormat === "markdown" ? <InlineText text={block.text}/> : <LinkifiedText text={block.text}/>}</p>;
  })}</div>;
}
