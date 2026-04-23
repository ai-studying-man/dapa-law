import { getCatalogSummary } from "@/lib/dapa-catalog";
import { jsonResponse } from "@/lib/http";

export async function GET() {
  return jsonResponse({
    ok: true,
    service: "dapa-law-gpt-proxy",
    lawApiConfigured: Boolean(process.env.LAW_API_KEY || process.env.LAW_API_OC),
    deployment: {
      gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
      gitCommitRef: process.env.VERCEL_GIT_COMMIT_REF ?? null,
      region: process.env.VERCEL_REGION ?? null,
    },
    catalog: getCatalogSummary(),
  });
}
