export function nowIso(): string {
  return new Date().toISOString();
}

export function compactTimestamp(value = new Date()): string {
  return value.toISOString().replace(/[:]/g, "-");
}
