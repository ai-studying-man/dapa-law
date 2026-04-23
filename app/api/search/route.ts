import { searchCatalog } from "@/lib/dapa-catalog";
import { jsonResponse, optionsResponse } from "@/lib/http";
import { normalizeTarget, searchLawApi, selectBestSearchItem } from "@/lib/law-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\u300C\u300D\u300E\u300F()[\]{}'".,]/g, "")
    .trim();
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const source = searchParams.get("source") ?? "all";
  const type = searchParams.get("type") ?? "";
  const catalogOnly = searchParams.get("catalog_only") === "true";
  const requestedTarget = searchParams.get("target");
  const page = Number(searchParams.get("page") ?? "1");
  const display = Math.min(Number(searchParams.get("display") ?? "10"), 50);
  const limit = Math.min(Number(searchParams.get("limit") ?? "20"), 100);

  if (!query) {
    return jsonResponse(
      {
        ok: false,
        error: "Missing required query parameter: query.",
      },
      { status: 400 }
    );
  }

  const catalog = searchCatalog({
    query,
    source:
      source === "defense_laws" || source === "admin_rules" ? source : "all",
    type,
    limit,
  });
  const target =
    requestedTarget && requestedTarget !== "auto"
      ? normalizeTarget(requestedTarget)
      : catalog.items[0]?.target ?? "law";

  if (catalogOnly) {
    return jsonResponse({
      ok: true,
      query,
      catalog,
      upstream: null,
    });
  }

  try {
    const upstream = await searchLawApi({
      target,
      query,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      display: Number.isFinite(display) && display > 0 ? display : 10,
    });
    const wantedName = normalizeName(catalog.items[0]?.name ?? catalog.items[0]?.query ?? query);
    const bestItem =
      upstream.items.find((item) => normalizeName(item.name) === wantedName) ??
      selectBestSearchItem(upstream.items, catalog.items[0]?.query ?? query);
    const items = bestItem
      ? [bestItem, ...upstream.items.filter((item) => item !== bestItem)]
      : upstream.items;

    return jsonResponse({
      ok: true,
      query,
      target,
      catalog,
      upstream: {
        requestUrl: upstream.requestUrl,
        items,
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        query,
        target,
        catalog,
        error: "Failed to call the National Law Information search API.",
        message: error instanceof Error ? error.message : "unknown error",
        hint: "Set the National Law Information OPEN API OC value in LAW_API_KEY or LAW_API_OC on Vercel.",
      },
      { status: 502 }
    );
  }
}
