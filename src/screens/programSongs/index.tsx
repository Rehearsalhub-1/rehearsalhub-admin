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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { EmptyState } from '../../components/ui';
import { api } from '../../services/api';
import { Program, PraiseSong } from './types';
import { styles } from './programSongsStyles';
import { formatDisplayDate, addSong, removeSong } from './programSongsUtils';
import { useProgramSongs } from './useProgramSongs';
import SongCard from './SongCard';
import SongDetailsModal from './SongDetailsModal';
import CloneFromMasterModal from './CloneFromMasterModal';
import CreateSongModal from './CreateSongModal';
import EditProgramModal from './EditProgramModal';
import ReorderCategoriesModal from './ReorderCategoriesModal';

export { addSong, removeSong };

export default function ProgramSongsScreen({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const initialProgram: Program = route.params?.program || {};
  const state = useProgramSongs(initialProgram);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── HIGH-END SLIM NAVIGATION BAR ────────────────────────────────────── */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.navBackBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.navTitleCenter}>
          <Text style={styles.navTitleText} numberOfLines={1}>
            {state.currentProgram.name || 'Setlist'}
          </Text>
          <Text style={styles.navMetaSub} numberOfLines={1}>
            {formatDisplayDate(state.currentProgram.date)}
            {state.currentProgram.location ? ` • ${state.currentProgram.location}` : ''}
          </Text>
        </View>

        {/* Action Button: opens clean action sheet */}
        <TouchableOpacity onPress={state.handleOpenActionMenu} style={styles.navActionBtn} activeOpacity={0.75}>
          <Ionicons name="ellipsis-horizontal" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {/* ── STREAMLINED METRICS & FILTER BAR ──────────────────────────────── */}
      <View style={styles.filterSection}>
        {/* Progress & Quick Actions Row */}
        <View style={styles.quickBar}>
          <View style={styles.progressPill}>
            <Text style={styles.progressPillText}>
              {state.pageMetrics.heard}/{state.pageMetrics.total} Heard ({state.pageMetrics.progressPercent}%)
            </Text>
          </View>

          <View style={{ flexDirection: 'row', gap: 6 }}>
            <TouchableOpacity
              style={styles.addBtnSmall}
              onPress={() => state.setCreateSongModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={15} color="#ffffff" style={{ marginRight: 2 }} />
              <Text style={styles.addBtnSmallText}>+ Song</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cloneBtnSmall}
              onPress={() => state.setCloneModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles" size={13} color="#7c3aed" style={{ marginRight: 3 }} />
              <Text style={styles.cloneBtnSmallText}>Clone</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Integrated Search Input */}
        <View style={styles.searchBarWrap}>
          <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchBarInput}
            placeholder="Search songs, singer, key..."
            placeholderTextColor="#94a3b8"
            value={state.searchQuery}
            onChangeText={state.setSearchQuery}
          />
          {state.searchQuery ? (
            <TouchableOpacity onPress={() => state.setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* 3-Tab Segmented Filter */}
        <View style={styles.segmentContainer}>
          {(['all', 'heard', 'unheard'] as const).map(f => {
            const active = state.statusFilter === f;
            const count = f === 'all' ? state.pageMetrics.total : f === 'heard' ? state.pageMetrics.heard : state.pageMetrics.unheard;
            const label = f === 'all' ? `All (${count})` : f === 'heard' ? `Heard (${count})` : `Unheard (${count})`;
            return (
              <TouchableOpacity
                key={f}
                style={[styles.segmentTab, active && styles.segmentTabActive]}
                onPress={() => state.setStatusFilter(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentTabText, active && styles.segmentTabTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Horizontal Category Chips Filter Bar */}
        {state.orderedCategories.length > 0 && (
          <View style={styles.categoryBarWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryBarScroll}>
              <TouchableOpacity
                style={[styles.catChip, state.selectedCategory === 'all' && styles.catChipActive]}
                onPress={() => state.setSelectedCategory('all')}
                activeOpacity={0.75}
              >
                <Text style={[styles.catChipText, state.selectedCategory === 'all' && styles.catChipTextActive]}>
                  All ({state.programSongs.length})
                </Text>
              </TouchableOpacity>

              {state.orderedCategories.map(cat => {
                const isSelected = state.selectedCategory === cat;
                const count = state.categoryCounts[cat] || 0;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, isSelected && styles.catChipActive]}
                    onPress={() => state.setSelectedCategory(isSelected ? 'all' : cat)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.catChipText, isSelected && styles.catChipTextActive]}>
                      {cat} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.reorderChipBtn}
                onPress={state.handleOpenReorderModal}
                activeOpacity={0.75}
              >
                <Ionicons name="swap-vertical" size={13} color="#7c3aed" style={{ marginRight: 3 }} />
                <Text style={styles.reorderChipText}>Reorder</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </View>

      {/* ── SETLIST QUEUE (TOUCH-FRIENDLY & UNCLUTTERED) ────────────────────── */}
      <FlatList
        data={state.filteredSongs}
        keyExtractor={i => i.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 20 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={state.fetchSongs}
            tintColor={Colors.accent}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          state.loading ? (
            <View style={{ paddingVertical: 50, alignItems: 'center' }}>
              <ActivityIndicator color={Colors.accent} size="large" />
            </View>
          ) : (
            <EmptyState
              icon="musical-notes-outline"
              title={state.searchQuery || state.statusFilter !== 'all' ? 'No matching songs' : 'Setlist is Empty'}
              description={
                state.searchQuery || state.statusFilter !== 'all'
                  ? 'Try changing the filter or search query.'
                  : 'Tap "+ Song" or "Clone" to add songs to this rehearsal.'
              }
              actionLabel="Add First Song"
              onAction={() => state.setCreateSongModalVisible(true)}
            />
          )
        }
        renderItem={({ item, index }) => (
          <SongCard
            item={item}
            index={index}
            onPress={() => {
              state.setSelectedSong(item);
              state.setDetailsModalVisible(true);
            }}
            onToggleActive={() => state.handleToggleSongActive(item)}
            onToggleHeard={() => state.handleToggleHeard(item)}
            onRemove={() => state.handleRemoveSong(item.id, item.title || 'this song')}
          />
        )}
      />

      {/* ── MODALS ────────────────────────────────────────────────────────── */}
      <SongDetailsModal
        visible={state.detailsModalVisible}
        song={state.selectedSong}
        programId={state.currentProgram.id}
        onClose={() => state.setDetailsModalVisible(false)}
        onSave={state.handleSongUpdated}
        onDelete={(songId) => {
          state.setProgramSongs(prev => prev.filter(s => s.id !== songId));
          api.songs.delete(songId).catch(() => {});
          state.setDetailsModalVisible(false);
        }}
      />

      <CloneFromMasterModal
        visible={state.cloneModalVisible}
        programId={state.currentProgram.id}
        existingIds={state.existingIds}
        onClose={() => state.setCloneModalVisible(false)}
        onCloned={state.handleSongCloned}
      />

      <CreateSongModal
        visible={state.createSongModalVisible}
        programId={state.currentProgram.id}
        existingIds={state.existingIds}
        onClose={() => state.setCreateSongModalVisible(false)}
        onCreated={state.handleSongCreated}
      />

      <EditProgramModal
        visible={state.editProgramModalVisible}
        program={state.currentProgram}
        onClose={() => state.setEditProgramModalVisible(false)}
        onSaved={updated => {
          if (updated) state.setCurrentProgram(p => ({ ...p, ...updated }));
          state.setEditProgramModalVisible(false);
        }}
      />

      <ReorderCategoriesModal
        visible={state.reorderModalVisible}
        onClose={() => state.setReorderModalVisible(false)}
        categoriesList={state.reorderCategoriesList}
        categoryCounts={state.categoryCounts}
        onMoveCategory={state.handleMoveCategory}
        onReset={state.handleResetReorder}
        onSave={state.handleSaveCategoryOrder}
        isSaving={state.isSavingCategoryOrder}
      />
    </SafeAreaView>
  );
}
