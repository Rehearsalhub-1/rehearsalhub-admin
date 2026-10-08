import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MediaSelectionModal from '../MediaSelectionModal';
import { styles } from './editSongStyles';
import SongHistoryModal from './SongHistoryModal';
import BaseSongForm from './BaseSongForm';
import { useEditSongState } from './useEditSongState';
import {
  PraiseNightSong,
  EditSongTab,
  EditSongModalProps,
  DEFAULT_CATEGORIES,
  EDIT_SONG_TABS,
} from './types';

export type { PraiseNightSong, EditSongTab, EditSongModalProps };

export default function EditSongModal(props: EditSongModalProps) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();

  const isDesktop = windowWidth >= 1024;
  const isTablet = windowWidth >= 768;
  const isMedium = windowWidth >= 540;
  const isSmallPhone = windowWidth < 360;

  const state = useEditSongState({
    ...props,
    categories: props.categories || DEFAULT_CATEGORIES,
  });

  const isEditing = Boolean(props.song && props.song.id);

  return (
    <Modal visible={props.visible} animationType="slide" transparent={false} onRequestClose={state.handleClose}>
      <View style={[styles.root, { paddingTop: insets.top }]}>

        {/* ── 1. Apple-Standard Header ─────────────────────────────────────── */}
        <View style={styles.webHeader}>
          <TouchableOpacity
            onPress={state.handleClose}
            style={styles.headerCloseBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={22} color="#64748b" />
          </TouchableOpacity>

          <View style={styles.webHeaderTitleWrap}>
            <Text style={styles.webHeaderTitle} numberOfLines={1}>
              {isEditing ? `Edit: ${state.songTitle || props.song?.title || 'Song'}` : 'Add New Song'}
            </Text>
            <Text style={styles.webHeaderSubtitle} numberOfLines={1}>
              {props.programName || (props.isMaster ? 'All Ministered' : 'Setlist')}
            </Text>
          </View>

          <TouchableOpacity
            onPress={state.handleSubmit}
            style={styles.headerQuickSaveBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={16} color="#ffffff" style={{ marginRight: 3 }} />
            <Text style={styles.headerQuickSaveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>

        {/* ── 1a. Song Meta Action Strip (LIVE pill & To All Ministered) ────── */}
        {!props.isMaster && (
          <View style={styles.songMetaActionStrip}>
            <TouchableOpacity
              onPress={() => state.setIsSongActive(!state.isSongActive)}
              style={[
                styles.headerLivePill,
                state.isSongActive ? styles.headerLivePillActive : styles.headerLivePillInactive,
              ]}
              activeOpacity={0.8}
            >
              <View style={[styles.headerLiveDot, state.isSongActive && styles.headerLiveDotActive]} />
              <Text style={[styles.headerLiveText, state.isSongActive && styles.headerLiveTextActive]}>
                {state.isSongActive ? '● LIVE BROADCAST' : 'OFFLINE STANDBY'}
              </Text>
            </TouchableOpacity>

            {isEditing && (
              <TouchableOpacity
                onPress={state.handleImportToMaster}
                style={styles.headerImportBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={14} color="#7c3aed" style={{ marginRight: 4 }} />
                <Text style={styles.headerImportBtnText}>To All Ministered</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── 1b. Segmented Tabs Bar ─────────────────────────────────────────── */}
        <View style={styles.tabBarContainer}>
          <View style={styles.tabBarScrollContent}>
            {EDIT_SONG_TABS.map(tab => {
              const isActive = state.activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  style={[styles.tabItem, isActive && styles.tabItemActive]}
                  onPress={() => state.setActiveTab(tab.id as EditSongTab)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={13}
                    color={isActive ? '#7c3aed' : '#64748b'}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[styles.tabItemText, isActive && styles.tabItemTextActive]} numberOfLines={1}>
                    {tab.label}
                  </Text>
                  {tab.id === 'lyrics' && (state.songLyrics.trim().length > 0 || state.songSolfas.trim().length > 0) && (
                    <View style={[styles.tabBadgeDot, isActive && styles.tabBadgeDotActive]} />
                  )}
                  {tab.id === 'audio' && Object.values(state.audioUrls || {}).filter(Boolean).length > 0 && (
                    <View style={styles.tabCountBadge}>
                      <Text style={styles.tabCountBadgeText}>
                        {Object.values(state.audioUrls || {}).filter(Boolean).length}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── 2. Scrollable Body composing BaseSongForm ──────────────────────── */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={styles.scrollBody}
            contentContainerStyle={[
              styles.scrollContent,
              isDesktop && styles.scrollContentDesktop,
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <BaseSongForm
              isDesktop={isDesktop}
              isTablet={isTablet}
              isMedium={isMedium}
              isSmallPhone={isSmallPhone}
              isMaster={Boolean(props.isMaster)}
              {...state}
            />

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

            <View style={{ height: 40 }} />
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── 3. Footer ──────────────────────────────────────────────────────── */}
        <View style={[styles.webFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {isMedium ? (
            <View style={styles.footerRowTablet}>
              <TouchableOpacity
                style={[styles.footerUpdateBtn, { flex: 1 }]}
                onPress={state.handleSubmit}
                activeOpacity={0.85}
              >
                <Ionicons name="save-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.footerUpdateBtnText}>
                  {isEditing ? 'Update Song' : 'Add Song'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.footerHistoryBtnTablet}
                onPress={() => state.setShowHistoryList(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="time-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.footerHistoryBtnText}>View History</Text>
                {state.historyEntries.length > 0 && (
                  <View style={styles.footerHistoryBadge}>
                    <Text style={styles.footerHistoryBadgeText}>{state.historyEntries.length}</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.footerCancelBtnTablet}
                onPress={state.handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.footerCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              <TouchableOpacity
                style={styles.footerUpdateBtn}
                onPress={state.handleSubmit}
                activeOpacity={0.85}
              >
                <Ionicons name="save-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.footerUpdateBtnText}>
                  {isEditing ? 'Update Song' : 'Add Song'}
                </Text>
              </TouchableOpacity>

              <View style={styles.footerSecondaryRow}>
                <TouchableOpacity
                  style={styles.footerHistoryBtn}
                  onPress={() => state.setShowHistoryList(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="time-outline" size={16} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.footerHistoryBtnText}>View History</Text>
                  {state.historyEntries.length > 0 && (
                    <View style={styles.footerHistoryBadge}>
                      <Text style={styles.footerHistoryBadgeText}>{state.historyEntries.length}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.footerCancelBtn}
                  onPress={state.handleClose}
                  activeOpacity={0.8}
                >
                  <Text style={styles.footerCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* ── Sub-Modals ────────────────────────────────────────────────────── */}
        <MediaSelectionModal
          visible={state.showMediaModal}
          onClose={() => { state.setShowMediaModal(false); }}
          allowedType={state.mediaType}
          title={state.mediaType === 'image' ? 'Select Song Artwork' : 'Select Audio File'}
          onSelect={state.handleMediaSelected}
        />


        <Modal visible={state.showStatusPicker} transparent animationType="fade">
          <TouchableOpacity
            style={styles.pickerOverlay}
            activeOpacity={1}
            onPress={() => state.setShowStatusPicker(false)}
          >
            <View style={[styles.pickerModalContent, isTablet && styles.pickerModalContentCentered]}>
              <Text style={styles.pickerModalTitle}>Select Status</Text>
              {(['unheard', 'heard'] as const).map(st => (
                <TouchableOpacity
                  key={st}
                  style={styles.pickerOptionItem}
                  onPress={() => {
                    state.setSongStatus(st);
                    state.setShowStatusPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, state.songStatus === st && styles.pickerOptionTextActive]}>
                    {st === 'heard' ? 'Heard' : 'Unheard'}
                  </Text>
                  {state.songStatus === st && (
                    <Ionicons name="checkmark" size={18} color="#7c3aed" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        <SongHistoryModal
          showHistoryList={state.showHistoryList}
          onCloseHistoryList={() => state.setShowHistoryList(false)}
          historyEntries={state.historyEntries}
          onEditEntry={state.handleEditHistoryEntry}
          onDeleteEntry={state.handleDeleteHistoryEntry}
          formatHistoryType={state.formatHistoryType}
          isTablet={isTablet}
          onAddHistory={state.handleAddHistory}
          currentSongAudioFile={state.songAudioFile}
          playingAudioUrl={state.playingAudioUrl}
          onTogglePlay={state.handleTogglePlay}
          audioLoading={state.audioLoading}
          showHistoryForm={state.showHistoryForm}
          editingHistoryEntryId={state.editingHistoryEntryId}
          historyFormType={state.historyFormType}
          setHistoryFormType={state.setHistoryFormType}
          historyFormTitle={state.historyFormTitle}
          setHistoryFormTitle={state.setHistoryFormTitle}
          historyFormDesc={state.historyFormDesc}
          setHistoryFormDesc={state.setHistoryFormDesc}
          originalHistoryValues={state.originalHistoryValues}
          setOriginalHistoryValues={state.setOriginalHistoryValues}
          onSaveHistoryEntry={state.handleSaveHistoryEntry}
          onCloseHistoryForm={state.handleCloseHistoryForm || (() => { state.setEditingHistoryEntryId(null); state.setShowHistoryForm(false); })}
          onSelectHistoryType={state.handleSelectHistoryType}
          insetsBottom={insets.bottom}
          songTitle={state.songTitle}
          songKey={state.songKey}
          songTempo={state.songTempo}
          songCategories={state.songCategories}
          songStatus={state.songStatus}
        />

      </View>
    </Modal>
  );
}
