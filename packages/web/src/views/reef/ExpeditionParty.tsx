import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DEPTHS, PARTY_SIZE, isLegendary, partyProblem, speciesName, type Depth, type ReefExpeditions } from '@gtr/shared';
import { Fish } from '../../components/Fish';
import { btnPrimary, chip } from '../../components/ui';
import { api } from '../../lib/api';
import { depthPreview, memberBlock, pickerOrder, toggleMember } from '../../lib/expeditionView';
import { uiEvent } from '../../lib/telemetry';

export function ExpeditionParty({ state }: { state: ReefExpeditions }) {
  const queryClient = useQueryClient();
  const [party, setParty] = useState<number[]>([]);
  const [depth, setDepth] = useState<Depth>('shallows');
  const start = useMutation({
    mutationFn: () => api.reef.startExpedition(depth, party),
    onSuccess: (next) => {
      uiEvent('reef.expedition.start', depth);
      queryClient.setQueryData(['reef', 'expeditions'], next);
      setParty([]);
    },
  });
  if (state.fish.length < PARTY_SIZE) {
    return <p className="text-sm text-zinc-500">Release at least three fish into the tank to send a party out.</p>;
  }
  const strength = state.fish.filter((f) => party.includes(f.species)).reduce((sum, f) => sum + f.strength, 0);
  const ready = partyProblem(party, new Set(state.fish.map((f) => f.species))) === null;
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase text-zinc-500">
        Choose a party ({party.length} of {PARTY_SIZE}) · strength {strength}
      </h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {pickerOrder(state.fish).map((f) => {
          const blocked = memberBlock(party, f.species);
          return (
            <button
              key={f.species}
              type="button"
              disabled={blocked !== null}
              title={blocked ?? undefined}
              onClick={() => setParty((p) => toggleMember(p, f.species))}
              className={`rounded-lg border p-2 text-left text-xs disabled:cursor-not-allowed disabled:opacity-40 ${party.includes(f.species) ? 'border-cyan-600 bg-cyan-50 dark:bg-cyan-950' : 'border-zinc-200 dark:border-zinc-800'}`}
            >
              <Fish species={f.species} className="h-10 [&>svg]:h-full [&>svg]:w-full" />
              <div className="truncate font-medium">{speciesName(f.species)}{isLegendary(f.species) ? ' ★' : ''}</div>
              <div className="text-zinc-500">Lv {f.level} · strength {f.strength}</div>
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2">
        {DEPTHS.map((d) => {
          const p = depthPreview(d, strength, state.typicalDayTokens);
          return (
            <button
              key={d}
              type="button"
              onClick={() => setDepth(d)}
              className={chip(depth === d)}
              title={p.full ? `${p.xp} experience each, ${p.findPercent}% chance of a find` : `Under strength: ${p.xp} experience each, no finds`}
            >
              {p.label} · {p.tokens} tokens · needs {p.recommended}{p.full ? '' : ' (under strength)'}
            </button>
          );
        })}
      </div>
      <button type="button" className={`${btnPrimary} px-3 py-1.5 text-sm`} disabled={!ready || start.isPending} onClick={() => start.mutate()}>
        Send the party
      </button>
      {start.error && <p className="text-xs text-red-500">{start.error.message}</p>}
    </div>
  );
}
