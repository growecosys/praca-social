CREATE TABLE common_proposal_assets (
 proposal_id TEXT NOT NULL REFERENCES common_proposals(id),
 asset_id TEXT NOT NULL REFERENCES common_assets(id),
 month_key TEXT NOT NULL,
 PRIMARY KEY(proposal_id,asset_id)
);
CREATE UNIQUE INDEX common_removal_asset_month ON common_proposal_assets(asset_id,month_key);
