import { ReefExpeditionStartBody, ReefExpeditionTitleBody } from '@gtr/shared';
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv } from '../app.ts';
import { chooseTitle, expeditionState, startExpedition, welcomeHome } from '../services/reefExpeditions.ts';

const now = () => Math.floor(Date.now() / 1000);
const speciesParam = z.coerce.number().int().nonnegative();

export const reefExpeditions = new Hono<AppEnv>()
  .get('/', (c) => c.json(expeditionState(c.get('db'), now())))
  .post('/start', async (c) => {
    const body = ReefExpeditionStartBody.safeParse(await c.req.json().catch(() => null));
    if (!body.success) return c.json({ error: 'expected { depth, party } (a depth and three species ids)' }, 400);
    const result = startExpedition(c.get('db'), body.data, now());
    if (!result.ok) return c.json({ error: result.error }, result.status);
    c.get('bus')?.emit('reef');
    return c.json(result.value);
  })
  .post('/welcome', (c) => {
    const result = welcomeHome(c.get('db'), now());
    if (!result.ok) return c.json({ error: result.error }, result.status);
    c.get('bus')?.emit('reef');
    return c.json(result.value);
  })
  .put('/fish/:species/title', async (c) => {
    const species = speciesParam.safeParse(c.req.param('species'));
    const body = ReefExpeditionTitleBody.safeParse(await c.req.json().catch(() => null));
    if (!species.success || !body.success) return c.json({ error: 'expected a species id and { title } (a title id or null)' }, 400);
    const result = chooseTitle(c.get('db'), species.data, body.data.title, now());
    if (!result.ok) return c.json({ error: result.error }, result.status);
    c.get('bus')?.emit('reef');
    return c.json(result.value);
  });
