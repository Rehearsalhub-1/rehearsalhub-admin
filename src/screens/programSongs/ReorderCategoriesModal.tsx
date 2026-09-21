import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './programSongsStyles';

interface ReorderCategoriesModalProps {
  visible: boolean;
  onClose: () => void;
  categoriesList: string[];
  categoryCounts: Record<string, number>;
  onMoveCategory: (index: number, direction: 'up' | 'down') => void;
  onReset: () => void;
  onSave: () => void;
  isSaving: boolean;
}

export default function ReorderCategoriesModal({
  visible,
  onClose,
  categoriesList,
  categoryCounts,
  onMoveCategory,
  onReset,
  onSave,
  isSaving,
}: ReorderCategoriesModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.reorderOverlay}>
        <View style={[styles.reorderSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHandle} />

          <View style={styles.reorderHeader}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={styles.reorderTitle}>Reorder Categories</Text>
              <Text style={styles.reorderSubtitle}>
                Arrange how categories appear in the mobile app tabs
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.reorderCloseBtn}
            >
              <Ionicons name="close" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
            {categoriesList.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontSize: 14, fontWeight: '500' }}>
                  No categories found in this program.
                </Text>
              </View>
            ) : (
              categoriesList.map((cat, index) => {
                const count = categoryCounts[cat] || 0;
                const isFirst = index === 0;
                const isLast = index === categoriesList.length - 1;

                return (
                  <View key={cat} style={styles.reorderRow}>
                    <View style={styles.reorderRowIndex}>
                      <Text style={styles.reorderIndexText}>{index + 1}</Text>
                    </View>

                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.reorderCategoryName} numberOfLines={1}>
                        {cat}
                      </Text>
                      <Text style={styles.reorderCategoryCount}>
                        {count} {count === 1 ? 'song' : 'songs'}
                      </Text>
                    </View>

                    <View style={styles.reorderActions}>
                      <TouchableOpacity
                        style={[styles.arrowBtn, isFirst && styles.arrowBtnDisabled]}
                        onPress={() => onMoveCategory(index, 'up')}
                        disabled={isFirst}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="chevron-up"
                          size={18}
                          color={isFirst ? '#cbd5e1' : '#0f172a'}
                        />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.arrowBtn, isLast && styles.arrowBtnDisabled]}
                        onPress={() => onMoveCategory(index, 'down')}
                        disabled={isLast}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="chevron-down"
                          size={18}
                          color={isLast ? '#cbd5e1' : '#0f172a'}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={styles.reorderFooter}>
            <TouchableOpacity
              style={styles.reorderResetBtn}
              onPress={onReset}
              activeOpacity={0.75}
            >
              <Text style={styles.reorderResetBtnText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reorderSaveBtn}
              onPress={onSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark-done" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.reorderSaveBtnText}>Save Order</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
