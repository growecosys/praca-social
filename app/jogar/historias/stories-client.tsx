"use client";
import { useEffect, useRef, useState } from "react";
import {
  STORY_SKILLS,
  STORY_KEYS,
  STORY_ACTIONS,
  STORY_PLANS,
  PREMISE,
  storyBonus,
  type StorySkill,
  type Member,
} from "../../../lib/stories";
function date(n: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(n);
}
export default function StoriesClient({ userId }: { userId: string | null }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("historia"),
    [talent, setTalent] = useState<StorySkill>("investigar"),
    [accept, setAccept] = useState(false),
    [intent, setIntent] = useState(""),
    [message, setMessage] = useState(""),
    [focus, setFocus] = useState(false),
    [leave, setLeave] = useState(false),
    [activitySkill, setActivitySkill] = useState<StorySkill>("investigar"),
    [activityMode, setActivityMode] = useState("fiction"),
    [note, setNote] = useState(""),
    [remaining, setRemaining] = useState<number | null>(null);
  const draftId = useRef<string | null>(null);
  const c = data?.campaign,
    me = c?.me;
  async function load(silent = false) {
    try {
      const r = await fetch(
        "/api/historias" +
          (new URL(window.location.href).searchParams.get("campanha")
            ? "?campaign=" +
              encodeURIComponent(new URL(window.location.href).searchParams.get("campanha")!)
            : ""),
        { cache: "no-store" },
      );
      const p = await r.json();
      if (!r.ok) throw Error(p.error || "Não foi possível carregar.");
      setData(p);
      if (!silent) setError("");
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : "Falha de conexão.");
    }
  }
  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load(true);
    }, 30000);
    return () => clearInterval(id);
  }, []);
  async function send(p: any) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/historias", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...p, campaign: c.id, revision: data.revision }),
      });
      const result = await r.json();
      if (!r.ok) {
        if (r.status === 409) await load(true);
        throw Error(result.error || "Não foi possível concluir.");
      }
      setData(result);
      setFocus(false);
      setLeave(false);
      if (p.op === "message") {
        setMessage("");
        draftId.current = null;
      }
      if (p.op === "master") setIntent("");
      if (p.op === "activity") setNote("");
      if (typeof result.remaining === "number") setRemaining(result.remaining);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha de conexão.");
    } finally {
      setBusy(false);
    }
  }
  const err = error && (
    <div className="stories-error" role="alert">
      {error}{" "}
      <button disabled={busy} onClick={() => load()}>
        Atualizar
      </button>
    </div>
  );
  if (!c)
    return (
      <section className="stories-card">
        {err}
        <p role="status">
          {error
            ? "A campanha não carregou. Use Atualizar para tentar novamente."
            : "Abrindo a próxima história…"}
        </p>
      </section>
    );
  const playing = c.phase === "playing",
    enrollment = c.phase === "enrollment",
    ended = !playing && !enrollment,
    joined = c.joined,
    waiting = c.waitingPosition > 0,
    acted = me?.acted.includes(c.round),
    ready = c.layout >= 4 && (c.repair >= 4 || c.water >= 4 || c.setups.includes("move"));
  const options = STORY_ACTIONS.filter((a) =>
    ready
      ? a.id === "review"
      : a.id === "review"
        ? false
        : a.id === "inspect"
          ? !c.diagnosed
          : a.id === "repair"
            ? c.diagnosed && c.setups.includes("repair") && c.repair < 4
            : a.id === "supply"
              ? c.water < 4
              : c.layout < 4,
  );
  const pending = me?.pending,
    action = pending && STORY_ACTIONS.find((a) => a.id === pending.action);
  return (
    <>
      {err}
      <section className="stories-campaign">
        <div>
          <p className="stories-eyebrow">
            {enrollment
              ? "INSCRIÇÕES ABERTAS"
              : playing
                ? `RODADA ${c.round} DE ATÉ 7`
                : c.phase === "unformed"
                  ? "TURMA NÃO FORMADA"
                  : "HISTÓRIA ENCERRADA"}
          </p>
          <h2>A feira vai acontecer?</h2>
          <p>{PREMISE}</p>
        </div>
        <div className="stories-deadline">
          <span>{enrollment ? "Inscrições até" : playing ? "Rodada até" : "Encerramento"}</span>
          <strong>{date(enrollment ? c.enrollEnd : playing ? c.roundEnd : c.closed)}</strong>
          <small>Horário de Brasília</small>
          {playing && <small>Campanha até {date(c.end)}</small>}
        </div>
      </section>
      <div className="stories-people">
        <span>{c.members.filter((m: any) => !m.left).length}/6 participantes</span>
        <div>
          {c.members
            .filter((m: any) => !m.left)
            .map((m: any) => (
              <div className="stories-person" key={m.id} title={m.role}>
                <b aria-hidden="true">
                  {m.avatar ? (
                    <img
                      src={
                        "/api/historias/avatar?campanha=" +
                        encodeURIComponent(c.id) +
                        "&usuario=" +
                        encodeURIComponent(m.id)
                      }
                      alt=""
                    />
                  ) : (
                    m.name.slice(0, 1).toUpperCase()
                  )}
                </b>
                <span>
                  {m.name}
                  <small>
                    {m.role}
                    {m.absent ? " · ausente" : ""}
                  </small>
                </span>
              </div>
            ))}
        </div>
        {!c.members.length && (
          <p>A primeira turma começa com quem chegar. São necessárias três pessoas.</p>
        )}
      </div>
      {enrollment && (
        <section className="stories-card stories-enroll">
          <div>
            <p className="stories-eyebrow">SEU PAPEL JÁ FAZ PARTE</p>
            <h2>
              {joined
                ? "Você está na turma."
                : waiting
                  ? "Você está na lista de espera."
                  : "Entre para esta história."}
            </h2>
            <p>
              {joined
                ? "A história começa no fim das inscrições, se houver ao menos três participantes. Você receberá um aviso no sino da Praça."
                : waiting
                  ? `Sua posição é ${c.waitingPosition}. Se surgir uma vaga antes do encerramento, sua inscrição será transferida automaticamente.`
                  : "Três dias para formar o grupo. Depois, até uma semana de jogo, com uma ação por rodada e conversa em horários livres."}
            </p>
            <details className="stories-rules">
              <summary>Como esta turma funciona</summary>
              <ul>
                <li>
                  De três a seis participantes. Se faltar gente, a tentativa termina sem penalidade.
                </li>
                <li>Rodadas de 24 horas. Ninguém precisa estar online ao mesmo tempo.</li>
                <li>
                  Uma ação principal por pessoa e rodada. Gastos exigem maioria dos participantes
                  ativos.
                </li>
                <li>
                  Duas rodadas sem agir marcam ausência. Você pode retornar; ninguém controla seu
                  personagem.
                </li>
                <li>
                  As ações e a conversa ficam visíveis aos participantes. A IA recebe o papel, a
                  intenção e os acontecimentos compartilhados da campanha.
                </li>
                <li>Habilidades e marcos aparecem no perfil. Relatos opcionais ficam privados.</li>
                <li>
                  Até 30 intervenções de IA por pessoa/dia, compartilhadas com o RPG solo. Até 24
                  respostas de conversa do mestre por rodada do grupo. Ações sugeridas funcionam sem
                  IA.
                </li>
                <li>
                  Há atualização automática por prazo, com verificação periódica. Novas inscrições
                  abrem após o encerramento.
                </li>
              </ul>
            </details>
          </div>
          <div>
            {!userId ? (
              <a href="/entrar" className="stories-primary">
                Entrar na Praça →
              </a>
            ) : joined || waiting ? (
              <>
                <p className="stories-enrolled">✓ Inscrição confirmada</p>
                <button
                  disabled={busy}
                  className="stories-secondary"
                  onClick={() => send({ op: "leave" })}
                >
                  Retirar minha inscrição
                </button>
              </>
            ) : (
              <>
                <label htmlFor="story-talent">Seu talento nesta campanha</label>
                <select
                  id="story-talent"
                  value={talent}
                  disabled={busy}
                  onChange={(e) => setTalent(e.target.value as StorySkill)}
                >
                  {STORY_KEYS.map((k) => (
                    <option key={k} value={k}>
                      {STORY_SKILLS[k]}
                    </option>
                  ))}
                </select>
                <label className="stories-check">
                  <input
                    type="checkbox"
                    checked={accept}
                    disabled={busy}
                    onChange={(e) => setAccept(e.target.checked)}
                  />
                  Li as regras e quero participar. Se a turma estiver cheia, aceito entrar
                  automaticamente por uma vaga liberada durante as inscrições.
                </label>
                <button
                  className="stories-primary"
                  disabled={busy || !accept}
                  onClick={() => send({ op: "join", talent, accept: true })}
                >
                  {busy
                    ? "Inscrevendo…"
                    : c.members.length >= 6
                      ? "Entrar na espera"
                      : "Quero participar →"}
                </button>
              </>
            )}
          </div>
        </section>
      )}
      {ended && (
        <section className="stories-card">
          <h2>
            {c.phase === "unformed"
              ? "Vamos tentar formar outra turma."
              : "O que ficou desta história"}
          </h2>
          <p>{c.ending}</p>
          <p className="stories-small">
            A próxima inscrição abre após uma hora de intervalo. Seu histórico de participação
            permanece no perfil.
          </p>
        </section>
      )}
      {playing && !joined && (
        <section className="stories-card">
          <h2>Esta turma já começou.</h2>
          <p>
            {waiting
              ? "Não surgiu uma vaga antes do início. Sua inscrição na espera terminou com esta turma."
              : "As inscrições ficam fechadas até o fim da campanha."}{" "}
            Volte após o encerramento para participar da próxima.
          </p>
          <a href="/jogar" className="stories-secondary">
            Voltar aos jogos
          </a>
        </section>
      )}
      {(playing || ended) && joined && (
        <>
          <nav className="stories-tabs" aria-label="Campanha">
            {[
              ["historia", "A história"],
              ["conversa", "Conversa"],
              ["acordos", "Decisões"],
              ["ficha", "Meu papel"],
              ["atividades", "Preparações"],
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
          <div className="stories-layout">
            <section className="stories-main">
              {tab === "historia" && (
                <>
                  {c.events.map((e: any) => (
                    <article key={e.id} className={`stories-event ${e.kind}`}>
                      <p className="stories-eyebrow">
                        {e.kind === "action"
                          ? "AÇÃO REGISTRADA"
                          : e.kind === "master"
                            ? "MESTRE DA PRAÇA"
                            : e.kind === "round"
                              ? "NOVA RODADA"
                              : e.kind === "ending"
                                ? "DESFECHO"
                                : "ACONTECIMENTO"}{" "}
                        · {date(e.at)}
                      </p>
                      <p>{e.text}</p>
                    </article>
                  ))}
                  {ready && playing && (
                    <p className="stories-notice">
                      O objetivo foi alcançado. O capítulo termina no fechamento desta rodada; quem
                      ainda não agiu pode revisar os preparativos.
                    </p>
                  )}
                  {playing && me?.absent ? (
                    <section className="stories-card">
                      <h2>Você ficou ausente.</h2>
                      <p>
                        A história avançou sem criar ações em seu nome. Você pode voltar a
                        participar agora.
                      </p>
                      <button
                        disabled={busy}
                        className="stories-primary"
                        onClick={() => send({ op: "return" })}
                      >
                        Voltar para a campanha
                      </button>
                    </section>
                  ) : playing && action ? (
                    <section className="stories-card">
                      <p className="stories-eyebrow">CONFIRME ANTES DOS DADOS</p>
                      <h2>{action.label}</h2>
                      <p>{pending.intent}</p>
                      <p>{pending.text}</p>
                      <dl className="stories-test">
                        <dt>Efeito</dt>
                        <dd>{action.effect}</dd>
                        <dt>Risco</dt>
                        <dd>{action.risk}</dd>
                      </dl>
                      <p className="stories-formula">
                        2d6 + {storyBonus(me as Member, action, focus)} ·{" "}
                        {STORY_SKILLS[action.skill]}
                      </p>
                      <p className="stories-small">
                        10+: sucesso · 7–9: sucesso com custo · até 6: complicação. O avanço varia
                        com o resultado.
                      </p>
                      {me.focus && me.talent === action.skill && (
                        <label className="stories-check">
                          <input
                            type="checkbox"
                            checked={focus}
                            disabled={busy}
                            onChange={(e) => setFocus(e.target.checked)}
                          />
                          Invocar meu papel (+1, uma vez nesta campanha)
                        </label>
                      )}
                      <div className="stories-buttons">
                        <button
                          disabled={busy}
                          className="stories-primary"
                          onClick={() => send({ op: "roll", id: pending.id, focus })}
                        >
                          {busy ? "Registrando…" : "⚄ Confirmar e rolar"}
                        </button>
                        <button
                          disabled={busy}
                          className="stories-secondary"
                          onClick={() => send({ op: "cancel" })}
                        >
                          Mudar de ideia
                        </button>
                      </div>
                    </section>
                  ) : playing && acted ? (
                    <section className="stories-card">
                      <h2>Sua ação desta rodada está registrada.</h2>
                      <p>
                        Você ainda pode conversar e votar nas decisões. A próxima rodada começa em{" "}
                        {date(c.roundEnd)}.
                      </p>
                      <button className="stories-secondary" onClick={() => setTab("conversa")}>
                        Abrir conversa
                      </button>
                    </section>
                  ) : playing ? (
                    <section className="stories-card">
                      <h2>Qual será sua ação?</h2>
                      <p>
                        Escreva uma ideia ao mestre ou escolha uma ação. Os dados só são lançados
                        depois da sua confirmação.
                      </p>
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          send({ op: "master", intent });
                        }}
                      >
                        <label htmlFor="story-intent" className="sr-only">
                          Sua intenção
                        </label>
                        <textarea
                          id="story-intent"
                          required
                          minLength={4}
                          maxLength={900}
                          disabled={busy}
                          value={intent}
                          onChange={(e) => setIntent(e.target.value)}
                          placeholder="Quero examinar de onde vem a água antes de decidir o que fazer…"
                        />
                        <button
                          disabled={busy || intent.trim().length < 4}
                          className="stories-primary"
                        >
                          {busy ? "O mestre está respondendo…" : "Conversar com o mestre →"}
                        </button>
                        <p className="stories-small">
                          {remaining === null
                            ? "Até 30 intervenções de IA por dia."
                            : `${remaining} intervenções restantes hoje.`}{" "}
                          Conversar com os participantes não usa IA.
                        </p>
                      </form>
                      <div className="stories-options">
                        {options.map((a) => (
                          <button
                            disabled={busy}
                            key={a.id}
                            onClick={() => send({ op: "prepare", action: a.id })}
                          >
                            <span>{a.label}</span>
                            <small>{STORY_SKILLS[a.skill]} →</small>
                          </button>
                        ))}
                      </div>
                    </section>
                  ) : null}
                </>
              )}
              {tab === "conversa" && (
                <section className="stories-card">
                  <h2>A conversa do grupo</h2>
                  <p>Planejem juntos. Mensagens não gastam sua ação principal.</p>
                  <div className="stories-chat">
                    {data.messages.length ? (
                      data.messages.map((m: any) => (
                        <article key={m.id}>
                          <strong>{m.name}</strong>
                          <small>{date(m.at)}</small>
                          <p>{m.body}</p>
                        </article>
                      ))
                    ) : (
                      <p className="stories-small">A conversa começa com a primeira mensagem.</p>
                    )}
                  </div>
                  {playing && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (!draftId.current) draftId.current = crypto.randomUUID();
                        send({ op: "message", body: message, clientId: draftId.current });
                      }}
                    >
                      <label htmlFor="story-message">Sua mensagem</label>
                      <textarea
                        id="story-message"
                        required
                        maxLength={1500}
                        disabled={busy}
                        value={message}
                        onChange={(e) => {
                          setMessage(e.target.value);
                          draftId.current = null;
                        }}
                      />
                      <button disabled={busy || !message.trim()} className="stories-primary">
                        Enviar mensagem
                      </button>
                    </form>
                  )}
                </section>
              )}
              {tab === "acordos" && (
                <section className="stories-card">
                  <h2>Decisões do grupo</h2>
                  <p>
                    São necessárias{" "}
                    {Math.floor(c.members.filter((m: any) => !m.left && !m.absent).length / 2) + 1}{" "}
                    aprovações. A ausência não conta como apoio. Fichas e materiais pertencem apenas
                    ao jogo.
                  </p>
                  {c.proposals.map((p: any) => {
                    const plan = STORY_PLANS.find((x) => x.key === p.key)!;
                    return (
                      <article className="stories-plan" key={p.id}>
                        <h3>{plan.label}</h3>
                        <p>{plan.description}</p>
                        <p>
                          {p.status === "approved"
                            ? "Aprovada"
                            : p.status === "expired"
                              ? "Encerrada sem novo gasto"
                              : `${p.yes.length} a favor · ${p.no.length} contra`}
                        </p>
                        {p.status === "open" && playing && !ready && !me.absent && (
                          <div className="stories-buttons">
                            <button
                              disabled={busy}
                              aria-pressed={p.yes.includes(userId)}
                              className="stories-secondary"
                              onClick={() => send({ op: "vote", id: p.id, yes: true })}
                            >
                              Apoiar
                            </button>
                            <button
                              disabled={busy}
                              aria-pressed={p.no.includes(userId)}
                              className="stories-secondary"
                              onClick={() => send({ op: "vote", id: p.id, yes: false })}
                            >
                              Não apoiar
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                  {playing && !me.absent && !ready && (
                    <>
                      <h3 className="stories-subtitle">Apresentar uma proposta</h3>
                      {STORY_PLANS.filter(
                        (p) =>
                          !c.setups.includes(p.key) &&
                          !c.proposals.some((x: any) => x.key === p.key && x.status === "open"),
                      ).map((p) => (
                        <article className="stories-plan" key={p.key}>
                          <h3>{p.label}</h3>
                          <p>{p.description}</p>
                          <button
                            className="stories-secondary"
                            disabled={
                              busy ||
                              c.funds < p.cost ||
                              c.materials < p.materials ||
                              (p.key === "repair" && !c.diagnosed) ||
                              c.proposals.some(
                                (x: any) => x.author === userId && x.round === c.round,
                              )
                            }
                            onClick={() => send({ op: "plan", key: p.key })}
                          >
                            Propor ao grupo
                          </button>
                        </article>
                      ))}
                      <p className="stories-small">
                        Uma proposta por pessoa e rodada. Propostas sem maioria expiram no
                        fechamento. O reparo exige diagnóstico; propostas aprovadas são executadas
                        uma única vez.
                      </p>
                    </>
                  )}
                </section>
              )}
              {tab === "ficha" && (
                <section className="stories-card">
                  <p className="stories-eyebrow">SEU PERSONAGEM NESTA CAMPANHA</p>
                  <h2>{me.role}</h2>
                  <p>
                    Talento: {STORY_SKILLS[me.talent as StorySkill]} (+2).{" "}
                    {me.focus ? "Uma invocação de +1 disponível." : "Invocação já usada."}
                  </p>
                  <div className="stories-skill-list">
                    {STORY_KEYS.map((k) => (
                      <div key={k}>
                        <strong>
                          {STORY_SKILLS[k]} +
                          {(me.talent === k ? 2 : 0) +
                            Math.min(1, Math.floor((me.practice[k] || 0) / 2))}
                        </strong>
                        <span>{me.practice[k] || 0} experiências</span>
                      </div>
                    ))}
                  </div>
                  <p>
                    Duas experiências na mesma habilidade acrescentam +1 de prática nesta campanha.
                    Seu papel e talento ficam registrados na inscrição.
                  </p>
                  <p className="stories-small">
                    O primeiro teste coletivo concede 5 XP e o primeiro encerramento com
                    participação concede 20 XP. Esses marcos contam uma vez no perfil, mesmo em
                    campanhas futuras.
                  </p>
                  {playing && (
                    <div className="stories-leave">
                      {leave ? (
                        <>
                          <p>
                            Você sairá desta campanha e não poderá retornar à mesma turma. Os
                            registros já compartilhados permanecem.
                          </p>
                          <div className="stories-buttons">
                            <button
                              className="stories-secondary"
                              disabled={busy}
                              onClick={() => send({ op: "leave" })}
                            >
                              Confirmar saída
                            </button>
                            <button className="stories-secondary" onClick={() => setLeave(false)}>
                              Cancelar
                            </button>
                          </div>
                        </>
                      ) : (
                        <button className="stories-secondary" onClick={() => setLeave(true)}>
                          Sair da campanha
                        </button>
                      )}
                    </div>
                  )}
                </section>
              )}
              {tab === "atividades" && (
                <section className="stories-card">
                  <h2>Preparar-se de outro jeito.</h2>
                  <p>
                    Uma experiência pode render +1 no próximo teste de uma habilidade. Até duas
                    preparações por campanha, em habilidades diferentes, por autodeclaração. São
                    opcionais.
                  </p>
                  <label htmlFor="story-preparation">Habilidade</label>
                  <select
                    id="story-preparation"
                    value={activitySkill}
                    onChange={(e) => setActivitySkill(e.target.value as StorySkill)}
                  >
                    {STORY_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {STORY_SKILLS[k]}
                        {me.activities.includes(k) ? " · registrada" : ""}
                      </option>
                    ))}
                  </select>
                  <fieldset>
                    <legend>Onde realizar?</legend>
                    <label>
                      <input
                        name="activity-mode"
                        type="radio"
                        checked={activityMode === "fiction"}
                        onChange={() => setActivityMode("fiction")}
                      />
                      Na ficção
                    </label>
                    <label>
                      <input
                        name="activity-mode"
                        type="radio"
                        checked={activityMode === "real"}
                        onChange={() => setActivityMode("real")}
                      />
                      No cotidiano
                    </label>
                  </fieldset>
                  <blockquote>
                    {activityMode === "fiction"
                      ? (
                          {
                            investigar:
                              "Compare duas possibilidades para a falta de água. O que seria preciso observar para distingui-las?",
                            inventar:
                              "Descreva uma adaptação para manter a feira funcionando e uma limitação dela.",
                            articular:
                              "Proponha uma divisão de tarefas que não dependa de todos estarem disponíveis ao mesmo tempo.",
                            cuidar:
                              "Descreva uma medida para garantir acesso, descanso ou higiene durante a feira.",
                            explorar:
                              "Planeje um percurso para localizar uma alternativa de abastecimento e explique o que observaria.",
                          } as any
                        )[activitySkill]
                      : "Relate uma observação, aprendizado ou pequena ação do seu cotidiano relacionada à habilidade escolhida. Não exige sair de casa, gastar dinheiro, enviar foto ou publicar."}
                  </blockquote>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      send({ op: "activity", skill: activitySkill, mode: activityMode, note });
                    }}
                  >
                    <label htmlFor="story-note">Registro privado (80–1.600 caracteres)</label>
                    <textarea
                      id="story-note"
                      required
                      minLength={80}
                      maxLength={1600}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={busy || !playing}
                    />
                    <button
                      className="stories-primary"
                      disabled={
                        busy ||
                        !playing ||
                        me.absent ||
                        !!me.boon ||
                        me.activities.length >= 2 ||
                        me.activities.includes(activitySkill) ||
                        note.trim().length < 80
                      }
                    >
                      Registrar preparação
                    </button>
                  </form>
                  <p className="stories-small">
                    As duas modalidades têm a mesma recompensa. Publicar na Praça não concede pontos
                    extras. Seu relato não vai para o mestre nem para o grupo.
                  </p>
                  {(me.reflections || []).map((r: any, i: number) => (
                    <article className="stories-plan" key={i}>
                      <h3>{STORY_SKILLS[r.skill as StorySkill]}</h3>
                      <p>{r.note}</p>
                    </article>
                  ))}
                </section>
              )}
            </section>
            <aside className="stories-aside">
              <p className="stories-eyebrow">COMO ESTÁ A FEIRA</p>
              <dl>
                {[
                  ["Material", `${c.materials} un.`],
                  ["Orçamento fictício", `${c.funds} fichas`],
                  ["Diagnóstico", c.diagnosed ? "Conexão quebrada" : "Ainda desconhecido"],
                  [
                    "Reparo",
                    `${Math.max(0, c.repair)}/4${c.repair < 0 ? " + " + -c.repair + " ajustes" : ""}`,
                  ],
                  ["Água em recipientes", `${c.water}/4`],
                  ["Organização", `${c.layout}/4`],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {c.setups.includes("move") && (
                <p className="stories-notice">Feira transferida para o pátio com água.</p>
              )}
              <p className="stories-small">
                Para concluir: organização 4/4 e uma solução de água — reparo, recipientes ou
                mudança de local.
              </p>
              {me.boon && (
                <div className="stories-notice">
                  <p>Preparação: +1 em {STORY_SKILLS[me.boon as StorySkill]}</p>
                  {playing && (
                    <button disabled={busy} onClick={() => send({ op: "discard" })}>
                      Dispensar preparação
                    </button>
                  )}
                </div>
              )}
              <p className="stories-small">{me.acted.length} ações registradas nesta campanha.</p>
              <a href="/perfil#jogos">Meu perfil →</a>
            </aside>
          </div>
        </>
      )}
    </>
  );
}
