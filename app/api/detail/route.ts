import { findBestCatalogMatch } from "@/lib/dapa-catalog";
import { jsonResponse, optionsResponse } from "@/lib/http";
import {
  extractArticle,
  getLawDetail,
  normalizeTarget,
  selectBestSearchItem,
  searchLawApi,
} from "@/lib/law-api";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

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
  const target =
    requestedTarget && requestedTarget !== "auto"
      ? normalizeTarget(requestedTarget)
      : catalogMatch?.target ?? "law";

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

    if (query) {
      const search = await searchLawApi({
        target,
        query: catalogMatch?.query ?? query,
        display: 5,
      });
      const wantedName = normalizeName(catalogMatch?.name ?? catalogMatch?.query ?? query);
      selectedSearchItem =
        search.items.find((item) => normalizeName(item.name) === wantedName) ??
        selectBestSearchItem(search.items, catalogMatch?.query ?? query);
      detailId = selectedSearchItem?.id ?? detailId;
      detailMst = selectedSearchItem?.mst ?? detailMst;
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
        target,
        catalogMatch,
        error: "Failed to call the National Law Information detail API.",
        message: error instanceof Error ? error.message : "unknown error",
        hint: "Set the National Law Information OPEN API OC value in LAW_API_KEY or LAW_API_OC on Vercel.",
      },
      { status: 502 }
    );
  }
}
