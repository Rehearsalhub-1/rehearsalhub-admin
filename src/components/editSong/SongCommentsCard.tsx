import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './editSongStyles';

export interface SongCommentsCardProps {
  coordinatorComment: string;
  setCoordinatorComment: (val: string) => void;
  coordinatorAudioUrl: string;
  setCoordinatorAudioUrl: (val: string) => void;
  playingAudioUrl: string | null;
  handleTogglePlay: (url: string) => void;
  handleOpenMediaSelector: (target: string, type: 'audio' | 'image') => void;
  handleAddHistory: (type: string) => void;
}

export default function SongCommentsCard({
  coordinatorComment,
  setCoordinatorComment,
  coordinatorAudioUrl,
  setCoordinatorAudioUrl,
  playingAudioUrl,
  handleTogglePlay,
  handleOpenMediaSelector,
  handleAddHistory,
}: SongCommentsCardProps) {
  return (
    <View style={styles.cardWhiteWithHeader}>
      <View style={styles.cardWhiteHeaderBar}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={[styles.dotMarker, { backgroundColor: '#8b5cf6' }]} />
          <Text style={styles.cardHeaderTitle}>Coordinator Comment</Text>
        </View>
        <TouchableOpacity
          style={styles.addHistoryBtn}
          onPress={() => handleAddHistory('comments')}
        >
          <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
          <Text style={styles.addHistoryBtnText}>Save Version</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cardWhiteBody}>
        <View style={styles.helperBanner}>
          <Text style={styles.helperBannerText}>
            Basic rich text - Bold and Italic supported
          </Text>
        </View>

        <TextInput
          style={[styles.inputPrimary, styles.multilineEditor]}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={coordinatorComment}
          onChangeText={setCoordinatorComment}
          placeholder="Add your notes or instructions for the team here..."
          placeholderTextColor="#94a3b8"
        />

        {/* Voice Note Section */}
        <View style={{ marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
          <Text style={styles.subFieldUppercase}>Audio Comment / Voice Note</Text>

          {coordinatorAudioUrl ? (
            <View style={styles.voiceNoteCard}>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.miniPlayBtn, playingAudioUrl === coordinatorAudioUrl && styles.miniPlayBtnActive]}
                  onPress={() => handleTogglePlay(coordinatorAudioUrl)}
                >
                  <Ionicons
                    name={playingAudioUrl === coordinatorAudioUrl ? 'pause' : 'mic'}
                    size={14}
                    color={playingAudioUrl === coordinatorAudioUrl ? '#ffffff' : '#7c3aed'}
                  />
                </TouchableOpacity>
                <Text style={styles.voiceNoteTitle} numberOfLines={1}>
                  {coordinatorAudioUrl.split('/').pop() || 'Voice Directive'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setCoordinatorAudioUrl('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addVoiceNoteTouch}
              onPress={() => handleOpenMediaSelector('commentAudio', 'audio')}
            >
              <Ionicons name="mic-outline" size={16} color="#7c3aed" style={{ marginRight: 6 }} />
              <Text style={styles.addVoiceNoteTouchText}>Add Audio Comment / Voice Note</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
