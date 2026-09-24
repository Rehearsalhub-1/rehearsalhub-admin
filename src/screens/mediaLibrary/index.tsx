import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ZoneHeader from '../../components/ZoneHeader';
import { styles } from './mediaLibraryStyles';
import { CATEGORY_TABS, MediaItem, MediaType, CategoryFilter } from './types';
import { inferMediaType, getYouTubeId, getYouTubeThumbnail, formatFileSize, formatDate } from './mediaLibraryUtils';
import { useMediaAudioPlayer } from './useMediaAudioPlayer';
import { useMediaLibraryState } from './useMediaLibraryState';
import MediaCard from './MediaCard';
import MediaMiniPlayer from './MediaMiniPlayer';
import MediaFullAudioModal from './MediaFullAudioModal';
import MediaVideoModal from './MediaVideoModal';
import MediaImageLightbox from './MediaImageLightbox';
import MediaRenameModal from './MediaRenameModal';
import MediaAddModal from './MediaAddModal';
import MediaBulkProgressModal from './MediaBulkProgressModal';

export type { MediaType, MediaItem, CategoryFilter };
export { inferMediaType, getYouTubeId, getYouTubeThumbnail, formatFileSize, formatDate };

export default function MediaLibraryScreen() {
  const audio = useMediaAudioPlayer();
  const state = useMediaLibraryState({
    stopCurrentAudio: audio.stopCurrentAudio,
    closeAudioPlayer: audio.closeAudioPlayer,
    handleTogglePlay: audio.handleTogglePlay,
    activeAudioItemId: audio.activeAudioItem?.id,
    onAudioItemUpdated: (updated) => {
      audio.setActiveAudioItem((prev) => (prev ? { ...prev, ...updated } : null));
    },
  });

  if (!state.adminUser?.isHQAdmin) {
    return (
      <SafeAreaView style={styles.safe}>
        <ZoneHeader title="Media Assets" showBack={false} />
        <View style={styles.accessNotice}>
          <Ionicons name="lock-closed-outline" size={42} color="#94a3b8" />
          <Text style={styles.emptyTitle}>HQ-managed media</Text>
          <Text style={styles.accessNoticeText}>
            Media Assets are managed by Headquarters and delivered to the mobile app.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: MediaItem }) => {
    const isCurrentActive = audio.activeAudioItem?.id === item.id;
    return (
      <MediaCard
        item={item}
        isCurrentActive={isCurrentActive}
        isCurrentPlaying={isCurrentActive && audio.isPlaying}
        isBuffering={isCurrentActive && audio.isBuffering}
        isSelected={state.selectedIds.has(item.id)}
        isSelectMode={state.isSelectMode}
        onToggleSelect={state.handleToggleSelect}
        onOpenMedia={state.handleOpenMedia}
        onTogglePlay={audio.handleTogglePlay}
        onOpenRename={state.handleOpenRename}
        onShare={state.handleShare}
        onDelete={state.handleDelete}
      />
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {/* Executive Clean Header */}
      <ZoneHeader
        title="Media Library"
        subtitle={
          state.isSelectMode
            ? `${state.selectedIds.size} of ${state.filteredItems.length} selected`
            : `${state.filteredItems.length} practice files available`
        }
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            {/* Select Mode Toggle */}
            <TouchableOpacity
              style={[styles.headerToolBtn, state.isSelectMode && styles.headerToolBtnActive]}
              onPress={() => {
                state.setIsSelectMode(!state.isSelectMode);
                if (state.isSelectMode) state.setSelectedIds(new Set());
              }}
              activeOpacity={0.8}
            >
              <Ionicons
                name={state.isSelectMode ? 'checkmark-done' : 'checkbox-outline'}
                size={16}
                color={state.isSelectMode ? '#ffffff' : '#7c3aed'}
              />
              <Text style={[styles.headerToolBtnText, state.isSelectMode && styles.headerToolBtnTextActive]}>
                {state.isSelectMode ? 'Done' : 'Select'}
              </Text>
            </TouchableOpacity>

            {/* Add Media Button */}
            {!state.isSelectMode ? (
              <TouchableOpacity
                style={styles.headerAddBtn}
                onPress={() => state.setModalVisible(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 2 }} />
                <Text style={styles.headerAddBtnText}>Add</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      {/* Select Mode Sub-Toolbar */}
      {state.isSelectMode ? (
        <View style={styles.selectToolbar}>
          <TouchableOpacity
            style={styles.selectToolTextBtn}
            onPress={state.handleSelectAll}
            activeOpacity={0.75}
          >
            <Ionicons
              name={state.selectedIds.size === state.filteredItems.length ? 'close-circle-outline' : 'checkbox-outline'}
              size={15}
              color="#7c3aed"
              style={{ marginRight: 4 }}
            />
            <Text style={styles.selectToolText}>
              {state.selectedIds.size === state.filteredItems.length ? 'Deselect All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Category Tabs Strip */}
      <View style={styles.tabsStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {CATEGORY_TABS.map((tab) => {
            const isSelected = state.activeTab === tab.id;
            const count = state.counts[tab.id];
            return (
              <TouchableOpacity
                key={tab.id}
                style={[styles.tabChip, isSelected && styles.tabChipSelected]}
                onPress={() => state.setActiveTab(tab.id)}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={tab.icon}
                  size={15}
                  color={isSelected ? '#ffffff' : '#64748b'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabChipText, isSelected && styles.tabChipTextSelected]}>
                  {tab.label}
                </Text>
                <View style={[styles.tabBadge, isSelected && styles.tabBadgeSelected]}>
                  <Text style={[styles.tabBadgeNum, isSelected && styles.tabBadgeNumSelected]}>
                    {count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#7c3aed" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stems, photos, videos, scores..."
            placeholderTextColor="#94a3b8"
            value={state.searchQuery}
            onChangeText={state.setSearchQuery}
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
          {state.searchQuery ? (
            <TouchableOpacity onPress={() => state.setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Toast Feedback */}
      {state.toastMsg ? (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 6 }} />
          <Text style={styles.toastText}>{state.toastMsg}</Text>
        </View>
      ) : null}

      {/* Media Items List */}
      <FlatList
        data={state.filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          state.isSelectMode ? { paddingBottom: 130 } : audio.activeAudioItem ? { paddingBottom: 110 } : undefined,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={state.onRefresh}
            tintColor="#7c3aed"
            colors={['#7c3aed']}
          />
        }
        ListEmptyComponent={
          state.loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#7c3aed" />
              <Text style={styles.emptySubText}>Loading rehearsal media...</Text>
            </View>
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconBox}>
                <Ionicons name={state.loadError ? 'cloud-offline-outline' : 'musical-notes-outline'} size={32} color={state.loadError ? '#dc2626' : '#7c3aed'} />
              </View>
              <Text style={styles.emptyTitle}>
                {state.loadError ? 'Media could not be loaded' : state.searchQuery ? 'No Results Found' : 'No Media Uploaded Yet'}
              </Text>
              <Text style={styles.emptySubText}>
                {state.loadError
                  ? state.loadError
                  : state.searchQuery
                  ? 'Try searching for a different name or change category filters.'
                  : 'Tap "Add" to upload audio stems, photos, videos, or sheet music.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => (state.loadError ? state.loadMedia() : state.setModalVisible(true))}
                activeOpacity={0.8}
              >
                <Ionicons name={state.loadError ? 'refresh' : 'add'} size={18} color="#ffffff" style={{ marginRight: 4 }} />
                <Text style={styles.emptyBtnText}>{state.loadError ? 'Try Again' : 'Add First Media'}</Text>
              </TouchableOpacity>
            </View>
          )
        }
      />

      {/* 1. Floating Bottom Bar in Select Mode */}
      {state.isSelectMode ? (
        <View style={styles.floatingSelectBar}>
          <View style={styles.floatingSelectBarLeft}>
            <Text style={styles.selectBarCount}>
              {state.selectedIds.size > 0 ? `${state.selectedIds.size} Selected` : 'Select Files'}
            </Text>
            <Text style={styles.selectBarSub}>
              {state.selectedIds.size > 0 ? 'Ready for bulk download' : 'Tap items to select'}
            </Text>
          </View>

          <View style={styles.floatingSelectBarRight}>
            <TouchableOpacity style={styles.exportCsvBtn} onPress={state.handleExportCSV} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={15} color="#7c3aed" style={{ marginRight: 4 }} />
              <Text style={styles.exportCsvText}>CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bulkDownloadBtn, state.selectedIds.size === 0 && styles.bulkDownloadBtnDisabled]}
              onPress={state.handleBulkDownload}
              disabled={state.selectedIds.size === 0}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-download" size={16} color="#ffffff" style={{ marginRight: 5 }} />
              <Text style={styles.bulkDownloadText}>
                {state.selectedIds.size > 0 ? `Download (${state.selectedIds.size})` : 'Download'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* 2. Floating In-App Audio Mini-Player Bar */}
      {!state.isSelectMode && audio.activeAudioItem ? (
        <MediaMiniPlayer
          activeAudioItem={audio.activeAudioItem}
          playbackPos={audio.playbackPos}
          playbackDur={audio.playbackDur}
          isPlaying={audio.isPlaying}
          isBuffering={audio.isBuffering}
          onOpenFullPlayer={() => audio.setShowFullPlayerModal(true)}
          onSeekRelative={audio.handleSeekRelative}
          onTogglePlay={audio.handleTogglePlay}
          onClose={audio.closeAudioPlayer}
        />
      ) : null}

      {/* 3. Bulk Download Progress Modal */}
      <MediaBulkProgressModal
        visible={state.bulkDownloading}
        bulkProgress={state.bulkProgress}
      />

      {/* 4. Full In-App Audio Player Modal */}
      <MediaFullAudioModal
        visible={audio.showFullPlayerModal}
        activeAudioItem={audio.activeAudioItem}
        playbackPos={audio.playbackPos}
        playbackDur={audio.playbackDur}
        isPlaying={audio.isPlaying}
        isBuffering={audio.isBuffering}
        onClose={() => audio.setShowFullPlayerModal(false)}
        onShare={state.handleShare}
        onSeekRelative={audio.handleSeekRelative}
        onTogglePlay={audio.handleTogglePlay}
      />

      {/* 5. In-App Video Player Modal */}
      <MediaVideoModal
        activeVideoItem={state.activeVideoItem}
        onClose={() => state.setActiveVideoItem(null)}
      />

      {/* 6. In-App Image Lightbox Modal */}
      <MediaImageLightbox
        activeImageItem={state.activeImageItem}
        onClose={() => state.setActiveImageItem(null)}
        onShare={state.handleShare}
      />

      {/* 7. Rename Asset Modal */}
      <MediaRenameModal
        renamingItem={state.renamingItem}
        renameTitle={state.renameTitle}
        setRenameTitle={state.setRenameTitle}
        renameCategory={state.renameCategory}
        setRenameCategory={state.setRenameCategory}
        renameNotes={state.renameNotes}
        setRenameNotes={state.setRenameNotes}
        renaming={state.renaming}
        onClose={() => state.setRenamingItem(null)}
        onSave={state.handleSaveRename}
      />

      {/* 8. Add Media Modal */}
      <MediaAddModal
        visible={state.modalVisible}
        inputSource={state.inputSource}
        setInputSource={state.setInputSource}
        selectedFile={state.selectedFile}
        selectedFiles={state.selectedFiles}
        onRemoveSelectedFile={state.handleRemoveSelectedFile}
        bulkUploadProgress={state.bulkUploadProgress}
        formTitle={state.formTitle}
        setFormTitle={state.setFormTitle}
        formUrl={state.formUrl}
        setFormUrl={state.setFormUrl}
        formCategory={state.formCategory}
        setFormCategory={state.setFormCategory}
        formNotes={state.formNotes}
        setFormNotes={state.setFormNotes}
        saving={state.saving}
        onPickDocument={state.handlePickDocument}
        onClose={() => state.setModalVisible(false)}
        onSave={state.handleSaveAsset}
      />
    </SafeAreaView>
  );
}

export { MediaLibraryScreen, MediaLibraryScreen as MediaScreen };
