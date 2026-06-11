export const DEFENSE_LAWS_URL =
  "https://www.dapa.go.kr/dapa/page/selectPage.do?menuSeq=3087&pageSeq=3246";
export const ADMIN_RULES_URL =
  "https://www.dapa.go.kr/dapa/rlm/rllawd/RlmNttList.do?menuSeq=3088";

export function decodeHtml(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ");
}

export function cleanText(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

export function absoluteUrl(value, base = "https://www.dapa.go.kr") {
  return new URL(decodeHtml(value), base).toString();
}

export function normalizeDefenseLawQuery(name) {
  const aliases = new Map([
    [
      "군용항공기 비행안정성 인증에 관한 법률 시행령",
      "군용항공기 비행안전성 인증에 관한 법률 시행령",
    ],
    [
      "특정물품등의 조달에 관한 국가를 당사자로 하는 계약사무처리 특례규칙",
      "특정물품등의 조달에 관한 국가를 당사자로 하는 계약에 관한 법률 시행 특례규칙",
    ],
  ]);
  return aliases.get(name) ?? name;
}

export async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,*/*",
      "User-Agent": "Mozilla/5.0 (compatible; DAPA-Law-Catalog/1.0)",
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

export function parseDefenseLaws(html) {
  const content =
    html.match(/<h3[^>]*>\s*방위사업법령\s*<\/h3>([\s\S]*?)<div\s+id="satisfaction"/i)?.[1] ??
    html.match(/<div\s+id="cts0210"[^>]*>([\s\S]*?)<div\s+id="satisfaction"/i)?.[1] ??
    html;
  const rows = [];
  let section = "";
  let type = "";
  const tokens = content.matchAll(
    /<h4[^>]*class="[^"]*temp-h4[^"]*"[^>]*>([\s\S]*?)<\/h4>|<th[^>]*>([\s\S]*?)<\/th>|<a\b[^>]*href="([^"]*law\.go\.kr[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi
  );

  for (const token of tokens) {
    if (token[1] != null) {
      section = cleanText(token[1]);
      type = "";
      continue;
    }

    if (token[2] != null) {
      type = cleanText(token[2]);
      continue;
    }

    if (token[3] != null && section && type) {
      const name = cleanText(token[4]).replace(/\s*-\s*Defense.*$/i, "").trim();
      if (!name || name.includes("영문") || name.includes("국가법령정보센터")) {
        continue;
      }
      rows.push({
        section,
        type,
        name,
        query: normalizeDefenseLawQuery(name),
        target: "law",
        sourceUrl: absoluteUrl(token[3]),
      });
    }
  }

  return dedupe(rows, (row) => `${row.section}|${row.type}|${row.name}`);
}

export function getAdminPageInfo(html) {
  const match = html.match(/page-text[\s\S]*?(\d+)\s*\/\s*(\d+)/i);
  if (!match) {
    throw new Error("Could not parse DAPA admin-rule page count.");
  }

  return {
    currentPage: Number(match[1]),
    totalPages: Number(match[2]),
  };
}

export function parseAdminRows(html, page) {
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/i);
  if (!tbodyMatch) {
    return [];
  }

  return [...tbodyMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/gi)]
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

      const fileId = rowMatch[1].match(/fn_fileDownload\('([^']+)'\)/)?.[1] ?? "";
      return {
        title,
        latestModifiedDate,
        category: cleanText(cells[4]),
        issueNumber: cleanText(cells[3]),
        rowNumber: cleanText(cells[0]),
        page,
        pageRow: index + 1,
        groupSeq: rowMatch[1].match(/RlmNttGList\('([^']+)'\)/)?.[1] ?? "",
        fileId,
        sourceUrl: `${ADMIN_RULES_URL}&currPage=${page}`,
        fileUrl: fileId
          ? `https://www.dapa.go.kr/common/zipDownload.do?fileGrpKey=${encodeURIComponent(fileId)}`
          : "",
      };
    })
    .filter(Boolean);
}

export function selectLatestAdminRows(items) {
  const latestByTitle = new Map();

  for (const item of items) {
    const previous = latestByTitle.get(item.title);
    if (
      !previous ||
      item.latestModifiedDate > previous.latestModifiedDate ||
      (item.latestModifiedDate === previous.latestModifiedDate &&
        Number(item.rowNumber) > Number(previous.rowNumber))
    ) {
      latestByTitle.set(item.title, item);
    }
  }

  return [...latestByTitle.values()].sort((a, b) => {
    const dateCompare = b.latestModifiedDate.localeCompare(a.latestModifiedDate);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    return Number(b.rowNumber) - Number(a.rowNumber);
  });
}

export async function collectAdminRules() {
  const firstHtml = await fetchHtml(ADMIN_RULES_URL);
  const pageInfo = getAdminPageInfo(firstHtml);
  const pages = [firstHtml];

  for (let page = 2; page <= pageInfo.totalPages; page += 1) {
    const url = new URL(ADMIN_RULES_URL);
    url.searchParams.set("currPage", String(page));
    pages.push(await fetchHtml(url.toString()));

    if (page % 50 === 0) {
      console.error(`Collected admin-rule page ${page}/${pageInfo.totalPages}`);
    }
  }

  const rows = pages.flatMap((html, index) => parseAdminRows(html, index + 1));
  return {
    pageInfo,
    rows,
    latestRows: selectLatestAdminRows(rows),
  };
}

export function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "";
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function dedupe(rows, getKey) {
  return [...new Map(rows.map((row) => [getKey(row), row])).values()];
}
