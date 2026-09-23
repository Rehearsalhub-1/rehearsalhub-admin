/**
 * Utilities for formatting and converting song lyrics between rich HTML and human-editable text.
 */

/**
 * Converts rich HTML from database into clean, editable text with markdown bold markers (**bold**).
 */
export function htmlToEditorText(raw: string | undefined | null): string {
  if (!raw) return '';

  // If the text is already plain (no HTML tags), return as-is to avoid double-processing.
  // This handles the case where the DB somehow stores plain text or markdown.
  if (!/<[a-z]/i.test(raw)) return raw.trim();

  return raw
    // Convert bold tags to markdown BEFORE stripping tags.
    // Use non-greedy match but avoid crossing tag boundaries with [^<]*
    .replace(/<b[^>]*>([^<]*)<\/b>/gi, '**$1**')
    .replace(/<strong[^>]*>([^<]*)<\/strong>/gi, '**$1**')
    .replace(/<i[^>]*>([^<]*)<\/i>/gi, '*$1*')
    .replace(/<em[^>]*>([^<]*)<\/em>/gi, '*$1*')
    // div blocks → content + newline
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
    // normalize line endings and collapse 3+ newlines to 2
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Converts edited text back to clean, rich HTML for database storage.
 */
export function editorTextToHtml(text: string | undefined | null): string {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();

  // If text is already fully-formed HTML (has structural tags like div/p/br),
  // AND contains no markdown markers, preserve it as-is.
  // This avoids double-processing when the content is already valid HTML.
  const hasStructuralHtml = /<div|<p[\s>]|<br\s*\/?>/i.test(trimmed);
  const hasMarkdown = /\*\*.*?\*\*|\*.*?\*/.test(trimmed);

  if (hasStructuralHtml && !hasMarkdown) {
    return trimmed;
  }

  // Convert markdown markers to HTML tags first
  // Bold MUST run before italic. Use negative lookahead/lookbehind to prevent
  // italic regex from accidentally matching the * inside ** markers.
  let html = trimmed
    .replace(/\*\*([\s\S]*?)\*\*/g, '<b>$1</b>')
    .replace(/(?<!\*)\*(?!\*)([\s\S]*?)(?<!\*)\*(?!\*)/g, '<i>$1</i>');

  // Split by double newline into paragraph divs, preserving single newlines as <br>
  const paragraphs = html.split(/\n\n+/);
  const formattedParagraphs = paragraphs.map(p => {
    // Preserve blank/empty paragraphs as spacer divs
    if (!p.trim()) return '<div><br></div>';
    const lines = p.split('\n');
    return `<div>${lines.join('<br>')}</div>`;
  });

  return formattedParagraphs.join('');
}
