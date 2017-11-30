CREATE TABLE migrations (
  file_id       int PRIMARY KEY,
  run_at    timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE companies ADD COLUMN employees INT NULL;