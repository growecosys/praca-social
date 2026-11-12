ALTER TABLE `pokes` ADD `kind` text NOT NULL DEFAULT 'mystery';
ALTER TABLE `pokes` ADD `target_post_id` integer REFERENCES `posts`(`id`) ON DELETE SET NULL;
ALTER TABLE `pokes` ADD `status` text NOT NULL DEFAULT 'pending';
ALTER TABLE `pokes` ADD `resolved_at` text;
ALTER TABLE `pokes` ADD `expires_at` text;
UPDATE `pokes` SET `expires_at` = datetime(`created_at`, '+7 days') WHERE `expires_at` IS NULL;
CREATE INDEX IF NOT EXISTS `idx_pokes_recipient_status` ON `pokes` (`recipient_id`, `status`, `expires_at`);
CREATE TABLE IF NOT EXISTS `poke_mutes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` text NOT NULL REFERENCES `users`(`id`),
  `muted_user_id` text NOT NULL REFERENCES `users`(`id`),
  `created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `idx_poke_mutes_pair` ON `poke_mutes` (`user_id`, `muted_user_id`);
