export const ragSearchPath = {
  get: {
    operationId: "searchDapaRagFallback",
    summary: "Search DAPA homepage-only RAG fallback documents",
    description:
      "Searches Supabase for DAPA homepage documents and coverage rows that are not fully available from the National Law Information API. Use this after catalog or live API search when a DAPA homepage rule, contract, budget, logistics, goods, or interpretation item is missing from the live API result.",
    parameters: [
      {
        name: "query",
        in: "query",
        required: true,
        schema: { type: "string" },
        description: "Keyword or exact DAPA homepage document title.",
      },
      {
        name: "limit",
        in: "query",
        schema: { type: "integer", default: 10, minimum: 1, maximum: 50 },
      },
    ],
    responses: {
      "200": {
        description: "RAG fallback matches and API coverage-only matches",
      },
    },
  },
} as const;
