import type {
  ConnectExcludedReposBody, ConnectGithubBody, ConnectJiraBody, ConnectOrgsBody, ConnectStatus, FishPicks,
  OfficialLimits, OpenPr, ReefAgentFilter, ReefBudgets, ReefCatchesByDate, ReefCollection, ReefDecorBody,
  ReefModelRow, ReefPending, ReefProjectRow, ReefReleaseResult, ReefRewards, ReefScanResult, ReefSessionRow,
  ReefSummary, ReefTrendRow, ScannerStatus, Depth, ReefExpeditions, ReefExpeditionLog, ReefExpeditionWelcome,
} from '@gtr/shared';

// Thin typed fetch client over the REST API. Types come from @gtr/shared —
// the same schemas the server's responses are typed and tested against.

export type {
  CodexLimits, CodexLimitWindow, OfficialLimits, OfficialWindow, ReefCatch, ReefCatchesByDate, ReefCollection,
  ReefAgentFilter, ReefBudgets, ReefEvent, ReefEventKind, ReefLegendaryRow, ReefModelRow, ReefPending, ReefProjectRow,
  ReefRewards, ReefSessionRow, ReefSpeciesRow, ReefSummary, ReefTrendRow,
} from '@gtr/shared';

async function get<T>(path: string, params?: Record<string, string | number | boolean>): Promise<T> {
  const url = new URL(path, window.location.origin);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function send<T>(method: 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const res = await fetch(path, {
    method,
    // The server requires JSON on every mutation, bodyless ones included.
    headers: { 'content-type': 'application/json' },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? `${path}: HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// --- The Reef (Claude Code and Codex usage companion) --------------------------------

export type ReefFishPicks = FishPicks;


export const api = {
  reef: {
    claudeStatus: () => get<ScannerStatus>('/api/reef/claude/status'),
    codexStatus: () => get<ScannerStatus>('/api/reef/codex/status'),
    summary: (agent: ReefAgentFilter = 'claude') => get<ReefSummary>('/api/reef/summary', { agent }),
    trend: (days = 30, agent: ReefAgentFilter = 'claude') => get<ReefTrendRow[]>('/api/reef/trend', { days, agent }),
    models: (days = 30, agent: ReefAgentFilter = 'claude') => get<ReefModelRow[]>('/api/reef/models', { days, agent }),
    projects: (days = 30, agent: ReefAgentFilter = 'claude') => get<ReefProjectRow[]>('/api/reef/projects', { days, agent }),
    sessions: (days = 7, agent: ReefAgentFilter = 'claude', limit?: number) =>
      get<ReefSessionRow[]>('/api/reef/sessions', limit === undefined ? { days, agent } : { days, agent, limit }),
    collection: () => get<ReefCollection>('/api/reef/collection'),
    catches: (opts: { date?: string; rarity?: string } = {}) =>
      get<ReefCatchesByDate>('/api/reef/catches', opts),
    scan: () => send<ReefScanResult>('POST', '/api/reef/scan'),
    refreshLimits: () => send<OfficialLimits>('POST', '/api/reef/limits/refresh'),
    pending: () => get<ReefPending>('/api/reef/pending'),
    release: (upToId: number, upToEventId?: number) =>
      send<ReefReleaseResult>('POST', '/api/reef/release', { upToId, upToEventId }),
    rewards: () => get<ReefRewards>('/api/reef/rewards'),
    setDecor: (item: string, patch: ReefDecorBody) =>
      send<ReefRewards>('PUT', `/api/reef/decor/${encodeURIComponent(item)}`, patch),
    setBackdrop: (backdrop: string) => send<ReefRewards>('PUT', '/api/reef/backdrop', { backdrop }),
    fish: () => get<ReefFishPicks>('/api/reef/fish'),
    setFish: (view: 'strip' | 'full', species: number[]) =>
      send<ReefFishPicks>('PUT', `/api/reef/fish/${view}`, { species }),
    budgets: () => get<ReefBudgets>('/api/reef/budgets'),
    setBudgets: (b: ReefBudgets) => send<ReefBudgets>('PUT', '/api/reef/budgets', b),
    prs: () => get<OpenPr[]>('/api/reef/prs'),
    expeditions: () => get<ReefExpeditions>('/api/reef/expeditions'),
    expeditionTrips: () => get<ReefExpeditionLog>('/api/reef/expeditions/trips'),
    startExpedition: (depth: Depth, party: number[]) =>
      send<ReefExpeditions>('POST', '/api/reef/expeditions/start', { depth, party }),
    welcomeExpedition: () => send<ReefExpeditionWelcome>('POST', '/api/reef/expeditions/welcome'),
    setExpeditionTitle: (species: number, title: string | null) =>
      send<ReefExpeditions>('PUT', `/api/reef/expeditions/fish/${species}/title`, { title }),
  },
  connect: {
    status: () => get<ConnectStatus>('/api/connect'),
    saveGithub: (body: ConnectGithubBody) =>
      send<ConnectStatus>('PUT', '/api/connect/github', body),
    saveGithubExcludedRepos: (repos: string[]) => send<ConnectStatus>('PUT', '/api/connect/github/excluded-repos', { repos } satisfies ConnectExcludedReposBody),
    saveGithubOrgs: (orgs: string[]) => send<ConnectStatus>('PUT', '/api/connect/github/orgs', { orgs } satisfies ConnectOrgsBody),
    disconnectGithub: () => send<ConnectStatus>('DELETE', '/api/connect/github'),
    saveJira: (body: ConnectJiraBody) =>
      send<ConnectStatus>('PUT', '/api/connect/jira', body),
    disconnectJira: () => send<ConnectStatus>('DELETE', '/api/connect/jira'),
  },
};
