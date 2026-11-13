CREATE TABLE `account_recovery` (
	`user_id` text PRIMARY KEY NOT NULL,
	`question_1` text NOT NULL,
	`answer_1_hash` text NOT NULL,
	`answer_1_salt` text NOT NULL,
	`question_2` text NOT NULL,
	`answer_2_hash` text NOT NULL,
	`answer_2_salt` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
