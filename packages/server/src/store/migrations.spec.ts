import { describe, expect, it } from 'vitest';
import { openDb } from './db.ts';
import { runMigrations } from './migrate.ts';
import { MIGRATIONS } from './migrations.ts';

const TABLES = [
  'cc_usage', 'cc_sessions', 'cc_files', 'cc_catches', 'codex_files', 'codex_limits',
  'reef_events', 'reef_decor', 'usage_events', 'settings', 'open_prs', 'migrations',
  'expedition_trips', 'expedition_finds', 'expedition_titles', 'expedition_fish',
];

describe('migrations', () => {
  it('creates every table, seeds the epochs, and is idempotent', () => {
    const db = openDb(':memory:');
    expect(runMigrations(db, MIGRATIONS)).toEqual([1, 2, 3]);
    const names = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((r) => r.name);
    for (const t of TABLES) expect(names).toContain(t);
    expect(names.filter((n) => n.startsWith('nb2_'))).toEqual([]);

    const get = (k: string) => (db.prepare('SELECT value FROM settings WHERE key = ?').get(k) as { value: string }).value;
    expect(get('reefEpoch')).toMatch(/^\d+$/);
    expect(get('codexRewardEpoch')).toBe(get('reefEpoch'));
    expect(get('visitorEpoch')).toBe(get('reefEpoch'));

    expect(runMigrations(db, MIGRATIONS)).toEqual([]);
  });

  it('adds scan state to cc_files without moving existing offsets', () => {
    const db = openDb(':memory:');
    runMigrations(db, MIGRATIONS.filter((m) => m.version === 1));
    db.prepare("INSERT INTO cc_files (path, size, bytes_read) VALUES ('proj/s.jsonl', 900, 800)").run();
    expect(runMigrations(db, MIGRATIONS)).toEqual([2, 3]);
    expect(db.prepare('SELECT bytes_read, last_error, skip_partial FROM cc_files').get())
      .toEqual({ bytes_read: 800, last_error: null, skip_partial: 0 });
  });

  it('restricts usage_events kind to rest and ui', () => {
    const db = openDb(':memory:');
    runMigrations(db, MIGRATIONS);
    expect(() => db.prepare("INSERT INTO usage_events (kind, name) VALUES ('mcp', 'x')").run()).toThrow();
  });

  it('keeps one expedition party out at a time and only known depths', () => {
    const db = openDb(':memory:');
    runMigrations(db, MIGRATIONS);
    const add = (depth: string) => db.prepare(
      'INSERT INTO expedition_trips (depth, party_json, strength, length_tokens, started_at) VALUES (?, ?, 1, 1, 1)',
    ).run(depth, '[1,2,3]');
    add('reef');
    expect(() => add('reef')).toThrow(/UNIQUE/);
    db.prepare('UPDATE expedition_trips SET welcomed_at = 2').run();
    expect(() => add('abyss')).not.toThrow();
    db.prepare('UPDATE expedition_trips SET welcomed_at = 3').run();
    expect(() => add('moon')).toThrow(/CHECK/);
  });
});
