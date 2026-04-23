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
      version: "2.0.0",
      description:
        "Vercel wrapper for selected National Law Information APIs. This schema intentionally excludes unrelated categories and central-agency interpretation feeds that are not needed for DAPA.",
    },
    servers: [
      {
        url: origin,
      },
    ],
    paths: {
      "/api/search": {
        get: {
          operationId: "searchNationalLawDocuments",
          summary: "Search selected National Law Information categories",
          description:
            "Searches only the allowed categories: current law, administrative rules, local ordinances, precedents, Constitutional Court decisions, legal interpretations, administrative appeal decisions, treaties, legal terms, and appendix/form catalogs.",
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
                "Use auto to search across the main text categories. Appendix categories are search-only.",
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
          ],
          responses: {
            "200": {
              description: "Search results",
            },
          },
        },
      },
      "/api/detail": {
        get: {
          operationId: "getNationalLawDocumentDetail",
          summary: "Get document detail for a selected category",
          description:
            "Retrieves live detail text from the National Law Information API. Appendix categories are not supported here because they are search-only.",
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
                "Optional article selector for statute-like texts. Examples: 10, 10조, 제10조.",
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
