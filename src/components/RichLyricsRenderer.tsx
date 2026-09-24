import React from 'react';
import { View, Text, StyleSheet, TextStyle, ViewStyle } from 'react-native';

interface RichLyricsRendererProps {
  content?: string | null;
  emptyText?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  isMono?: boolean;
}

/**
 * Cleanly decodes HTML entities.
 */
function decodeEntities(str: string): string {
  return str
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");
}

/**
 * Formats lyrics containing HTML or Markdown into structured React Native text elements.
 * Guarantees NO raw HTML tags are visible while preserving bolding and line breaks.
 */
export const RichLyricsRenderer: React.FC<RichLyricsRendererProps> = ({
  content,
  emptyText = 'No lyrics recorded.',
  style,
  textStyle,
  isMono = false,
}) => {
  if (!content || !content.trim()) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.emptyText, textStyle]}>{emptyText}</Text>
      </View>
    );
  }

  // Normalize newlines and convert block tags (<div>, <p>, <br>) to standard line breaks
  let normalized = content
    .replace(/\r\n/g, '\n')
    .replace(/<\/div>\s*<div>/gi, '\n')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n');

  normalized = decodeEntities(normalized);

  // Normalize glued section headers (e.g. **VERSE 1****You're or CHORUS(x2)****Lord)
  normalized = normalized.replace(
    /(^|\n)\s*(?:\*\*)?\s*(VERSE\s*\d*|CHORUS\s*\d*(?:\s*\(.*?\))?|BRIDGE|INTRO|OUTRO|VAMP|PRE-CHORUS\s*\d*|REFRAIN|PAN|CODA|\(x\d+\)|Solo:|All:|Duet:|Call:|Resp:)\s*(?:\*\*)?\s*(\*{2,4}|:)\s*([A-Za-z0-9"“'‘])/gi,
    '$1**$2**\n$4'
  );
  normalized = normalized.replace(/\*{4,}/g, '**');
  normalized = normalized.replace(/(\*\*[^\n*]+\*\*)\s*([A-Za-z0-9])/g, '$1\n$2');

  // Split into lines
  const rawLines = normalized.split('\n');

  // Parse inline tags (<b>, <strong>, <i>, <em>, **) for each line
  const parsedLines = rawLines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <Text key={`empty-${lineIdx}`} style={styles.emptyLine}>{'\n'}</Text>;
    }

    // Tokenize line by bold/italic tags and markdown
    // Matching <b>...</b>, <strong>...</strong>, <i>...</i>, <em...</em>, **...**, *...*
    const tokens: React.ReactNode[] = [];
    const regex = /(<b[^>]*>.*?<\/b>|<strong[^>]*>.*?<\/strong>|<i[^>]*>.*?<\/i>|<em[^>]*>.*?<\/em>|\*\*.*?\*\*|\*[^*\n]+\*)/gi;

    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        let plainText = line.substring(lastIndex, match.index).replace(/<[^>]+>/g, '');
        if (plainText) {
          // Preserve trailing space at boundary with styled text
          if (plainText.endsWith(' ')) plainText = plainText.slice(0, -1) + '\u00A0';
          tokens.push(<Text key={`t-${lineIdx}-${lastIndex}`}>{plainText}</Text>);
        }
      }

      const matchStr = match[0];
      const isItalic = /^<i|^<em|^\*[^*]/i.test(matchStr);
      let innerText = matchStr
        .replace(/<[^>]+>/g, '')
        .replace(/\*\*/g, '')
        .replace(/^\*|\*$/g, '');

      if (innerText.startsWith(' ')) innerText = '\u00A0' + innerText.slice(1);
      if (innerText.endsWith(' ')) innerText = innerText.slice(0, -1) + '\u00A0';

      if (isItalic) {
        tokens.push(
          <Text key={`i-${lineIdx}-${match.index}`} style={styles.italicText}>
            {innerText}
          </Text>
        );
      } else {
        // Bold / strong
        tokens.push(
          <Text key={`b-${lineIdx}-${match.index}`} style={styles.boldHeader}>
            {innerText}
          </Text>
        );
      }

      lastIndex = match.index + matchStr.length;
    }

    if (lastIndex < line.length) {
      let remaining = line.substring(lastIndex).replace(/<[^>]+>/g, '');
      if (remaining) {
        if (remaining.startsWith(' ')) remaining = '\u00A0' + remaining.slice(1);
        tokens.push(<Text key={`t-${lineIdx}-${lastIndex}`}>{remaining}</Text>);
      }
    }

    // Header line detection if whole line is e.g. VERSE 1, CHORUS, BRIDGE
    const isSectionHeader = /^(VERSE|CHORUS|BRIDGE|OUTRO|INTRO|HOOK|VAMP|PRE-CHORUS|REFRAIN|INTERLUDE|SOLO|ALL)(\s*\d*|\s*\(.*?\))?:?$/i.test(
      trimmed.replace(/<[^>]+>/g, '').replace(/\*\*/g, '')
    );

    return (
      <Text
        key={`line-${lineIdx}`}
        style={[
          styles.lineText,
          isMono && styles.monoText,
          textStyle,
          isSectionHeader && styles.sectionHeaderLine,
        ]}
      >
        {tokens.length > 0 ? tokens : trimmed.replace(/<[^>]+>/g, '')}
      </Text>
    );
  });

  return (
    <View style={[styles.container, style]}>
      {parsedLines}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 4,
  },
  lineText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#0f172a',
    marginBottom: 3,
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 22,
    color: '#334155',
  },
  boldHeader: {
    fontWeight: '800',
    color: '#1e293b',
  },
  italicText: {
    fontStyle: 'italic',
  },
  sectionHeaderLine: {
    fontWeight: '800',
    color: '#2563eb',
    marginTop: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyLine: {
    fontSize: 8,
    lineHeight: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
    paddingVertical: 12,
  },
});
