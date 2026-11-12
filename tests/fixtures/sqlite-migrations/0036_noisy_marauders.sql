DROP INDEX `common_removal_asset_month`;--> statement-breakpoint
ALTER TABLE `common_proposal_assets` ADD `released_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `common_removal_asset_month` ON `common_proposal_assets` (`asset_id`,`month_key`) WHERE "common_proposal_assets"."released_at" IS NULL;--> statement-breakpoint
DROP INDEX `common_asset_proposal_month`;--> statement-breakpoint
CREATE UNIQUE INDEX `common_asset_proposal_month` ON `common_proposals` (`asset_id`,`kind`,`month_key`) WHERE "common_proposals"."status" != 'cancelled';--> statement-breakpoint
ALTER TABLE `common_governance_proposals` ADD `rules` text;--> statement-breakpoint
ALTER TABLE `common_governance_proposals` ADD `cancelled_at` text;