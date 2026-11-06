import {
  DEPTH_RULES, TYPICAL_WINDOW, fishStrength, isTitleId, levelForXp, shownTitle, typicalDay,
  type Depth, type FishRecord, type ReefExpeditionFind, type ReefExpeditionTrip, type ReefExpeditions, type TitleId,
} from '@gtr/shared';
import type { Db } from '../store/db.ts';
import { getReleasedEventId } from './reefEvents.ts';
import { TOK } from './reefRows.ts';
import { getReleasedCatchId, readCodexRewardEpoch } from './reefState.ts';

// Expeditions: trips are stored, progress is never. A trip fills from counted usage since it started.

export type ExpeditionResult<T> = { ok: true; value: T } | { ok: false; status: 400 | 409; error: string };

/** The same usage that earns fish: all Claude, and Codex from its reward epoch. */
const COUNTED = `(agent = 'claude' OR ts >= ?)`;
/** how far back to look for active days */
const LOOKBACK = 365 * 86400;

interface TripRow {
  id: number;
  depth: Depth;
  party_json: string;
  strength: number;
  length_tokens: number;
  started_at: number;
}

/** Finished active days, newest first: local days before today with any counted usage. */
export function activeDayTotals(db: Db, now: number): number[] {
  const rows = db.prepare(
    `SELECT date(ts, 'unixepoch', 'localtime') AS day, SUM(${TOK}) AS tokens FROM cc_usage
     WHERE ts >= ? AND ${COUNTED} AND date(ts, 'unixepoch', 'localtime') < date(?, 'unixepoch', 'localtime')
     GROUP BY day HAVING tokens > 0 ORDER BY day DESC LIMIT ?`,
  ).all(now - LOOKBACK, readCodexRewardEpoch(db), now, TYPICAL_WINDOW) as { tokens: number }[];
  return rows.map((r) => r.tokens);
}

function tokensSince(db: Db, since: number): number {
  const row = db.prepare(`SELECT COALESCE(SUM(${TOK}), 0) AS tokens FROM cc_usage WHERE ts >= ? AND ${COUNTED}`)
    .get(since, readCodexRewardEpoch(db)) as { tokens: number };
  return row.tokens;
}

function releasedSpecies(db: Db): Set<number> {
  const rows = db.prepare('SELECT DISTINCT species FROM cc_catches WHERE id <= ?').all(getReleasedCatchId(db)) as { species: number }[];
  return new Set(rows.map((r) => r.species));
}

/** Completed sets whose reward has been released, so a bonus never spoils a waiting set. */
function completedSets(db: Db): Set<string> {
  const rows = db.prepare(`SELECT ref FROM reef_events WHERE kind = 'set' AND id <= ?`).all(getReleasedEventId(db)) as { ref: string }[];
  return new Set(rows.map((r) => r.ref));
}

function openTrip(db: Db): TripRow | null {
  return (db.prepare(
    'SELECT id, depth, party_json, strength, length_tokens, started_at FROM expedition_trips WHERE welcomed_at IS NULL',
  ).get() as TripRow | undefined) ?? null;
}

function fishRecords(db: Db): Map<number, FishRecord> {
  const records = new Map<number, { xp: number; trips: number; fullDepths: Set<Depth>; finds: number }>();
  const trips = db.prepare(
    `SELECT CAST(j.value AS INTEGER) AS species, t.depth, t.strength, t.xp_awarded,
            (SELECT COUNT(*) FROM expedition_finds f WHERE f.trip_id = t.id) AS finds
     FROM expedition_trips t, json_each(t.party_json) j WHERE t.welcomed_at IS NOT NULL`,
  ).all() as { species: number; depth: Depth; strength: number; xp_awarded: number; finds: number }[];
  for (const t of trips) {
    const r = records.get(t.species) ?? { xp: 0, trips: 0, fullDepths: new Set<Depth>(), finds: 0 };
    r.xp += t.xp_awarded;
    r.trips++;
    r.finds += t.finds;
    if (t.strength >= DEPTH_RULES[t.depth].recommended) r.fullDepths.add(t.depth);
    records.set(t.species, r);
  }
  return records;
}

/** Earned titles per species, newest first. */
function earnedTitles(db: Db): Map<number, TitleId[]> {
  const rows = db.prepare('SELECT species, title FROM expedition_titles ORDER BY earned_at DESC, rowid DESC').all() as { species: number; title: string }[];
  const out = new Map<number, TitleId[]>();
  for (const r of rows) if (isTitleId(r.title)) out.set(r.species, [...(out.get(r.species) ?? []), r.title]);
  return out;
}

function chosenTitles(db: Db): Map<number, TitleId> {
  const rows = db.prepare('SELECT species, chosen_title FROM expedition_fish WHERE chosen_title IS NOT NULL').all() as { species: number; chosen_title: string }[];
  return new Map(rows.filter((r) => isTitleId(r.chosen_title)).map((r) => [r.species, r.chosen_title as TitleId]));
}

function tripView(db: Db, t: TripRow): ReefExpeditionTrip {
  const progress = Math.min(t.length_tokens, tokensSince(db, t.started_at));
  return {
    id: t.id, depth: t.depth, party: JSON.parse(t.party_json) as number[], strength: t.strength,
    lengthTokens: t.length_tokens, progressTokens: progress, startedAt: t.started_at, returned: progress >= t.length_tokens,
  };
}

function findRows(db: Db): ReefExpeditionFind[] {
  const rows = db.prepare(
    `SELECT f.find, f.depth, f.trip_id, f.found_at, t.party_json FROM expedition_finds f
     JOIN expedition_trips t ON t.id = f.trip_id ORDER BY f.found_at, f.rowid`,
  ).all() as { find: string; depth: Depth; trip_id: number; found_at: number; party_json: string }[];
  return rows.map((r) => ({ id: r.find, depth: r.depth, tripId: r.trip_id, party: JSON.parse(r.party_json) as number[], foundAt: r.found_at }));
}

export function expeditionState(db: Db, now: number): ReefExpeditions {
  const completed = completedSets(db);
  const records = fishRecords(db);
  const titles = earnedTitles(db);
  const chosen = chosenTitles(db);
  const fish = [...releasedSpecies(db)].sort((a, b) => a - b).map((species) => {
    const r = records.get(species);
    const xp = r?.xp ?? 0;
    const earned = titles.get(species) ?? [];
    const pick = chosen.get(species) ?? null;
    return {
      species, xp, level: levelForXp(xp), trips: r?.trips ?? 0, strength: fishStrength(species, xp, completed),
      titles: earned, chosenTitle: pick, shownTitle: shownTitle(earned, pick),
    };
  });
  const open = openTrip(db);
  return { typicalDayTokens: typicalDay(activeDayTotals(db, now)), trip: open && tripView(db, open), fish, finds: findRows(db) };
}
