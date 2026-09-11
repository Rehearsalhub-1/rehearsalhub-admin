import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer } from 'expo-audio';
import { EmptyState } from '../components/ui';
import SubmissionReviewModal, {
  SongSubmission, SongSubmissionMessage, getCleanSubmitterName,
} from '../components/SubmissionReviewModal';
import { useSubmissions } from '../hooks/useSubmissions';
import { useAlert } from '../context/AlertContext';

export const INITIAL_SUBMISSIONS: SongSubmission[] = [];

export default function SubmittedSongsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { songs, loading, refreshing, soundRef, refetch, approveSong, rejectSong, deleteSong, addMessage } = useSubmissions();

  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedSong, setSelectedSong] = useState<SongSubmission | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectingSong, setRejectingSong] = useState<SongSubmission | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [playingSongId, setPlayingSongId] = useState<string | null>(null);

  function handleApproveSong(song: SongSubmission) {
    showAlert('Approve Song', `Approve "${song.title}" for choir rehearsals?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Approve', onPress: () => {
          approveSong(song.id);
          if (selectedSong?.id === song.id) setSelectedSong(p => p ? { ...p, status: 'approved' } : null);
        },
      },
    ]);
  }

  function handleOpenRejectModal(song: SongSubmission) {
    setRejectingSong(song); setRejectReason(''); setRejectModalVisible(true);
  }

  function handleConfirmReject() {
    if (!rejectingSong) return;
    if (!rejectReason.trim()) { showAlert('Feedback Required', 'Please provide a reason.'); return; }
    const songId = rejectingSong.id;
    const notes = rejectReason.trim();
    rejectSong(songId, notes);
    if (selectedSong?.id === songId) setSelectedSong(p => p ? { ...p, status: 'rejected', rejectNotes: notes } : null);
    setRejectModalVisible(false); setRejectingSong(null);
  }

  function handleDeleteSong(song: SongSubmission) {
    showAlert('Delete Submission', `Delete "${song.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: () => {
          deleteSong(song.id);
          if (selectedSong?.id === song.id) { setSelectedSong(null); setReviewModalVisible(false); }
        },
      },
    ]);
  }

  async function handleSendMessage(songId: string, message: string, replyTo?: any) {
    const msg: SongSubmissionMessage = {
      id: `msg-${Date.now()}`, sender: 'admin', senderName: 'Admin Reviewer',
      message: message.trim(), timestamp: new Date().toISOString(),
      replyTo: replyTo ? { id: replyTo.id, text: replyTo.message, senderName: replyTo.senderName } : null,
    };
    addMessage(songId, msg);
    if (selectedSong?.id === songId) setSelectedSong(p => p ? { ...p, conversation: [...(p.conversation || []), msg] } : null);
  }

  async function handleToggleQuickAudio(song: SongSubmission) {
    const url = song.audioUrl || (song as any).rawData?.audioUrl;
    if (!url) { showAlert('No Audio', 'No audio track uploaded.'); return; }
    try {
      if (playingSongId === song.id && soundRef.current) {
        soundRef.current.pause();
        soundRef.current.remove();
        soundRef.current = null;
        setPlayingSongId(null);
        return;
      }
      if (soundRef.current) {
        soundRef.current.pause();
        soundRef.current.remove();
        soundRef.current = null;
      }
      setPlayingSongId(song.id);
      const player = createAudioPlayer({ uri: url });
      (player as any).addListener('playbackStatusUpdate', (status: any) => {
        if (status.didJustFinish) {
          setPlayingSongId(null);
        }
      });
      player.play();
      soundRef.current = player;
    } catch {
      setPlayingSongId(null);
    }
  }

  const filteredSongs = useMemo(() => songs.filter(song => {
    if (filter !== 'all' && (song.status || 'pending') !== filter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sub = getCleanSubmitterName(song);
      return (
        (song.title || '').toLowerCase().includes(q) ||
        ((song as any).writer || '').toLowerCase().includes(q) ||
        sub.name.toLowerCase().includes(q) ||
        (song.category || '').toLowerCase().includes(q) ||
        (song.key || '').toLowerCase().includes(q) ||
        (song.zoneName || '').toLowerCase().includes(q)
      );
    }
    return true;
  }), [songs, filter, searchQuery]);

  const counts = useMemo(() => ({
    all: songs.length,
    pending: songs.filter(s => s.status === 'pending' || !s.status).length,
    approved: songs.filter(s => s.status === 'approved').length,
    rejected: songs.filter(s => s.status === 'rejected').length,
  }), [songs]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.controlBarCard}>
        <View style={styles.topTitleRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="cloud-upload" size={20} color="#7c3aed" />
            <Text style={styles.screenHeading}>Submitted Songs</Text>
            <View style={styles.totalBadge}><Text style={styles.totalBadgeText}>{counts.all}</Text></View>
          </View>
          <View style={styles.viewModeToggleRow}>
            <View style={styles.toggleSegment}>
              {(['grid', 'list'] as const).map(m => (
                <TouchableOpacity key={m} style={[styles.toggleBtn, viewMode === m && styles.toggleBtnActive]} onPress={() => setViewMode(m)} activeOpacity={0.8}>
                  <Ionicons name={m === 'grid' ? 'grid-outline' : 'list-outline'} size={m === 'grid' ? 14 : 15} color={viewMode === m ? '#7c3aed' : '#64748b'} />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.refreshIconBtn} onPress={refetch} activeOpacity={0.75}>
              <Ionicons name="refresh" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.statusTabsRow}>
          {([
            { id: 'all' as const, label: `All (${counts.all})`, active: styles.statusTabBtnAllActive },
            { id: 'pending' as const, label: `Pending (${counts.pending})`, active: styles.statusTabBtnPendingActive },
            { id: 'approved' as const, label: `Approved (${counts.approved})`, active: styles.statusTabBtnApprovedActive },
            { id: 'rejected' as const, label: `Rejected (${counts.rejected})`, active: styles.statusTabBtnRejectedActive },
          ]).map(t => (
            <TouchableOpacity key={t.id} style={[styles.statusTabBtn, filter === t.id && t.active]} onPress={() => setFilter(t.id)} activeOpacity={0.8}>
              <Text style={[styles.statusTabText, filter === t.id && styles.statusTabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={15} color="#94a3b8" style={{ marginRight: 6 }} />
          <TextInput style={styles.searchInput} placeholder={`Search ${filteredSongs.length} submissions...`} placeholderTextColor="#94a3b8" value={searchQuery} onChangeText={setSearchQuery} />
          {searchQuery ? <TouchableOpacity onPress={() => setSearchQuery('')}><Ionicons name="close-circle" size={16} color="#94a3b8" /></TouchableOpacity> : null}
        </View>
      </View>

      <FlashList
        data={filteredSongs}
        keyExtractor={i => i.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: Math.max(insets.bottom, 24) + 30 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#7c3aed" colors={['#7c3aed']} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading
            ? <View style={styles.center}><ActivityIndicator color="#7c3aed" size="large" /></View>
            : <EmptyState icon="cloud-upload-outline" title="No Submissions Found" description={searchQuery || filter !== 'all' ? 'Try changing your filter.' : 'Song submissions will appear here.'} />
        }
        renderItem={({ item }) => {
          const submitter = getCleanSubmitterName(item);
          const isPending = item.status === 'pending' || !item.status;
          const isApproved = item.status === 'approved';
          const isRejected = item.status === 'rejected';
          const hasAudio = Boolean(item.audioUrl || (item as any).rawData?.audioUrl);
          const isPlaying = playingSongId === item.id;
          const commentsCount = (item.conversation || []).length;

          if (viewMode === 'list') {
            return (
              <TouchableOpacity style={styles.listRowCard} onPress={() => { setSelectedSong(item); setReviewModalVisible(true); }} activeOpacity={0.8}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitleText} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.rowSubText} numberOfLines={1}>By {(item as any).writer || 'Unknown'} — {submitter.name}</Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.statusPill, isApproved && styles.statusPillApproved, isRejected && styles.statusPillRejected, isPending && styles.statusPillPending]}>
                    <Text style={[styles.statusPillText, isApproved && styles.statusPillTextApproved, isRejected && styles.statusPillTextRejected, isPending && styles.statusPillTextPending]}>
                      {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                    </Text>
                  </View>
                  <TouchableOpacity style={styles.listChatBtn} onPress={() => { setSelectedSong(item); setReviewModalVisible(true); }} activeOpacity={0.7}>
                    <Ionicons name="chatbubble-ellipses" size={14} color="#7c3aed" />
                    {commentsCount > 0 && <Text style={styles.listChatBtnCount}>{commentsCount}</Text>}
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          }

          return (
            <View style={styles.gridCard}>
              <View style={styles.cardHeader}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.cardWriter} numberOfLines={1}>By <Text style={styles.cardWriterBold}>{(item as any).writer || 'Unknown'}</Text></Text>
                </View>
                <View style={[styles.statusPill, isApproved && styles.statusPillApproved, isRejected && styles.statusPillRejected, isPending && styles.statusPillPending]}>
                  <Text style={[styles.statusPillText, isApproved && styles.statusPillTextApproved, isRejected && styles.statusPillTextRejected, isPending && styles.statusPillTextPending]}>
                    {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                  </Text>
                </View>
              </View>
              <View style={styles.submitterRow}>
                <Text style={styles.submitterNameText}>{submitter.name}</Text>
                {submitter.date ? <Text style={styles.submitterDateText}>{submitter.date}</Text> : null}
              </View>
              <View style={styles.badgesRow}>
                {item.category ? <View style={styles.metaChip}><Text style={styles.metaChipText}>{item.category}</Text></View> : null}
                {item.key ? <View style={styles.keyChip}><Text style={styles.keyChipText}>Key {item.key}</Text></View> : null}
                {item.zoneName ? <Text style={styles.zoneText} numberOfLines={1}>{item.zoneName}</Text> : null}
              </View>
              {item.lyrics ? (
                <View style={styles.lyricsSnippetBox}>
                  <Text style={styles.lyricsSnippetText} numberOfLines={1}>"{item.lyrics.replace(/\n+/g, ' ')}"</Text>
                </View>
              ) : null}
              <View style={styles.cardFooter}>
                {hasAudio ? (
                  <TouchableOpacity style={[styles.audioBtn, isPlaying && styles.audioBtnPlaying]} onPress={() => handleToggleQuickAudio(item)} activeOpacity={0.8}>
                    <Ionicons name={isPlaying ? 'pause' : 'play'} size={12} color={isPlaying ? '#ffffff' : '#475569'} style={{ marginRight: 3 }} />
                    <Text style={[styles.audioBtnText, isPlaying && styles.audioBtnTextPlaying]}>{isPlaying ? 'Playing' : 'Audio'}</Text>
                  </TouchableOpacity>
                ) : <Text style={styles.noAudioText}>No audio</Text>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <TouchableOpacity style={styles.chatStudioBtn} onPress={() => { setSelectedSong(item); setReviewModalVisible(true); }} activeOpacity={0.8}>
                    <Ionicons name="chatbubbles" size={13} color="#7c3aed" style={{ marginRight: 3 }} />
                    <Text style={styles.chatStudioBtnText}>Chat {commentsCount > 0 ? `(${commentsCount})` : ''}</Text>
                  </TouchableOpacity>
                  {isPending && (
                    <>
                      <TouchableOpacity style={styles.quickRejectBtn} onPress={() => handleOpenRejectModal(item)} activeOpacity={0.8}>
                        <Ionicons name="close" size={14} color="#e11d48" />
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.quickApproveBtn} onPress={() => handleApproveSong(item)} activeOpacity={0.8}>
                        <Text style={styles.quickApproveBtnText}>Approve</Text>
                      </TouchableOpacity>
                    </>
                  )}
                  <TouchableOpacity style={styles.quickDeleteBtn} onPress={() => handleDeleteSong(item)} activeOpacity={0.7}>
                    <Ionicons name="trash-outline" size={14} color="#cbd5e1" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        }}
      />

      <SubmissionReviewModal
        visible={reviewModalVisible}
        song={selectedSong}
        onClose={() => setReviewModalVisible(false)}
        onApprove={song => { handleApproveSong(song); setReviewModalVisible(false); }}
        onReject={(song, notes) => {
          rejectSong(song.id, notes);
          if (selectedSong?.id === song.id) setSelectedSong(p => p ? { ...p, status: 'rejected', rejectNotes: notes } : null);
          setReviewModalVisible(false);
        }}
        onSendMessage={handleSendMessage}
      />

      <Modal visible={rejectModalVisible} transparent animationType="fade">
        <KeyboardAvoidingView
          behavior='padding'
          style={{ flex: 1 }}
        >
        <View style={styles.modalBackdrop}>
          <View style={styles.rejectCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Ionicons name="alert-circle" size={18} color="#e11d48" style={{ marginRight: 6 }} />
              <Text style={styles.rejectCardTitle}>Decline Song Submission</Text>
            </View>
            <Text style={styles.rejectCardSub}>Provide guidance so the songwriter can revise and resubmit.</Text>
            <TextInput style={styles.rejectTextInput} placeholder="e.g. Please re-record vocals with backing piano..." placeholderTextColor="#94a3b8" multiline numberOfLines={3} value={rejectReason} onChangeText={setRejectReason} autoFocus />
            <View style={styles.rejectActionsRow}>
              <TouchableOpacity style={styles.rejectCancelBtn} onPress={() => setRejectModalVisible(false)}>
                <Text style={styles.rejectCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectConfirmBtn} onPress={handleConfirmReject}>
                <Text style={styles.rejectConfirmBtnText}>Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { paddingVertical: 50, alignItems: 'center', justifyContent: 'center' },
  controlBarCard: { backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 10, gap: 10 },
  topTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  screenHeading: { fontSize: 17, fontWeight: '900', color: '#0f172a', letterSpacing: -0.3 },
  totalBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 1.5, borderRadius: 8 },
  totalBadgeText: { fontSize: 11, fontWeight: '800', color: '#64748b' },
  viewModeToggleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  toggleSegment: { flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: 8, padding: 2 },
  toggleBtn: { paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6 },
  toggleBtnActive: { backgroundColor: '#ffffff', shadowColor: '#0f172a', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 1, elevation: 1 },
  refreshIconBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  statusTabsRow: { flexDirection: 'row', gap: 6 },
  statusTabBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  statusTabBtnAllActive: { backgroundColor: '#7c3aed', borderColor: '#7c3aed' },
  statusTabBtnPendingActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  statusTabBtnApprovedActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  statusTabBtnRejectedActive: { backgroundColor: '#e11d48', borderColor: '#e11d48' },
  statusTabText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  statusTabTextActive: { color: '#ffffff', fontWeight: '800' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', paddingHorizontal: 10, height: 36 },
  searchInput: { flex: 1, fontSize: 12.5, color: '#0f172a' },
  listContent: { paddingHorizontal: 16, paddingTop: 10, gap: 10 },
  gridCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 13, borderWidth: 1, borderColor: '#f1f5f9', gap: 7 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  cardWriter: { fontSize: 11, color: '#94a3b8', marginTop: 1 },
  cardWriterBold: { fontWeight: '600', color: '#475569' },
  statusPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  statusPillPending: { backgroundColor: '#fffbeb' },
  statusPillApproved: { backgroundColor: '#ecfdf5' },
  statusPillRejected: { backgroundColor: '#fff1f2' },
  statusPillText: { fontSize: 10, fontWeight: '800' },
  statusPillTextPending: { color: '#b45309' },
  statusPillTextApproved: { color: '#047857' },
  statusPillTextRejected: { color: '#e11d48' },
  submitterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTopWidth: 1, borderTopColor: '#f8fafc' },
  submitterNameText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  submitterDateText: { fontSize: 10, color: '#94a3b8' },
  badgesRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  metaChip: { backgroundColor: '#f1f5f9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  metaChipText: { fontSize: 10, fontWeight: '600', color: '#475569' },
  keyChip: { backgroundColor: '#fffbeb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 5 },
  keyChipText: { fontSize: 10, fontWeight: '700', color: '#b45309' },
  zoneText: { fontSize: 10, color: '#94a3b8', maxWidth: 140 },
  lyricsSnippetBox: { backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#f1f5f9' },
  lyricsSnippetText: { fontSize: 11, fontStyle: 'italic', color: '#64748b' },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  audioBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  audioBtnPlaying: { backgroundColor: '#7c3aed' },
  audioBtnText: { fontSize: 10.5, fontWeight: '700', color: '#475569' },
  audioBtnTextPlaying: { color: '#ffffff' },
  noAudioText: { fontSize: 10.5, color: '#94a3b8', fontStyle: 'italic' },
  chatStudioBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 8, paddingVertical: 4.5, borderRadius: 7 },
  chatStudioBtnText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
  quickRejectBtn: { width: 26, height: 26, borderRadius: 6, backgroundColor: '#fff1f2', alignItems: 'center', justifyContent: 'center' },
  quickApproveBtn: { backgroundColor: '#10b981', paddingHorizontal: 9, paddingVertical: 4.5, borderRadius: 7 },
  quickApproveBtnText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  quickDeleteBtn: { padding: 4 },
  listRowCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#f1f5f9', gap: 8 },
  rowTitleText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
  rowSubText: { fontSize: 11, color: '#64748b', marginTop: 1 },
  listChatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f5f3ff', paddingHorizontal: 7, paddingVertical: 4, borderRadius: 6, gap: 3 },
  listChatBtnCount: { fontSize: 10, fontWeight: '800', color: '#7c3aed' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  rejectCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, width: '100%', maxWidth: 360, gap: 8 },
  rejectCardTitle: { fontSize: 13.5, fontWeight: '800', color: '#0f172a' },
  rejectCardSub: { fontSize: 11, color: '#64748b', lineHeight: 15 },
  rejectTextInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10, padding: 10, height: 70, fontSize: 12, color: '#0f172a', textAlignVertical: 'top' },
  rejectActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  rejectCancelBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#f1f5f9' },
  rejectCancelBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  rejectConfirmBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#e11d48' },
  rejectConfirmBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
});
