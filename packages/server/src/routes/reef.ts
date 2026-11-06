import {
  fishPickBody, ReefAgentFilter, ReefBackdropBody, ReefBudgetsBody, ReefDecorBody, ReefReleaseBody, type ReefScanResult,
} from '@gtr/shared';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { AppEnv } from '../app.ts';
import { reefClaude } from './reefClaude.ts';
import { reefCodex } from './reefCodex.ts';
import { reefExpeditions } from './reefExpeditions.ts';
import { refreshOfficialLimits } from '../services/reefLimits.ts';
import { reefCatchesByDate, reefCollection } from '../services/reefCollection.ts';
import { reefPending, releaseReef } from '../services/reefRelease.ts';
import { getReefBudgets, setReefBudgets } from '../services/reefState.ts';
import { reefModels, reefProjects, reefSessions, reefSummary, reefTrend } from '../services/reefStats.ts';
import { FISH_CAPS, reefFishPicks, setReefFishPick } from '../services/reefFish.ts';
import { listOpenPrs } from '../services/openPrs.ts';
import { reefRewards, setReefBackdrop, setReefDecor } from '../services/reefSets.ts';

// The Reef — Claude Code and Codex usage + fishing companion. Thin adapters only; the
// scanners and all SQL live in services/.

const daysParam = (raw: string | undefined, fallback: number) =>
  z.coerce.number().int().min(1).max(3650).default(fallback).parse(raw ?? fallback);

const limitParam = (raw: string | undefined) => {
  const parsed = z.coerce.number().int().min(1).max(200).safeParse(raw ?? 20);
  if (!parsed.success) throw new HTTPException(400, { message: 'limit must be an integer from 1 to 200' });
  return parsed.data;
};

const agentParam = (raw: string | undefined) => {
  const parsed = ReefAgentFilter.safeParse(raw ?? 'claude');
  if (!parsed.success) throw new HTTPException(400, { message: 'agent must be all, claude, or codex' });
  return parsed.data;
};

export const reef = new Hono<AppEnv>()
  .route('/claude', reefClaude)
  .route('/codex', reefCodex)
  .route('/expeditions', reefExpeditions)
  .get('/summary', (c) => c.json(reefSummary(c.get('db'), agentParam(c.req.query('agent')))))
  .get('/trend', (c) => c.json(reefTrend(c.get('db'), daysParam(c.req.query('days'), 30), agentParam(c.req.query('agent')))))
  .get('/models', (c) => c.json(reefModels(c.get('db'), daysParam(c.req.query('days'), 30), agentParam(c.req.query('agent')))))
  .get('/projects', (c) => c.json(reefProjects(c.get('db'), daysParam(c.req.query('days'), 30), agentParam(c.req.query('agent')))))
  .get('/sessions', (c) => c.json(reefSessions(c.get('db'), daysParam(c.req.query('days'), 7), limitParam(c.req.query('limit')), agentParam(c.req.query('agent')))))
  .get('/collection', (c) => c.json(reefCollection(c.get('db'))))
  .get('/catches', (c) =>
    c.json(
      reefCatchesByDate(c.get('db'), {
        date: c.req.query('date'),
        rarity: c.req.query('rarity'),
      }),
    ),
  )
  .get('/pending', (c) => c.json(reefPending(c.get('db'))))
  .post('/release', async (c) => {
    const body = ReefReleaseBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'expected { upToId, upToEventId? } (non-negative integers)' }, 400);
    const result = releaseReef(c.get('db'), body.data.upToId, body.data.upToEventId);
    c.get('bus')?.emit('reef');
    return c.json(result);
  })
  .get('/prs', (c) => c.json(listOpenPrs(c.get('db'))))
  .get('/rewards', (c) => c.json(reefRewards(c.get('db'))))
  .put('/decor/:item', async (c) => {
    const body = ReefDecorBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'expected { shown?: boolean, xFrac?: number 0..1 }' }, 400);
    const result = setReefDecor(c.get('db'), c.req.param('item'), body.data);
    if (!result) return c.json({ error: 'no released decor piece with that name' }, 404);
    if (result.changed) c.get('bus')?.emit('reef');
    return c.json(result.rewards);
  })
  .put('/backdrop', async (c) => {
    const body = ReefBackdropBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'expected { backdrop }' }, 400);
    const result = setReefBackdrop(c.get('db'), body.data.backdrop);
    if (!result) return c.json({ error: 'backdrop must be open-water or a released backdrop' }, 400);
    c.get('bus')?.emit('reef');
    return c.json(result);
  })
  .get('/fish', (c) => c.json(reefFishPicks(c.get('db'))))
  .put('/fish/:view', async (c) => {
    const view = z.enum(['strip', 'full']).safeParse(c.req.param('view'));
    if (!view.success) return c.json({ error: 'view must be strip or full' }, 404);
    const body = fishPickBody(view.data).safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: `expected { species: integer[] } with at most ${FISH_CAPS[view.data]} unique entries` }, 400);
    const result = setReefFishPick(c.get('db'), view.data, body.data.species);
    if ('error' in result) return c.json({ error: result.error }, 400);
    c.get('bus')?.emit('reef');
    return c.json(reefFishPicks(c.get('db')));
  })
  .get('/budgets', (c) => c.json(getReefBudgets(c.get('db'))))
  .put('/budgets', async (c) => {
    const body = ReefBudgetsBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'expected { window5h, week } (tokens or null)' }, 400);
    return c.json(setReefBudgets(c.get('db'), body.data));
  })
  .post('/scan', (c) => {
    const scanner = c.get('reefScanner');
    const codex = c.get('codexScanner');
    if (!scanner && !codex) return c.json({ error: 'scanner not running' }, 503);
    const claudeResult = scanner?.scan() ?? { files: 0, messages: 0, catches: 0 };
    const codexResult = codex?.scan() ?? { files: 0, messages: 0, catches: 0 };
    const result: ReefScanResult = {
      files: claudeResult.files + codexResult.files,
      messages: claudeResult.messages + codexResult.messages,
      catches: claudeResult.catches + codexResult.catches,
    };
    return c.json(result);
  })
  // Official plan limits via Claude Code's own OAuth token.
  // Manual refresh only — undocumented endpoint, never polled.
  .post('/limits/refresh', async (c) => {
    try {
      return c.json(await refreshOfficialLimits(c.get('db')));
    } catch (err) {
      return c.json({ error: (err as Error).message }, 502);
    }
  });
