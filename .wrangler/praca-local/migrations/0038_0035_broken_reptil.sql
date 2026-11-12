CREATE TABLE `common_governance_proposals` (
	`id` text PRIMARY KEY NOT NULL,
	`author_id` text,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`scope` text NOT NULL,
	`change` text NOT NULL,
	`impact` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_common_governance_created` ON `common_governance_proposals` (`created_at`,`id`);