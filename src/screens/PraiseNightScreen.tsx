import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { GradientCard, Badge, SearchFilterBar, EmptyState } from '../components/ui';

interface Program {
  id: string;
  name: string;
  date: string;
  category: string;
  status?: string;
  location: string;
  scope: string;
  zoneId: string;
  songs?: any[];
  songIds?: any[];
}

const TABS = [
  { label: 'All', value: 'all' },
  { label: 'Live / Ongoing', value: 'ongoing' },
  { label: 'Pre-Rehearsal', value: 'pre-rehearsal' },
  { label: 'Archived', value: 'archive' },
];

export default function PraiseNightScreen({ navigation }: any) {
  const { activeZone } = useZoneContext();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [showProgramModal, setShowProgramModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);
  const [form, setForm] = useState({ name: '', date: '', location: '', category: 'pre-rehearsal' });
  const [formError, setFormError] = useState('');
  const [savingProgram, setSavingProgram] = useState(false);

  const fetchPrograms = useCallback(async () => {
    try {
      const result = await api.programs.getAll(activeZone?.id);
      setPrograms(Array.isArray(result.data) ? result.data : []);
    } catch (e) {
      console.error('[PraiseNight] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    fetchPrograms();
  }, [fetchPrograms]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchPrograms();
  };

  async function handleStatusChange(program: Program, newStatus: string) {
    try {
      setActionLoadingId(program.id);
      await api.programs.update(program.id, { status: newStatus });
      fetchPrograms();
    } catch (err: any) {
      Alert.alert('Status Error', err.message || 'Failed to update program status');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDuplicate(program: Program) {
    Alert.alert('Duplicate Program', `Create a new copy of "${program.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Duplicate',
        onPress: async () => {
          try {
            setActionLoadingId(program.id);
            await api.programs.create({
              name: `${program.name} (Copy)`,
              date: new Date().toLocaleDateString('en-CA'),
              category: program.category,
              status: 'pre-rehearsal',
              location: program.location,
              songIds: Array.isArray(program.songIds) ? program.songIds : [],
              zoneId: activeZone?.id ?? '',
            });
            Alert.alert('Success', 'Program and setlist duplicated.');
            fetchPrograms();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to duplicate program.');
          } finally {
            setActionLoadingId(null);
          }
        },
      },
    ]);
  }

  async function handleDelete(program: Program) {
    Alert.alert('Delete Program', `Are you sure you want to delete "${program.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setActionLoadingId(program.id);
            await api.programs.delete(program.id);
            fetchPrograms();
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to delete program.');
          } finally {
            setActionLoadingId(null);
          }
        },
      },
    ]);
  }

  function openCreateModal() {
    setEditingProgram(null);
    setForm({
      name: '',
      date: new Date().toLocaleDateString('en-CA'),
      location: '',
      category: 'pre-rehearsal',
    });
    setFormError('');
    setShowProgramModal(true);
  }

  function openEditModal(program: Program) {
    setEditingProgram(program);
    setForm({
      name: program.name || '',
      date: program.date || '',
      location: program.location || '',
      category: program.category || 'pre-rehearsal',
    });
    setFormError('');
    setShowProgramModal(true);
  }

  async function handleSaveProgram() {
    if (!form.name.trim()) {
      setFormError('Program name is required.');
      return;
    }
    setSavingProgram(true);
    try {
      if (editingProgram) {
        await api.programs.update(editingProgram.id, {
          name: form.name.trim(),
          date: form.date.trim(),
          location: form.location.trim(),
          category: form.category,
        });
      } else {
        await api.programs.create({
          name: form.name.trim(),
          date: form.date.trim(),
          location: form.location.trim(),
          category: form.category,
          status: form.category,
          zoneId: activeZone?.id ?? '',
        });
      }
      setShowProgramModal(false);
      fetchPrograms();
    } catch (e: any) {
      setFormError(e.message || 'Failed to save program.');
    } finally {
      setSavingProgram(false);
    }
  }

  const filteredPrograms = useMemo(() => {
    let list = programs;
    if (selectedTab !== 'all') {
      list = list.filter(p => (p.status || p.category) === selectedTab);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p => (p.name || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [programs, selectedTab, searchQuery]);

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Programs & Rehearsals" />

      {/* Search and Tabs */}
      <View style={styles.topControlSection}>
        <View style={styles.titleRow}>
          <Text style={styles.screenHeading}>Rehearsal Programs</Text>
          <TouchableOpacity style={styles.createBtn} onPress={openCreateModal} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.createBtnText}>New Program</Text>
          </TouchableOpacity>
        </View>

        <SearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          placeholder="Search programs by name or venue..."
          filterOptions={TABS}
          activeFilter={selectedTab}
          onFilterChange={setSelectedTab}
        />
      </View>

      {/* Programs List */}
      <FlatList
        data={filteredPrograms}
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
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={Colors.accentBright} size="large" />
            </View>
          ) : (
            <EmptyState
              icon="calendar-outline"
              title={searchQuery ? 'No matching programs' : 'No Rehearsal Programs'}
              description={
                searchQuery
                  ? 'Try a different search keyword.'
                  : 'Create your first praise night or rehearsal setlist.'
              }
              actionLabel="Create Program"
              onAction={openCreateModal}
            />
          )
        }
        renderItem={({ item }) => {
          const isOngoing = (item.status || item.category) === 'ongoing';
          const isPreRehearsal = (item.status || item.category) === 'pre-rehearsal';
          const songCount = Array.isArray(item.songIds)
            ? item.songIds.length
            : Array.isArray(item.songs)
            ? item.songs.length
            : 0;

          return (
            <GradientCard
              variant={isOngoing ? 'glow' : 'surface'}
              style={styles.programCard}
              onPress={() => navigation.navigate('ProgramSongs', { program: item })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardBadgeRow}>
                  <Badge
                    label={isOngoing ? 'LIVE REHEARSAL' : isPreRehearsal ? 'PRE-REHEARSAL' : 'ARCHIVED'}
                    variant={isOngoing ? 'live' : isPreRehearsal ? 'prerehearsal' : 'archived'}
                    pulse={isOngoing}
                    size="sm"
                  />
                  {item.date ? <Text style={styles.cardDate}>{item.date}</Text> : null}
                </View>

                {actionLoadingId === item.id ? (
                  <ActivityIndicator size="small" color={Colors.accentBright} />
                ) : (
                  <View style={styles.cardMenuButtons}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => openEditModal(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleDuplicate(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="copy-outline" size={18} color={Colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() => handleDelete(item)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={18} color="#f87171" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={styles.programTitle} numberOfLines={2}>
                {item.name}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaChip}>
                  <Ionicons name="musical-notes" size={14} color={Colors.accentBright} style={{ marginRight: 4 }} />
                  <Text style={styles.metaChipText}>{songCount} Songs</Text>
                </View>

                {item.location ? (
                  <View style={styles.metaChip}>
                    <Ionicons name="location" size={14} color={Colors.textMuted} style={{ marginRight: 4 }} />
                    <Text style={styles.metaChipText} numberOfLines={1}>
                      {item.location}
                    </Text>
                  </View>
                ) : null}
              </View>

              {/* Action Buttons */}
              <View style={styles.cardActionsRow}>
                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => navigation.navigate('ProgramSongs', { program: item })}
                  activeOpacity={0.75}
                >
                  <Ionicons name="list" size={15} color={Colors.textPrimary} style={{ marginRight: 6 }} />
                  <Text style={styles.secondaryBtnText}>Setlist Queue</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.primaryBtn, isOngoing && styles.primaryLiveBtn]}
                  onPress={() => navigation.navigate('LiveConductor', { program: item })}
                  activeOpacity={0.8}
                >
                  <Ionicons name="radio" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.primaryBtnText}>Live Conductor</Text>
                </TouchableOpacity>
              </View>

              {/* Quick Status Toggler */}
              <View style={styles.statusToggleRow}>
                <Text style={styles.statusLabel}>Session Status:</Text>
                <TouchableOpacity
                  style={[styles.statusOptionPill, isOngoing && styles.statusOptionActive]}
                  onPress={() => handleStatusChange(item, isOngoing ? 'pre-rehearsal' : 'ongoing')}
                >
                  <Text style={[styles.statusOptionText, isOngoing && styles.statusOptionTextActive]}>
                    {isOngoing ? 'Mark Completed' : 'Start Live Session'}
                  </Text>
                </TouchableOpacity>
              </View>
            </GradientCard>
          );
        }}
      />

      {/* Program Create / Edit Modal */}
      <Modal visible={showProgramModal} transparent animationType="fade" onRequestClose={() => setShowProgramModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProgram ? 'Edit Program' : 'New Rehearsal Program'}</Text>
              <TouchableOpacity onPress={() => setShowProgramModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {formError ? <Text style={styles.formErrorText}>{formError}</Text> : null}

            <Text style={styles.inputLabel}>PROGRAM NAME *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Praise Night 27 Preparatory"
              placeholderTextColor={Colors.textMuted}
              value={form.name}
              onChangeText={t => setForm(prev => ({ ...prev, name: t }))}
            />

            <Text style={styles.inputLabel}>REHEARSAL DATE (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={Colors.textMuted}
              value={form.date}
              onChangeText={t => setForm(prev => ({ ...prev, date: t }))}
            />

            <Text style={styles.inputLabel}>VENUE / LOCATION</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Main Auditorium / Zonal Studio"
              placeholderTextColor={Colors.textMuted}
              value={form.location}
              onChangeText={t => setForm(prev => ({ ...prev, location: t }))}
            />

            <Text style={styles.inputLabel}>PROGRAM STAGE</Text>
            <View style={styles.stageOptionsRow}>
              {(['pre-rehearsal', 'ongoing', 'archive'] as const).map(stage => {
                const isSelected = form.category === stage;
                return (
                  <TouchableOpacity
                    key={stage}
                    style={[styles.stageChip, isSelected && styles.stageChipActive]}
                    onPress={() => setForm(prev => ({ ...prev, category: stage }))}
                  >
                    <Text style={[styles.stageChipText, isSelected && styles.stageChipTextActive]}>
                      {stage === 'ongoing' ? 'Ongoing' : stage === 'pre-rehearsal' ? 'Preparation' : 'Archive'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={styles.modalSaveBtn}
              onPress={handleSaveProgram}
              disabled={savingProgram}
              activeOpacity={0.8}
            >
              {savingProgram ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.modalSaveText}>{editingProgram ? 'Save Changes' : 'Create Program'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topControlSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  screenHeading: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 14,
  },
  programCard: {
    borderRadius: 18,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  cardMenuButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    padding: 4,
  },
  programTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
    paddingVertical: 10,
    borderRadius: 12,
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryLiveBtn: {
    backgroundColor: '#ef4444',
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  statusToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 8,
  },
  statusLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  statusOptionPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  statusOptionActive: {
    backgroundColor: '#ecfdf5',
  },
  statusOptionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  statusOptionTextActive: {
    color: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  formErrorText: {
    color: '#ef4444',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 0.5,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    height: 44,
    color: '#0f172a',
    fontSize: 14,
  },
  stageOptionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    marginBottom: 16,
  },
  stageChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  stageChipActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  stageChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  stageChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  modalSaveBtn: {
    backgroundColor: '#7c3aed',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
});
