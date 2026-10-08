import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './editSongStyles';
import type { BaseSongFormProps } from './BaseSongForm';

const QUICK_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const QUICK_TEMPOS = ['70', '85', '100', '115', '125', '135'];

export type SongGeneralCardProps = BaseSongFormProps;

export default function SongGeneralCard(props: SongGeneralCardProps) {
  const {
    isMedium,
    isSmallPhone,
    isMaster,
    songTitle,
    setSongTitle,
    songKey,
    setSongKey,
    songTempo,
    setSongTempo,
    songLeadSinger,
    setSongLeadSinger,
    rehearsalCount,
    setRehearsalCount,
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
    songAudioFile,
    playingAudioUrl,
    audioLoading,
    handleTogglePlay,
  } = props;

  return (
    <View style={{ gap: 14 }}>
      {/* ── CARD 1: ESSENTIALS (Title, Key, Tempo, Lead Singer) ─────────── */}
      <View style={styles.cardSlate}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderTitle}>Music Essentials</Text>
          <TouchableOpacity
            style={styles.addHistoryBtn}
            onPress={() => handleAddHistory('music-details')}
          >
            <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
            <Text style={styles.addHistoryBtnText}>Add History</Text>
          </TouchableOpacity>
        </View>

        {/* 1. Song Title */}
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

        {/* 2. Key & Tempo with 1-Tap Chips */}
        {isMedium ? (
          <View style={styles.threeColRow}>
            {/* Key */}
            <View style={{ flex: 1.2 }}>
              <Text style={styles.fieldLabel}>Key</Text>
              <TextInput
                style={styles.inputPrimary}
                value={songKey}
                onChangeText={setSongKey}
                placeholder="e.g., C, G, F#"
                placeholderTextColor="#94a3b8"
              />
              <View style={styles.keyChipsWrap}>
                {QUICK_KEYS.map(k => {
                  const isSelected = (songKey || '').trim().toLowerCase() === k.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={k}
                      style={[styles.keyChip, isSelected && styles.keyChipActive]}
                      onPress={() => setSongKey(k)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.keyChipText, isSelected && styles.keyChipTextActive]}>
                        {k}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tempo */}
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Tempo</Text>
              <TextInput
                style={styles.inputPrimary}
                value={songTempo}
                onChangeText={setSongTempo}
                placeholder="e.g., 120 BPM"
                placeholderTextColor="#94a3b8"
              />
              <View style={styles.tempoChipsWrap}>
                {QUICK_TEMPOS.map(t => {
                  const isSelected = (songTempo || '').includes(t);
                  return (
                    <TouchableOpacity
                      key={t}
                      style={[styles.tempoChip, isSelected && styles.tempoChipActive]}
                      onPress={() => setSongTempo(`${t} BPM`)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.tempoChipText, isSelected && styles.tempoChipTextActive]}>
                        {t}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Rehearsals */}
            <View style={{ flex: 0.8 }}>
              <Text style={styles.fieldLabel}>Rehearsals</Text>
              <TextInput
                style={styles.inputPrimary}
                value={String(rehearsalCount)}
                onChangeText={t => setRehearsalCount(parseInt(t, 10) || 0)}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor="#94a3b8"
              />
            </View>
          </View>
        ) : (
          <View style={{ gap: 12, marginBottom: 12 }}>
            {/* Key on mobile */}
            <View>
              <Text style={styles.fieldLabel}>Key</Text>
              <TextInput
                style={styles.inputPrimary}
                value={songKey}
                onChangeText={setSongKey}
                placeholder="e.g., C, G, F#"
                placeholderTextColor="#94a3b8"
              />
              <View style={styles.keyChipsWrap}>
                {QUICK_KEYS.map(k => {
                  const isSelected = (songKey || '').trim().toLowerCase() === k.toLowerCase();
                  return (
                    <TouchableOpacity
                      key={k}
                      style={[styles.keyChip, isSelected && styles.keyChipActive]}
                      onPress={() => setSongKey(k)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.keyChipText, isSelected && styles.keyChipTextActive]}>
                        {k}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Tempo & Rehearsals row on mobile */}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Tempo</Text>
                <TextInput
                  style={styles.inputPrimary}
                  value={songTempo}
                  onChangeText={setSongTempo}
                  placeholder="e.g., 120 BPM"
                  placeholderTextColor="#94a3b8"
                />
                <View style={styles.tempoChipsWrap}>
                  {QUICK_TEMPOS.slice(0, 4).map(t => {
                    const isSelected = (songTempo || '').includes(t);
                    return (
                      <TouchableOpacity
                        key={t}
                        style={[styles.tempoChip, isSelected && styles.tempoChipActive]}
                        onPress={() => setSongTempo(`${t} BPM`)}
                        activeOpacity={0.75}
                      >
                        <Text style={[styles.tempoChipText, isSelected && styles.tempoChipTextActive]}>
                          {t}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={{ flex: 0.8 }}>
                <Text style={styles.fieldLabel}>Rehearsals</Text>
                <TextInput
                  style={styles.inputPrimary}
                  value={String(rehearsalCount)}
                  onChangeText={t => setRehearsalCount(parseInt(t, 10) || 0)}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          </View>
        )}

        {/* 3. Lead Singer (Right at the top with music essentials!) */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Lead Singer</Text>
          <TextInput
            style={styles.inputPrimary}
            value={songLeadSinger}
            onChangeText={setSongLeadSinger}
            placeholder="Enter lead singer name"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>

      {/* ── CARD 2: CATEGORIES & SETTINGS ──────────────────────────────── */}
      <View style={styles.cardSlate}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderTitle}>Categories & Settings</Text>
          <TouchableOpacity
            style={styles.addHistoryBtn}
            onPress={() => handleAddHistory('song-details')}
          >
            <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
            <Text style={styles.addHistoryBtnText}>Add History</Text>
          </TouchableOpacity>
        </View>

        {/* Categories Header & Actions */}
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

        {/* Wrapping Category Pill Chips (Zero Scroll Trap) */}
        <View style={styles.categoryPillWrap}>
          <TouchableOpacity
            style={[
              styles.categoryChip,
              songCategories.length === 0 && styles.categoryChipNoneActive,
            ]}
            onPress={() => setSongCategories([])}
            activeOpacity={0.75}
          >
            <Ionicons
              name={songCategories.length === 0 ? 'checkmark-circle' : 'ellipse-outline'}
              size={14}
              color={songCategories.length === 0 ? '#059669' : '#94a3b8'}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.categoryChipText,
                songCategories.length === 0 && styles.categoryChipTextNoneActive,
              ]}
            >
              None (Uncategorized)
            </Text>
          </TouchableOpacity>

          {availableCategories.map(cat => {
            const isChecked = songCategories.includes(cat);
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isChecked && styles.categoryChipActive]}
                onPress={() => toggleCategory(cat)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isChecked ? 'checkmark-circle' : 'add-circle-outline'}
                  size={14}
                  color={isChecked ? '#7c3aed' : '#94a3b8'}
                  style={{ marginRight: 5 }}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    isChecked && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Rehearsal Status Dropdown */}
        <View style={{ marginTop: 14 }}>
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

        {/* LIVE Broadcast Toggle */}
        {!isMaster && (
          <View style={[styles.broadcastRow, { marginTop: 14 }]}>
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
          <View style={[styles.hqOnlyRow, { marginTop: 14 }]}>
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
                  : 'Master Catalog: Visible to all regional zones & church choir hubs.'}
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
      </View>

      {/* ── CARD 3: MEDIA (Audio & Artwork) ────────────────────────────── */}
      <View style={styles.cardSlate}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeaderTitle}>Media & Files</Text>
          <TouchableOpacity
            style={styles.addHistoryBtn}
            onPress={() => handleAddHistory('audio')}
          >
            <Ionicons name="time-outline" size={13} color="#475569" style={{ marginRight: 4 }} />
            <Text style={styles.addHistoryBtnText}>Add History</Text>
          </TouchableOpacity>
        </View>

        {/* Master Audio Track */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Audio Track</Text>
          {songAudioFile ? (
            <View style={styles.audioFilePlayerBox}>
              <View style={styles.audioFileMetaRow}>
                <View style={styles.audioDotPurple} />
                <Text style={styles.audioFileName} numberOfLines={1}>
                  {songAudioFile.split('/').pop() || 'Audio Track'}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
                <TouchableOpacity
                  style={[
                    styles.miniPlayBtn,
                    playingAudioUrl === songAudioFile && styles.miniPlayBtnActive,
                  ]}
                  onPress={() => handleTogglePlay(songAudioFile)}
                >
                  {audioLoading ? (
                    <ActivityIndicator size="small" color="#7c3aed" />
                  ) : (
                    <>
                      <Ionicons
                        name={playingAudioUrl === songAudioFile ? 'pause' : 'play'}
                        size={14}
                        color={playingAudioUrl === songAudioFile ? '#ffffff' : '#7c3aed'}
                      />
                      <Text
                        style={[
                          styles.miniPlayBtnText,
                          playingAudioUrl === songAudioFile && styles.miniPlayBtnTextActive,
                        ]}
                      >
                        {playingAudioUrl === songAudioFile ? 'Playing' : 'Play Audio'}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.selectFromMediaBtn}
                  onPress={() => handleOpenMediaSelector('audio', 'audio')}
                >
                  <Text style={styles.selectFromMediaBtnText}>Change File</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.browseMediaPrimaryBtn}
              onPress={() => handleOpenMediaSelector('audio', 'audio')}
              activeOpacity={0.8}
            >
              <Ionicons name="musical-notes-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.browseMediaPrimaryBtnText}>Select Audio File</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Song Artwork */}
        <View style={[styles.fieldGroup, { marginTop: 10 }]}>
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
                Used as the song's cover art in the mobile app.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
