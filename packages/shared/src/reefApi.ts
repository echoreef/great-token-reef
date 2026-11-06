import { z } from 'zod';
import { ReefVisitorError, unixSeconds } from './entities.ts';
import { RarityValue } from './fish.ts';
import { DepthValue } from './expeditions.ts';

// Response contract for the Reef API: the server's service functions return these
// types and the web reads them. Objects are strict so a route test fails when the
// server sends a field the contract does not declare.

const int = z.number().int();

export const ReefAgent = z.enum(['claude', 'codex']);
export type ReefAgent = z.infer<typeof ReefAgent>;

/** The `agent` query filter on usage endpoints. */
export const ReefAgentFilter = z.enum(['all', 'claude', 'codex']);
export type ReefAgentFilter = z.infer<typeof ReefAgentFilter>;

export const ReefCatch = z.strictObject({
  /** null for legendaries, which belong to the shared collection */
  agent: ReefAgent.nullable(),
  id: int,
  seed: z.string(),
  session_id: z.string(),
  catch_index: int,
  caught_at: unixSeconds,
  project: z.string(),
  depth_tokens: int,
  species: int,
  name: z.string(),
  rarity: RarityValue,
  shiny: int,
  size: z.number(),
});
export type ReefCatch = z.infer<typeof ReefCatch>;

export const OfficialWindow = z.strictObject({
  /** Percent, 0–100 (Anthropic reports utilization, not token budgets). */
  utilization: z.number().nullable(),
  /** ISO-8601 reset time. */
  resetsAt: z.string().nullable(),
});
export type OfficialWindow = z.infer<typeof OfficialWindow>;

export const OfficialLimits = z.strictObject({
  fiveHour: OfficialWindow.nullable(),
  sevenDay: OfficialWindow.nullable(),
  sevenDayOpus: OfficialWindow.nullable(),
  sevenDaySonnet: OfficialWindow.nullable(),
  /** e.g. "Max 20x" from subscriptionType + rateLimitTier. */
  plan: z.string().nullable(),
  fetchedAt: unixSeconds,
});
export type OfficialLimits = z.infer<typeof OfficialLimits>;

export const CodexLimitWindow = z.strictObject({
  usedPercent: z.number(),
  windowMinutes: z.number(),
  resetsAt: unixSeconds.nullable(),
});
export type CodexLimitWindow = z.infer<typeof CodexLimitWindow>;

export const CodexLimits = z.strictObject({
  observedAt: unixSeconds,
  source: z.string(),
  limitId: z.string(),
  primary: CodexLimitWindow.nullable(),
  secondary: CodexLimitWindow.nullable(),
  unlimited: z.boolean(),
  plan: z.string().nullable(),
});
export type CodexLimits = z.infer<typeof CodexLimits>;

export const Window5h = z.strictObject({
  tokens: int,
  budget: int.nullable(),
  budgetEstimated: z.boolean(),
  startedAt: unixSeconds.nullable(),
  resetAt: unixSeconds.nullable(),
  limitAt: unixSeconds.nullable(),
});
export const QuotaWeek = z.strictObject({ tokens: int, cost: z.number(), budget: int.nullable(), budgetEstimated: z.boolean() });
export const QuotaBurn = z.strictObject({ tokensPerMin: int, costPerHour: z.number(), tokensPerMin7d: int, tokensPerActiveMin7d: int });
export type Window5h = z.infer<typeof Window5h>;
export type QuotaWeek = z.infer<typeof QuotaWeek>;
export type QuotaBurn = z.infer<typeof QuotaBurn>;

export const ReefSummary = z.strictObject({
  pending: int,
  /** lifetime count of usage events with no known price */
  unpricedEvents: int,
  today: z.strictObject({ tokens: int, cost: z.number(), catches: int, unpricedEvents: int }),
  window5h: Window5h,
  week: QuotaWeek.extend({ unpricedEvents: int }),
  burn: QuotaBurn.extend({ unpricedEvents: int }),
  official: OfficialLimits.nullable(),
  lastCatch: ReefCatch.nullable(),
  lifetime: z.strictObject({
    tokens: int, cost: z.number(), since: unixSeconds.nullable(),
    catches: int, speciesDiscovered: int, unpricedEvents: int,
  }),
  /** Claude-only quota view, whatever the agent filter */
  claudeQuota: z.strictObject({ window5h: Window5h, week: QuotaWeek, burn: QuotaBurn, official: OfficialLimits.nullable() }),
  codexLimits: CodexLimits.nullable(),
  rewards: z.strictObject({ tokens: int, catches: int, speciesDiscovered: int, lastCatch: ReefCatch.nullable() }),
});
export type ReefSummary = z.infer<typeof ReefSummary>;

export const ReefTrendRow = z.strictObject({
  day: z.string(), model: z.string(), agent: ReefAgent, tokens: int, cost: z.number(), unpricedEvents: int,
});
export type ReefTrendRow = z.infer<typeof ReefTrendRow>;

export const ReefModelRow = z.strictObject({
  model: z.string(), agent: ReefAgent, calls: int, input: int, output: int,
  cache_read: int, cache_write: int, cost: z.number(), unpricedEvents: int,
});
export type ReefModelRow = z.infer<typeof ReefModelRow>;

export const ReefProjectRow = z.strictObject({
  project: z.string(), tokens: int, cost: z.number(), unpricedEvents: int, sessions: int, last_used: unixSeconds,
});
export type ReefProjectRow = z.infer<typeof ReefProjectRow>;

export const ReefSessionRow = z.strictObject({
  session_id: z.string(),
  label: z.string(),
  project: z.string(),
  agent: ReefAgent,
  native_id: z.string().nullable(),
  parent_session_id: z.string().nullable(),
  model_provider: z.string().nullable(),
  source: z.string().nullable(),
  started_at: unixSeconds,
  ended_at: unixSeconds,
  tokens: int,
  rewardTokens: int,
  cost: z.number(),
  unpricedEvents: int,
  catches: int,
});
export type ReefSessionRow = z.infer<typeof ReefSessionRow>;

export const ReefSpeciesRow = z.strictObject({
  species: int,
  name: z.string(),
  rarity: RarityValue,
  count: int,
  shiny_count: int,
  best_size: z.number(),
  first_caught: unixSeconds,
  last_caught: unixSeconds,
  first_project: z.string(),
  /** best among catches already released into the tank; the tank draws this until a release lands */
  released_best_size: z.number().nullable(),
});
export type ReefSpeciesRow = z.infer<typeof ReefSpeciesRow>;

export const ReefLegendaryRow = z.strictObject({
  species: int, name: z.string(), shiny: int, size: z.number(),
  caught_at: unixSeconds, depth_tokens: int, project: z.string(), agent: z.null(),
});
export type ReefLegendaryRow = z.infer<typeof ReefLegendaryRow>;

export const ReefCollection = z.strictObject({
  species: z.array(ReefSpeciesRow),
  legendary: z.array(ReefLegendaryRow),
  recent: z.array(ReefCatch),
});
export type ReefCollection = z.infer<typeof ReefCollection>;

export const ReefCatchesByDate = z.strictObject({ date: z.string(), count: int, catches: z.array(ReefCatch) });
export type ReefCatchesByDate = z.infer<typeof ReefCatchesByDate>;

export const ReefEventKind = z.enum(['pr', 'ticket', 'whale', 'set']);
export type ReefEventKind = z.infer<typeof ReefEventKind>;

export const ReefEvent = z.strictObject({
  id: int, kind: ReefEventKind, ref: z.string(), payload: z.unknown(), created_at: unixSeconds,
});
export type ReefEvent = z.infer<typeof ReefEvent>;

export const ReefPending = z.strictObject({
  count: int,
  releasedId: int,
  /** newest ten pending catches, full rows */
  catches: z.array(ReefCatch),
  /** every pending catch, light rows */
  all: z.array(z.strictObject({ id: int, species: int, shiny: int, rarity: RarityValue })),
  events: z.array(ReefEvent),
  eventCount: int,
  visitorErrors: z.array(ReefVisitorError),
});
export type ReefPending = z.infer<typeof ReefPending>;

export const ReefReleaseResult = z.strictObject({ releasedId: int, releasedEventId: int });
export type ReefReleaseResult = z.infer<typeof ReefReleaseResult>;

export const ReefRewards = z.strictObject({
  badges: z.array(z.string()),
  decor: z.array(z.strictObject({ item: z.string(), shown: z.boolean(), xFrac: z.number().nullable() })),
  backdrops: z.array(z.string()),
  activeBackdrop: z.string(),
});
export type ReefRewards = z.infer<typeof ReefRewards>;

export const ReefScanResult = z.strictObject({ files: int, messages: int, catches: int });
export type ReefScanResult = z.infer<typeof ReefScanResult>;

// Request bodies. Plain objects, unlike the responses: extra keys from a client are dropped, not refused.

export const ReefReleaseBody = z.object({ upToId: int.nonnegative(), upToEventId: int.nonnegative().optional() });
export type ReefReleaseBody = z.infer<typeof ReefReleaseBody>;

export const ReefDecorBody = z.object({ shown: z.boolean().optional(), xFrac: z.number().min(0).max(1).optional() });
export type ReefDecorBody = z.infer<typeof ReefDecorBody>;

export const ReefBackdropBody = z.object({ backdrop: z.string().min(1) });
export type ReefBackdropBody = z.infer<typeof ReefBackdropBody>;

/** Token budgets per window; null means "estimate from observed peaks". Also the GET/PUT response. */
export const ReefBudgetsBody = z.object({ window5h: int.positive().nullable(), week: int.positive().nullable() });
export const ReefBudgets = z.strictObject(ReefBudgetsBody.shape);
export type ReefBudgets = z.infer<typeof ReefBudgets>;

// Expeditions. Titles are plain strings on the wire so an older client still parses a newer title.

export const ReefExpeditionFish = z.strictObject({
  species: int,
  xp: int,
  level: int,
  trips: int,
  strength: int,
  /** earned titles, newest first */
  titles: z.array(z.string()),
  chosenTitle: z.string().nullable(),
  shownTitle: z.string().nullable(),
});
export type ReefExpeditionFish = z.infer<typeof ReefExpeditionFish>;

export const ReefExpeditionTrip = z.strictObject({
  id: int,
  depth: DepthValue,
  party: z.array(int),
  strength: int,
  lengthTokens: int,
  progressTokens: int,
  startedAt: unixSeconds,
  /** the trip is full and the party waits to be welcomed home */
  returned: z.boolean(),
});
export type ReefExpeditionTrip = z.infer<typeof ReefExpeditionTrip>;

export const ReefExpeditionFind = z.strictObject({
  id: z.string(),
  depth: DepthValue,
  tripId: int,
  party: z.array(int),
  foundAt: unixSeconds,
});
export type ReefExpeditionFind = z.infer<typeof ReefExpeditionFind>;

export const ReefExpeditions = z.strictObject({
  typicalDayTokens: int,
  trip: ReefExpeditionTrip.nullable(),
  /** every species released into the tank */
  fish: z.array(ReefExpeditionFish),
  finds: z.array(ReefExpeditionFind),
});
export type ReefExpeditions = z.infer<typeof ReefExpeditions>;

export const ReefExpeditionWelcome = z.strictObject({
  tripId: int,
  depth: DepthValue,
  party: z.array(int),
  xp: int,
  find: z.string().nullable(),
  titles: z.array(z.strictObject({ species: int, title: z.string() })),
  state: ReefExpeditions,
});
export type ReefExpeditionWelcome = z.infer<typeof ReefExpeditionWelcome>;

export const ReefExpeditionStartBody = z.object({ depth: DepthValue, party: z.array(int).length(3) });
export type ReefExpeditionStartBody = z.infer<typeof ReefExpeditionStartBody>;

export const ReefExpeditionTitleBody = z.object({ title: z.string().min(1).nullable() });
export type ReefExpeditionTitleBody = z.infer<typeof ReefExpeditionTitleBody>;
