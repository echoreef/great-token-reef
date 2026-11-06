import { useEffect, useRef, useState } from 'react';
import { tripStep } from '../lib/tankExpedition';

// Party fish swim out when a trip starts and drop back in from the surface when welcomed home.

/** Shared with the swim loop: fish swimming out, fish due back (id → surface x), and the gone callback. */
export interface TripMotion { leaving: Set<string>; returns: Map<string, number>; onGone: (id: string) => void }

const NONE: ReadonlySet<string> = new Set();
/** Somewhere across the middle of the surface. */
const surfaceX = (width: number) => width * (0.1 + Math.random() * 0.8);

/** `awayIds`: roster swimmers whose species is on a trip; `ready`: the expedition state has loaded. */
export function useTankExpedition(awayIds: ReadonlySet<string>, ready: boolean, reduced: boolean, width: number) {
  const [gone, setGone] = useState(NONE);
  const primed = useRef(false);
  const motion = useRef<TripMotion>({
    leaving: new Set(),
    returns: new Map(),
    onGone: (id) => {
      if (motion.current.leaving.delete(id)) setGone((prev) => new Set(prev).add(id));
    },
  });
  useEffect(() => {
    if (!ready) return;
    // A party already out when the tank first loads is simply absent, not swimming off.
    const step = tripStep(awayIds, gone, motion.current.leaving, reduced || !primed.current);
    primed.current = true;
    for (const id of step.leave) motion.current.leaving.add(id);
    if (!reduced) for (const id of step.back) motion.current.returns.set(id, surfaceX(width));
    if (step.goneNow.length === 0 && step.back.length === 0) return;
    setGone((prev) => {
      const next = new Set(prev);
      for (const id of step.goneNow) next.add(id);
      for (const id of step.back) next.delete(id);
      return next;
    });
  }, [awayIds, gone, ready, reduced, width]);
  return { gone, motion };
}
