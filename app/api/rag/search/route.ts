import { jsonResponse, optionsResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "icn1";

type SupabaseConfig = {
  url: string;
  key: string;
};

function getSupabaseConfig(): SupabaseConfig | null {
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

async function requestSupabase(path: string) {
  const config = getSupabaseConfig();
  if (!config) {
    return { ok: false, data: [], error: "Supabase is not configured." };
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      ok: false,
      data: [],
      error: `Supabase request failed: HTTP ${response.status}`,
    };
  }

  return { ok: true, data: await response.json(), error: null };
}

function containsFilter(column: string, query: string) {
  return `${column}.ilike.*${encodeURIComponent(query)}*`;
}

export async function OPTIONS() {
  return optionsResponse();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "10"), 50);

  if (!query) {
    return jsonResponse(
      {
        ok: false,
        error: "Missing required query parameter: query.",
      },
      { status: 400 }
    );
  }

  const ragParams = new URLSearchParams({
    select: "source_type,source_key,title,category,section,source_url,file_url,content_text,metadata,indexed_at",
    limit: String(Number.isFinite(limit) && limit > 0 ? limit : 10),
  });
  ragParams.set("or", `(${containsFilter("search_text", query)})`);
  const coverageParams = new URLSearchParams({
    select: "source_title,source_category,source_section,source_date,api_match_status,api_target,api_match_error,checked_at",
    api_match_status: "in.(api_missing,homepage_only,rag_only)",
    limit: String(Number.isFinite(limit) && limit > 0 ? limit : 10),
  });
  coverageParams.set("or", `(${containsFilter("source_title", query)})`);

  const [rag, coverage] = await Promise.all([
    requestSupabase(`dapa_rag_documents?${ragParams.toString()}`),
    requestSupabase(`dapa_api_coverage_checks?${coverageParams.toString()}`),
  ]);

  return jsonResponse({
    ok: rag.ok || coverage.ok,
    query,
    ragDocuments: rag.data,
    coverageOnlyMatches: coverage.data,
    errors: [rag.error, coverage.error].filter(Boolean),
  });
}
