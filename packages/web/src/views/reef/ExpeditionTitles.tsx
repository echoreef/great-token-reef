import { useMutation, useQueryClient } from '@tanstack/react-query';
import { speciesName, titleName, type ReefExpeditionFish } from '@gtr/shared';
import { inputCls } from '../../components/ui';
import { api } from '../../lib/api';
import { uiEvent } from '../../lib/telemetry';

export function ExpeditionTitles({ fish }: { fish: readonly ReefExpeditionFish[] }) {
  const queryClient = useQueryClient();
  const choose = useMutation({
    mutationFn: ({ species, title }: { species: number; title: string | null }) => api.reef.setExpeditionTitle(species, title),
    onSuccess: (next, v) => {
      uiEvent('reef.expedition.title', v.title ?? 'newest');
      queryClient.setQueryData(['reef', 'expeditions'], next);
    },
  });
  const titled = fish.filter((f) => f.titles.length > 0);
  if (titled.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase text-zinc-500">Titles</h3>
      {titled.map((f) => (
        <label key={f.species} className="flex items-center gap-2 text-sm">
          <span className="w-48 truncate">{speciesName(f.species)} · Lv {f.level}</span>
          <select
            className={`${inputCls} px-2 py-1 text-xs`}
            value={f.chosenTitle ?? ''}
            onChange={(e) => choose.mutate({ species: f.species, title: e.target.value || null })}
          >
            <option value="">Newest ({titleName(f.titles[0]!)})</option>
            {f.titles.map((t) => <option key={t} value={t}>{titleName(t)}</option>)}
          </select>
        </label>
      ))}
      {choose.error && <p className="text-xs text-red-500">{choose.error.message}</p>}
    </div>
  );
}
