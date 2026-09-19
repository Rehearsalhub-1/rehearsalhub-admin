import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './editSongStyles';
import LyricsFormattingToolbar from '../LyricsFormattingToolbar';

export interface FullscreenLyricsModalProps {
  visible: boolean;
  songTitle: string;
  songLyrics: string;
  onLyricsChange: (lyrics: string) => void;
  lyricsSelection: { start: number; end: number };
  onSelectionChange: (selection: { start: number; end: number }) => void;
  onClose: () => void;
  insetsTop?: number;
  insetsBottom?: number;
}

export default function FullscreenLyricsModal({
  visible,
  songTitle,
  songLyrics,
  onLyricsChange,
  lyricsSelection,
  onSelectionChange,
  onClose,
  insetsTop = 0,
  insetsBottom = 0,
}: FullscreenLyricsModalProps) {
  const [fullscreenFontSize, setFullscreenFontSize] = useState(16);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <View style={[styles.fullscreenLyricsRoot, { paddingTop: insetsTop, paddingBottom: Math.max(insetsBottom, 16) }]}>
        {/* Header */}
        <View style={styles.fullscreenHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, marginRight: 12 }}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.fullscreenCloseBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color="#334155" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.fullscreenHeaderTitle} numberOfLines={1}>
                {songTitle || 'Song Lyrics'}
              </Text>
              <Text style={styles.fullscreenHeaderSub}>
                {songLyrics.split('\n').filter(Boolean).length} lines • {songLyrics.trim().split(/\s+/).filter(Boolean).length} words
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={styles.fontStepper}>
              <TouchableOpacity
                onPress={() => setFullscreenFontSize(prev => Math.max(12, prev - 1))}
                style={styles.fontStepBtn}
              >
                <Text style={styles.fontStepBtnText}>A-</Text>
              </TouchableOpacity>
              <Text style={styles.fontStepValue}>{fullscreenFontSize}</Text>
              <TouchableOpacity
                onPress={() => setFullscreenFontSize(prev => Math.min(26, prev + 1))}
                style={styles.fontStepBtn}
              >
                <Text style={styles.fontStepBtnText}>A+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={styles.fullscreenDoneBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="checkmark" size={15} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.fullscreenDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Toolbar */}
        <View style={styles.fullscreenToolbarWrap}>
          <LyricsFormattingToolbar
            value={songLyrics}
            onChangeText={onLyricsChange}
            selection={lyricsSelection}
          />
        </View>

        {/* Editor */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <TextInput
            style={[
              styles.fullscreenInput,
              {
                fontSize: fullscreenFontSize,
                lineHeight: Math.round(fullscreenFontSize * 1.55),
              },
            ]}
            multiline
            textAlignVertical="top"
            value={songLyrics}
            onChangeText={onLyricsChange}
            onSelectionChange={e => onSelectionChange(e.nativeEvent.selection)}
            placeholder="Type or paste complete song lyrics here..."
            placeholderTextColor="#94a3b8"
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
