import { jsonResponse } from "@/lib/http";

const CATEGORY_ENUM = [
  "auto",
  "law",
  "admrul",
  "ordin",
  "prec",
  "detc",
  "expc",
  "decc",
  "trty",
  "lstrm",
  "law_appendix",
  "admrul_appendix",
  "ordin_appendix",
] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;

  return jsonResponse({
    openapi: "3.1.0",
    info: {
      title: "DAPA Law Vercel Wrapper API",
      version: "2.3.0",
      description:
        "Vercel wrapper for selected National Law Information APIs used by the DAPA chatbot. DAPA catalog lists can be read from Supabase, while statute and rule body text is retrieved live from the National Law Information API.",
    },
    servers: [
      {
        url: origin,
      },
    ],
    paths: {
      "/api/search": {
        get: {
          operationId: "searchLawOpenData",
          summary: "Search selected National Law Information categories",
          description:
            "Searches only the allowed categories: current law, administrative rules, local ordinances, precedents, Constitutional Court decisions, legal interpretations, administrative appeal decisions, treaties, legal terms, and appendix or form catalogs.",
          parameters: [
            {
              name: "query",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "Search keyword or exact title.",
            },
            {
              name: "category",
              in: "query",
              schema: {
                type: "string",
                enum: CATEGORY_ENUM,
                default: "auto",
              },
              description:
                "Use auto to search across the main text categories. For statute questions, prefer law first. Appendix categories are search-only.",
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1, minimum: 1 },
            },
            {
              name: "display",
              in: "query",
              schema: { type: "integer", default: 10, minimum: 1, maximum: 50 },
              description: "Maximum items per upstream category request.",
            },
            {
              name: "source",
              in: "query",
              schema: {
                type: "string",
                enum: ["all", "defense_laws", "admin_rules"],
                default: "all",
              },
              description:
                "Optional DAPA catalog filter. Use defense_laws for DAPA defense law list and admin_rules for DAPA administrative rule list.",
            },
            {
              name: "catalog_only",
              in: "query",
              schema: { type: "boolean", default: false },
              description:
                "When true, returns only the DAPA catalog match list from Supabase or local fallback and does not call the National Law Information API.",
            },
          ],
          responses: {
            "200": {
              description: "Search results",
            },
          },
        },
      },
      "/api/catalog": {
        get: {
          operationId: "getDapaLawCatalog",
          summary: "Get DAPA defense law and administrative rule catalog",
          description:
            "Returns the DAPA-maintained catalog list from Supabase when configured, with local JSON fallback. This endpoint returns only titles, categories, source links, and lookup metadata. It does not return statute or rule body text.",
          parameters: [
            {
              name: "query",
              in: "query",
              schema: { type: "string" },
              description:
                "Optional keyword or exact title. Leave empty to list catalog entries.",
            },
            {
              name: "source",
              in: "query",
              schema: {
                type: "string",
                enum: ["all", "defense_laws", "admin_rules"],
                default: "all",
              },
              description:
                "Catalog source. defense_laws is the DAPA defense law page; admin_rules is the DAPA administrative rule page.",
            },
            {
              name: "type",
              in: "query",
              schema: { type: "string" },
              description:
                "Optional type or category filter such as 법령, 시행령, 시행규칙, 훈령, 예규, 고시.",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 50, minimum: 1, maximum: 100 },
            },
          ],
          responses: {
            "200": {
              description: "DAPA catalog entries",
            },
          },
        },
      },
      "/api/detail": {
        get: {
          operationId: "getLawOpenDataDocument",
          summary: "Get document detail for a selected category",
          description:
            "Retrieves live detail text from the National Law Information API. Appendix categories are not supported here because they are search-only. Responses are compact by default to avoid oversized action payloads. Use query whenever possible and article when a specific statute article is needed.",
          parameters: [
            {
              name: "category",
              in: "query",
              schema: {
                type: "string",
                enum: CATEGORY_ENUM.filter((value) => value !== "auto"),
                default: "law",
              },
            },
            {
              name: "query",
              in: "query",
              schema: { type: "string" },
              description:
                "Preferred input. The wrapper will search first, pick the best match, then fetch live detail.",
            },
            {
              name: "id",
              in: "query",
              schema: { type: "string" },
              description: "Direct upstream identifier when already known.",
            },
            {
              name: "mst",
              in: "query",
              schema: { type: "string" },
              description:
                "Secondary identifier such as MST or alternate ID, depending on category.",
            },
            {
              name: "article",
              in: "query",
              schema: { type: "string" },
              description:
                "Optional article selector for statute-like texts. Examples: 10, 10jo, Article 10.",
            },
            {
              name: "include_raw",
              in: "query",
              schema: { type: "boolean", default: false },
              description:
                "Returns the full parsed upstream payload only when explicitly needed. Leave false for GPT Actions to avoid oversized responses.",
            },
          ],
          responses: {
            "200": {
              description: "Live detail result",
            },
          },
        },
      },
      "/api/health": {
        get: {
          operationId: "getDapaLawWrapperHealth",
          summary: "Health check",
          responses: {
            "200": {
              description: "Service health",
            },
          },
        },
      },
    },
  });
}
