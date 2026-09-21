import React from 'react';
import { View, Text, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './mediaLibraryStyles';

interface MediaBulkProgressModalProps {
  visible: boolean;
  bulkProgress: { current: number; total: number; currentName: string };
}

export default function MediaBulkProgressModal({
  visible,
  bulkProgress,
}: MediaBulkProgressModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={() => {}}
    >
      <View style={styles.progressBackdrop}>
        <View style={styles.progressCard}>
          <View style={styles.progressIconCircle}>
            <Ionicons name="cloud-download" size={32} color="#7c3aed" />
          </View>
          <Text style={styles.progressTitle}>Bulk Downloading Media</Text>
          <Text style={styles.progressSubtitle}>
            Downloading {bulkProgress.current} of {bulkProgress.total} files...
          </Text>

          <Text style={styles.progressCurrentFile} numberOfLines={1}>
            {bulkProgress.currentName}
          </Text>

          {/* Progress Track */}
          <View style={styles.modalProgressTrack}>
            <View
              style={[
                styles.modalProgressFill,
                {
                  width:
                    bulkProgress.total > 0
                      ? `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}%`
                      : '10%',
                },
              ]}
            />
          </View>

          <Text style={styles.progressPercentText}>
            {bulkProgress.total > 0
              ? `${Math.round((bulkProgress.current / bulkProgress.total) * 100)}% Completed`
              : 'Starting...'}
          </Text>
          <Text style={styles.progressHint}>
            Please keep the app open while files are being saved.
          </Text>
        </View>
      </View>
    </Modal>
  );
}
