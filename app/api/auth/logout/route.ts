import { clearSession } from "../../../../lib/praca-auth";
export async function POST(request: Request) { await clearSession(); return Response.redirect(new URL("/", request.url), 303); }
