ALTER TABLE `role_generations` ADD `mapping_json` text DEFAULT '{}' NOT NULL;
--> statement-breakpoint
ALTER TABLE `role_generations` ADD `explanation` text DEFAULT '' NOT NULL;
--> statement-breakpoint
UPDATE `role_generations`
SET `mapping_json` = json_object(
  'causa', json_extract(`answers_json`, '$[0]'),
  'adversario', json_extract(`answers_json`, '$[1]'),
  'metodo', json_extract(`answers_json`, '$[2]'),
  'contradicao', json_extract(`answers_json`, '$[3]'),
  'horizonte', json_extract(`answers_json`, '$[4]')
),
`explanation` = 'Matriz recuperada das cinco respostas preservadas; a explicação original não existia nesta versão.';
