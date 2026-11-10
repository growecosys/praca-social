UPDATE `pokes`
SET `status` = 'seen'
WHERE `seen_at` IS NOT NULL
  AND `status` = 'pending';
