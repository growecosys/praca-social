import { desc, eq, sql, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import {
  activityEvents,
  comments,
  likes,
  notifications,
  posts,
  postViews,
  referrals,
  shareLinks,
  shareVisits,
  users,
  weeklyRewards,
} from "../../../db/schema";
import { firstPostImage } from "../../../lib/post-media";

const windows: Record<string, number | null> = {
  all: null,
  "7d": 604800000,
  "3d": 259200000,
  "24h": 86400000,
  "4h": 14400000,
  "1h": 3600000,
  "30m": 1800000,
};
function millis(value: string | null | undefined) {
  return value ? new Date(`${value.replace(" ", "T")}Z`).getTime() : 0;
}
function inWindow(value: string | null | undefined, start: number, end = Infinity) {
  const time = millis(value);
  return time >= start && time < end;
}

function peopleRanking(data: any, start: number, end = Infinity) {
  const linkById = new Map(data.shares.map((link: any) => [link.id, link]));
  return data.users
    .map((user: any) => {
      const ownPostIds = new Set(
        data.posts.filter((post: any) => post.ownerId === user.id).map((post: any) => post.id),
      );
      const postCount = data.posts.filter(
        (post: any) => post.ownerId === user.id && inWindow(post.createdAt, start, end),
      ).length;
      const likeCount = data.likes.filter(
        (item: any) => ownPostIds.has(item.postId) && inWindow(item.createdAt, start, end),
      ).length;
      const commentCount = data.comments.filter(
        (item: any) => ownPostIds.has(item.postId) && inWindow(item.createdAt, start, end),
      ).length;
      const linkCount = data.shares.filter(
        (item: any) => item.userId === user.id && inWindow(item.createdAt, start, end),
      ).length;
      const viewCount = data.views.filter(
        (item: any) => ownPostIds.has(item.postId) && inWindow(item.firstSeenAt, start, end),
      ).length;
      const linkVisitors = data.shareVisits.filter(
        (visit: any) =>
          (linkById.get(visit.shareLinkId) as any)?.userId === user.id &&
          inWindow(visit.firstSeenAt, start, end),
      ).length;
      const peopleAttracted = data.referrals.filter(
        (item: any) => item.inviterId === user.id && inWindow(item.qualifiedAt, start, end),
      ).length;
      const score =
        postCount * 3 +
        likeCount +
        commentCount * 2 +
        linkCount * 2 +
        Math.min(viewCount, 25) +
        Math.min(linkVisitors, 15) +
        peopleAttracted * 10;
      return {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: `/avatar/${user.id}?v=${user.imageGenerationsUsed}`,
        posts: postCount,
        likes: likeCount,
        comments: commentCount,
        links: linkCount,
        uniqueViews: viewCount,
        linkVisitors,
        peopleAttracted,
        score,
      };
    })
    .filter((row: any) => row.score > 0)
    .sort(
      (a: any, b: any) =>
        b.score - a.score ||
        b.peopleAttracted - a.peopleAttracted ||
        b.comments - a.comments ||
        a.username.localeCompare(b.username),
    );
}

function previousWeek(now = Date.now()) {
  const offset = 10800000;
  const local = new Date(now - offset);
  const distance = (local.getUTCDay() + 6) % 7;
  const currentMondayLocal = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - distance,
  );
  const end = currentMondayLocal + offset;
  const start = end - 604800000;
  return { start, end, key: new Date(start - offset).toISOString().slice(0, 10) };
}

async function awardPreviousWeek(data: any) {
  const db = getDb();
  const week = previousWeek();
  if (
    (await db.select().from(weeklyRewards).where(eq(weeklyRewards.weekKey, week.key)).limit(1))
      .length
  )
    return;
  const winner = peopleRanking(data, week.start, week.end)[0];
  if (!winner) return;
  const inserted = await db
    .insert(weeklyRewards)
    .values({ weekKey: week.key, userId: winner.id, score: winner.score })
    .onConflictDoNothing()
    .returning({ weekKey: weeklyRewards.weekKey });
  if (!inserted.length) return;
  await db
    .update(users)
    .set({ generationsUsed: 0, updatedAt: sql`CURRENT_TIMESTAMP` })
    .where(eq(users.id, winner.id));
  await db.insert(activityEvents).values({
    userId: winner.id,
    action: "weekly_leader_reward",
    entityType: "weekly_reward",
    entityId: week.key,
    metadataJson: JSON.stringify({ score: winner.score, roleCreditsReset: true }),
  });
  await db
    .insert(notifications)
    .values({
      recipientId: winner.id,
      type: "weekly_reward",
      title: "🏆 Você movimentou a Praça",
      body: "Primeiro lugar da semana: seus créditos de papel foram renovados.",
      href: "/placar",
      dedupeKey: `weekly-reward:${week.key}`,
    })
    .onConflictDoNothing();
}

export async function GET(request: Request) {
  const requested = new URL(request.url).searchParams.get("window") || "7d";
  const key = Object.hasOwn(windows, requested) ? requested : "7d";
  const duration = windows[key];
  const cutoff = duration === null ? 0 : Date.now() - duration;
  const db = getDb();
  const [
    allPosts,
    allLikes,
    allComments,
    allShares,
    allUsers,
    allViews,
    allShareVisits,
    allReferrals,
  ] = await Promise.all([
    db.select().from(posts).orderBy(desc(posts.createdAt)).limit(200),
    db.select().from(likes),
    db.select().from(comments),
    db.select().from(shareLinks),
    db
      .select({
        id: users.id,
        username: users.username,
        displayName: users.displayName,
        imageGenerationsUsed: users.imageGenerationsUsed,
      })
      .from(users)
      .where(isNull(users.deletedAt)),
    db.select().from(postViews),
    db.select().from(shareVisits),
    db.select().from(referrals),
  ]);
  const activePosts = allPosts.filter((post) => allUsers.some((u) => u.id === post.ownerId));
  const data = {
    posts: activePosts,
    likes: allLikes,
    comments: allComments,
    shares: allShares,
    users: allUsers,
    views: allViews,
    shareVisits: allShareVisits,
    referrals: allReferrals,
  };
  await awardPreviousWeek(data);
  const userById = new Map(allUsers.map((user) => [user.id, user]));
  const filteredLikes = allLikes.filter((item) => inWindow(item.createdAt, cutoff));
  const filteredComments = allComments.filter((item) => inWindow(item.createdAt, cutoff));
  const filteredShares = allShares.filter((item) => inWindow(item.createdAt, cutoff));
  const ranking = activePosts
    .map((post) => {
      const likeCount = filteredLikes.filter((item) => item.postId === post.id).length;
      const commentCount = filteredComments.filter((item) => item.postId === post.id).length;
      const postShares = filteredShares.filter((item) => item.postId === post.id);
      const uniqueViews = allViews.filter(
        (item) => item.postId === post.id && inWindow(item.firstSeenAt, cutoff),
      ).length;
      const shareVisitors = allShareVisits.filter(
        (visit) =>
          postShares.some((link) => link.id === visit.shareLinkId) &&
          inWindow(visit.firstSeenAt, cutoff),
      ).length;
      const authorProfile = userById.get(post.ownerId);
      return {
        id: post.id,
        slug: post.slug,
        title: post.title,
        author: post.author,
        authorUsername: authorProfile?.username || null,
        authorAvatar: authorProfile
          ? `/avatar/${authorProfile.id}?v=${authorProfile.imageGenerationsUsed}`
          : null,
        createdAt: post.createdAt,
        image: firstPostImage(post.contentJson),
        likes: likeCount,
        comments: commentCount,
        shares: postShares.length,
        shareClicks: postShares.reduce((sum, item) => sum + item.clicks, 0),
        shareVisitors,
        uniqueViews,
        score: likeCount + commentCount * 2 + postShares.length * 3 + Math.min(uniqueViews, 25),
      };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.comments - a.comments ||
        b.likes - a.likes ||
        millis(b.createdAt) - millis(a.createdAt),
    );
  return Response.json(
    {
      window: key,
      formula:
        "publicação 3 · curtida 1 · comentário 2 · link 2 · visitante único 1 · pessoa atraída 10",
      ranking,
      people: peopleRanking(data, cutoff),
      weeklyPrize: "O primeiro lugar da semana encerrada renova os créditos de papel.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
