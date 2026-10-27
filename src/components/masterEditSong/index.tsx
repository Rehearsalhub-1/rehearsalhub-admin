import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MediaSelectionModal from '../MediaSelectionModal';
import SongHistoryModal from '../editSong/SongHistoryModal';
import { styles } from './masterEditSongStyles';
import { MasterEditSongModalProps } from './types';
import { useMasterEditSongState } from './useMasterEditSongState';
import MasterDetailsTab from './MasterDetailsTab';
import MasterAudioStemsTab from './MasterAudioStemsTab';
import MasterLyricsTab from './MasterLyricsTab';
import MasterAccessControl from './MasterAccessControl';

export type { MasterEditSongModalProps } from './types';

const TABS = [
  { id: 'details', label: 'Details' },
  { id: 'audio', label: 'Audio' },
  { id: 'lyrics', label: 'Lyrics' },
  { id: 'access', label: 'Access' },
] as const;

export default function MasterEditSongModal({
  visible,
  song,
  mode = 'edit',
  onClose,
  onSaved,
  onDelete,
}: MasterEditSongModalProps) {
  const insets = useSafeAreaInsets();
  const state = useMasterEditSongState({ visible, song, mode, onClose, onSaved, onDelete });

  const isEditing = !state.isCreate && Boolean(song?.id);
  const audioStemsCount = Object.values(state.audioUrls || {}).filter(Boolean).length;
  const hasLyricsContent = state.lyrics.trim().length > 0 || state.solfa.trim().length > 0;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* ── 1. Apple-Standard Header ─────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.headerCloseBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={20} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.webHeaderTitleWrap}>
            <Text style={styles.webHeaderTitle} numberOfLines={1}>
              {state.isCreate ? 'Add Song' : (state.title || song?.title || 'Edit Song')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <Text style={styles.webHeaderSubtitle} numberOfLines={1}>
                All Ministered
              </Text>
              {state.isHQOnly && (
                <View style={styles.hqIndicator}>
                  <Text style={styles.hqIndicatorText}>HQ</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {isEditing && (
              <TouchableOpacity
                onPress={() => state.historyManager.setShowHistoryList(true)}
                style={styles.headerHistoryBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={16} color="#6366f1" />
                <Text style={styles.headerHistoryBtnText}>History</Text>
                {state.historyManager.historyEntries.length > 0 && (
                  <View style={styles.headerHistoryBadge}>
                    <Text style={styles.headerHistoryBadgeText}>
                      {state.historyManager.historyEntries.length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={state.handleSave}
              style={[styles.headerQuickSaveBtn, !state.title.trim() && styles.saveBtnDisabled]}
              disabled={state.saving || !state.title.trim()}
              activeOpacity={0.8}
            >
              {state.saving ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color="#ffffff" style={{ marginRight: 2 }} />
                  <Text style={styles.headerQuickSaveBtnText}>Save</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── 2. Segmented Tabs Bar ─────────────────────────────────────── */}
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBarScrollContent}>
            {TABS.map(t => {
              const isActive = state.activeTab === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => state.setActiveTab(t.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]} numberOfLines={1}>
                    {t.label}
                  </Text>
                  {t.id === 'audio' && audioStemsCount > 0 && (
                    <View style={styles.tabCountBadge}>
                      <Text style={styles.tabCountBadgeText}>{audioStemsCount}</Text>
                    </View>
                  )}
                  {t.id === 'lyrics' && hasLyricsContent && (
                    <View style={styles.tabBadgeDot} />
                  )}
                  {t.id === 'access' && state.isHQOnly && (
                    <View style={[styles.tabBadgeDot, { backgroundColor: '#4338ca' }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {state.activeTab === 'details' && (
              <MasterDetailsTab
                title={state.title}
                setTitle={state.setTitle}
                leadSinger={state.leadSinger}
                setLeadSinger={state.setLeadSinger}
                writer={state.writer}
                setWriter={state.setWriter}
                collectionsList={state.collectionsList}
                category={state.category}
                setCategory={state.setCategory}
                categories={state.categories}
                setCategories={state.setCategories}
                toggleCategory={state.toggleCategory}
                showNewCatInput={state.showNewCatInput}
                setShowNewCatInput={state.setShowNewCatInput}
                newCatName={state.newCatName}
                setNewCatName={state.setNewCatName}
                onAddNewCategory={state.handleAddNewCategory}
                keyVal={state.key}
                setKeyVal={state.setKey}
                tempo={state.tempo}
                setTempo={state.setTempo}
                conductor={state.conductor}
                setConductor={state.setConductor}
                leadKeyboardist={state.leadKeyboardist}
                setLeadKeyboardist={state.setLeadKeyboardist}
                bassGuitarist={state.bassGuitarist}
                setBassGuitarist={state.setBassGuitarist}
                drummer={state.drummer}
                setDrummer={state.setDrummer}
                imageUrl={state.imageUrl}
                setImageUrl={state.setImageUrl}
                onPickArtwork={() => {
                  state.setMediaTarget('image');
                  state.setMediaModalVisible(true);
                }}
              />
            )}

            {state.activeTab === 'audio' && (
              <MasterAudioStemsTab
                audioUrls={state.audioUrls}
                setAudioUrls={state.setAudioUrls}
                customParts={state.customParts}
                showAddPart={state.showAddPart}
                setShowAddPart={state.setShowAddPart}
                newPartName={state.newPartName}
                setNewPartName={state.setNewPartName}
                onAddStem={state.handleAddStem}
                onRemoveCustomStem={state.handleRemoveCustomStem}
                playingKey={state.playingKey}
                onToggleStemAudio={state.handleToggleStemAudio}
                onPickMedia={target => {
                  state.setMediaTarget(target);
                  state.setMediaModalVisible(true);
                }}
              />
            )}

            {state.activeTab === 'lyrics' && (
              <MasterLyricsTab
                lyrics={state.lyrics}
                setLyrics={state.setLyrics}
                lyricsSelection={state.lyricsSelection}
                setLyricsSelection={state.setLyricsSelection}
                solfa={state.solfa}
                setSolfa={state.setSolfa}
                history={state.history}
                setHistory={state.setHistory}
                onOpenHistory={() => state.historyManager.setShowHistoryList(true)}
                historyCount={state.historyManager.historyEntries.length}
              />
            )}

            {state.activeTab === 'access' && (
              <MasterAccessControl
                isHQOnly={state.isHQOnly}
                setIsHQOnly={state.setIsHQOnly}
              />
            )}

            {/* Revision History Action Card */}
            {isEditing && (
              <View style={styles.historyActionCard}>
                <View style={styles.historyActionLeft}>
                  <View style={styles.historyActionIconWrap}>
                    <Ionicons name="time" size={18} color="#6366f1" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyActionTitle}>Revision History</Text>
                    <Text style={styles.historyActionSubtitle}>
                      {state.historyManager.historyEntries.length === 0
                        ? 'No revisions'
                        : `${state.historyManager.historyEntries.length} checkpoint${state.historyManager.historyEntries.length === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.historyActionOpenBtn}
                  onPress={() => state.historyManager.setShowHistoryList(true)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.historyActionOpenBtnText}>Manage</Text>
                  <Ionicons name="chevron-forward" size={14} color="#6366f1" />
                </TouchableOpacity>
              </View>
            )}

            {/* Danger Zone: Delete Song */}
            {isEditing && (
              <View style={styles.dangerZoneContainer}>
                <TouchableOpacity
                  onPress={state.handleDelete}
                  style={styles.dangerDeleteBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.dangerDeleteBtnText}>Delete Song</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Media Selection Modal */}
        <MediaSelectionModal
          visible={state.mediaModalVisible}
          onClose={() => {
            state.setMediaModalVisible(false);
            state.setMediaTarget(null);
          }}
          allowedType={state.mediaTarget === 'image' ? 'image' : 'audio'}
          title={state.mediaTarget === 'image' ? 'Select Cover Artwork' : `Select ${state.mediaTarget} Audio`}
          onSelect={url => {
            if (state.mediaTarget === 'image') {
              state.setImageUrl(url);
            } else if (state.mediaTarget) {
              state.setAudioUrls(prev => ({ ...prev, [state.mediaTarget!]: url }));
            }
            state.setMediaModalVisible(false);
            state.setMediaTarget(null);
          }}
        />

        {/* Song Revision History Modal */}
        <SongHistoryModal
          showHistoryList={state.historyManager.showHistoryList}
          onCloseHistoryList={() => state.historyManager.setShowHistoryList(false)}
          historyEntries={state.historyManager.historyEntries}
          onEditEntry={state.historyManager.handleEditHistoryEntry}
          onDeleteEntry={state.historyManager.handleDeleteHistoryEntry}
          formatHistoryType={state.historyManager.formatHistoryType}
          isTablet={false}
          onAddHistory={state.historyManager.handleAddHistory}
          currentSongAudioFile={state.audioUrls.full}
          playingAudioUrl={state.playingKey === 'history' ? (state.audioUrls.full || '') : null}
          onTogglePlay={state.handleTogglePlay}
          showHistoryForm={state.historyManager.showHistoryForm}
          editingHistoryEntryId={state.historyManager.editingHistoryEntryId}
          historyFormType={state.historyManager.historyFormType}
          setHistoryFormType={state.historyManager.setHistoryFormType}
          historyFormTitle={state.historyManager.historyFormTitle}
          setHistoryFormTitle={state.historyManager.setHistoryFormTitle}
          historyFormDesc={state.historyManager.historyFormDesc}
          setHistoryFormDesc={state.historyManager.setHistoryFormDesc}
          originalHistoryValues={state.historyManager.originalHistoryValues}
          setOriginalHistoryValues={state.historyManager.setOriginalHistoryValues}
          onSaveHistoryEntry={state.historyManager.handleSaveHistoryEntry}
          onCloseHistoryForm={state.historyManager.handleCloseHistoryForm}
          onSelectHistoryType={state.historyManager.handleSelectHistoryType}
          insetsBottom={insets.bottom}
          songTitle={state.title}
          songKey={state.key}
          songTempo={state.tempo}
          songCategories={state.categories}
          songStatus="active"
          onRestoreEntry={state.handleRestoreHistoryEntry}
        />
      </SafeAreaView>
    </Modal>
  );
}
