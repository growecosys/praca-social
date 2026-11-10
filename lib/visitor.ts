const COOKIE_NAME = "praca_visitor";
const visitorPattern = /^[a-f0-9-]{36}$/i;

export function visitorFromRequest(request: Request) {
  const cookie = request.headers.get("cookie") || "";
  const found = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const current = found?.slice(COOKIE_NAME.length + 1) || "";
  if (visitorPattern.test(current)) return { id: current, setCookie: null };
  const id = crypto.randomUUID();
  return { id, setCookie: `${COOKIE_NAME}=${id}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` };
}

export function jsonWithVisitor(data: unknown, visitor: { setCookie: string | null }, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  if (visitor.setCookie) headers.append("set-cookie", visitor.setCookie);
  return Response.json(data, { ...init, headers });
}
