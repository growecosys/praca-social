DROP INDEX IF EXISTS `idx_share_post_visitor`;
CREATE UNIQUE INDEX IF NOT EXISTS `idx_share_post_user` ON `share_links` (`post_id`, `user_id`) WHERE `user_id` IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS `idx_share_post_anon_visitor` ON `share_links` (`post_id`, `visitor_id`) WHERE `user_id` IS NULL;
