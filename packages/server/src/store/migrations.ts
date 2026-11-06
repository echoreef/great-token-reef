import type { Migration } from './migrate.ts';

// Versioned, forward-only and append-only: never edit an applied migration.

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: 'initial-schema',
    up: [
      `CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE TABLE usage_events (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        kind       TEXT    NOT NULL CHECK (kind IN ('rest', 'ui')),
        name       TEXT    NOT NULL,
        detail     TEXT,
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
      `CREATE INDEX usage_events_created_at ON usage_events (created_at)`,
      `CREATE INDEX usage_events_name ON usage_events (kind, name)`,
      `CREATE TABLE cc_files (
        path       TEXT PRIMARY KEY,
        size       INTEGER NOT NULL DEFAULT 0,
        bytes_read INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`,
      `CREATE TABLE cc_usage (
        request_id                TEXT PRIMARY KEY,
        ts                        INTEGER NOT NULL,
        session_id                TEXT NOT NULL,
        project                   TEXT NOT NULL,
        model                     TEXT NOT NULL,
        input_tokens              INTEGER NOT NULL DEFAULT 0,
        output_tokens             INTEGER NOT NULL DEFAULT 0,
        cache_read_tokens         INTEGER NOT NULL DEFAULT 0,
        cache_w5m_tokens          INTEGER NOT NULL DEFAULT 0,
        cache_w1h_tokens          INTEGER NOT NULL DEFAULT 0,
        cost                      REAL NOT NULL DEFAULT 0,
        agent                     TEXT NOT NULL DEFAULT 'claude' CHECK (agent IN ('claude', 'codex')),
        cost_known                INTEGER NOT NULL DEFAULT 1,
        reasoning_output_tokens   INTEGER NOT NULL DEFAULT 0,
        cache_write_input_tokens  INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE INDEX cc_usage_ts ON cc_usage (ts)`,
      `CREATE INDEX cc_usage_session ON cc_usage (session_id, ts)`,
      `CREATE INDEX cc_usage_agent_ts ON cc_usage (agent, ts)`,
      `CREATE TABLE cc_sessions (
        session_id        TEXT PRIMARY KEY,
        project           TEXT NOT NULL,
        first_ts          INTEGER NOT NULL,
        label             TEXT NOT NULL,
        agent             TEXT NOT NULL DEFAULT 'claude' CHECK (agent IN ('claude', 'codex')),
        native_id         TEXT,
        parent_session_id TEXT,
        model_provider    TEXT,
        source            TEXT,
        ai_title          TEXT
      )`,
      `CREATE TABLE cc_catches (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        seed         TEXT NOT NULL UNIQUE,
        session_id   TEXT NOT NULL,
        catch_index  INTEGER NOT NULL,
        caught_at    INTEGER NOT NULL,
        project      TEXT NOT NULL,
        depth_tokens INTEGER NOT NULL,
        species      INTEGER NOT NULL,
        name         TEXT NOT NULL,
        rarity       TEXT NOT NULL CHECK (rarity IN ('common','uncommon','rare','epic','legendary')),
        shiny        INTEGER NOT NULL DEFAULT 0,
        size         REAL NOT NULL DEFAULT 0
      )`,
      `CREATE INDEX cc_catches_caught ON cc_catches (caught_at)`,
      `CREATE TABLE codex_files (
        path           TEXT PRIMARY KEY,
        size           INTEGER NOT NULL DEFAULT 0,
        bytes_read     INTEGER NOT NULL DEFAULT 0,
        state_json     TEXT NOT NULL DEFAULT '{}',
        parser_version INTEGER NOT NULL DEFAULT 1,
        inode          TEXT NOT NULL DEFAULT '',
        prefix_hash    TEXT NOT NULL DEFAULT '',
        updated_at     INTEGER NOT NULL DEFAULT (unixepoch()),
        last_error     TEXT
      )`,
      `CREATE TABLE codex_limits (
        source        TEXT PRIMARY KEY,
        observed_at   INTEGER NOT NULL,
        snapshot_json TEXT NOT NULL
      )`,
      `CREATE TABLE reef_events (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        kind         TEXT NOT NULL CHECK (kind IN ('pr','ticket','whale','set')),
        ref          TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at   INTEGER NOT NULL,
        UNIQUE(kind, ref)
      )`,
      `CREATE TABLE reef_decor (
        item            TEXT PRIMARY KEY,
        shown           INTEGER NOT NULL DEFAULT 1,
        x_frac          REAL,
        earned_event_id INTEGER NOT NULL,
        earned_at       INTEGER NOT NULL
      )`,
      `CREATE TABLE open_prs (
        id           TEXT PRIMARY KEY,
        repo         TEXT NOT NULL,
        number       INTEGER NOT NULL,
        title        TEXT NOT NULL,
        url          TEXT NOT NULL,
        state        TEXT NOT NULL CHECK (state IN ('draft','ready','approved','changes_requested')),
        needs_me     INTEGER NOT NULL DEFAULT 0,
        bot_findings INTEGER NOT NULL DEFAULT 0,
        created_at   INTEGER NOT NULL
      )`,
      // One statement so all three epochs share the same unixepoch() value; release marks start at 0 so first catches reveal.
      `INSERT OR IGNORE INTO settings (key, value) VALUES
        ('reefEpoch', CAST(unixepoch() AS TEXT)),
        ('codexRewardEpoch', CAST(unixepoch() AS TEXT)),
        ('visitorEpoch', CAST(unixepoch() AS TEXT)),
        ('releasedCatchId', '0'),
        ('releasedEventId', '0')`,
    ],
  },
  {
    version: 2,
    name: 'cc-files-scan-state',
    up: [
      `ALTER TABLE cc_files ADD COLUMN last_error TEXT`,
      // Set while skipping the tail of an oversized line, so a restart does not parse it.
      `ALTER TABLE cc_files ADD COLUMN skip_partial INTEGER NOT NULL DEFAULT 0`,
    ],
  },
  {
    version: 3,
    name: 'expeditions',
    up: [
      `CREATE TABLE expedition_trips (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        depth TEXT NOT NULL CHECK (depth IN ('shallows','reef','dropoff','abyss')),
        party_json TEXT NOT NULL,
        strength INTEGER NOT NULL,
        length_tokens INTEGER NOT NULL,
        started_at INTEGER NOT NULL,
        welcomed_at INTEGER,
        xp_awarded INTEGER
      )`,
      // One party out at a time: at most one row is still waiting to be welcomed home.
      `CREATE UNIQUE INDEX expedition_trips_one_out ON expedition_trips ((welcomed_at IS NULL)) WHERE welcomed_at IS NULL`,
      `CREATE TABLE expedition_finds (
        find TEXT PRIMARY KEY,
        depth TEXT NOT NULL,
        trip_id INTEGER NOT NULL REFERENCES expedition_trips(id),
        found_at INTEGER NOT NULL
      )`,
      `CREATE TABLE expedition_titles (
        species INTEGER NOT NULL,
        title TEXT NOT NULL,
        trip_id INTEGER NOT NULL REFERENCES expedition_trips(id),
        earned_at INTEGER NOT NULL,
        PRIMARY KEY (species, title)
      )`,
      `CREATE TABLE expedition_fish (
        species INTEGER PRIMARY KEY,
        chosen_title TEXT
      )`,
    ],
  },
];
