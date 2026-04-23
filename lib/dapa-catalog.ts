import adminRulesCatalog from "@/data/dapa-admin-rules.json";
import defenseLawsCatalog from "@/data/dapa-defense-laws.json";

export type CatalogSource = "defense_laws" | "admin_rules";

export type CatalogItem = {
  source: CatalogSource;
  section: string;
  type: string;
  name: string;
  query: string;
  target: "law" | "admrul" | "ordin";
  sourceUrl?: string;
  latestModifiedDate?: string;
  category?: string;
  issueNumber?: string;
  rowNumber?: string;
  page?: number;
  pageRow?: number;
  groupSeq?: string;
  fileId?: string;
};

type DefenseLawItem = {
  section: string;
  type: string;
  name: string;
  query: string;
  target: "law";
  sourceUrl: string;
};

type AdminRuleItem = {
  title: string;
  latestModifiedDate: string;
  category: string;
  issueNumber: string;
  rowNumber: string;
  page: number;
  pageRow: number;
  groupSeq: string;
  fileId: string;
};

const defenseData = defenseLawsCatalog as {
  items: DefenseLawItem[];
};

const adminRuleData = adminRulesCatalog as {
  latestItems: AdminRuleItem[];
  summary: {
    totalPages: number;
    totalRows: number;
    uniqueLatestRows: number;
  };
};

export function getCatalogItems() {
  const defenseLawItems: CatalogItem[] = defenseData.items.map((item) => ({
    source: "defense_laws",
    section: item.section,
    type: item.type,
    name: item.name,
    query: item.query,
    target: item.target,
    sourceUrl: item.sourceUrl,
  }));

  const adminRuleItems: CatalogItem[] = adminRuleData.latestItems.map((item) => ({
    source: "admin_rules",
    section: "DAPA Administrative Rules",
    type: item.category,
    category: item.category,
    name: item.title,
    query: item.title,
    target: "admrul",
    latestModifiedDate: item.latestModifiedDate,
    issueNumber: item.issueNumber,
    rowNumber: item.rowNumber,
    page: item.page,
    pageRow: item.pageRow,
    groupSeq: item.groupSeq,
    fileId: item.fileId,
  }));

  return [...defenseLawItems, ...adminRuleItems];
}

export function getCatalogSummary() {
  const defenseLawCount = defenseData.items.length;
  const adminRuleCount = adminRuleData.summary.uniqueLatestRows;

  return {
    defenseLawCount,
    adminRuleCount,
    totalCount: defenseLawCount + adminRuleCount,
    adminRuleSourceRows: adminRuleData.summary.totalRows,
    adminRuleSourcePages: adminRuleData.summary.totalPages,
  };
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\u300C\u300D\u300E\u300F()[\]{}]/g, "")
    .trim();
}

function scoreCatalogItem(item: CatalogItem, query: string) {
  const normalizedQuery = normalize(query);
  const normalizedName = normalize(item.name);

  if (!normalizedQuery) {
    return 1;
  }
  if (normalizedName === normalizedQuery) {
    return 100;
  }
  if (normalizedName.includes(normalizedQuery)) {
    return 80;
  }
  if (normalizedQuery.includes(normalizedName)) {
    return 70;
  }
  if (item.name.includes(query)) {
    return 60;
  }

  return 0;
}

export function searchCatalog(params: {
  query?: string;
  source?: "all" | CatalogSource;
  type?: string;
  limit?: number;
}) {
  const query = params.query?.trim() ?? "";
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const source = params.source ?? "all";
  const type = params.type?.trim();

  const scored = getCatalogItems()
    .filter((item) => source === "all" || item.source === source)
    .filter((item) => !type || item.type === type || item.category === type)
    .map((item) => ({
      item,
      score: scoreCatalogItem(item, query),
    }))
    .filter(({ score }) => !query || score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const dateCompare = (b.item.latestModifiedDate ?? "").localeCompare(
        a.item.latestModifiedDate ?? ""
      );
      if (dateCompare !== 0) {
        return dateCompare;
      }

      return a.item.name.localeCompare(b.item.name, "ko");
    });

  return {
    totalMatches: scored.length,
    items: scored.slice(0, limit).map(({ item, score }) => ({
      ...item,
      matchScore: score,
    })),
  };
}

export function findBestCatalogMatch(query: string) {
  return searchCatalog({ query, limit: 1 }).items[0] ?? null;
}
