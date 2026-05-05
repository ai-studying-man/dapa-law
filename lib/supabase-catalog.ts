import type { CatalogItem, CatalogSource } from "@/lib/dapa-catalog";

type SupabaseCatalogRow = {
  id?: string;
  source_type?: string;
  section?: string | null;
  law_type?: string | null;
  title?: string | null;
  query?: string | null;
  target?: "law" | "admrul" | "ordin" | null;
  source_url?: string | null;
  law_go_kr_url?: string | null;
  latest_modified_date?: string | null;
  category?: string | null;
  issue_number?: string | null;
  row_number?: string | null;
  page?: number | null;
  page_row?: number | null;
  group_seq?: string | null;
  file_id?: string | null;
};

type SupabaseResponse<T> = {
  data: T | null;
  error: string | null;
};

const SOURCE_TABLES: Record<CatalogSource, string> = {
  defense_laws: "dapa_law_catalog",
  admin_rules: "dapa_admin_rule_catalog",
};

export function isSupabaseCatalogConfigured() {
  return Boolean(
    getSupabaseConfig()
  );
}

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return null;
  }

  return {
    url: url.trim().replace(/\/$/, ""),
    key: key.trim(),
  };
}

async function requestSupabase<T>(
  path: string,
  init: RequestInit = {}
): Promise<SupabaseResponse<T>> {
  const config = getSupabaseConfig();

  if (!config) {
    return { data: null, error: "Supabase catalog is not configured." };
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      data: null,
      error: `Supabase catalog request failed: HTTP ${response.status}`,
    };
  }

  return {
    data: (await response.json()) as T,
    error: null,
  };
}

function toCatalogItem(row: SupabaseCatalogRow, source: CatalogSource): CatalogItem {
  return {
    source,
    section:
      row.section ??
      (source === "defense_laws" ? "DAPA Defense Laws" : "DAPA Administrative Rules"),
    type: row.law_type ?? row.category ?? "",
    name: row.title ?? row.query ?? "",
    query: row.query ?? row.title ?? "",
    target: row.target ?? (source === "admin_rules" ? "admrul" : "law"),
    sourceUrl: row.law_go_kr_url ?? row.source_url ?? undefined,
    latestModifiedDate: row.latest_modified_date ?? undefined,
    category: row.category ?? undefined,
    issueNumber: row.issue_number ?? undefined,
    rowNumber: row.row_number ?? undefined,
    page: row.page ?? undefined,
    pageRow: row.page_row ?? undefined,
    groupSeq: row.group_seq ?? undefined,
    fileId: row.file_id ?? undefined,
  };
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\u300c\u300d\u300e\u300f()[\]{}]/g, "")
    .trim();
}

function scoreCatalogItem(item: CatalogItem, query: string) {
  const normalizedQuery = normalize(query);
  const normalizedName = normalize(item.name);

  if (!normalizedQuery) {
    return 1;
  }
  if (normalizedName === normalizedQuery) {
    return 100;
  }
  if (normalizedName.includes(normalizedQuery)) {
    return 80;
  }
  if (normalizedQuery.includes(normalizedName)) {
    return 70;
  }
  if (item.name.includes(query)) {
    return 60;
  }

  return 0;
}

async function fetchSourceRows(source: CatalogSource, limit: number) {
  const table = SOURCE_TABLES[source];
  const params = new URLSearchParams({
    select: "*",
    is_active: "eq.true",
    order:
      source === "admin_rules"
        ? "latest_modified_date.desc.nullslast,title.asc"
        : "section.asc,law_type.asc,title.asc",
    limit: String(limit),
  });
  const result = await requestSupabase<SupabaseCatalogRow[]>(
    `${table}?${params.toString()}`
  );

  if (result.error || !result.data) {
    throw new Error(result.error ?? "Supabase catalog returned no data.");
  }

  return result.data.map((row) => toCatalogItem(row, source));
}

export async function searchSupabaseCatalog(params: {
  query?: string;
  source?: "all" | CatalogSource;
  type?: string;
  limit?: number;
}) {
  const query = params.query?.trim() ?? "";
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const sources: CatalogSource[] =
    params.source && params.source !== "all"
      ? [params.source]
      : ["defense_laws", "admin_rules"];

  const items = (
    await Promise.all(sources.map((source) => fetchSourceRows(source, 5000)))
  ).flat();

  const scored = items
    .filter((item) => !params.type || item.type === params.type || item.category === params.type)
    .map((item) => ({
      item,
      score: scoreCatalogItem(item, query),
    }))
    .filter(({ score }) => !query || score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const dateCompare = (b.item.latestModifiedDate ?? "").localeCompare(
        a.item.latestModifiedDate ?? ""
      );
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return a.item.name.localeCompare(b.item.name, "ko");
    });

  return {
    totalMatches: scored.length,
    items: scored.slice(0, limit).map(({ item, score }) => ({
      ...item,
      matchScore: score,
    })),
  };
}
