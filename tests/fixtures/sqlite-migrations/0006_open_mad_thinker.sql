ALTER TABLE `users` ADD `avatar_image_key` text;--> statement-breakpoint
ALTER TABLE `users` ADD `image_generations_used` integer DEFAULT 0 NOT NULL;