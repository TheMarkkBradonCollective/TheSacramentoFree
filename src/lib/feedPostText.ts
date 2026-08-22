/** Split feed post copy into a card headline and body (first paragraph vs rest). */
export function feedPostPreview(text: string): { headline: string; body: string } {
  const trimmed = text.trim();
  if (!trimmed) return { headline: '', body: '' };

  const paragraphs = trimmed.split(/\n\n+/).map((part) => part.trim()).filter(Boolean);
  if (paragraphs.length >= 2) {
    return { headline: paragraphs[0], body: paragraphs.slice(1).join('\n\n') };
  }

  const lines = trimmed.split('\n');
  if (lines.length >= 2 && lines[0].trim().length <= 140) {
    return { headline: lines[0].trim(), body: lines.slice(1).join('\n').trim() };
  }

  return { headline: trimmed, body: '' };
}
