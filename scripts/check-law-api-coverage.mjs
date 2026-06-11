import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { XMLParser } from "fast-xml-parser";
import adminRules from "../data/dapa-admin-rules.json" with { type: "json" };
import defenseLaws from "../data/dapa-defense-laws.json" with { type: "json" };
import { resolveAdminRuleApiQuery } from "./dapa-admin-rule-aliases.mjs";
import { buildTitleVariants } from "./law-title-variants.mjs";

const OUTPUT_PATH = "docs/dapa-api-coverage.json";
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "", trimValues: true });

const keys = {
  lawName: "\uBC95\uB839\uBA85\uD55C\uAE00",
  lawId: "\uBC95\uB839ID",
  lawMst: "\uBC95\uB839\uC77C\uB828\uBC88\uD638",
  lawDate: "\uC2DC\uD589\uC77C\uC790",
  adminName: "\uD589\uC815\uADDC\uCE59\uBA85",
  adminId: "\uD589\uC815\uADDC\uCE59\uC77C\uB828\uBC88\uD638",
  adminAltId: "\uD589\uC815\uADDC\uCE59ID",
  adminDate: "\uBC1C\uB839\uC77C\uC790",
  department: "\uC18C\uAD00\uBD80\uCC98\uBA85",
};

function normalize(value) {
  return String(value ?? "")
    .toLowerCase().replace(/&[#a-z0-9]+;/gi, "")
    .replace(/\[[^\]]+\]/g, "").replace(/\([^)]*\)/g, "")
    .replace(/_.*$/g, "")
    .replace(/\s+/g, "")
    .replace(/[\u300c\u300d\u300e\u300f()[\]{}'".,·ㆍ？?_/\\-]/g, "")
    .trim();
}

function getEnv() {
  try {
    const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);
    return Object.fromEntries(
      lines
        .filter((line) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(line))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index), line.slice(index + 1)];
        })
    );
  } catch {
    return {};
  }
}

function readString(source, candidates) {
  for (const key of candidates) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
    }
  }
  return "";
}

function collectObjects(value, output = []) {
  if (!value || typeof value !== "object") {
    return output;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectObjects(item, output);
    }
    return output;
  }
  output.push(value);
  for (const child of Object.values(value)) {
    collectObjects(child, output);
  }
  return output;
}

function extractItems(target, xml) {
  const parsed = parser.parse(xml);
  const objects = collectObjects(parsed);
  const nameKeys = target === "law" ? [keys.lawName, "\uBC95\uB839\uBA85"] : [keys.adminName];
  const idKeys = target === "law" ? [keys.lawId, "ID"] : [keys.adminId, "ID"];
  const dateKeys = target === "law" ? [keys.lawDate] : [keys.adminDate];

  return objects
    .map((item) => ({
      title: readString(item, nameKeys),
      id: readString(item, idKeys),
      mst: readString(item, [keys.lawMst, keys.adminAltId, "MST", "LID"]),
      effectiveDate: readString(item, dateKeys),
      department: readString(item, [keys.department]),
    }))
    .filter((item) => item.title || item.id || item.mst);
}

async function searchLawApi({ oc, target, title }) {
  const items = [];
  const seen = new Set();
  for (const query of buildTitleVariants(title)) {
    const url = new URL("https://law.go.kr/DRF/lawSearch.do");
    url.searchParams.set("OC", oc);
    url.searchParams.set("target", target === "law" ? "eflaw" : "admrul");
    url.searchParams.set("type", "XML");
    url.searchParams.set("query", query);
    url.searchParams.set("display", "100");
    const response = await fetch(url, {
      headers: {
        Accept: "application/xml,text/xml,*/*",
        "User-Agent": "Mozilla/5.0 (compatible; DAPA-Coverage/1.0)",
      },
    });
    const xml = await response.text();
    if (!response.ok) {
      throw new Error(`Law API HTTP ${response.status}`);
    }
    for (const item of extractItems(target, xml)) {
      const key = `${item.id}|${item.mst}|${item.title}`;
      if (!seen.has(key)) {
        seen.add(key);
        items.push(item);
      }
    }
  }
  return items;
}

function classify(source, target, items) {
  const normalizedTitle = normalize(source.title);
  const dapaItems =
    target === "admrul"
      ? items.filter((item) => item.department.includes("\uBC29\uC704\uC0AC\uC5C5\uCCAD"))
      : items;
  const exact = dapaItems.find((item) => normalize(item.title) === normalizedTitle);
  if (exact) {
    return { status: "matched", item: exact };
  }
  const partial = dapaItems.find((item) => {
    const normalizedItem = normalize(item.title);
    return (
      normalizedItem &&
      normalizedTitle &&
      (normalizedItem.includes(normalizedTitle) || normalizedTitle.includes(normalizedItem))
    );
  });
  if (partial) {
    return { status: "partial_match", item: partial };
  }
  return { status: "api_missing", item: dapaItems[0] ?? items[0] ?? null };
}

function buildSources(mode, limit) {
  const laws = defenseLaws.items.map((item) => ({
    sourceTable: "dapa_law_catalog",
    sourceKey: `${item.section}|${item.type}|${item.name}`,
    sourceTitle: item.name,
    sourceSection: item.section,
    sourceCategory: item.type,
    sourceDate: "",
    title: item.query,
    target: "law",
  }));
  const admin = adminRules.latestItems.map((item) => ({
    sourceTable: "dapa_admin_rule_catalog",
    sourceKey: item.title,
    sourceTitle: item.title,
    sourceSection: "DAPA Administrative Rules",
    sourceCategory: item.category,
    sourceDate: item.latestModifiedDate,
    title: resolveAdminRuleApiQuery(item.title),
    target: "admrul",
  }));
  const selected =
    mode === "law" ? laws : mode === "admin" ? admin : [...laws, ...admin];
  return Number.isFinite(limit) && limit > 0 ? selected.slice(0, limit) : selected;
}

async function upsertCoverage(rows) {
  const env = getEnv();
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || rows.length === 0) {
    return { skipped: true };
  }
  const response = await fetch(
    `${url.replace(/\/$/, "")}/rest/v1/dapa_api_coverage_checks?on_conflict=source_table,source_key,api_target`,
    {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows),
    }
  );
  return { skipped: false, ok: response.ok, status: response.status };
}

async function main() {
  const args = new URLSearchParams(
    process.argv
      .slice(2)
      .map((arg) => arg.replace(/^--/, ""))
      .join("&")
  );
  const limit = Number(args.get("limit") ?? "0");
  const env = getEnv();
  const oc = env.LAW_API_KEY || env.LAW_API_OC;
  if (!oc) {
    throw new Error("Set LAW_API_KEY or LAW_API_OC.");
  }
  const sources = buildSources(args.get("source") || "all", limit);
  const rows = [];
  for (const [index, source] of sources.entries()) {
    try {
      const items = await searchLawApi({ oc, target: source.target, title: source.title });
      const match = classify(source, source.target, items);
      rows.push(toCoverageRow(source, match));
    } catch (error) {
      rows.push(toCoverageRow(source, { status: "error", item: null, error }));
    }
    if ((index + 1) % 100 === 0) {
      console.error(`Checked ${index + 1}/${sources.length}`);
    }
  }
  const summary = rows.reduce((acc, row) => {
    acc[row.api_match_status] = (acc[row.api_match_status] ?? 0) + 1;
    return acc;
  }, {});
  await writeFile(OUTPUT_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, rows }, null, 2)}\n`);
  const upsert = await upsertCoverage(rows);
  console.log(JSON.stringify({ outputPath: OUTPUT_PATH, summary, upsert }, null, 2));
}

function toCoverageRow(source, match) {
  return {
    source_table: source.sourceTable,
    source_key: source.sourceKey,
    source_title: source.sourceTitle,
    source_category: source.sourceCategory,
    source_section: source.sourceSection,
    source_date: source.sourceDate,
    api_target: source.target,
    api_match_status: match.status,
    api_id: match.item?.id ?? null,
    api_mst: match.item?.mst ?? null,
    api_title: match.item?.title ?? null,
    api_effective_date: match.item?.effectiveDate ?? null,
    api_match_error: match.error instanceof Error ? match.error.message : null,
    checked_at: new Date().toISOString(),
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
