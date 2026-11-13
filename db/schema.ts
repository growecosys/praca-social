import { sql } from "drizzle-orm";
import {
  bigint,
  bigserial,
  customType,
  index,
  pgTable,
  text,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Timestamps are stored as "YYYY-MM-DD HH:MM:SS" UTC text, exactly like the original SQLite
// CURRENT_TIMESTAMP, so string comparisons against app-generated timestamps keep working.
export const nowText = sql`to_char(timezone('utc', now()), 'YYYY-MM-DD HH24:MI:SS')`;

// Flags are stored as 0/1 integers because raw SQL throughout the app compares them as numbers.
const boolInt = customType<{ data: boolean; driverData: number }>({
  dataType: () => "integer",
  fromDriver: (value) => Number(value) === 1,
  toDriver: (value) => (value ? 1 : 0),
});

export const posts = pgTable(
  "posts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    author: text("author").notNull().default("Anônimo"),
    content: text("content").notNull(),
    contentJson: text("content_json").notNull().default("[]"),
    ownerId: text("owner_id").notNull().default(""),
    createdAt: text("created_at").notNull().default(nowText),
    updatedAt: text("updated_at"),
  },
  (table) => [uniqueIndex("idx_posts_slug").on(table.slug)],
);

export const postRevisions = pgTable(
  "post_revisions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts.id),
    version: bigint("version", { mode: "number" }).notNull(),
    title: text("title").notNull(),
    author: text("author").notNull(),
    content: text("content").notNull(),
    contentJson: text("content_json").notNull(),
    editorId: text("editor_id").notNull().default(""),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [
    uniqueIndex("idx_revisions_post_version").on(table.postId, table.version),
    index("idx_revisions_post").on(table.postId),
  ],
);

export const shareLinks = pgTable(
  "share_links",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts.id),
    code: text("code").notNull(),
    visitorId: text("visitor_id").notNull(),
    userId: text("user_id"),
    clicks: bigint("clicks", { mode: "number" }).notNull().default(0),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [
    uniqueIndex("idx_share_code").on(table.code),
    uniqueIndex("idx_share_post_user")
      .on(table.postId, table.userId)
      .where(sql`${table.userId} IS NOT NULL`),
    uniqueIndex("idx_share_post_anon_visitor")
      .on(table.postId, table.visitorId)
      .where(sql`${table.userId} IS NULL`),
    index("idx_share_created_at").on(table.createdAt),
  ],
);

export const shareVisits = pgTable(
  "share_visits",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    shareLinkId: bigint("share_link_id", { mode: "number" })
      .notNull()
      .references(() => shareLinks.id),
    visitorId: text("visitor_id").notNull(),
    userId: text("user_id"),
    visits: bigint("visits", { mode: "number" }).notNull().default(1),
    firstSeenAt: text("first_seen_at").notNull().default(nowText),
    lastSeenAt: text("last_seen_at").notNull().default(nowText),
  },
  (table) => [
    uniqueIndex("idx_share_visits_link_visitor").on(table.shareLinkId, table.visitorId),
    index("idx_share_visits_first_seen").on(table.firstSeenAt),
  ],
);

export const postViews = pgTable(
  "post_views",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    userId: text("user_id"),
    views: bigint("views", { mode: "number" }).notNull().default(1),
    firstSeenAt: text("first_seen_at").notNull().default(nowText),
    lastSeenAt: text("last_seen_at").notNull().default(nowText),
  },
  (table) => [
    uniqueIndex("idx_post_views_post_visitor").on(table.postId, table.visitorId),
    index("idx_post_views_first_seen").on(table.firstSeenAt),
  ],
);

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    displayName: text("display_name").notNull(),
    bio: text("bio").notNull().default(""),
    deletedAt: text("deleted_at"),
    secretHash: text("secret_hash").notNull(),
    secretSalt: text("secret_salt").notNull(),
    profileComplete: boolInt("profile_complete")
      .notNull()
      .default(sql`0`),
    answersJson: text("answers_json").notNull().default("[]"),
    roleTitle: text("role_title").notNull().default(""),
    manifesto: text("manifesto").notNull().default(""),
    avatarJson: text("avatar_json").notNull().default("{}"),
    avatarImageKey: text("avatar_image_key"),
    imageGenerationsUsed: bigint("image_generations_used", { mode: "number" }).notNull().default(0),
    generationsUsed: bigint("generations_used", { mode: "number" }).notNull().default(0),
    createdAt: text("created_at").notNull().default(nowText),
    updatedAt: text("updated_at"),
  },
  (table) => [uniqueIndex("idx_users_username").on(table.username)],
);

export const referrals = pgTable(
  "referrals",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    inviterId: text("inviter_id")
      .notNull()
      .references(() => users.id),
    invitedUserId: text("invited_user_id")
      .notNull()
      .references(() => users.id),
    shareLinkId: bigint("share_link_id", { mode: "number" }).references(() => shareLinks.id),
    visitorId: text("visitor_id").notNull(),
    qualifiedAt: text("qualified_at"),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [
    uniqueIndex("idx_referrals_invited").on(table.invitedUserId),
    index("idx_referrals_inviter").on(table.inviterId),
  ],
);

export const weeklyRewards = pgTable("weekly_rewards", {
  weekKey: text("week_key").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  score: bigint("score", { mode: "number" }).notNull(),
  awardedAt: text("awarded_at").notNull().default(nowText),
});

export const assistantUsage = pgTable(
  "assistant_usage",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    visitorId: text("visitor_id").notNull(),
    userId: text("user_id").references(() => users.id),
    dayKey: text("day_key").notNull(),
    messages: bigint("messages", { mode: "number" }).notNull().default(0),
    inputTokens: bigint("input_tokens", { mode: "number" }).notNull().default(0),
    outputTokens: bigint("output_tokens", { mode: "number" }).notNull().default(0),
    updatedAt: text("updated_at").notNull().default(nowText),
  },
  (table) => [
    uniqueIndex("idx_assistant_usage_visitor_day").on(table.visitorId, table.dayKey),
    index("idx_assistant_usage_user_day").on(table.userId, table.dayKey),
  ],
);

export const roleGenerations = pgTable(
  "role_generations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    answersJson: text("answers_json").notNull(),
    roleTitle: text("role_title").notNull(),
    manifesto: text("manifesto").notNull(),
    avatarJson: text("avatar_json").notNull(),
    mappingJson: text("mapping_json").notNull().default("{}"),
    explanation: text("explanation").notNull().default(""),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull().default(nowText),
    appliedAt: text("applied_at"),
  },
  (table) => [index("idx_role_generations_user_status").on(table.userId, table.status)],
);

export const avatarGenerations = pgTable(
  "avatar_generations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    imageKey: text("image_key").notNull(),
    prompt: text("prompt").notNull().default(""),
    direction: text("direction").notNull().default(""),
    active: boolInt("active")
      .notNull()
      .default(sql`0`),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [
    index("idx_avatar_generations_user").on(table.userId),
    uniqueIndex("idx_avatar_generations_image_key").on(table.imageKey),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id),
    actorId: text("actor_id").references(() => users.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    href: text("href").notNull().default("/"),
    dedupeKey: text("dedupe_key"),
    readAt: text("read_at"),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [
    index("idx_notifications_recipient_read").on(table.recipientId, table.readAt),
    uniqueIndex("idx_notifications_dedupe").on(table.dedupeKey),
  ],
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [
    uniqueIndex("idx_sessions_token").on(table.tokenHash),
    index("idx_sessions_user").on(table.userId),
  ],
);

export const accountRecovery = pgTable("account_recovery", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  question1: text("question_1").notNull(),
  answer1Hash: text("answer_1_hash").notNull(),
  answer1Salt: text("answer_1_salt").notNull(),
  question2: text("question_2").notNull(),
  answer2Hash: text("answer_2_hash").notNull(),
  answer2Salt: text("answer_2_salt").notNull(),
  attempts: bigint("attempts", { mode: "number" }).notNull().default(0),
  lockedUntil: text("locked_until"),
  updatedAt: text("updated_at").notNull().default(nowText),
});

export const activityEvents = pgTable(
  "activity_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id").references(() => users.id),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull().default(""),
    entityId: text("entity_id").notNull().default(""),
    metadataJson: text("metadata_json").notNull().default("{}"),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [
    index("idx_activity_user").on(table.userId),
    index("idx_activity_created_at").on(table.createdAt),
  ],
);

export const likes = pgTable(
  "likes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    userId: text("user_id"),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [
    uniqueIndex("idx_likes_post_visitor").on(table.postId, table.visitorId),
    index("idx_likes_created_at").on(table.createdAt),
  ],
);

export const comments = pgTable(
  "comments",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    postId: bigint("post_id", { mode: "number" })
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    visitorId: text("visitor_id").notNull(),
    userId: text("user_id"),
    displayName: text("display_name").notNull().default("Anônimo"),
    anonymous: boolInt("anonymous")
      .notNull()
      .default(sql`0`),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [
    index("idx_comments_post").on(table.postId),
    index("idx_comments_created_at").on(table.createdAt),
  ],
);

export const commonAssets = pgTable("common_assets", {
  placementJson: text("placement_json").notNull().default("{}"),
  id: text("id").primaryKey(),
  element: text("element").notNull(),
  url: text("url").notNull(),
  prompt: text("prompt").notNull(),
  authorId: text("author_id").references(() => users.id),
  active: bigint("active", { mode: "number" }).notNull().default(0),
  createdAt: text("created_at").notNull().default(nowText),
});
export const commonGenerations = pgTable(
  "common_generations",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    monthKey: text("month_key").notNull(),
    element: text("element").notNull(),
    status: text("status").notNull().default("pending"),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (t) => [
    uniqueIndex("common_generation_month")
      .on(t.userId, t.monthKey)
      .where(sql`${t.status} != 'failed'`),
  ],
);
export const commonProposals = pgTable(
  "common_proposals",
  {
    id: text("id").primaryKey(),
    assetId: text("asset_id")
      .notNull()
      .references(() => commonAssets.id),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull(),
    reason: text("reason").notNull().default(""),
    monthKey: text("month_key").notNull(),
    closesAt: text("closes_at").notNull(),
    status: text("status").notNull().default("open"),
    yesCount: bigint("yes_count", { mode: "number" }).notNull().default(0),
    noCount: bigint("no_count", { mode: "number" }).notNull().default(0),
    closedAt: text("closed_at"),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (t) => [
    uniqueIndex("common_asset_proposal_month")
      .on(t.assetId, t.kind, t.monthKey)
      .where(sql`${t.status} != 'cancelled'`),
    index("common_proposals_deadline").on(t.status, t.closesAt),
  ],
);
export const commonProposalAssets = pgTable(
  "common_proposal_assets",
  {
    proposalId: text("proposal_id")
      .notNull()
      .references(() => commonProposals.id),
    assetId: text("asset_id")
      .notNull()
      .references(() => commonAssets.id),
    monthKey: text("month_key").notNull(),
    releasedAt: text("released_at"),
  },
  (t) => [
    uniqueIndex("common_removal_asset_month")
      .on(t.assetId, t.monthKey)
      .where(sql`${t.releasedAt} IS NULL`),
  ],
);
export const commonVotes = pgTable(
  "common_votes",
  {
    proposalId: text("proposal_id")
      .notNull()
      .references(() => commonProposals.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    value: bigint("value", { mode: "number" }).notNull(),
    updatedAt: text("updated_at").notNull().default(nowText),
  },
  (t) => [uniqueIndex("common_vote_pair").on(t.proposalId, t.userId)],
);

export const postImages = pgTable(
  "post_images",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    prompt: text("prompt").notNull(),
    status: text("status").notNull().default("pending"),
    imageKey: text("image_key"),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [index("post_images_user_status").on(table.userId, table.status)],
);

export const connections = pgTable(
  "connections",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userA: text("user_a")
      .notNull()
      .references(() => users.id),
    userB: text("user_b")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [uniqueIndex("connections_pair").on(table.userA, table.userB)],
);

export const circles = pgTable("circles", {
  deletedAt: text("deleted_at"),
  chatEnabled: boolInt("chat_enabled")
    .notNull()
    .default(sql`0`),
  id: bigserial("id", { mode: "number" }).primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  mission: text("mission").notNull(),
  success: text("success").notNull(),
  emblem: text("emblem").notNull().default("🌱"),
  visibility: text("visibility").notNull().default("public"),
  status: text("status").notNull().default("gathering"),
  createdAt: text("created_at").notNull().default(nowText),
});
export const circleMembers = pgTable(
  "circle_members",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    circleId: bigint("circle_id", { mode: "number" })
      .notNull()
      .references(() => circles.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("invited"),
  },
  (table) => [uniqueIndex("circle_member_pair").on(table.circleId, table.userId)],
);
export const circleEntries = pgTable("circle_entries", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  circleId: bigint("circle_id", { mode: "number" })
    .notNull()
    .references(() => circles.id),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  kind: text("kind").notNull(),
  body: text("body").notNull(),
  assigneeId: text("assignee_id").references(() => users.id),
  status: text("status").notNull().default("available"),
  createdAt: text("created_at").notNull().default(nowText),
});

export const pokes = pgTable(
  "pokes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    senderId: text("sender_id")
      .notNull()
      .references(() => users.id),
    recipientId: text("recipient_id")
      .notNull()
      .references(() => users.id),
    kind: text("kind").notNull().default("mystery"),
    targetPostId: bigint("target_post_id", { mode: "number" }).references(() => posts.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("pending"),
    seenAt: text("seen_at"),
    resolvedAt: text("resolved_at"),
    expiresAt: text("expires_at")
      .notNull()
      .default(sql`to_char(timezone('utc', now()) + interval '7 days', 'YYYY-MM-DD HH24:MI:SS')`),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [
    index("idx_pokes_recipient_seen").on(table.recipientId, table.seenAt),
    index("idx_pokes_recipient_status").on(table.recipientId, table.status, table.expiresAt),
    index("idx_pokes_sender_created").on(table.senderId, table.createdAt),
  ],
);

export const pokeMutes = pgTable(
  "poke_mutes",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    mutedUserId: text("muted_user_id")
      .notNull()
      .references(() => users.id),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [uniqueIndex("idx_poke_mutes_pair").on(table.userId, table.mutedUserId)],
);

export const accountEmails = pgTable(
  "account_emails",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id),
    email: text("email").notNull(),
    verifiedAt: text("verified_at").notNull(),
  },
  (t) => [uniqueIndex("account_email_unique").on(t.email)],
);
export const emailAuthTokens = pgTable(
  "email_auth_tokens",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull(),
    purpose: text("purpose").notNull(),
    userId: text("user_id").references(() => users.id),
    tokenHash: text("token_hash").notNull(),
    codeHash: text("code_hash"),
    requestHash: text("request_hash").notNull(),
    expiresAt: text("expires_at").notNull(),
    consumedAt: text("consumed_at"),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (t) => [
    uniqueIndex("email_token_hash_unique").on(t.tokenHash),
    index("email_token_expiry").on(t.expiresAt),
  ],
);
export const authEmailLimits = pgTable("auth_email_limits", {
  id: text("id").primaryKey(),
  attempts: bigint("attempts", { mode: "number" }).notNull().default(1),
  expiresAt: text("expires_at").notNull(),
});
export const profileAliases = pgTable("profile_aliases", {
  username: text("username").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
});

export const pendingAccountEmails = pgTable("pending_account_emails", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  email: text("email").notNull(),
  createdAt: text("created_at").notNull().default(nowText),
});

// Safety records are additive; no existing account or publication is rewritten.
export const userBlocks = pgTable(
  "user_blocks",
  {
    userId: text("user_id").notNull(),
    blockedId: text("blocked_id").notNull(),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [uniqueIndex("user_blocks_pair").on(table.userId, table.blockedId)],
);
export const safetyReports = pgTable("safety_reports", {
  id: text("id").primaryKey(),
  reporterId: text("reporter_id").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull(),
  reason: text("reason").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull().default(nowText),
});

export const circleMessages = pgTable(
  "circle_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    circleId: bigint("circle_id", { mode: "number" })
      .notNull()
      .references(() => circles.id),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    clientId: text("client_id").notNull(),
    body: text("body").notNull(),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [
    index("circle_messages_timeline").on(table.circleId, table.id),
    index("circle_messages_rate").on(table.authorId, table.createdAt),
    uniqueIndex("circle_messages_retry").on(table.circleId, table.authorId, table.clientId),
  ],
);

export const circleCycles = pgTable("circle_cycles", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  circleId: bigint("circle_id", { mode: "number" })
    .notNull()
    .references(() => circles.id),
  name: text("name").notNull(),
  goal: text("goal").notNull(),
  start: text("start").notNull(),
  end: text("end").notNull(),
  status: text("status").notNull().default("open"),
  createdAt: text("created_at").notNull().default(nowText),
});
export const circleAgreements = pgTable(
  "circle_agreements",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    circleId: bigint("circle_id", { mode: "number" })
      .notNull()
      .references(() => circles.id),
    cycleId: bigint("cycle_id", { mode: "number" })
      .notNull()
      .references(() => circleCycles.id),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id),
    assigneeId: text("assignee_id")
      .notNull()
      .references(() => users.id),
    reviewerId: text("reviewer_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    role: text("role").notNull().default(""),
    scope: text("scope").notNull(),
    criteria: text("criteria").notNull(),
    terms: text("terms").notNull(),
    amount: bigint("amount", { mode: "number" }).notNull().default(0),
    due: text("due").notNull(),
    status: text("status").notNull().default("proposed"),
    evidence: text("evidence").notNull().default(""),
    agreedAt: text("agreed_at"),
    createdAt: text("created_at").notNull().default(nowText),
    updatedAt: text("updated_at"),
  },
  (t) => [index("circle_agreements_cycle").on(t.circleId, t.cycleId)],
);
export const circleFunds = pgTable("circle_funds", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  circleId: bigint("circle_id", { mode: "number" })
    .notNull()
    .references(() => circles.id),
  cycleId: bigint("cycle_id", { mode: "number" })
    .notNull()
    .references(() => circleCycles.id),
  name: text("name").notNull(),
  amount: bigint("amount", { mode: "number" }).notNull(),
  confirmed: boolInt("confirmed")
    .notNull()
    .default(sql`0`),
  note: text("note").notNull(),
  creatorId: text("creator_id")
    .notNull()
    .references(() => users.id),
  createdAt: text("created_at").notNull().default(nowText),
});
export const circlePayments = pgTable(
  "circle_payments",
  {
    id: text("id").primaryKey(),
    circleId: bigint("circle_id", { mode: "number" })
      .notNull()
      .references(() => circles.id),
    agreementId: bigint("agreement_id", { mode: "number" })
      .notNull()
      .references(() => circleAgreements.id),
    fundId: bigint("fund_id", { mode: "number" })
      .notNull()
      .references(() => circleFunds.id),
    amount: bigint("amount", { mode: "number" }).notNull(),
    date: text("date").notNull(),
    note: text("note").notNull(),
    actorId: text("actor_id")
      .notNull()
      .references(() => users.id),
    voidedAt: text("voided_at"),
    voidReason: text("void_reason"),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (t) => [index("circle_payments_circle").on(t.circleId)],
);

// Optional game progress, isolated from publishing, circles and real financial records.
export const afterHoursStates = pgTable("after_hours_states", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  stateJson: text("state_json").notNull(),
  revision: bigint("revision", { mode: "number" }).notNull().default(0),
  updatedAt: text("updated_at").notNull().default(nowText),
});

export const arcadeRuns = pgTable(
  "arcade_runs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    gameId: text("game_id").notNull(),
    version: bigint("version", { mode: "number" }).notNull(),
    seed: bigint("seed", { mode: "number" }).notNull(),
    startedMs: bigint("started_ms", { mode: "number" }).notNull(),
    finishedMs: bigint("finished_ms", { mode: "number" }),
    status: text("status").notNull().default("playing"),
    score: bigint("score", { mode: "number" }).notNull().default(0),
    deliveries: bigint("deliveries", { mode: "number" }).notNull().default(0),
    resultJson: text("result_json"),
    replayJson: text("replay_json"),
    inputHash: text("input_hash"),
  },
  (t) => [
    index("arcade_runs_user_game").on(t.userId, t.gameId, t.status),
    index("arcade_runs_rate").on(t.userId, t.startedMs),
  ],
);
export const gameAchievements = pgTable(
  "game_achievements",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    gameId: text("game_id").notNull(),
    key: text("key").notNull(),
    xp: bigint("xp", { mode: "number" }).notNull(),
    runId: text("run_id").notNull(),
    earnedAt: text("earned_at").notNull().default(nowText),
  },
  (t) => [uniqueIndex("game_achievement_once").on(t.userId, t.gameId, t.key)],
);

export const rpgCharacters = pgTable("rpg_characters", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id),
  stateJson: text("state_json").notNull(),
  revision: bigint("revision", { mode: "number" }).notNull().default(0),
  updatedAt: text("updated_at").notNull().default(nowText),
});
export const rpgUsage = pgTable(
  "rpg_usage",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    day: text("day").notNull(),
    calls: bigint("calls", { mode: "number" }).notNull().default(0),
  },
  (t) => [uniqueIndex("rpg_usage_day").on(t.userId, t.day)],
);

export const storyCampaigns = pgTable(
  "story_campaigns",
  {
    id: text("id").primaryKey(),
    active: bigint("active", { mode: "number" }),
    stateJson: text("state_json").notNull(),
    revision: bigint("revision", { mode: "number" }).notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [uniqueIndex("story_one_current").on(t.active)],
);
export const storyMessages = pgTable(
  "story_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => storyCampaigns.id),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    clientId: text("client_id").notNull(),
    body: text("body").notNull(),
    createdMs: bigint("created_ms", { mode: "number" }).notNull(),
  },
  (t) => [
    uniqueIndex("story_message_once").on(t.campaignId, t.authorId, t.clientId),
    index("story_message_timeline").on(t.campaignId, t.id),
  ],
);

export const commonGovernanceProposals = pgTable(
  "common_governance_proposals",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    scope: text("scope").notNull(),
    change: text("change").notNull(),
    impact: text("impact").notNull(),
    rules: text("rules"),
    cancelledAt: text("cancelled_at"),
    createdAt: text("created_at").notNull().default(nowText),
  },
  (table) => [index("idx_common_governance_created").on(table.createdAt, table.id)],
);

export const commonSignals = pgTable(
  "common_signals",
  {
    id: text("id").primaryKey(),
    authorId: text("author_id").references(() => users.id, { onDelete: "set null" }),
    body: text("body").notNull(),
    page: text("page").notNull(),
    hideName: boolInt("hide_name").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    attempts: bigint("attempts", { mode: "number" }).notNull().default(0),
    startedAt: bigint("started_at", { mode: "number" }),
    analysis: text("analysis"),
    relatedId: text("related_id"),
  },
  (table) => [
    index("common_signals_recent").on(table.createdAt, table.id),
    index("common_signals_author").on(table.authorId, table.createdAt),
  ],
);
