import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../hooks/useNotifications';
import { api } from '../services/api';
import ZoneHeader from '../components/ZoneHeader';
import { useAuth } from '../context/AuthContext';
import { useZoneContext } from '../context/ZoneContext';
import { useAlert } from '../context/AlertContext';

const CATEGORIES = [
  { id: 'rehearsal', label: 'Rehearsal', icon: 'musical-notes-outline', color: '#7c3aed' },
  { id: 'announcement', label: 'Announcement', icon: 'megaphone-outline', color: '#0284c7' },
  { id: 'reminder', label: 'Call Time', icon: 'time-outline', color: '#d97706' },
  { id: 'admin', label: 'Urgent', icon: 'alert-circle-outline', color: '#e11d48' },
] as const;

const QUICK_TEMPLATES = [
  {
    label: 'Call Time Reminder',
    category: 'reminder' as const,
    title: 'Rehearsal Call Time Prompt',
    message: 'Kindly be reminded that call time for today’s rehearsal is prompt. Please arrive warmed up and ready.',
  },
  {
    label: 'Uniform Guidelines',
    category: 'announcement' as const,
    title: 'Choir Uniform Guidelines',
    message: 'Please ensure you adhere strictly to the scheduled choir dress code for the upcoming ministry service.',
  },
  {
    label: 'Urgent Notice',
    category: 'admin' as const,
    title: 'Important Rehearsal Notice',
    message: 'Urgent update regarding the upcoming rehearsal program. Please review your vocal parts and setlist immediately.',
  },
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { adminUser } = useAuth();
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();
  const { showAlert } = useAlert();

  const isHQ = adminUser?.isHQAdmin === true;
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const { sentHistory, loadingHistory, refreshingHistory, loadHistory, refreshHistory } = useNotifications();

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<typeof CATEGORIES[number]['id']>('rehearsal');
  const [audienceType, setAudienceType] = useState<'all' | 'individual'>('all');
  const [targetEmail, setTargetEmail] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  const applyTemplate = (tpl: typeof QUICK_TEMPLATES[0]) => {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setCategory(tpl.category);
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      showAlert('Missing Fields', 'Please enter both a title and message body.');
      return;
    }

    if (audienceType === 'individual' && !targetEmail.trim()) {
      showAlert('Missing Email', 'Please enter the recipient singer email.');
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        body: message.trim(),
        message: message.trim(),
        category,
        type: category === 'admin' ? 'warning' : category === 'rehearsal' ? 'rehearsal' : 'info',
        priority: category === 'admin' ? 'high' : 'normal',
      };

      if (audienceType === 'individual') {
        const res = await api.members.getGlobalMembers(targetEmail.trim().toLowerCase());
        const matched = Array.isArray(res?.data) ? res.data[0] : null;
        if (!matched?.userId && !matched?.id) {
          showAlert('Singer Not Found', `No singer found with email "${targetEmail.trim()}".`);
          setSending(false);
          return;
        }
        payload.targetUserId = matched.userId || matched.id;
      } else {
        const resolvedOrg = activeZone?.id || 'zone-001';
        payload.targetOrgId = resolvedOrg;
      }

      const res = await api.notifications.send(payload);
      const count = res?.recipientCount ?? 0;

      showAlert(
        'Notification Sent!',
        `Your announcement has been broadcast successfully${count > 0 ? ` to ${count} singer(s)` : ''}.`
      );

      setTitle('');
      setMessage('');
      setTargetEmail('');
    } catch (e: any) {
      showAlert('Dispatch Error', e?.message || 'Failed to send notification. Please verify connection.');
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title={isChurchMode ? 'Church Choir Broadcast' : isHQ ? 'HQ Announcements' : 'Zonal Broadcast'} />

      {/* Segment Switcher */}
      <View style={styles.segmentWrap}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'compose' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('compose')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="paper-plane-outline"
            size={16}
            color={activeTab === 'compose' ? '#7c3aed' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentBtnText, activeTab === 'compose' && styles.segmentBtnTextActive]}>
            Compose Announcement
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.segmentBtn, activeTab === 'history' && styles.segmentBtnActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'history' ? '#7c3aed' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.segmentBtnText, activeTab === 'history' && styles.segmentBtnTextActive]}>
            Sent History
          </Text>
        </TouchableOpacity>
      </View>

      {/* ─── TAB 1: COMPOSE ──────────────────────────────────────────────── */}
      {activeTab === 'compose' && (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={[styles.container, { paddingBottom: Math.max(insets.bottom, 20) + 40 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Quick Templates */}
            <Text style={styles.sectionLabel}>Quick Templates</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.templateScroll}>
              {QUICK_TEMPLATES.map((tpl, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.templateChip}
                  onPress={() => applyTemplate(tpl)}
                  activeOpacity={0.75}
                >
                  <Ionicons name="flash-outline" size={13} color="#7c3aed" style={{ marginRight: 4 }} />
                  <Text style={styles.templateChipText}>{tpl.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Category Selector */}
            <Text style={styles.sectionLabel}>Category</Text>
            <View style={styles.categoryRow}>
              {CATEGORIES.map(c => {
                const isSelected = category === c.id;
                return (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.categoryChip,
                      isSelected && { backgroundColor: c.color, borderColor: c.color },
                    ]}
                    onPress={() => setCategory(c.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={c.icon}
                      size={14}
                      color={isSelected ? '#ffffff' : c.color}
                      style={{ marginRight: 4 }}
                    />
                    <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Audience Selector */}
            <Text style={styles.sectionLabel}>Target Audience</Text>
            <View style={styles.audienceRow}>
              <TouchableOpacity
                style={[styles.audienceBtn, audienceType === 'all' && styles.audienceBtnActive]}
                onPress={() => setAudienceType('all')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="people-outline"
                  size={15}
                  color={audienceType === 'all' ? '#7c3aed' : '#64748b'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.audienceBtnText, audienceType === 'all' && styles.audienceBtnTextActive]}>
                  {isHQ ? 'All HQ Singers' : `All ${activeZone?.name || 'Zone'} Singers`}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.audienceBtn, audienceType === 'individual' && styles.audienceBtnActive]}
                onPress={() => setAudienceType('individual')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="person-outline"
                  size={15}
                  color={audienceType === 'individual' ? '#7c3aed' : '#64748b'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.audienceBtnText, audienceType === 'individual' && styles.audienceBtnTextActive]}>
                  Specific Singer
                </Text>
              </TouchableOpacity>
            </View>

            {/* Individual Email Input */}
            {audienceType === 'individual' && (
              <View style={styles.fieldBox}>
                <Text style={styles.fieldLabel}>Recipient Email</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="singer@loveworldsingers.org"
                  placeholderTextColor="#94a3b8"
                  value={targetEmail}
                  onChangeText={setTargetEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            )}

            {/* Title Input */}
            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>Announcement Title</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Rehearsal Call Time Update"
                placeholderTextColor="#94a3b8"
                value={title}
                onChangeText={setTitle}
              />
            </View>

            {/* Message Body */}
            <View style={styles.fieldBox}>
              <Text style={styles.fieldLabel}>Message Body</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                placeholder="Type your message here for all choir members..."
                placeholderTextColor="#94a3b8"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            {/* Dispatch Button */}
            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.btnDisabled]}
              onPress={handleSend}
              disabled={sending}
              activeOpacity={0.85}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Ionicons name="send" size={16} color="#ffffff" style={{ marginRight: 8 }} />
                  <Text style={styles.sendBtnText}>Dispatch Announcement</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ─── TAB 2: SENT HISTORY ─────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <FlatList
          data={sentHistory}
          keyExtractor={item => item.id}
          contentContainerStyle={[styles.historyList, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}
          refreshControl={<RefreshControl refreshing={refreshingHistory} onRefresh={refreshHistory} colors={['#7c3aed']} />}
          ListEmptyComponent={
            loadingHistory ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#7c3aed" />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off-outline" size={36} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>No Sent Notifications</Text>
                <Text style={styles.emptySub}>Announcements sent from this console will appear here.</Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <View style={styles.historyCard}>
              <View style={styles.historyCardHeader}>
                <Text style={styles.historyTitle}>{item.title}</Text>
                <Text style={styles.historyTime}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : ''}</Text>
              </View>
              <Text style={styles.historyBody}>{item.body || item.message}</Text>
              <View style={styles.historyMetaRow}>
                <View style={styles.historyTag}>
                  <Text style={styles.historyTagText}>{(item.category || 'General').toUpperCase()}</Text>
                </View>
                {item.recipientCount !== undefined && (
                  <Text style={styles.historyRecipients}>
                    {item.recipientCount} recipient(s)
                  </Text>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  segmentBtnTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 8,
  },
  templateScroll: {
    gap: 8,
    paddingBottom: 4,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ede9fe',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  templateChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  categoryChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  audienceRow: {
    flexDirection: 'row',
    gap: 10,
  },
  audienceBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  audienceBtnActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#f5f3ff',
  },
  audienceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  audienceBtnTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  fieldBox: {
    marginTop: 14,
  },
  fieldLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 13.5,
    color: '#0f172a',
  },
  textArea: {
    height: 96,
    paddingTop: 10,
    paddingBottom: 10,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 20,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  // History tab styles
  historyList: {
    paddingHorizontal: 16,
    paddingTop: 10,
    gap: 10,
  },
  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
  },
  historyCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    flex: 1,
  },
  historyTime: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 8,
  },
  historyBody: {
    fontSize: 12.5,
    color: '#475569',
    lineHeight: 18,
  },
  historyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  historyTag: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
  },
  historyRecipients: {
    fontSize: 11,
    color: '#94a3b8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
});
