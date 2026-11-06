import { DEFAULT_TYPICAL_DAY, LEGENDARY_ID_BASE, SPECIES_COUNT, findsAt, speciesRarity, type Rarity } from '@gtr/shared';
import { describe, expect, it } from 'vitest';
import { fixtureDb } from './fixtures.ts';
import { activeDayTotals, chooseTitle, expeditionState, startExpedition, welcomeHome } from './reefExpeditions.ts';
import { setSetting } from './settings.ts';

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;
const M = 1_000_000;
const firstOf = (r: Rarity) => Array.from({ length: SPECIES_COUNT }, (_, i) => i).find((i) => speciesRarity(i) === r)!;
const COMMON = firstOf('common');
const RARE = firstOf('rare');
const EPIC = firstOf('epic');
const LEGEND = LEGENDARY_ID_BASE;
const always = () => () => 0;
const never = () => () => 0.99;

type TestDb = ReturnType<typeof fixtureDb>;
let usageId = 0;
const addUsage = (db: TestDb, ts: number, tokens: number, agent: 'claude' | 'codex' = 'claude') =>
  db.prepare(
    `INSERT INTO cc_usage (request_id, ts, session_id, project, model, output_tokens, agent)
     VALUES (?, ?, 's', '/p', 'claude-fable-5', ?, ?)`,
  ).run(`u${usageId++}`, ts, tokens, agent);
const release = (db: TestDb, species: number[]) => {
  for (const s of species) {
    db.prepare(
      `INSERT INTO cc_catches (seed, session_id, catch_index, caught_at, project, depth_tokens, species, name, rarity)
       VALUES (?, 's', 0, ?, '/p', 1, ?, 'x', ?)`,
    ).run(`seed#${s}`, NOW, s, speciesRarity(s));
  }
  setSetting(db, 'releasedCatchId', String(species.length));
};
const tank = () => {
  const db = fixtureDb();
  release(db, [COMMON, RARE, EPIC, LEGEND, LEGEND + 1]);
  return db;
};

describe('active days', () => {
  it('lists finished days with counted usage, newest first, leaving out today', () => {
    const db = fixtureDb();
    addUsage(db, NOW, 999 * M);
    addUsage(db, NOW - DAY, 30 * M);
    addUsage(db, NOW - 3 * DAY, 10 * M);
    addUsage(db, NOW - 3 * DAY, 5 * M);
    addUsage(db, NOW - 2 * DAY, 70 * M, 'codex');
    expect(activeDayTotals(db, NOW)).toEqual([30 * M, 15 * M]);
  });
  it('counts Codex from its reward epoch', () => {
    const db = fixtureDb();
    setSetting(db, 'codexRewardEpoch', String(NOW - 10 * DAY));
    addUsage(db, NOW - 2 * DAY, 70 * M, 'codex');
    expect(activeDayTotals(db, NOW)).toEqual([70 * M]);
  });
});

describe('expedition state', () => {
  it('lists released fish at level 1 with no trip, on the default typical day', () => {
    const s = expeditionState(tank(), NOW);
    expect(s.typicalDayTokens).toBe(DEFAULT_TYPICAL_DAY);
    expect(s.trip).toBeNull();
    expect(s.fish.map((f) => f.species)).toEqual([COMMON, RARE, EPIC, LEGEND, LEGEND + 1]);
    expect(s.fish[0]).toEqual({ species: COMMON, xp: 0, level: 1, trips: 0, strength: 1, titles: [], chosenTitle: null, shownTitle: null });
  });
});

describe('starting a trip', () => {
  it('locks the party strength and the trip length', () => {
    const db = tank();
    for (const d of [1, 2, 3]) addUsage(db, NOW - d * DAY, 100 * M);
    const r = startExpedition(db, { depth: 'reef', party: [COMMON, RARE, LEGEND] }, NOW);
    expect(r.ok && r.value.trip).toMatchObject({ depth: 'reef', party: [COMMON, RARE, LEGEND], strength: 1 + 7 + 16, lengthTokens: 100 * M, progressTokens: 0, returned: false });
  });
  it('refuses a broken party', () => {
    const db = tank();
    expect(startExpedition(db, { depth: 'reef', party: [COMMON, RARE, 9999] }, NOW)).toEqual({ ok: false, status: 400, error: 'only fish already released into the tank can go' });
    expect(startExpedition(db, { depth: 'reef', party: [COMMON, LEGEND, LEGEND + 1] }, NOW)).toMatchObject({ ok: false, status: 400 });
  });
  it('keeps one party out at a time', () => {
    const db = tank();
    expect(startExpedition(db, { depth: 'shallows', party: [COMMON, RARE, EPIC] }, NOW).ok).toBe(true);
    expect(startExpedition(db, { depth: 'shallows', party: [COMMON, RARE, EPIC] }, NOW)).toEqual({ ok: false, status: 409, error: 'a party is already out' });
  });
});

describe('trip progress', () => {
  it('counts every token kind fish count, from the start, and Codex only from its reward start', () => {
    const db = tank();
    setSetting(db, 'codexRewardEpoch', String(NOW + 100));
    startExpedition(db, { depth: 'shallows', party: [COMMON, RARE, EPIC] }, NOW);
    const add = db.prepare(
      `INSERT INTO cc_usage (request_id, ts, session_id, project, model, agent,
         input_tokens, output_tokens, cache_read_tokens, cache_w5m_tokens, cache_w1h_tokens)
       VALUES (?, ?, 's', '/p', 'm', ?, 1, 2, 3, 4, 5)`,
    );
    add.run('before-start', NOW - 10, 'claude');
    add.run('claude', NOW + 10, 'claude');
    add.run('codex-early', NOW + 50, 'codex');
    add.run('codex-late', NOW + 200, 'codex');
    expect(expeditionState(db, NOW + 300).trip?.progressTokens).toBe(30);
  });
});

describe('welcoming a party home', () => {
  it('leaves the trip open and unpaid when the welcome fails part-way', () => {
    const db = tank();
    startExpedition(db, { depth: 'shallows', party: [COMMON, RARE, EPIC] }, NOW);
    addUsage(db, NOW + 10, DEFAULT_TYPICAL_DAY);
    db.exec(`CREATE TRIGGER boom BEFORE INSERT ON expedition_titles BEGIN SELECT RAISE(ABORT, 'boom'); END`);
    expect(() => welcomeHome(db, NOW + 20, always)).toThrow('boom');
    const s = expeditionState(db, NOW + 20);
    expect(s.trip).toMatchObject({ returned: true });
    expect(s.finds).toEqual([]);
    expect(s.fish.every((f) => f.xp === 0)).toBe(true);
    db.exec('DROP TRIGGER boom');
    expect(welcomeHome(db, NOW + 30, always).ok).toBe(true);
  });

  it('waits until the trip is full', () => {
    const db = tank();
    startExpedition(db, { depth: 'shallows', party: [COMMON, RARE, EPIC] }, NOW);
    addUsage(db, NOW + 10, DEFAULT_TYPICAL_DAY / 8);
    expect(expeditionState(db, NOW + 20).trip).toMatchObject({ progressTokens: DEFAULT_TYPICAL_DAY / 8, returned: false });
    expect(welcomeHome(db, NOW + 20, never)).toEqual({ ok: false, status: 409, error: 'the party is still out' });
    addUsage(db, NOW + 30, DEFAULT_TYPICAL_DAY);
    expect(expeditionState(db, NOW + 40).trip).toMatchObject({ progressTokens: DEFAULT_TYPICAL_DAY / 4, returned: true });
  });
  it('pays every fish, closes the trip and records a find', () => {
    const db = tank();
    startExpedition(db, { depth: 'shallows', party: [COMMON, RARE, EPIC] }, NOW);
    addUsage(db, NOW + 10, DEFAULT_TYPICAL_DAY);
    const r = welcomeHome(db, NOW + 20, always);
    if (!r.ok) throw new Error(r.error);
    expect(r.value).toMatchObject({ depth: 'shallows', party: [COMMON, RARE, EPIC], xp: 1, find: findsAt('shallows')[0]!.id });
    expect(r.value.titles).toEqual([COMMON, RARE, EPIC].map((species) => ({ species, title: 'treasure-hunter' })));
    expect(r.value.state.trip).toBeNull();
    expect(r.value.state.fish.find((f) => f.species === RARE)).toMatchObject({ xp: 1, level: 2, trips: 1, shownTitle: 'treasure-hunter' });
    expect(r.value.state.finds).toEqual([{ id: findsAt('shallows')[0]!.id, depth: 'shallows', tripId: 1, party: [COMMON, RARE, EPIC], foundAt: NOW + 20 }]);
    expect(welcomeHome(db, NOW + 30, always)).toEqual({ ok: false, status: 409, error: 'no party is out' });
  });
  it('gives the log title to the party that finds its last item', () => {
    const db = tank();
    db.prepare(`INSERT INTO expedition_trips (depth, party_json, strength, length_tokens, started_at, welcomed_at, xp_awarded)
      VALUES ('shallows', '[]', 0, 1, ?, ?, 0)`).run(NOW - 10, NOW - 5);
    for (const f of findsAt('shallows').slice(0, 7)) {
      db.prepare('INSERT INTO expedition_finds (find, depth, trip_id, found_at) VALUES (?, ?, 1, ?)').run(f.id, 'shallows', NOW - 5);
    }
    startExpedition(db, { depth: 'shallows', party: [COMMON, RARE, EPIC] }, NOW);
    addUsage(db, NOW + 10, DEFAULT_TYPICAL_DAY);
    const r = welcomeHome(db, NOW + 20, always);
    expect(r.ok && r.value.find).toBe(findsAt('shallows')[7]!.id);
    expect(r.ok && r.value.titles.filter((t) => t.title === 'beachcomber').map((t) => t.species)).toEqual([COMMON, RARE, EPIC]);
  });
  it('pays a share and finds nothing below the recommended strength', () => {
    const db = tank();
    startExpedition(db, { depth: 'reef', party: [COMMON, RARE, EPIC] }, NOW);
    addUsage(db, NOW + 10, DEFAULT_TYPICAL_DAY);
    const r = welcomeHome(db, NOW + 20, always);
    expect(r.ok && { xp: r.value.xp, find: r.value.find }).toEqual({ xp: Math.floor((4 * 19) / 27), find: null });
  });
});

describe('choosing a title', () => {
  it('shows a chosen title the fish holds and refuses one it does not', () => {
    const db = tank();
    startExpedition(db, { depth: 'shallows', party: [COMMON, RARE, EPIC] }, NOW);
    addUsage(db, NOW + 10, DEFAULT_TYPICAL_DAY);
    welcomeHome(db, NOW + 20, always);
    expect(chooseTitle(db, RARE, 'leviathan', NOW)).toEqual({ ok: false, status: 400, error: 'that fish has not earned that title' });
    expect(chooseTitle(db, 9999, null, NOW)).toEqual({ ok: false, status: 400, error: 'only fish in the tank can hold a title' });
    const r = chooseTitle(db, RARE, 'treasure-hunter', NOW);
    expect(r.ok && r.value.fish.find((f) => f.species === RARE)?.chosenTitle).toBe('treasure-hunter');
    const cleared = chooseTitle(db, RARE, null, NOW);
    expect(cleared.ok && cleared.value.fish.find((f) => f.species === RARE)?.chosenTitle).toBeNull();
  });
});
