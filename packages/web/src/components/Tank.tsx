import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearch } from '@tanstack/react-router';
import { LEGENDARY_ID_BASE, LEGENDARY_DEFS } from '@gtr/shared';
import { api, type ReefPending } from '../lib/api';
import { allSpecies } from '../lib/legendaryRows';
import { devDecor, placeDecor, speciesSetOf, visibleRewards } from '../lib/tankDecor';
import { bubbleCount } from '../lib/tankEnv';
import {
  FISH_CAPS, pickRoster, picksSettled, rosterFromPick, seedPick, seedReady, type FishView,
} from '../lib/tankPicks';
import { maskCollection, queueUnknown, releaseGates, releasedRows } from '../lib/tankRelease';
import { anchorsFor, bubblesFor, decorFor, planktonFor, populationFor, specFor } from '../lib/tankScenery';
import { uiEvent } from '../lib/telemetry';
import { tankNotices } from '../lib/tankNotices';
import { emptyTankMessage } from '../lib/tankLines';
import type { SwimmerSpec } from '../lib/tankSim';
import { Fish } from './Fish';
import { PrHud, QuotaHud } from './ReefWidget';
import { TankArrange, useTankArrange } from './TankArrange';
import { TankBackdrop, TankDecor } from './TankDecor';
import { TankHoverCard } from './TankHoverCard';
import { TankRelease } from './TankRelease';
import { TankLines } from './TankLines';
import { TankNoticeChip, useMinuteClock } from './TankNotices';
import { TankPlaque } from './TankPlaque';
import { TankRockLips, TankRocks, rocksFor } from './TankRocks';
import { TankWeather } from './TankWeather';
import { useTankHud } from './useTankHud';
import { useTankLines } from './useTankLines';
import { useLinger, usePrefersReducedMotion, useTankEnv } from './useTankEnv';
import { useTankPlaque } from './useTankPlaque';
import { useTankRelease } from './useTankRelease';
import { useCausticSpeed, useSnappedBubbleRate, useWeedClock } from './useTankScenery';
import { useSwimLoop } from './useSwimLoop';
import { useTankHunt } from './useTankHunt';
import { useTankFullscreen, useTankLayout } from './useTankFullscreen';

// The Reef tank (docs/reef-tank-plan.md). Fish positions come from the pure
// simulation in lib/tankSim.ts; a requestAnimationFrame loop (useSwimLoop) writes
// transforms straight onto refs so React never re-renders per frame.
// Fullscreen (useTankFullscreen) = Fullscreen API with a fixed-overlay fallback, always-on HUD.
// Decor (caustics, rays, fog, parallax silhouettes, floor) is CSS only.

export function Tank({ onHeldRewards }: {
  /** a running release's held reward keys (rewardKey), so the page's Dex and Inventory hold them too */
  onHeldRewards: (held: ReadonlySet<string>) => void;
}) {
  const collection = useQuery({ queryKey: ['reef', 'collection'], queryFn: api.reef.collection });
  const pending = useQuery({ queryKey: ['reef', 'pending'], queryFn: api.reef.pending, retry: false });
  const rewards = useQuery({ queryKey: ['reef', 'rewards'], queryFn: api.reef.rewards, retry: false });
  const fish = useQuery({ queryKey: ['reef', 'fish'], queryFn: api.reef.fish, retry: false });
  const queryClient = useQueryClient();
  const { reefDecor, reefBackdrop, arrange, reefLegends } = useSearch({ strict: false }) as { reefDecor?: string; reefBackdrop?: string; arrange?: 1; reefLegends?: 'preview' };
  const tankRef = useRef<HTMLDivElement>(null);
  const bubbleLayer = useRef<HTMLDivElement>(null);
  const flakeLayer = useRef<HTMLDivElement>(null);
  // `screen` styles the container; every piece of geometry reads `fullscreen`, the mode paired with its measured size.
  const { fullscreen: screen, toggle } = useTankFullscreen(tankRef);
  const layout = useTankLayout(tankRef, screen);
  const fullscreen = layout.mode;
  const bounds = useMemo(() => ({ width: layout.width, height: layout.height }), [layout.width, layout.height]);
  const scale = fullscreen ? 1.3 : 1;
  const env = useTankEnv(fullscreen !== null);
  const reduced = usePrefersReducedMotion();
  const population = populationFor(bounds);
  const view: FishView = fullscreen ? 'full' : 'strip';
  // A view's pick before its seed's PUT answers, so the tank never waits on the round trip.
  const [seeds, setSeeds] = useState<Partial<Record<FishView, number[]>>>({});
  const [seedFailed, setSeedFailed] = useState<Partial<Record<FishView, true>>>({});
  const pick = fish.data ? (fish.data[view] ?? seeds[view] ?? null) : null;
  // Visible failure: a chip says so. A later save of this view's pick clears a failed seed.
  const picksFailed = fish.isError || (!!seedFailed[view] && fish.data?.[view] == null);
  // The automatic roster stands in only with no pick to show; cached picks outlive a failed refetch.
  const autoRoster = picksFailed && pick === null;
  // Catalog species plus legendaries; ?reefLegends=preview swaps in all 24 legendaries and swims one of each.
  const species = useMemo(() => (collection.data ? allSpecies(collection.data, reefLegends === 'preview') : []), [collection.data, reefLegends]);
  const previewGuests = useMemo(() => (reefLegends === 'preview' ? LEGENDARY_DEFS.map((_, i) => LEGENDARY_ID_BASE + i) : []), [reefLegends]);
  const rosterFor = useCallback(
    (hidden: ReefPending['all'], bests: Map<number, number>, guests: number[]) => {
      const masked = maskCollection(species, hidden, bests);
      const all = [...guests, ...previewGuests];
      if (autoRoster) return rosterFromPick(masked, pickRoster(masked, population).map((r) => r.species), all, population);
      return pick ? rosterFromPick(masked, pick, all, FISH_CAPS[view]) : [];
    },
    [species, previewGuests, population, autoRoster, pick, view],
  );
  const knownFor = useCallback(
    (hidden: ReefPending['all']) => new Set(maskCollection(species, hidden).map((s) => s.species)),
    [species],
  );
  const specsRef = useRef<SwimmerSpec[]>([]);
  // Until pending loads, or while it has failed, released fish cannot be told from new ones; an empty tank beats a spoiler.
  const queueHeld = queueUnknown(pending);
  // A release snapshots the roster at its start, so it waits until the tank knows which fish it shows.
  const picksReady = picksSettled(fish, pick, picksFailed);
  const { dataReady, autoStart, canRelease } = releaseGates({ collection, pending, width: bounds.width, picksReady });
  const release = useTankRelease({
    pending: pending.data,
    rosterFor,
    knownFor,
    specOf: (id) => specsRef.current.find((sp) => sp.id === id),
    width: bounds.width,
    reduced,
    ready: autoStart,
    onHeldRewards,
  });
  const roster = useMemo(
    () => (queueHeld ? [] : rosterFor(release.hidden, release.bests, release.guests)),
    [queueHeld, rosterFor, release.hidden, release.bests, release.guests],
  );
  // Sharks hunt in the full tank only, and never over a release.
  const hunting = fullscreen !== null && !release.releasing;
  const specs = useMemo(
    () => roster.map((r) => {
      const sp = specFor(r, fullscreen !== null, scale);
      return sp.hunter && !hunting ? { ...sp, hunter: false } : sp;
    }),
    [roster, fullscreen, scale, hunting],
  );
  useEffect(() => {
    specsRef.current = specs;
  }, [specs]);
  const rosterIds = useMemo(() => new Set(specs.map((sp) => sp.id)), [specs]);
  const hunt = useTankHunt(hunting, rosterIds, bounds.width);
  // Fish leaving the roster mid-release swim off-edge and stay rendered until gone; a fish a shark ate is away for a while.
  const school = useMemo(() => [
    ...roster.flatMap((r, i) => (hunt.eaten.has(specs[i]!.id) ? [] : [{ fish: r, spec: specs[i]!, leaving: false }])),
    ...release.leavers.filter((l) => !rosterIds.has(l.spec.id)).map((l) => ({ ...l, leaving: true })),
  ], [roster, specs, rosterIds, hunt.eaten, release.leavers]);
  const swimSpecs = useMemo(() => school.map((f) => f.spec), [school]);
  const bubbleRate = useSnappedBubbleRate(Number(env.vars['--reef-bubble-rate'] ?? 1));
  const decor = useMemo(() => decorFor(bounds.width, fullscreen !== null), [bounds.width, fullscreen]);
  const bubbles = useMemo(() => bubblesFor(bubbleCount(bounds.width, bubbleRate)), [bounds.width, bubbleRate]);
  const rocks = useMemo(
    () => rocksFor(bounds.width, bounds.height, decor.floor, fullscreen !== null),
    [bounds.width, bounds.height, decor.floor, fullscreen],
  );
  // Rewards a running release still holds stay out until their step; ?reefDecor / ?reefBackdrop are dev previews.
  const shownRewards = useMemo(() => (rewards.data ? visibleRewards(rewards.data, release.heldRewards) : undefined), [rewards.data, release.heldRewards]);
  const earned = useMemo(() => (reefDecor ? devDecor(reefDecor) : (shownRewards?.decor ?? [])), [reefDecor, shownRewards]);
  // Dev previews hold pieces the server does not know, so they never arrange; ?arrange=1 waits out a release.
  const arranging = arrange === 1 && !reefDecor && !!rewards.data && !release.releasing;
  const arranger = useTankArrange({ active: arranging, earned, width: bounds.width, rocks, fullscreen: fullscreen !== null, toggle });
  const pieces = useMemo(
    () => placeDecor(arranger.draft ?? earned, bounds, decor.floor, fullscreen !== null, rocks),
    [arranger.draft, earned, bounds, decor.floor, fullscreen, rocks],
  );
  const badges = useMemo(() => new Set(shownRewards?.badges ?? []), [shownRewards]);
  const backdrop = reefBackdrop ?? rewards.data?.activeBackdrop ?? null;
  const settling = useMemo(() => new Set(release.unveils.filter((u) => u.kind === 'decor').map((u) => u.id)), [release.unveils]);
  const flashing = useMemo(() => new Set(release.unveils.filter((u) => u.kind === 'badge').map((u) => u.id)), [release.unveils]);
  const anchors = useMemo(() => anchorsFor(decor, rocks, pieces, bounds), [decor, rocks, pieces, bounds]);
  const plaqueEl = useRef<HTMLDivElement>(null);
  const plaqueIdRef = useRef<string | null>(null);
  const { hudRef, hudBottom, setHudEl } = useTankHud();
  // In fullscreen the waterline sits under the HUD band, which stays put while arranging.
  const surfaceY = fullscreen ? (hudBottom > 0 ? hudBottom + 22 : 26) : 14;
  // The sim stops bellies on the drawn sand, not a fixed margin; in fullscreen open-ocean fish keep below the waterline under the band.
  const simBounds = useMemo(
    () => ({ ...bounds, floor: decor.floor, top: fullscreen ? surfaceY : 0 }),
    [bounds, decor.floor, fullscreen, surfaceY],
  );
  // The weeds' CSS sway, so a seahorse can ride its weed: --reef-lean is 7deg per unit of current, the sim's current 18 * scale px/s.
  const swayAmp = Number(env.vars['--reef-sway-amp'] ?? 6) * (reduced ? 1 : Number(env.vars['--reef-storm-sway'] ?? 1));
  const sway = useMemo(() => ({ amp: swayAmp, degPerCurrent: 7 / (18 * scale) }), [swayAmp, scale]);
  const { fishRefs, simRef, feed } = useSwimLoop(
    tankRef, bubbleLayer, flakeLayer, swimSpecs, simBounds, reduced ? 0 : env.current * 18 * scale, release.motion, anchors,
    plaqueEl, plaqueIdRef, hudRef, sway, hunt.motion,
  );
  useWeedClock(tankRef, decor.weeds);
  const masked = useMemo(
    () => releasedRows(species, release.hidden, release.bests, queueHeld),
    [queueHeld, species, release.hidden, release.bests],
  );
  const {
    hovered, plaque, hoveredFish, hoveredSwimmer, plaqueFish, plaqueText, refocusing,
    setHover, openPlaque, closePlaque, placePlaqueNow, openDex,
  } = useTankPlaque({
    tankRef, simRef, fishRefs, plaqueEl, plaqueIdRef, hudRef, bounds, fullscreen, toggle, arranging, roster, masked,
  });
  const { lines, jerking } = useTankLines();
  const emptyMessage = emptyTankMessage({ waiting: release.waiting, activeLines: lines.length });

  // Only open water feeds (fish, buttons, HUD, plaque are data-reef-nofeed); with a plaque open it only closes it.
  const onTankClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (arranging || target.closest('[data-reef-nofeed], button, a, [role="button"]')) return;
    if (plaqueIdRef.current) {
      closePlaque(true);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const added = feed(e.clientX - rect.left, e.clientY - rect.top);
    uiEvent('reef.tank.feed', String(added));
  };

  const plankton = useMemo(() => planktonFor(bounds.width, fullscreen !== null), [bounds.width, fullscreen]);
  // Plankton fade with --reef-glow's 10s transition at dawn rather than vanishing.
  const planktonShown = useLinger(env.night > 0, 10_000, reduced);
  const causticSpeed = Number(env.vars['--reef-caustic-speed'] ?? 1);
  useCausticSpeed(tankRef, causticSpeed, reduced);
  // Warm light peaks halfway through dawn and dusk; dawn from the left, dusk from the right.
  const sun = env.phase === 'dawn' || env.phase === 'dusk' ? 4 * env.night * (1 - env.night) : 0;
  const envStyle = {
    ...env.vars,
    '--reef-lean': reduced ? '0' : String(Number((env.current * 7).toFixed(2))),
    ...(reduced ? { '--reef-storm-sway': '1' } : {}),
    '--reef-sun': String(Number(sun.toFixed(3))),
    '--reef-sun-x': env.phase === 'dusk' ? '82%' : '18%',
  } as React.CSSProperties;
  const silhouettes = useMemo(() => pickRoster(masked, 40).slice(-5), [masked]);
  // First render of a view with no pick saves what the automatic roster shows there, once per view.
  // Fresh collection + pending + picks only, and never mid-release, so pending fish are never seeded.
  const seeded = useRef(new Set<FishView>());
  useEffect(() => {
    // Never on a picks error: a failed refetch keeps a stale cached null.
    const ready = seedReady({
      unset: !!fish.data && fish.data[view] === null,
      alreadySeeded: seeded.current.has(view),
      picksError: fish.isError,
      picksFresh: fish.isFetchedAfterMount && !fish.isFetching,
      dataReady,
      queueError: pending.isError,
      releasing: release.releasing,
    });
    // The preview's made-up legendaries must never be saved into a real pick.
    if (!ready || reefLegends) return;
    seeded.current.add(view);
    const seedIds = seedPick(masked, populationFor(bounds), FISH_CAPS[view]);
    setSeeds((cur) => ({ ...cur, [view]: seedIds }));
    console.log(`[reef] seeding the ${view} fish pick with ${seedIds.length} fish: ${seedIds.join(',')}`);
    api.reef.setFish(view, seedIds).then(
      (fresh) => queryClient.setQueryData(['reef', 'fish'], fresh),
      (err: unknown) => {
        console.error(`[reef] could not save the seeded ${view} fish pick; the seeded fish stay shown under the picks chip`, err);
        setSeedFailed((cur) => ({ ...cur, [view]: true }));
      },
    );
  }, [fish.data, fish.isError, fish.isFetchedAfterMount, fish.isFetching, view, dataReady, pending.isError, release.releasing, bounds, masked, queryClient, reefLegends]);
  // Visible failures: the release queue, collection or picks that did not load or save, and visitor fetches failing on the server.
  const nowSec = useMinuteClock(!queueHeld && (pending.data?.visitorErrors.length ?? 0) > 0);
  const notices = tankNotices({
    queueError: pending.isError ? pending.error.message : null,
    queueHeld,
    collectionError: collection.isError ? collection.error.message : null,
    picksFailed,
    visitorErrors: pending.data?.visitorErrors,
    nowSec,
  });

  return (
    <div
      ref={tankRef}
      className={`reef-tank group relative overflow-hidden ${
        arranging ? '[&_.reef-wag]:pointer-events-none [&_.reef-wag]:opacity-25 [&_.reef-wag]:transition-opacity' : ''
      } ${
        screen === 'theater'
          ? 'fixed inset-0 z-50'
          : screen === 'native'
            ? 'h-screen w-screen'
            : 'mt-4 h-56 rounded-xl'
      }`}
      style={{
        ...envStyle,
        ['--reef-tank-w' as string]: `${bounds.width}px`,
      }}
      data-reef-phase={env.phase}
      onClick={onTankClick}
    >
      <TankBackdrop active={backdrop} reduced={reduced} />
      {/* far layer: sky light, rays, blurred silhouettes, caustics */}
      <div className="reef-sun" />
      <div className="reef-moon" />
      {fullscreen && (
        <div className="reef-rays">
          {[12, 34, 58].map((left, i) => (
            <div key={`r${i}`} className="reef-ray" style={{ left: `${left}%`, animationDelay: `${-i * 2.3}s` }} />
          ))}
        </div>
      )}
      {silhouettes.map((r, i) => (
        <div
          key={`s${r.species}`}
          className="reef-drift pointer-events-none absolute left-0 opacity-30 blur-[2px] grayscale"
          style={{
            top: `${10 + ((i * 29) % 55)}%`,
            width: (140 + ((i * 41) % 90)) * scale,
            animationDuration: `${70 + ((i * 17) % 40)}s`,
            animationDelay: `${-((i * 23) % 60)}s`,
          }}
        >
          <Fish species={r.species} shiny={false} />
        </div>
      ))}
      <div className="reef-caustic reef-caustic-a" />
      <div className="reef-caustic reef-caustic-b" />
      {decor.weeds.map((w, i) => (
        <svg
          key={`w${i}`}
          viewBox={`0 0 30 ${w.height}`}
          // The 30-wide viewBox meets a 20px box; anchor to the bottom so the stem reaches the sand.
          preserveAspectRatio="xMidYMax meet"
          className="reef-sway reef-nightdim absolute w-5"
          style={{ left: `${w.left}%`, bottom: decor.floor - 6, height: w.height, animationDelay: `${w.delay}s` }}
        >
          <path
            d={`M15,${w.height} C ${8 + (i % 3) * 3},${w.height * 0.6} ${20 - (i % 4) * 2},${w.height * 0.35} 15,0`}
            stroke={i % 3 === 0 ? '#2a8a52' : '#1e6b45'} strokeWidth="7" fill="none" strokeLinecap="round" opacity=".85"
          />
        </svg>
      ))}
      <TankRocks rocks={rocks} />
      <TankDecor pieces={pieces} settling={settling} />
      {bubbles.map((b, i) => (
        <div
          key={`b${i}`}
          className="reef-rise absolute rounded-full border border-white/50"
          style={{ left: `${b.left}%`, bottom: decor.floor, width: b.size, height: b.size, animationDuration: `${b.duration}s`, animationDelay: `${b.delay}s` }}
        />
      ))}

      {planktonShown !== 'off' && (
        <div className={`reef-plankton-layer ${planktonShown === 'leaving' ? 'reef-plankton-out' : ''}`}>
          {plankton.map((p, i) => (
            <span
              key={`k${i}`}
              className="reef-plankton"
              style={{ left: `${p.left}%`, top: `${p.top}%`, width: p.size, height: p.size, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }}
            />
          ))}
        </div>
      )}
      <TankWeather level={env.weather} vars={env.vars} reduced={reduced} surfaceY={surfaceY} fullscreen={fullscreen !== null} />

      <TankLines
        lines={lines}
        bounds={bounds}
        surfaceY={surfaceY}
        floorY={bounds.height - decor.floor}
        fullscreen={fullscreen !== null}
        jerking={jerking}
      />
      <div ref={flakeLayer} className="pointer-events-none absolute inset-0 z-10" />
      {/* fish layer */}
      {school.map(({ fish: r, spec, leaving }) => {
        const set = speciesSetOf(r.species);
        // The flash may land before the rewards refetch that brings its badge.
        const gold = !set ? '' : flashing.has(set) ? 'reef-gold reef-gold-flash' : badges.has(set) ? 'reef-gold' : '';
        return (
          <div
            key={spec.id}
            ref={(el) => {
              if (el) fishRefs.current.set(spec.id, el);
              else fishRefs.current.delete(spec.id);
            }}
            role="button"
            data-reef-nofeed
            tabIndex={leaving || arranging ? -1 : 0}
            onMouseEnter={() => setHover(spec.id)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => { if (!refocusing.current) setHover(spec.id); }}
            onBlur={() => setHover(null)}
            onClick={() => openPlaque(r, spec.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') openPlaque(r, spec.id); }}
            className={`reef-wag absolute left-0 top-0 will-change-transform ${leaving ? 'pointer-events-none' : 'cursor-pointer'} ${
              r.shiny ? 'reef-shiny' : r.rarity === 'epic' ? 'reef-epic' : ''
            } ${gold} ${hovered === spec.id || plaque === spec.id ? 'z-20' : spec.habit === 'crevice' ? 'z-10' : 'z-[11]'}`}
            style={{ transform: 'translate(-9999px, 0)' }}
          >
            <Fish species={r.species} shiny={r.shiny} className="[&>svg]:drop-shadow-md" />
          </div>
        );
      })}
      {/* Lips (z-10, after the fish) cover eels (z-10) only; every other fish swims in front at z-11. */}
      <TankRockLips rocks={rocks} />
      <div ref={bubbleLayer} className="pointer-events-none absolute inset-0 z-[11]" />

      {/* floor: fog, sand, pebbles, coral */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0"
        style={{ height: '45%', background: 'linear-gradient(180deg, rgba(4,30,45,0) 0%, rgba(4,30,45,0.45) 100%)' }}
      />
      <div
        className="reef-sand absolute inset-x-0 bottom-0"
        style={{ height: decor.floor }}
      />
      <svg
        className="reef-nightdim pointer-events-none absolute inset-x-0 bottom-0 w-full"
        style={{ height: decor.floor + 30 }}
        preserveAspectRatio="none"
        viewBox="0 0 1000 60"
      >
        {decor.pebbles.map((p, i) => (
          <ellipse key={`p${i}`} cx={p.x} cy={48 + p.dy} rx={p.r} ry={p.r * 0.55} fill={p.fill} opacity="0.9" />
        ))}
        {decor.corals.map((c, i) => (
          <path
            key={`c${i}`}
            transform={`translate(${c.x} 50)`}
            d="M0,0 C-6,-14 -2,-26 -10,-36 M0,0 C2,-16 8,-22 6,-38 M0,0 C-1,-10 4,-14 14,-18"
            stroke={c.fill} strokeWidth="5" fill="none" strokeLinecap="round"
          />
        ))}
      </svg>
      {/* haze and weather tint sit over the scenery but under the fish (z-10), so fish stay crisp */}
      <div className="reef-fog" />
      <div className="reef-tint" />

      {emptyMessage && roster.length === 0 && collection.data && !queueHeld && (pick !== null || picksFailed) && !release.releasing && (
        <div className="pointer-events-none absolute inset-0 z-[12] flex items-center justify-center px-4">
          <span className="rounded-full bg-black/30 px-4 py-1.5 text-sm text-white/85 backdrop-blur-sm">{emptyMessage}</span>
        </div>
      )}
      {!plaque && !arranging && hoveredFish && hoveredSwimmer && (
        <TankHoverCard fish={hoveredFish} swimmer={hoveredSwimmer} bounds={bounds} />
      )}
      {plaqueFish && plaqueText && (
        <TankPlaque
          lines={plaqueText}
          species={plaqueFish.species}
          compact={fullscreen === null}
          reserveTop={fullscreen ? hudBottom : 0}
          elRef={plaqueEl}
          onPlace={placePlaqueNow}
          onClose={() => closePlaque(true)}
          onDex={() => openDex(plaqueFish.species)}
        />
      )}
      {/* Arrange mode is a focused edit: the release button and its banners wait until Done. */}
      {!arranging && <TankRelease
        release={release}
        count={release.waiting}
        canRelease={canRelease}
        width={bounds.width}
        lineXs={lines.map((l) => l.xFrac * bounds.width)}
        taken={[...rocks, ...pieces]}
        surfaceY={surfaceY}
        restBottom={decor.floor - 6}
        fullscreen={fullscreen !== null}
      />}
      {arranger.draft && (
        <TankArrange
          pieces={pieces}
          draft={arranger.draft}
          width={bounds.width}
          fullscreen={fullscreen !== null}
          saving={arranger.saving}
          error={arranger.error}
          onMove={arranger.move}
          onHide={arranger.hide}
          onShow={arranger.show}
          onDone={() => void arranger.done()}
          onCancel={arranger.cancel}
          notices={notices}
        />
      )}
      {fullscreen && (
        <div
          ref={setHudEl}
          className={`pointer-events-none absolute left-6 right-24 top-3 z-30 flex items-start gap-3 [&>*]:pointer-events-auto ${arranging ? 'invisible' : ''}`}
        >
          <QuotaHud className="flex-none" />
          <div data-reef-nofeed className="min-w-0 flex-1"><PrHud /></div>
        </div>
      )}
      {/* Arrange mode shows the notices in its toolbar, which would otherwise cover them. */}
      {!arranging && notices.length > 0 && (
        <div
          className={`pointer-events-none absolute left-3 z-[38] flex items-start gap-1 ${fullscreen ? 'flex-col' : 'flex-col-reverse'}`}
          // Fullscreen: just under the HUD band; strip: above the sand, clear of the release button; over resting visitor cards.
          style={fullscreen ? { top: Math.max(hudBottom, 12) + 6 } : { bottom: decor.floor + 6 }}
        >
          {notices.map((n) => <TankNoticeChip key={n.key} notice={n} />)}
        </div>
      )}
      <button
        type="button"
        data-reef-nofeed
        onClick={toggle}
        aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen tank'}
        title={fullscreen ? 'Exit fullscreen (Esc)' : 'Fullscreen tank'}
        className="absolute right-3 top-3 z-30 rounded-md bg-black/30 px-2 py-1 text-sm text-white opacity-0 transition-opacity hover:bg-black/50 focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        {fullscreen ? '✕' : '⛶'}
      </button>
      {fullscreen && !arranging && earned.length > 0 && !reefDecor && !release.releasing && (
        <button
          type="button"
          data-reef-nofeed
          onClick={arranger.enter}
          aria-label="Arrange decor"
          title="Arrange decor"
          className="absolute right-14 top-3 z-30 rounded-md bg-black/30 px-2 py-1 text-sm text-white opacity-0 transition-opacity hover:bg-black/50 focus:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        >
          ✎
        </button>
      )}
    </div>
  );
}
