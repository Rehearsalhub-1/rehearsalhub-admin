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
  category?: string;
  setCategory?: (cat: string) => void;
  categories: string[];
  setCategories: (cats: string[]) => void;
  toggleCategory: (cat: string) => void;
  showNewCatInput: boolean;
  setShowNewCatInput: (val: boolean) => void;
  newCatName: string;
  setNewCatName: (val: string) => void;
  onAddNewCategory: () => void;
}

export default function MasterCollectionPicker({
  collectionsList,
  category = '',
  setCategory,
  categories = [],
  setCategories,
  toggleCategory,
  showNewCatInput,
  setShowNewCatInput,
  newCatName,
  setNewCatName,
  onAddNewCategory,
}: MasterCollectionPickerProps) {
  // Use categories array, fallback to single category if empty
  const activeCategories = categories.length > 0 ? categories : (category ? [category] : []);

  const handleClear = () => {
    setCategories([]);
    if (setCategory) setCategory('');
  };

  return (
    <View style={styles.inputGroup}>
      <View style={styles.labelWithAction}>
        <Text style={styles.label}>MASTER PROGRAMS / COLLECTIONS</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {activeCategories.length > 0 && (
            <TouchableOpacity
              style={styles.clearCategoriesPill}
              onPress={handleClear}
              activeOpacity={0.8}
            >
              <Ionicons name="close-circle-outline" size={12} color="#ef4444" style={{ marginRight: 2 }} />
              <Text style={styles.clearCategoriesPillText}>Clear</Text>
            </TouchableOpacity>
          )}
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

      {/* Scrollable Checkbox List for Collections */}
      <View style={styles.categoriesCheckboxContainer}>
        <ScrollView
          nestedScrollEnabled={true}
          showsVerticalScrollIndicator={true}
          style={{ maxHeight: 160 }}
          contentContainerStyle={{ paddingVertical: 2 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* None / Uncategorized Option */}
          <TouchableOpacity
            style={[
              styles.categoryCheckboxRow,
              activeCategories.length === 0 && styles.categoryCheckboxRowActive,
            ]}
            onPress={handleClear}
            activeOpacity={0.7}
          >
            <Ionicons
              name={activeCategories.length === 0 ? 'checkmark-circle' : 'ellipse-outline'}
              size={18}
              color={activeCategories.length === 0 ? '#10b981' : '#94a3b8'}
              style={{ marginRight: 10 }}
            />
            <Text
              style={[
                styles.categoryCheckboxText,
                activeCategories.length === 0 && { color: '#059669', fontWeight: '700' },
              ]}
            >
              None (Uncategorized)
            </Text>
          </TouchableOpacity>

          {/* All Available Master Collections */}
          {collectionsList.map(cat => {
            const isChecked = activeCategories.includes(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryCheckboxRow,
                  isChecked && styles.categoryCheckboxRowActive,
                ]}
                onPress={() => toggleCategory(cat)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isChecked ? 'checkbox' : 'square-outline'}
                  size={18}
                  color={isChecked ? '#7c3aed' : '#94a3b8'}
                  style={{ marginRight: 10 }}
                />
                <Text
                  style={[
                    styles.categoryCheckboxText,
                    isChecked && styles.categoryCheckboxTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Text style={styles.selectedCategoriesSummary}>
        Selected: {activeCategories.length > 0 ? activeCategories.join(', ') : 'None (Uncategorized)'}
      </Text>
    </View>
  );
}
