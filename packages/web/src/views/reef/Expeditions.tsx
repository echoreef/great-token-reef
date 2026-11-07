import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { Empty, Loading } from '../../components/ui';
import { api } from '../../lib/api';
import { compactNumber } from '../../lib/format';
import { ExpeditionLog } from './ExpeditionLog';
import { ExpeditionParty } from './ExpeditionParty';
import { ExpeditionTitles } from './ExpeditionTitles';
import { ExpeditionTrip } from './ExpeditionTrip';

export function Expeditions() {
  const navigate = useNavigate();
  const { plan } = useSearch({ strict: false }) as { plan?: 1 };
  const q = useQuery({ queryKey: ['reef', 'expeditions'], queryFn: api.reef.expeditions });
  // Arriving from the tank minimap: bring the section into view, then drop the flag.
  useEffect(() => {
    if (!plan || !q.data) return;
    document.getElementById('reef-expeditions')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    void navigate({ to: '/', search: (s) => ({ ...s, plan: undefined }), replace: true });
  }, [plan, q.data, navigate]);
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
