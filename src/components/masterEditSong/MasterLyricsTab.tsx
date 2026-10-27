import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LyricsFormattingToolbar from '../LyricsFormattingToolbar';
import { styles } from './masterEditSongStyles';

interface MasterLyricsTabProps {
  lyrics: string;
  setLyrics: (val: string) => void;
  lyricsSelection: { start: number; end: number };
  setLyricsSelection: (val: { start: number; end: number }) => void;
  solfa: string;
  setSolfa: (val: string) => void;
  history: string;
  setHistory: (val: string) => void;
  onOpenHistory?: () => void;
  historyCount?: number;
}

export default function MasterLyricsTab({
  lyrics,
  setLyrics,
  lyricsSelection,
  setLyricsSelection,
  solfa,
  setSolfa,
  history,
  setHistory,
  onOpenHistory,
  historyCount,
}: MasterLyricsTabProps) {
  const lyricsCharCount = lyrics.length;
  const lyricsLines = lyrics ? lyrics.split('\n').length : 0;

  return (
    <View style={styles.tabSection}>
      {/* ── 1. Lyrics ────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderWithIcon}>
          <View style={styles.cardIconBadge}>
            <Ionicons name="document-text" size={17} color="#7c3aed" />
          </View>
          <View style={styles.cardHeaderTitles}>
            <Text style={styles.cardSectionTitle}>Lyrics</Text>
          </View>
          {lyricsCharCount > 0 && (
            <Text style={styles.charCountText}>
              {lyricsLines} lines • {lyricsCharCount} chars
            </Text>
          )}
        </View>

        <LyricsFormattingToolbar
          value={lyrics}
          onChangeText={setLyrics}
          selection={lyricsSelection}
        />
        <TextInput
          style={styles.multilineInput}
          placeholder="Song lyrics..."
          placeholderTextColor="#94a3b8"
          value={lyrics}
          onChangeText={setLyrics}
          onSelectionChange={e => setLyricsSelection(e.nativeEvent.selection)}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
        />
      </View>

      {/* ── 2. Tonic Solfa ──────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderWithIcon}>
          <View style={[styles.cardIconBadge, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
            <Ionicons name="musical-notes" size={17} color="#16a34a" />
          </View>
          <View style={styles.cardHeaderTitles}>
            <Text style={styles.cardSectionTitle}>Tonic Solfa</Text>
          </View>
        </View>

        <TextInput
          style={styles.multilineInput}
          placeholder="Solfa notes (e.g. d:r:m | f:s:l)..."
          placeholderTextColor="#94a3b8"
          value={solfa}
          onChangeText={setSolfa}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
        />
      </View>

      {/* ── 3. Background Notes & History ────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderWithIcon}>
          <View style={[styles.cardIconBadge, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
            <Ionicons name="time-outline" size={17} color="#2563eb" />
          </View>
          <View style={styles.cardHeaderTitles}>
            <Text style={styles.cardSectionTitle}>Background Notes</Text>
          </View>
          {history.length > 0 && (
            <Text style={styles.charCountText}>
              {history.length} chars
            </Text>
          )}
        </View>

        <TextInput
          style={[styles.multilineInput, { minHeight: 110 }]}
          placeholder="Inspiration, program dates, composer notes..."
          placeholderTextColor="#94a3b8"
          value={history}
          onChangeText={setHistory}
          multiline
          scrollEnabled={false}
          textAlignVertical="top"
        />

        {onOpenHistory && (
          <TouchableOpacity
            style={styles.historyActionBtn}
            onPress={onOpenHistory}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="time" size={16} color="#6366f1" />
              <Text style={styles.historyActionBtnText}>Revision History</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.historyCountPill}>
                <Text style={styles.historyCountPillText}>{historyCount || 0}</Text>
              </View>
              <Ionicons name="chevron-forward" size={14} color="#64748b" />
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
