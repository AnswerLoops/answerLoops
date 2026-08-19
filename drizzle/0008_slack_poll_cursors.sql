CREATE TABLE IF NOT EXISTS slack_poll_cursors (
  org_id     INTEGER NOT NULL,
  channel_id TEXT    NOT NULL,
  last_ts    TEXT    NOT NULL DEFAULT '0',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, channel_id)
);
