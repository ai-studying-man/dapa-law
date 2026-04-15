import { XMLParser } from "fast-xml-parser";

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

  const res = await fetch(url, { cache: "no-store" });
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
    const parsed = parser.parse(xml);
    return Response.json({
      ok: true,
      target,
      id: id || mst,
      data: parsed,
    });
  } catch {
    return Response.json(
      {
        ok: false,
        error: "XML 파싱 실패",
        raw: xml,
      },
      { status: 500 }
    );
  }
}
