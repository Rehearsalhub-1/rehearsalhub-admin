import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface LyricsFormattingToolbarProps {
  value: string;
  onChangeText: (next: string) => void;
  selection?: { start: number; end: number };
}

export default function LyricsFormattingToolbar({
  value,
  onChangeText,
  selection,
}: LyricsFormattingToolbarProps) {
  // Keep last known selection in a ref — React Native clears selection
  // before the button's onPress fires, so we capture it here.
  const selectionRef = useRef<{ start: number; end: number } | null>(null);
  if (selection && selection.end > selection.start) {
    selectionRef.current = selection;
  }

  const applyFormat = (type: 'bold' | 'italic' | 'verse' | 'chorus' | 'bridge' | 'vamp') => {
    const current = value || '';
    // Use saved selection if available, otherwise insert at end of text
    const sel = selectionRef.current;
    const start = sel ? Math.min(sel.start, current.length) : current.length;
    const end = sel ? Math.min(sel.end, current.length) : current.length;
    const hasSelection = end > start;
    const selectedText = hasSelection ? current.slice(start, end) : '';

    let replacement = '';

    switch (type) {
      case 'bold': {
        if (!hasSelection) {
          replacement = '**Bold text**';
        } else {
          const leadingSpace = selectedText.match(/^\s*/)?.[0] || '';
          const trailingSpace = selectedText.match(/\s*$/)?.[0] || '';
          const core = selectedText.slice(leadingSpace.length, selectedText.length - trailingSpace.length);
          if (!core) {
            replacement = selectedText;
          } else if (core.startsWith('**') && core.endsWith('**') && core.length >= 4) {
            // Toggle OFF bold (unwrap)
            replacement = `${leadingSpace}${core.slice(2, -2)}${trailingSpace}`;
          } else {
            // Format line-by-line so bold never spans across newlines
            const formatted = core.split('\n').map(line => {
              const lTrim = line.trim();
              if (!lTrim) return line;
              if (lTrim.startsWith('**') && lTrim.endsWith('**') && lTrim.length >= 4) {
                return line.replace(lTrim, lTrim.slice(2, -2));
              }
              return line.replace(lTrim, `**${lTrim}**`);
            }).join('\n');
            replacement = `${leadingSpace}${formatted}${trailingSpace}`;
          }
        }
        break;
      }
      case 'italic': {
        if (!hasSelection) {
          replacement = '*Italic text*';
        } else {
          const leadingSpace = selectedText.match(/^\s*/)?.[0] || '';
          const trailingSpace = selectedText.match(/\s*$/)?.[0] || '';
          const core = selectedText.slice(leadingSpace.length, selectedText.length - trailingSpace.length);
          if (!core) {
            replacement = selectedText;
          } else if (core.startsWith('*') && core.endsWith('*') && !core.startsWith('**') && core.length >= 2) {
            // Toggle OFF italic (unwrap)
            replacement = `${leadingSpace}${core.slice(1, -1)}${trailingSpace}`;
          } else {
            const formatted = core.split('\n').map(line => {
              const lTrim = line.trim();
              if (!lTrim) return line;
              if (lTrim.startsWith('*') && lTrim.endsWith('*') && !lTrim.startsWith('**') && lTrim.length >= 2) {
                return line.replace(lTrim, lTrim.slice(1, -1));
              }
              return line.replace(lTrim, `*${lTrim}*`);
            }).join('\n');
            replacement = `${leadingSpace}${formatted}${trailingSpace}`;
          }
        }
        break;
      }
      case 'verse': {
        const needsNewlineBefore = start > 0 && current[start - 1] !== '\n';
        const prefix = needsNewlineBefore ? '\n\n' : (start > 0 ? '\n' : '');
        replacement = `${prefix}**[Verse 1]**\n`;
        break;
      }
      case 'chorus': {
        const needsNewlineBefore = start > 0 && current[start - 1] !== '\n';
        const prefix = needsNewlineBefore ? '\n\n' : (start > 0 ? '\n' : '');
        replacement = `${prefix}**[Chorus]**\n`;
        break;
      }
      case 'bridge': {
        const needsNewlineBefore = start > 0 && current[start - 1] !== '\n';
        const prefix = needsNewlineBefore ? '\n\n' : (start > 0 ? '\n' : '');
        replacement = `${prefix}**[Bridge]**\n`;
        break;
      }
      case 'vamp': {
        const needsNewlineBefore = start > 0 && current[start - 1] !== '\n';
        const prefix = needsNewlineBefore ? '\n\n' : (start > 0 ? '\n' : '');
        replacement = `${prefix}**[Vamp]**\n`;
        break;
      }
    }

    const nextText = current.slice(0, start) + replacement + current.slice(end);
    selectionRef.current = null; // reset after applying so next tap doesn't reuse stale position
    onChangeText(nextText);
  };

  return (
    <View style={styles.container}>
      <View style={styles.labelGroup}>
        <Ionicons name="text-outline" size={13} color="#64748b" style={{ marginRight: 4 }} />
        <Text style={styles.labelText}>FORMAT</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Bold Button */}
        <TouchableOpacity
          style={styles.formatBtn}
          onPressIn={() => applyFormat('bold')}
          activeOpacity={0.7}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.boldBtnText}>B</Text>
        </TouchableOpacity>

        {/* Italic Button */}
        <TouchableOpacity
          style={styles.formatBtn}
          onPressIn={() => applyFormat('italic')}
          activeOpacity={0.7}
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.italicBtnText}>I</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        {/* Section Tags */}
        <TouchableOpacity
          style={styles.chipBtn}
          onPressIn={() => applyFormat('verse')}
          activeOpacity={0.75}
        >
          <Text style={styles.chipBtnText}>+ Verse</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chipBtn}
          onPressIn={() => applyFormat('chorus')}
          activeOpacity={0.75}
        >
          <Text style={styles.chipBtnText}>+ Chorus</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chipBtn}
          onPressIn={() => applyFormat('bridge')}
          activeOpacity={0.75}
        >
          <Text style={styles.chipBtnText}>+ Bridge</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.chipBtn}
          onPressIn={() => applyFormat('vamp')}
          activeOpacity={0.75}
        >
          <Text style={styles.chipBtnText}>+ Vamp</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
    borderRightWidth: 1,
    borderRightColor: '#cbd5e1',
    paddingRight: 8,
  },
  labelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.5,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formatBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 1,
    elevation: 1,
  },
  boldBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0f172a',
  },
  italicBtnText: {
    fontSize: 14,
    fontWeight: '700',
    fontStyle: 'italic',
    color: '#0f172a',
    fontFamily: 'serif',
  },
  separator: {
    width: 1,
    height: 18,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 2,
  },
  chipBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
});
