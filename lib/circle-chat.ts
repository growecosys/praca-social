export class ChatError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const CHAT_PAGE_SIZE = 50;
export async function chatAccess(db: any, circleId: number, userId: string) {
  if (!Number.isSafeInteger(circleId) || circleId < 1)
    throw new ChatError("Círculo inválido.", 400);
  const circle = await db
    .prepare(
      `SELECT c.id,c.name,c.status,c.chat_enabled FROM circles c JOIN circle_members m ON m.circle_id=c.id JOIN users u ON u.id=m.user_id WHERE c.id=? AND c.deleted_at IS NULL AND m.user_id=? AND m.status='active' AND u.deleted_at IS NULL`,
    )
    .bind(circleId, userId)
    .first();
  if (!circle)
    throw new ChatError("A conversa está disponível somente aos membros ativos do círculo.", 403);
  return circle;
}
function messageRow(row: any, userId: string) {
  return {
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      name: row.deleted_at ? "Conta excluída" : row.display_name,
      username: row.deleted_at ? null : row.username,
      avatar: row.deleted_at ? null : "/avatar/" + row.author_id,
    },
    mine: row.author_id === userId,
  };
}
const selection = `SELECT cm.id,cm.body,cm.created_at,cm.author_id,u.display_name,u.username,u.deleted_at FROM circle_messages cm JOIN users u ON u.id=cm.author_id`;
export async function readCircleChat(
  db: any,
  circleId: number,
  userId: string,
  query: { before?: number; after?: number } = {},
) {
  const circle = await chatAccess(db, circleId, userId);
  if (query.before !== undefined && query.after !== undefined)
    throw new ChatError("Escolha apenas um cursor.");
  for (const n of [query.before, query.after])
    if (n !== undefined && (!Number.isSafeInteger(n) || n < 0))
      throw new ChatError("Cursor inválido.");
  const after = query.after !== undefined;
  const cursor = after ? query.after : query.before;
  const clause = cursor !== undefined ? ` AND cm.id ${after ? ">" : "<"} ?` : "";
  const args: any[] = [circleId];
  if (cursor !== undefined) args.push(cursor);
  args.push(userId, CHAT_PAGE_SIZE + 1);
  const rows = await db
    .prepare(
      selection +
        ` WHERE cm.circle_id=?` +
        clause +
        ` AND EXISTS(SELECT 1 FROM circle_members m WHERE m.circle_id=cm.circle_id AND m.user_id=? AND m.status='active') ORDER BY cm.id ${after ? "ASC" : "DESC"} LIMIT ?`,
    )
    .bind(...args)
    .all();
  const page = rows.results.slice(0, CHAT_PAGE_SIZE);
  if (!after) page.reverse();
  return {
    messages: page.map((r: any) => messageRow(r, userId)),
    hasEarlier: !after && rows.results.length > CHAT_PAGE_SIZE,
    hasMore: after && rows.results.length > CHAT_PAGE_SIZE,
    chatEnabled: Boolean(circle.chat_enabled),
    readOnly: circle.status === "archived" || !circle.chat_enabled,
  };
}
export function validateChatMessage(payload: any) {
  const body = typeof payload?.body === "string" ? payload.body.replace(/\r\n?/g, "\n").trim() : "";
  const clientId = typeof payload?.clientId === "string" ? payload.clientId : "";
  if (!body || body.length > 2000)
    throw new ChatError("Escreva uma mensagem de até 2.000 caracteres.");
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(clientId))
    throw new ChatError("Identificador de envio inválido. Tente novamente.");
  return { body, clientId };
}
export async function sendCircleMessage(db: any, circleId: number, userId: string, payload: any) {
  const circle = await chatAccess(db, circleId, userId);
  const { body, clientId } = validateChatMessage(payload);
  const find = () =>
    db
      .prepare(selection + ` WHERE cm.circle_id=? AND cm.author_id=? AND cm.client_id=?`)
      .bind(circleId, userId, clientId)
      .first();
  const previous = await find();
  if (previous) {
    if (previous.body !== body)
      throw new ChatError("Este envio já foi usado para outra mensagem.", 409);
    return { message: messageRow(previous, userId), replayed: true };
  }
  if (!circle.chat_enabled) throw new ChatError("O responsável ainda não abriu a conversa.", 409);
  if (circle.status === "archived")
    throw new ChatError(
      "Este círculo está arquivado. O histórico permanece disponível para leitura.",
      409,
    );
  let inserted;
  try {
    inserted = await db
      .prepare(
        `INSERT INTO circle_messages(circle_id,author_id,client_id,body) SELECT c.id,?,?,? FROM circles c JOIN circle_members m ON m.circle_id=c.id JOIN users u ON u.id=m.user_id WHERE c.id=? AND m.user_id=? AND m.status='active' AND c.status!='archived' AND c.chat_enabled=1 AND c.deleted_at IS NULL AND u.deleted_at IS NULL AND (SELECT count(*) FROM circle_messages WHERE author_id=? AND created_at>=datetime('now','-1 minute'))<20 RETURNING id`,
      )
      .bind(userId, clientId, body, circleId, userId, userId)
      .first();
  } catch (e) {
    const duplicate = await find();
    if (duplicate) {
      if (duplicate.body !== body)
        throw new ChatError("Este envio já foi usado para outra mensagem.", 409);
      return { message: messageRow(duplicate, userId), replayed: true };
    }
    throw e;
  }
  if (!inserted) {
    const current = await chatAccess(db, circleId, userId);
    if (!current.chat_enabled) throw new ChatError("A conversa foi pausada pelo responsável.", 409);
    if (current.status === "archived")
      throw new ChatError("O círculo foi arquivado. Sua mensagem não foi enviada.", 409);
    throw new ChatError("Muitas mensagens seguidas. Aguarde um minuto e tente novamente.", 429);
  }
  const row = await find();
  // One notification per recipient/circle, updated instead of adding a notification per message.
  try {
    await db
      .prepare(
        `INSERT INTO notifications(recipient_id,actor_id,type,title,body,href,dedupe_key) SELECT m.user_id,?,'circle_chat',?,?,?,'circle-chat:'||m.circle_id||':'||m.user_id FROM circle_members m JOIN users u ON u.id=m.user_id WHERE m.circle_id=? AND m.status='active' AND m.user_id<>? AND u.deleted_at IS NULL ON CONFLICT(dedupe_key) DO UPDATE SET actor_id=excluded.actor_id,title=excluded.title,body=excluded.body,href=excluded.href,read_at=NULL,created_at=CURRENT_TIMESTAMP`,
      )
      .bind(
        userId,
        ("Conversa em " + circle.name).slice(0, 140),
        "Novas mensagens no círculo.",
        "/circulos/" + circleId + "?tab=chat#chat-message-" + row.id,
        circleId,
        userId,
      )
      .run();
  } catch {
    /* A failed notification must not cause an already committed message to be resent. */
  }
  return { message: messageRow(row, userId), replayed: false };
}
export async function markCircleChatRead(
  db: any,
  circleId: number,
  userId: string,
  lastSeen: number,
) {
  await chatAccess(db, circleId, userId);
  if (!Number.isSafeInteger(lastSeen) || lastSeen < 1) throw new ChatError("Mensagem inválida.");
  const message = await db
    .prepare("SELECT id FROM circle_messages WHERE circle_id=? AND id=?")
    .bind(circleId, lastSeen)
    .first();
  if (!message) throw new ChatError("Mensagem não encontrada.", 404);
  const prefix = "/circulos/" + circleId + "?tab=chat#chat-message-";
  await db
    .prepare(
      `UPDATE notifications SET read_at=CURRENT_TIMESTAMP WHERE recipient_id=? AND dedupe_key=? AND substr(href,1,length(?))=? AND CAST(substr(href,length(?)+1) AS INTEGER)<=?`,
    )
    .bind(userId, "circle-chat:" + circleId + ":" + userId, prefix, prefix, prefix, lastSeen)
    .run();
}
