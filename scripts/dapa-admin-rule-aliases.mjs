import aliases from "../data/dapa-admin-rule-api-aliases.json" with { type: "json" };

export function resolveAdminRuleApiQuery(title) {
  const trimmed = String(title ?? "").trim();
  return aliases[trimmed] ?? trimmed;
}
