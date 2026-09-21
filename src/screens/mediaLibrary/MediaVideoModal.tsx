import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { MediaItem } from './types';
import { styles } from './mediaLibraryStyles';

function InAppVideoViewer({ item }: { item: MediaItem }) {
  const videoSource = item.url || item.videoUrl || '';
  const player = useVideoPlayer(videoSource, p => {
    p.play();
  });

  return (
    <VideoView
      style={styles.nativeVideo}
      player={player}
      nativeControls={true}
      contentFit="contain"
    />
  );
}

interface MediaVideoModalProps {
  activeVideoItem: MediaItem | null;
  onClose: () => void;
}

export default function MediaVideoModal({
  activeVideoItem,
  onClose,
}: MediaVideoModalProps) {
  return (
    <Modal
      visible={!!activeVideoItem}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.videoPlayerBackdrop}>
        <SafeAreaView style={styles.videoPlayerSafeArea}>
          <View style={styles.videoPlayerHeader}>
            <Text style={styles.videoPlayerTitle} numberOfLines={1}>
              {activeVideoItem?.name || 'Rehearsal Video'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.videoCloseBtn}>
              <Ionicons name="close" size={22} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.videoWrapper}>
            {activeVideoItem?.url ? (
              <InAppVideoViewer item={activeVideoItem} />
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
