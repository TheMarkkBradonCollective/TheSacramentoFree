import { timingSafeEqual } from 'crypto';

/** Constant-time string comparison to reduce timing side-channels on secrets. */
export function secureCompare(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
