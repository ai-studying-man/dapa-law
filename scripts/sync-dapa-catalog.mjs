const DEFENSE_LAWS_URL =
  "https://www.dapa.go.kr/dapa/page/selectPage.do?menuSeq=3087&pageSeq=3246";
const ADMIN_RULES_URL =
  "https://www.dapa.go.kr/dapa/rlm/rllawd/RlmNttList.do?menuSeq=3088";

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

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function cleanText(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,*/*",
      "User-Agent": "Mozilla/5.0 (compatible; DAPA-Law-Catalog-Sync/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`);
  }

  const bytes = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "";
  const charset = contentType.match(/charset=([^;]+)/i)?.[1]?.trim() ?? "utf-8";

  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

function absoluteUrl(value) {
  return new URL(decodeHtml(value), "https://www.dapa.go.kr").toString();
}

function parseDefenseLaws(html) {
  const main = html.match(/<h3[^>]*>\s*방위사업법령\s*<\/h3>([\s\S]*?)<div\s+class="satisfaction"/)?.[1] ?? html;
  const chunks = main.split(/(<h4[^>]*>[\s\S]*?<\/h4>|법령|시행령|시행규칙)/g);
  const rows = [];
  let section = "방위사업법령";
  let lawType = "법령";

  for (const chunk of chunks) {
    const heading = cleanText(chunk);

    if (heading.includes("관련") && heading.length < 40) {
      section = heading;
      continue;
    }
    if (heading === "법령" || heading === "시행령" || heading === "시행규칙") {
      lawType = heading;
      continue;
    }

    const links = [...chunk.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

    for (const [, href, labelHtml] of links) {
      const title = cleanText(labelHtml).replace(/\s*-\s*Defense.*$/i, "").trim();
      const lawGoKrUrl = absoluteUrl(href);

      if (!title || !lawGoKrUrl.includes("law.go.kr")) {
        continue;
      }

      rows.push({
        source_type: "defense_law",
        section,
        law_type: lawType,
        title,
        query: title,
        target: "law",
        law_go_kr_url: lawGoKrUrl,
        source_url: DEFENSE_LAWS_URL,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      });
    }
  }

  return dedupe(rows, (row) => `${row.section}|${row.law_type}|${row.title}`);
}

function getAdminPageInfo(html) {
  const text = cleanText(html);
  const match = text.match(/페이지\s*:\s*(\d+)\s*\/\s*(\d+)/);

  if (!match) {
    throw new Error("Could not parse DAPA admin rule page count.");
  }

  return {
    currentPage: Number(match[1]),
    totalPages: Number(match[2]),
  };
}

function parseAdminRows(html, page) {
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);

  if (!tbodyMatch) {
    return [];
  }

  const rowMatches = [...tbodyMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)];

  return rowMatches
    .map((rowMatch, index) => {
      const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map(
        (cellMatch) => cellMatch[1]
      );

      if (cells.length < 6) {
        return null;
      }

      const titleMatch = cells[2].match(/<p\s+class="text">([\s\S]*?)<\/p>/i);
      const title = titleMatch ? cleanText(titleMatch[1]) : cleanText(cells[2]);
      const latestModifiedDate = cleanText(cells[5]);

      if (!title || !latestModifiedDate) {
        return null;
      }

      return {
        source_type: "admin_rule",
        title,
        query: title,
        target: "admrul",
        row_number: cleanText(cells[0]),
        issue_number: cleanText(cells[3]),
        category: cleanText(cells[4]),
        latest_modified_date: latestModifiedDate,
        page,
        page_row: index + 1,
        group_seq: rowMatch[1].match(/RlmNttGList\('([^']+)'\)/)?.[1] ?? "",
        file_id: rowMatch[1].match(/fn_fileDownload\('([^']+)'\)/)?.[1] ?? "",
        source_url: ADMIN_RULES_URL,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);
}

function latestAdminRows(rows) {
  const latestByTitle = new Map();

  for (const row of rows) {
    const previous = latestByTitle.get(row.title);

    if (
      !previous ||
      row.latest_modified_date > previous.latest_modified_date ||
      (row.latest_modified_date === previous.latest_modified_date &&
        Number(row.row_number) > Number(previous.row_number))
    ) {
      latestByTitle.set(row.title, row);
    }
  }

  return [...latestByTitle.values()];
}

function dedupe(rows, getKey) {
  return [...new Map(rows.map((row) => [getKey(row), row])).values()];
}

async function collectAdminRules() {
  const rows = [];
  let currentPage = 1;

  while (true) {
    const url = new URL(ADMIN_RULES_URL);
    url.searchParams.set("currPage", String(currentPage));
    const html = await fetchHtml(url.toString());
    const pageInfo = getAdminPageInfo(html);
    rows.push(...parseAdminRows(html, pageInfo.currentPage));
    console.log(`Collected admin rules ${pageInfo.currentPage}/${pageInfo.totalPages}`);

    if (pageInfo.currentPage >= pageInfo.totalPages) {
      break;
    }

    currentPage = pageInfo.currentPage + 1;
  }

  return latestAdminRows(rows);
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

async function main() {
  const defenseHtml = await fetchHtml(DEFENSE_LAWS_URL);
  const defenseRows = parseDefenseLaws(defenseHtml);
  const adminRows = await collectAdminRules();

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
