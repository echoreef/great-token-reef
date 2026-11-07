import { useSearch } from '@tanstack/react-router';
import { DEPTHS, DEPTH_RULES, FINDS_PER_DEPTH, findsAt, speciesName, type ReefExpeditionFind } from '@gtr/shared';
import { FindArt } from '../../components/FindArt';
import { formatDate } from '../../lib/format';

export function ExpeditionLog({ finds }: { finds: readonly ReefExpeditionFind[] }) {
  // Dev-only: ?reefFinds=preview shows every drawing as found.
  const { reefFinds } = useSearch({ strict: false }) as { reefFinds?: 'preview' };
  const byId = new Map(finds.map((f) => [f.id, f]));
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase text-zinc-500">Log of finds</h3>
      {DEPTHS.map((d) => {
        const all = findsAt(d);
        const shown = all.filter((f) => reefFinds === 'preview' || byId.has(f.id));
        return (
          <div key={d}>
            <div className="text-xs text-zinc-500">{DEPTH_RULES[d].label} · {shown.length} of {FINDS_PER_DEPTH}</div>
            <div className="mt-1 grid grid-cols-4 gap-2 sm:grid-cols-8">
              {all.map((f) => {
                const found = byId.get(f.id);
                if (!found && reefFinds !== 'preview') {
                  return (
                    <div key={f.id} className="flex h-20 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-zinc-400 dark:border-zinc-700">
                      ?
                    </div>
                  );
                }
                const by = found ? `\nFound by ${found.party.map(speciesName).join(', ')} on ${formatDate(found.foundAt)}` : '';
                return (
                  <div key={f.id} className="rounded-lg border border-zinc-200 p-1 text-center text-[11px] dark:border-zinc-800" title={`${f.blurb}${by}`}>
                    <FindArt id={f.id} className="h-12 [&>svg]:h-full [&>svg]:w-full" />
                    <div className="truncate">{f.name}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
