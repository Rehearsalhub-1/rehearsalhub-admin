import React from 'react';
import { View, Text, TextInput } from 'react-native';
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
}: MasterLyricsTabProps) {
  const lyricsCharCount = lyrics.length;
  const lyricsLines = lyrics ? lyrics.split('\n').length : 0;

  return (
    <View style={styles.tabSection}>
      {/* ── 1. Official Song Lyrics ────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderWithIcon}>
          <View style={styles.cardIconBadge}>
            <Ionicons name="document-text" size={17} color="#7c3aed" />
          </View>
          <View style={styles.cardHeaderTitles}>
            <Text style={styles.cardSectionTitle}>Official Song Lyrics</Text>
            <Text style={styles.cardHeaderSubtitle}>
              Song text for prompters, mobile lyrics & choir presentation
            </Text>
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
          placeholder="Enter full song lyrics with verses, chorus, and bridge..."
          placeholderTextColor="#94a3b8"
          value={lyrics}
          onChangeText={setLyrics}
          onSelectionChange={e => setLyricsSelection(e.nativeEvent.selection)}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* ── 2. Tonic Solfa & Conductor Guide ──────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderWithIcon}>
          <View style={[styles.cardIconBadge, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
            <Ionicons name="musical-notes" size={17} color="#16a34a" />
          </View>
          <View style={styles.cardHeaderTitles}>
            <Text style={styles.cardSectionTitle}>Conductor Guide & Tonic Solfa</Text>
            <Text style={styles.cardHeaderSubtitle}>
              Vocal solfa (d:r:m | f:s:l), cue marks, and score notes
            </Text>
          </View>
        </View>

        <TextInput
          style={styles.multilineInput}
          placeholder="Enter tonic solfa (e.g. d:r:m | f:s:l) and vocal cues..."
          placeholderTextColor="#94a3b8"
          value={solfa}
          onChangeText={setSolfa}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* ── 3. Ministered Background & History ────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.cardHeaderWithIcon}>
          <View style={[styles.cardIconBadge, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
            <Ionicons name="time-outline" size={17} color="#2563eb" />
          </View>
          <View style={styles.cardHeaderTitles}>
            <Text style={styles.cardSectionTitle}>Ministry Background & Inspiration</Text>
            <Text style={styles.cardHeaderSubtitle}>
              Origin notes, Praise Night dates, or composer instructions
            </Text>
          </View>
        </View>

        <TextInput
          style={[styles.multilineInput, { height: 110 }]}
          placeholder="Notes on the inspiration, ministered program dates, or special rehearsal pointers..."
          placeholderTextColor="#94a3b8"
          value={history}
          onChangeText={setHistory}
          multiline
          textAlignVertical="top"
        />
      </View>
    </View>
  );
}
