import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  SectionList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import ZoneHeader from '../../components/ZoneHeader';
import { useZoneContext } from '../../context/ZoneContext';
import { api } from '../../services/api';
import { EmptyState } from '../../components/ui';
import { customAlert } from '../../context/AlertContext';
import { usePrograms, Program } from '../../hooks/usePrograms';
import { styles } from './programsStyles';
import ProgramCardItem, { ProgramStats } from './ProgramCard';
import ProgramModal, { ProgramModalProps } from './ProgramModal';
import ProgramsFilterBar from './ProgramsFilterBar';
import {
  formatDisplayDate,
  getProgramYear,
  getDatePresets,
  normalizeProgramStage,
  type ProgramStage,
} from './programUtils';

export {
  ProgramModal,
  normalizeProgramStage,
  formatDisplayDate,
  getProgramYear,
  getDatePresets,
};
export type { ProgramModalProps, ProgramStage };

export function ProgramsScreen({ navigation }: any) {
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();
  const { programs, allSongs, loading, refreshing, refetch, upsertProgram, removeProgram } = usePrograms();

  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId] = useState<string | null>(null);

  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  const onRefresh = refetch;

  const handleProgramSaved = useCallback((savedProg?: any) => {
    if (!savedProg) return;
    upsertProgram(savedProg);
  }, [upsertProgram]);

  const handleDuplicate = useCallback((program: Program) => {
    customAlert('Duplicate Program', `Create a copy of "${program.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate',
        onPress: async () => {
          const copyPayload = {
            name: `${program.name} (Copy)`,
            date: new Date().toLocaleDateString('en-CA'),
            location: program.location,
            category: 'pre-rehearsal',
            status: 'pre-rehearsal',
            organizationId: program.organizationId || (program as any).zoneId,
            zoneId: (program as any).zoneId || program.organizationId,
            groupId: program.groupId || (program as any).subGroupId,
            subGroupId: (program as any).subGroupId || program.groupId,
            scope: (program as any).scope,
            songIds: program.songIds || [],
          };
          const res = await api.programs.create(copyPayload).catch(() => null);
          const copy = res?.data || {
            ...program,
            ...copyPayload,
            id: `prog-${Date.now()}`,
          };
          upsertProgram(copy);
          customAlert('Duplicated', 'Program duplicated successfully.');
        },
      },
    ]);
  }, [upsertProgram]);

  const handleDelete = useCallback((program: Program) => {
    customAlert('Delete Program', `Delete "${program.name}" permanently?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await api.programs.delete(program.id).catch(() => {});
          removeProgram(program.id);
        },
      },
    ]);
  }, [removeProgram]);

  const handleOpenMenu = useCallback(
    (program: Program) => {
      customAlert(
        program.name,
        'Manage this rehearsal program',
        [
          {
            text: 'Edit Details',
            onPress: () => {
              setEditingProgram(program);
              setShowProgramModal(true);
            },
          },
          {
            text: 'Duplicate',
            onPress: () => handleDuplicate(program),
          },
          {
            text: 'Delete Program',
            style: 'destructive',
            onPress: () => handleDelete(program),
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
        { cancelable: true }
      );
    },
    [handleDuplicate, handleDelete]
  );

  const filteredPrograms = useMemo(() => {
    let list = [...programs];
    if (selectedTab !== 'all') {
      list = list.filter(p => normalizeProgramStage(p) === selectedTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          (p.name || '').toLowerCase().includes(q) ||
          (p.location || '').toLowerCase().includes(q) ||
          (p.pageCategory || '').toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      const aOngoing = normalizeProgramStage(a) === 'ongoing';
      const bOngoing = normalizeProgramStage(b) === 'ongoing';
      if (aOngoing && !bOngoing) return -1;
      if (!aOngoing && bOngoing) return 1;
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return (isNaN(dateB) ? 0 : dateB) - (isNaN(dateA) ? 0 : dateA);
    });
    return list;
  }, [programs, selectedTab, searchQuery]);

  const groupedPrograms = useMemo(() => {
    const groups: { year: string; data: Program[] }[] = [];
    filteredPrograms.forEach(p => {
      const yr = getProgramYear(p.date);
      const last = groups[groups.length - 1];
      if (last && last.year === yr) {
        last.data.push(p);
      } else {
        groups.push({ year: yr, data: [p] });
      }
    });
    return groups;
  }, [filteredPrograms]);

  const songStatsMap = useMemo(() => {
    const map: Record<string, ProgramStats> = {};
    if (!allSongs || allSongs.length === 0) return map;

    for (let i = 0; i < allSongs.length; i++) {
      const s = allSongs[i];
      const sPid = s.praiseNightId || s.praisenightid || s.praisenight_id || s.programId || s.pageId;
      if (!sPid) continue;
      const key = String(sPid);
      if (!map[key]) {
        map[key] = { songCount: 0, heardCount: 0, percent: 0 };
      }
      map[key].songCount++;
      if (s.status === 'heard' || s.isHeard || s.heard) {
        map[key].heardCount++;
      }
    }

    for (const key in map) {
      const stats = map[key];
      stats.percent = stats.songCount > 0 ? Math.round((stats.heardCount / stats.songCount) * 100) : 0;
    }
    return map;
  }, [allSongs]);

  const renderItem = useCallback(
    ({ item }: { item: Program }) => {
      const stage = normalizeProgramStage(item);
      const isOngoing = stage === 'ongoing';
      const isPreRehearsal = stage === 'pre-rehearsal';

      let stats = songStatsMap[String(item.id)];
      if (!stats) {
        const itemSongs = Array.isArray(item.songs) ? item.songs : [];
        const songCount = Array.isArray(item.songIds) && item.songIds.length > 0
          ? item.songIds.length
          : itemSongs.length;
        const heardCount = itemSongs.filter((s: any) => s.status === 'heard' || s.isHeard || s.heard).length;
        const percent = songCount > 0 ? Math.round((heardCount / songCount) * 100) : 0;
        stats = { songCount, heardCount, percent };
      }

      return (
        <ProgramCardItem
          item={item}
          stats={stats}
          isOngoing={isOngoing}
          isPreRehearsal={isPreRehearsal}
          isLoadingAction={actionLoadingId === item.id}
          onPress={() => navigation.navigate('ProgramSongs', { program: item })}
          onMenu={() => handleOpenMenu(item)}
        />
      );
    },
    [songStatsMap, actionLoadingId, navigation, handleOpenMenu]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader
        title={isChurchMode ? 'Church Programs' : 'Programs'}
        subtitle={
          isChurchMode
            ? (activeChurch?.name || 'Local church rehearsals & setlists')
            : (activeZone?.name || 'Rehearsal programs & setlists')
        }
        rightElement={
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => { setEditingProgram(null); setShowProgramModal(true); }}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.createBtnText}>New</Text>
          </TouchableOpacity>
        }
      />

      <ProgramsFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTab={selectedTab}
        onSelectTab={setSelectedTab}
      />

      <SectionList
        sections={groupedPrograms}
        keyExtractor={i => i.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.accentBright}
            colors={[Colors.accentBright]}
          />
        }
        renderSectionHeader={({ section: { year, data } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionYearText}>{year}</Text>
            <View style={styles.sectionLine} />
            <View style={styles.sectionCountBadge}>
              <Text style={styles.sectionCountText}>{data.length}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.accentBright} size="large" />
            </View>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title={searchQuery ? 'No matching programs' : 'No Programs Found'}
              description={
                searchQuery
                  ? 'Try a different search keyword.'
                  : isChurchMode
                  ? `No rehearsal programs scheduled for ${activeChurch?.name || 'this church choir'}.`
                  : 'No rehearsal programs scheduled for this zone.'
              }
            />
          )
        }
        renderItem={renderItem}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={5}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews={Platform.OS === 'android'}
      />

      <ProgramModal
        visible={showProgramModal}
        editingProgram={editingProgram}
        activeZoneId={activeZone?.id}
        isChurchMode={isChurchMode}
        activeChurchId={activeChurch?.id}
        onClose={() => setShowProgramModal(false)}
        onSaved={handleProgramSaved}
      />
    </SafeAreaView>
  );
}

export { ProgramsScreen as ProgramScreen };
export default ProgramsScreen;
