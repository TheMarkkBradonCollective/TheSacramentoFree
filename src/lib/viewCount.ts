/** Unique neighbor view counts stored as integers (or numeric strings from PostgREST). */
export function coerceViewCount(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.floor(n);
}
