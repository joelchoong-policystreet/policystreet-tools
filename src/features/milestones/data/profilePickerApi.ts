import { supabase } from "@/data/supabase/client";

export type PicProfileRow = {
  id: string;
  name: string;
  email: string;
};

export function profileDisplayName(p: Pick<PicProfileRow, "name" | "email">): string {
  const n = p.name?.trim();
  if (n) return n;
  const local = p.email?.split("@")[0];
  return local || "—";
}

/** Label in the dropdown; disambiguate duplicate display names. */
export function profilePickerLabel(p: PicProfileRow, all: PicProfileRow[]): string {
  const base = profileDisplayName(p);
  const sameName = all.filter((x) => profileDisplayName(x) === base);
  if (sameName.length <= 1) return base;
  return `${base} (${p.email})`;
}

/** Value stored on the milestone `driver` field (unique when names collide). */
export function driverForStorage(p: PicProfileRow, all: PicProfileRow[]): string {
  const base = profileDisplayName(p);
  const same = all.filter((x) => profileDisplayName(x) === base);
  if (same.length <= 1) return base;
  return `${base} (${p.email})`;
}

export function findProfileByStoredDriver(
  driver: string,
  profiles: PicProfileRow[],
): PicProfileRow | undefined {
  const d = driver.trim();
  if (!d) return undefined;
  const exact = profiles.find((p) => driverForStorage(p, profiles) === d);
  if (exact) return exact;
  return profiles.find((p) => profileDisplayName(p) === d);
}

export async function fetchProfilesForPicPicker(): Promise<PicProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, email")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name ?? "",
    email: r.email,
  }));
}
