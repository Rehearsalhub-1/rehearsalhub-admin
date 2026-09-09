import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useZoneContext } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { EmptyState } from '../components/ui';
import SubmissionReviewModal, {
  SongSubmission,
  SongSubmissionMessage,
  QUICK_FEEDBACK_CHIPS,
  getCleanSubmitterName,
} from '../components/SubmissionReviewModal';

export const INITIAL_SUBMISSIONS: SongSubmission[] = [];

export default function SubmittedSongsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { activeZone } = useZoneContext();

  const [songs, setSongs] = useState<SongSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Review Studio Modal
  const [selectedSong, setSelectedSong] = useState<SongSubmission | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  // Quick Reject Dialog
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingSong, setRejectingSong] = useState<SongSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Audio stream for quick play on cards
  const soundRef = useRef<Audio.Sound | null>(null);
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);

  const fetchSongs = useCallback(async () => {
    try {
      const result = await api.submittedSongs.getAll(activeZone?.id);
      setSongs(Array.isArray(result?.data) ? result.data : []);
    } catch (e) {
      console.log('[SubmittedSongs] fetch error note:', e);
      setSongs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeZone?.id]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  // Audio cleanup
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  // Quick audio toggle on song card
  async function handleToggleQuickAudio(song: SongSubmission) {
    const url = song.audioUrl || song.rawData?.audioUrl;
    if (!url) {
      Alert.alert('No Audio', 'No audio track uploaded with this submission.');
      return;
    }

    try {
      if (playingSongId === song.id && soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
        setPlayingSongId(null);
        return;
      }

      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(() => {});
        await soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }

      setPlayingSongId(song.id);
      const { sound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        status => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingSongId(null);
          }
        }
      );
      soundRef.current = sound;
    } catch (e) {
      console.log('Quick audio play error:', e);
      setPlayingSongId(null);
    }
  }

  // Handle Approve
  function handleApproveSong(song: SongSubmission) {
    Alert.alert('Approve Song', `Approve "${song.title}" for choir rehearsals?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve',
        onPress: () => {
          setSongs(prev =>
            prev.map(s => (s.id === song.id ? { ...s, status: 'approved' } : s))
          );
          if (selectedSong?.id === song.id) {
            setSelectedSong(prev => (prev ? { ...prev, status: 'approved' } : null));
          }
          api.submittedSongs.approve(song.id).catch(() => {});
        },
      },
    ]);
  }

  // Handle Reject Modal Open
  function handleOpenRejectModal(song: SongSubmission) {
    setRejectingSong(song);
    setRejectReason('');
    setRejectModalVisible(true);
  }

  // Confirm Reject
  function handleConfirmReject() {
    if (!rejectingSong) return;
    if (!rejectReason.trim()) {
      Alert.alert('Feedback Required', 'Please provide a reason or constructive notes.');
      return;
    }

    const songId = rejectingSong.id;
    const notes = rejectReason.trim();

    setSongs(prev =>
      prev.map(s => (s.id === songId ? { ...s, status: 'rejected', rejectNotes: notes } : s))
    );
    if (selectedSong?.id === songId) {
      setSelectedSong(prev => (prev ? { ...prev, status: 'rejected', rejectNotes: notes } : null));
    }

    api.submittedSongs.reject(songId, notes).catch(() => {});
    setRejectModalVisible(false);
    setRejectingSong(null);
  }

  // Handle Delete
  function handleDeleteSong(song: SongSubmission) {
    Alert.alert('Delete Submission', `Delete "${song.title}" from submission review queue?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setSongs(prev => prev.filter(s => s.id !== song.id));
          if (selectedSong?.id === song.id) {
            setSelectedSong(null);
            setReviewModalVisible(false);
          }
        },
      },
    ]);
  }

  // Handle Send Message in Studio
  async function handleSendMessage(songId: string, message: string, replyTo?: any) {
    const newMessage: SongSubmissionMessage = {
      id: `msg-${Date.now()}`,
      sender: 'admin',
      senderName: 'Admin Reviewer',
      message: message.trim(),
      timestamp: new Date().toISOString(),
      replyTo: replyTo
        ? {
            id: replyTo.id,
            text: replyTo.message,
            senderName: replyTo.senderName,
          }
        : null,
    };

    setSongs(prev =>
      prev.map(s => {
        if (s.id === songId) {
          const conversation = [...(s.conversation || []), newMessage];
          return { ...s, conversation };
        }
        return s;
      })
    );

    if (selectedSong?.id === songId) {
      setSelectedSong(prev =>
        prev ? { ...prev, conversation: [...(prev.conversation || []), newMessage] } : null
      );
    }

    api.submittedSongs.reply(songId, message.trim(), 'Admin Reviewer', replyTo).catch(() => {});
  }

  // Filtered & Sorted Submissions
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      if (filter !== 'all' && (song.status || 'pending') !== filter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sub = getCleanSubmitterName(song);
        const matchesTitle = (song.title || '').toLowerCase().includes(q);
        const matchesWriter = (song.writer || song.artist || '').toLowerCase().includes(q);
        const matchesSubmitter = sub.name.toLowerCase().includes(q);
        const matchesCategory = (song.category || '').toLowerCase().includes(q);
        const matchesKey = (song.key || '').toLowerCase().includes(q);
        const matchesZone = (song.zoneName || '').toLowerCase().includes(q);
        if (
          !matchesTitle &&
          !matchesWriter &&
          !matchesSubmitter &&
          !matchesCategory &&
          !matchesKey &&
          !matchesZone
        ) {
          return false;
        }
      }

      return true;
    });
  }, [songs, filter, searchQuery]);

  // Counts Calculation
  const counts = useMemo(() => {
    return {
      all: songs.length,
      pending: songs.filter(s => s.status === 'pending' || !s.status).length,
      approved: songs.filter(s => s.status === 'approved').length,
      rejected: songs.filter(s => s.status === 'rejected').length,
    };
  }, [songs]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── UNIFIED CLEAN CONTROL BAR (Web Admin Parity) ────────────────────── */}
      <View style={styles.controlBarCard}>
        {/* Top Branding Row */}
        <View style={styles.topTitleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="cloud-upload" size={20} color="#7c3aed" />
            <Text style={styles.screenHeading}>Submitted Songs</Text>
            <View style={styles.totalBadge}>
              <Text style={styles.totalBadgeText}>{counts.all}</Text>
            </View>
          </View>

          {/* View Mode Toggle & Refresh */}
          <View style={styles.viewModeToggleRow}>
            <View style={styles.toggleSegment}>
              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'grid' && styles.toggleBtnActive]}
                onPress={() => setViewMode('grid')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="grid-outline"
                  size={14}
                  color={viewMode === 'grid' ? '#7c3aed' : '#64748b'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toggleBtn, viewMode === 'list' && styles.toggleBtnActive]}
                onPress={() => setViewMode('list')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="list-outline"
                  size={15}
                  color={viewMode === 'list' ? '#7c3aed' : '#64748b'}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.refreshIconBtn}
              onPress={() => {
                setRefreshing(true);
                fetchSongs();
              }}
              activeOpacity={0.75}
            >
              <Ionicons name="refresh" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Minimal Status Tabs: All | Pending | Approved | Rejected */}
        <View style={styles.statusTabsRow}>
          <TouchableOpacity
            style={[styles.statusTabBtn, filter === 'all' && styles.statusTabBtnAllActive]}
            onPress={() => setFilter('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.statusTabText, filter === 'all' && styles.statusTabTextActive]}>
              All ({counts.all})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusTabBtn, filter === 'pending' && styles.statusTabBtnPendingActive]}
            onPress={() => setFilter('pending')}
            activeOpacity={0.8}
          >
            <Text style={[styles.statusTabText, filter === 'pending' && styles.statusTabTextActive]}>
              Pending ({counts.pending})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusTabBtn, filter === 'approved' && styles.statusTabBtnApprovedActive]}
            onPress={() => setFilter('approved')}
            activeOpacity={0.8}
          >
            <Text style={[styles.statusTabText, filter === 'approved' && styles.statusTabTextActive]}>
              Approved ({counts.approved})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusTabBtn, filter === 'rejected' && styles.statusTabBtnRejectedActive]}
            onPress={() => setFilter('rejected')}
            activeOpacity={0.8}
          >
            <Text style={[styles.statusTabText, filter === 'rejected' && styles.statusTabTextActive]}>
              Rejected ({counts.rejected})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search Input Bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${filteredSongs.length} submissions, songwriter, key...`}
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── SUBMISSIONS FEED ───────────────────────────────────────────────── */}
      <FlatList
        data={filteredSongs}
        keyExtractor={i => i.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 24) + 30 }
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchSongs();
            }}
            tintColor="#7c3aed"
            colors={['#7c3aed']}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color="#7c3aed" size="large" />
            </View>
          ) : (
            <EmptyState
              icon="cloud-upload-outline"
              title="No Submissions Found"
              description={
                searchQuery || filter !== 'all'
                  ? 'Try changing your search query or status filter.'
                  : 'Choir members who submit songs for review will appear here.'
              }
            />
          )
        }
        renderItem={({ item }) => {
          const submitter = getCleanSubmitterName(item);
          const isPending = item.status === 'pending' || !item.status;
          const isApproved = item.status === 'approved';
          const isRejected = item.status === 'rejected';
          const hasAudio = Boolean(item.audioUrl || item.rawData?.audioUrl);
          const isPlaying = playingSongId === item.id;
          const commentsCount = (item.conversation || []).length;

          if (viewMode === 'list') {
            /* ── COMPACT LIST ROW ─────────────────────────────────────────── */
            return (
              <TouchableOpacity
                style={styles.listRowCard}
                onPress={() => {
                  setSelectedSong(item);
                  setReviewModalVisible(true);
                }}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitleText} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowSubText} numberOfLines={1}>
                    By {item.writer || item.artist || 'Unknown'} • {submitter.name}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View
                    style={[
                      styles.statusPill,
                      isApproved && styles.statusPillApproved,
                      isRejected && styles.statusPillRejected,
                      isPending && styles.statusPillPending,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        isApproved && styles.statusPillTextApproved,
                        isRejected && styles.statusPillTextRejected,
                        isPending && styles.statusPillTextPending,
                      ]}
                    >
                      {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.listChatBtn}
                    onPress={() => {
                      setSelectedSong(item);
                      setReviewModalVisible(true);
                    }}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="chatbubble-ellipses" size={14} color="#7c3aed" />
                    {commentsCount > 0 && (
                      <Text style={styles.listChatBtnCount}>{commentsCount}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }

          /* ── RICH GRID CARD (Web Admin Parity) ──────────────────────────── */
          return (
            <View style={styles.gridCard}>
              {/* Card Top: Title, Writer & Status */}
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardWriter} numberOfLines={1}>
                    By <Text style={styles.cardWriterBold}>{item.writer || item.artist || 'Unknown'}</Text>
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusPill,
                    isApproved && styles.statusPillApproved,
                    isRejected && styles.statusPillRejected,
                    isPending && styles.statusPillPending,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isApproved && styles.statusPillTextApproved,
                      isRejected && styles.statusPillTextRejected,
                      isPending && styles.statusPillTextPending,
                    ]}
                  >
                    {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                  </Text>
                </View>
              </View>

              {/* Submitter Details Line */}
              <View style={styles.submitterRow}>
                <Text style={styles.submitterNameText}>{submitter.name}</Text>
                {submitter.date ? (
                  <Text style={styles.submitterDateText}>{submitter.date}</Text>
                ) : null}
              </View>

              {/* Badges: Category, Key, Zone */}
              <View style={styles.badgesRow}>
                {item.category ? (
                  <View style={styles.metaChip}>
                    <Text style={styles.metaChipText}>{item.category}</Text>
                  </View>
                ) : null}

                {item.key ? (
                  <View style={styles.keyChip}>
                    <Text style={styles.keyChipText}>Key {item.key}</Text>
                  </View>
                ) : null}

                {item.zoneName ? (
                  <Text style={styles.zoneText} numberOfLines={1}>
                    📍 {item.zoneName}
                  </Text>
                ) : null}
              </View>

              {/* 1-Line Lyrics Snippet in Italic Preview Bubble */}
              {item.lyrics ? (
                <View style={styles.lyricsSnippetBox}>
                  <Text style={styles.lyricsSnippetText} numberOfLines={1}>
                    &quot;{item.lyrics.replace(/\n+/g, ' ')}&quot;
                  </Text>
                </View>
              ) : null}

              {/* Bottom Card Footer Actions */}
              <View style={styles.cardFooter}>
                {/* Audio Button */}
                {hasAudio ? (
                  <TouchableOpacity
                    style={[styles.audioBtn, isPlaying && styles.audioBtnPlaying]}
                    onPress={() => handleToggleQuickAudio(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isPlaying ? 'pause' : 'play'}
                      size={12}
                      color={isPlaying ? '#ffffff' : '#475569'}
                      style={{ marginRight: 3 }}
                    />
                    <Text style={[styles.audioBtnText, isPlaying && styles.audioBtnTextPlaying]}>
                      {isPlaying ? 'Playing' : 'Audio'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.noAudioText}>No audio</Text>
                )}

                {/* Chat & Decision Buttons */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity
                    style={styles.chatStudioBtn}
                    onPress={() => {
                      setSelectedSong(item);
                      setReviewModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="chatbubbles" size={13} color="#7c3aed" style={{ marginRight: 3 }} />
                    <Text style={styles.chatStudioBtnText}>
                      Chat {commentsCount > 0 ? `(${commentsCount})` : ''}
                    </Text>
                  </TouchableOpacity>

                  {isPending && (
                    <>
                      <TouchableOpacity
                        style={styles.quickRejectBtn}
                        onPress={() => handleOpenRejectModal(item)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="close" size={14} color="#e11d48" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.quickApproveBtn}
                        onPress={() => handleApproveSong(item)}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.quickApproveBtnText}>Approve</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  <TouchableOpacity
                    style={styles.quickDeleteBtn}
                    onPress={() => handleDeleteSong(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash-outline" size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      {/* ── INTERACTIVE REVIEW STUDIO MODAL ─────────────────────────────────── */}
      <SubmissionReviewModal
        visible={reviewModalVisible}
        song={selectedSong}
        onClose={() => setReviewModalVisible(false)}
        onApprove={song => {
          handleApproveSong(song);
          setReviewModalVisible(false);
        }}
        onReject={(song, notes) => {
          setSongs(prev =>
            prev.map(s => (s.id === song.id ? { ...s, status: 'rejected', rejectNotes: notes } : s))
          );
          if (selectedSong?.id === song.id) {
            setSelectedSong(prev => (prev ? { ...prev, status: 'rejected', rejectNotes: notes } : null));
          }
          api.submittedSongs.reject(song.id, notes).catch(() => {});
          setReviewModalVisible(false);
        }}
        onSendMessage={handleSendMessage}
      />

      {/* ── QUICK DECLINE MODAL ────────────────────────────────────────────── */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.rejectCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="alert-circle" size={18} color="#e11d48" style={{ marginRight: 6 }} />
              <Text style={styles.rejectCardTitle}>Decline Song Submission</Text>
            </View>
            <Text style={styles.rejectCardSub}>
              Provide guidance so the songwriter can revise and resubmit.
            </Text>

            <TextInput
              style={styles.rejectTextInput}
              placeholder="e.g. Please re-record vocals with backing piano..."
              placeholderTextColor="#94a3b8"
              multiline
              numberOfLines={3}
              value={rejectReason}
              onChangeText={setRejectReason}
              autoFocus
            />

            <View style={styles.rejectActionsRow}>
              <TouchableOpacity
                style={styles.rejectCancelBtn}
                onPress={() => setRejectModalVisible(false)}
              >
                <Text style={styles.rejectCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectConfirmBtn}
                onPress={handleConfirmReject}
              >
                <Text style={styles.rejectConfirmBtnText}>Decline</Text>
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
    backgroundColor: '#f8fafc',
  },
  center: {
    paddingVertical: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlBarCard: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    gap: 10,
  },
  topTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenHeading: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  totalBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
  },
  totalBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  viewModeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleSegment: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 2,
  },
  toggleBtn: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  refreshIconBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusTabsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  statusTabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statusTabBtnAllActive: {
    backgroundColor: '#7c3aed',
    borderColor: '#7c3aed',
  },
  statusTabBtnPendingActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  statusTabBtnApprovedActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  statusTabBtnRejectedActive: {
    backgroundColor: '#e11d48',
    borderColor: '#e11d48',
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  statusTabTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 10,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 12.5,
    color: '#0f172a',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  gridCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 13,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 2,
    elevation: 1,
    gap: 7,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardWriter: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 1,
  },
  cardWriterBold: {
    fontWeight: '600',
    color: '#475569',
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusPillPending: {
    backgroundColor: '#fffbeb',
  },
  statusPillApproved: {
    backgroundColor: '#ecfdf5',
  },
  statusPillRejected: {
    backgroundColor: '#fff1f2',
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTextPending: {
    color: '#b45309',
  },
  statusPillTextApproved: {
    color: '#047857',
  },
  statusPillTextRejected: {
    color: '#e11d48',
  },
  submitterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f8fafc',
  },
  submitterNameText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  submitterDateText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  metaChip: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  metaChipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
  },
  keyChip: {
    backgroundColor: '#fffbeb',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  keyChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#b45309',
  },
  zoneText: {
    fontSize: 10,
    color: '#94a3b8',
    maxWidth: 140,
  },
  lyricsSnippetBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  lyricsSnippetText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#64748b',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  audioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  audioBtnPlaying: {
    backgroundColor: '#7c3aed',
  },
  audioBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#475569',
  },
  audioBtnTextPlaying: {
    color: '#ffffff',
  },
  noAudioText: {
    fontSize: 10.5,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  chatStudioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 4.5,
    borderRadius: 7,
  },
  chatStudioBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  quickRejectBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#fff1f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickApproveBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 9,
    paddingVertical: 4.5,
    borderRadius: 7,
  },
  quickApproveBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  quickDeleteBtn: {
    padding: 4,
  },
  listRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    gap: 8,
  },
  rowTitleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0f172a',
  },
  rowSubText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  listChatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 3,
  },
  listChatBtnCount: {
    fontSize: 10,
    fontWeight: '800',
    color: '#7c3aed',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  rejectCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 360,
    gap: 8,
  },
  rejectCardTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0f172a',
  },
  rejectCardSub: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
  rejectTextInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 10,
    height: 70,
    fontSize: 12,
    color: '#0f172a',
    textAlignVertical: 'top',
  },
  rejectActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
  rejectCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  rejectCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  rejectConfirmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#e11d48',
  },
  rejectConfirmBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
});
