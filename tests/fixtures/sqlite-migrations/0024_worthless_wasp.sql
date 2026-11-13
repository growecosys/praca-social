CREATE TABLE `account_emails` (
	`user_id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`verified_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `account_email_unique` ON `account_emails` (`email`);--> statement-breakpoint
CREATE TABLE `auth_email_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`attempts` integer DEFAULT 1 NOT NULL,
	`expires_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `email_auth_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`purpose` text NOT NULL,
	`user_id` text,
	`token_hash` text NOT NULL,
	`request_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`consumed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `email_token_hash_unique` ON `email_auth_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `email_token_expiry` ON `email_auth_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `profile_aliases` (
	`username` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `users` ADD `bio` text DEFAULT '' NOT NULL;