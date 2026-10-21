import { createClient } from "@/lib/supabase/server";
import type { Settings } from "@/lib/constants";
import SettingsForm from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("*").eq("id", 1).maybeSingle();
  return <SettingsForm initial={data as Settings} />;
}
