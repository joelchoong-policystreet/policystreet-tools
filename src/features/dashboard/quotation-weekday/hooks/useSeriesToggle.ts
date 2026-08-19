import { useMemo, useState } from "react";

export type SeriesToggleMode = "multi" | "isolate";

export type SeriesToggle<K extends string> = {
  effectiveActive: K[];
  isFiltered: boolean;
  isActive: (key: K) => boolean;
  handleClick: (key: K) => void;
  reset: () => void;
  /** 1 when shown, 0.08 when some other series are shown, 0.28 when nothing is filtered. */
  opacityFor: (key: K) => number;
  chartKey: (prefix: string) => string;
};

/**
 * Drives legend/bar toggle state for a chart's series.
 * - "isolate": clicking a series shows only that one (Revenue, New vs Returning).
 * - "multi": clicking toggles membership in the active set, isolating on the
 *   first click from "all active" (Leads/Policy, Detailed Breakdown).
 */
export function useSeriesToggle<K extends string>(
  allKeys: readonly K[],
  mode: SeriesToggleMode
): SeriesToggle<K> {
  const [active, setActive] = useState<K[]>(() => [...allKeys]);

  const effectiveActive = useMemo(() => {
    const valid = active.filter((k) => allKeys.includes(k));
    return valid.length > 0 ? valid : [...allKeys];
  }, [active, allKeys]);

  const isFiltered = effectiveActive.length !== allKeys.length;

  const handleClick = (key: K) => {
    if (mode === "isolate") {
      setActive([key]);
      return;
    }
    setActive((prev) => {
      const base = prev.length > 0 ? prev : [...allKeys];
      const isAllActive = allKeys.every((k) => base.includes(k));

      // First click from "all active" isolates only the clicked series.
      if (isAllActive) {
        return [key];
      }

      if (base.includes(key)) {
        // Keep at least one selected series active.
        if (base.length === 1) return base;
        return base.filter((k) => k !== key);
      }
      const next = [...base, key];
      return allKeys.filter((k) => next.includes(k));
    });
  };

  const reset = () => setActive([...allKeys]);
  const isActive = (key: K) => effectiveActive.includes(key);
  const opacityFor = (key: K) => (isActive(key) ? 1 : isFiltered ? 0.08 : 0.28);
  const chartKey = (prefix: string) => `${prefix}:${effectiveActive.slice().sort().join("|")}`;

  return { effectiveActive, isFiltered, isActive, handleClick, reset, opacityFor, chartKey };
}
