import { getCatalogSummary, searchCatalog } from "@/lib/dapa-catalog";
import { jsonResponse, optionsResponse } from "@/lib/http";

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
  const catalog = searchCatalog({
    query,
    source:
      source === "defense_laws" || source === "admin_rules" ? source : "all",
    type,
    limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
  });

  return jsonResponse({
    ok: true,
    query,
    source,
    type,
    summary: getCatalogSummary(),
    totalMatches: catalog.totalMatches,
    items: catalog.items,
  });
}
