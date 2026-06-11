import { findBestCatalogMatch } from "@/lib/dapa-catalog";
import { jsonResponse, optionsResponse } from "@/lib/http";
import {
  extractArticle,
  getLawDetail,
  type LawSearchItem,
  normalizeRequestedTarget,
  normalizeTarget,
  selectBestSearchItem,
  searchLawApiMultiTarget,
} from "@/lib/law-api";
import {
  isSupabaseCatalogConfigured,
  searchSupabaseCatalog,
} from "@/lib/supabase-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

function truncateText(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n...[truncated]`;
}

export async function OPTIONS() {
  return optionsResponse();
}

function redactOc(value: string) {
  return value.replace(/([?&]OC=)[^&]+/gi, "$1REDACTED");
}

function toPublicSearchItem(item: LawSearchItem | null) {
  if (!item) {
    return null;
  }

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

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query =
    searchParams.get("query")?.trim() ||
    searchParams.get("name")?.trim() ||
    searchParams.get("title")?.trim() ||
    "";
  const id = searchParams.get("id")?.trim() || "";
  const mst = searchParams.get("mst")?.trim() || "";
  const article = searchParams.get("article")?.trim() || "";
  const includeRaw = searchParams.get("include_raw") === "true";
  const requestedTarget =
    searchParams.get("category")?.trim() || searchParams.get("target")?.trim() || "auto";
  let catalogMatch = query ? findBestCatalogMatch(query) : null;
  let catalogStorage: "supabase" | "local_json" = "local_json";
  const fallbackTarget =
    requestedTarget && requestedTarget !== "auto"
      ? normalizeTarget(requestedTarget)
      : "law";

  if (!query && !id && !mst) {
    return jsonResponse(
      {
        ok: false,
        error: "One of query, id, or mst is required.",
      },
      { status: 400 }
    );
  }

  try {
    if (query && isSupabaseCatalogConfigured()) {
      try {
        const supabaseCatalog = await searchSupabaseCatalog({
          query,
          limit: 1,
        });
        catalogMatch = supabaseCatalog.items[0] ?? catalogMatch;
        catalogStorage = "supabase";
      } catch {
        catalogStorage = "local_json";
      }
    }

    let detailId = id;
    let detailMst = mst;
    let selectedSearchItem = null;
    let target = fallbackTarget;
    let detailQuery = catalogMatch?.query || query;

    if (query && requestedTarget && requestedTarget !== "auto" && fallbackTarget === "admrul" && !id && !mst) {
      try {
        const directDetail = await getLawDetail({
          target: fallbackTarget,
          query: detailQuery,
        });
        const directArticle = extractArticle(directDetail.parsed, article);
        return jsonResponse({
          ok: true,
          query,
          category: fallbackTarget,
          id: "",
          mst: "",
          detailQuery,
          catalogMatch,
          catalogStorage,
          selectedSearchItem: null,
          requestUrl: directDetail.requestUrl,
          article: directArticle,
          normalized: {
            ...directDetail.normalized,
            bodyText: directArticle ? "" : truncateText(directDetail.normalized.bodyText, 4000),
          },
          data: includeRaw ? directDetail.parsed : undefined,
        });
      } catch {
        // Fall through to search-based resolution.
      }
    }

    if (query) {
      const search = await searchLawApiMultiTarget({
        target: requestedTarget,
        query: detailQuery,
        display: 5,
      });
      selectedSearchItem = selectBestSearchItem(search.items, detailQuery);
      detailId = selectedSearchItem?.id ?? detailId;
      detailMst =
        selectedSearchItem?.mst || selectedSearchItem?.alternateId || detailMst;
      detailQuery = selectedSearchItem?.detailQuery || detailQuery;
      target = selectedSearchItem?.target ?? fallbackTarget;
    }

    if (target === "law_appendix" || target === "admrul_appendix" || target === "ordin_appendix") {
      return jsonResponse(
        {
          ok: false,
          error: "Appendix and form categories are search-only. Use /api/search for these categories.",
          query,
          category: target,
          catalogMatch,
          catalogStorage,
          selectedSearchItem: toPublicSearchItem(selectedSearchItem),
        },
        { status: 400 }
      );
    }

    if (target !== "lstrm" && !detailId && !detailMst) {
      return jsonResponse(
        {
          ok: false,
          error: "Could not find an ID or MST for detail lookup from search results.",
          query,
          category: target,
          catalogMatch,
          catalogStorage,
        },
        { status: 404 }
      );
    }

    const detail = await getLawDetail({
      target,
      id: detailId,
      mst: detailMst,
      query: detailQuery,
    });
    const extractedArticle = extractArticle(detail.parsed, article);
    const normalized = {
      ...detail.normalized,
      bodyText: extractedArticle
        ? ""
        : truncateText(detail.normalized.bodyText, 4000),
    };

    return jsonResponse({
      ok: true,
      query,
      category: target,
      id: detailId,
      mst: detailMst,
      detailQuery,
      catalogMatch,
      catalogStorage,
      selectedSearchItem: toPublicSearchItem(selectedSearchItem),
      requestUrl: detail.requestUrl,
      article: extractedArticle,
      normalized,
      data: includeRaw ? detail.parsed : undefined,
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      query,
      category: normalizeRequestedTarget(requestedTarget),
      catalogMatch,
      catalogStorage,
      error: "Failed to call the National Law Information detail API.",
      message: error instanceof Error ? error.message : "unknown error",
      hint: "The DAPA catalog lookup was returned when available, but the live National Law Information API detail lookup failed. Retry with query, id, or mst.",
    });
  }
}
