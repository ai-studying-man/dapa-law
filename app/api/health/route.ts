export async function GET() {
  return Response.json({
    ok: true,
    service: "law-gpt-proxy",
    defaultAgency: process.env.DEFAULT_AGENCY || "방위사업청",
  });
}
