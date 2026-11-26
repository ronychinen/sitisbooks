import { createClient } from "@/lib/supabase/server";
import type { Centroid, Settings } from "@/lib/constants";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const [{ data }, { data: centroids }] = await Promise.all([
    supabase.from("settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("district_centroids").select("*"),
  ]);
  return <SettingsForm initial={data as Settings} centroids={(centroids ?? []) as Centroid[]} />;
}
