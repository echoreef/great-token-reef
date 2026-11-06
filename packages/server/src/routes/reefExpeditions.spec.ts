import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ReefExpeditionWelcome, ReefExpeditions, SPECIES_COUNT, speciesRarity, type Rarity } from '@gtr/shared';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { createApp } from '../app.ts';
import { Bus } from '../services/bus.ts';
import { ClaudeUsageScanner } from '../services/claudeUsageScanner.ts';
import { CodexUsageScanner } from '../services/codexUsageScanner.ts';
import { fakeConnectDeps, fixtureDb } from '../services/fixtures.ts';
import { setSetting } from '../services/settings.ts';

// Expedition routes end to end against the shared schemas the web reads.

const NOW = Math.floor(Date.now() / 1000);
const firstOf = (r: Rarity) => Array.from({ length: SPECIES_COUNT }, (_, i) => i).find((i) => speciesRarity(i) === r)!;
const PARTY = [firstOf('common'), firstOf('rare'), firstOf('epic')];

let root: string;
let db: ReturnType<typeof fixtureDb>;
let bus: Bus;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  vi.spyOn(console, 'log').mockImplementation(() => {});
  root = mkdtempSync(join(tmpdir(), 'reef-expeditions-'));
  db = fixtureDb();
  PARTY.forEach((s, i) => db.prepare(
    `INSERT INTO cc_catches (seed, session_id, catch_index, caught_at, project, depth_tokens, species, name, rarity)
     VALUES (?, 's', ?, ?, '/p', 1, ?, 'x', ?)`,
  ).run(`seed#${i}`, i, NOW, s, speciesRarity(s)));
  setSetting(db, 'releasedCatchId', String(PARTY.length));
  bus = new Bus();
  app = createApp({
    db, bus, connect: fakeConnectDeps(),
    reefScanner: new ClaudeUsageScanner({ db, dir: join(root, 'claude') }),
    codexScanner: new CodexUsageScanner({ db, roots: [] }),
  });
});

afterAll(() => {
  vi.restoreAllMocks();
  rmSync(root, { recursive: true, force: true });
});

const call = (method: string, path: string, body?: unknown) => app.request(path, {
  method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
});
async function parse<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
  expect(res.status).toBe(200);
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) throw new Error(z.prettifyError(parsed.error));
  return parsed.data;
}

describe('expedition routes', () => {
  it('GET /api/reef/expeditions', async () => {
    const s = await parse(await app.request('/api/reef/expeditions'), ReefExpeditions);
    expect(s.fish.map((f) => f.species)).toEqual([...PARTY].sort((a, b) => a - b));
    expect(s.trip).toBeNull();
  });

  it('POST /start refuses a bad body and a broken party', async () => {
    expect((await call('POST', '/api/reef/expeditions/start', { depth: 'moon', party: PARTY })).status).toBe(400);
    const res = await call('POST', '/api/reef/expeditions/start', { depth: 'reef', party: [PARTY[0], PARTY[0], PARTY[1]] });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'a fish can only join a party once' });
  });

  it('POST /start, /welcome and PUT /fish/:species/title', async () => {
    const seen: string[] = [];
    bus.subscribe((m) => void seen.push(m.type));
    const started = await parse(await call('POST', '/api/reef/expeditions/start', { depth: 'shallows', party: PARTY }), ReefExpeditions);
    expect(started.trip?.returned).toBe(false);
    expect((await call('POST', '/api/reef/expeditions/start', { depth: 'shallows', party: PARTY })).status).toBe(409);
    expect((await call('POST', '/api/reef/expeditions/welcome')).status).toBe(409);
    db.prepare(`INSERT INTO cc_usage (request_id, ts, session_id, project, model, output_tokens) VALUES ('w', ?, 's', '/p', 'm', ?)`)
      .run(NOW + 60, started.trip!.lengthTokens);
    const home = await parse(await call('POST', '/api/reef/expeditions/welcome'), ReefExpeditionWelcome);
    expect(home.xp).toBe(1);
    expect(home.state.trip).toBeNull();
    expect((await call('PUT', `/api/reef/expeditions/fish/${PARTY[0]}/title`, { title: 'leviathan' })).status).toBe(400);
    expect((await call('PUT', '/api/reef/expeditions/fish/x/title', { title: null })).status).toBe(400);
    await parse(await call('PUT', `/api/reef/expeditions/fish/${PARTY[0]}/title`, { title: null }), ReefExpeditions);
    expect(seen).toEqual(['reef', 'reef', 'reef']);
  });
});
