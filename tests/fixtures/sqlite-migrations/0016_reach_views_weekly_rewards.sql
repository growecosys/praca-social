CREATE TABLE `share_visits` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `share_link_id` integer NOT NULL,
  `visitor_id` text NOT NULL,
  `user_id` text,
  `visits` integer DEFAULT 1 NOT NULL,
  `first_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`share_link_id`) REFERENCES `share_links`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_share_visits_link_visitor` ON `share_visits` (`share_link_id`,`visitor_id`);
--> statement-breakpoint
CREATE INDEX `idx_share_visits_first_seen` ON `share_visits` (`first_seen_at`);
--> statement-breakpoint
CREATE TABLE `post_views` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `post_id` integer NOT NULL,
  `visitor_id` text NOT NULL,
  `user_id` text,
  `views` integer DEFAULT 1 NOT NULL,
  `first_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `last_seen_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`post_id`) REFERENCES `posts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_post_views_post_visitor` ON `post_views` (`post_id`,`visitor_id`);
--> statement-breakpoint
CREATE INDEX `idx_post_views_first_seen` ON `post_views` (`first_seen_at`);
--> statement-breakpoint
CREATE TABLE `referrals` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `inviter_id` text NOT NULL,
  `invited_user_id` text NOT NULL,
  `share_link_id` integer,
  `visitor_id` text NOT NULL,
  `qualified_at` text,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`inviter_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`invited_user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`share_link_id`) REFERENCES `share_links`(`id`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_referrals_invited` ON `referrals` (`invited_user_id`);
--> statement-breakpoint
CREATE INDEX `idx_referrals_inviter` ON `referrals` (`inviter_id`);
--> statement-breakpoint
CREATE TABLE `weekly_rewards` (
  `week_key` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `score` integer NOT NULL,
  `awarded_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
ALTER TABLE `comments` ADD `anonymous` integer DEFAULT false NOT NULL;
