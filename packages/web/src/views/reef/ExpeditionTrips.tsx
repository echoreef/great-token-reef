import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DEPTH_RULES, findById, speciesName } from '@gtr/shared';
import { FindArt } from '../../components/FindArt';
import { Fish } from '../../components/Fish';
import { api } from '../../lib/api';
import { tripNotes } from '../../lib/expeditionView';
import { compactNumber, formatDate } from '../../lib/format';

const SHOWN = 10;

/** Every finished trip, newest first: where it went, who went, and what came of it. */
export function ExpeditionTrips() {
  const q = useQuery({ queryKey: ['reef', 'expeditions', 'trips'], queryFn: api.reef.expeditionTrips });
  const [all, setAll] = useState(false);
  const trips = q.data?.trips ?? [];
  const shown = all ? trips : trips.slice(0, SHOWN);
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-zinc-500">Trip log</h3>
      {q.isError && <p className="text-xs text-red-500">The trip log could not be loaded.</p>}
      {q.data && trips.length === 0 && <p className="text-xs text-zinc-400">No trips yet. Every trip a party comes home from is listed here.</p>}
      <ol className="divide-y divide-zinc-200 dark:divide-zinc-800">
        {shown.map((t) => {
          const find = t.find ? findById(t.find) : undefined;
          return (
            <li key={t.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-xs">
              <div className="w-28">
                <div className="font-medium">{DEPTH_RULES[t.depth].label}</div>
                <div className="text-zinc-500">{formatDate(t.returnedAt)}</div>
              </div>
              <div className="flex gap-1">
                {t.party.map((s) => (
                  <span key={s} title={speciesName(s)}>
                    <Fish species={s} className="h-6 w-10 [&>svg]:h-full [&>svg]:w-full" />
                  </span>
                ))}
              </div>
              <div className="w-36 text-zinc-500" title={`${compactNumber(t.lengthTokens)} tokens, party strength ${t.strength}`}>
                +{t.xp} experience each
                {!t.full && <div className="text-amber-600 dark:text-amber-400">Under strength</div>}
              </div>
              {find && (
                <div className="flex items-center gap-1" title={find.blurb}>
                  <FindArt id={find.id} className="h-6 w-8 [&>svg]:h-full [&>svg]:w-full" />
                  <span>{find.name}</span>
                </div>
              )}
              {tripNotes(t).length > 0 && (
                <ul className="basis-full pl-32 text-zinc-500">
                  {tripNotes(t).map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {trips.length > SHOWN && (
        <button type="button" onClick={() => setAll(!all)} className="text-xs text-cyan-600 hover:underline dark:text-cyan-400">
          {all ? 'Show the latest only' : `Show all ${trips.length} trips`}
        </button>
      )}
    </div>
  );
}
