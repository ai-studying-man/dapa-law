import { writeFile } from "node:fs/promises";
import { DEFENSE_LAWS_URL, fetchHtml, parseDefenseLaws } from "./dapa-homepage-parser.mjs";

const OUTPUT_PATH = "data/dapa-defense-laws.json";

async function main() {
  const items = parseDefenseLaws(await fetchHtml(DEFENSE_LAWS_URL));
  const output = {
    source: {
      name: "방위사업청 방위사업법령",
      url: DEFENSE_LAWS_URL,
      collectedAt: new Date().toISOString(),
    },
    summary: {
      totalRows: items.length,
      sections: [...new Set(items.map((item) => item.section))],
      types: [...new Set(items.map((item) => item.type))],
    },
    items,
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`Saved ${items.length} defense law rows to ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
