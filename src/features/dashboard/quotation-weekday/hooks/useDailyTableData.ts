import { useEffect, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type DailyTableFingerprint = { count: number; maxUpdatedAt: string | null };

/** How often we're willing to ask Supabase "has anything changed?" via the cheap fingerprint query. */
const FINGERPRINT_POLL_MS = 60_000;

function fingerprintsMatch(
  a: DailyTableFingerprint | null | undefined,
  b: DailyTableFingerprint | null | undefined
): boolean {
  if (!a || !b) return false;
  return a.count === b.count && a.maxUpdatedAt === b.maxUpdatedAt;
}

/**
 * Cheap freshness signal: row count + latest updated_at, no row payload.
 * Lets us detect new/edited rows without re-downloading the full dataset on every check.
 */
async function fetchFingerprint(tableName: string, dateColumn: string): Promise<DailyTableFingerprint> {
  const [{ count }, { data: latest, error: latestError }] = await Promise.all([
    (supabase as any).from(tableName).select(dateColumn, { count: "exact", head: true }),
    (supabase as any)
      .from(tableName)
      .select("updated_at")
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);
  if (latestError) throw latestError;
  return { count: count ?? 0, maxUpdatedAt: latest?.[0]?.updated_at ?? null };
}

export type DailyTableConfig<TRow> = {
  tableName: string;
  dateColumn: string;
  selectColumns: string;
  cacheKey: string;
  queryKeyPrefix: string;
  /** Maps a raw Supabase row (snake_case columns) into TRow. Return null to drop an invalid row. */
  mapSupabaseRow: (raw: any) => TRow | null;
  /** Re-hydrates a row read back from the localStorage cache. Return null to drop an invalid row. */
  mapCachedRow: (raw: unknown) => TRow | null;
};

function readCache<TRow>(
  config: DailyTableConfig<TRow>
): { rows: TRow[]; fingerprint: DailyTableFingerprint } | null {
  try {
    const raw = localStorage.getItem(config.cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { rows?: unknown[]; fingerprint?: DailyTableFingerprint };
    if (!parsed.fingerprint || typeof parsed.fingerprint.count !== "number") return null;
    const rows = (parsed.rows ?? [])
      .map(config.mapCachedRow)
      .filter((r): r is TRow => r !== null);
    if (rows.length === 0) return null;
    return { rows, fingerprint: parsed.fingerprint };
  } catch {
    return null;
  }
}

/**
 * Fetches a "one row per day" table (paged), caches it in localStorage, and
 * revalidates against a cheap fingerprint (row count + latest updated_at)
 * polled every FINGERPRINT_POLL_MS instead of re-downloading on a timer.
 */
export function useDailyTableData<TRow>(config: DailyTableConfig<TRow>) {
  const queryClient = useQueryClient();
  const initialCache = readCache(config);
  const lastFingerprintRef = useRef<DailyTableFingerprint | null>(initialCache?.fingerprint ?? null);

  const queryKey = useMemo(
    () => [config.queryKeyPrefix, config.tableName] as const,
    [config.queryKeyPrefix, config.tableName]
  );
  const fingerprintQueryKey = useMemo(
    () => [`${config.queryKeyPrefix}-fingerprint`, config.tableName] as const,
    [config.queryKeyPrefix, config.tableName]
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    // Freshness is driven entirely by the fingerprint check below, not by time.
    staleTime: Infinity,
    initialData: initialCache?.rows,
    queryFn: async () => {
      const pageSize = 1000;
      const allRows: any[] = [];
      let from = 0;
      while (true) {
        const to = from + pageSize - 1;
        const { data, error } = await (supabase as any)
          .from(config.tableName)
          .select(config.selectColumns)
          .order(config.dateColumn, { ascending: true })
          .range(from, to);
        if (error) throw error;
        const page = data ?? [];
        allRows.push(...page);
        if (page.length < pageSize) break;
        from += pageSize;
      }

      const rows = allRows.map(config.mapSupabaseRow).filter((r): r is TRow => r !== null);

      const fingerprint = await fetchFingerprint(config.tableName, config.dateColumn);
      lastFingerprintRef.current = fingerprint;
      try {
        localStorage.setItem(config.cacheKey, JSON.stringify({ fingerprint, rows }));
      } catch {
        // Ignore localStorage quota/access issues.
      }
      return rows;
    },
  });

  // Cheap poll: only asks for row count + latest updated_at, not the full dataset.
  // When it disagrees with the fingerprint the loaded data was cached under, trigger a real refetch.
  const { data: liveFingerprint } = useQuery({
    queryKey: fingerprintQueryKey,
    queryFn: () => fetchFingerprint(config.tableName, config.dateColumn),
    staleTime: FINGERPRINT_POLL_MS,
    refetchInterval: FINGERPRINT_POLL_MS,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!liveFingerprint) return;
    if (fingerprintsMatch(lastFingerprintRef.current, liveFingerprint)) return;
    lastFingerprintRef.current = liveFingerprint;
    void queryClient.invalidateQueries({ queryKey });
  }, [liveFingerprint, queryClient, queryKey]);

  return { rows: data ?? [], isLoading, isError, error };
}
