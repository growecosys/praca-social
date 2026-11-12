CREATE TABLE common_assets (
 id TEXT PRIMARY KEY NOT NULL, element TEXT NOT NULL, url TEXT NOT NULL,
 prompt TEXT NOT NULL, author_id TEXT REFERENCES users(id),
 active INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE common_generations (
 id TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL REFERENCES users(id),
 month_key TEXT NOT NULL, element TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX common_generation_month ON common_generations(user_id,month_key) WHERE status != 'failed';
CREATE TABLE common_proposals (
 id TEXT PRIMARY KEY NOT NULL, asset_id TEXT NOT NULL REFERENCES common_assets(id),
 creator_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL,
 reason TEXT NOT NULL DEFAULT '', month_key TEXT NOT NULL, closes_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'open', yes_count INTEGER NOT NULL DEFAULT 0,
 no_count INTEGER NOT NULL DEFAULT 0, closed_at TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX common_asset_proposal_month ON common_proposals(asset_id,kind,month_key);
CREATE INDEX common_proposals_deadline ON common_proposals(status,closes_at);
CREATE TABLE common_votes (
 proposal_id TEXT NOT NULL REFERENCES common_proposals(id),
 user_id TEXT NOT NULL REFERENCES users(id), value INTEGER NOT NULL CHECK(value IN (-1,1)),
 updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY(proposal_id,user_id)
);
CREATE UNIQUE INDEX common_vote_pair ON common_votes(proposal_id,user_id);
