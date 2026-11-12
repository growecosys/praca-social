const prompts = [
  "O que você protege?",
  "O que te revolta?",
  "Qual seu talento estranho?",
  "Qual seu defeito produtivo?",
  "Que mundo você procura?",
];

function extractOutputText(data: any) {
  if (typeof data?.output_text === "string") return data.output_text;
  return (data?.output || [])
    .flatMap((item: any) => item?.content || [])
    .filter((item: any) => item?.type === "output_text")
    .map((item: any) => item.text)
    .join("");
}

export type IdentityMapping = {
  causa: string;
  adversario: string;
  metodo: string;
  contradicao: string;
  horizonte: string;
};

export type IdentityVisualDirection = {
  symbol: "olho" | "ponte" | "semente" | "chave" | "faísca" | "espiral";
  symbolMeaning: string;
  colors: string[];
  character: string;
  action: string;
  satiricalDetail: string;
};

export type RoleComponents = {
  semanticAnchor: string;
  frameA: string;
  frameB: string;
  authority: string;
  impossibleDomain: string;
  personalTension: string;
  comicMechanism: string;
  structureFamily: string;
  absurdMechanism: string;
};

const comicMechanisms = [
  "contraste",
  "hipérbole",
  "burocracia_do_absurdo",
  "paradoxo",
  "solenidade_impropria",
  "personificação",
  "literalização",
  "inversão",
  "falha_produtiva",
  "escala_inadequada",
] as const;

const structureFamilies = [
  "cargo_dominio_impossivel",
  "cargo_adjetivo_incompativel",
  "cargo_dominio_qualificante",
  "oficio_objeto_abstrato",
  "funcao_inventada",
  "substantivo_adjetivo",
  "personagem_metaforico",
  "acao_substantivada",
  "titulo_quase_institucional",
  "composto_surreal",
] as const;

const symbols = ["olho", "ponte", "semente", "chave", "faísca", "espiral"] as const;
const symbolDefinitions = {
  olho: "observação, vigilância, investigação ou crítica",
  ponte: "mediação ou travessia real entre lados separados",
  semente: "cultivo, começo, propagação ou paciência",
  chave: "acesso, desbloqueio, revelação ou solução",
  faísca: "provocação, ruptura, mobilização ou início súbito",
  espiral: "transformação, recorrência, complexidade ou aprendizagem",
};

export function mapIdentityAnswers(answers: string[]): IdentityMapping {
  return {
    causa: answers[0] || "",
    adversario: answers[1] || "",
    metodo: answers[2] || "",
    contradicao: answers[3] || "",
    horizonte: answers[4] || "",
  };
}

function first(value: string) {
  return value.split(/[,;]+/)[0]?.trim() || value.trim();
}

function firstWord(value: string) {
  return (
    first(value)
      .split(/\s+/)[0]
      ?.replace(/[^\p{L}\p{N}-]/gu, "") || "Comum"
  );
}

function normalizeRoleTitle(value: unknown, fallbackTitle: string) {
  const clean = String(value || "")
    .split(/[:;|—–]/)[0]
    .replace(/["“”'‘’.,!?()[\]{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const words = clean.split(" ").filter(Boolean);
  if (words.length < 2) return fallbackTitle;
  return words.slice(0, 4).join(" ");
}

function normalizeColors(value: unknown, fallbackColors: string[]) {
  if (!Array.isArray(value)) return fallbackColors;
  const colors = value
    .map((color) => String(color).trim())
    .filter((color) => /^#[0-9a-f]{6}$/i.test(color));
  return colors.length === 3 ? colors : fallbackColors;
}

function fallback(answers: string[]) {
  const colors = ["#244e35", "#f0c64b", "#df5c45", "#4466aa", "#7b4a8b"];
  const mapping = mapIdentityAnswers(answers);
  const seed = answers
    .join("")
    .split("")
    .reduce((sum, character) => sum + character.charCodeAt(0), 0);
  const offices = ["Ouvidor", "Síndico", "Fiscal", "Ministro"];
  const tensions = ["Inconveniente", "Provisório", "Extraoficial", "Improvável"];
  const symbol = symbols[seed % symbols.length];
  return {
    roleTitle: `${offices[seed % offices.length]} ${tensions[(seed + 1) % tensions.length]} ${firstWord(mapping.causa)}`,
    manifesto: `Organiza ${first(mapping.metodo)} contra ${first(mapping.adversario)}, para que ${first(mapping.horizonte)} deixe de ser desculpa.`,
    symbol,
    symbolMeaning: symbolDefinitions[symbol],
    colors: [colors[seed % colors.length], colors[(seed + 2) % colors.length], "#f5f1e8"],
    mapping,
    roleComponents: {
      semanticAnchor: `${first(mapping.metodo)} em defesa de ${first(mapping.causa)}`,
      frameA: offices[seed % offices.length],
      frameB: firstWord(mapping.horizonte),
      authority: offices[seed % offices.length],
      impossibleDomain: firstWord(mapping.horizonte),
      personalTension: first(mapping.contradicao),
      comicMechanism: "burocracia_do_absurdo" as const,
      structureFamily: "cargo_adjetivo_incompativel",
      absurdMechanism: `oficializa ${first(mapping.contradicao)} para alcançar ${first(mapping.horizonte)}`,
    },
    character: `${offices[seed % offices.length].toLowerCase()} simbólico improvisado`,
    action: `organiza ${first(mapping.metodo)} contra ${first(mapping.adversario)}`,
    satiricalDetail: `trata ${first(mapping.contradicao)} como procedimento oficial`,
    explanation: `Este papel reúne o que você protege, enfrenta e sabe fazer com o mundo que procura construir.`,
  };
}

export async function generateProfileIdentity(
  answers: string[],
  options: { avoidSymbols?: string[]; avoidStructures?: string[] } = {},
) {
  let identity = fallback(answers);
  try {
    const { env } = await import("./env");
    const key = (env as any).OPENAI_API_KEY;
    if (!key) return identity;
    const schema = {
      type: "object",
      properties: {
        roleTitle: { type: "string" },
        manifesto: { type: "string" },
        semanticAnchor: { type: "string" },
        frameA: { type: "string" },
        frameB: { type: "string" },
        authority: { type: "string" },
        impossibleDomain: { type: "string" },
        personalTension: { type: "string" },
        comicMechanism: {
          type: "string",
          enum: comicMechanisms,
        },
        structureFamily: { type: "string", enum: structureFamilies },
        absurdMechanism: { type: "string" },
        explanation: { type: "string" },
      },
      required: [
        "roleTitle",
        "manifesto",
        "semanticAnchor",
        "frameA",
        "frameB",
        "authority",
        "impossibleDomain",
        "personalTension",
        "comicMechanism",
        "structureFamily",
        "absurdMechanism",
        "explanation",
      ],
      additionalProperties: false,
    };
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        store: false,
        instructions: `Crie um papel simbólico em português brasileiro seguindo rigorosamente esta arquitetura sem explicá-la ao usuário: causa = o que protege; adversário = o que revolta; método = talento estranho; contradição = defeito produtivo; horizonte = mundo procurado.

O resultado deve ser uma caricatura afetuosa das contradições da pessoa transformada em um cargo impossível: absurdo, solene e estranhamente necessário. O humor precisa nascer do atrito real entre as cinco respostas, principalmente entre método e contradição. Não acrescente aleatoriedade desconectada das respostas.

Construa primeiro estes componentes: semanticAnchor = verdade reconhecível extraída das respostas; frameA e frameB = dois campos semânticos diferentes que irão colidir; authority = cargo, ofício ou personagem quando a família pedir; impossibleDomain = domínio abstrato ou inadequado; personalTension = contradição verdadeira da pessoa; comicMechanism = operação cômica; structureFamily = forma linguística; absurdMechanism = lógica local que faz o absurdo parecer compreensível. Depois componha o título. Os componentes não serão mostrados ao usuário.

Antes de responder, formule silenciosamente pelo menos seis combinações usando famílias e mecanismos diferentes. Avalie fidelidade, incongruência, possibilidade de entender a piada, musicalidade, caráter benigno e novidade. Descarte qualquer uma que pareça currículo, arquétipo heroico, resumo literal ou nonsense sem conexão. Entregue a combinação com maior potencial de fazer a pessoa rir e ainda se reconhecer. Evite estas famílias usadas recentemente quando outra opção tiver qualidade semelhante: ${JSON.stringify(options.avoidStructures || [])}. Não mencione candidatos, avaliação, sátira, caricatura, prompt ou regras no resultado.

Regras do título:
- deve ter obrigatoriamente no mínimo 2 e no máximo 4 palavras, contando artigos e preposições;
- entregue somente o nome do papel: nunca use dois-pontos, subtítulo, explicação, oração ou complemento depois do título;
- varie livremente entre estas famílias: cargo + domínio impossível; cargo + adjetivo incompatível; cargo + domínio + qualificante; ofício + objeto abstrato; função inventada; substantivo + adjetivo; personagem metafórico; ação substantivada; título quase institucional; composto surreal;
- não use automaticamente cargo + de/do/da + domínio. Essa é apenas uma família entre dez;
- deve conter incompatibilidade, exagero, paradoxo ou burocracia do absurdo;
- deve combinar pelo menos três dimensões, mesmo sem repetir literalmente as palavras;
- evite títulos heroicos genéricos como Guardião da Justiça, Catalisador de Mudanças ou Artífice do Futuro;
- evite também cargos apenas coerentes ou funcionais como Fiscal do Sentido, Mediador de Conflitos ou Mentor de Projetos: coerência sem absurdo não é suficiente;
- use como referência de diversidade, sem copiar automaticamente: Criador Insensato; Fundador da Insensatez Involuntária; Resenhador da Esperança; Engenheiro do Caos Involuntário; Arquiteto da Graça; Bússola Desobediente; Descomplicador Oficial;
- o alvo da piada são hábitos, contradições, convenções e sistemas, nunca a dignidade da pessoa.

Regras do manifesto:
- no máximo 18 palavras;
- deve mostrar causa, adversário, método e horizonte;
- deve manter a mesma voz do título, com ironia elegante e poder de síntese;
- depois do humor, a pessoa deve reconhecer algo verdadeiro sobre si.

Prioridades: 1) fidelidade às cinco respostas; 2) contradição reconhecível; 3) coerência entre título e manifesto; 4) originalidade; 5) elegância. Nunca use aparência, raça, gênero, deficiência ou atributos sensíveis. Não escolha símbolo, cores ou direção visual nesta etapa. A explanation é exibida ao usuário: explique em no máximo 35 palavras como as respostas se conectam, sem falar de sátira, caricatura, candidatos, intensidade ou funcionamento interno.`,
        input: JSON.stringify({
          mapping: mapIdentityAnswers(answers),
          source: prompts.map((prompt, index) => ({
            prompt,
            answer: answers[index],
          })),
        }),
        text: {
          format: {
            type: "json_schema",
            name: "praca_identity",
            strict: true,
            schema,
          },
        },
      }),
    });
    const data = (await response.json()) as any;
    if (response.ok) {
      const parsed = JSON.parse(extractOutputText(data));
      identity = {
        ...identity,
        roleTitle: normalizeRoleTitle(parsed.roleTitle, identity.roleTitle),
        manifesto: parsed.manifesto.slice(0, 220),
        mapping: mapIdentityAnswers(answers),
        roleComponents: {
          semanticAnchor: String(parsed.semanticAnchor).slice(0, 160),
          frameA: String(parsed.frameA).slice(0, 100),
          frameB: String(parsed.frameB).slice(0, 100),
          authority: String(parsed.authority).slice(0, 80),
          impossibleDomain: String(parsed.impossibleDomain).slice(0, 100),
          personalTension: String(parsed.personalTension).slice(0, 140),
          comicMechanism: parsed.comicMechanism,
          structureFamily: parsed.structureFamily,
          absurdMechanism: String(parsed.absurdMechanism).slice(0, 180),
        },
        explanation: String(parsed.explanation).slice(0, 400),
      };

      const visualSchema = {
        type: "object",
        properties: {
          symbol: { type: "string", enum: symbols },
          symbolMeaning: { type: "string" },
          colors: {
            type: "array",
            items: { type: "string", pattern: "^#[0-9A-Fa-f]{6}$" },
            minItems: 3,
            maxItems: 3,
          },
          character: { type: "string" },
          action: { type: "string" },
          satiricalDetail: { type: "string" },
        },
        required: ["symbol", "symbolMeaning", "colors", "character", "action", "satiricalDetail"],
        additionalProperties: false,
      };
      const visualResponse = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5-mini",
          store: false,
          instructions: `Crie somente a direção visual estruturada para a identidade fornecida. Não reescreva o título nem o manifesto.

Escolha exatamente um símbolo segundo esta taxonomia: ${JSON.stringify(symbolDefinitions)}. Ponte só é válida quando existe mediação ou travessia concreta entre lados separados; conexão, confiança, integração ou organização isoladamente não bastam. Escolha o símbolo mais específico, não o mais genérico. Evite estes símbolos usados recentemente quando outra opção tiver aderência equivalente: ${JSON.stringify(options.avoidSymbols || [])}.

As três cores devem ser códigos hexadecimais válidos e distintos. O personagem deve ser uma criatura, objeto ou figura simbólica curta. A ação deve tornar o manifesto visível. O detalhe satírico deve nascer da contradição produtiva, ser visual e não humilhar a pessoa. Cada texto deve ter no máximo 12 palavras. Nunca use aparência, raça, gênero, deficiência ou atributos sensíveis.`,
          input: JSON.stringify({
            roleTitle: identity.roleTitle,
            manifesto: identity.manifesto,
            mapping: identity.mapping,
            roleComponents: identity.roleComponents,
          }),
          text: {
            format: {
              type: "json_schema",
              name: "praca_visual_direction",
              strict: true,
              schema: visualSchema,
            },
          },
        }),
      });
      if (visualResponse.ok) {
        const visualData = (await visualResponse.json()) as any;
        const visual = JSON.parse(extractOutputText(visualData));
        const symbol = symbols.includes(visual.symbol) ? visual.symbol : identity.symbol;
        identity = {
          ...identity,
          symbol,
          symbolMeaning: String(visual.symbolMeaning).slice(0, 160),
          colors: normalizeColors(visual.colors, identity.colors),
          character: String(visual.character).slice(0, 120),
          action: String(visual.action).slice(0, 160),
          satiricalDetail: String(visual.satiricalDetail).slice(0, 180),
        };
      }
    }
  } catch {}
  return identity;
}

export async function reconstructLegacyIdentity(roleTitle: string, answers: string[]) {
  const fallbackIdentity = {
    manifesto:
      "Versão recuperada do arquivo da Praça e reconstruída a partir dos sinais originais.",
    symbol: "ponte",
    colors: ["#244e35", "#f0c64b", "#f5f1e8"],
  };
  try {
    const { env } = await import("./env");
    const key = (env as any).OPENAI_API_KEY;
    if (!key) return fallbackIdentity;
    const schema = {
      type: "object",
      properties: {
        manifesto: { type: "string" },
        symbol: {
          type: "string",
          enum: ["olho", "ponte", "semente", "chave", "faísca", "espiral"],
        },
        colors: {
          type: "array",
          items: { type: "string" },
          minItems: 3,
          maxItems: 3,
        },
      },
      required: ["manifesto", "symbol", "colors"],
      additionalProperties: false,
    };
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        store: false,
        instructions:
          "Reconstrua os elementos ausentes de um papel histórico da Praça. Preserve exatamente o título fornecido. Crie manifesto em português brasileiro com no máximo 18 palavras, símbolo e três cores coerentes com o título e as cinco respostas. Não alegue que o texto é o manifesto original.",
        input: JSON.stringify({ roleTitle, answers }),
        text: {
          format: {
            type: "json_schema",
            name: "legacy_identity",
            strict: true,
            schema,
          },
        },
      }),
    });
    const data = (await response.json()) as any;
    if (!response.ok) return fallbackIdentity;
    const parsed = JSON.parse(extractOutputText(data));
    return {
      manifesto: String(parsed.manifesto).slice(0, 220),
      symbol: parsed.symbol,
      colors: parsed.colors,
    };
  } catch {
    return fallbackIdentity;
  }
}
