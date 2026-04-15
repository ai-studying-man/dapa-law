import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

function buildSearchUrl(params: Record<string, string>) {
  const base = process.env.LAW_API_BASE || "https://www.law.go.kr/DRF";
  const url = new URL(`${base}/lawSearch.do`);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  const oc = process.env.LAW_API_KEY;
  if (oc) {
    url.searchParams.set("OC", oc);
  }

  return url.toString();
}

function categoryToTarget(category: string) {
  const map: Record<string, string> = {
    law: "law",
    admin_rule: "admrul",
    ordinance: "ordin",
    precedent: "prec",
    const_case: "decc",
    interpretation: "expc",
    admin_appeal: "adju",
    committee_decision: "committee",
    treaty: "treaty",
    form: "form",
    public_org: "public",
    term: "lsTerm",
    mobile: "mobile",
    custom: "custom",
    knowledge_base: "legalKb",
    ministry_interpretation: "molegCgmExpc",
    special_admin_appeal: "specialAdju",
    consulting_opinion: "auditPreCons",
  };

  return map[category] || "law";
}

function buildPriorityQuery(query: string, agencyPriority: string) {
  if (!agencyPriority) {
    return query;
  }
  if (agencyPriority === "방위사업청") {
    return `${query} 방위사업청`;
  }
  return `${query} ${agencyPriority}`;
}

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function getObjectValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function normalizeSearchItems(parsed: Record<string, unknown>) {
  const lawSearch =
    parsed.LawSearch && typeof parsed.LawSearch === "object"
      ? (parsed.LawSearch as Record<string, unknown>)
      : null;

  if (!lawSearch) {
    return [];
  }

  const listCandidates = [
    lawSearch.law,
    lawSearch.법령,
    lawSearch.item,
    lawSearch.items,
    lawSearch.result,
    lawSearch.results,
  ];

  const rawItems = listCandidates.flatMap((candidate) =>
    asArray(candidate).filter(
      (item): item is Record<string, unknown> =>
        typeof item === "object" && item !== null
    )
  );

  return rawItems.map((item) => ({
    id: getObjectValue(item, ["법령ID", "법령일련번호", "ID", "id"]),
    mst: getObjectValue(item, ["MST", "mst"]),
    lawName: getObjectValue(item, ["법령명한글", "법령명", "lawNm", "법령명_한글"]),
    lawType: getObjectValue(item, ["법종구분", "법종구분명", "법종"]),
    effectiveDate: getObjectValue(item, ["시행일자", "공포일자"]),
    department: getObjectValue(item, ["소관부처명", "소관부처"]),
    raw: item,
  }));
}

function extractApiError(parsed: Record<string, unknown>) {
  if (
    parsed.Response &&
    typeof parsed.Response === "object" &&
    parsed.Response !== null
  ) {
    const response = parsed.Response as Record<string, unknown>;
    const result =
      typeof response.result === "string" ? response.result.trim() : "";
    const message = typeof response.msg === "string" ? response.msg.trim() : "";

    if (result || message) {
      return {
        result,
        message,
      };
    }
  }

  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const category = searchParams.get("category") || "law";
  const query = searchParams.get("query") || "";
  const agencyPriority =
    searchParams.get("agency_priority") ||
    process.env.DEFAULT_AGENCY ||
    "방위사업청";
  const page = searchParams.get("page") || "1";
  const display = searchParams.get("display") || "20";

  if (!query) {
    return Response.json(
      { ok: false, error: "query 파라미터가 필요합니다." },
      { status: 400 }
    );
  }

  const target = categoryToTarget(category);
  const finalQuery = buildPriorityQuery(query, agencyPriority);

  const url = buildSearchUrl({
    target,
    type: "XML",
    query: finalQuery,
    page,
    display,
    sort: "lasc",
  });

  const res = await fetch(url, { cache: "no-store" });
  const xml = await res.text();

  if (!res.ok) {
    return Response.json(
      {
        ok: false,
        error: "국가법령정보 API 호출 실패",
        status: res.status,
        raw: xml,
      },
      { status: 500 }
    );
  }

  try {
    const parsed = parser.parse(xml);
    const apiError = extractApiError(parsed as Record<string, unknown>);

    if (apiError) {
      return Response.json(
        {
          ok: false,
          error: "국가법령정보 검색 API 오류",
          category,
          target,
          requested_query: query,
          effective_query: finalQuery,
          api_error: apiError,
          raw: parsed,
        },
        { status: 502 }
      );
    }

    const items = normalizeSearchItems(parsed as Record<string, unknown>);

    return Response.json({
      ok: true,
      category,
      target,
      agency_priority: agencyPriority,
      requested_query: query,
      effective_query: finalQuery,
      items,
      data: parsed,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error: "XML 파싱 실패",
        raw: xml,
      },
      { status: 500 }
    );
  }
}
