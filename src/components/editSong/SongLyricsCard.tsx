import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LyricsFormattingToolbar from '../LyricsFormattingToolbar';
import { styles } from './editSongStyles';

export interface SongLyricsCardProps {
  activeTab: string;
  songLyrics: string;
  setSongLyrics: (val: string) => void;
  lyricsSelection: { start: number; end: number };
  setLyricsSelection: (val: { start: number; end: number }) => void;
  setShowFullscreenLyrics: (val: boolean) => void;
  handleAddHistory: (type: string) => void;
  songSolfas: string;
  setSongSolfas: (val: string) => void;
  songNotation: string;
  setSongNotation: (val: string) => void;
}

export default function SongLyricsCard({
  activeTab,
  songLyrics,
  setSongLyrics,
  lyricsSelection,
  setLyricsSelection,
  setShowFullscreenLyrics,
  handleAddHistory,
  songSolfas,
  setSongSolfas,
  songNotation,
  setSongNotation,
}: SongLyricsCardProps) {
  return (
    <>
      {/* Card 5: Song Lyrics */}
      <View style={styles.cardWhiteWithHeader}>
        <View style={styles.cardWhiteHeaderBar}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={[styles.dotMarker, { backgroundColor: '#3b82f6' }]} />
            <Text style={styles.cardHeaderTitle}>Song Lyrics</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <TouchableOpacity
              style={styles.fullscreenBtn}
              onPress={() => setShowFullscreenLyrics(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="scan-outline" size={13} color="#7c3aed" style={{ marginRight: 4 }} />
              <Text style={styles.fullscreenBtnText}>Full Screen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.addHistoryBtn}
              onPress={() => handleAddHistory('lyrics')}
            >
              <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.addHistoryBtnText}>History</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardWhiteBody}>
          <LyricsFormattingToolbar
            value={songLyrics}
            onChangeText={setSongLyrics}
            selection={lyricsSelection}
          />

          <TextInput
            style={[
              styles.inputPrimary,
              styles.multilineEditor,
              activeTab === 'lyrics' && styles.multilineEditorTabActive,
            ]}
            multiline
            numberOfLines={activeTab === 'lyrics' ? 18 : 8}
            textAlignVertical="top"
            value={songLyrics}
            onChangeText={setSongLyrics}
            onSelectionChange={e => setLyricsSelection(e.nativeEvent.selection)}
            placeholder={`Enter complete song lyrics here...\n\nExample:\nVerse 1:\n[Your verse lyrics here]\n\nChorus:\n[Your chorus lyrics here]`}
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* Card 6: Conductor's Guide & Solfa Notation */}
      <View style={{ gap: 16, marginTop: 16 }}>
        {/* Conductor's Guide Notation */}
        <View style={styles.cardWhiteWithHeader}>
          <View style={styles.cardWhiteHeaderBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.dotMarker, { backgroundColor: '#10b981' }]} />
              <Text style={styles.cardHeaderTitle}>Conductor's Guide Notation</Text>
            </View>
            <TouchableOpacity
              style={styles.addHistoryBtn}
              onPress={() => handleAddHistory('solfas')}
            >
              <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.addHistoryBtnText}>Add History</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardWhiteBody}>
            <View style={styles.helperBanner}>
              <Text style={styles.helperBannerText}>
                Rich text editor - Use the toolbar above to format your solfas
              </Text>
            </View>

            <TextInput
              style={[styles.inputPrimary, styles.multilineEditor, styles.fontMono]}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={songSolfas}
              onChangeText={setSongSolfas}
              placeholder={`Enter solfas notation here...\n\nExample:\nDo Re Mi Fa Sol La Ti Do\nDo Re Mi Fa Sol La Ti Do`}
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>

        {/* Solfa Notation */}
        <View style={styles.cardWhiteWithHeader}>
          <View style={styles.cardWhiteHeaderBar}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={[styles.dotMarker, { backgroundColor: '#f59e0b' }]} />
              <Text style={styles.cardHeaderTitle}>Solfa Notation</Text>
            </View>
            <TouchableOpacity
              style={styles.addHistoryBtn}
              onPress={() => handleAddHistory('notation')}
            >
              <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
              <Text style={styles.addHistoryBtnText}>Add History</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cardWhiteBody}>
            <View style={styles.helperBanner}>
              <Text style={styles.helperBannerText}>
                Rich text editor - Enter the primary Solfas notation here
              </Text>
            </View>

            <TextInput
              style={[styles.inputPrimary, styles.multilineEditor, styles.fontMono]}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              value={songNotation}
              onChangeText={setSongNotation}
              placeholder="Enter solfas notation (primary version) here..."
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>
      </View>
    </>
  );
}
