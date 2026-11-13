CREATE TABLE `role_generations` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` text NOT NULL,
  `answers_json` text NOT NULL,
  `role_title` text NOT NULL,
  `manifesto` text NOT NULL,
  `avatar_json` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `applied_at` text,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_role_generations_user_status` ON `role_generations` (`user_id`,`status`);
