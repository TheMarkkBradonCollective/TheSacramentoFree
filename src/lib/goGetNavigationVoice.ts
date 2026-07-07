import { parsePickupNotes } from './listingContent';
import { isInstantClaimCategory } from './goGetSessions';

function formatItemListForSpeech(labels: string[]): string {
  const cleaned = labels.map((label) => label.trim()).filter(Boolean);
  if (cleaned.length === 0) return 'the listing';
  if (cleaned.length === 1) return cleaned[0];
  if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
}

function categorySpeechLabel(category: string): string {
  const normalized = category.trim().toLowerCase();
  if (normalized === 'curb alert') return 'curb alert';
  if (normalized === 'porch pickup') return 'porch pickup';
  return normalized || 'pickup';
}

export interface GoGetNavigationVoiceParams {
  meetName: string;
  itemTitle: string;
  category: string;
  itemLabels?: string[];
}

/** Opening phrase when Go Get navigation begins. */
export function buildGoGetNavigationStartPhrase(params: GoGetNavigationVoiceParams): string {
  const person = params.meetName.trim() || 'your neighbor';
  const labels =
    params.itemLabels && params.itemLabels.length > 0
      ? params.itemLabels
      : [params.itemTitle.trim() || 'the listing'];
  const itemsSpeech = formatItemListForSpeech(labels);

  if (isInstantClaimCategory(params.category)) {
    return `Starting route to ${person}'s ${categorySpeechLabel(params.category)}, ${itemsSpeech}`;
  }

  return `Starting route to meet ${person} to pick up ${itemsSpeech}`;
}

/** Spoken right after the route-start phrase when pickup notes exist on the listing. */
export function buildGoGetPickupInstructionsPhrase(description: string): string | null {
  const notes = parsePickupNotes(description).replace(/\s+/g, ' ').trim();
  if (!notes) return null;
  return `Pickup instructions. ${notes}`;
}

export function buildGoGetNavigationFollowUpMessages(description: string): string[] {
  const instructions = buildGoGetPickupInstructionsPhrase(description);
  return instructions ? [instructions] : [];
}
