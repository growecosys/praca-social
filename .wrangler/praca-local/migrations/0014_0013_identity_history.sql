CREATE TABLE `avatar_generations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`image_key` text NOT NULL,
	`prompt` text DEFAULT '' NOT NULL,
	`direction` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_avatar_generations_user` ON `avatar_generations` (`user_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_avatar_generations_image_key` ON `avatar_generations` (`image_key`);
--> statement-breakpoint
INSERT INTO `avatar_generations` (`id`, `user_id`, `image_key`, `active`, `created_at`)
SELECT lower(hex(randomblob(16))), `id`, `avatar_image_key`, 1, COALESCE(`updated_at`, `created_at`)
FROM `users`
WHERE `avatar_image_key` IS NOT NULL;
--> statement-breakpoint
INSERT INTO `role_generations` (`id`, `user_id`, `answers_json`, `role_title`, `manifesto`, `avatar_json`, `status`, `created_at`, `applied_at`)
SELECT lower(hex(randomblob(16))), u.`id`, u.`answers_json`, u.`role_title`, u.`manifesto`, u.`avatar_json`, 'applied', COALESCE(u.`updated_at`, u.`created_at`), COALESCE(u.`updated_at`, u.`created_at`)
FROM `users` u
WHERE u.`role_title` <> '' AND NOT EXISTS (
  SELECT 1 FROM `role_generations` r
  WHERE r.`user_id` = u.`id` AND r.`role_title` = u.`role_title` AND r.`manifesto` = u.`manifesto`
);
