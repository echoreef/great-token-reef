import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { ReefExpeditions } from '@gtr/shared';
import { api } from '../lib/api';
import { MINIMAP_KEY, minimapView, parseMinimapHidden, welcomeLines } from '../lib/tankExpedition';
import { uiEvent } from '../lib/telemetry';
import { Fish } from './Fish';

// Storage can throw (private mode, blocked site data); the minimap then just starts shown.
const readHidden = (): boolean => {
  try {
    return parseMinimapHidden(localStorage.getItem(MINIMAP_KEY));
  } catch {
    return false;
  }
};

const box = 'absolute left-3 z-30 rounded-lg bg-black/60 text-xs text-white shadow-lg backdrop-blur-sm';

/** Lower-left card in the full tank: the trip's progress, the homecoming, or a way to plan the next trip. */
export function TankMinimap({ state, bottom, onPlan }: { state: ReefExpeditions; bottom: number; onPlan: () => void }) {
  const queryClient = useQueryClient();
  const [hidden, setHidden] = useState(readHidden);
  const [summary, setSummary] = useState<string[] | null>(null);
  const welcome = useMutation({
    mutationFn: api.reef.welcomeExpedition,
    onSuccess: (w) => {
      uiEvent('reef.tank.minimap.welcome', w.depth);
      queryClient.setQueryData(['reef', 'expeditions'], w.state);
      setSummary(welcomeLines(w));
    },
  });
  const view = minimapView(state);
  const saveHidden = (next: boolean) => {
    uiEvent('reef.tank.minimap.toggle', next ? 'hidden' : 'shown');
    setHidden(next);
    try {
      localStorage.setItem(MINIMAP_KEY, next ? 'hidden' : 'shown');
    } catch {
      // Not persisted; the toggle still works for this visit.
    }
  };
  if (hidden) {
    return (
      <button
        type="button"
        data-reef-nofeed
        onClick={() => saveHidden(false)}
        aria-label="Show the expedition map"
        title="Show the expedition map"
        className={`${box} px-2 py-1 text-base`}
        style={{ bottom }}
      >
        ⚓{view.kind === 'returned' && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-amber-400" />}
      </button>
    );
  }
  return (
    <div data-reef-nofeed className={`${box} ${summary ? 'w-72' : 'w-52'} px-3 py-2`} style={{ bottom }}>
      <button type="button" onClick={() => saveHidden(true)} aria-label="Hide the expedition map" className="absolute right-2 top-1 text-white/60 hover:text-white">
        –
      </button>
      {summary ? (
        <button type="button" className="block w-full text-left" onClick={() => setSummary(null)}>
          <div className="font-semibold">🎉 Welcome home</div>
          {summary.map((line, i) => <div key={i} className="text-white/80">{line}</div>)}
        </button>
      ) : view.kind === 'rest' ? (
        <button type="button" className="block text-left" onClick={onPlan}>
          <div className="font-semibold">⚓ Party at rest</div>
          <div className="text-cyan-300">Start a trip →</div>
        </button>
      ) : (
        <>
          <div className="font-semibold">{view.kind === 'returned' ? '🎉 Party returned' : `🌊 ${view.depth}`}</div>
          <div className="my-1 flex gap-1">
            {view.party.map((s) => <Fish key={s} species={s} className="h-6 w-10 [&>svg]:h-full [&>svg]:w-full" />)}
          </div>
          {view.kind === 'out' ? (
            <>
              <div className="h-1.5 rounded bg-white/20">
                <div className="h-full rounded bg-cyan-400" style={{ width: `${view.percent}%` }} />
              </div>
              <div className="mt-1 text-white/70">{view.progress}</div>
            </>
          ) : (
            <button type="button" disabled={welcome.isPending} onClick={() => welcome.mutate()} className="text-amber-300 hover:text-amber-200">
              Click to welcome them home
            </button>
          )}
          {welcome.error && <div className="text-red-300">{welcome.error.message}</div>}
        </>
      )}
    </div>
  );
}
