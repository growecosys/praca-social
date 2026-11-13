UPDATE `users`
SET `generations_used` = 0,
    `image_generations_used` = 0,
    `updated_at` = CURRENT_TIMESTAMP;
--> statement-breakpoint
INSERT INTO `activity_events` (`user_id`, `action`, `entity_type`, `entity_id`, `metadata_json`)
SELECT `id`, 'generation_credits_reset', 'user', `id`, '{"roleCreditsReset":true,"imageCreditsReset":true}'
FROM `users`;
