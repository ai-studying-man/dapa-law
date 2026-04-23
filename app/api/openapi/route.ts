import { jsonResponse } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;

  return jsonResponse({
    openapi: "3.1.0",
    info: {
      title: "DAPA Law GPT Proxy",
      version: "1.0.0",
      description:
        "방위사업청 법령/행정규칙 카탈로그를 기준으로 국가법령정보 OPEN API를 실시간 조회하는 GPT Actions용 프록시 API입니다.",
    },
    servers: [
      {
        url: origin,
      },
    ],
    paths: {
      "/api/catalog": {
        get: {
          operationId: "listDapaLawCatalog",
          summary: "방위사업 관련 법령 및 행정규칙 카탈로그 검색",
          parameters: [
            {
              name: "query",
              in: "query",
              schema: { type: "string" },
              description: "검색어. 예: 방위사업관리규정, 방위사업법",
            },
            {
              name: "source",
              in: "query",
              schema: {
                type: "string",
                enum: ["all", "defense_laws", "admin_rules"],
                default: "all",
              },
            },
            {
              name: "type",
              in: "query",
              schema: { type: "string" },
              description: "법령, 시행령, 시행규칙, 훈령, 예규, 고시/공고, 매뉴얼, 기타/회계예규",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 50, maximum: 100 },
            },
          ],
          responses: {
            "200": {
              description: "카탈로그 검색 결과",
            },
          },
        },
      },
      "/api/search": {
        get: {
          operationId: "searchDapaLaw",
          summary: "방위사업 카탈로그와 국가법령정보 OPEN API 동시 검색",
          parameters: [
            {
              name: "query",
              in: "query",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "target",
              in: "query",
              schema: {
                type: "string",
                enum: ["auto", "law", "admrul", "ordin", "admin_rule", "ordinance"],
                default: "auto",
              },
              description: "National Law target. Use auto unless a specific target is known.",
            },
            {
              name: "catalog_only",
              in: "query",
              schema: { type: "boolean", default: false },
              description: "true이면 국가법령정보 API 호출 없이 로컬 카탈로그만 검색합니다.",
            },
            {
              name: "display",
              in: "query",
              schema: { type: "integer", default: 10, maximum: 50 },
            },
          ],
          responses: {
            "200": {
              description: "검색 결과",
            },
          },
        },
      },
      "/api/detail": {
        get: {
          operationId: "getDapaLawDetail",
          summary: "법령 또는 행정규칙 본문 실시간 조회",
          parameters: [
            {
              name: "query",
              in: "query",
              schema: { type: "string" },
              description: "법령명 또는 행정규칙명. 예: 방위사업법, 방위사업관리규정",
            },
            {
              name: "target",
              in: "query",
              schema: {
                type: "string",
                enum: ["auto", "law", "admrul", "ordin", "admin_rule", "ordinance"],
                default: "auto",
              },
            },
            {
              name: "article",
              in: "query",
              schema: { type: "string" },
              description: "조문 번호. 예: 10, 제10조",
            },
            {
              name: "id",
              in: "query",
              schema: { type: "string" },
              description: "국가법령정보 본문 조회용 ID. 알고 있을 때만 사용합니다.",
            },
            {
              name: "mst",
              in: "query",
              schema: { type: "string" },
              description: "국가법령정보 본문 조회용 MST. 알고 있을 때만 사용합니다.",
            },
          ],
          responses: {
            "200": {
              description: "본문 조회 결과",
            },
          },
        },
      },
    },
  });
}
