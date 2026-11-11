import { Outlet, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { AppHeader } from './components/AppHeader';
import { ConnectView } from './views/ConnectView';
import { ReefView } from './views/reef/ReefView';
import { parseStormLevel, type StormLevel } from './lib/tankEnv';
import { parseDevBackdrop, parseDevDecor } from './lib/tankDecor';

const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <AppHeader />
      <Outlet />
    </div>
  ),
});

const reefRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: ReefView,
  // Collection is the default tab and stays out of the URL.
  validateSearch: (input: Record<string, unknown>): { tab?: 'inventory' | 'expeditions' | 'models' | 'projects' | 'sessions'; agent?: 'all' | 'claude' | 'codex'; species?: number; reefTime?: number; reefStorm?: StormLevel; reefDecor?: string; reefBackdrop?: string; reefVisitors?: 'demo'; reefLegends?: 'preview'; reefFinds?: 'preview'; release?: 1; arrange?: 1 } => ({
    species: Number.isInteger(Number(input.species)) && input.species !== undefined ? Number(input.species) : undefined,
    // Dev-only: pins the tank's hour so night can be checked at 2pm.
    reefTime:
      input.reefTime !== undefined && input.reefTime !== '' && Number.isInteger(Number(input.reefTime)) && Number(input.reefTime) >= 0 && Number(input.reefTime) <= 23
        ? Number(input.reefTime)
        : undefined,
    reefStorm: parseStormLevel(input.reefStorm),
    // Dev-only: preview set-reward art before anything is earned (?reefDecor=all or a,b; ?reefBackdrop=kelp-forest).
    reefDecor: parseDevDecor(input.reefDecor),
    reefBackdrop: parseDevBackdrop(input.reefBackdrop),
    // Dev-only: one chest, batch chest, bottle and whale with made-up payloads (no server).
    reefVisitors: input.reefVisitors === 'demo' ? 'demo' : undefined,
    // Dev-only: all 24 legendaries as caught in the collection strip, and one of each in the tank.
    reefLegends: input.reefLegends === 'preview' ? 'preview' : undefined,
    // Dev-only: every find drawing shown as found in the Expeditions log.
    reefFinds: input.reefFinds === 'preview' ? 'preview' : undefined,
    agent: ['all', 'claude', 'codex'].includes(input.agent as string)
      ? (input.agent as 'all' | 'claude' | 'codex')
      : undefined,
    // Set by the nav widget's new-fish badge; the tank starts the release, then drops it.
    release: input.release === 1 || input.release === '1' ? 1 : undefined,
    // Set by the Inventory tab's "Arrange in tank"; the tank goes fullscreen in arrange mode and drops it on exit.
    arrange: input.arrange === 1 || input.arrange === '1' ? 1 : undefined,
    tab: ['inventory', 'expeditions', 'models', 'projects', 'sessions'].includes(input.tab as string)
      ? (input.tab as 'inventory' | 'expeditions' | 'models' | 'projects' | 'sessions')
      : undefined,
  }),
});

const connectRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/connect',
  component: ConnectView,
});

export const router = createRouter({
  routeTree: rootRoute.addChildren([reefRoute, connectRoute]),
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
