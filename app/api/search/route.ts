import { XMLParser, XMLValidator } from "fast-xml-parser";

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
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
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
    id: getObjectValue(item, ["법령ID", "ID"]),
    mst: getObjectValue(item, ["MST", "법령일련번호", "mst"]),
    lawName: getObjectValue(item, ["법령명한글", "법령명", "lawNm", "법령명_한글"]),
    lawType: getObjectValue(item, ["법령구분명", "법종구분", "법종구분명", "법종"]),
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

type SearchAttempt = {
  category: string;
  target: string;
  finalQuery: string;
  parsed: Record<string, unknown>;
  items: Array<{
    id: string;
    mst: string;
    lawName: string;
    lawType: string;
    effectiveDate: string;
    department: string;
    raw: Record<string, unknown>;
  }>;
};

type QueryAttempt = {
  originalQuery: string;
  finalQuery: string;
  usedAgencyPriority: boolean;
};

function sanitizeXml(xml: string) {
  return xml.replace(/^\uFEFF/, "").trim();
}

function parseXmlOrThrow(xml: string) {
  const sanitized = sanitizeXml(xml);
  const validation = XMLValidator.validate(sanitized);

  if (validation !== true) {
    throw new Error(
      typeof validation === "object"
        ? validation.err.msg
        : "유효하지 않은 XML 응답"
    );
  }

  return parser.parse(sanitized) as Record<string, unknown>;
}

async function runSearchAttempt(params: {
  category: string;
  queryAttempt: QueryAttempt;
  page: string;
  display: string;
}) {
  const target = categoryToTarget(params.category);
  const finalQuery = params.queryAttempt.finalQuery;

  const url = buildSearchUrl({
    target,
    type: "XML",
    query: finalQuery,
    page: params.page,
    display: params.display,
    sort: "lasc",
  });

  const res = await fetch(url, { cache: "no-store" });
  const xml = await res.text();

  if (!res.ok) {
    return {
      ok: false as const,
      status: res.status,
      raw: xml,
      category: params.category,
      target,
      finalQuery,
    };
  }

  const parsed = parseXmlOrThrow(xml);
  const apiError = extractApiError(parsed);

  if (apiError) {
    return {
      ok: false as const,
      status: 502,
      raw: parsed,
      apiError,
      category: params.category,
      target,
      finalQuery,
    };
  }

  const items = normalizeSearchItems(parsed);

    return {
      ok: true as const,
      result: {
      category: params.category,
      target,
      finalQuery,
      parsed,
      items,
    } satisfies SearchAttempt,
  };
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

  try {
    const fallbackCategories =
      category === "law"
        ? ["law", "admin_rule", "ordinance", "ministry_interpretation"]
        : [category];
    const queryAttempts: QueryAttempt[] = [
      {
        originalQuery: query,
        finalQuery: query,
        usedAgencyPriority: false,
      },
    ];

    if (agencyPriority) {
      const priorityQuery = buildPriorityQuery(query, agencyPriority);
      if (priorityQuery !== query) {
        queryAttempts.push({
          originalQuery: query,
          finalQuery: priorityQuery,
          usedAgencyPriority: true,
        });
      }
    }

    const attempts: Array<{
      category: string;
      target: string;
      itemCount: number;
      finalQuery: string;
      usedAgencyPriority: boolean;
    }> = [];
    let matched: SearchAttempt | null = null;

    for (const queryAttempt of queryAttempts) {
      for (const candidateCategory of fallbackCategories) {
        const attempt = await runSearchAttempt({
          category: candidateCategory,
          queryAttempt,
          page,
          display,
        });

        if (!attempt.ok) {
          return Response.json(
            {
              ok: false,
              error: "국가법령정보 검색 API 오류",
              category: candidateCategory,
              target: attempt.target,
              requested_query: query,
              effective_query: attempt.finalQuery,
              api_error: attempt.apiError,
              raw: attempt.raw,
            },
            { status: attempt.status === 502 ? 502 : 500 }
          );
        }

        attempts.push({
          category: attempt.result.category,
          target: attempt.result.target,
          itemCount: attempt.result.items.length,
          finalQuery: attempt.result.finalQuery,
          usedAgencyPriority: queryAttempt.usedAgencyPriority,
        });

        if (attempt.result.items.length > 0) {
          matched = attempt.result;
          break;
        }

        if (!matched) {
          matched = attempt.result;
        }
      }

      if (matched && matched.items.length > 0) {
        break;
      }
    }

    if (!matched) {
      return Response.json(
        {
          ok: false,
          error: "검색 결과를 생성하지 못했습니다.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      ok: true,
      category: matched.category,
      requested_category: category,
      target: matched.target,
      agency_priority: agencyPriority,
      requested_query: query,
      effective_query: matched.finalQuery,
      agency_priority_applied: matched.finalQuery !== query,
      fallback_used: matched.category !== category,
      searched_categories: attempts,
      items: matched.items,
      data: matched.parsed,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "알 수 없는 XML 파싱 오류";

    return Response.json(
      {
        ok: false,
        error: "XML 파싱 실패",
        message,
      },
      { status: 500 }
    );
  }
}
