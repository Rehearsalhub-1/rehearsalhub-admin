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
              {state.isCreate ? 'Add Master Song' : (state.title || song?.title || 'Edit Master Song')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <Text style={styles.webHeaderSubtitle} numberOfLines={1}>
                All Ministered • Master Catalog
              </Text>
              {state.isHQOnly && (
                <View style={styles.hqIndicator}>
                  <Text style={styles.hqIndicatorText}>HQ</Text>
                </View>
              )}
            </View>
          </View>

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
              />
            )}

            {state.activeTab === 'access' && (
              <MasterAccessControl
                isHQOnly={state.isHQOnly}
                setIsHQOnly={state.setIsHQOnly}
              />
            )}

            {/* Danger Zone: Delete Master Song (Parity with Edit Song) */}
            {isEditing && (
              <View style={styles.dangerZoneContainer}>
                <TouchableOpacity
                  onPress={state.handleDelete}
                  style={styles.dangerDeleteBtn}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
                  <Text style={styles.dangerDeleteBtnText}>Delete Master Song</Text>
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
      </SafeAreaView>
    </Modal>
  );
}
