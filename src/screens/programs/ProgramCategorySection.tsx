import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { modalStyles } from './programModalStyles';

interface ProgramCategorySectionProps {
  availablePageCategories: string[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  showNewCategoryInput: boolean;
  setShowNewCategoryInput: (show: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  newCategoryImageUrl: string;
  onPickCategoryImage: () => void;
  onAddNewCategory: () => void;
}

export function ProgramCategorySection({
  availablePageCategories,
  selectedCategory,
  onSelectCategory,
  showNewCategoryInput,
  setShowNewCategoryInput,
  newCategoryName,
  setNewCategoryName,
  newCategoryImageUrl,
  onPickCategoryImage,
  onAddNewCategory,
}: ProgramCategorySectionProps) {
  return (
    <View style={{ marginTop: 14 }}>
      <View style={modalStyles.labelWithActionRow}>
        <Text style={[modalStyles.label, { marginTop: 0 }]}>PROGRAM CATEGORY</Text>
        {!showNewCategoryInput ? (
          <TouchableOpacity
            style={modalStyles.addCategoryPill}
            onPress={() => {
              setShowNewCategoryInput(true);
              setNewCategoryName('');
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="add" size={13} color="#7c3aed" style={{ marginRight: 2 }} />
            <Text style={modalStyles.addCategoryPillText}>New Category</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Inline New Category Creation Input */}
      {showNewCategoryInput && (
        <View style={modalStyles.newCategoryInputRow}>
          <TextInput
            style={modalStyles.newCategoryTextInput}
            placeholder="e.g. Easter Special, Zonal Rally..."
            placeholderTextColor="#94a3b8"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
            autoFocus
            onSubmitEditing={onAddNewCategory}
          />
          <TouchableOpacity
            style={[
              modalStyles.categoryImageBtn,
              newCategoryImageUrl ? modalStyles.categoryImageBtnActive : null,
            ]}
            onPress={onPickCategoryImage}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons
              name={newCategoryImageUrl ? 'checkmark-circle' : 'image-outline'}
              size={16}
              color={newCategoryImageUrl ? '#10b981' : '#7c3aed'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.addCategoryConfirmBtn} onPress={onAddNewCategory}>
            <Text style={modalStyles.addCategoryConfirmBtnText}>Add</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={modalStyles.addCategoryCancelBtn}
            onPress={() => {
              setShowNewCategoryInput(false);
              setNewCategoryName('');
            }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="close" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      {/* Horizontal Scrolling Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      >
        {availablePageCategories.map(cat => {
          const isSelected = selectedCategory === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[
                modalStyles.categoryChip,
                isSelected && modalStyles.categoryChipActive,
              ]}
              onPress={() => onSelectCategory(cat)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="folder-outline"
                size={13}
                color={isSelected ? '#ffffff' : '#64748b'}
                style={{ marginRight: 5 }}
              />
              <Text style={[
                modalStyles.categoryChipText,
                isSelected && modalStyles.categoryChipTextActive,
              ]}>
                {cat}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
