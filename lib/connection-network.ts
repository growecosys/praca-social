import { connectionEdges } from "./connection-strength";
import { and, eq, inArray, or, isNull, sql } from "drizzle-orm";
import { getDb } from "../db";
import { activityEvents, circleMembers, circles, connections, pokes } from "../db/schema";
import { connectedPeople } from "./connections";
export async function connectionNetwork(userId:string) {
 const db=getDb(),people=await connectedPeople(userId);
 const ids=[userId,...people.map(p=>p.id)];
 const [pairs,interactions,mine,responses]=await Promise.all([
  db.select().from(connections).where(and(inArray(connections.userA,ids),inArray(connections.userB,ids))),
  db.select().from(pokes).where(and(inArray(pokes.senderId,ids),inArray(pokes.recipientId,ids))),
  db.select().from(circleMembers).where(eq(circleMembers.userId,userId)),
  db.select({entityId:activityEvents.entityId,metadataJson:activityEvents.metadataJson}).from(activityEvents).where(and(inArray(activityEvents.userId,ids),eq(activityEvents.action,"poke_archived"))),
 ]);
 const memberships=mine.filter(m=>["active","invited","requested"].includes(m.status));
 const allCircles=await db.select().from(circles).where(and(isNull(circles.deletedAt),or(eq(circles.visibility,"public"),memberships.length?inArray(circles.id,memberships.map(m=>m.circleId)):eq(circles.ownerId,userId))));
 const members=allCircles.length?await db.select().from(circleMembers).where(and(inArray(circleMembers.circleId,allCircles.map(c=>c.id)),eq(circleMembers.status,"active"),sql`EXISTS (SELECT 1 FROM users WHERE users.id=${circleMembers.userId} AND users.deleted_at IS NULL)`)):[];
 const ownCircles=allCircles.filter(c=>memberships.some(m=>m.circleId===c.id));
 const edges=connectionEdges(pairs,interactions,responses);
 const deletedCircles=await db.select().from(circles).where(and(eq(circles.ownerId,userId),sql`${circles.deletedAt} IS NOT NULL`));
 return {deletedCircles,userId,people,edges,circles:allCircles,members,mine,ownCircles};
}
