import { useCallback, useEffect, useRef, useState } from 'react';
import { DIGEST_SECONDS, digest, type DigestEvent, type Meal } from '../lib/tankHunt';

// Fish a shark ate (lib/tankHunt.ts) stay out of the school, then drop back in from the surface.

/** Shared with the swim loop: fish due back (id → surface x) and the meal callback. */
export interface HuntMotion { returns: Map<string, number>; onMeal: (meal: Meal) => void }

const NONE: ReadonlySet<string> = new Set();

/** `on`: sharks are hunting (full tank, no release playing); `ids`: the roster's swimmer ids. */
export function useTankHunt(on: boolean, ids: ReadonlySet<string>, width: number) {
  const [eaten, setEaten] = useState(NONE);
  const eatenRef = useRef(NONE);
  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);
  const timers = useRef(new Set<number>());
  const commit = useCallback((e: DigestEvent) => {
    const next = digest(eatenRef.current, e);
    if (next === eatenRef.current) return;
    eatenRef.current = next;
    setEaten(next);
  }, []);
  const motion = useRef<HuntMotion>({
    returns: new Map(),
    onMeal: ({ id }) => {
      commit({ kind: 'meal', id });
      const t = window.setTimeout(() => {
        timers.current.delete(t);
        // Released or re-picked meanwhile: nothing comes back.
        if (!eatenRef.current.has(id)) return;
        const w = widthRef.current;
        motion.current.returns.set(id, w * (0.1 + Math.random() * 0.8));
        commit({ kind: 'back', id });
      }, DIGEST_SECONDS * 1000);
      timers.current.add(t);
    },
  });

  // Leaving the full tank, a release starting or unmounting gives every fish back at once.
  useEffect(() => {
    if (on) return;
    const live = timers.current;
    for (const t of live) window.clearTimeout(t);
    live.clear();
    motion.current.returns.clear();
    commit({ kind: 'clear' });
  }, [on, commit]);
  useEffect(() => {
    const live = timers.current;
    return () => {
      for (const t of live) window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    commit({ kind: 'roster', ids });
    for (const id of motion.current.returns.keys()) if (!ids.has(id)) motion.current.returns.delete(id);
  }, [ids, commit]);

  return { eaten, motion };
}
