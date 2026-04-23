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
        "국가법령정보 OPEN API를 우선 조회하고, 방위사업청 카탈로그 JSON은 보조 검색 및 참고 정보로만 사용하는 GPT Actions용 프록시 API입니다.",
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
          summary: "방위사업청 수집 카탈로그만 검색",
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
              description:
                "법령, 시행령, 시행규칙, 훈령, 예규, 고시/공고, 매뉴얼, 기타/회계예규",
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
          summary: "국가법령정보 OPEN API 우선 검색",
          parameters: [
            {
              name: "query",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "법령명, 행정규칙명, 자치법규명 또는 일반 검색어",
            },
            {
              name: "target",
              in: "query",
              schema: {
                type: "string",
                enum: ["auto", "law", "admrul", "ordin", "admin_rule", "ordinance"],
                default: "auto",
              },
              description:
                "auto이면 국가법령정보 API의 law, admrul, ordin을 모두 조회한 뒤 가장 적합한 결과를 우선 반환합니다.",
            },
            {
              name: "catalog_only",
              in: "query",
              schema: { type: "boolean", default: false },
              description:
                "true이면 국가법령정보 API를 호출하지 않고 카탈로그 JSON만 검색합니다. 기본값 false에서는 OPEN API가 우선입니다.",
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
          summary: "국가법령정보 OPEN API 본문/조문 우선 조회",
          parameters: [
            {
              name: "query",
              in: "query",
              schema: { type: "string" },
              description:
                "법령명 또는 행정규칙명. query가 있으면 서버가 국가법령정보 API에서 정식 ID를 다시 찾아 본문을 조회합니다.",
            },
            {
              name: "target",
              in: "query",
              schema: {
                type: "string",
                enum: ["auto", "law", "admrul", "ordin", "admin_rule", "ordinance"],
                default: "auto",
              },
              description:
                "auto이면 국가법령정보 API의 law, admrul, ordin을 모두 조회한 뒤 가장 적합한 결과의 본문을 엽니다.",
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
              description:
                "국가법령정보 OPEN API의 정식 ID를 알고 있을 때만 사용합니다. query가 함께 있으면 서버가 query 기준 검색 결과를 우선 사용합니다.",
            },
            {
              name: "mst",
              in: "query",
              schema: { type: "string" },
              description: "국가법령정보 OPEN API의 MST를 알고 있을 때만 사용합니다.",
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
