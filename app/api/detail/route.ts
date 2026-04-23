import { findBestCatalogMatch } from "@/lib/dapa-catalog";
import { jsonResponse, optionsResponse } from "@/lib/http";
import {
  extractArticle,
  getLawDetail,
  normalizeTarget,
  selectBestSearchItem,
  searchLawApiMultiTarget,
} from "@/lib/law-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

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
  const requestedTarget = searchParams.get("target");
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

    if (query) {
      const search = await searchLawApiMultiTarget({
        target: requestedTarget,
        query,
        display: 5,
      });
      selectedSearchItem = selectBestSearchItem(search.items, query);
      detailId = selectedSearchItem?.id ?? detailId;
      detailMst = selectedSearchItem?.mst ?? detailMst;
      target = selectedSearchItem?.target ?? fallbackTarget;
    }

    if (!detailId && !detailMst) {
      return jsonResponse(
        {
          ok: false,
          error: "Could not find an ID or MST for detail lookup from search results.",
          query,
          target,
          catalogMatch,
        },
        { status: 404 }
      );
    }

    const detail = await getLawDetail({
      target,
      id: detailId,
      mst: detailMst,
    });
    const extractedArticle = extractArticle(detail.parsed, article);

    return jsonResponse({
      ok: true,
      query,
      target,
      id: detailId,
      mst: detailMst,
      catalogMatch,
      selectedSearchItem,
      requestUrl: detail.requestUrl,
      article: extractedArticle,
      data: detail.parsed,
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        query,
        target: requestedTarget ?? "auto",
        catalogMatch,
        error: "Failed to call the National Law Information detail API.",
        message: error instanceof Error ? error.message : "unknown error",
        hint: "Set the National Law Information OPEN API OC value in LAW_API_KEY or LAW_API_OC on Vercel.",
      },
      { status: 502 }
    );
  }
}
