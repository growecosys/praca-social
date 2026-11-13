"use client";

import { useEffect } from "react";

type Language = "pt" | "en";
const originals = new WeakMap<Text, string>();
const translated = new WeakMap<Text, string>();
const attributeOriginals = new WeakMap<Element, Record<string, string>>();
let cache: Record<string, string> = {};
const UI_EN: Record<string, string> = {
  "Placar de atividades": "Activity leaderboard",
  "Crie sua identidade": "Create your identity",
  "Responda 5 perguntas": "Answer 5 questions",
  "Publique e ajude a cuidar do espaço comum": "Publish and help care for the common space",
  "Visão geral": "Overview",
  "Seus contatos": "Your contacts",
  "Seus círculos": "Your circles",
  Arquivadas: "Archived",
  "Interações arquivadas": "Archived interactions",
  "Mapa das conexões": "Connection map",
  "Pessoas e círculos": "People and circles",
  "Como o vínculo cresce?": "How do connections grow?",
  "Entrar para ver minhas conexões": "Sign in to see my connections",
  "Explorar círculos": "Explore circles",

  Imagens: "Images",
  "Adicionar nova imagem": "Add new image",
  "＋ Adicionar nova imagem": "＋ Add new image",
  "Selecionar imagens": "Select images",
  "Cancelar seleção": "Cancel selection",
  "Revisar proposta de retirada": "Review removal proposal",
  Mostrar: "Show",
  Todas: "All",
  "Na rotação": "In rotation",
  "Em votação": "Under review",
  Inativas: "Inactive",
  Selecionar: "Select",
  Limpar: "Clear",
  "Tirar da seleção": "Remove from selection",
  "Submeter conjunto à votação": "Submit set for voting",
  "Inclusão em votação": "Inclusion under review",
  "Retirada em votação": "Removal under review",
  "Espaço Comum": "Common Space",
  "Primeiros passos em governança": "First steps in governance",
  Propostas: "Proposals",
  Acervo: "Collection",
  Decisões: "Decisions",
  "Como decidimos": "How we decide",
  "A favor": "In favor",
  Contra: "Against",
  "Ver o prompt fixo": "View the fixed prompt",
  "Traga um elemento para a Praça": "Bring a natural element to Praça",
  "Propor retirada": "Propose removal",
  "Votos públicos e prompt": "Public votes and prompt",
  "Submeter à votação": "Submit for voting",
  Círculos: "Circles",
  Pessoas: "People",
  Pendências: "Pending",
  "Criar um círculo": "Create a circle",
  "Criar círculo": "Create circle",
  "A missão": "The mission",
  "Quem está metido nisso": "Who's involved",
  "Quadro de ação": "Action board",
  "Boletim do círculo": "Circle bulletin",
  "Resultados e evidências": "Results and evidence",
  "Reunindo gente": "Gathering people",
  "Em ação": "In action",
  "Missão cumprida": "Mission accomplished",
  Interrompido: "Interrupted",
  Arquivado: "Archived",
  "Ajudar alguém": "Help someone",
  "Resolver um problema": "Solve a problem",
  "Fazer algo acontecer": "Make something happen",
  "Cutucar de volta e conectar": "Poke back and connect",
  "✓ Conectados": "✓ Connected",
  "Eu assumo": "I'll take it",
  "Marcar como feito": "Mark as done",
  "Devolver tarefa": "Release task",
  "Aceitar convite": "Accept invitation",
  Recusar: "Decline",
  "Pedir para participar": "Request to join",
  "Registrar contribuição": "Add contribution",
  "Salvar alterações": "Save changes",
  "Convidar conexões": "Invite connections",
  "Sair do círculo": "Leave circle",
  Mural: "Wall",
  Placar: "Leaderboard",
  Escrever: "Write",
  Cutucadas: "Pokes",
  Conexões: "Connections",
  Perfil: "Profile",
  Entrar: "Sign in",
  "Retirar-se": "Leave",
  "Entre.": "Enter.",
  "A praça": "The square",
  "é nossa!": "is ours!",
  "Criar minha entrada": "Create my entry",
  "Explorar o Mural": "Explore the Wall",
  Responda: "Answer",
  "Descubra seu papel": "Discover your role",
  "Publique e circule": "Publish and circulate",
  "Assistente da Praça": "Praça Assistant",
  "Primeira vez por aqui?": "First time here?",
  "Posso mostrar os caminhos da Praça.": "I can show you around Praça.",
  "Quero chegar": "I want to join",
  "Já tenho chave": "I already have a key",
  "Nome público": "Public name",
  Identificador: "Username",
  "Chave da Praça": "Praça Key",
  "Recuperação de acesso": "Account recovery",
  "Primeira pergunta": "First question",
  "Primeira resposta": "First answer",
  "Segunda pergunta": "Second question",
  "Segunda resposta": "Second answer",
  "Esqueci minha chave": "I forgot my key",
  "Ver o Mural": "View the Wall",
  Publicações: "Posts",
  "Pessoas · prêmio semanal": "People · weekly prize",
  "Desde o começo": "All time",
  Semana: "Week",
  Hoje: "Today",
  "Mais períodos": "More periods",
  "Como funciona a pontuação": "How scoring works",
  Compartilhar: "Share",
  "Link pronto": "Link ready",
  Curtir: "Like",
  Curtido: "Liked",
  Comentar: "Comment",
  "Retirar-se da Praça": "Leave Praça",
  "Distinções descobertas": "Discovered distinctions",
  "Suas publicações": "Your posts",
  "Pessoas que chegaram pelo seu convite": "People who arrived through your invitation",
};

function translatable(node: Text) {
  const parent = node.parentElement;
  const value = node.nodeValue || "";
  if (!parent || !value.trim() || !/[A-Za-zÀ-ÿ]/.test(value)) return false;
  if (parent.closest("[data-no-translate],script,style,noscript,code,pre,textarea")) return false;
  return !/^https?:\/\//i.test(value.trim());
}

function textNodes() {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let current: Node | null;
  while ((current = walker.nextNode()))
    if (translatable(current as Text)) nodes.push(current as Text);
  return nodes;
}

function dispatch(loading: boolean, failed = false) {
  window.dispatchEvent(new CustomEvent("praca-translation-state", { detail: { loading, failed } }));
}

async function translateValues(values: string[]) {
  const unique = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  const missing = unique.filter((value) => !cache[value]);
  for (let start = 0; start < missing.length; start += 30) {
    const batch = missing.slice(start, start + 30);
    const response = await fetch("/api/translate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ texts: batch }),
    });
    const data = (await response.json()) as { translations?: string[]; error?: string };
    if (!response.ok || !data.translations || data.translations.length !== batch.length)
      throw new Error(data.error || "Translation failed");
    batch.forEach((source, index) => {
      cache[source] = data.translations![index];
    });
  }
  try {
    localStorage.setItem(
      "praca_translation_cache",
      JSON.stringify(Object.fromEntries(Object.entries(cache).slice(-700))),
    );
  } catch {}
}

async function applyEnglish() {
  const nodes = textNodes();
  for (const node of nodes) {
    if (translated.get(node) === node.nodeValue) continue;
    originals.set(node, node.nodeValue || "");
  }
  const elements = [...document.querySelectorAll<HTMLElement>("[placeholder],[title]")].filter(
    (element) => !element.closest("[data-no-translate]"),
  );
  for (const element of elements) {
    if (!attributeOriginals.has(element))
      attributeOriginals.set(element, {
        placeholder: element.getAttribute("placeholder") || "",
        title: element.getAttribute("title") || "",
      });
  }
  const sources = [
    ...nodes.map((node) => (originals.get(node) || "").trim()),
    ...elements
      .flatMap((element) => Object.values(attributeOriginals.get(element) || {}))
      .filter(Boolean),
  ];
  function applyCached() {
    for (const node of nodes) {
      const original = originals.get(node) || "";
      const clean = original.trim();
      if (!cache[clean]) continue;
      const next = original.replace(clean, cache[clean]);
      translated.set(node, next);
      if (node.nodeValue !== next) node.nodeValue = next;
    }
    for (const element of elements) {
      const original = attributeOriginals.get(element)!;
      if (
        original.placeholder &&
        cache[original.placeholder.trim()] &&
        element.getAttribute("placeholder") !== cache[original.placeholder.trim()]
      )
        element.setAttribute("placeholder", cache[original.placeholder.trim()]);
      if (
        original.title &&
        cache[original.title.trim()] &&
        element.getAttribute("title") !== cache[original.title.trim()]
      )
        element.setAttribute("title", cache[original.title.trim()]);
    }
  }
  applyCached();
  await translateValues(sources);
  applyCached();
}

function restorePortuguese() {
  for (const node of textNodes()) {
    const original = originals.get(node);
    if (original !== undefined) {
      node.nodeValue = original;
      translated.delete(node);
    }
  }
  for (const element of document.querySelectorAll<HTMLElement>("[placeholder],[title]")) {
    const original = attributeOriginals.get(element);
    if (!original) continue;
    if (original.placeholder) element.setAttribute("placeholder", original.placeholder);
    if (original.title) element.setAttribute("title", original.title);
  }
}

export default function PageTranslator() {
  useEffect(() => {
    try {
      cache = { ...JSON.parse(localStorage.getItem("praca_translation_cache") || "{}"), ...UI_EN };
    } catch {
      cache = { ...UI_EN };
    }
    let language: Language = "pt";
    try {
      language = localStorage.getItem("praca_language") === "en" ? "en" : "pt";
    } catch {}
    let timer = 0;
    async function render() {
      document.documentElement.lang = language === "en" ? "en" : "pt-BR";
      if (language === "pt") {
        restorePortuguese();
        dispatch(false);
        return;
      }
      dispatch(true);
      try {
        await applyEnglish();
        dispatch(false);
      } catch {
        dispatch(false, true);
      }
    }
    const onLanguage = (event: Event) => {
      language = (event as CustomEvent<{ language: Language }>).detail.language;
      render();
    };
    const observer = new MutationObserver(() => {
      if (language !== "en") return;
      window.clearTimeout(timer);
      timer = window.setTimeout(render, 180);
    });
    window.addEventListener("praca-language", onLanguage);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    render();
    return () => {
      observer.disconnect();
      window.removeEventListener("praca-language", onLanguage);
      window.clearTimeout(timer);
    };
  }, []);
  return null;
}
