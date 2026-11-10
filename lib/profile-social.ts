import { desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import {
  avatarGenerations,
  comments,
  likes,
  pokes,
  postViews,
  posts,
  referrals,
  shareLinks,
  shareVisits,
  users,
} from "../db/schema";
import { earnedBadges } from "./badges";

export async function getProfileSocial(user: {
  id: string;
  avatarImageKey: string | null;
}) {
  const db = getDb();
  const [
    publications,
    allLikes,
    allComments,
    allShares,
    receivedPokes,
    generatedAvatars,
    allViews,
    allShareVisits,
    invitedPeople,
  ] = await Promise.all([
    db
      .select()
      .from(posts)
      .where(eq(posts.ownerId, user.id))
      .orderBy(desc(posts.createdAt)),
    db.select().from(likes),
    db.select().from(comments),
    db.select().from(shareLinks),
    db.select().from(pokes).where(eq(pokes.recipientId, user.id)),
    db
      .select({ id: avatarGenerations.id })
      .from(avatarGenerations)
      .where(eq(avatarGenerations.userId, user.id)),
    db.select().from(postViews),
    db.select().from(shareVisits),
    db
      .select({
        id: referrals.id,
        username: users.username,
        displayName: users.displayName,
        profileComplete: users.profileComplete,
        createdAt: referrals.createdAt,
        qualifiedAt: referrals.qualifiedAt,
        shareLinkId: referrals.shareLinkId,
      })
      .from(referrals)
      .innerJoin(users, eq(users.id, referrals.invitedUserId))
      .where(eq(referrals.inviterId, user.id))
      .orderBy(desc(referrals.createdAt)),
  ]);
  const ids = new Set(publications.map((post) => post.id));
  const stats = {
    posts: publications.length,
    likesReceived: allLikes.filter((item) => ids.has(item.postId)).length,
    commentsReceived: allComments.filter((item) => ids.has(item.postId)).length,
    sharesReceived: allShares.filter((item) => ids.has(item.postId)).length,
    uniqueViews: allViews.filter((item) => ids.has(item.postId)).length,
    linkVisitors: allShareVisits.filter((visit) =>
      allShares.some(
        (link) => link.id === visit.shareLinkId && link.userId === user.id,
      ),
    ).length,
    peopleAttracted: invitedPeople.filter((item) => Boolean(item.qualifiedAt))
      .length,
    pokesReceived: receivedPokes.length,
    hasGeneratedAvatar: generatedAvatars.length > 0,
  };
  return {
    publications,
    stats,
    badges: earnedBadges(stats),
    invitedPeople,
  };
}
