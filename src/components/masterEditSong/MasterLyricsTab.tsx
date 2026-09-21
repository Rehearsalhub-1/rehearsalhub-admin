import React from 'react';
import { View, Text, TextInput } from 'react-native';
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
  return (
    <View style={styles.tabSection}>
      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Official Song Lyrics</Text>
        <LyricsFormattingToolbar
          value={lyrics}
          onChangeText={setLyrics}
          selection={lyricsSelection}
        />
        <TextInput
          style={styles.multilineInput}
          placeholder="Enter full song lyrics with verses and chorus..."
          placeholderTextColor="#94a3b8"
          value={lyrics}
          onChangeText={setLyrics}
          onSelectionChange={e => setLyricsSelection(e.nativeEvent.selection)}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Conductor Guide & Tonic Solfa</Text>
        <TextInput
          style={styles.multilineInput}
          placeholder="Enter tonic solfa (e.g. d:r:m | f:s:l) and conductor cues..."
          placeholderTextColor="#94a3b8"
          value={solfa}
          onChangeText={setSolfa}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardSectionTitle}>Song History & Ministered Background</Text>
        <TextInput
          style={[styles.multilineInput, { height: 100 }]}
          placeholder="Notes on the inspiration, ministered program dates, or special instructions..."
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
