import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "../db";
import { sessions, users } from "../db/schema";

const COOKIE = "praca_session";
const encoder = new TextEncoder();

function bytesToHex(bytes: Uint8Array) { return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(""); }
function randomHex(size = 32) { const bytes = new Uint8Array(size); crypto.getRandomValues(bytes); return bytesToHex(bytes); }
async function sha256(value: string) { return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)))); }

export async function hashSecret(secret: string, salt = randomHex(16)) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: encoder.encode(salt), iterations: 100_000 }, key, 256);
  return { salt, hash: bytesToHex(new Uint8Array(bits)) };
}

export function normalizeRecoveryAnswer(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " "); }

export async function verifySecret(secret: string, salt: string, expected: string) {
  const actual = (await hashSecret(secret, salt)).hash;
  if (actual.length !== expected.length) return false;
  let diff = 0; for (let i = 0; i < actual.length; i += 1) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

export async function createSession(userId: string) {
  const account=(await getDb().select({deletedAt:users.deletedAt}).from(users).where(eq(users.id,userId)).limit(1))[0];
  if(!account||account.deletedAt)throw Error('Conta indisponível.');
  const token = randomHex(32); const tokenHash = await sha256(token); const id = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await getDb().insert(sessions).values({ id, userId, tokenHash, expiresAt: expires.toISOString() });
  (await cookies()).set(COOKIE, token, { httpOnly: true, secure: true, sameSite: "lax", path: "/", expires });
}

export async function clearSession() {
  const jar = await cookies(); const token = jar.get(COOKIE)?.value;
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, await sha256(token)));
  jar.set(COOKIE, "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getPracaUser() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const tokenHash = await sha256(token);
  const row = (await getDb().select({ user: users }).from(sessions).innerJoin(users, eq(sessions.userId, users.id)).where(and(isNull(users.deletedAt), eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date().toISOString()))).limit(1))[0];
  return row?.user || null;
}

export async function requirePracaUser({ profile = true } = {}) {
  const user = await getPracaUser();
  if (!user) return { user: null, error: Response.json({ error: "Entre na sua conta para continuar." }, { status: 401 }) };
  if (profile && !user.profileComplete) return { user: null, error: Response.json({ error: "Conclua seu perfil para entrar na Praça.", profileRequired: true }, { status: 403 }) };
  return { user, error: null };
}
