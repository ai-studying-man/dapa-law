import { searchCatalog } from "@/lib/dapa-catalog";
import type { CatalogItem } from "@/lib/dapa-catalog";
import { jsonResponse, optionsResponse } from "@/lib/http";
import {
  type LawSearchItem,
  normalizeRequestedTarget,
  searchLawApiMultiTarget,
  selectBestSearchItem,
} from "@/lib/law-api";
import {
  isSupabaseCatalogConfigured,
  searchSupabaseCatalog,
} from "@/lib/supabase-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

export async function OPTIONS() {
  return optionsResponse();
}

function redactOc(value: string) {
  return value.replace(/([?&]OC=)[^&]+/gi, "$1REDACTED");
}

function toPublicSearchItem(item: LawSearchItem) {
  return {
    target: item.target,
    upstreamTarget: item.upstreamTarget,
    id: item.id,
    mst: item.mst,
    alternateId: item.alternateId,
    name: item.name,
    type: item.type,
    effectiveDate: item.effectiveDate,
    promulgationDate: item.promulgationDate,
    department: item.department,
    detailUrl: item.detailUrl ? redactOc(item.detailUrl) : "",
    detailQuery: item.detailQuery,
    searchOnly: item.searchOnly,
  };
}

function toCatalogSearchItem(item: CatalogItem & { matchScore?: number }) {
  return {
    target: item.target,
    upstreamTarget: item.target === "admrul" ? "admrul" : item.target,
    id: "",
    mst: "",
    alternateId: "",
    name: item.name,
    type: item.type,
    effectiveDate: item.latestModifiedDate?.replace(/-/g, "") ?? "",
    promulgationDate: item.latestModifiedDate?.replace(/-/g, "") ?? "",
    department: item.source === "admin_rules" ? "방위사업청" : "",
    detailUrl: item.sourceUrl ?? "",
    detailQuery: item.query,
    searchOnly: false,
    source: item.source,
    matchScore: item.matchScore ?? 0,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const source = searchParams.get("source") ?? "all";
  const type = searchParams.get("type") ?? "";
  const catalogOnly = searchParams.get("catalog_only") === "true";
  const requestedTarget =
    searchParams.get("category")?.trim() || searchParams.get("target")?.trim() || "auto";
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

  const catalogSource =
    source === "defense_laws" || source === "admin_rules" ? source : "all";
  let catalogStorage: "supabase" | "local_json" = "local_json";
  let catalog = searchCatalog({
    query,
    source: catalogSource,
    type,
    limit,
  });

  if (isSupabaseCatalogConfigured()) {
    try {
      catalog = await searchSupabaseCatalog({
        query,
        source: catalogSource,
        type,
        limit,
      });
      catalogStorage = "supabase";
    } catch {
      catalogStorage = "local_json";
    }
  }

  if (catalogOnly) {
    return jsonResponse({
      ok: true,
      query,
      catalog: {
        ...catalog,
        storage: catalogStorage,
      },
      upstream: null,
    });
  }

  if (normalizeRequestedTarget(requestedTarget) === "admrul" && catalog.items.length > 0) {
    return jsonResponse({
      ok: true,
      query,
      category: "admrul",
      catalog: {
        ...catalog,
        storage: catalogStorage,
      },
      upstream: {
        requestUrls: [],
        items: catalog.items.map(toCatalogSearchItem),
        source: "dapa_supabase_catalog",
      },
      nextStep:
        "Use /api/detail with category=admrul and query from the selected item to retrieve live document text from the National Law Information API.",
    });
  }

  try {
    const upstream = await searchLawApiMultiTarget({
      target: requestedTarget,
      query,
      page: Number.isFinite(page) && page > 0 ? page : 1,
      display: Number.isFinite(display) && display > 0 ? display : 10,
    });
    const bestItem = selectBestSearchItem(upstream.items, query);
    const items = bestItem
      ? [bestItem, ...upstream.items.filter((item) => item !== bestItem)]
      : upstream.items;

    return jsonResponse({
      ok: true,
      query,
      category: bestItem?.target ?? normalizeRequestedTarget(requestedTarget),
      catalog: {
        ...catalog,
        storage: catalogStorage,
      },
      upstream: {
        requestUrls: upstream.requestUrls,
        items: items.map(toPublicSearchItem),
      },
    });
  } catch (error) {
    if (catalog.items.length > 0) {
      return jsonResponse({
        ok: true,
        query,
        category: catalog.items[0]?.target ?? normalizeRequestedTarget(requestedTarget),
        catalog: {
          ...catalog,
          storage: catalogStorage,
        },
        upstream: {
          requestUrls: [],
          items: catalog.items.map(toCatalogSearchItem),
          source: "dapa_supabase_catalog",
        },
        nextStep:
          "Use /api/detail with query and category from the selected item to retrieve live document text from the National Law Information API.",
      });
    }

    return jsonResponse({
      ok: false,
      query,
      category: normalizeRequestedTarget(requestedTarget),
      catalog: {
        ...catalog,
        storage: catalogStorage,
      },
      upstream: null,
      error: "Failed to call the National Law Information search API.",
      message: error instanceof Error ? error.message : "unknown error",
      hint: "The DAPA catalog was returned, but the live National Law Information API lookup failed. Retry the live search or call /api/catalog for catalog-only lookup.",
    });
  }
}
