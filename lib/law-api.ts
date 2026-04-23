import { XMLParser, XMLValidator } from "fast-xml-parser";

export type LawTarget =
  | "law"
  | "admrul"
  | "ordin"
  | "prec"
  | "detc"
  | "expc"
  | "decc"
  | "trty"
  | "lstrm"
  | "law_appendix"
  | "admrul_appendix"
  | "ordin_appendix";

export type RequestedTarget = LawTarget | "auto";

export type LawSearchItem = {
  target: LawTarget;
  upstreamTarget: string;
  id: string;
  mst: string;
  alternateId: string;
  name: string;
  type: string;
  effectiveDate: string;
  promulgationDate: string;
  department: string;
  detailUrl: string;
  detailQuery: string;
  searchOnly: boolean;
  raw: Record<string, unknown>;
};

type TargetConfig = {
  label: string;
  upstreamTarget: string;
  searchOnly?: boolean;
  searchIdKeys: string[];
  detailIdKeys?: string[];
  mstKeys?: string[];
  alternateIdKeys?: string[];
  nameKeys: string[];
  typeKeys?: string[];
  effectiveDateKeys?: string[];
  promulgationDateKeys?: string[];
  departmentKeys?: string[];
  detailLinkKeys?: string[];
  bodyKeys?: string[];
  titleKeys?: string[];
  detailLookup: "id_or_mst" | "id_or_alternate" | "id" | "query";
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  trimValues: true,
});

const KO = {
  law: "\uBC95\uB839",
  adminRule: "\uD589\uC815\uADDC\uCE59",
  ordinance: "\uC790\uCE58\uBC95\uADDC",
  caseLaw: "\uD310\uB840",
  constitutionalCase: "\uD5CC\uC7AC\uACB0\uC815\uB840",
  legalInterpretation: "\uBC95\uB839\uD574\uC11D\uB840",
  adminAppeal: "\uD589\uC815\uC2EC\uD310\uB840",
  treaty: "\uC870\uC57D",
  legalTerm: "\uBC95\uB839\uC6A9\uC5B4",
  appendix: "\uBCC4\uD45C",
  form: "\uC11C\uC2DD",
  lawSearchRoot: "LawSearch",
  adminRuleSearchRoot: "AdmRulSearch",
  ordinanceSearchRoot: "OrdinSearch",
  articleNumber: "\uC870\uBB38\uBC88\uD638",
  articleBranchNumber: "\uC870\uBB38\uAC00\uC9C0\uBC88\uD638",
  articleKey: "\uC870\uBB38\uD0A4",
  articleNo: "\uC870\uBC88\uD638",
  article: "\uC870",
  articleTitle: "\uC870\uBB38\uC81C\uBAA9",
  articleText: "\uC870\uBB38\uB0B4\uC6A9",
  title: "\uC81C\uBAA9",
};

const TARGET_CONFIG: Record<LawTarget, TargetConfig> = {
  law: {
    label: "Current law",
    upstreamTarget: "eflaw",
    searchIdKeys: ["\uBC95\uB839ID", "ID", "id"],
    detailIdKeys: ["\uBC95\uB839ID", "ID", "id"],
    mstKeys: ["\uBC95\uB839\uC77C\uB828\uBC88\uD638", "MST", "mst"],
    nameKeys: ["\uBC95\uB839\uBA85\uD55C\uAE00", "\uBC95\uB839\uBA85", "lawNm"],
    typeKeys: ["\uBC95\uB839\uAD6C\uBD84\uBA85", "\uBC95\uC885\uAD6C\uBD84\uBA85"],
    effectiveDateKeys: ["\uC2DC\uD589\uC77C\uC790", "\uC2DC\uD589\uC77C"],
    promulgationDateKeys: ["\uACF5\uD3EC\uC77C\uC790", "\uACF5\uD3EC\uC77C"],
    departmentKeys: ["\uC18C\uAD00\uBD80\uCC98\uBA85", "\uC18C\uAD00\uBD80\uCC98"],
    detailLinkKeys: ["\uBC95\uB839\uC0C1\uC138\uB9C1\uD06C"],
    bodyKeys: [
      "\uC870\uBB38\uB0B4\uC6A9",
      "\uD56D\uB0B4\uC6A9",
      "\uD638\uB0B4\uC6A9",
      "\uBAA9\uB0B4\uC6A9",
      "\uBD80\uCE59\uB0B4\uC6A9",
      "\uBCC4\uD45C\uB0B4\uC6A9",
      "\uAC1C\uC815\uBB38\uB0B4\uC6A9",
      "\uC81C\uAC1C\uC815\uC774\uC720\uB0B4\uC6A9",
    ],
    titleKeys: ["\uBC95\uB839\uBA85_\uD55C\uAE00", "\uBC95\uB839\uBA85\uD55C\uAE00", "\uBC95\uB839\uBA85"],
    detailLookup: "id_or_mst",
  },
  admrul: {
    label: "Administrative rule",
    upstreamTarget: "admrul",
    searchIdKeys: ["\uD589\uC815\uADDC\uCE59\uC77C\uB828\uBC88\uD638", "ID", "id"],
    detailIdKeys: ["\uD589\uC815\uADDC\uCE59\uC77C\uB828\uBC88\uD638", "ID", "id"],
    alternateIdKeys: ["\uD589\uC815\uADDC\uCE59ID", "LID", "lid"],
    nameKeys: ["\uD589\uC815\uADDC\uCE59\uBA85"],
    typeKeys: ["\uD589\uC815\uADDC\uCE59\uC885\uB958", "\uD589\uC815\uADDC\uCE59\uAD6C\uBD84\uBA85"],
    effectiveDateKeys: ["\uC2DC\uD589\uC77C\uC790"],
    promulgationDateKeys: ["\uBC1C\uB839\uC77C\uC790"],
    departmentKeys: ["\uC18C\uAD00\uBD80\uCC98\uBA85"],
    detailLinkKeys: ["\uD589\uC815\uADDC\uCE59\uC0C1\uC138\uB9C1\uD06C"],
    bodyKeys: [
      "\uC804\uBB38",
      "\uBCF8\uBB38",
      "\uC870\uBB38\uB0B4\uC6A9",
      "\uD56D\uB0B4\uC6A9",
      "\uD638\uB0B4\uC6A9",
      "\uBAA9\uB0B4\uC6A9",
      "\uBCC4\uD45C\uB0B4\uC6A9",
    ],
    titleKeys: ["\uD589\uC815\uADDC\uCE59\uBA85"],
    detailLookup: "id_or_alternate",
  },
  ordin: {
    label: "Local ordinance",
    upstreamTarget: "ordin",
    searchIdKeys: ["\uC790\uCE58\uBC95\uADDCID", "ID", "id"],
    detailIdKeys: ["\uC790\uCE58\uBC95\uADDCID", "ID", "id"],
    mstKeys: ["\uC790\uCE58\uBC95\uADDC\uC77C\uB828\uBC88\uD638", "MST", "mst"],
    nameKeys: ["\uC790\uCE58\uBC95\uADDC\uBA85"],
    typeKeys: ["\uC790\uCE58\uBC95\uADDC\uC885\uB958", "\uBC95\uB839\uC885\uB958"],
    effectiveDateKeys: ["\uC2DC\uD589\uC77C\uC790"],
    promulgationDateKeys: ["\uACF5\uD3EC\uC77C\uC790", "\uBC1C\uB839\uC77C\uC790"],
    departmentKeys: ["\uAE30\uAD00\uBA85", "\uC9C0\uC790\uCCB4\uBA85"],
    detailLinkKeys: ["\uC790\uCE58\uBC95\uADDC\uC0C1\uC138\uB9C1\uD06C"],
    bodyKeys: [
      "\uC804\uBB38",
      "\uBCF8\uBB38",
      "\uC870\uBB38\uB0B4\uC6A9",
      "\uD56D\uB0B4\uC6A9",
      "\uD638\uB0B4\uC6A9",
      "\uBAA9\uB0B4\uC6A9",
      "\uBCC4\uD45C\uB0B4\uC6A9",
    ],
    titleKeys: ["\uC790\uCE58\uBC95\uADDC\uBA85"],
    detailLookup: "id_or_mst",
  },
  prec: {
    label: "Precedent",
    upstreamTarget: "prec",
    searchIdKeys: ["\uD310\uB840\uC77C\uB828\uBC88\uD638", "\uD310\uB840\uC815\uBCF4\uC77C\uB828\uBC88\uD638", "ID", "id"],
    detailIdKeys: ["\uD310\uB840\uC815\uBCF4\uC77C\uB828\uBC88\uD638", "\uD310\uB840\uC77C\uB828\uBC88\uD638", "ID", "id"],
    nameKeys: ["\uC0AC\uAC74\uBA85"],
    typeKeys: ["\uC0AC\uAC74\uC885\uB958\uBA85", "\uD310\uACB0\uC720\uD615"],
    effectiveDateKeys: ["\uC120\uACE0\uC77C\uC790"],
    promulgationDateKeys: ["\uC120\uACE0\uC77C\uC790"],
    departmentKeys: ["\uBC95\uC6D0\uBA85"],
    detailLinkKeys: ["\uD310\uB840\uC0C1\uC138\uB9C1\uD06C"],
    bodyKeys: ["\uD310\uB840\uB0B4\uC6A9", "\uD310\uACB0\uC694\uC9C0", "\uD310\uC2DC\uC0AC\uD56D"],
    titleKeys: ["\uC0AC\uAC74\uBA85"],
    detailLookup: "id",
  },
  detc: {
    label: "Constitutional Court decision",
    upstreamTarget: "detc",
    searchIdKeys: ["\uD5CC\uC7AC\uACB0\uC815\uB840\uC77C\uB828\uBC88\uD638", "ID", "id"],
    detailIdKeys: ["\uD5CC\uC7AC\uACB0\uC815\uB840\uC77C\uB828\uBC88\uD638", "ID", "id"],
    nameKeys: ["\uC0AC\uAC74\uBA85"],
    typeKeys: ["\uC0AC\uAC74\uC885\uB958\uBA85"],
    effectiveDateKeys: ["\uC885\uAD6D\uC77C\uC790"],
    promulgationDateKeys: ["\uC885\uAD6D\uC77C\uC790"],
    departmentKeys: ["\uC7AC\uD310\uBD80\uAD6C\uBD84\uCF54\uB4DC"],
    detailLinkKeys: ["\uD5CC\uC7AC\uACB0\uC815\uB840\uC0C1\uC138\uB9C1\uD06C"],
    bodyKeys: ["\uC804\uBB38", "\uACB0\uC815\uC694\uC9C0", "\uD310\uC2DC\uC0AC\uD56D", "\uC2EC\uD310\uB300\uC0C1\uC870\uBB38"],
    titleKeys: ["\uC0AC\uAC74\uBA85"],
    detailLookup: "id",
  },
  expc: {
    label: "Legal interpretation",
    upstreamTarget: "expc",
    searchIdKeys: ["\uBC95\uB839\uD574\uC11D\uB840\uC77C\uB828\uBC88\uD638", "ID", "id"],
    detailIdKeys: ["\uBC95\uB839\uD574\uC11D\uB840\uC77C\uB828\uBC88\uD638", "ID", "id"],
    nameKeys: ["\uC548\uAC74\uBA85"],
    typeKeys: ["\uD68C\uC2E0\uAE30\uAD00\uBA85"],
    effectiveDateKeys: ["\uD68C\uC2E0\uC77C\uC790", "\uD574\uC11D\uC77C\uC790"],
    promulgationDateKeys: ["\uD68C\uC2E0\uC77C\uC790", "\uD574\uC11D\uC77C\uC790"],
    departmentKeys: ["\uD68C\uC2E0\uAE30\uAD00\uBA85", "\uC9C8\uC758\uAE30\uAD00\uBA85"],
    detailLinkKeys: ["\uBC95\uB839\uD574\uC11D\uB840\uC0C1\uC138\uB9C1\uD06C"],
    bodyKeys: [
      "\uD68C\uB2F5",
      "\uC774\uC720",
      "\uBCF8\uBB38",
      "\uAC80\uD1A0\uC758\uACAC",
      "\uD574\uC11D\uB0B4\uC6A9",
      "\uC9C8\uC758\uC694\uC9C0",
    ],
    titleKeys: ["\uC548\uAC74\uBA85"],
    detailLookup: "id",
  },
  decc: {
    label: "Administrative appeal decision",
    upstreamTarget: "decc",
    searchIdKeys: ["\uD589\uC815\uC2EC\uD310\uB840\uC77C\uB828\uBC88\uD638", "ID", "id"],
    detailIdKeys: ["\uD589\uC815\uC2EC\uD310\uB840\uC77C\uB828\uBC88\uD638", "ID", "id"],
    nameKeys: ["\uC0AC\uAC74\uBA85", "\uC7AC\uACB0\uB840\uBA85"],
    typeKeys: ["\uC7AC\uACB0\uB840\uC720\uD615\uBA85", "\uC7AC\uACB0\uB840\uC720\uD615\uCF54\uB4DC"],
    effectiveDateKeys: ["\uC758\uACB0\uC77C\uC790", "\uCC98\uBD84\uC77C\uC790"],
    promulgationDateKeys: ["\uC758\uACB0\uC77C\uC790", "\uCC98\uBD84\uC77C\uC790"],
    departmentKeys: ["\uC7AC\uACB0\uCCAD", "\uCC98\uBD84\uCCAD"],
    detailLinkKeys: ["\uD589\uC815\uC2EC\uD310\uB840\uC0C1\uC138\uB9C1\uD06C"],
    bodyKeys: ["\uC7AC\uACB0\uC694\uC9C0", "\uC774\uC720", "\uC8FC\uBB38", "\uCCAD\uAD6C\uCDE8\uC9C0"],
    titleKeys: ["\uC0AC\uAC74\uBA85", "\uC7AC\uACB0\uB840\uBA85"],
    detailLookup: "id",
  },
  trty: {
    label: "Treaty",
    upstreamTarget: "trty",
    searchIdKeys: ["\uC870\uC57D\uC77C\uB828\uBC88\uD638", "\uC870\uC57DID", "ID", "id"],
    detailIdKeys: ["\uC870\uC57DID", "\uC870\uC57D\uC77C\uB828\uBC88\uD638", "ID", "id"],
    nameKeys: ["\uC870\uC57D\uBA85_\uD55C\uAE00", "\uC870\uC57D\uBA85", "\uC870\uC57D\uBA85\uD55C\uAE00"],
    typeKeys: ["\uC870\uC57D\uAD6C\uBD84\uBA85", "\uC870\uC57D\uAD6C\uBD84\uCF54\uB4DC"],
    effectiveDateKeys: ["\uBC1C\uD6A8\uC77C\uC790", "\uCCB4\uACB0\uC77C\uC790"],
    promulgationDateKeys: ["\uBC1C\uD6A8\uC77C\uC790", "\uCCB4\uACB0\uC77C\uC790"],
    departmentKeys: ["\uCCB4\uACB0\uB300\uC0C1\uAD6D\uAC00\uD55C\uAE00", "\uCCB4\uACB0\uB300\uC0C1\uAD6D\uAC00"],
    detailLinkKeys: ["\uC870\uC57D\uC0C1\uC138\uB9C1\uD06C"],
    bodyKeys: ["\uC870\uC57D\uB0B4\uC6A9", "\uCD94\uAC00\uC815\uBCF4"],
    titleKeys: ["\uC870\uC57D\uBA85_\uD55C\uAE00", "\uC870\uC57D\uBA85\uD55C\uAE00"],
    detailLookup: "id",
  },
  lstrm: {
    label: "Legal term",
    upstreamTarget: "lstrm",
    searchIdKeys: ["\uBC95\uB839\uC6A9\uC5B4ID", "lstrm id", "\uBC95\uB839\uC6A9\uC5B4 id"],
    detailIdKeys: ["\uBC95\uB839\uC6A9\uC5B4 \uC77C\uB828\uBC88\uD638", "\uBC95\uB839\uC6A9\uC5B4ID"],
    nameKeys: ["\uBC95\uB839\uC6A9\uC5B4\uBA85_\uD55C\uAE00", "\uBC95\uB839\uC6A9\uC5B4\uBA85"],
    typeKeys: ["\uBC95\uB839\uC6A9\uC5B4\uCF54\uB4DC\uBA85", "\uC0AC\uC804\uAD6C\uBD84\uCF54\uB4DC"],
    detailLinkKeys: ["\uBC95\uB839\uC6A9\uC5B4\uC0C1\uC138\uB9C1\uD06C"],
    bodyKeys: ["\uBC95\uB839\uC6A9\uC5B4\uC815\uC758"],
    titleKeys: ["\uBC95\uB839\uC6A9\uC5B4\uBA85_\uD55C\uAE00", "\uBC95\uB839\uC6A9\uC5B4\uBA85"],
    detailLookup: "query",
  },
  law_appendix: {
    label: "Law appendix or form",
    upstreamTarget: "licbyl",
    searchOnly: true,
    searchIdKeys: ["\uBCC4\uD45C\uC77C\uB828\uBC88\uD638", "ID", "id"],
    nameKeys: ["\uBCC4\uD45C\uBA85"],
    typeKeys: ["\uBCC4\uD45C\uC885\uB958", "\uBC95\uB839\uC885\uB958"],
    promulgationDateKeys: ["\uACF5\uD3EC\uC77C\uC790"],
    departmentKeys: ["\uC18C\uAD00\uBD80\uCC98\uBA85", "\uAD00\uB828\uBC95\uB839\uBA85"],
    detailLinkKeys: ["\uBCC4\uD45C\uBC95\uB839\uC0C1\uC138\uB9C1\uD06C"],
    detailLookup: "id",
  },
  admrul_appendix: {
    label: "Administrative rule appendix or form",
    upstreamTarget: "admbyl",
    searchOnly: true,
    searchIdKeys: ["\uBCC4\uD45C\uC77C\uB828\uBC88\uD638", "ID", "id"],
    nameKeys: ["\uBCC4\uD45C\uBA85"],
    typeKeys: ["\uBCC4\uD45C\uC885\uB958", "\uD589\uC815\uADDC\uCE59\uC885\uB958"],
    promulgationDateKeys: ["\uBC1C\uB839\uC77C\uC790"],
    departmentKeys: ["\uC18C\uAD00\uBD80\uCC98\uBA85", "\uAD00\uB828\uD589\uC815\uADDC\uCE59\uBA85"],
    detailLinkKeys: ["\uBCC4\uD45C\uD589\uC815\uADDC\uCE59\uC0C1\uC138\uB9C1\uD06C"],
    detailLookup: "id",
  },
  ordin_appendix: {
    label: "Local ordinance appendix or form",
    upstreamTarget: "ordinbyl",
    searchOnly: true,
    searchIdKeys: ["\uBCC4\uD45C\uC77C\uB828\uBC88\uD638", "ID", "id"],
    nameKeys: ["\uBCC4\uD45C\uBA85"],
    typeKeys: ["\uBCC4\uD45C\uC885\uB958", "\uC790\uCE58\uBC95\uADDC\uC885\uB958"],
    promulgationDateKeys: ["\uACF5\uD3EC\uC77C\uC790"],
    departmentKeys: ["\uC9C0\uC790\uCCB4\uBA85", "\uAD00\uB828\uC790\uCE58\uBC95\uADDC\uBA85"],
    detailLinkKeys: ["\uBCC4\uD45C\uC790\uCE58\uBC95\uADDC\uC0C1\uC138\uB9C1\uD06C"],
    detailLookup: "id",
  },
};

const TARGET_ALIASES: Record<string, RequestedTarget> = {
  auto: "auto",
  all: "auto",
  law: "law",
  eflaw: "law",
  laws: "law",
  [KO.law]: "law",
  admrul: "admrul",
  admin_rule: "admrul",
  admin_rules: "admrul",
  [KO.adminRule]: "admrul",
  ordin: "ordin",
  ordinance: "ordin",
  ordinances: "ordin",
  [KO.ordinance]: "ordin",
  prec: "prec",
  precedent: "prec",
  precedents: "prec",
  [KO.caseLaw]: "prec",
  detc: "detc",
  constitutional_case: "detc",
  constitutional_decision: "detc",
  [KO.constitutionalCase]: "detc",
  expc: "expc",
  legal_interpretation: "expc",
  legal_interpretations: "expc",
  [KO.legalInterpretation]: "expc",
  decc: "decc",
  admin_appeal: "decc",
  admin_appeal_decision: "decc",
  [KO.adminAppeal]: "decc",
  trty: "trty",
  treaty: "trty",
  treaties: "trty",
  [KO.treaty]: "trty",
  lstrm: "lstrm",
  term: "lstrm",
  terms: "lstrm",
  legal_term: "lstrm",
  legal_terms: "lstrm",
  [KO.legalTerm]: "lstrm",
  law_appendix: "law_appendix",
  law_form: "law_appendix",
  licbyl: "law_appendix",
  [KO.appendix]: "law_appendix",
  admrul_appendix: "admrul_appendix",
  admin_rule_appendix: "admrul_appendix",
  admin_rule_form: "admrul_appendix",
  admbyl: "admrul_appendix",
  ordin_appendix: "ordin_appendix",
  ordinance_appendix: "ordin_appendix",
  ordinance_form: "ordin_appendix",
  ordinbyl: "ordin_appendix",
};

const AUTO_TARGETS: LawTarget[] = [
  "law",
  "admrul",
  "ordin",
  "prec",
  "detc",
  "expc",
  "decc",
  "trty",
  "lstrm",
];

function normalizeMatchText(value: string) {
  return value
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[\u300C\u300D\u300E\u300F()[\]{}'".,]/g, "")
    .trim();
}

function toComparableDate(value: string) {
  const numeric = value.replace(/[^\d]/g, "");
  return numeric || "0";
}

function truncateText(value: string, maxLength = 20000) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n...[truncated]`;
}

export function normalizeTarget(value?: string | null): LawTarget {
  if (!value) {
    return "law";
  }

  const normalized = TARGET_ALIASES[value.toLowerCase().trim()];
  if (normalized && normalized !== "auto") {
    return normalized;
  }

  return "law";
}

export function normalizeRequestedTarget(value?: string | null): RequestedTarget {
  if (!value) {
    return "auto";
  }

  return TARGET_ALIASES[value.toLowerCase().trim()] ?? "auto";
}

export function resolveSearchTargets(value?: string | null) {
  const normalized = normalizeRequestedTarget(value);
  return normalized === "auto" ? AUTO_TARGETS : [normalized];
}

function getConfig(target: LawTarget) {
  return TARGET_CONFIG[target];
}

function getLawApiBases() {
  if (process.env.LAW_API_BASE) {
    return [process.env.LAW_API_BASE];
  }

  return [
    "https://law.go.kr/DRF",
    "http://law.go.kr/DRF",
    "http://www.law.go.kr/DRF",
  ];
}

function addCommonParams(url: URL) {
  const oc = process.env.LAW_API_KEY || process.env.LAW_API_OC;

  if (oc) {
    url.searchParams.set("OC", oc);
  }
}

function buildUrl(
  base: string,
  path: "lawSearch.do" | "lawService.do",
  params: Record<string, string>
) {
  const url = new URL(`${base}/${path}`);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      url.searchParams.set(key, value);
    }
  });

  addCommonParams(url);
  return url;
}

function sanitizeXml(xml: string) {
  return xml.replace(/^\uFEFF/, "").trim();
}

export function parseXml(xml: string) {
  const sanitized = sanitizeXml(xml);
  const validation = XMLValidator.validate(sanitized);

  if (validation !== true) {
    throw new Error(
      typeof validation === "object" ? validation.err.msg : "Invalid XML response."
    );
  }

  return parser.parse(sanitized) as Record<string, unknown>;
}

function readString(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
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

function extractApiError(parsed: Record<string, unknown>) {
  const response = parsed.Response;

  if (response && typeof response === "object" && !Array.isArray(response)) {
    const result = readString(response as Record<string, unknown>, ["result"]);
    const message = readString(response as Record<string, unknown>, ["msg", "message"]);

    if (result || message) {
      return { result, message };
    }
  }

  return null;
}

async function fetchXml(url: URL) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
    headers: {
      Accept: "application/xml, text/xml, */*",
      "User-Agent": "Mozilla/5.0 (compatible; DAPA-Law-Proxy/1.0)",
    },
  });
  const xml = await response.text();

  if (!response.ok) {
    throw new Error(`Law API request failed: HTTP ${response.status}`);
  }

  const parsed = parseXml(xml);
  const apiError = extractApiError(parsed);

  if (apiError) {
    const message = [apiError.result, apiError.message].filter(Boolean).join(" - ");
    throw new Error(message || "Law API error.");
  }

  return { parsed, xml };
}

async function fetchXmlWithFallback(
  path: "lawSearch.do" | "lawService.do",
  params: Record<string, string>
) {
  let lastError: unknown;
  const attempts: string[] = [];

  for (const base of getLawApiBases()) {
    const url = buildUrl(base, path, params);
    attempts.push(redactApiKey(url));

    try {
      const result = await fetchXml(url);
      return {
        ...result,
        requestUrl: redactApiKey(url),
      };
    } catch (error) {
      lastError = error;
    }
  }

  const message =
    lastError instanceof Error
      ? `${lastError.message} | attempts=${attempts.join(", ")}`
      : `Law API request failed. | attempts=${attempts.join(", ")}`;

  throw new Error(message);
}

function flattenText(value: unknown): string[] {
  if (value == null) {
    return [];
  }
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text ? [text] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap(flattenText);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(flattenText);
  }

  return [];
}

function visitObjects(
  value: unknown,
  visitor: (node: Record<string, unknown>) => void
) {
  if (!value || typeof value !== "object") {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      visitObjects(item, visitor);
    }
    return;
  }

  const node = value as Record<string, unknown>;
  visitor(node);

  for (const child of Object.values(node)) {
    visitObjects(child, visitor);
  }
}

function collectFieldValues(parsed: Record<string, unknown>, keys: string[]) {
  const values = new Set<string>();

  visitObjects(parsed, (node) => {
    for (const key of keys) {
      const value = node[key];
      if (typeof value === "string" && value.trim()) {
        values.add(value.trim());
      } else if (typeof value === "number" && Number.isFinite(value)) {
        values.add(String(value));
      }
    }
  });

  return [...values];
}

function collectCandidateNodes(parsed: Record<string, unknown>, target: LawTarget) {
  const config = getConfig(target);
  const candidateKeys = [
    ...config.searchIdKeys,
    ...(config.detailIdKeys ?? []),
    ...(config.mstKeys ?? []),
    ...(config.alternateIdKeys ?? []),
    ...config.nameKeys,
    ...(config.detailLinkKeys ?? []),
  ];
  const candidates: Record<string, unknown>[] = [];

  visitObjects(parsed, (node) => {
    if (candidateKeys.some((key) => key in node)) {
      candidates.push(node);
    }
  });

  return candidates;
}

function extractDetailIdFromLink(item: Record<string, unknown>, detailLinkKeys: string[]) {
  const detailLink = readString(item, detailLinkKeys);

  if (!detailLink) {
    return "";
  }

  try {
    const url = new URL(detailLink, getLawApiBases()[0]);
    return (
      url.searchParams.get("ID")?.trim() ??
      url.searchParams.get("LID")?.trim() ??
      url.searchParams.get("MST")?.trim() ??
      ""
    );
  } catch {
    return "";
  }
}

function selectPrimaryId(item: Record<string, unknown>, target: LawTarget) {
  const config = getConfig(target);
  const detailIdFromLink = extractDetailIdFromLink(item, config.detailLinkKeys ?? []);
  const searchId = readString(item, config.searchIdKeys);
  const detailId = readString(item, config.detailIdKeys ?? []);
  const alternateId = readString(item, config.alternateIdKeys ?? []);

  if (config.detailLookup === "id_or_alternate") {
    return detailId || searchId || alternateId || detailIdFromLink;
  }

  return detailId || searchId || detailIdFromLink || alternateId;
}

export function normalizeSearchItems(target: LawTarget, parsed: Record<string, unknown>) {
  const config = getConfig(target);
  const seen = new Set<string>();

  return collectCandidateNodes(parsed, target)
    .map((item): LawSearchItem => {
      const id = selectPrimaryId(item, target);
      const mst = readString(item, config.mstKeys ?? []);
      const alternateId = readString(item, config.alternateIdKeys ?? []);
      const name = readString(item, config.nameKeys);

      return {
        target,
        upstreamTarget: config.upstreamTarget,
        id,
        mst,
        alternateId,
        name,
        type: readString(item, config.typeKeys ?? []),
        effectiveDate: readString(item, config.effectiveDateKeys ?? []),
        promulgationDate: readString(item, config.promulgationDateKeys ?? []),
        department: readString(item, config.departmentKeys ?? []),
        detailUrl: readString(item, config.detailLinkKeys ?? []),
        detailQuery: name,
        searchOnly: Boolean(config.searchOnly),
        raw: item,
      };
    })
    .filter((item) => item.name || item.id || item.mst || item.alternateId)
    .filter((item) => {
      const key = [
        item.target,
        item.id,
        item.mst,
        item.alternateId,
        item.name,
      ].join(":");

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

export function selectBestSearchItem(items: LawSearchItem[], query: string) {
  const normalizedQuery = normalizeMatchText(query);

  if (!normalizedQuery) {
    return items[0] ?? null;
  }

  const scored = items
    .map((item) => {
      const normalizedName = normalizeMatchText(item.name);
      let score = 0;

      if (normalizedName === normalizedQuery) {
        score = 300;
      } else if (normalizedName.includes(normalizedQuery)) {
        score = 200;
      } else if (normalizedQuery.includes(normalizedName)) {
        score = 150;
      } else if (item.name.includes(query)) {
        score = 100;
      }

      if (item.target === "law") {
        score += 10;
      }

      return { item, score };
    })
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      const effectiveCompare = toComparableDate(b.item.effectiveDate).localeCompare(
        toComparableDate(a.item.effectiveDate)
      );
      if (effectiveCompare !== 0) {
        return effectiveCompare;
      }

      const promulgationCompare = toComparableDate(b.item.promulgationDate).localeCompare(
        toComparableDate(a.item.promulgationDate)
      );
      if (promulgationCompare !== 0) {
        return promulgationCompare;
      }

      return a.item.name.localeCompare(b.item.name, "ko");
    });

  return scored[0]?.item ?? null;
}

export async function searchLawApi(params: {
  target: LawTarget;
  query: string;
  page?: number;
  display?: number;
}) {
  const config = getConfig(params.target);
  const { parsed, requestUrl } = await fetchXmlWithFallback("lawSearch.do", {
    target: config.upstreamTarget,
    type: "XML",
    query: params.query,
    page: String(params.page ?? 1),
    display: String(params.display ?? 10),
    sort: "lasc",
  });

  return {
    requestUrl,
    parsed,
    items: normalizeSearchItems(params.target, parsed),
  };
}

export async function searchLawApiMultiTarget(params: {
  target?: string | null;
  query: string;
  page?: number;
  display?: number;
}) {
  const targets = resolveSearchTargets(params.target);
  const settled = await Promise.allSettled(
    targets.map((target) =>
      searchLawApi({
        target,
        query: params.query,
        page: params.page,
        display: params.display,
      })
    )
  );

  const results = settled.flatMap((result, index) =>
    result.status === "fulfilled"
      ? [
          {
            target: targets[index],
            requestUrl: result.value.requestUrl,
            items: result.value.items,
          },
        ]
      : []
  );

  if (results.length === 0) {
    const firstError = settled.find((result) => result.status === "rejected");
    throw (
      (firstError && firstError.status === "rejected" ? firstError.reason : null) ??
      new Error("Law API request failed.")
    );
  }

  return {
    targets,
    requestUrls: results.map((result) => ({
      target: result.target,
      requestUrl: result.requestUrl,
    })),
    items: results.flatMap((result) => result.items),
  };
}

function buildDetailParams(
  target: LawTarget,
  params: { id?: string; mst?: string; query?: string }
): Record<string, string> {
  const config = getConfig(target);

  switch (config.detailLookup) {
    case "query":
      return {
        target: config.upstreamTarget,
        type: "XML",
        query: params.query ?? "",
      };
    case "id_or_alternate":
      return {
        target: config.upstreamTarget,
        type: "XML",
        ID: params.id ?? "",
        LID: params.mst ?? "",
      };
    case "id":
      return {
        target: config.upstreamTarget,
        type: "XML",
        ID: params.id ?? "",
      };
    case "id_or_mst":
    default:
      return {
        target: config.upstreamTarget,
        type: "XML",
        ID: params.id ?? "",
        MST: params.mst ?? "",
      };
  }
}

export function normalizeDetail(target: LawTarget, parsed: Record<string, unknown>) {
  const config = getConfig(target);
  const title = collectFieldValues(parsed, config.titleKeys ?? config.nameKeys)[0] ?? "";
  const type = collectFieldValues(parsed, config.typeKeys ?? [])[0] ?? "";
  const department = collectFieldValues(parsed, config.departmentKeys ?? [])[0] ?? "";
  const primaryDate =
    collectFieldValues(parsed, config.effectiveDateKeys ?? [])[0] ??
    collectFieldValues(parsed, config.promulgationDateKeys ?? [])[0] ??
    "";
  const bodyParts = collectFieldValues(parsed, config.bodyKeys ?? []);
  const bodyText =
    bodyParts.length > 0
      ? truncateText(bodyParts.join("\n\n"))
      : truncateText(flattenText(parsed).join("\n"));

  return {
    target,
    label: config.label,
    title,
    type,
    department,
    primaryDate,
    bodyText,
    searchOnly: Boolean(config.searchOnly),
  };
}

export async function getLawDetail(params: {
  target: LawTarget;
  id?: string;
  mst?: string;
  query?: string;
}) {
  const config = getConfig(params.target);

  if (config.searchOnly) {
    throw new Error(`${config.label} is search-only in this wrapper.`);
  }

  const lookupParams = buildDetailParams(params.target, params);
  const { parsed, requestUrl } = await fetchXmlWithFallback("lawService.do", lookupParams);

  return {
    requestUrl,
    parsed,
    normalized: normalizeDetail(params.target, parsed),
  };
}

function redactApiKey(url: URL) {
  const copy = new URL(url.toString());

  if (copy.searchParams.has("OC")) {
    copy.searchParams.set("OC", "REDACTED");
  }

  return copy.toString();
}

function normalizeArticleNumber(value: string) {
  return value
    .replace(/^\uC81C/, "")
    .replace(/\uC870.*$/, "")
    .replace(/[^\d]/g, "")
    .trim();
}

function findArticleNode(parsed: Record<string, unknown>, wanted: string) {
  let found: Record<string, unknown> | null = null;

  visitObjects(parsed, (candidate) => {
    if (found) {
      return;
    }

    const number = readString(candidate, [
      KO.articleNumber,
      KO.articleBranchNumber,
      KO.articleKey,
      KO.articleNo,
      KO.article,
    ]);

    if (normalizeArticleNumber(number) === wanted) {
      found = candidate;
      return;
    }

    const title = readString(candidate, [KO.articleTitle, KO.articleText, KO.title]);
    const marker = `\uC81C${wanted}\uC870`;
    if (title.startsWith(marker) || title.includes(marker)) {
      found = candidate;
    }
  });

  return found;
}

function extractArticleFromTextLines(parsed: Record<string, unknown>, wanted: string) {
  const marker = `\uC81C${wanted}\uC870`;
  const articleLine = flattenText(parsed).find((text) => {
    const normalized = text.trim();
    return normalized.startsWith(marker) || normalized.includes(`${marker}(`);
  });

  if (!articleLine) {
    return null;
  }

  const titleMatch = articleLine.match(new RegExp(`^${marker}(?:\\(([^)]+)\\))?`));

  return {
    article: `\uC81C${wanted}\uC870`,
    title: titleMatch?.[1] ?? "",
    text: articleLine,
    raw: articleLine,
  };
}

export function extractArticle(parsed: Record<string, unknown>, article?: string | null) {
  if (!article) {
    return null;
  }

  const wanted = normalizeArticleNumber(article);
  if (!wanted) {
    return null;
  }

  const node = findArticleNode(parsed, wanted);

  if (!node) {
    return extractArticleFromTextLines(parsed, wanted);
  }

  return {
    article,
    title: readString(node, [KO.articleTitle, KO.title]),
    text: flattenText(node).join("\n"),
    raw: node,
  };
}
