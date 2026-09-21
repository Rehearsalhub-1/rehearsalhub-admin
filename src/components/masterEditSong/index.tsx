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
  { id: 'details', label: 'Details', icon: 'information-circle-outline' },
  { id: 'audio', label: 'Audio & Stems', icon: 'musical-notes-outline' },
  { id: 'lyrics', label: 'Lyrics & Guide', icon: 'document-text-outline' },
  { id: 'access', label: 'Access Control', icon: 'shield-checkmark-outline' },
] as const;

export default function MasterEditSongModal({
  visible,
  song,
  mode = 'edit',
  onClose,
  onSaved,
}: MasterEditSongModalProps) {
  const insets = useSafeAreaInsets();
  const state = useMasterEditSongState({ visible, song, mode, onClose, onSaved });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Top Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelBtn} activeOpacity={0.7}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {state.isCreate ? 'Add Master Song' : 'Edit Master Song'}
            </Text>
            {state.isHQOnly && (
              <View style={styles.hqIndicator}>
                <Text style={styles.hqIndicatorText}>HQ</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={state.handleSave}
            style={[styles.saveBtn, !state.title.trim() && styles.saveBtnDisabled]}
            disabled={state.saving || !state.title.trim()}
            activeOpacity={0.8}
          >
            {state.saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 4 Tabs Bar (Web Admin Parity) */}
        <View style={styles.tabsRow}>
          {TABS.map(t => {
            const isActive = state.activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => state.setActiveTab(t.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon as any}
                  size={14}
                  color={isActive ? '#7c3aed' : '#64748b'}
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.tabBtnText, isActive && styles.tabBtnTextActive]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
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
