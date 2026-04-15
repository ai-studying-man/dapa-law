import { XMLParser, XMLValidator } from "fast-xml-parser";

export const runtime = "nodejs";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

function buildDetailUrl(params: Record<string, string>) {
  const base = process.env.LAW_API_BASE || "https://www.law.go.kr/DRF";
  const url = new URL(`${base}/lawService.do`);

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

  if (typeof parsed.Law === "string") {
    const message = parsed.Law.trim();
    if (message) {
      return {
        result: "detail_lookup_failed",
        message,
      };
    }
  }

  return null;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const target = searchParams.get("target") || "law";
  const id = searchParams.get("id") || "";
  const mst = searchParams.get("mst") || "";

  if (!id && !mst) {
    return Response.json(
      { ok: false, error: "id 또는 mst 중 하나가 필요합니다." },
      { status: 400 }
    );
  }

  const url = buildDetailUrl({
    target,
    ID: id,
    MST: mst,
    type: "XML",
  });

  let res: Response;

  try {
    res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/xml, text/xml, */*",
        "User-Agent":
          "Mozilla/5.0 (compatible; DAPA-Law/1.0; +https://dapa-law.vercel.app)",
      },
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "국가법령정보 원본 서버 연결 실패",
        message: error instanceof Error ? error.message : "fetch failed",
        target,
        id: id || mst,
        detail_url: url,
      },
      { status: 502 }
    );
  }

  const xml = await res.text();

  if (!res.ok) {
    return Response.json(
      {
        ok: false,
        error: "국가법령정보 상세 API 호출 실패",
        status: res.status,
        raw: xml,
      },
      { status: 500 }
    );
  }

  try {
    const parsed = parseXmlOrThrow(xml);
    const apiError = extractApiError(parsed as Record<string, unknown>);

    if (apiError) {
      const status =
        apiError.result === "detail_lookup_failed" ? 404 : 502;

      return Response.json(
        {
          ok: false,
          error: "국가법령정보 상세 조회 실패",
          target,
          id: id || mst,
          detail_url: url,
          api_error: apiError,
          raw: parsed,
        },
        { status }
      );
    }

    return Response.json({
      ok: true,
      target,
      id: id || mst,
      detail_url: url,
      data: parsed,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: "XML 파싱 실패",
        message: error instanceof Error ? error.message : "알 수 없는 XML 파싱 오류",
        detail_url: url,
        raw: xml,
      },
      { status: 500 }
    );
  }
}
