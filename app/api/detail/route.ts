import { findBestCatalogMatch } from "@/lib/dapa-catalog";
import { jsonResponse, optionsResponse } from "@/lib/http";
import {
  extractArticle,
  getLawDetail,
  normalizeRequestedTarget,
  normalizeTarget,
  selectBestSearchItem,
  searchLawApiMultiTarget,
} from "@/lib/law-api";

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
  const catalogMatch = query ? findBestCatalogMatch(query) : null;
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
    let detailId = id;
    let detailMst = mst;
    let selectedSearchItem = null;
    let target = fallbackTarget;
    let detailQuery = query;

    if (query) {
      const search = await searchLawApiMultiTarget({
        target: requestedTarget,
        query,
        display: 5,
      });
      selectedSearchItem = selectBestSearchItem(search.items, query);
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
          selectedSearchItem,
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
      selectedSearchItem,
      requestUrl: detail.requestUrl,
      article: extractedArticle,
      normalized,
      data: includeRaw ? detail.parsed : undefined,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        query,
        category: normalizeRequestedTarget(requestedTarget),
        catalogMatch,
        error: "Failed to call the National Law Information detail API.",
        message: error instanceof Error ? error.message : "unknown error",
        hint: "Set the National Law Information OPEN API OC value in LAW_API_KEY or LAW_API_OC on Vercel.",
      },
      { status: 502 }
    );
  }
}
