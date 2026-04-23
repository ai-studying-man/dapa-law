import { XMLParser, XMLValidator } from "fast-xml-parser";

export type LawTarget = "law" | "admrul" | "ordin";

export type LawSearchItem = {
  target: LawTarget;
  id: string;
  mst: string;
  name: string;
  type: string;
  effectiveDate: string;
  promulgationDate: string;
  department: string;
  raw: Record<string, unknown>;
};

function normalizeMatchText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\u300C\u300D\u300E\u300F()[\]{}'".,]/g, "")
    .trim();
}

function toComparableDate(value: string) {
  const numeric = value.replace(/[^\d]/g, "");
  return numeric || "0";
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
});

const KO = {
  law: "\uBC95\uB839",
  adminRule: "\uD589\uC815\uADDC\uCE59",
  ordinance: "\uC790\uCE58\uBC95\uADDC",
  lawSearchRoot: "LawSearch",
  adminRuleSearchRoot: "AdmRulSearch",
  ordinanceSearchRoot: "OrdinSearch",
  lawId: "\uBC95\uB839ID",
  adminRuleId: "\uD589\uC815\uADDC\uCE59ID",
  ordinanceId: "\uC790\uCE58\uBC95\uADDCID",
  lawSerial: "\uBC95\uB839\uC77C\uB828\uBC88\uD638",
  adminRuleSerial: "\uD589\uC815\uADDC\uCE59\uC77C\uB828\uBC88\uD638",
  ordinanceSerial: "\uC790\uCE58\uBC95\uADDC\uC77C\uB828\uBC88\uD638",
  lawDetailLink: "\uBC95\uB839\uC0C1\uC138\uB9C1\uD06C",
  adminRuleDetailLink: "\uD589\uC815\uADDC\uCE59\uC0C1\uC138\uB9C1\uD06C",
  ordinanceDetailLink: "\uC790\uCE58\uBC95\uADDC\uC0C1\uC138\uB9C1\uD06C",
  lawNameKo: "\uBC95\uB839\uBA85\uD55C\uAE00",
  lawName: "\uBC95\uB839\uBA85",
  adminRuleName: "\uD589\uC815\uADDC\uCE59\uBA85",
  ordinanceName: "\uC790\uCE58\uBC95\uADDC\uBA85",
  lawClassName: "\uBC95\uB839\uAD6C\uBD84\uBA85",
  lawTypeName: "\uBC95\uC885\uAD6C\uBD84\uBA85",
  adminRuleType: "\uD589\uC815\uADDC\uCE59\uC885\uB958",
  ordinanceType: "\uC790\uCE58\uBC95\uADDC\uC885\uB958",
  effectiveDate: "\uC2DC\uD589\uC77C\uC790",
  effectiveDay: "\uC2DC\uD589\uC77C",
  effectStartDate: "\uD6A8\uB825\uBC1C\uC0DD\uC77C\uC790",
  promulgationDate: "\uACF5\uD3EC\uC77C\uC790",
  issueDate: "\uBC1C\uB839\uC77C\uC790",
  promulgationDay: "\uACF5\uD3EC\uC77C",
  ministryName: "\uC18C\uAD00\uBD80\uCC98\uBA85",
  ministry: "\uC18C\uAD00\uBD80\uCC98",
  agencyName: "\uAE30\uAD00\uBA85",
  articleNumber: "\uC870\uBB38\uBC88\uD638",
  articleBranchNumber: "\uC870\uBB38\uAC00\uC9C0\uBC88\uD638",
  articleKey: "\uC870\uBB38\uD0A4",
  articleNo: "\uC870\uBC88\uD638",
  article: "\uC870",
  articleTitle: "\uC870\uBB38\uC81C\uBAA9",
  articleText: "\uC870\uBB38\uB0B4\uC6A9",
  title: "\uC81C\uBAA9",
};

const TARGET_ALIASES: Record<string, LawTarget> = {
  law: "law",
  laws: "law",
  [KO.law]: "law",
  admin_rule: "admrul",
  admin_rules: "admrul",
  admrul: "admrul",
  [KO.adminRule]: "admrul",
  ordinance: "ordin",
  ordin: "ordin",
  [KO.ordinance]: "ordin",
};

const ALL_TARGETS: LawTarget[] = ["law", "admrul", "ordin"];

export function normalizeTarget(value?: string | null): LawTarget {
  if (!value) {
    return "law";
  }

  return TARGET_ALIASES[value] ?? "law";
}

function getLawApiBases() {
  if (process.env.LAW_API_BASE) {
    return [process.env.LAW_API_BASE];
  }

  return ["https://www.law.go.kr/DRF", "http://www.law.go.kr/DRF"];
}

function addCommonParams(url: URL) {
  const oc = process.env.LAW_API_KEY || process.env.LAW_API_OC;

  if (oc) {
    url.searchParams.set("OC", oc);
  }
}

function buildUrl(
  base: string,
  path: "lawSearch.do" | "lawService.do",
  params: Record<string, string>
) {
  const url = new URL(`${base}/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  addCommonParams(url);
  return url;
}

function sanitizeXml(xml: string) {
  return xml.replace(/^\uFEFF/, "").trim();
}

export function parseXml(xml: string) {
  const sanitized = sanitizeXml(xml);
  const validation = XMLValidator.validate(sanitized);

  if (validation !== true) {
    throw new Error(
      typeof validation === "object" ? validation.err.msg : "Invalid XML response."
    );
  }

  return parser.parse(sanitized) as Record<string, unknown>;
}

function readString(source: Record<string, unknown>, keys: string[]) {
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

function extractApiError(parsed: Record<string, unknown>) {
  const response = parsed.Response;

  if (response && typeof response === "object" && !Array.isArray(response)) {
    const result = readString(response as Record<string, unknown>, ["result"]);
    const message = readString(response as Record<string, unknown>, ["msg", "message"]);

    if (result || message) {
      return { result, message };
    }
  }

  return null;
}

async function fetchXml(url: URL) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/xml, text/xml, */*",
      "User-Agent": "Mozilla/5.0 (compatible; DAPA-Law-Proxy/1.0)",
    },
  });
  const xml = await response.text();

  if (!response.ok) {
    throw new Error(`Law API request failed: HTTP ${response.status}`);
  }

  const parsed = parseXml(xml);
  const apiError = extractApiError(parsed);

  if (apiError) {
    const message = [apiError.result, apiError.message].filter(Boolean).join(" - ");
    throw new Error(message || "Law API error.");
  }

  return { parsed, xml };
}

async function fetchXmlWithFallback(
  path: "lawSearch.do" | "lawService.do",
  params: Record<string, string>
) {
  let lastError: unknown;

  for (const base of getLawApiBases()) {
    const url = buildUrl(base, path, params);

    try {
      const result = await fetchXml(url);
      return {
        ...result,
        requestUrl: redactApiKey(url),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Law API request failed.");
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!value) {
    return [];
  }

  const values = Array.isArray(value) ? value : [value];

  return values.filter(
    (item): item is Record<string, unknown> => !!item && typeof item === "object"
  );
}

function extractDetailIdFromLink(item: Record<string, unknown>) {
  const detailLink = readString(item, [
    KO.lawDetailLink,
    KO.adminRuleDetailLink,
    KO.ordinanceDetailLink,
    "detailLink",
  ]);

  if (!detailLink) {
    return "";
  }

  try {
    const url = new URL(detailLink, getLawApiBases()[0]);
    return url.searchParams.get("ID")?.trim() ?? "";
  } catch {
    return "";
  }
}

export function normalizeSearchItems(parsed: Record<string, unknown>) {
  const root =
    parsed[KO.lawSearchRoot] && typeof parsed[KO.lawSearchRoot] === "object"
      ? (parsed[KO.lawSearchRoot] as Record<string, unknown>)
      : parsed[KO.adminRuleSearchRoot] && typeof parsed[KO.adminRuleSearchRoot] === "object"
      ? (parsed[KO.adminRuleSearchRoot] as Record<string, unknown>)
      : parsed[KO.ordinanceSearchRoot] && typeof parsed[KO.ordinanceSearchRoot] === "object"
        ? (parsed[KO.ordinanceSearchRoot] as Record<string, unknown>)
        : parsed;

  const candidates = [
    ...asRecordArray(root.law),
    ...asRecordArray(root.admrul),
    ...asRecordArray(root.ordin),
    ...asRecordArray(root.item),
    ...asRecordArray(root.items),
    ...asRecordArray(root[KO.law]),
    ...asRecordArray(root[KO.adminRule]),
    ...asRecordArray(root[KO.ordinance]),
  ];

  const seen = new Set<string>();

  return candidates
    .map((item): LawSearchItem => {
      const detailIdFromLink = extractDetailIdFromLink(item);
      const hasAdminRuleFields = Boolean(
        item[KO.adminRuleSerial] || item[KO.adminRuleId] || item[KO.adminRuleName]
      );
      const hasOrdinanceFields = Boolean(
        item[KO.ordinanceSerial] || item[KO.ordinanceId] || item[KO.ordinanceName]
      );
      const hasLawFields = Boolean(item[KO.lawSerial] || item[KO.lawId] || item[KO.lawName]);
      const target = hasAdminRuleFields ? "admrul" : hasOrdinanceFields ? "ordin" : "law";
      const id = hasAdminRuleFields
        ? readString(item, [KO.adminRuleSerial, "ID", "id", KO.adminRuleId]) || detailIdFromLink
        : hasOrdinanceFields
          ? readString(item, [KO.ordinanceSerial, "ID", "id", KO.ordinanceId]) ||
            detailIdFromLink
          : readString(item, [KO.lawId, "ID", "id"]) || detailIdFromLink;
      const mst = hasLawFields
        ? readString(item, [
            "MST",
            "mst",
            KO.lawSerial,
          ])
        : readString(item, [
            "MST",
            "mst",
          ]);
      const fallbackMst = readString(item, [
        KO.lawSerial,
        KO.adminRuleSerial,
        KO.ordinanceSerial,
      ]);
      const name = readString(item, [
        KO.lawNameKo,
        KO.lawName,
        KO.adminRuleName,
        KO.ordinanceName,
        "lawNm",
        "lsNm",
      ]);

      return {
        target,
        id,
        mst: mst || fallbackMst,
        name,
        type: readString(item, [
          KO.lawClassName,
          KO.lawTypeName,
          KO.adminRuleType,
          KO.ordinanceType,
        ]),
        effectiveDate: readString(item, [
          KO.effectiveDate,
          KO.effectiveDay,
          KO.effectStartDate,
        ]),
        promulgationDate: readString(item, [
          KO.promulgationDate,
          KO.issueDate,
          KO.promulgationDay,
        ]),
        department: readString(item, [KO.ministryName, KO.ministry, KO.agencyName]),
        raw: item,
      };
    })
    .filter((item) => item.name || item.id || item.mst)
    .filter((item) => {
      const key = `${item.id}:${item.mst}:${item.name}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export function selectBestSearchItem(items: LawSearchItem[], query: string) {
  const normalizedQuery = normalizeMatchText(query);

  if (!normalizedQuery) {
    return items[0] ?? null;
  }

  const scored = items
    .map((item) => {
      const normalizedName = normalizeMatchText(item.name);
      let score = 0;

      if (normalizedName === normalizedQuery) {
        score = 300;
      } else if (normalizedName.includes(normalizedQuery)) {
        score = 200;
      } else if (normalizedQuery.includes(normalizedName)) {
        score = 150;
      } else if (item.name.includes(query)) {
        score = 100;
      }

      return { item, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const effectiveCompare = toComparableDate(b.item.effectiveDate).localeCompare(
        toComparableDate(a.item.effectiveDate)
      );
      if (effectiveCompare !== 0) {
        return effectiveCompare;
      }

      const promulgationCompare = toComparableDate(b.item.promulgationDate).localeCompare(
        toComparableDate(a.item.promulgationDate)
      );
      if (promulgationCompare !== 0) {
        return promulgationCompare;
      }

      return a.item.name.localeCompare(b.item.name, "ko");
    });

  return scored[0]?.item ?? null;
}

export function resolveSearchTargets(value?: string | null) {
  if (!value || value === "auto") {
    return ALL_TARGETS;
  }

  return [normalizeTarget(value)];
}

export async function searchLawApi(params: {
  target: LawTarget;
  query: string;
  page?: number;
  display?: number;
}) {
  const { parsed, requestUrl } = await fetchXmlWithFallback("lawSearch.do", {
    target: params.target,
    type: "XML",
    query: params.query,
    page: String(params.page ?? 1),
    display: String(params.display ?? 10),
    sort: "lasc",
  });

  return {
    requestUrl,
    parsed,
    items: normalizeSearchItems(parsed),
  };
}

export async function searchLawApiMultiTarget(params: {
  target?: string | null;
  query: string;
  page?: number;
  display?: number;
}) {
  const targets = resolveSearchTargets(params.target);
  const settled = await Promise.allSettled(
    targets.map((target) =>
      searchLawApi({
        target,
        query: params.query,
        page: params.page,
        display: params.display,
      })
    )
  );

  const results = settled.flatMap((result, index) =>
    result.status === "fulfilled"
      ? [
          {
            target: targets[index],
            requestUrl: result.value.requestUrl,
            items: result.value.items.map((item) => ({
              ...item,
              target: item.target || targets[index],
            })),
          },
        ]
      : []
  );

  if (results.length === 0) {
    const firstError = settled.find((result) => result.status === "rejected");
    throw (
      (firstError && firstError.status === "rejected" ? firstError.reason : null) ??
      new Error("Law API request failed.")
    );
  }

  return {
    targets,
    requestUrls: results.map((result) => ({
      target: result.target,
      requestUrl: result.requestUrl,
    })),
    items: results.flatMap((result) => result.items),
  };
}

export async function getLawDetail(params: {
  target: LawTarget;
  id?: string;
  mst?: string;
}) {
  const { parsed, requestUrl } = await fetchXmlWithFallback("lawService.do", {
    target: params.target,
    type: "XML",
    ID: params.id ?? "",
    MST: params.mst ?? "",
  });

  return {
    requestUrl,
    parsed,
  };
}

function redactApiKey(url: URL) {
  const copy = new URL(url.toString());

  if (copy.searchParams.has("OC")) {
    copy.searchParams.set("OC", "REDACTED");
  }

  return copy.toString();
}

function normalizeArticleNumber(value: string) {
  return value
    .replace(/^\uC81C/, "")
    .replace(/\uC870.*$/, "")
    .replace(/[^\d]/g, "")
    .trim();
}

function flattenText(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text ? [text] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenText);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(flattenText);
  }

  return [];
}

function visitObjects(
  value: unknown,
  visitor: (node: Record<string, unknown>) => boolean
): Record<string, unknown> | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = visitObjects(item, visitor);
      if (result) {
        return result;
      }
    }
    return null;
  }

  const node = value as Record<string, unknown>;
  if (visitor(node)) {
    return node;
  }

  for (const child of Object.values(node)) {
    const result = visitObjects(child, visitor);
    if (result) {
      return result;
    }
  }

  return null;
}

function extractArticleFromTextLines(parsed: Record<string, unknown>, wanted: string) {
  const marker = `\uC81C${wanted}\uC870`;
  const articleLine = flattenText(parsed).find((text) => {
    const normalized = text.trim();
    return normalized.startsWith(marker) || normalized.includes(`${marker}(`);
  });

  if (!articleLine) {
    return null;
  }

  const titleMatch = articleLine.match(
    new RegExp(`^${marker}(?:\\(([^)]+)\\))?`)
  );

  return {
    article: `\uC81C${wanted}\uC870`,
    title: titleMatch?.[1] ?? "",
    text: articleLine,
    raw: articleLine,
  };
}

export function extractArticle(parsed: Record<string, unknown>, article?: string | null) {
  if (!article) {
    return null;
  }

  const wanted = normalizeArticleNumber(article);
  if (!wanted) {
    return null;
  }

  const node = visitObjects(parsed, (candidate) => {
    const number = readString(candidate, [
      KO.articleNumber,
      KO.articleBranchNumber,
      KO.articleKey,
      KO.articleNo,
      KO.article,
    ]);

    if (normalizeArticleNumber(number) === wanted) {
      return true;
    }

    const title = readString(candidate, [KO.articleTitle, KO.articleText, KO.title]);
    const marker = `\uC81C${wanted}\uC870`;
    return title.startsWith(marker) || title.includes(marker);
  });

  if (!node) {
    return extractArticleFromTextLines(parsed, wanted);
  }

  return {
    article,
    title: readString(node, [KO.articleTitle, KO.title]),
    text: flattenText(node).join("\n"),
    raw: node,
  };
}
