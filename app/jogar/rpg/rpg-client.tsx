"use client";
import { useEffect, useRef, useState } from "react";
import {
  SKILLS,
  skillKeys,
  available,
  bonus,
  ACTIVITIES,
  type RpgState,
  type Skill,
} from "../../../lib/rpg";
type Snapshot = { state: RpgState; revision: number };
export default function RpgClient({
  signedIn,
  role,
  name,
}: {
  signedIn: boolean;
  role: string;
  name: string;
}) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null),
    [loading, setLoading] = useState(signedIn),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [talent, setTalent] = useState<Skill>("investigar"),
    [intent, setIntent] = useState(""),
    [focus, setFocus] = useState(false),
    [tab, setTab] = useState("aventura"),
    [activity, setActivity] = useState("fontes"),
    [mode, setMode] = useState("inside"),
    [note, setNote] = useState(""),
    [remaining, setRemaining] = useState<number | null>(null);
  const end = useRef<HTMLDivElement>(null);
  const s = snapshot?.state;
  async function reload() {
    try {
      const r = await fetch("/api/rpg", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Não foi possível carregar.");
      setSnapshot(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (signedIn) reload();
  }, [signedIn]);
  useEffect(() => {
    if (s?.turn || s?.pending)
      end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [s?.journal.length]);
  async function send(p: any) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/rpg", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...p, revision: snapshot?.revision }),
      });
      const data = await r.json();
      if (!r.ok) {
        if (r.status === 409) await reload();
        throw Error(data.error || "Não foi possível concluir.");
      }
      setSnapshot(data);
      if (typeof data.remaining === "number") setRemaining(data.remaining);
      if (p.op === "propose") setIntent("");
      if (p.op === "activity") {
        setNote("");
        setTab("aventura");
      }
      setFocus(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha de conexão.");
    } finally {
      setBusy(false);
    }
  }
  if (!signedIn)
    return (
      <section className="rpg-intro">
        <h2>Seu papel já é um começo de história.</h2>
        <p>
          Entre na Praça para criar a ficha, conversar com o mestre e guardar a aventura na sua
          conta.
        </p>
        <a className="rpg-primary" href="/entrar">
          Entrar na Praça
        </a>
        <p className="rpg-small">
          Capítulo individual · Progresso salvo · Atividades reais opcionais
        </p>
      </section>
    );
  if (loading) return <p role="status">Abrindo seu caderno…</p>;
  const errorBox = error && (
    <div className="rpg-error" role="alert">
      {error}{" "}
      <button onClick={reload} disabled={busy}>
        Atualizar
      </button>
    </div>
  );
  if (!s)
    return (
      <section className="rpg-intro">
        {errorBox}
        <p className="rpg-eyebrow">SUA PRIMEIRA FICHA</p>
        <h2>{role}</h2>
        <p>
          {name}, escolha como seu papel costuma entrar em ação. O talento recebe +2; duas outras
          habilidades começam com +1. Você poderá invocar o talento uma vez neste capítulo para
          ganhar mais +1.
        </p>
        <fieldset disabled={busy}>
          <legend>Qual é o seu talento?</legend>
          <div className="rpg-talents">
            {skillKeys.map((k) => (
              <label key={k} className={talent === k ? "selected" : ""}>
                <input
                  type="radio"
                  name="talent"
                  value={k}
                  checked={talent === k}
                  onChange={() => setTalent(k)}
                />
                {SKILLS[k]}
              </label>
            ))}
          </div>
        </fieldset>
        <button
          className="rpg-primary"
          disabled={busy}
          onClick={() => send({ op: "start", talent })}
        >
          {busy ? "Preparando…" : "Abrir meu caderno →"}
        </button>
        <p className="rpg-small">
          Seu papel será preservado nesta ficha. O mestre interpreta ações livres; dados e
          recompensas são calculados pelo jogo. Há até 30 intervenções de IA por dia.
        </p>
      </section>
    );
  const actions = available(s),
    pending = actions.find((a) => a.id === s.pending?.action),
    act = ACTIVITIES.find((a) => a.id === activity)!;
  return (
    <>
      <nav className="rpg-tabs" aria-label="Caderno de aventura">
        {[
          ["aventura", "A aventura"],
          ["ficha", "Minha ficha"],
          ["atividades", "Além da história"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-current={tab === id ? "page" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </nav>
      {errorBox}
      <div className="rpg-layout">
        <section className="rpg-main" aria-busy={busy}>
          {tab === "aventura" && (
            <>
              <div className="rpg-chapter">
                <span>01 / O CORETO</span>
                <span>{s.ended ? "CAPÍTULO CONCLUÍDO" : "EM ANDAMENTO"}</span>
              </div>
              <div className="rpg-scene-art" aria-hidden="true">
                <svg viewBox="0 0 800 190">
                  <path d="M0 154Q180 119 380 158T800 144V190H0" fill="#b8b993" />
                  <circle cx="650" cy="43" r="28" fill="#e9cc82" />
                  <path
                    d="M290 155H510M312 147V78M488 147V78M345 147V78M455 147V78"
                    stroke="#55634f"
                    strokeWidth="6"
                  />
                  <path d="M283 78 400 20 517 78Z" fill="#68775a" />
                  <path d="M305 155h190l23 12H282Z" fill="#657058" />
                  <path d="M525 167q60-40 140-12t100 0q-70 32-132 16t-108-4" fill="#324b3d" />
                  <path d="M110 145V55m-30 45 30-24 27 24" stroke="#728267" strokeWidth="7" />
                  <circle cx="110" cy="49" r="35" fill="#8b9b73" />
                  <path
                    d="M380 143h45m-40-5v-12h35v12"
                    fill="none"
                    stroke="#9f8151"
                    strokeWidth="4"
                  />
                </svg>
                <span>A SOMBRA TEM OUTROS PLANOS.</span>
              </div>
              <div className="rpg-journal">
                {s.journal.map((e, i) => (
                  <article key={i} className={`rpg-entry ${e.who}`}>
                    <p className="rpg-eyebrow">
                      {e.who === "mestre"
                        ? "Mestre da Praça"
                        : e.who === "dados"
                          ? "Rolagem registrada"
                          : name}
                    </p>
                    <p>{e.text}</p>
                  </article>
                ))}
                <div ref={end} />
              </div>
              {s.ended ? (
                <div className="rpg-ending">
                  <h2>O lugar mudou. Você também deixou uma marca.</h2>
                  <p>
                    Capítulo concluído · {s.clues.length} pistas · {s.xp} pontos de aventura.
                  </p>
                  <p>
                    Seu histórico fica neste caderno. No perfil público aparecem apenas ficha e
                    marcos, sem suas mensagens ou relatos.
                  </p>
                  <a href="/perfil#jogos" className="rpg-primary">
                    Ver meu perfil →
                  </a>
                </div>
              ) : pending ? (
                <section className="rpg-confirm">
                  <p className="rpg-eyebrow">ANTES DOS DADOS</p>
                  <h2>{pending.label}</h2>
                  <dl>
                    <dt>Efeito</dt>
                    <dd>{pending.effect}</dd>
                    <dt>Risco em caso de custo ou complicação</dt>
                    <dd>{pending.risk}</dd>
                  </dl>
                  {pending.final && (
                    <p className="rpg-small">
                      Esta decisão conclui o capítulo. Você pode mudar de ideia antes de rolar; o
                      desfecho ficará salvo.
                    </p>
                  )}
                  <p className="rpg-dice-formula">
                    2d6 + {bonus(s, pending, focus)} · {SKILLS[pending.skill]}
                  </p>
                  <p className="rpg-small">
                    10 ou mais: sucesso · 7–9: sucesso com custo · até 6: complicação. A
                    investigação avança mesmo com um contratempo.
                  </p>
                  {s.focus && s.talent === pending.skill && (
                    <label className="rpg-check">
                      <input
                        type="checkbox"
                        checked={focus}
                        onChange={(e) => setFocus(e.target.checked)}
                        disabled={busy}
                      />
                      Invocar “{s.role}” (+1, uma vez no capítulo)
                    </label>
                  )}
                  <div className="rpg-buttons">
                    <button
                      className="rpg-primary"
                      disabled={busy}
                      onClick={() => send({ op: "roll", id: s.pending!.id, focus })}
                    >
                      {busy ? "Rolando…" : "⚄ Lançar os dados"}
                    </button>
                    <button
                      className="rpg-secondary"
                      disabled={busy}
                      onClick={() => send({ op: "cancel", id: s.pending!.id })}
                    >
                      Mudar de ideia
                    </button>
                  </div>
                </section>
              ) : (
                <section className="rpg-compose">
                  <h2>O que você faz?</h2>
                  <p>
                    Descreva uma ação ou converse com alguém da cena. O mestre apresenta uma
                    interpretação; você confirma antes de rolar.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      send({ op: "propose", intent });
                    }}
                  >
                    <label htmlFor="rpg-intent" className="sr-only">
                      Sua ação ou fala
                    </label>
                    <textarea
                      id="rpg-intent"
                      maxLength={900}
                      minLength={4}
                      required
                      value={intent}
                      onChange={(e) => setIntent(e.target.value)}
                      disabled={busy}
                      placeholder="Quero perguntar à Lídia quem usava aquele banco antes da reforma…"
                    />
                    <div className="rpg-compose-footer">
                      <span>
                        {remaining === null
                          ? "Até 30 intervenções de IA por dia"
                          : `${remaining} intervenções de IA restantes hoje`}
                      </span>
                      <button className="rpg-primary" disabled={busy || intent.trim().length < 4}>
                        {busy ? "O mestre está respondendo…" : "Enviar ao mestre →"}
                      </button>
                    </div>
                  </form>
                  <details className="rpg-suggestions">
                    <summary>Precisa de uma ideia? Ações sugeridas</summary>
                    <p className="rpg-small">Funcionam sem chamar a IA.</p>
                    {actions.map((a) => (
                      <button
                        className="rpg-suggestion"
                        key={a.id}
                        disabled={busy}
                        onClick={() => send({ op: "suggestion", action: a.id })}
                      >
                        <span>{a.label}</span>
                        <small>{SKILLS[a.skill]} →</small>
                      </button>
                    ))}
                  </details>
                </section>
              )}
            </>
          )}
          {tab === "ficha" && (
            <section className="rpg-sheet">
              <p className="rpg-eyebrow">SEU PAPEL EM JOGO</p>
              <h2>{s.role}</h2>
              <p>
                Talento: {SKILLS[s.talent]}.{" "}
                {s.focus
                  ? "Sua invocação de +1 está disponível."
                  : "Invocação usada neste capítulo."}
              </p>
              <div className="rpg-skills">
                {skillKeys.map((k) => (
                  <article key={k}>
                    <h3>
                      {SKILLS[k]}{" "}
                      <strong>+{s.skills[k] + Math.min(1, Math.floor(s.growth[k] / 2))}</strong>
                    </h3>
                    <p>
                      {s.growth[k]} experiências ·{" "}
                      {s.growth[k] >= 2
                        ? "Bônus de prática +1 alcançado"
                        : "Mais " + (2 - s.growth[k]) + " para +1 de prática"}
                    </p>
                  </article>
                ))}
              </div>
              <p>
                Duas experiências numa habilidade acrescentam +1, limitado a um bônus de prática
                neste capítulo. Cada pista e cada atividade distinta conta uma vez.
              </p>
              <p>
                Os pontos de aventura ({s.xp}) ficam separados do XP geral: o primeiro teste concede
                5 XP e concluir o capítulo concede 20 XP, uma vez cada.
              </p>
              <a href="/perfil#jogos">Ver ficha no perfil →</a>
            </section>
          )}
          {tab === "atividades" && (
            <section className="rpg-sheet">
              <p className="rpg-eyebrow">EXPERIÊNCIAS OPCIONAIS</p>
              <h2>Uma ideia atravessa a página.</h2>
              <p>
                Escolha uma atividade. Você pode realizá-la na ficção ou no cotidiano, com a mesma
                recompensa. Cada uma conta uma vez. Seu relato fica privado neste caderno.
              </p>
              <label htmlFor="rpg-activity">Atividade</label>
              <select
                id="rpg-activity"
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
              >
                {ACTIVITIES.map((a) => (
                  <option value={a.id} key={a.id}>
                    {a.title}
                    {s.activities.includes(a.id) ? " · registrada" : ""}
                  </option>
                ))}
              </select>
              <fieldset>
                <legend>Onde realizar?</legend>
                <label>
                  <input
                    type="radio"
                    checked={mode === "inside"}
                    onChange={() => setMode("inside")}
                    name="mode"
                  />
                  Dentro da aventura
                </label>
                <label>
                  <input
                    type="radio"
                    checked={mode === "real"}
                    onChange={() => setMode("real")}
                    name="mode"
                  />
                  No cotidiano / na Praça
                </label>
              </fieldset>
              <blockquote>{mode === "inside" ? act.inside : act.real}</blockquote>
              <p className="rpg-small">
                Por autodeclaração: +1 experiência em {SKILLS[act.skill]} e +1 no próximo teste
                dessa habilidade. Uma preparação por vez. Não exige foto, localização ou publicação.
              </p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send({ op: "activity", activity, mode, note });
                }}
              >
                <label htmlFor="rpg-note">Seu registro (80–1.800 caracteres)</label>
                <textarea
                  id="rpg-note"
                  minLength={80}
                  maxLength={1800}
                  required
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  disabled={busy || s.ended || s.activities.includes(activity)}
                />
                <button
                  className="rpg-primary"
                  disabled={
                    busy ||
                    s.ended ||
                    !!s.pending ||
                    !!s.boon ||
                    s.activities.includes(activity) ||
                    note.trim().length < 80
                  }
                >
                  {s.activities.includes(activity)
                    ? "Atividade registrada"
                    : s.boon
                      ? "Use sua preparação antes de registrar outra"
                      : s.ended
                        ? "Capítulo concluído"
                        : s.pending
                          ? "Resolva sua ação primeiro"
                          : "Registrar preparação"}
                </button>
              </form>
              <p className="rpg-small">
                Compartilhar na Praça é opcional e não concede pontos extras. Não inclua dados
                pessoais de terceiros.
              </p>
            </section>
          )}
        </section>
        <aside className="rpg-aside">
          <p className="rpg-eyebrow">SEU PERSONAGEM</p>
          <h2>{s.role}</h2>
          <p>
            {name} · {SKILLS[s.talent]}
          </p>
          <div className="rpg-aside-stat">
            <span>Pistas encontradas</span>
            <strong>{s.clues.length}/5</strong>
          </div>
          <div className="rpg-aside-stat">
            <span>Preparação da feira</span>
            <strong>{s.pressure}/6</strong>
          </div>
          <div
            className="rpg-clock"
            role="progressbar"
            aria-label="Preparação da feira"
            aria-valuenow={s.pressure}
            aria-valuemin={0}
            aria-valuemax={6}
          >
            {Array.from({ length: 6 }, (_, i) => (
              <i key={i} className={i < s.pressure ? "filled" : ""} />
            ))}
          </div>
          <p className="rpg-small">
            A pressão avança com os contratempos, sem cronômetro real. Duas pistas já permitem
            escolher um desfecho.
          </p>
          {s.boon && (
            <div className="rpg-prepared">
              <p>Preparação: +1 em {SKILLS[s.boon]}</p>
              <button
                className="rpg-small underline"
                disabled={busy || !!s.pending || s.ended}
                onClick={() => send({ op: "discard" })}
              >
                Dispensar preparação
              </button>
            </div>
          )}
          <div className="rpg-aside-stat">
            <span>Pontos de aventura</span>
            <strong>{s.xp}</strong>
          </div>
          <hr />
          <p className="rpg-small">Mestre com IA · Dados no servidor · Progresso salvo por conta</p>
          <p className="rpg-small">
            Este capítulo é ficcional e individual. Notícias e aventuras em grupo ainda não fazem
            parte desta versão.
          </p>
        </aside>
      </div>
    </>
  );
}
