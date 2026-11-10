CREATE TABLE `arcade_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`version` integer NOT NULL,
	`seed` integer NOT NULL,
	`started_ms` integer NOT NULL,
	`finished_ms` integer,
	`status` text DEFAULT 'playing' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`deliveries` integer DEFAULT 0 NOT NULL,
	`result_json` text,
	`replay_json` text,
	`input_hash` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `arcade_runs_user_game` ON `arcade_runs` (`user_id`,`game_id`,`status`);--> statement-breakpoint
CREATE INDEX `arcade_runs_rate` ON `arcade_runs` (`user_id`,`started_ms`);--> statement-breakpoint
CREATE TABLE `game_achievements` (
	`user_id` text NOT NULL,
	`game_id` text NOT NULL,
	`key` text NOT NULL,
	`xp` integer NOT NULL,
	`run_id` text NOT NULL,
	`earned_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `game_achievement_once` ON `game_achievements` (`user_id`,`game_id`,`key`);