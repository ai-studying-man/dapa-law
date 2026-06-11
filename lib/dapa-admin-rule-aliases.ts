import aliases from "@/data/dapa-admin-rule-api-aliases.json";

const adminRuleApiAliases = aliases as Record<string, string>;

export function resolveAdminRuleApiQuery(title: string) {
  const trimmed = title.trim();
  return adminRuleApiAliases[trimmed] ?? trimmed;
}
