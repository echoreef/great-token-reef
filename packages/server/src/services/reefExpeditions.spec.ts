import { DEFAULT_TYPICAL_DAY, LEGENDARY_ID_BASE, SPECIES_COUNT, speciesRarity, type Rarity } from '@gtr/shared';
import { describe, expect, it } from 'vitest';
import { fixtureDb } from './fixtures.ts';
import { activeDayTotals, expeditionState } from './reefExpeditions.ts';
import { setSetting } from './settings.ts';

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;
const M = 1_000_000;
const firstOf = (r: Rarity) => Array.from({ length: SPECIES_COUNT }, (_, i) => i).find((i) => speciesRarity(i) === r)!;
const COMMON = firstOf('common');
const RARE = firstOf('rare');
const EPIC = firstOf('epic');
const LEGEND = LEGENDARY_ID_BASE;

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
