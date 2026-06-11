import { writeFile } from "node:fs/promises";
import {
  ADMIN_RULES_URL,
  DEFENSE_LAWS_URL,
  collectAdminRules,
  countBy,
  fetchHtml,
  parseDefenseLaws,
} from "./dapa-homepage-parser.mjs";

const OUTPUT_PATH = "docs/dapa-homepage-catalog.md";

function escapeMarkdown(value) {
  return String(value ?? "")
    .replace(/\r?\n/g, " ")
    .replace(/\|/g, "\\|")
    .trim();
}

function markdownLink(label, url) {
  return url ? `[${escapeMarkdown(label)}](${url})` : "";
}

function toDefenseMarkdownRows(rows) {
  return rows
    .map(
      (row, index) =>
        `| ${index + 1} | ${escapeMarkdown(row.section)} | ${escapeMarkdown(row.type)} | ${escapeMarkdown(
          row.name
        )} | ${markdownLink("원문", row.sourceUrl)} |`
    )
    .join("\n");
}

function toAdminMarkdownRows(rows) {
  return rows
    .map(
      (row, index) =>
        `| ${index + 1} | ${escapeMarkdown(row.category)} | ${escapeMarkdown(row.title)} | ${escapeMarkdown(
          row.issueNumber
        )} | ${escapeMarkdown(row.latestModifiedDate)} | ${escapeMarkdown(row.rowNumber)} | ${escapeMarkdown(
          row.page
        )} | ${markdownLink("목록", row.sourceUrl)} | ${markdownLink("첨부", row.fileUrl)} |`
    )
    .join("\n");
}

function toCategoryRows(counts) {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b, "ko"))
    .map(([category, count]) => `| ${escapeMarkdown(category)} | ${count} |`)
    .join("\n");
}

async function main() {
  const collectedAt = new Date().toISOString();
  const defenseRows = parseDefenseLaws(await fetchHtml(DEFENSE_LAWS_URL));
  const admin = await collectAdminRules();
  const adminCategoryCounts = countBy(admin.latestRows, "category");
  const md = `# 방위사업청 홈페이지 법령 카탈로그

- 수집 시각: ${collectedAt}
- 방위사업법령 출처: ${DEFENSE_LAWS_URL}
- 방위사업청 행정규칙 출처: ${ADMIN_RULES_URL}
- 행정규칙 중복 제거 기준: 같은 문서제목은 발령일자가 가장 최신인 행만 유지. 발령일자가 같으면 홈페이지 번호가 큰 행을 유지.

## 요약

| 구분 | 원본 행 수 | 정리 후 행 수 | 비고 |
| --- | ---: | ---: | --- |
| 방위사업법령 | ${defenseRows.length} | ${defenseRows.length} | 홈페이지 본문 법령 링크 기준 |
| 방위사업청 행정규칙 | ${admin.rows.length} | ${admin.latestRows.length} | ${admin.pageInfo.totalPages}페이지 전체 수집 후 문서제목 기준 최신 발령일자만 유지 |

## 방위사업법령

| No. | 섹션 | 유형 | 문서명 | 링크 |
| ---: | --- | --- | --- | --- |
${toDefenseMarkdownRows(defenseRows)}

## 방위사업청 행정규칙

### 분류별 건수

| 분류 | 건수 |
| --- | ---: |
${toCategoryRows(adminCategoryCounts)}

### 목록

| No. | 구분 | 문서제목 | 발령번호 | 발령일자 | 홈페이지 번호 | 수집 페이지 | 목록 링크 | 첨부 링크 |
| ---: | --- | --- | --- | --- | ---: | ---: | --- | --- |
${toAdminMarkdownRows(admin.latestRows)}
`;

  await writeFile(OUTPUT_PATH, md, "utf8");
  console.log(
    JSON.stringify(
      {
        outputPath: OUTPUT_PATH,
        defenseRows: defenseRows.length,
        adminSourceRows: admin.rows.length,
        adminLatestRows: admin.latestRows.length,
        adminPages: admin.pageInfo.totalPages,
        adminCategoryCounts,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
