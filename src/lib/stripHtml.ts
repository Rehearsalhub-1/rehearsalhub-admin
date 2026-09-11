/**
 * Strip HTML tags from a string and decode common HTML entities.
 * Used anywhere lyrics/solfas stored as rich-text HTML need to be
 * displayed inside a React Native <Text> component.
 */
export function stripHtml(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    // div blocks → preserve content + newline
    .replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n')
    // closing p → newline
    .replace(/<\/p>/gi, '\n')
    // br variants → newline
    .replace(/<br\s*\/?>/gi, '\n')
    // strip all remaining tags
    .replace(/<[^>]+>/g, '')
    // decode HTML entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    // collapse 3+ consecutive newlines to 2
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
