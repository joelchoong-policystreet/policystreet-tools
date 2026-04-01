import { supabase } from "@/data/supabase/client";

export type MilestoneBoardRow = {
  id: string;
  label: string;
  created_at: string;
};

function slugifyBoardName(name: string): string {
  const s = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s.length > 0 ? s : "board";
}

export async function fetchMilestoneBoards(): Promise<MilestoneBoardRow[]> {
  const { data, error } = await supabase
    .from("milestone_boards")
    .select("id,label,created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as MilestoneBoardRow[];
}

/** Inserts a row in `milestone_boards` and returns it. `id` is a unique slug derived from the label. */
export async function createMilestoneBoard(displayName: string): Promise<MilestoneBoardRow> {
  const label = displayName.trim();
  if (!label) {
    throw new Error("Board name is required.");
  }

  const { data: existing, error: listErr } = await supabase.from("milestone_boards").select("id");
  if (listErr) throw listErr;
  const existingIds = new Set((existing ?? []).map((r) => r.id));

  const baseId = slugifyBoardName(label);
  let id = baseId;
  let n = 2;
  while (existingIds.has(id)) {
    id = `${baseId}-${n}`;
    n += 1;
  }

  const { data, error } = await supabase
    .from("milestone_boards")
    .insert({ id, label })
    .select("id,label,created_at")
    .single();

  if (error) throw error;
  return data as MilestoneBoardRow;
}
