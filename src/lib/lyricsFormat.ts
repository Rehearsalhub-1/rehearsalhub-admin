/**
 * Utilities for formatting and converting song lyrics between rich HTML and human-editable text.
 */

/**
 * Normalizes and heals lyrics markdown, repairing scattered headers, excessive asterisks,
 * and glued section markers like **VERSE 1****You’re the King of glory or CHORUS(x2)****Lord.
 * Preserves all blank lines and intentional section spacing.
 */
export function normalizeLyricsMarkdown(text: string): string {
  if (!text) return '';
  let res = text.replace(/\r\n/g, '\n');

  // 1. Separate section headers glued to lyrics lines on the SAME line
  // Use [ \t]* so we NEVER consume or collapse newlines before section headers!
  res = res.replace(
    /(^|\n)[ \t]*(?:\*\*)?[ \t]*(VERSE\s*\d*|CHORUS\s*\d*(?:\s*\(.*?\))?|BRIDGE|INTRO|OUTRO|VAMP|PRE-CHORUS\s*\d*|REFRAIN|PAN|CODA|\(x\d+\)|Solo:|All:|Duet:|Call:|Resp:)[ \t]*(?:\*\*)?[ \t]*(\*{2,4}|:)[ \t]*([A-Za-z0-9"“'‘])/gi,
    '$1**$2**\n$4'
  );

  // 2. Collapse runaway asterisks (**** or ****** -> **)
  res = res.replace(/\*{4,}/g, '**');

  // 3. Ensure closing bold followed immediately by a word on the SAME line has a newline
  // Use [ \t]+ so we NEVER collapse blank lines or multi-newlines!
  res = res.replace(/(\*\*[^\n*]+\*\*)[ \t]+([A-Za-z0-9])/g, '$1\n$2');

  return res;
}

/**
 * Converts rich HTML from database into clean, editable text with markdown bold markers (**bold**).
 */
export function htmlToEditorText(raw: string | undefined | null): string {
  if (!raw) return '';

  // If the text is already plain (no HTML tags), return normalized as-is
  if (!/<[a-z]/i.test(raw)) return normalizeLyricsMarkdown(raw.trim());

  let text = raw.replace(/\r\n/g, '\n');

  // Convert empty/spacer divs or paragraphs (<div><br></div>, <p><br></p>, <div></div>)
  // to double newlines (\n\n) so section gaps are strictly preserved!
  text = text
    .replace(/<(div|p)[^>]*>\s*(?:<br\s*\/?>)?\s*<\/\1>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    // Convert bold tags to markdown line-by-line
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, (_, p1) => {
      const lines = p1.split('\n');
      return lines.map((l: string) => {
        const leading = l.match(/^\s*/)?.[0] || '';
        const trailing = l.match(/\s*$/)?.[0] || '';
        const core = l.trim();
        return core ? `${leading}**${core}**${trailing}` : l;
      }).join('\n');
    })
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, (_, p1) => {
      const lines = p1.split('\n');
      return lines.map((l: string) => {
        const leading = l.match(/^\s*/)?.[0] || '';
        const trailing = l.match(/\s*$/)?.[0] || '';
        const core = l.trim();
        return core ? `${leading}**${core}**${trailing}` : l;
      }).join('\n');
    })
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, (_, p1) => {
      const lines = p1.split('\n');
      return lines.map((l: string) => {
        const leading = l.match(/^\s*/)?.[0] || '';
        const trailing = l.match(/\s*$/)?.[0] || '';
        const core = l.trim();
        return core ? `${leading}*${core}*${trailing}` : l;
      }).join('\n');
    })
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, (_, p1) => {
      const lines = p1.split('\n');
      return lines.map((l: string) => {
        const leading = l.match(/^\s*/)?.[0] || '';
        const trailing = l.match(/\s*$/)?.[0] || '';
        const core = l.trim();
        return core ? `${leading}*${core}*${trailing}` : l;
      }).join('\n');
    })
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
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return normalizeLyricsMarkdown(text);
}

/**
 * Converts edited text back to clean, rich HTML for database storage.
 */
export function editorTextToHtml(text: string | undefined | null): string {
  if (!text || !text.trim()) return '';
  const trimmed = normalizeLyricsMarkdown(text.trim());

  // If text is already fully-formed HTML (has structural tags like div/p/br),
  // AND contains no markdown markers, preserve it as-is.
  const hasStructuralHtml = /<div|<p[\s>]|<br\s*\/?>/i.test(trimmed);
  const hasMarkdown = /\*\*.*?\*\*|\*.*?\*/.test(trimmed);

  if (hasStructuralHtml && !hasMarkdown) {
    return trimmed;
  }

  // Convert markdown markers to HTML tags.
  // Restrict bold to single line / within newline boundaries so bold NEVER
  // crosses paragraphs or swallows the entire rest of the song.
  let html = trimmed
    .replace(/\*\*([^*\n]+?)\*\*/g, (_, p1) => {
      const leading = p1.match(/^\s*/)?.[0] || '';
      const trailing = p1.match(/\s*$/)?.[0] || '';
      const core = p1.trim();
      return core ? `${leading}<b>${core}</b>${trailing}` : p1;
    })
    .replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, (_, p1) => {
      const leading = p1.match(/^\s*/)?.[0] || '';
      const trailing = p1.match(/\s*$/)?.[0] || '';
      const core = p1.trim();
      return core ? `${leading}<i>${core}</i>${trailing}` : p1;
    });

  // Split by blank lines (2 or more newlines) into stanzas/paragraphs
  const paragraphs = html.split(/\n\s*\n+/);
  const formattedParagraphs = paragraphs.map(p => {
    if (!p.trim()) return '';
    const lines = p.split('\n');
    return `<div>${lines.join('<br>')}</div>`;
  }).filter(Boolean);

  // Join paragraphs with spacer <div><br></div> to preserve spacing across ALL viewers/renderers!
  return formattedParagraphs.join('<div><br></div>');
}
