export const BLOCK_REASON_OPTIONS = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'inappropriate', label: 'Inappropriate messages or behavior' },
  { value: 'scam', label: 'Scam or suspicious behavior' },
  { value: 'unsafe_pickup', label: 'Felt unsafe at pickup / meetup' },
  { value: 'spam', label: 'Spam or unwanted contact' },
  { value: 'other', label: 'Other (describe below)' },
] as const;

export type BlockReasonValue = (typeof BLOCK_REASON_OPTIONS)[number]['value'];

export function blockReasonLabel(value: string): string {
  return BLOCK_REASON_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
