import { recoverLegacyConnections } from "./legacy-connections";
import { eq, or } from "drizzle-orm";
import { getDb } from "../db";
import { connections, users } from "../db/schema";
export async function connect(a: string, b: string) {
  const [userA, userB] = [a, b].sort();
  if (userA !== userB)
    await getDb().insert(connections).values({ userA, userB }).onConflictDoNothing();
}
export async function connectedPeople(id: string) {
  await recoverLegacyConnections();
  const rows = await getDb()
    .select()
    .from(connections)
    .where(or(eq(connections.userA, id), eq(connections.userB, id)));
  const people = await getDb()
    .select({ id: users.id, username: users.username, displayName: users.displayName })
    .from(users)
    .where(eq(users.profileComplete, true));
  return people.filter((p) => rows.some((r) => (r.userA === id ? r.userB : r.userA) === p.id));
}
