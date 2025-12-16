-- Initial schema for CivBuilder
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS area_states (
  area_id TEXT PRIMARY KEY,
  state JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS area_owners (
  area_id TEXT PRIMARY KEY,
  owner_id TEXT
);
