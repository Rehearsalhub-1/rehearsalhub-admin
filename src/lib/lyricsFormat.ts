/**
 * Utilities for formatting and converting song lyrics between rich HTML and human-editable text.
 */

/**
 * Converts rich HTML from database into clean, editable text with markdown bold markers (**bold**).
 */
export function htmlToEditorText(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw
    // Convert bold tags to markdown
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    // div blocks → newline
    .replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1\n')
    // closing p → double newline
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    // br → newline
    .replace(/<br\s*\/?>/gi, '\n')
    // strip remaining tags
    .replace(/<[^>]+>/g, '')
    // decode entities
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    // normalize consecutive newlines
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts edited text back to clean, rich HTML for database storage.
 * If user already provided HTML tags, preserves and validates them.
 */
export function editorTextToHtml(text: string | undefined | null): string {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();

  // If already full HTML with divs or paragraphs, preserve it
  if (/<div|<p\s|<br\s*\/?>/i.test(trimmed)) {
    return trimmed;
  }

  // Convert markdown bold **...** to <b>...</b>
  let html = trimmed
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.*?)\*/g, '<i>$1</i>');

  // Split by double newline into paragraph divs
  const paragraphs = html.split(/\n\s*\n/);
  const formattedParagraphs = paragraphs.map(p => {
    const lines = p.split('\n').map(l => l.trim()).filter(Boolean);
    return `<div>${lines.join('<br>')}</div>`;
  });

  return formattedParagraphs.join('<div><br></div>');
}
