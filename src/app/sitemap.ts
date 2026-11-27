import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/site";
import { bookPath } from "@/lib/share";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/ingresar`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/deseos`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/terminos`, changeFrequency: "yearly", priority: 0.3 },
  ];
  try {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } });
    const { data } = await sb.from("catalog_groups").select("book_key, created_at").limit(5000);
    const books = (data ?? []).map((b: { book_key: string; created_at: string }) => ({
      url: `${SITE_URL}${bookPath(b.book_key)}`, lastModified: new Date(b.created_at), changeFrequency: "weekly" as const, priority: 0.8,
    }));
    return [...base, ...books];
  } catch { return base; }
}
