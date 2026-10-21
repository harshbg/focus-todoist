/**
 * Label helpers for Focus for Todoist.
 */

/**
 * Merges two lists of labels, appending items from `additions` while skipping
 * any that already exist in `existing` (or earlier in `additions`) when
 * compared case-insensitively and trimmed. Preserves the first-seen casing.
 */
export function mergeLabels(
  existing: readonly string[],
  additions: readonly string[],
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const label of existing) {
    const trimmed = label.trim();
    const key = trimmed.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  for (const label of additions) {
    const trimmed = label.trim();
    const key = trimmed.toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}
