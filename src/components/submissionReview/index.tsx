import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { createAudioPlayer, AudioPlayer } from 'expo-audio';
import { stripHtml } from '../../lib/stripHtml';
import { customAlert } from '../../context/AlertContext';
import { styles } from './submissionReviewStyles';
import { SongSubmission, SongSubmissionMessage, getCleanSubmitterName } from './submissionReviewUtils';
import SubmissionConversation from './SubmissionConversation';
import SubmissionReplyBar from './SubmissionReplyBar';
import SubmissionActionButtons from './SubmissionActionButtons';

export type { SongSubmission, SongSubmissionMessage };

interface SubmissionReviewModalProps {
  visible: boolean;
  song: SongSubmission | null;
  onClose: () => void;
  onApprove: (song: SongSubmission) => void;
  onReject: (song: SongSubmission, notes: string) => void;
  onSendMessage: (songId: string, message: string, replyTo?: any) => Promise<void>;
  onDeleteMessage?: (songId: string, messageId: string) => void;
  onToggleReaction?: (songId: string, messageId: string, emoji: string) => void;
}

export default function SubmissionReviewModal({
  visible,
  song,
  onClose,
  onApprove,
  onReject,
  onSendMessage,
  onDeleteMessage,
  onToggleReaction,
}: SubmissionReviewModalProps) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'chat' | 'lyrics' | 'solfas' | 'notes'>('chat');

  // Audio Playback
  const [player, setPlayer] = useState<AudioPlayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);

  // Chat & Messaging
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<SongSubmissionMessage | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);

  // Reject Dialog
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Copy Feedback
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    return () => {
      if (player) {
        player.pause();
        player.remove();
      }
    };
  }, [player]);

  useEffect(() => {
    if (!visible) {
      if (player) {
        player.pause();
        player.remove();
        setPlayer(null);
      }
      setIsPlaying(false);
      setActiveTab('chat');
      setShowRejectBox(false);
      setReplyingTo(null);
      setInputMessage('');
    }
  }, [visible]);

  if (!song) return null;

  const submitter = getCleanSubmitterName(song);
  const audioUrl = song.audioUrl || song.rawData?.audioUrl;
  const isPending = song.status === 'pending' || !song.status;
  const isApproved = song.status === 'approved';
  const isRejected = song.status === 'rejected';

  async function handleTogglePlay() {
    if (!audioUrl) {
      customAlert('No Audio', 'No reference audio track provided with this submission.');
      return;
    }

    try {
      if (player) {
        if (player.playing) {
          player.pause();
          setIsPlaying(false);
          return;
        } else {
          if (player.currentTime >= player.duration && player.duration > 0) {
            await player.seekTo(0);
          }
          player.play();
          setIsPlaying(true);
          return;
        }
      }

      setAudioLoading(true);
      const newPlayer = createAudioPlayer({ uri: audioUrl });
      (newPlayer as any).addListener('playbackStatusUpdate', (status: any) => {
        setIsPlaying(status.playing);
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
      newPlayer.play();
      setPlayer(newPlayer);
      setIsPlaying(true);
    } catch (e: any) {
      customAlert('Playback Error', 'Unable to play reference audio: ' + (e.message || 'Stream error'));
      setIsPlaying(false);
    } finally {
      setAudioLoading(false);
    }
  }

  async function handleSend(customText?: string) {
    const text = (customText || inputMessage).trim();
    if (!text || sending) return;

    setSending(true);
    try {
      await onSendMessage(song!.id, text, replyingTo);
      setInputMessage('');
      setReplyingTo(null);
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e: any) {
      customAlert('Send Error', e.message || 'Failed to send comment.');
    } finally {
      setSending(false);
    }
  }

  function handleConfirmReject() {
    if (!rejectReason.trim()) {
      customAlert('Feedback Required', 'Please provide notes or feedback for the submitter.');
      return;
    }
    onReject(song!, rejectReason.trim());
    setShowRejectBox(false);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.headerTitleCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.headerSongTitle} numberOfLines={1}>
                {song.title}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  isApproved && styles.statusBadgeApproved,
                  isRejected && styles.statusBadgeRejected,
                  isPending && styles.statusBadgePending,
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    isApproved && styles.statusBadgeTextApproved,
                    isRejected && styles.statusBadgeTextRejected,
                    isPending && styles.statusBadgeTextPending,
                  ]}
                >
                  {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending'}
                </Text>
              </View>
            </View>

            <Text style={styles.headerSubtitle} numberOfLines={1}>
              By {song.writer || song.artist || 'Unknown'} • Submitted by {submitter.name}
            </Text>
          </View>
        </View>

        {/* ── REFERENCE AUDIO BAR ── */}
        {audioUrl ? (
          <View style={styles.audioPlayerBar}>
            <TouchableOpacity
              style={styles.audioPlayBtn}
              onPress={handleTogglePlay}
              disabled={audioLoading}
              activeOpacity={0.8}
            >
              {audioLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons
                  name={isPlaying ? 'pause' : 'play'}
                  size={16}
                  color="#ffffff"
                  style={!isPlaying ? { marginLeft: 2 } : undefined}
                />
              )}
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <Text style={styles.audioTitleText} numberOfLines={1}>
                Reference Audio Track
              </Text>
              <Text style={styles.audioMetaText}>
                Key {song.key || 'N/A'} {song.tempo ? `• ${song.tempo} BPM` : ''}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.openExternalBtn}
              onPress={() => Linking.openURL(audioUrl).catch(() => {})}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={14} color="#7c3aed" style={{ marginRight: 3 }} />
              <Text style={styles.openExternalText}>Open</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── TABS ── */}
        <View style={styles.tabsRow}>
          {[
            { id: 'chat', label: `Chat (${(song.conversation || []).length})`, icon: 'chatbubbles-outline' },
            { id: 'lyrics', label: 'Lyrics', icon: 'document-text-outline' },
            ...(song.solfas ? [{ id: 'solfas', label: 'Solfas', icon: 'musical-notes-outline' }] : []),
            { id: 'notes', label: 'Notes', icon: 'information-circle-outline' },
          ].map(t => {
            const isActive = activeTab === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                onPress={() => setActiveTab(t.id as any)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={t.icon as any}
                  size={13}
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

        {/* ── TAB CONTENT ── */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {activeTab === 'chat' && (
            <View style={{ flex: 1 }}>
              <SubmissionConversation
                conversation={song.conversation || []}
                replyingTo={replyingTo}
                chatScrollRef={chatScrollRef}
                onReply={setReplyingTo}
                onCancelReply={() => setReplyingTo(null)}
                onSendChip={handleSend}
              />
              <SubmissionReplyBar
                inputMessage={inputMessage}
                sending={sending}
                onChangeText={setInputMessage}
                onSend={() => handleSend()}
              />
            </View>
          )}

          {activeTab === 'lyrics' && (
            <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
              <View style={styles.contentCard}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.cardHeaderTitle}>Submitted Lyrics</Text>
                  <TouchableOpacity
                    style={styles.copyBtn}
                    onPress={() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={12} color="#7c3aed" style={{ marginRight: 3 }} />
                    <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.lyricsText}>
                  {song.lyrics ? stripHtml(song.lyrics) : 'No lyrics submitted.'}
                </Text>
              </View>
            </ScrollView>
          )}

          {activeTab === 'solfas' && (
            <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
              <View style={styles.contentCard}>
                <Text style={styles.cardHeaderTitle}>Tonic Solfa Notation</Text>
                <Text style={styles.solfaText}>
                  {song.solfas ? stripHtml(song.solfas) : 'No solfa notation available.'}
                </Text>
              </View>
            </ScrollView>
          )}

          {activeTab === 'notes' && (
            <ScrollView style={styles.bodyScroll} contentContainerStyle={styles.bodyContent}>
              <View style={styles.contentCard}>
                <Text style={styles.cardHeaderTitle}>Submitter Notes</Text>
                <Text style={styles.notesText}>
                  {song.notes ? song.notes.trim() : 'No additional notes provided by submitter.'}
                </Text>
              </View>

              {song.rejectNotes ? (
                <View style={[styles.contentCard, { backgroundColor: '#fff1f2', borderColor: '#fecdd3' }]}>
                  <Text style={[styles.cardHeaderTitle, { color: '#e11d48' }]}>Rejection Feedback</Text>
                  <Text style={[styles.notesText, { color: '#be123c' }]}>
                    {song.rejectNotes}
                  </Text>
                </View>
              ) : null}
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        {/* ── BOTTOM ACTIONS ── */}
        <SubmissionActionButtons
          song={song}
          isPending={isPending}
          isApproved={isApproved}
          insetBottom={insets.bottom}
          onApprove={onApprove}
          onOpenReject={() => setShowRejectBox(true)}
          onRequestRevision={() => {
            setActiveTab('chat');
            setInputMessage('🔄 Revision requested: ');
          }}
        />

        {/* ── REJECTION MODAL ── */}
        <Modal visible={showRejectBox} transparent animationType="fade">
          <View style={styles.modalBackdrop}>
            <View style={styles.rejectCard}>
              <View style={styles.rejectCardHeader}>
                <Ionicons name="alert-circle" size={20} color="#e11d48" style={{ marginRight: 6 }} />
                <Text style={styles.rejectCardTitle}>Decline Submission</Text>
              </View>

              <Text style={styles.rejectCardSub}>
                Provide constructive feedback so the songwriter knows what to improve.
              </Text>

              <TextInput
                style={styles.rejectTextInput}
                placeholder="Reason or revision notes (e.g. Please re-record in Key F)..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
                value={rejectReason}
                onChangeText={setRejectReason}
              />

              <View style={styles.rejectActionsRow}>
                <TouchableOpacity
                  style={styles.rejectCancelBtn}
                  onPress={() => setShowRejectBox(false)}
                >
                  <Text style={styles.rejectCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.rejectConfirmBtn}
                  onPress={handleConfirmReject}
                >
                  <Text style={styles.rejectConfirmBtnText}>Confirm Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}
