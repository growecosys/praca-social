import { and, or, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { activityEvents, pokes, posts, users } from "../../../../../db/schema";
import { requirePracaUser } from "../../../../../lib/praca-auth";
import { notify } from "../../../../../lib/notifications";
import { connectedPeople } from "../../../../../lib/connections";

const KINDS = ["opinion", "thread", "reminder", "publish", "missing", "mystery"] as const;
type Kind = (typeof KINDS)[number];
const COPY: Record<Kind, { title: string; body: string }> = {
  opinion: {
    title: "quer seu parecer",
    body: "Você foi chamado para dar seu pitaco numa conversa da Praça.",
  },
  thread: { title: "chamou você para a roda", body: "Uma publicação lembrou essa pessoa de você." },
  reminder: {
    title: "lembrou de você",
    body: "Esta publicação foi enviada como um gesto pessoal.",
  },
  publish: {
    title: "passou a palavra para você",
    body: "A cadeira está vazia e esperam uma publicação sua.",
  },
  missing: { title: "notou sua ausência", body: "Consta em ata que você anda sumido da Praça." },
  mystery: { title: "cutucou você", body: "A Praça exige sua presença sem explicar o motivo." },
};

export async function GET(_: Request, { params }: { params: Promise<{ username: string }> }) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const username = (await params).username;
  const person = (await getDb().select().from(users).where(eq(users.username, username)))[0];
  if (!person) return Response.json({ error: "Perfil não encontrado." }, { status: 404 });
  const linked = (await connectedPeople(auth.user!.id)).some((p) => p.id === person.id);
  const pending = await getDb()
    .select()
    .from(pokes)
    .where(
      and(
        eq(pokes.kind, "mystery"),
        or(
          and(eq(pokes.senderId, auth.user!.id), eq(pokes.recipientId, person.id)),
          and(eq(pokes.senderId, person.id), eq(pokes.recipientId, auth.user!.id)),
        ),
      ),
    );
  const incoming = pending.find(
    (p) => p.recipientId === auth.user!.id && ["pending", "seen"].includes(p.status),
  );
  return Response.json({
    state: linked ? "connected" : incoming ? "incoming" : pending.length ? "sent" : "new",
    id: incoming?.id,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const auth = await requirePracaUser();
  if (auth.error) return auth.error;
  const sender = auth.user!;
  const username = decodeURIComponent((await params).username).toLowerCase();
  const payload = (await request.json().catch(() => ({}))) as { kind?: string; postSlug?: string };
  const kind: Kind = KINDS.includes(payload.kind as Kind) ? (payload.kind as Kind) : "mystery";
  const db = getDb();
  const recipient = (await db.select().from(users).where(eq(users.username, username)).limit(1))[0];
  if (!recipient || !recipient.profileComplete)
    return Response.json({ error: "Esse perfil não está na Praça." }, { status: 404 });
  if (recipient.id === sender.id)
    return Response.json(
      { error: "Autocutucada não vale. Isso se chama lembrete." },
      { status: 400 },
    );
  if (kind === "mystery") {
    if ((await connectedPeople(sender.id)).some((p) => p.id === recipient.id))
      return Response.json({ message: "Vocês já estão conectados." });
    const existing = await db
      .select()
      .from(pokes)
      .where(
        and(
          eq(pokes.kind, "mystery"),
          or(
            and(eq(pokes.senderId, sender.id), eq(pokes.recipientId, recipient.id)),
            and(eq(pokes.senderId, recipient.id), eq(pokes.recipientId, sender.id)),
          ),
        ),
      );
    const incoming = existing.find(
      (p) => p.recipientId === sender.id && ["pending", "seen"].includes(p.status),
    );
    if (incoming)
      return Response.json(
        { error: "Retribua a cutucada em Conexões para estabelecer a conexão." },
        { status: 409 },
      );
    if (existing.some((p) => ["pending", "seen"].includes(p.status)))
      return Response.json({ message: "Cutucada enviada. Aguardando resposta." });
    if (existing.length) return Response.json({ message: "Essa aproximação já foi registrada." });
  }
  let targetPostId: number | null = null;
  let targetSlug: string | null = null;
  if (
    (kind === "opinion" || kind === "thread" || kind === "reminder" || kind === "mystery") &&
    payload.postSlug
  ) {
    const post = (
      await db
        .select({ id: posts.id, slug: posts.slug })
        .from(posts)
        .where(eq(posts.slug, payload.postSlug))
        .limit(1)
    )[0];
    if (!post)
      return Response.json({ error: "Essa conversa já não está no Mural." }, { status: 404 });
    targetPostId = post.id;
    targetSlug = post.slug;
  }
  const created = await db
    .insert(pokes)
    .values({
      senderId: sender.id,
      recipientId: recipient.id,
      kind,
      targetPostId,
      status: "pending",
      expiresAt: sql`datetime('now', '+7 days')`,
    })
    .returning({ id: pokes.id });
  await Promise.all([
    db
      .insert(activityEvents)
      .values({
        userId: sender.id,
        action: "poke_sent",
        entityType: "user",
        entityId: recipient.id,
        metadataJson: JSON.stringify({ username: recipient.username, kind, targetSlug }),
      }),
    db
      .insert(activityEvents)
      .values({
        userId: recipient.id,
        action: "poke_received",
        entityType: "user",
        entityId: sender.id,
        metadataJson: JSON.stringify({ username: sender.username, kind, targetSlug }),
      }),
  ]);
  const copy = COPY[kind];
  await notify({
    recipientId: recipient.id,
    actorId: sender.id,
    type: "connection",
    title: `${kind === "mystery" ? "👉" : "↗"} ${sender.displayName} ${copy.title}`,
    body: copy.body,
    href: `/conexoes#connection-${created[0]?.id}`,
    dedupeKey: `connection:${created[0]?.id}`,
  });
  return Response.json(
    { message: `Conexão enviada para ${recipient.displayName}.`, pokeId: created[0]?.id },
    { status: 201 },
  );
}
