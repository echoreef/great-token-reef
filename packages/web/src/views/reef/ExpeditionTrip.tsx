import { DEPTH_RULES, speciesName, type ReefExpeditionFish, type ReefExpeditionTrip } from '@gtr/shared';
import { Fish } from '../../components/Fish';
import { surface } from '../../components/ui';
import { formatDate } from '../../lib/format';
import { tripProgress } from '../../lib/expeditionView';

/** The party that is out: its fish, depth and progress, or that it is back and waiting. */
export function ExpeditionTrip({ trip, fish }: { trip: ReefExpeditionTrip; fish: readonly ReefExpeditionFish[] }) {
  const depth = DEPTH_RULES[trip.depth].label;
  const { percent, tokens } = tripProgress(trip);
  return (
    <div className={`${surface} p-4`}>
      <div className="flex items-baseline gap-2">
        <h3 className="text-sm font-semibold">{trip.returned ? `🎉 Back from the ${depth}` : `🌊 Out in the ${depth}`}</h3>
        <span className="text-xs text-zinc-400">since {formatDate(trip.startedAt)} · strength {trip.strength}</span>
        <span className="ml-auto text-sm font-medium tabular-nums">{percent}%</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {trip.party.map((species) => (
          <div key={species} className="w-36 text-center text-xs" title={speciesName(species)}>
            <Fish species={species} className="h-12 [&>svg]:h-full [&>svg]:w-full" />
            <div className="truncate font-medium">{speciesName(species)}</div>
            <div className="text-zinc-500">Lv {fish.find((f) => f.species === species)?.level ?? 1}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className={`h-full rounded-full ${trip.returned ? 'bg-amber-400' : 'bg-cyan-500'}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-1 text-xs text-zinc-500">
        {trip.returned ? 'The party is home. Welcome them from the minimap in the full tank.' : `${tokens} tokens`}
      </div>
    </div>
  );
}
