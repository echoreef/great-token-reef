import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { api, type ReefAgentFilter } from '../../lib/api';
import { codexVisible, displayAgent } from '../../lib/reefAgents';
import { NO_HELD_REWARDS } from '../../lib/tankDecor';
import { uiEvent } from '../../lib/telemetry';
import { ReefInventory } from '../../components/ReefInventory';
import { Tank } from '../../components/Tank';
import { Loading, chip } from '../../components/ui';
import { AgentTracking, Header } from './Header';
import { Collection } from './Collection';
import { Expeditions } from './Expeditions';
import { ModelsTable, ProjectsTable, SessionsTable } from './Tables';
import { TrendChart } from './TrendChart';
import { Vitals } from './Vitals';

// The Reef — Claude Code and Codex usage analytics as an aquarium (design:
// .superpowers/brainstorm/cc-usage-20260818/design.html). All numbers are
// API-equivalent cost: what desktop usage would bill at published rates.

const TABS = [
  ['collection', 'Collection'],
  ['inventory', 'Inventory'],
  ['expeditions', 'Expeditions'],
  ['models', 'By Model'],
  ['projects', 'By Project'],
  ['sessions', 'Session Leaderboard'],
] as const;
type ReefTab = (typeof TABS)[number][0];

export function ReefView() {
  useEffect(() => uiEvent('reef.view'), []);
  const navigate = useNavigate();
  const { tab = 'collection', agent: agentParam = 'all', species: highlight } = useSearch({ strict: false }) as {
    tab?: ReefTab; agent?: ReefAgentFilter; species?: number;
  };
  const codexStatus = useQuery({ queryKey: ['reef', 'codex-status'], queryFn: api.reef.codexStatus, refetchInterval: 60_000 });
  const codexShown = codexVisible(codexStatus.data);
  const agent = displayAgent(agentParam, codexShown);
  // The tank's running release holds set rewards until their unveil; the Dex and the Inventory hold them too.
  const [heldRewards, setHeldRewards] = useState<ReadonlySet<string>>(NO_HELD_REWARDS);
  const summary = useQuery({ queryKey: ['reef', 'summary', agent], queryFn: () => api.reef.summary(agent), refetchInterval: 60_000 });
  const setTab = (t: ReefTab) => {
    uiEvent('reef.tab', t);
    void navigate({ to: '/', search: { tab: t === 'collection' ? undefined : t, agent }, replace: true });
  };

  return (
    <div className="mx-auto max-w-6xl p-6">
      <Header summary={summary.data} codexShown={codexShown} />
      <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Usage agent">
        {(codexShown ? ['all', 'claude', 'codex'] as const : ['all', 'claude'] as const).map((value) => (
          <button key={value} className={chip(agent === value)} aria-pressed={agent === value}
            onClick={() => { void navigate({ to: '/', search: { tab: tab === 'collection' ? undefined : tab, agent: value }, replace: true }); }}>
            {value === 'all' ? 'All' : value === 'claude' ? 'Claude' : 'Codex'}
          </button>
        ))}
        <span className="text-xs text-zinc-400">Usage filter · collection shared across agents</span>
      </div>
      {agent !== 'codex' && <AgentTracking agent="claude" />}
      {codexShown && agent !== 'claude' && <AgentTracking agent="codex" />}
      <Tank onHeldRewards={setHeldRewards} />
      {summary.isPending ? <Loading /> : summary.data && <Vitals s={summary.data} agent={agent} />}
      <TrendChart agent={agent} />
      <div className="mt-8 flex gap-1 border-b border-zinc-200 dark:border-zinc-800">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-3 py-1.5 text-sm ${
              tab === key
                ? 'border-cyan-600 font-medium'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-5">
        {tab === 'collection' && <Collection highlight={highlight} held={heldRewards} ladderTokens={summary.data?.rewards.tokens} />}
        {tab === 'inventory' && <ReefInventory held={heldRewards} />}
        {tab === 'expeditions' && <Expeditions />}
        {tab === 'models' && <ModelsTable agent={agent} />}
        {tab === 'projects' && <ProjectsTable agent={agent} />}
        {tab === 'sessions' && <SessionsTable agent={agent} />}
      </div>
    </div>
  );
}
