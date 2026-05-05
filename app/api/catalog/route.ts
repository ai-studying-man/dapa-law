import { getCatalogSummary, searchCatalog } from "@/lib/dapa-catalog";
import { jsonResponse, optionsResponse } from "@/lib/http";
import {
  isSupabaseCatalogConfigured,
  searchSupabaseCatalog,
} from "@/lib/supabase-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const source = searchParams.get("source") ?? "all";
  const type = searchParams.get("type") ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
  const catalogSource =
    source === "defense_laws" || source === "admin_rules" ? source : "all";
  const catalogLimit = Number.isFinite(limit) && limit > 0 ? limit : 50;
  let storage: "supabase" | "local_json" = "local_json";
  let catalog = searchCatalog({
    query,
    source: catalogSource,
    type,
    limit: catalogLimit,
  });

  if (isSupabaseCatalogConfigured()) {
    try {
      catalog = await searchSupabaseCatalog({
        query,
        source: catalogSource,
        type,
        limit: catalogLimit,
      });
      storage = "supabase";
    } catch {
      storage = "local_json";
    }
  }

  return jsonResponse({
    ok: true,
    query,
    source,
    type,
    storage,
    summary: getCatalogSummary(),
    totalMatches: catalog.totalMatches,
    items: catalog.items,
  });
}
