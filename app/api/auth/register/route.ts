import { clientIp } from "../../../../lib/client-ip";
import { env } from "../../../../lib/env";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { referrals, shareLinks } from "../../../../db/schema";
import { visitorFromRequest } from "../../../../lib/visitor";
import { createSession, hashSecret, normalizeRecoveryAnswer } from "../../../../lib/praca-auth";
import { createPasswordAccount } from "../../../../lib/password-access";
import {
  emailReady,
  randomEmailToken,
  requestEmailAccess,
  takeEmailLimit,
} from "../../../../lib/email-access";
export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin)
    return Response.json({ error: "Origem inválida." }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 4096) return Response.json({ error: "Dados inválidos." }, { status: 400 });
  let p: any;
  try {
    p = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Dados inválidos." }, { status: 400 });
  }
  const ip = clientIp(request);
  if (!(await takeEmailLimit(env.DB, "register-ip:" + ip, 10)))
    return Response.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  let account;
  try {
    account = await createPasswordAccount(env.DB, p, hashSecret, normalizeRecoveryAnswer);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Não foi possível criar a conta." },
      { status: 400 },
    );
  }
  await createSession(account.id);
  const refCode =
    (request.headers.get("cookie") || "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("praca_ref="))
      ?.slice("praca_ref=".length) || "";
  if (refCode) {
    try {
      const db = getDb(),
        share = (
          await db.select().from(shareLinks).where(eq(shareLinks.code, refCode)).limit(1)
        )[0];
      if (share?.userId)
        await db
          .insert(referrals)
          .values({
            inviterId: share.userId,
            invitedUserId: account.id,
            shareLinkId: share.id,
            visitorId: visitorFromRequest(request).id,
          })
          .onConflictDoNothing();
    } catch {
      /* Registration succeeds even if referral metadata cannot be recorded. */
    }
  }
  let emailSent = false;
  if (emailReady(env)) {
    try {
      const nonce = randomEmailToken(),
        result = await requestEmailAccess(
          env.DB,
          env,
          account.email,
          "link",
          account.id,
          nonce,
          ip,
        );
      emailSent = result.sent;
      if (emailSent)
        (await cookies()).set("praca_email_request", nonce, {
          httpOnly: true,
          secure: true,
          sameSite: "lax",
          path: "/",
          maxAge: 15 * 60,
        });
    } catch {
      /* Pending email is preserved; the user may resend after entering. */
    }
  }
  return Response.json(
    { ok: true, next: "/confirmar-email", emailSent },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}
