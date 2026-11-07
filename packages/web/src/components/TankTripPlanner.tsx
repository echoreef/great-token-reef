import type { ReefExpeditions } from '@gtr/shared';
import { compactNumber } from '../lib/format';
import { ExpeditionParty } from './ExpeditionParty';

/** The party picker as a panel over the full tank; it closes once a party is sent. */
export function TankTripPlanner({ state, onClose }: { state: ReefExpeditions; onClose: () => void }) {
  return (
    <div
      data-reef-nofeed
      role="dialog"
      aria-label="Plan a trip"
      className="absolute inset-x-4 bottom-4 top-20 z-40 mx-auto max-w-4xl overflow-y-auto rounded-xl bg-white/95 p-4 text-zinc-900 shadow-2xl dark:bg-zinc-900/95 dark:text-zinc-100"
    >
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-sm font-semibold">Plan a trip</h2>
        <span className="text-xs text-zinc-500">Your typical day is {compactNumber(state.typicalDayTokens)} tokens.</span>
        <button type="button" onClick={onClose} aria-label="Close the trip planner" className="ml-auto rounded px-2 text-lg leading-none text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          ×
        </button>
      </div>
      <ExpeditionParty state={state} onSent={onClose} />
    </div>
  );
}
