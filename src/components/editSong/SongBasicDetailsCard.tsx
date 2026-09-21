import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './editSongStyles';

export interface SongBasicDetailsCardProps {
  isMedium: boolean;
  isSmallPhone: boolean;
  isMaster: boolean;
  songTitle: string;
  setSongTitle: (val: string) => void;
  songCategories: string[];
  setSongCategories: React.Dispatch<React.SetStateAction<string[]>>;
  availableCategories: string[];
  showNewCategoryInput: boolean;
  setShowNewCategoryInput: (val: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (val: string) => void;
  handleAddNewCategory: () => void;
  toggleCategory: (cat: string) => void;
  songStatus: 'heard' | 'unheard';
  setShowStatusPicker: (val: boolean) => void;
  isSongActive: boolean;
  setIsSongActive: (val: boolean) => void;
  isHQOnly: boolean;
  setIsHQOnly: (val: boolean) => void;
  songImageUrl: string;
  setSongImageUrl: (val: string) => void;
  handleOpenMediaSelector: (target: string, type: 'audio' | 'image') => void;
  handleAddHistory: (type: string) => void;
}

export default function SongBasicDetailsCard({
  isMedium,
  isSmallPhone,
  isMaster,
  songTitle,
  setSongTitle,
  songCategories,
  setSongCategories,
  availableCategories,
  showNewCategoryInput,
  setShowNewCategoryInput,
  newCategoryName,
  setNewCategoryName,
  handleAddNewCategory,
  toggleCategory,
  songStatus,
  setShowStatusPicker,
  isSongActive,
  setIsSongActive,
  isHQOnly,
  setIsHQOnly,
  songImageUrl,
  setSongImageUrl,
  handleOpenMediaSelector,
  handleAddHistory,
}: SongBasicDetailsCardProps) {
  return (
    <View style={styles.cardSlate}>
      <View style={styles.cardHeaderRow}>
        <Text style={styles.cardHeaderTitle}>Song Details</Text>
        <TouchableOpacity
          style={styles.addHistoryBtn}
          onPress={() => handleAddHistory('song-details')}
        >
          <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
          <Text style={styles.addHistoryBtnText}>Add History</Text>
        </TouchableOpacity>
      </View>

      {/* Song Title Input */}
      <View style={styles.fieldGroup}>
        <Text style={styles.fieldLabel}>Song Title *</Text>
        <TextInput
          style={[styles.inputPrimary, styles.inputLarge]}
          value={songTitle}
          onChangeText={setSongTitle}
          placeholder="Enter song title"
          placeholderTextColor="#94a3b8"
        />
      </View>

      {/* Categories & Status Row */}
      <View style={[styles.fieldRowResponsive, !isMedium && { flexDirection: 'column' }]}>
        {/* Categories Box */}
        <View style={{ flex: isMedium ? 1 : undefined }}>
          <View style={styles.categoriesHeaderRow}>
            <Text style={styles.fieldLabel}>Categories (Optional)</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {songCategories.length > 0 && (
                <TouchableOpacity
                  style={styles.clearCategoriesPill}
                  onPress={() => setSongCategories([])}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="close-circle-outline" size={13} color="#ef4444" style={{ marginRight: 2 }} />
                  <Text style={styles.clearCategoriesPillText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.addCategoryPill}
                onPress={() => setShowNewCategoryInput(true)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="add" size={13} color="#7c3aed" style={{ marginRight: 2 }} />
                <Text style={styles.addCategoryPillText}>New Category</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Inline Add Category Input */}
          {showNewCategoryInput && (
            <View style={styles.newCategoryInputRow}>
              <TextInput
                style={styles.newCategoryTextInput}
                placeholder="Category name (e.g. Warfare, Anthem)"
                placeholderTextColor="#94a3b8"
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
                onSubmitEditing={handleAddNewCategory}
              />
              <TouchableOpacity style={styles.addCategoryConfirmBtn} onPress={handleAddNewCategory}>
                <Text style={styles.addCategoryConfirmBtnText}>Add</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addCategoryCancelBtn}
                onPress={() => { setShowNewCategoryInput(false); setNewCategoryName(''); }}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={16} color="#64748b" />
              </TouchableOpacity>
            </View>
          )}

          {/* Scrollable Checkbox Container */}
          <View style={styles.categoriesCheckboxContainer}>
            <ScrollView
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: 180 }}
              contentContainerStyle={{ paddingVertical: 2 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Uncategorized Option */}
              <TouchableOpacity
                style={[styles.categoryCheckboxRow, songCategories.length === 0 && styles.categoryCheckboxRowNoneActive]}
                onPress={() => setSongCategories([])}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={songCategories.length === 0 ? 'checkmark-circle' : 'ellipse-outline'}
                  size={18}
                  color={songCategories.length === 0 ? '#10b981' : '#94a3b8'}
                  style={{ marginRight: 10 }}
                />
                <Text style={[styles.categoryCheckboxText, songCategories.length === 0 && { color: '#059669', fontWeight: '700' }]}>
                  None (Uncategorized)
                </Text>
              </TouchableOpacity>

              {availableCategories.map(cat => {
                const isChecked = songCategories.includes(cat);
                return (
                  <TouchableOpacity
                    key={cat}
                    style={styles.categoryCheckboxRow}
                    onPress={() => toggleCategory(cat)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={isChecked ? 'checkbox' : 'square-outline'}
                      size={18}
                      color={isChecked ? '#7c3aed' : '#94a3b8'}
                      style={{ marginRight: 10 }}
                    />
                    <Text style={[styles.categoryCheckboxText, isChecked && styles.categoryCheckboxTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <Text style={styles.selectedCategoriesSummary}>
            Selected: {songCategories.length > 0 ? songCategories.join(', ') : 'None (Uncategorized)'}
          </Text>
        </View>

        {/* Rehearsal Status Dropdown */}
        <View style={{ flex: isMedium ? 1 : undefined, marginTop: isMedium ? 0 : 12 }}>
          <Text style={styles.fieldLabel}>Rehearsal Status</Text>
          <TouchableOpacity
            style={styles.pickerTrigger}
            onPress={() => setShowStatusPicker(true)}
          >
            <Text style={styles.pickerTriggerText}>
              {songStatus === 'heard' ? 'Heard' : 'Unheard'}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* LIVE Broadcast Toggle */}
      {!isMaster && (
        <View style={styles.broadcastRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.fieldLabel}>Broadcast Status</Text>
            <Text style={styles.broadcastSubtext}>
              {isSongActive ? 'Song is broadcasting LIVE in real-time to choir' : 'Song is offline / rehearsal standby'}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.liveToggleBtn,
              isSongActive ? styles.liveToggleBtnActive : styles.liveToggleBtnInactive,
            ]}
            onPress={() => setIsSongActive(!isSongActive)}
            activeOpacity={0.8}
          >
            <View style={[styles.liveDot, isSongActive && styles.liveDotActive]} />
            <Text style={[styles.liveToggleBtnText, isSongActive && styles.liveToggleBtnTextActive]}>
              {isSongActive ? '● LIVE' : 'GO LIVE'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* HQ Only Toggle */}
      {isMaster && (
        <View style={styles.hqOnlyRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
              <Ionicons
                name={isHQOnly ? 'lock-closed' : 'globe-outline'}
                size={15}
                color={isHQOnly ? '#7c3aed' : '#059669'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>Hide from Regional Zones (HQ Only)</Text>
            </View>
            <Text style={styles.broadcastSubtext}>
              {isHQOnly
                ? 'HQ Exclusive: Hidden from all regional zones. Visible only to Loveworld Singers HQ.'
                : 'Universal Repertoire: Visible to all regional zones & church choir hubs.'}
            </Text>
          </View>
          <Switch
            value={isHQOnly}
            onValueChange={setIsHQOnly}
            trackColor={{ false: '#cbd5e1', true: '#c4b5fd' }}
            thumbColor={isHQOnly ? '#7c3aed' : '#ffffff'}
          />
        </View>
      )}

      {/* Song Artwork */}
      <View style={[styles.fieldGroup, { marginTop: 14 }]}>
        <Text style={styles.fieldLabel}>Song Artwork</Text>
        <View style={[styles.artworkSectionRow, isSmallPhone && { flexDirection: 'column', alignItems: 'flex-start' }]}>
          {songImageUrl ? (
            <View style={styles.artworkPreviewWrap}>
              <Image source={{ uri: songImageUrl }} style={styles.artworkImg} />
              <TouchableOpacity
                style={styles.artworkRemoveBadge}
                onPress={() => setSongImageUrl('')}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons name="close" size={14} color="#ffffff" />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.artworkPlaceholder}>
              <Ionicons name="image-outline" size={24} color="#94a3b8" style={{ marginBottom: 4 }} />
              <Text style={styles.artworkPlaceholderText}>No Image</Text>
            </View>
          )}

          <View style={{ flex: 1, width: isSmallPhone ? '100%' : undefined }}>
            <TouchableOpacity
              style={styles.selectArtworkBtn}
              onPress={() => handleOpenMediaSelector('image', 'image')}
              activeOpacity={0.8}
            >
              <Ionicons name="folder-open-outline" size={15} color="#475569" style={{ marginRight: 6 }} />
              <Text style={styles.selectArtworkBtnText}>Select Artwork</Text>
            </TouchableOpacity>
            <Text style={styles.artworkHintText}>
              This image will be used as the song's cover art in the mobile app.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
