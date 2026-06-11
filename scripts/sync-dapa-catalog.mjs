import {
  ADMIN_RULES_URL,
  DEFENSE_LAWS_URL,
  collectAdminRules,
  fetchHtml,
  parseDefenseLaws,
} from "./dapa-homepage-parser.mjs";
import { resolveAdminRuleApiQuery } from "./dapa-admin-rule-aliases.mjs";

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before syncing.");
  }

  return {
    url: url.trim().replace(/\/$/, ""),
    key: key.trim(),
  };
}

function toDefenseRow(item) {
  return {
    source_type: "defense_law",
    section: item.section,
    law_type: item.type,
    title: item.name,
    query: item.query,
    target: item.target,
    law_go_kr_url: item.sourceUrl,
    source_url: DEFENSE_LAWS_URL,
    is_active: true,
    last_seen_at: new Date().toISOString(),
  };
}

function toAdminRow(item) {
  return {
    source_type: "admin_rule",
    title: item.title,
    query: resolveAdminRuleApiQuery(item.title),
    target: "admrul",
    row_number: item.rowNumber,
    issue_number: item.issueNumber,
    category: item.category,
    latest_modified_date: item.latestModifiedDate,
    page: item.page,
    page_row: item.pageRow,
    group_seq: item.groupSeq,
    file_id: item.fileId,
    homepage_file_url: item.fileUrl,
    source_url: ADMIN_RULES_URL,
    is_active: true,
    last_seen_at: new Date().toISOString(),
  };
}

async function upsert(table, rows, onConflict) {
  if (rows.length === 0) {
    return 0;
  }

  const config = getSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`,
    {
      method: "POST",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates",
      },
      body: JSON.stringify(rows),
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase upsert failed for ${table}: HTTP ${response.status}`);
  }

  return rows.length;
}

async function deleteSourceRows(table, sourceType) {
  const config = getSupabaseConfig();
  const response = await fetch(
    `${config.url}/rest/v1/${table}?source_type=eq.${encodeURIComponent(sourceType)}`,
    {
      method: "DELETE",
      headers: {
        apikey: config.key,
        Authorization: `Bearer ${config.key}`,
        Prefer: "return=minimal",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Supabase delete failed for ${table}: HTTP ${response.status}`);
  }
}

async function main() {
  const defenseRows = parseDefenseLaws(await fetchHtml(DEFENSE_LAWS_URL)).map(toDefenseRow);
  const adminRows = (await collectAdminRules()).latestRows.map(toAdminRow);
  await deleteSourceRows("dapa_law_catalog", "defense_law");
  await deleteSourceRows("dapa_admin_rule_catalog", "admin_rule");
  const defenseCount = await upsert(
    "dapa_law_catalog",
    defenseRows,
    "source_type,title,law_type,section"
  );
  const adminCount = await upsert(
    "dapa_admin_rule_catalog",
    adminRows,
    "source_type,title"
  );

  console.log(`Synced ${defenseCount} defense law rows.`);
  console.log(`Synced ${adminCount} admin rule rows.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
