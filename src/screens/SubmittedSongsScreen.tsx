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
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { api } from '../services/api';
import { GradientCard, Badge, SearchFilterBar, EmptyState } from '../components/ui';

interface Song {
  id: string;
  title: string;
  writer: string;
  leadSinger?: string;
  status: string;
  zoneName: string;
  zoneId?: string;
  createdAt: string;
  notes?: string;
  rejectNotes?: string;
  key?: string;
  tempo?: string;
  lyrics?: string;
  audioUrl?: string;
}

const FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Pending Review', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Rejected', value: 'rejected' },
];

export default function SubmittedSongsScreen({ navigation }: any) {
  const { activeZone } = useZoneContext();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('pending');
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Reject modal state
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingSong, setRejectingSong] = useState<Song | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchSongs = useCallback(async () => {
    try {
      const result = await api.submittedSongs.getAll(activeZone?.id);
      setSongs(Array.isArray(result.data) ? result.data : []);
    } catch (e) {
      console.error('[SubmittedSongs] fetch error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    setLoading(true);
    fetchSongs();
  }, [fetchSongs]);

  // Live updates via WebSocket
  useWebSocket('submitted-songs', 'all', () => { fetchSongs(); }, true);

  const onRefresh = () => {
    setRefreshing(true);
    fetchSongs();
  };

  async function handleApprove(song: Song) {
    Alert.alert('Approve Song', `Approve "${song.title}" for choir rehearsals?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: async () => {
          try {
            setSongs(prev => prev.map(s => (s.id === song.id ? { ...s, status: 'approved' } : s)));
            await api.submittedSongs.approve(song.id);
            Alert.alert('Approved', `"${song.title}" is now approved for setlists.`);
          } catch (e: any) {
            Alert.alert('Error', e.message || 'Failed to approve song.');
            fetchSongs();
          }
        },
      },
    ]);
  }

  function openRejectModal(song: Song) {
    setRejectingSong(song);
    setRejectReason('');
    setRejectModalVisible(true);
  }

  async function handleConfirmReject() {
    if (!rejectingSong) return;
    setSubmittingAction(true);
    try {
      const songId = rejectingSong.id;
      setSongs(prev => prev.map(s => (s.id === songId ? { ...s, status: 'rejected', rejectNotes: rejectReason } : s)));
      await api.submittedSongs.reject(songId, rejectReason.trim());
      setRejectModalVisible(false);
      Alert.alert('Declined', 'Song submission has been declined with your notes.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to decline song.');
      fetchSongs();
    } finally {
      setSubmittingAction(false);
    }
  }

  const counts = useMemo(() => {
    return {
      all: songs.length,
      pending: songs.filter(s => s.status === 'pending').length,
      approved: songs.filter(s => s.status === 'approved').length,
      rejected: songs.filter(s => s.status === 'rejected').length,
    };
  }, [songs]);

  const filterOptions = useMemo(() => {
    return [
      { label: 'All', value: 'all', count: counts.all },
      { label: 'Pending', value: 'pending', count: counts.pending },
      { label: 'Approved', value: 'approved', count: counts.approved },
      { label: 'Rejected', value: 'rejected', count: counts.rejected },
    ];
  }, [counts]);

  const filteredSongs = useMemo(() => {
    let list = songs;
    if (filter !== 'all') {
      list = list.filter(s => s.status === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        s =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.writer || '').toLowerCase().includes(q) ||
          (s.zoneName || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [songs, filter, search]);

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title="Song Review Desk" />

      {/* Control section */}
      <View style={styles.topSection}>
        <View style={styles.headingRow}>
          <Text style={styles.screenTitle}>Member Submissions</Text>
          {counts.pending > 0 && (
            <Badge label={`${counts.pending} Pending`} variant="pending" size="sm" />
          )}
        </View>

        <SearchFilterBar
          searchQuery={search}
          onSearchChange={setSearch}
          placeholder="Search by title, submitter, or zone..."
          filterOptions={filterOptions}
          activeFilter={filter}
          onFilterChange={setFilter}
        />
      </View>

      {/* Songs List */}
      <FlatList
        data={filteredSongs}
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
              icon="document-text-outline"
              title={search ? 'No Matching Submissions' : `No ${filter} Submissions`}
              description={
                search
                  ? 'Try searching with a different keyword.'
                  : 'Choir members who submit new songs will appear here for your review.'
              }
            />
          )
        }
        renderItem={({ item }) => {
          const isPending = item.status === 'pending';
          const isApproved = item.status === 'approved';
          const isExpanded = expandedId === item.id;

          return (
            <GradientCard
              variant={isPending ? 'surface' : 'glass'}
              style={styles.card}
            >
              {/* Header */}
              <View style={styles.cardHeader}>
                <View style={styles.titleArea}>
                  <Text style={styles.songTitle} numberOfLines={1}>
                    {item.title || 'Untitled Song'}
                  </Text>
                  <Text style={styles.writerText}>
                    Submitted by: <Text style={styles.writerHighlight}>{item.writer || 'Member'}</Text>
                  </Text>
                </View>

                <Badge
                  label={item.status.toUpperCase()}
                  variant={isApproved ? 'approved' : isPending ? 'pending' : 'rejected'}
                  size="sm"
                />
              </View>

              {/* Musical metadata tags */}
              <View style={styles.metaRow}>
                {item.key ? <Badge label={`Key: ${item.key}`} variant="key" size="sm" /> : null}
                {item.tempo ? <Badge label={`${item.tempo} BPM`} variant="tempo" size="sm" /> : null}
                {item.zoneName ? (
                  <View style={styles.zoneChip}>
                    <Ionicons name="location-outline" size={12} color={Colors.textMuted} />
                    <Text style={styles.zoneChipText} numberOfLines={1}>
                      {item.zoneName}
                    </Text>
                  </View>
                ) : null}
                {item.audioUrl ? (
                  <View style={styles.audioAttachedChip}>
                    <Ionicons name="volume-high-outline" size={13} color="#34d399" />
                    <Text style={styles.audioAttachedText}>Audio Attached</Text>
                  </View>
                ) : null}
              </View>

              {/* Expandable Lyrics & Submitter Notes */}
              {(item.lyrics || item.notes || item.rejectNotes) && (
                <TouchableOpacity
                  style={styles.expandToggle}
                  onPress={() => setExpandedId(isExpanded ? null : item.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.expandToggleText}>
                    {isExpanded ? 'Hide Lyrics & Notes' : 'View Lyrics & Submitter Notes'}
                  </Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={Colors.accentBright}
                  />
                </TouchableOpacity>
              )}

              {isExpanded && (
                <View style={styles.expandedContent}>
                  {item.notes ? (
                    <View style={styles.noteBox}>
                      <Text style={styles.noteTitle}>Submitter Notes:</Text>
                      <Text style={styles.noteBody}>{item.notes}</Text>
                    </View>
                  ) : null}

                  {item.rejectNotes ? (
                    <View style={[styles.noteBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)' }]}>
                      <Text style={[styles.noteTitle, { color: '#f87171' }]}>Feedback Given:</Text>
                      <Text style={[styles.noteBody, { color: '#fca5a5' }]}>{item.rejectNotes}</Text>
                    </View>
                  ) : null}

                  {item.lyrics ? (
                    <View style={styles.lyricsBox}>
                      <Text style={styles.noteTitle}>Lyrics:</Text>
                      <Text style={styles.lyricsText}>{item.lyrics}</Text>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Action Buttons for Pending submissions */}
              {isPending && (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => openRejectModal(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close-circle-outline" size={16} color="#f87171" style={{ marginRight: 4 }} />
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.approveBtn}
                    onPress={() => handleApprove(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark-circle" size={16} color="#ffffff" style={{ marginRight: 4 }} />
                    <Text style={styles.approveBtnText}>Approve for Rehearsal</Text>
                  </TouchableOpacity>
                </View>
              )}
            </GradientCard>
          );
        }}
      />

      {/* Decline Feedback Modal */}
      <Modal visible={rejectModalVisible} transparent animationType="fade" onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Decline Song Submission</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Provide constructive feedback to the singer explaining why this song cannot be scheduled:
            </Text>

            <TextInput
              style={styles.feedbackInput}
              placeholder="e.g. Needs harmonization revision, tempo adjustment, or lyrics alignment..."
              placeholderTextColor={Colors.textMuted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalConfirmDeclineBtn}
                onPress={handleConfirmReject}
                disabled={submittingAction}
              >
                {submittingAction ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.modalConfirmDeclineText}>Confirm Decline</Text>
                )}
              </TouchableOpacity>
            </View>
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
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 12,
  },
  card: {
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  titleArea: {
    flex: 1,
    marginRight: 10,
  },
  songTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  writerText: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  writerHighlight: {
    color: Colors.accentBright,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  zoneChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  zoneChipText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginLeft: 4,
  },
  audioAttachedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  audioAttachedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#34d399',
    marginLeft: 4,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 4,
  },
  expandToggleText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.accentBright,
  },
  expandedContent: {
    paddingTop: 8,
    paddingBottom: 4,
    gap: 8,
  },
  noteBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  noteTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  noteBody: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  lyricsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  lyricsText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontFamily: 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  declineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  declineBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#dc2626',
  },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 12,
  },
  approveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalBox: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
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
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
    marginBottom: 12,
  },
  feedbackInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    color: '#0f172a',
    fontSize: 14,
    height: 100,
    marginBottom: 16,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  modalConfirmDeclineBtn: {
    flex: 1.3,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  modalConfirmDeclineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
});
