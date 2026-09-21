import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './editSongStyles';

export interface SongMusicDetailsCardProps {
  isMedium: boolean;
  songKey: string;
  setSongKey: (val: string) => void;
  songTempo: string;
  setSongTempo: (val: string) => void;
  rehearsalCount: number;
  setRehearsalCount: (val: number) => void;
  songAudioFile: string;
  setSongAudioFile: (val: string) => void;
  playingAudioUrl: string | null;
  audioLoading: boolean;
  handleTogglePlay: (url: string) => void;
  handleOpenMediaSelector: (target: string, type: 'audio' | 'image') => void;
  handleAddHistory: (type: string) => void;
}

export default function SongMusicDetailsCard({
  isMedium,
  songKey,
  setSongKey,
  songTempo,
  setSongTempo,
  rehearsalCount,
  setRehearsalCount,
  songAudioFile,
  setSongAudioFile,
  playingAudioUrl,
  audioLoading,
  handleTogglePlay,
  handleOpenMediaSelector,
  handleAddHistory,
}: SongMusicDetailsCardProps) {
  return (
    <View style={styles.cardSlate}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardHeaderTitle}>Music Details</Text>
        <TouchableOpacity
          style={styles.addHistoryBtn}
          onPress={() => handleAddHistory('music-details')}
        >
          <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
          <Text style={styles.addHistoryBtnText}>Add History</Text>
        </TouchableOpacity>
      </View>

      {isMedium ? (
        <View style={styles.threeColRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Key</Text>
            <TextInput
              style={styles.inputPrimary}
              value={songKey}
              onChangeText={setSongKey}
              placeholder="e.g., C, G, F#"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Tempo</Text>
            <TextInput
              style={styles.inputPrimary}
              value={songTempo}
              onChangeText={setSongTempo}
              placeholder="e.g., 120 BPM"
              placeholderTextColor="#94a3b8"
            />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>Rehearsal Count</Text>
            <TextInput
              style={styles.inputPrimary}
              value={String(rehearsalCount)}
              onChangeText={t => setRehearsalCount(parseInt(t, 10) || 0)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>
      ) : (
        <View>
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Key</Text>
              <TextInput
                style={styles.inputPrimary}
                value={songKey}
                onChangeText={setSongKey}
                placeholder="e.g., C, G, F#"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Tempo</Text>
              <TextInput
                style={styles.inputPrimary}
                value={songTempo}
                onChangeText={setSongTempo}
                placeholder="e.g., 120 BPM"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Rehearsal Count</Text>
            <TextInput
              style={styles.inputPrimary}
              value={String(rehearsalCount)}
              onChangeText={t => setRehearsalCount(parseInt(t, 10) || 0)}
              keyboardType="number-pad"
              placeholder="0"
              placeholderTextColor="#94a3b8"
            />
          </View>
        </View>
      )}

      {/* Master Audio Track Section */}
      <View style={[styles.fieldGroup, { marginTop: 16 }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.fieldLabel}>Audio File</Text>
          <TouchableOpacity
            style={styles.addHistoryBtn}
            onPress={() => handleAddHistory('audio')}
          >
            <Ionicons name="time-outline" size={12} color="#475569" style={{ marginRight: 4 }} />
            <Text style={styles.addHistoryBtnText}>Add History</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.browseMediaPrimaryBtn}
          onPress={() => handleOpenMediaSelector('mainAudio', 'audio')}
          activeOpacity={0.85}
        >
          <Ionicons name="folder-open-outline" size={16} color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.browseMediaPrimaryBtnText}>Browse Media Library</Text>
        </TouchableOpacity>

        {songAudioFile ? (
          <View style={styles.audioFilePlayerBox}>
            <View style={styles.audioFileMetaRow}>
              <View style={styles.audioDotPurple} />
              <Text style={styles.audioFileName} numberOfLines={1}>
                {songAudioFile.split('/').pop() || 'Full Audio Track'}
              </Text>
              <TouchableOpacity
                onPress={() => setSongAudioFile('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>

            <Text style={styles.audioFileSizeText}>(From Media Library)</Text>

            <View style={styles.inlinePlayerBar}>
              <TouchableOpacity
                style={[styles.miniPlayBtn, playingAudioUrl === songAudioFile && styles.miniPlayBtnActive]}
                onPress={() => handleTogglePlay(songAudioFile)}
              >
                {audioLoading && playingAudioUrl === songAudioFile ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Ionicons
                    name={playingAudioUrl === songAudioFile ? 'pause' : 'play'}
                    size={14}
                    color={playingAudioUrl === songAudioFile ? '#ffffff' : '#7c3aed'}
                  />
                )}
                <Text style={[styles.miniPlayBtnText, playingAudioUrl === songAudioFile && styles.miniPlayBtnTextActive]}>
                  {playingAudioUrl === songAudioFile ? 'Pause Master Track' : 'Preview Master Track'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}
