UPDATE `users`
SET `role_title` = 'Cartógrafo Cósmico das Coisas Vivas',
    `manifesto` = 'Protege o que importa e perturba o que parecia inevitável.',
    `avatar_json` = '{"symbol":"ponte","colors":["#7b4a8b","#f0c64b","#f5f1e8"]}',
    `generations_used` = 0,
    `updated_at` = CURRENT_TIMESTAMP
WHERE `username` = 'growecosystems';
--> statement-breakpoint
INSERT INTO `activity_events` (`user_id`, `action`, `entity_type`, `entity_id`, `metadata_json`)
SELECT `id`, 'role_regeneration_smoke_restored', 'user', `id`, '{"creditRestored":true,"originalRoleRestored":true}'
FROM `users` WHERE `username` = 'growecosystems';
