const JSON_FIELDS = [
  "detailRefImages",
  "mustNotChangeFeatures",
  "mustNotDisappearFeatures",
  "mustNotAddFeatures",
  "allowMinorVariationFields",
] as const;

export function parseProductJsonFields<T extends Record<string, unknown>>(
  product: T
): T {
  const parsed = { ...product };
  for (const field of JSON_FIELDS) {
    const value = parsed[field as keyof T];
    if (typeof value === "string" && value) {
      try {
        (parsed as Record<string, unknown>)[field] = JSON.parse(value as string);
      } catch {
        (parsed as Record<string, unknown>)[field] = [];
      }
    }
  }
  return parsed;
}

export function stringifyProductJsonFields<T extends Record<string, unknown>>(
  data: T
): T {
  const result = { ...data };
  for (const field of JSON_FIELDS) {
    const value = result[field as keyof T];
    if (value !== undefined && value !== null && typeof value === "object") {
      (result as Record<string, unknown>)[field] = JSON.stringify(value);
    }
  }
  return result;
}
