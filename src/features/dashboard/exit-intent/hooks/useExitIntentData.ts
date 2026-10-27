/* eslint-disable @typescript-eslint/no-explicit-any -- the exit_intent_* tables are not in the generated Supabase types yet (src/integrations/supabase/types.ts). */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Cluster, MonthNote, Subcluster, Submission, SyncRun, GroupKey, NoteItem } from "../types";
import { mytDay } from "../utils/dates";

const PAGE_SIZE = 1000;

async function fetchAllSubmissions(): Promise<Submission[]> {
  const out: Submission[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await (supabase as any)
      .from("exit_intent_submissions")
      .select(
        "slack_ts,submitted_at,quotation_url,customer_category,feedback,feedback_gloss,cluster_code,subcluster_id,tag_note"
      )
      .eq("is_test", false)
      .order("submitted_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as any[];
    for (const r of page) {
      const submittedAt = new Date(r.submitted_at);
      if (Number.isNaN(submittedAt.getTime())) continue;
      const day = mytDay(submittedAt);
      out.push({
        key: String(r.slack_ts),
        submittedAt,
        day,
        month: day.slice(0, 7),
        quotationUrl: r.quotation_url ?? null,
        customerCategory: r.customer_category ?? null,
        feedback: String(r.feedback ?? ""),
        gloss: r.feedback_gloss ?? null,
        clusterCode: String(r.cluster_code),
        subclusterId: r.subcluster_id ?? null,
        tagNote: r.tag_note ?? null,
      });
    }
    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}

async function fetchTaxonomy(): Promise<{ clusters: Cluster[]; subclusters: Subcluster[] }> {
  const [c, s] = await Promise.all([
    (supabase as any)
      .from("exit_intent_clusters")
      .select("code,name,group_key,is_priority,sort_order,description")
      .order("sort_order"),
    (supabase as any)
      .from("exit_intent_subclusters")
      .select("id,cluster_code,name,sort_order,description")
      .order("sort_order"),
  ]);
  if (c.error) throw c.error;
  if (s.error) throw s.error;
  return {
    clusters: (c.data ?? []).map((r: any) => ({
      code: r.code,
      name: r.name,
      groupKey: r.group_key as GroupKey,
      isPriority: !!r.is_priority,
      sortOrder: Number(r.sort_order ?? 0),
      description: r.description ?? null,
    })),
    subclusters: (s.data ?? []).map((r: any) => ({
      id: Number(r.id),
      clusterCode: r.cluster_code,
      name: r.name,
      sortOrder: Number(r.sort_order ?? 0),
      description: r.description ?? null,
    })),
  };
}

async function fetchNotes(): Promise<MonthNote[]> {
  const { data, error } = await (supabase as any)
    .from("exit_intent_notes")
    .select("period_month,title,subtitle,items,as_of,is_final")
    .order("period_month");
  if (error) throw error;
  return (data ?? []).map((r: any) => ({
    month: String(r.period_month).slice(0, 7),
    title: r.title,
    subtitle: r.subtitle ?? null,
    items: (Array.isArray(r.items) ? r.items : []).filter(
      (x: any): x is NoteItem => x && typeof x.h === "string" && typeof x.b === "string"
    ),
    asOf: new Date(r.as_of),
    isFinal: !!r.is_final,
  }));
}

async function fetchLastSync(): Promise<SyncRun | null> {
  const { data, error } = await (supabase as any)
    .from("exit_intent_sync_runs")
    .select("ran_at,rows_inserted,caught_up")
    .order("ran_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  const r = data?.[0];
  return r ? { ranAt: new Date(r.ran_at), rowsInserted: Number(r.rows_inserted ?? 0), caughtUp: !!r.caught_up } : null;
}

/** Everything the Exit Intent dashboard needs. Data changes weekly, so a long staleTime is fine. */
export function useExitIntentData() {
  const query = useQuery({
    queryKey: ["exit-intent-dashboard"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const [submissions, taxonomy, notes, lastSync] = await Promise.all([
        fetchAllSubmissions(),
        fetchTaxonomy(),
        fetchNotes(),
        fetchLastSync(),
      ]);
      return { submissions, ...taxonomy, notes, lastSync };
    },
  });
  return {
    submissions: query.data?.submissions ?? [],
    clusters: query.data?.clusters ?? [],
    subclusters: query.data?.subclusters ?? [],
    notes: query.data?.notes ?? [],
    lastSync: query.data?.lastSync ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
  };
}
