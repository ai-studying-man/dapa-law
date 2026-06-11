function unique(values) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function removePostingLabels(title) {
  return title
    .replace(/^\[[^\]]+\]\s*/g, "")
    .replace(/_.*$/g, "")
    .replace(/\s*[-_]\s*(전문|폐지령|신구조문.*)$/g, "")
    .replace(/\s*\((제정|개정|일부개정|전부개정|폐지|폐지령|국문,영문)\)\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildTitleVariants(title) {
  const base = String(title ?? "").trim();
  const withoutLabels = removePostingLabels(base);
  const middleDot = withoutLabels.replace(/？/g, "·");
  const withoutParentheses = middleDot.replace(/\([^)]*\)/g, "").replace(/\s+/g, " ");
  const dedupedRepeats = middleDot.replace(/(.{6,})\s+\1$/g, "$1");

  return unique([base, withoutLabels, middleDot, withoutParentheses, dedupedRepeats]);
}
