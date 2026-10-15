import { useEffect, useRef, useState } from 'react';

/** A number that eases towards its target, for the score and the meters. */
export function useAnimatedNumber(target: number, duration = 450) {
  const [value, setValue] = useState(target);
  const from = useRef(target);
  const frame = useRef(0);
  const current = useRef(target);

  useEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      current.current = target;
      setValue(target);
      return;
    }
    from.current = current.current;
    const start = performance.now();
    cancelAnimationFrame(frame.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const v = from.current + (target - from.current) * eased;
      current.current = v;
      setValue(v);
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, duration]);

  return value;
}

export function loadState<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function saveState(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // private windows and blocked storage: the game still works, it just forgets
  }
}

export function clearState(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
