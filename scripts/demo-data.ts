import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDb, type Db } from '../packages/server/src/store/db.ts';
import { runMigrations } from '../packages/server/src/store/migrate.ts';
import { MIGRATIONS } from '../packages/server/src/store/migrations.ts';
import { setSetting } from '../packages/server/src/services/settings.ts';
import { ClaudeUsageScanner } from '../packages/server/src/services/claudeUsageScanner.ts';
import { TOK } from '../packages/server/src/services/reefRows.ts';
import { activeDayTotals } from '../packages/server/src/services/reefExpeditions.ts';
import { partyStrength, tripLength, typicalDay } from '../packages/shared/src/expeditions.ts';

// Writes a made-up Claude Code history and an empty Reef database so the app can be run
// (and screenshotted) without touching real session logs. Usage: demo-data.ts <dir>.

interface DemoSession {
  id: string;
  project: string;
  title: string;
  prompt: string;
  model: string;
  tokens: number;
  startedHoursAgo: number;
  endedMinutesAgo: number;
}

const SESSIONS: DemoSession[] = [
  { id: 'a1000000-0000-4000-8000-000000000001', project: 'tidepool-api', title: 'Add rate limiting to the orders endpoint',
    prompt: 'Add rate limiting to the orders endpoint', model: 'claude-opus-5-5', tokens: 620_000_000, startedHoursAgo: 70, endedMinutesAgo: 2 },
  { id: 'a1000000-0000-4000-8000-000000000002', project: 'tidepool-api', title: 'Fix flaky retry test in the queue worker',
    prompt: 'The retry test fails about one run in ten, find out why', model: 'claude-sonnet-5-5', tokens: 140_000_000, startedHoursAgo: 50, endedMinutesAgo: 1800 },
  { id: 'a1000000-0000-4000-8000-000000000003', project: 'kelp-dashboard', title: 'Build the weekly usage chart',
    prompt: 'Build a weekly usage bar chart for the dashboard home page', model: 'claude-opus-5-5', tokens: 45_000_000, startedHoursAgo: 26, endedMinutesAgo: 1440 },
  { id: 'a1000000-0000-4000-8000-000000000004', project: 'kelp-dashboard', title: 'Rename the settings tabs',
    prompt: 'Rename the settings tabs to match the new design', model: 'claude-haiku-5-5', tokens: 38_000_000, startedHoursAgo: 5, endedMinutesAgo: 240 },
  { id: 'a1000000-0000-4000-8000-000000000005', project: 'coral-cli', title: 'Add a --json flag to the list command',
    prompt: 'Add a --json flag to the list command', model: 'claude-sonnet-5-5', tokens: 18_000_000, startedHoursAgo: 3, endedMinutesAgo: 20 },
  { id: 'a1000000-0000-4000-8000-000000000006', project: 'coral-cli', title: 'Plan the plugin loading design',
    prompt: 'Sketch how plugins should be discovered and loaded', model: 'claude-fable-5-1', tokens: 9_500_000, startedHoursAgo: 100, endedMinutesAgo: 5800 },
  { id: 'a1000000-0000-4000-8000-000000000007', project: 'anemone-docs', title: 'Tidy the getting started guide',
    prompt: 'Tidy the getting started guide and fix the broken links', model: 'claude-haiku-5-5', tokens: 6_000_000, startedHoursAgo: 8, endedMinutesAgo: 420 },
  { id: 'a1000000-0000-4000-8000-000000000008', project: 'anemone-docs', title: 'Document the config options',
    prompt: 'Document every config option with an example', model: 'claude-sonnet-5-5', tokens: 2_600_000, startedHoursAgo: 1, endedMinutesAgo: 10 },
  { id: 'a1000000-0000-4000-8000-000000000009', project: 'seaglass-site', title: 'Speed up the landing page',
    prompt: 'The landing page loads slowly on mobile, speed it up', model: 'claude-sonnet-5-5', tokens: 4_000_000, startedHoursAgo: 30, endedMinutesAgo: 1700 },
  { id: 'a1000000-0000-4000-8000-00000000000a', project: 'seaglass-site', title: 'Add a dark mode toggle',
    prompt: 'Add a dark mode toggle to the header', model: 'claude-opus-5-5', tokens: 11_000_000, startedHoursAgo: 12, endedMinutesAgo: 600 },
];

const MESSAGES_PER_SESSION = 40;
const EPOCH_DAYS_AGO = 10;

const dir = process.argv[2];
if (!dir) {
  console.error('usage: demo-data.ts <dir>');
  process.exit(1);
}

// mulberry32: a small seeded generator, so the same demo is produced every run.
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const now = Date.now();
const claudeDir = join(dir, 'claude');
const dataDir = join(dir, 'data');
mkdirSync(join(dir, 'codex'), { recursive: true });
mkdirSync(dataDir, { recursive: true });

// Fish only award for usage after the epoch, so create the database now and move its epoch back.
const db = openDb(join(dataDir, 'reef.db'));
runMigrations(db, MIGRATIONS);
setSetting(db, 'reefEpoch', String(Math.floor(now / 1000) - EPOCH_DAYS_AGO * 86400));
db.close();

for (const [n, s] of SESSIONS.entries()) {
  const rand = seeded(n + 1);
  const cwd = `/Users/demo/projects/${s.project}`;
  const start = now - s.startedHoursAgo * 3600_000;
  const end = now - s.endedMinutesAgo * 60_000;
  const lines: object[] = [
    { type: 'user', sessionId: s.id, cwd, timestamp: new Date(start).toISOString(), message: { role: 'user', content: s.prompt } },
    { type: 'ai-title', sessionId: s.id, aiTitle: s.title },
  ];
  let remaining = s.tokens;
  for (let i = 0; i < MESSAGES_PER_SESSION; i++) {
    const last = i === MESSAGES_PER_SESSION - 1;
    const output = 800 + Math.floor(rand() * 3000);
    const input = 20 + Math.floor(rand() * 200);
    const cacheW5m = 3000 + Math.floor(rand() * 12000);
    const cacheRead = last ? Math.max(0, remaining - output - input - cacheW5m)
      : Math.min(Math.floor((s.tokens / MESSAGES_PER_SESSION) * (0.6 + rand() * 0.8)), Math.max(0, remaining - output - input - cacheW5m));
    remaining -= output + input + cacheW5m + cacheRead;
    const ts = start + ((end - start) * (i + 1)) / MESSAGES_PER_SESSION;
    lines.push({
      type: 'assistant',
      sessionId: s.id,
      requestId: `req_demo_${n}_${i}`,
      cwd,
      timestamp: new Date(ts).toISOString(),
      message: {
        model: s.model,
        usage: {
          input_tokens: input,
          output_tokens: output,
          cache_read_input_tokens: cacheRead,
          cache_creation: { ephemeral_5m_input_tokens: cacheW5m, ephemeral_1h_input_tokens: 0 },
        },
      },
    });
  }
  const projectDir = join(claudeDir, s.project);
  mkdirSync(projectDir, { recursive: true });
  writeFileSync(join(projectDir, `${s.id}.jsonl`), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
}

// Starts the demo partway through: a few levelled fish, titles, three shallows finds, and a reef trip about 60% full.
function seedExpeditions(db: Db, nowS: number): void {
  const species = (db.prepare(
    `SELECT species FROM cc_catches WHERE rarity != 'legendary' GROUP BY species ORDER BY MIN(id) LIMIT 5`,
  ).all() as { species: number }[]).map((r) => r.species);
  if (species.length < 5) return;
  const [a, b, c, d, e] = species as [number, number, number, number, number];
  const trip = db.prepare(
    `INSERT INTO expedition_trips (depth, party_json, strength, length_tokens, started_at, welcomed_at, xp_awarded)
     VALUES (?, ?, ?, 1, ?, ?, ?)`,
  );
  const past = (depth: string, party: number[], strength: number, daysAgo: number, xp: number) =>
    Number(trip.run(depth, JSON.stringify(party), strength, nowS - daysAgo * 86400, nowS - daysAgo * 86400, xp).lastInsertRowid);
  // Levels 5 to 15: a 105 experience, b 45, c 10, d 95, e 60.
  const s1 = past('shallows', [a, b, c], 12, 9, 4);
  const s2 = past('shallows', [a, b, c], 14, 8, 3);
  const s3 = past('shallows', [a, b, c], 15, 7, 3);
  const r1 = past('reef', [a, b, d], 30, 5, 35);
  const r2 = past('reef', [a, d, e], 33, 2, 60);
  const find = db.prepare(`INSERT INTO expedition_finds (find, depth, trip_id, found_at) VALUES (?, 'shallows', ?, ?)`);
  find.run('shallows-rubber-duck', s1, nowS - 9 * 86400);
  find.run('shallows-sand-dollar', s2, nowS - 8 * 86400);
  find.run('shallows-bottle-message', s3, nowS - 7 * 86400);
  const title = db.prepare('INSERT INTO expedition_titles (species, title, trip_id, earned_at) VALUES (?, ?, ?, ?)');
  const earn = (s: number, t: string, tripId: number, daysAgo: number) => title.run(s, t, tripId, nowS - daysAgo * 86400);
  for (const s of [a, b, c]) earn(s, 'treasure-hunter', s1, 9);
  for (const s of [a, b, d]) earn(s, 'reef-runner', r1, 5);
  for (const s of [a, b]) earn(s, 'riptide', r1, 5);
  for (const s of [d, e]) earn(s, 'riptide', r2, 2);
  earn(e, 'reef-runner', r2, 2);
  // The open reef trip is one typical day long and about 60% full.
  const length = tripLength('reef', typicalDay(activeDayTotals(db, nowS)));
  const rows = db.prepare(`SELECT ts, ${TOK} AS t FROM cc_usage ORDER BY ts DESC`).all() as { ts: number; t: number }[];
  let filled = 0;
  let start = nowS;
  for (const r of rows) {
    if (filled >= length * 0.6) break;
    filled += r.t;
    start = r.ts;
  }
  const strength = partyStrength([{ species: b, xp: 45 }, { species: c, xp: 10 }, { species: e, xp: 60 }], new Set());
  db.prepare(
    'INSERT INTO expedition_trips (depth, party_json, strength, length_tokens, started_at) VALUES (?, ?, ?, ?, ?)',
  ).run('reef', JSON.stringify([b, c, e]), strength, length, start);
}

// Scan now so the seed can use species the demo will catch; the server's own scan then finds nothing new.
const seedDb = openDb(join(dataDir, 'reef.db'));
new ClaudeUsageScanner({ db: seedDb, dir: claudeDir }).scan();
seedExpeditions(seedDb, Math.floor(now / 1000));
seedDb.close();

console.log(`demo data written to ${dir} (${SESSIONS.length} sessions)`);
