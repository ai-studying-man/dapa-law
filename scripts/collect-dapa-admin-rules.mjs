import { writeFile } from "node:fs/promises";

const BASE_URL = "https://www.dapa.go.kr/dapa/rlm/rllawd/RlmNttList.do";
const OUTPUT_PATH = "data/dapa-admin-rules.json";

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

function getPageInfo(html) {
  const match = html.match(
    /<p\s+class="page-text">\s*페이지\s*:\s*(\d+)\s*\/\s*(\d+)\s*<\/p>/
  );

  if (!match) {
    throw new Error("Could not parse page text.");
  }

  return {
    currentPage: Number(match[1]),
    totalPages: Number(match[2]),
  };
}

function parseRows(html, page) {
  const tbodyMatch = html.match(/<tbody>([\s\S]*?)<\/tbody>/);

  if (!tbodyMatch) {
    return [];
  }

  const rowMatches = [...tbodyMatch[1].matchAll(/<tr>([\s\S]*?)<\/tr>/g)];

  return rowMatches
    .map((rowMatch, index) => {
      const cells = [...rowMatch[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
        (cellMatch) => cellMatch[1]
      );

      if (cells.length < 6) {
        return null;
      }

      const titleMatch = cells[2].match(/<p\s+class="text">([\s\S]*?)<\/p>/);
      const title = titleMatch ? cleanText(titleMatch[1]) : cleanText(cells[2]);
      const rowNumber = cleanText(cells[0]);
      const issueNumber = cleanText(cells[3]);
      const category = cleanText(cells[4]);
      const latestModifiedDate = cleanText(cells[5]);
      const groupSeqMatch = rowMatch[1].match(/RlmNttGList\('([^']+)'\)/);
      const fileIdMatch = rowMatch[1].match(/fn_fileDownload\('([^']+)'\)/);

      if (!title || !latestModifiedDate) {
        return null;
      }

      return {
        title,
        latestModifiedDate,
        category,
        issueNumber,
        rowNumber,
        page,
        pageRow: index + 1,
        groupSeq: groupSeqMatch?.[1] ?? "",
        fileId: fileIdMatch?.[1] ?? "",
      };
    })
    .filter(Boolean);
}

async function fetchPage(page) {
  const url = new URL(BASE_URL);
  url.searchParams.set("menuSeq", "3088");
  url.searchParams.set("currPage", String(page));

  const response = await fetch(url, {
    headers: {
      Accept: "text/html,*/*",
      "User-Agent": "Mozilla/5.0 (compatible; DAPA-Law-Catalog/1.0)",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page ${page}: ${response.status}`);
  }

  return response.text();
}

function buildLatestItems(items) {
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

async function main() {
  const items = [];
  let currentPage = 1;
  let totalPages = null;

  while (true) {
    const html = await fetchPage(currentPage);
    const pageInfo = getPageInfo(html);
    totalPages = pageInfo.totalPages;
    items.push(...parseRows(html, pageInfo.currentPage));

    console.log(`Collected page ${pageInfo.currentPage}/${pageInfo.totalPages}`);

    if (pageInfo.currentPage === pageInfo.totalPages) {
      break;
    }

    currentPage = pageInfo.currentPage + 1;
  }

  const latestItems = buildLatestItems(items);
  const output = {
    source: {
      name: "방위사업청 행정규칙",
      url: `${BASE_URL}?menuSeq=3088`,
      titleSelector: "#board-list > table > tbody > tr > td.subject > p",
      latestModifiedDateSelector:
        "#board-list > table > tbody > tr > td:nth-child(6)",
      pageTextSelector: "#board-list > form > div.board-top > div.total-page > p.page-text",
      nextPageSelector: "#pagination > a.arrow.next-page",
      collectedAt: new Date().toISOString(),
    },
    summary: {
      totalPages,
      totalRows: items.length,
      uniqueLatestRows: latestItems.length,
    },
    latestItems,
    items,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");

  console.log(
    `Saved ${items.length} rows and ${latestItems.length} latest unique titles to ${OUTPUT_PATH}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
