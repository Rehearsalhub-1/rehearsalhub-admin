import React from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from './types';
import { styles } from './mediaLibraryStyles';
import { formatTime } from './mediaLibraryUtils';

interface MediaMiniPlayerProps {
  activeAudioItem: MediaItem;
  playbackPos: number;
  playbackDur: number;
  isPlaying: boolean;
  isBuffering: boolean;
  onOpenFullPlayer: () => void;
  onSeekRelative: (ms: number) => void;
  onTogglePlay: (item: MediaItem) => void;
  onClose: () => void;
}

export default function MediaMiniPlayer({
  activeAudioItem,
  playbackPos,
  playbackDur,
  isPlaying,
  isBuffering,
  onOpenFullPlayer,
  onSeekRelative,
  onTogglePlay,
  onClose,
}: MediaMiniPlayerProps) {
  return (
    <TouchableOpacity
      style={styles.floatingMiniPlayer}
      activeOpacity={0.92}
      onPress={onOpenFullPlayer}
    >
      {/* Top Progress Bar */}
      <View style={styles.miniProgressTrack}>
        <View
          style={[
            styles.miniProgressFill,
            {
              width:
                playbackDur > 0
                  ? `${Math.min(100, (playbackPos / playbackDur) * 100)}%`
                  : '0%',
            },
          ]}
        />
      </View>

      <View style={styles.miniPlayerContent}>
        <View style={styles.miniThumb}>
          <Ionicons name="musical-note" size={18} color="#7c3aed" />
        </View>

        <View style={styles.miniDetails}>
          <Text style={styles.miniTitle} numberOfLines={1}>
            {activeAudioItem.name}
          </Text>
          <Text style={styles.miniTime}>
            {formatTime(playbackPos)} / {formatTime(playbackDur || 0)}
          </Text>
        </View>

        <View style={styles.miniControls}>
          <TouchableOpacity
            style={styles.miniSkipBtn}
            onPress={(e) => {
              e.stopPropagation();
              onSeekRelative(-10000);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="play-back" size={17} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.miniPlayBtn}
            onPress={(e) => {
              e.stopPropagation();
              onTogglePlay(activeAudioItem);
            }}
          >
            {isBuffering ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Ionicons
                name={isPlaying ? 'pause' : 'play'}
                size={16}
                color="#ffffff"
                style={!isPlaying ? { marginLeft: 2 } : undefined}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.miniSkipBtn}
            onPress={(e) => {
              e.stopPropagation();
              onSeekRelative(10000);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="play-forward" size={17} color="#475569" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.miniCloseBtn}
            onPress={(e) => {
              e.stopPropagation();
              onClose();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
