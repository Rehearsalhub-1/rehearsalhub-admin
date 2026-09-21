import React from 'react';
import { View, Text, Modal, Image, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from './types';
import { styles } from './mediaLibraryStyles';

interface MediaImageLightboxProps {
  activeImageItem: MediaItem | null;
  onClose: () => void;
  onShare: (item: MediaItem) => void;
}

export default function MediaImageLightbox({
  activeImageItem,
  onClose,
  onShare,
}: MediaImageLightboxProps) {
  return (
    <Modal
      visible={!!activeImageItem}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.imageLightboxBackdrop}>
        <SafeAreaView style={styles.lightboxSafeArea}>
          <View style={styles.lightboxHeader}>
            <Text style={styles.lightboxTitle} numberOfLines={1}>
              {activeImageItem?.name || 'Rehearsal Photo'}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => activeImageItem && onShare(activeImageItem)}
                style={styles.lightboxActionBtn}
              >
                <Ionicons name="share-outline" size={20} color="#ffffff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={onClose} style={styles.lightboxActionBtn}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.lightboxImageContainer}>
            {activeImageItem?.url ? (
              <Image
                source={{ uri: activeImageItem.url }}
                style={styles.lightboxImage}
                resizeMode="contain"
              />
            ) : null}
          </View>

          {activeImageItem?.description ? (
            <View style={styles.lightboxFooter}>
              <Text style={styles.lightboxDesc}>{activeImageItem.description}</Text>
            </View>
          ) : null}
        </SafeAreaView>
      </View>
    </Modal>
  );
}
