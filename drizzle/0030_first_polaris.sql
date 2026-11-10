CREATE TABLE `circle_agreements` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`circle_id` integer NOT NULL,
	`cycle_id` integer NOT NULL,
	`creator_id` text NOT NULL,
	`assignee_id` text NOT NULL,
	`reviewer_id` text NOT NULL,
	`title` text NOT NULL,
	`role` text DEFAULT '' NOT NULL,
	`scope` text NOT NULL,
	`criteria` text NOT NULL,
	`terms` text NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`due` text NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`evidence` text DEFAULT '' NOT NULL,
	`agreed_at` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cycle_id`) REFERENCES `circle_cycles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reviewer_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `circle_agreements_cycle` ON `circle_agreements` (`circle_id`,`cycle_id`);--> statement-breakpoint
CREATE TABLE `circle_cycles` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`circle_id` integer NOT NULL,
	`name` text NOT NULL,
	`goal` text NOT NULL,
	`start` text NOT NULL,
	`end` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `circle_funds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`circle_id` integer NOT NULL,
	`cycle_id` integer NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`confirmed` integer DEFAULT false NOT NULL,
	`note` text NOT NULL,
	`creator_id` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cycle_id`) REFERENCES `circle_cycles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `circle_payments` (
	`id` text PRIMARY KEY NOT NULL,
	`circle_id` integer NOT NULL,
	`agreement_id` integer NOT NULL,
	`fund_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`note` text NOT NULL,
	`actor_id` text NOT NULL,
	`voided_at` text,
	`void_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`circle_id`) REFERENCES `circles`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agreement_id`) REFERENCES `circle_agreements`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`fund_id`) REFERENCES `circle_funds`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `circle_payments_circle` ON `circle_payments` (`circle_id`);--> statement-breakpoint
ALTER TABLE `circles` ADD `deleted_at` text;--> statement-breakpoint
ALTER TABLE `circles` ADD `chat_enabled` integer DEFAULT false NOT NULL;