export class CircleError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function money(value: unknown) {
  const s = String(value ?? "")
    .trim()
    .replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,2})?$/.test(s))
    throw new CircleError("Informe um valor em reais com até duas casas decimais.");
  const [a, b = ""] = s.split(".");
  return Number(a) * 100 + Number(b.padEnd(2, "0"));
}
const text = (v: unknown, max = 4000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
function required(v: unknown, label: string, max = 4000) {
  const s = text(v, max);
  if (!s) throw new CircleError("Preencha " + label + ".");
  return s;
}
function date(v: unknown) {
  const s = String(v || "");
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(s) ||
    Number.isNaN(Date.parse(s + "T12:00:00Z")) ||
    new Date(s + "T12:00:00Z").toISOString().slice(0, 10) !== s
  )
    throw new CircleError("Data inválida.");
  return s;
}
export async function circleAccess(db: any, id: number, uid: string) {
  if (!Number.isSafeInteger(id) || id < 1) throw new CircleError("Círculo inválido.");
  const c = await db
    .prepare(
      `SELECT c.* FROM circles c JOIN circle_members m ON m.circle_id=c.id JOIN users u ON u.id=m.user_id WHERE c.id=? AND c.deleted_at IS NULL AND m.user_id=? AND m.status='active' AND u.deleted_at IS NULL`,
    )
    .bind(id, uid)
    .first();
  if (!c) throw new CircleError("Somente membros ativos podem acessar os registros.", 403);
  return c;
}
export async function readCircleWork(db: any, id: number, uid: string) {
  const circle = await circleAccess(db, id, uid);
  const rows = await Promise.all(
    ["circle_cycles", "circle_agreements", "circle_funds", "circle_payments"].map((table) =>
      db
        .prepare(`SELECT * FROM ${table} WHERE circle_id=? ORDER BY created_at DESC,id DESC`)
        .bind(id)
        .all(),
    ),
  );
  return {
    circle: { id: circle.id, ownerId: circle.owner_id, status: circle.status },
    cycles: rows[0].results,
    agreements: rows[1].results,
    funds: rows[2].results,
    payments: rows[3].results,
  };
}
export async function mutateCircleWork(db: any, id: number, uid: string, p: any) {
  const circle = await circleAccess(db, id, uid),
    owner = circle.owner_id === uid;
  if (circle.status === "archived")
    throw new CircleError("Restaure o círculo para alterar seus registros.", 409);
  const ownerOnly = () => {
    if (!owner) throw new CircleError("Somente o responsável do círculo pode fazer isso.", 403);
  };
  const first = (sql: string, ...args: any[]) =>
    db
      .prepare(sql)
      .bind(...args)
      .first();
  const run = (sql: string, ...args: any[]) =>
    db
      .prepare(sql)
      .bind(...args)
      .run();
  const cycle = async (idCycle: number) => {
    const c = await first("SELECT * FROM circle_cycles WHERE id=? AND circle_id=?", idCycle, id);
    if (!c) throw new CircleError("Ciclo não encontrado.", 404);
    if (c.status !== "open") throw new CircleError("Este ciclo está encerrado.", 409);
    return c;
  };
  const person = async (personId: string) => {
    if (
      !(await first(
        "SELECT u.id FROM users u JOIN circle_members m ON m.user_id=u.id WHERE m.circle_id=? AND m.status='active' AND u.deleted_at IS NULL AND u.id=?",
        id,
        personId,
      ))
    )
      throw new CircleError("Escolha um membro ativo.");
  };
  let entity: any = null,
    previous: any = null;
  if (p.action === "cycle") {
    ownerOnly();
    const name = required(p.name, "o nome", 120),
      goal = required(p.goal, "o objetivo"),
      start = date(p.start),
      end = date(p.end);
    if (end < start) throw new CircleError("O fim deve vir após o início.");
    entity = await first(
      "INSERT INTO circle_cycles(circle_id,name,goal,start,end) VALUES (?,?,?,?,?) RETURNING id",
      id,
      name,
      goal,
      start,
      end,
    );
  } else if (p.action === "cycle_status") {
    ownerOnly();
    if (!["open", "closed"].includes(p.status)) throw new CircleError("Estado inválido.");
    if (
      p.status === "closed" &&
      (await first(
        `SELECT a.id FROM circle_agreements a WHERE a.circle_id=? AND a.cycle_id=? AND (a.status IN ('approved','delivered') OR (a.status='accepted' AND a.amount>COALESCE((SELECT sum(amount) FROM circle_payments WHERE agreement_id=a.id AND voided_at IS NULL),0))) LIMIT 1`,
        id,
        p.cycleId,
      ))
    )
      throw new CircleError(
        "Conclua os acordos e registre os pagamentos pendentes antes de encerrar o ciclo.",
      );
    await run(
      "UPDATE circle_cycles SET status=? WHERE id=? AND circle_id=?",
      p.status,
      p.cycleId,
      id,
    );
  } else if (p.action === "proposal" || p.action === "edit_proposal") {
    await cycle(Number(p.cycleId));
    const assignee = required(p.assigneeId, "o responsável", 100),
      reviewer = required(p.reviewerId, "quem dará o aceite", 100);
    await person(assignee);
    await person(reviewer);
    const values = [
      required(p.title, "o título", 160),
      text(p.role, 160),
      required(p.scope, "o escopo"),
      required(p.criteria, "os critérios de aceite"),
      required(p.terms, "as condições de pagamento"),
      money(p.amount),
      date(p.due),
      assignee,
      reviewer,
    ];
    if (p.action === "proposal")
      entity = await first(
        "INSERT INTO circle_agreements(title,role,scope,criteria,terms,amount,due,assignee_id,reviewer_id,circle_id,cycle_id,creator_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id",
        ...values,
        id,
        Number(p.cycleId),
        uid,
      );
    else {
      const row = await first(
        "UPDATE circle_agreements SET title=?,role=?,scope=?,criteria=?,terms=?,amount=?,due=?,assignee_id=?,reviewer_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND circle_id=? AND cycle_id=? AND status='proposed' AND (creator_id=? OR ?=1) RETURNING id",
        ...values,
        p.id,
        id,
        Number(p.cycleId),
        uid,
        owner ? 1 : 0,
      );
      if (!row)
        throw new CircleError("Só propostas podem ser editadas pelo autor ou responsável.", 409);
      entity = row;
    }
  } else if (
    ["approve", "agree", "deliver", "accept", "return_delivery", "cancel"].includes(p.action)
  ) {
    const a = await first("SELECT * FROM circle_agreements WHERE id=? AND circle_id=?", p.id, id);
    if (!a) throw new CircleError("Acordo não encontrado.", 404);
    await cycle(a.cycle_id);
    if (p.action === "approve") {
      ownerOnly();
      await person(a.assignee_id);
      await person(a.reviewer_id);
      if (a.status !== "proposed") throw new CircleError("A proposta já foi encaminhada.", 409);
      await run(
        "UPDATE circle_agreements SET status='approved',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='proposed'",
        a.id,
      );
    }
    if (p.action === "agree") {
      if (uid !== a.assignee_id || a.status !== "approved")
        throw new CircleError("Somente a pessoa responsável confirma o trabalho aprovado.", 403);
      await run(
        "UPDATE circle_agreements SET agreed_at=COALESCE(agreed_at,CURRENT_TIMESTAMP),updated_at=CURRENT_TIMESTAMP WHERE id=?",
        a.id,
      );
    }
    if (p.action === "deliver") {
      if (uid !== a.assignee_id || a.status !== "approved" || !a.agreed_at)
        throw new CircleError("Confirme sua participação no acordo antes de entregar.", 403);
      await run(
        "UPDATE circle_agreements SET status='delivered',evidence=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='approved'",
        required(p.evidence, "a evidência da entrega"),
        a.id,
      );
    }
    if (p.action === "accept" || p.action === "return_delivery") {
      if (uid !== a.reviewer_id || a.status !== "delivered")
        throw new CircleError(
          "Somente a pessoa indicada para o aceite pode avaliar esta entrega.",
          403,
        );
      await run(
        "UPDATE circle_agreements SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='delivered'",
        p.action === "accept" ? "accepted" : "approved",
        a.id,
      );
    }
    if (p.action === "cancel") {
      if (!owner && !(a.status === "proposed" && a.creator_id === uid))
        throw new CircleError("Ação não permitida.", 403);
      if (["accepted", "cancelled"].includes(a.status))
        throw new CircleError("Um acordo aceito não pode ser cancelado.", 409);
      await run(
        "UPDATE circle_agreements SET status='cancelled',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status NOT IN ('accepted','cancelled')",
        a.id,
      );
    }
    entity = { id: a.id };
  } else if (p.action === "reassign") {
    ownerOnly();
    const a = await first("SELECT * FROM circle_agreements WHERE id=? AND circle_id=?", p.id, id);
    if (!a) throw new CircleError("Acordo não encontrado.", 404);
    await cycle(a.cycle_id);
    if (!["approved", "delivered"].includes(a.status))
      throw new CircleError("Reatribua somente acordos em execução.", 409);
    await person(p.assigneeId);
    await person(p.reviewerId);
    previous = a;
    const changed = p.assigneeId !== a.assignee_id;
    await run(
      "UPDATE circle_agreements SET assignee_id=?,reviewer_id=?,agreed_at=?,status=?,evidence=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status IN ('approved','delivered')",
      p.assigneeId,
      p.reviewerId,
      changed ? null : a.agreed_at,
      changed ? "approved" : a.status,
      changed ? "" : a.evidence,
      a.id,
    );
    entity = { id: a.id };
  } else if (p.action === "edit_fund") {
    ownerOnly();
    const f = await first("SELECT * FROM circle_funds WHERE id=? AND circle_id=?", p.id, id);
    if (!f) throw new CircleError("Recurso não encontrado.", 404);
    await cycle(f.cycle_id);
    const amount = money(p.amount);
    if (!amount) throw new CircleError("O recurso precisa ter valor positivo.");
    previous = f;
    entity = await first(
      "UPDATE circle_funds SET name=?,amount=?,note=? WHERE id=? AND circle_id=? AND ?>=COALESCE((SELECT sum(amount) FROM circle_payments WHERE fund_id=circle_funds.id AND voided_at IS NULL),0) RETURNING id",
      required(p.name, "a fonte", 160),
      amount,
      required(p.note, "a origem e as condições"),
      f.id,
      id,
      amount,
    );
    if (!entity)
      throw new CircleError("O recurso não pode ficar abaixo dos pagamentos já registrados.", 409);
  } else if (p.action === "fund") {
    ownerOnly();
    await cycle(Number(p.cycleId));
    const amount = money(p.amount);
    if (!amount) throw new CircleError("O recurso precisa ter valor positivo.");
    entity = await first(
      "INSERT INTO circle_funds(circle_id,cycle_id,name,amount,note,creator_id) VALUES (?,?,?,?,?,?) RETURNING id",
      id,
      p.cycleId,
      required(p.name, "a fonte", 160),
      amount,
      required(p.note, "a origem e as condições"),
      uid,
    );
  } else if (p.action === "confirm_fund") {
    ownerOnly();
    const f = await first("SELECT * FROM circle_funds WHERE id=? AND circle_id=?", p.id, id);
    if (!f) throw new CircleError("Recurso não encontrado.", 404);
    await cycle(f.cycle_id);
    await run("UPDATE circle_funds SET confirmed=1 WHERE id=? AND circle_id=?", f.id, id);
    entity = { id: f.id };
  } else if (p.action === "payment") {
    ownerOnly();
    const amount = money(p.amount),
      key = String(p.clientId || ""),
      note = required(p.note, "a referência do pagamento"),
      paidDate = date(p.date);
    if (!amount || !/^[a-f0-9-]{36}$/i.test(key)) throw new CircleError("Pagamento inválido.");
    const old = await first("SELECT * FROM circle_payments WHERE id=?", key);
    if (old) {
      if (
        old.circle_id !== id ||
        old.agreement_id !== Number(p.agreementId) ||
        old.fund_id !== Number(p.fundId) ||
        old.amount !== amount ||
        old.note !== note ||
        old.date !== paidDate
      )
        throw new CircleError("Identificador já utilizado.", 409);
      return { ok: true, replayed: true };
    }
    // The two balances and membership are rechecked by one SQLite statement. Concurrent sends cannot overspend.
    entity = await first(
      `INSERT INTO circle_payments(id,circle_id,agreement_id,fund_id,amount,date,note,actor_id) SELECT ?,c.id,a.id,f.id,?,?,?,? FROM circles c JOIN circle_agreements a ON a.circle_id=c.id JOIN circle_funds f ON f.circle_id=c.id AND f.cycle_id=a.cycle_id JOIN circle_members m ON m.circle_id=c.id JOIN users u ON u.id=m.user_id JOIN circle_cycles cy ON cy.id=a.cycle_id WHERE c.id=? AND c.owner_id=? AND c.deleted_at IS NULL AND c.status!='archived' AND m.user_id=? AND m.status='active' AND u.deleted_at IS NULL AND cy.status='open' AND a.id=? AND a.status='accepted' AND f.id=? AND f.confirmed=1 AND ?>0 AND ?<=a.amount-COALESCE((SELECT sum(amount) FROM circle_payments WHERE agreement_id=a.id AND voided_at IS NULL),0) AND ?<=f.amount-COALESCE((SELECT sum(amount) FROM circle_payments WHERE fund_id=f.id AND voided_at IS NULL),0) ON CONFLICT(id) DO NOTHING RETURNING id`,
      key,
      amount,
      paidDate,
      note,
      uid,
      id,
      uid,
      uid,
      Number(p.agreementId),
      Number(p.fundId),
      amount,
      amount,
      amount,
    );
    if (!entity) {
      const duplicate = await first(
        "SELECT * FROM circle_payments WHERE id=? AND circle_id=?",
        key,
        id,
      );
      if (
        duplicate &&
        duplicate.amount === amount &&
        duplicate.agreement_id === Number(p.agreementId) &&
        duplicate.fund_id === Number(p.fundId) &&
        duplicate.note === note &&
        duplicate.date === paidDate
      )
        return { ok: true, replayed: true };
      throw new CircleError(
        "Verifique o aceite da entrega, a confirmação da fonte e os saldos do acordo e do recurso.",
        409,
      );
    }
  } else if (p.action === "void_payment") {
    ownerOnly();
    const reason = required(p.reason, "o motivo da correção");
    const row = await first(
      "UPDATE circle_payments SET voided_at=CURRENT_TIMESTAMP,void_reason=? WHERE id=? AND circle_id=? AND voided_at IS NULL RETURNING id",
      reason,
      p.id,
      id,
    );
    if (!row) throw new CircleError("Registro não encontrado ou já estornado.", 409);
    entity = row;
  } else throw new CircleError("Ação inválida.");
  await run(
    "INSERT INTO activity_events(user_id,action,entity_type,entity_id,metadata_json) VALUES (?,?,?,?,?)",
    uid,
    "circle_work_" + p.action,
    "circle",
    String(id),
    JSON.stringify({
      recordId: entity?.id || p.id || p.cycleId,
      action: p.action,
      previous,
      record: p,
    }),
  );
  return { ok: true };
}
