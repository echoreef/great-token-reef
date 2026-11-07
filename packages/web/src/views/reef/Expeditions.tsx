import { useQuery } from '@tanstack/react-query';
import { ExpeditionParty } from '../../components/ExpeditionParty';
import { Empty, Loading } from '../../components/ui';
import { api } from '../../lib/api';
import { compactNumber } from '../../lib/format';
import { ExpeditionLog } from './ExpeditionLog';
import { ExpeditionTitles } from './ExpeditionTitles';
import { ExpeditionTrip } from './ExpeditionTrip';

export function Expeditions() {
  const q = useQuery({ queryKey: ['reef', 'expeditions'], queryFn: api.reef.expeditions });
  if (q.isPending) return <Loading />;
  if (!q.data) return <Empty hint="The Reef server did not answer.">Expeditions are unavailable</Empty>;
  const { trip } = q.data;
  return (
    <section id="reef-expeditions" className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold">Expeditions</h2>
        <p className="text-xs text-zinc-400">
          Your typical day is {compactNumber(q.data.typicalDayTokens)} tokens. Trip lengths are shares of it.
        </p>
      </div>
      {trip ? (
        <ExpeditionTrip trip={trip} fish={q.data.fish} />
      ) : (
        <ExpeditionParty state={q.data} />
      )}
      <ExpeditionLog finds={q.data.finds} />
      <ExpeditionTitles fish={q.data.fish} />
    </section>
  );
}
