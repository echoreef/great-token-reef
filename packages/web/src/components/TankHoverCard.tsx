import { formatDate } from '../lib/format';
import type { RosterFish } from '../lib/tankPicks';
import type { Bounds, Swimmer } from '../lib/tankSim';

// Chip pinned above the hovered fish (below it when it is near the surface).
export function TankHoverCard({ fish, swimmer, bounds, expedition }: {
  fish: RosterFish; swimmer: Swimmer; bounds: Bounds; expedition?: string | null;
}) {
  const above = swimmer.y > 70;
  const left = Math.max(8, Math.min(bounds.width - 220, swimmer.x - 100));
  const top = above ? swimmer.y - swimmer.height / 2 - (expedition ? 74 : 58) : swimmer.y + swimmer.height / 2 + 8;
  return (
    <div
      className="pointer-events-none absolute z-30 w-52 rounded-lg bg-black/60 px-3 py-2 text-xs text-white shadow-lg backdrop-blur-sm"
      style={{ left, top }}
    >
      <div className="truncate font-semibold">{fish.shiny ? '✨ ' : ''}{fish.name}</div>
      {expedition && <div className="truncate text-amber-200">{expedition}</div>}
      <div className="text-white/70">
        <span className="uppercase">{fish.rarity}</span> · PB {fish.bestSize}cm · ×{fish.count}
      </div>
      <div className="truncate text-white/60">
        First caught {formatDate(fish.firstCaught)}{fish.firstProject ? ` in ${fish.firstProject.split('/').pop()}` : ''}
      </div>
    </div>
  );
}
