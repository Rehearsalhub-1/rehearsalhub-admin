import React from 'react';
import { View, Text, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from './types';
import { styles } from './mediaLibraryStyles';
import { formatTime } from './mediaLibraryUtils';

interface MediaFullAudioModalProps {
  visible: boolean;
  activeAudioItem: MediaItem | null;
  playbackPos: number;
  playbackDur: number;
  isPlaying: boolean;
  isBuffering: boolean;
  onClose: () => void;
  onShare: (item: MediaItem) => void;
  onSeekRelative: (ms: number) => void;
  onTogglePlay: (item: MediaItem) => void;
}

export default function MediaFullAudioModal({
  visible,
  activeAudioItem,
  playbackPos,
  playbackDur,
  isPlaying,
  isBuffering,
  onClose,
  onShare,
  onSeekRelative,
  onTogglePlay,
}: MediaFullAudioModalProps) {
  if (!activeAudioItem) return null;

  return (
    <Modal
      visible={visible && !!activeAudioItem}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.fullPlayerOverlay}>
        <View style={styles.fullPlayerSheet}>
          <View style={styles.sheetHandle} />

          <View style={styles.fullPlayerHeader}>
            <TouchableOpacity onPress={onClose} style={styles.closeCircleBtn}>
              <Ionicons name="chevron-down" size={22} color="#475569" />
            </TouchableOpacity>
            <Text style={styles.fullPlayerHeaderTitle}>AudioLab In-App Player</Text>
            <TouchableOpacity
              onPress={() => activeAudioItem && onShare(activeAudioItem)}
              style={styles.closeCircleBtn}
            >
              <Ionicons name="share-outline" size={18} color="#475569" />
            </TouchableOpacity>
          </View>

          <View style={styles.fullPlayerBody}>
            <View style={styles.fullPlayerArt}>
              <Ionicons name="musical-notes" size={54} color="#7c3aed" />
            </View>

            <Text style={styles.fullPlayerTitle} numberOfLines={2}>
              {activeAudioItem.name}
            </Text>
            <Text style={styles.fullPlayerSubtitle}>
              {activeAudioItem.forHq ? '⭐ Global HQ Stem' : '📍 Zonal Repertoire Stem'}
            </Text>

            {/* Scrubber Progress */}
            <View style={styles.scrubberContainer}>
              <View style={styles.scrubberTrack}>
                <View
                  style={[
                    styles.scrubberFill,
                    {
                      width:
                        playbackDur > 0
                          ? `${Math.min(100, (playbackPos / playbackDur) * 100)}%`
                          : '0%',
                    },
                  ]}
                />
              </View>
              <View style={styles.scrubberTimeRow}>
                <Text style={styles.scrubberTimeText}>{formatTime(playbackPos)}</Text>
                <Text style={styles.scrubberTimeText}>{formatTime(playbackDur)}</Text>
              </View>
            </View>

            {/* Controls */}
            <View style={styles.fullControlsRow}>
              <TouchableOpacity
                style={styles.controlSecBtn}
                onPress={() => onSeekRelative(-10000)}
                activeOpacity={0.75}
              >
                <Ionicons name="play-back" size={24} color="#475569" />
                <Text style={styles.secBtnLabel}>-10s</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlPrimaryPlayBtn}
                onPress={() => onTogglePlay(activeAudioItem)}
                activeOpacity={0.85}
              >
                {isBuffering ? (
                  <ActivityIndicator size="large" color="#ffffff" />
                ) : (
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={32}
                    color="#ffffff"
                    style={!isPlaying ? { marginLeft: 3 } : undefined}
                  />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlSecBtn}
                onPress={() => onSeekRelative(10000)}
                activeOpacity={0.75}
              >
                <Ionicons name="play-forward" size={24} color="#475569" />
                <Text style={styles.secBtnLabel}>+10s</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
