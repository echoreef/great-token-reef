import { useCallback, useEffect, useRef, useState } from 'react';
import type { Anchors } from '../lib/tankHabits';
import { hudReserve, keepHeld, placePlaque } from '../lib/tankPlaque';
import {
  ART_RATIO, WAG_MIN, dropFood, easeWag, isGone, mouthOf, quantizeWag, rescale, spawn, spawnDropIn, step, swimOff, transformOf, wagAnimation,
  type Bounds, type Sway, type Swimmer, type SwimmerSpec, type World,
} from '../lib/tankSim';
import type { HuntMotion } from './useTankHunt';
import type { ReleaseMotion } from './useTankRelease';

const SWELL_SECONDS = 1.5;
/** Most bubbles and sand puffs alive in the bubble layer at once. */
const BUBBLE_CAP = 40;

// Owns the simulation + rAF loop. Pauses when the tab is hidden, the tank
// is scrolled out of view, or the user prefers reduced motion (fish then
// sit at their home depths with only the slow CSS tail beat). Hovering fish
// and darting small fish blow bubbles into the bubble layer imperatively;
// food flakes are mirrored into the flake layer the same way.
export function useSwimLoop(
  tankRef: React.RefObject<HTMLDivElement | null>,
  bubbleLayer: React.RefObject<HTMLDivElement | null>,
  flakeLayer: React.RefObject<HTMLDivElement | null>,
  specs: SwimmerSpec[],
  bounds: Bounds,
  currentTarget: number,
  motion: { readonly current: ReleaseMotion },
  anchors: Anchors,
  plaqueEl: React.RefObject<HTMLDivElement | null>,
  plaqueId: React.RefObject<string | null>,
  hud: React.RefObject<HTMLDivElement | null>,
  sway: Sway,
  hunt: { readonly current: HuntMotion },
) {
  const fishRefs = useRef(new Map<string, HTMLDivElement>());
  const simRef = useRef<Swimmer[]>([]);
  const boundsRef = useRef(bounds);
  const worldRef = useRef<World>({ current: 0, flakes: [] });
  const currentTargetRef = useRef(currentTarget);
  useEffect(() => {
    currentTargetRef.current = currentTarget;
  }, [currentTarget]);
  const [active, setActive] = useState(true);
  const activeRef = useRef(active);
  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  const flakeEls = useRef(new Map<number, HTMLDivElement>());
  const swells = useRef(new Map<string, { from: number; to: number; start: number }>());
  const wags = useRef(new Map<string, { rate: number; applied: number; at: number; anim: Animation | null }>());
  // Paused (reduced motion, hidden tab) means nothing would sink or swim, so no food.
  const feed = useCallback((x: number, y: number) => {
    if (!activeRef.current) return 0;
    return dropFood(worldRef.current, x, y, Math.random, performance.now() / 1000);
  }, []);
  useEffect(() => {
    worldRef.current.sway = sway;
  }, [sway]);

  // Resize rescales positions in place; a roster change keeps the fish that
  // stayed and spawns only the newcomers, so a fullscreen toggle never
  // reshuffles the whole tank. Released newcomers and eaten fish coming back drop in from the surface.
  useEffect(() => {
    const prev = boundsRef.current;
    boundsRef.current = bounds;
    worldRef.current.anchors = anchors;
    if (bounds.width === 0 || bounds.height === 0) {
      // Hidden tank: a swell asked for now would play late, out of the blue, when it shows again.
      motion.current.swells.clear();
      swells.current.clear();
      return;
    }
    rescale(simRef.current, worldRef.current.flakes, prev, bounds);
    const existing = new Map(simRef.current.map((s) => [s.id, s]));
    const now = performance.now() / 1000;
    const { dropIns, leaving } = motion.current;
    const ids = new Set(specs.map((spec) => spec.id));
    for (const id of leaving) if (!ids.has(id)) leaving.delete(id);
    simRef.current = specs.flatMap((spec) => {
      const kept = existing.get(spec.id);
      if (!kept) {
        // Already swam out; React drops its spec on the next render.
        if (leaving.has(spec.id)) return [];
        const { returns } = hunt.current;
        const x = dropIns.get(spec.id) ?? returns.get(spec.id);
        dropIns.delete(spec.id);
        returns.delete(spec.id);
        return [x !== undefined && activeRef.current ? spawnDropIn(spec, bounds, x, Math.random, now) : spawn([spec], bounds, Math.random, now, anchors)[0]!];
      }
      const swell = swells.current.get(spec.id);
      if (swell) swell.to = spec.width;
      else if (motion.current.swells.has(spec.id) && activeRef.current && spec.width !== kept.width) {
        swells.current.set(spec.id, { from: kept.width, to: spec.width, start: now });
      } else {
        kept.width = spec.width;
        kept.height = spec.width * ART_RATIO;
      }
      kept.cruise = spec.cruise;
      kept.depth = spec.depth;
      kept.habit = spec.habit;
      kept.hunter = spec.hunter;
      if (leaving.has(spec.id) && kept.mode !== 'leave') swimOff(kept, bounds, now);
      return [kept];
    });
    motion.current.swells.clear();
    for (const id of swells.current.keys()) if (!existing.has(id) || !ids.has(id)) swells.current.delete(id);
  }, [specs, bounds, motion, hunt, anchors]);

  useEffect(() => {
    const el = tankRef.current;
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let visible = !document.hidden;
    let onScreen = true;
    const update = () => setActive(visible && onScreen && !reduced.matches);
    const onVis = () => { visible = !document.hidden; update(); };
    const io = new IntersectionObserver(([entry]) => { onScreen = !!entry?.isIntersecting; update(); });
    io.observe(el);
    document.addEventListener('visibilitychange', onVis);
    reduced.addEventListener('change', update);
    update();
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      reduced.removeEventListener('change', update);
    };
  }, [tankRef]);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    // playbackRate keeps the wag's phase; changing its duration snapped the whole fish to a new angle.
    const paintWag = (s: Swimmer, el: HTMLElement, now: number) => {
      const w = wags.current.get(s.id) ?? { rate: Math.max(WAG_MIN, s.wag), applied: 0, at: now, anim: null };
      w.rate = easeWag(w.rate, s.wag, Math.min(0.1, Math.max(0, now - w.at)));
      w.at = now;
      const q = quantizeWag(w.rate);
      if (q !== w.applied) {
        if (!w.anim || !(w.anim.effect as KeyframeEffect | null)?.target?.isConnected) {
          w.anim = wagAnimation(el.querySelector('svg')?.getAnimations() ?? []);
        }
        if (w.anim) {
          w.anim.updatePlaybackRate(q);
          w.applied = q;
        }
      }
      wags.current.set(s.id, w);
    };
    const paint = (now: number) => {
      // Measure the plaque before the fish writes below dirty layout.
      const pe = plaqueEl.current;
      const ps = pe && plaqueId.current ? simRef.current.find((s) => s.id === plaqueId.current) : undefined;
      const psize = pe && ps ? { w: pe.offsetWidth, h: pe.offsetHeight } : null;
      const reserve = psize ? hudReserve(hud.current) : 0;
      if (ps) keepHeld(ps, now);
      for (const s of simRef.current) {
        const el = fishRefs.current.get(s.id);
        if (!el) continue;
        el.style.transform = transformOf(s, now);
        const w = `${s.width.toFixed(1)}px`;
        if (el.style.width !== w) el.style.width = w;
        paintWag(s, el, now);
      }
      if (wags.current.size > simRef.current.length + 8) {
        const live = new Set(simRef.current.map((s) => s.id));
        for (const id of wags.current.keys()) if (!live.has(id)) wags.current.delete(id);
      }
      if (pe && ps && psize) placePlaque(pe, ps, boundsRef.current, reserve, psize);
      paintFlakes();
    };
    const paintFlakes = () => {
      const layer = flakeLayer.current;
      if (!layer) return;
      const els = flakeEls.current;
      const live = new Set<number>();
      for (const f of worldRef.current.flakes) {
        live.add(f.id);
        let el = els.get(f.id);
        if (!el) {
          el = document.createElement('div');
          el.className = 'reef-flake';
          layer.appendChild(el);
          els.set(f.id, el);
        }
        el.style.transform = `translate(${f.x.toFixed(1)}px, ${f.y.toFixed(1)}px) rotate(${(f.phase * 40).toFixed(0)}deg)`;
        el.classList.toggle('reef-flake-landed', f.landedAt !== null);
      }
      for (const [id, el] of els) {
        if (live.has(id)) continue;
        el.remove();
        els.delete(id);
      }
    };
    const bubbleAt = (layer: HTMLDivElement, x: number, y: number) => {
      if (layer.childElementCount >= BUBBLE_CAP) return;
      const b = document.createElement('div');
      const size = 3 + Math.random() * 5;
      b.className = 'reef-rise absolute rounded-full border border-white/60';
      b.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;animation-duration:${2.5 + Math.random() * 2}s;animation-iteration-count:1`;
      b.addEventListener('animationend', () => b.remove(), { once: true });
      layer.appendChild(b);
    };
    const sandAt = (layer: HTMLDivElement, x: number, y: number) => {
      if (layer.childElementCount >= BUBBLE_CAP) return;
      const p = document.createElement('div');
      p.className = 'reef-sandpuff';
      p.style.cssText = `left:${x}px;top:${y}px`;
      p.addEventListener('animationend', () => p.remove(), { once: true });
      layer.appendChild(p);
    };
    const blow = (dt: number) => {
      const layer = bubbleLayer.current;
      if (!layer || layer.childElementCount >= BUBBLE_CAP) return;
      const floor = boundsRef.current.height - (boundsRef.current.floor ?? 20);
      for (const s of simRef.current) {
        // Bottom feeders nosing along the sand kick up small puffs.
        if (s.habit === 'bottom' && s.mode === 'cruise' && s.y + s.height / 2 >= floor - 12 && Math.random() < 0.7 * dt) {
          sandAt(layer, mouthOf(s).x, floor - 2);
          continue;
        }
        const rate = s.mode === 'hover' ? 0.4 : s.mode === 'dart' ? 3 : 0;
        if (rate === 0 || Math.random() > rate * dt) continue;
        const m = mouthOf(s);
        bubbleAt(layer, m.x, m.y);
      }
    };
    const puff = (eaten: { x: number; y: number }[]) => {
      const layer = bubbleLayer.current;
      if (!layer) return;
      for (const e of eaten) {
        const n = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < n; i++) bubbleAt(layer, e.x + (Math.random() - 0.5) * 8, e.y - i * 4);
      }
    };
    const chomp = (m: { x: number; y: number }) => {
      const layer = bubbleLayer.current;
      if (!layer) return;
      const n = 6 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) bubbleAt(layer, m.x + (Math.random() - 0.5) * 24, m.y + (Math.random() - 0.5) * 16 - i * 3);
    };
    const grow = (now: number) => {
      for (const s of simRef.current) {
        const sw = swells.current.get(s.id);
        if (!sw) continue;
        const k = Math.min(1, (now - sw.start) / SWELL_SECONDS);
        s.width = sw.from + (sw.to - sw.from) * (1 - (1 - k) ** 3);
        s.height = s.width * ART_RATIO;
        if (k >= 1) swells.current.delete(s.id);
      }
    };
    const tick = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      // Exponential ease (time constant 10/3 s): ~95% of a current change lands in 10s.
      const world = worldRef.current;
      world.current += (currentTargetRef.current - world.current) * Math.min(1, dt * 0.3);
      const events = step(simRef.current, boundsRef.current, dt, Math.random, t / 1000, world);
      if (swells.current.size) grow(t / 1000);
      for (let i = simRef.current.length - 1; i >= 0; i--) {
        const s = simRef.current[i]!;
        if (s.mode !== 'leave' || !isGone(s, boundsRef.current)) continue;
        simRef.current.splice(i, 1);
        motion.current.onGone(s.id);
      }
      paint(t / 1000);
      blow(dt);
      puff(events.eaten);
      for (const m of events.meals) {
        // Gone from the sim already; hide it until React drops it from the school.
        fishRefs.current.get(m.id)?.style.setProperty('visibility', 'hidden');
        chomp(m);
        hunt.current.onMeal(m);
      }
      raf = requestAnimationFrame(tick);
    };
    if (active) raf = requestAnimationFrame(tick);
    else {
      // Paused or reduced motion: the water is still when motion resumes and eases back up.
      worldRef.current.current = 0;
      if (swells.current.size) grow(Infinity);
      paint(performance.now() / 1000);
    }
    return () => cancelAnimationFrame(raf);
  }, [active, specs, bounds, motion, hunt, bubbleLayer, flakeLayer, plaqueEl, plaqueId, hud]);

  return { fishRefs, simRef, feed };
}
