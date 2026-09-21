import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './masterEditSongStyles';

interface MasterCollectionPickerProps {
  collectionsList: string[];
  category: string;
  setCategory: (cat: string) => void;
  showNewCatInput: boolean;
  setShowNewCatInput: (val: boolean) => void;
  newCatName: string;
  setNewCatName: (val: string) => void;
  onAddNewCategory: () => void;
}

export default function MasterCollectionPicker({
  collectionsList,
  category,
  setCategory,
  showNewCatInput,
  setShowNewCatInput,
  newCatName,
  setNewCatName,
  onAddNewCategory,
}: MasterCollectionPickerProps) {
  return (
    <View style={styles.inputGroup}>
      <View style={styles.labelWithAction}>
        <Text style={styles.label}>MASTER PROGRAM / COLLECTION</Text>
        {!showNewCatInput && (
          <TouchableOpacity
            style={styles.addCategoryPill}
            onPress={() => setShowNewCatInput(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={12} color="#7c3aed" style={{ marginRight: 2 }} />
            <Text style={styles.addCategoryPillText}>+ New Collection</Text>
          </TouchableOpacity>
        )}
      </View>

      {showNewCatInput && (
        <View style={styles.inlineNewCatRow}>
          <TextInput
            style={styles.inlineNewCatInput}
            placeholder="Collection name (e.g. Praise Night 29, HSLHS)..."
            placeholderTextColor="#94a3b8"
            value={newCatName}
            onChangeText={setNewCatName}
            autoFocus
          />
          <TouchableOpacity
            style={styles.inlineAddCatBtn}
            onPress={onAddNewCategory}
            activeOpacity={0.8}
          >
            <Text style={styles.inlineAddCatBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.inlineCancelCatBtn}
            onPress={() => {
              setShowNewCatInput(false);
              setNewCatName('');
            }}
          >
            <Ionicons name="close" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
        <TouchableOpacity
          style={[styles.categoryChip, !category && styles.categoryChipActive]}
          onPress={() => setCategory('')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="close-circle-outline"
            size={12}
            color={!category ? '#7c3aed' : '#64748b'}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.categoryChipText, !category && styles.categoryChipTextActive]}>
            None (Uncategorized)
          </Text>
        </TouchableOpacity>

        {collectionsList.map(cat => {
          const isSelected = category === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
              onPress={() => setCategory(isSelected ? '' : cat)}
              activeOpacity={0.8}
            >
              <Ionicons
                name="albums-outline"
                size={12}
                color={isSelected ? '#7c3aed' : '#64748b'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
