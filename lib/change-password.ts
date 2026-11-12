export async function changePassword(
  db: any,
  userId: string,
  p: any,
  verify: (v: string, s: string, h: string) => Promise<boolean>,
  hash: (v: string) => Promise<{ hash: string; salt: string }>,
) {
  const current = typeof p?.currentPassword === "string" ? p.currentPassword : "",
    next = typeof p?.newPassword === "string" ? p.newPassword : "";
  if (
    !current ||
    current.length > 256 ||
    next.length < 8 ||
    next.length > 256 ||
    next !== p?.confirmPassword
  )
    throw Error("Confira a senha atual e repita a nova senha de 8 a 256 caracteres.");
  if (current === next) throw Error("Escolha uma senha diferente da atual.");
  const user = await db
    .prepare("SELECT secret_hash,secret_salt FROM users WHERE id=?")
    .bind(userId)
    .first();
  if (!user || !(await verify(current, user.secret_salt, user.secret_hash)))
    throw Error("A senha atual não confere.");
  const secured = await hash(next);
  const results = await db.batch([
    db
      .prepare(
        "UPDATE users SET secret_hash=?,secret_salt=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND secret_hash=?",
      )
      .bind(secured.hash, secured.salt, userId, user.secret_hash),
    db
      .prepare(
        "DELETE FROM sessions WHERE user_id=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND secret_hash=?)",
      )
      .bind(userId, userId, secured.hash),
    db
      .prepare(
        "DELETE FROM email_auth_tokens WHERE user_id=? AND EXISTS(SELECT 1 FROM users WHERE id=? AND secret_hash=?)",
      )
      .bind(userId, userId, secured.hash),
    db
      .prepare(
        "INSERT INTO activity_events(user_id,action,entity_type,entity_id) SELECT ?,'password_changed','user',? WHERE EXISTS(SELECT 1 FROM users WHERE id=? AND secret_hash=?)",
      )
      .bind(userId, userId, userId, secured.hash),
  ]);
  if (!results[0]?.meta?.changes)
    throw Error("Sua senha foi alterada em outra sessão. Entre novamente.");
}
