CREATE TABLE post_images (
 id TEXT PRIMARY KEY NOT NULL,
 user_id TEXT NOT NULL REFERENCES users(id),
 prompt TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending',
 image_key TEXT,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX post_images_user_status ON post_images(user_id,status);
