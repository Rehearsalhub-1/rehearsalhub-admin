import React, { useState, useEffect } from 'react';
import { useNotifications } from '../hooks/useNotifications';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useAuth } from '../context/AuthContext';
import { useZoneContext } from '../context/ZoneContext';

interface CategoryOption {
  value: 'rehearsal' | 'announcement' | 'admin' | 'reminder';
  label: string;
  sub: string;
  color: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    value: 'rehearsal',
    label: 'Rehearsal',
    sub: 'Appears in singer Rehearsals tab',
    color: '#7c3aed',
    iconName: 'musical-notes-outline',
  },
  {
    value: 'announcement',
    label: 'Announcement',
    sub: 'Appears in singer Announcements tab',
    color: '#0284c7',
    iconName: 'megaphone-outline',
  },
  {
    value: 'admin',
    label: 'Urgent',
    sub: 'High priority alert to Announcements tab',
    color: '#e11d48',
    iconName: 'alert-circle-outline',
  },
  {
    value: 'reminder',
    label: 'Reminder',
    sub: 'Call time alert in singer Notifications tab',
    color: '#d97706',
    iconName: 'time-outline',
  },
];

const QUICK_TEMPLATES = [
  {
    label: 'Call Time Reminder',
    category: 'rehearsal' as const,
    title: 'Rehearsal Call Time Reminder',
    message: 'Kindly be reminded that call time for today’s rehearsal is prompt. Please arrive warmed up and ready.',
  },
  {
    label: 'Uniform Guidelines',
    category: 'announcement' as const,
    title: 'Official Uniform Guidelines',
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
  const { adminUser } = useAuth();
  const { activeZone, isChurchMode, activeChurch, userChurches } = useZoneContext();

  const isHQ = adminUser?.isHQAdmin === true;
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');
  const { sentHistory, loadingHistory, refreshingHistory, loadHistory, refreshHistory } = useNotifications();

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState<CategoryOption['value']>('rehearsal');
  const [audienceType, setAudienceType] = useState<'zone' | 'church' | 'individual'>(isChurchMode ? 'church' : 'zone');
  const [selectedChurchId, setSelectedChurchId] = useState(activeChurch?.id || '');
  const [targetEmail, setTargetEmail] = useState('');
  const [sending, setSending] = useState(false);

  // Sync selected church with active church & mode
  useEffect(() => {
    if (activeChurch?.id) {
      setSelectedChurchId(activeChurch.id);
    }
    if (isChurchMode) {
      setAudienceType('church');
    }
  }, [activeChurch?.id, isChurchMode]);

  // Load sent history lazily when the tab becomes active
  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  function applyTemplate(tpl: typeof QUICK_TEMPLATES[0]) {
    setTitle(tpl.title);
    setMessage(tpl.message);
    setCategory(tpl.category);
  }

  async function sendNotification() {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Title and message body are required.');
      return;
    }

    if (audienceType === 'individual' && !targetEmail.trim()) {
      Alert.alert('Missing field', 'Please enter the target singer email.');
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        body: message.trim(),
        category,
        type: category === 'admin' ? 'warning' : category === 'rehearsal' ? 'rehearsal' : 'info',
        priority: category === 'admin' ? 'high' : 'normal',
      };

      if (audienceType === 'individual') {
        // Resolve target email to singer userId
        const res = await api.members.getGlobalMembers(targetEmail.trim().toLowerCase());
        const matched = Array.isArray(res?.data) ? res.data[0] : null;
        if (!matched?.userId && !matched?.id) {
          Alert.alert('Not Found', `No singer found with email "${targetEmail.trim()}".`);
          setSending(false);
          return;
        }
        payload.targetUserId = matched.userId || matched.id;
      } else if (audienceType === 'church') {
        const churchId = selectedChurchId || activeChurch?.id;
        if (!churchId) {
          Alert.alert('Missing Church', 'Please select a church choir.');
          setSending(false);
          return;
        }
        payload.targetChurchId = churchId;
      } else {
        // Scoped to active zone / HQ
        payload.targetOrgId = activeZone?.id;
      }

      const res = await api.notifications.send(payload as any);

      const count = res?.recipientCount ?? 0;
      Alert.alert(
        'Notification Dispatched!',
        `Your notification has been broadcast to ${count > 0 ? `${count} singer(s)` : 'target recipients'} and sent via push notifications.`
      );

      setTitle('');
      setMessage('');
      setTargetEmail('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to dispatch notification.');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title={isChurchMode ? 'Church Choir Broadcast' : isHQ ? 'HQ Announcements' : 'Zonal Broadcast'} />

      {/* ── Tabs (Compose vs Sent History) ──────────────────────────────── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'compose' && styles.tabBtnActive]}
          onPress={() => setActiveTab('compose')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="paper-plane-outline"
            size={16}
            color={activeTab === 'compose' ? '#4f46e5' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, activeTab === 'compose' && styles.tabBtnTextActive]}>
            Compose
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'history' && styles.tabBtnActive]}
          onPress={() => setActiveTab('history')}
          activeOpacity={0.8}
        >
          <Ionicons
            name="time-outline"
            size={16}
            color={activeTab === 'history' ? '#4f46e5' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabBtnText, activeTab === 'history' && styles.tabBtnTextActive]}>
            Sent History
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── TAB 1: COMPOSE ─────────────────────────────────────────────── */}
      {activeTab === 'compose' ? (
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Quick Templates */}
          <Text style={styles.label}>1-Tap Quick Templates</Text>
          <View style={styles.templateRow}>
            {QUICK_TEMPLATES.map((tpl, i) => (
              <TouchableOpacity
                key={i}
                style={styles.templateChip}
                onPress={() => applyTemplate(tpl)}
                activeOpacity={0.75}
              >
                <Ionicons name="flash-outline" size={12} color="#4f46e5" style={{ marginRight: 4 }} />
                <Text style={styles.templateChipText}>{tpl.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Selector */}
          <Text style={styles.label}>Notification Category (Where singers see this)</Text>
          <View style={styles.categoryGrid}>
            {CATEGORY_OPTIONS.map((opt) => {
              const isSelected = category === opt.value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.categoryCard,
                    isSelected && { borderColor: opt.color, backgroundColor: opt.color + '12' },
                  ]}
                  onPress={() => setCategory(opt.value)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.categoryIconWrap, { backgroundColor: opt.color + '20' }]}>
                    <Ionicons name={opt.iconName} size={18} color={opt.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.categoryTitle, isSelected && { color: opt.color }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.categorySub} numberOfLines={2}>
                      {opt.sub}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Audience Selector */}
          <Text style={styles.label}>Target Audience</Text>
          <View style={styles.audienceRow}>
            {/* Zone / Hub Option */}
            {!isChurchMode && (
              <TouchableOpacity
                style={[styles.audienceBtn, audienceType === 'zone' && styles.audienceBtnActive]}
                onPress={() => setAudienceType('zone')}
                activeOpacity={0.75}
              >
                <Ionicons
                  name={isHQ ? 'home-outline' : 'location-outline'}
                  size={14}
                  color={audienceType === 'zone' ? '#4f46e5' : '#64748b'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.audienceBtnText, audienceType === 'zone' && styles.audienceBtnTextActive]}>
                  {isHQ ? '🏛️ Loveworld Singers HQ' : `📍 ${activeZone?.name || 'This Zone'}`}
                </Text>
              </TouchableOpacity>
            )}

            {/* Church Option */}
            <TouchableOpacity
              style={[styles.audienceBtn, audienceType === 'church' && styles.audienceBtnActive]}
              onPress={() => setAudienceType('church')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="business-outline"
                size={14}
                color={audienceType === 'church' ? '#ea580c' : '#64748b'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.audienceBtnText, audienceType === 'church' && styles.audienceBtnTextActive]}>
                ⛪ Church Choir
              </Text>
            </TouchableOpacity>

            {/* Specific Person Option */}
            <TouchableOpacity
              style={[styles.audienceBtn, audienceType === 'individual' && styles.audienceBtnActive]}
              onPress={() => setAudienceType('individual')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="person-outline"
                size={14}
                color={audienceType === 'individual' ? '#7c3aed' : '#64748b'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.audienceBtnText, audienceType === 'individual' && styles.audienceBtnTextActive]}>
                👤 Specific Singer
              </Text>
            </TouchableOpacity>
          </View>

          {/* Individual Email Target Input */}
          {audienceType === 'individual' && (
            <View style={styles.targetCard}>
              <Text style={styles.targetLabel}>Singer Email Address</Text>
              <TextInput
                style={styles.input}
                value={targetEmail}
                onChangeText={setTargetEmail}
                placeholder="singer@loveworldsingers.org"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          )}

          {/* Church Chooser (if multiple churches exist) */}
          {audienceType === 'church' && userChurches.length > 1 && (
            <View style={styles.targetCard}>
              <Text style={styles.targetLabel}>Select Assembly Choir</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {userChurches.map((c) => {
                  const isSel = selectedChurchId === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.churchChip, isSel && styles.churchChipActive]}
                      onPress={() => setSelectedChurchId(c.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.churchChipText, isSel && styles.churchChipTextActive]}>
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Title */}
          <Text style={styles.label}>Announcement Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Wednesday Rehearsal Call Time"
            placeholderTextColor="#94a3b8"
          />

          {/* Message */}
          <Text style={styles.label}>Message Body</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={message}
            onChangeText={setMessage}
            placeholder="Write your broadcast announcement..."
            placeholderTextColor="#94a3b8"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendBtn, sending && { opacity: 0.6 }]}
            onPress={sendNotification}
            disabled={sending}
            activeOpacity={0.85}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.sendBtnText}>Dispatch Broadcast & Push Alert</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      ) : (
        /* ── TAB 2: SENT HISTORY ────────────────────────────────────────── */
        <ScrollView
          contentContainerStyle={styles.historyContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshingHistory}
              onRefresh={refreshHistory}
              tintColor="#4f46e5"
            />
          }
        >
          {loadingHistory ? (
            <View style={styles.center}>
              <ActivityIndicator color="#4f46e5" size="large" />
              <Text style={{ marginTop: 10, color: '#64748b', fontSize: 13 }}>Loading sent history...</Text>
            </View>
          ) : sentHistory.length === 0 ? (
            <View style={styles.emptyNotice}>
              <Ionicons name="mail-unread-outline" size={44} color="#cbd5e1" />
              <Text style={styles.emptyTitle}>No Broadcasts Yet</Text>
              <Text style={styles.emptySub}>
                Notifications and announcements you send will appear here with delivery tracking.
              </Text>
            </View>
          ) : (
            sentHistory.map((item) => {
              const d = new Date(item.createdAt);
              const formattedDate = !isNaN(d.getTime())
                ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                : 'Recently';

              const catColor =
                item.category === 'rehearsal'
                  ? '#7c3aed'
                  : item.category === 'admin'
                  ? '#e11d48'
                  : item.category === 'announcement'
                  ? '#0284c7'
                  : '#d97706';

              return (
                <View key={item.id} style={styles.historyCard}>
                  <View style={styles.historyTop}>
                    <View style={[styles.catBadge, { backgroundColor: catColor + '18' }]}>
                      <Text style={[styles.catBadgeText, { color: catColor }]}>
                        {item.category?.toUpperCase() || 'GENERAL'}
                      </Text>
                    </View>
                    <Text style={styles.historyDate}>{formattedDate}</Text>
                  </View>

                  <Text style={styles.historyTitle}>{item.title}</Text>
                  <Text style={styles.historyBody}>{item.body || item.message}</Text>

                  <View style={styles.historyFooter}>
                    <View style={styles.historyStat}>
                      <Ionicons name="paper-plane-outline" size={13} color="#64748b" />
                      <Text style={styles.historyStatText}>
                        {item.recipientCount ?? 1} Delivered
                      </Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Ionicons name="eye-outline" size={13} color="#059669" />
                      <Text style={[styles.historyStatText, { color: '#059669' }]}>
                        {item.readCount ?? 0} Read
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  historyContainer: { padding: 16, gap: 12, paddingBottom: 40 },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: '#ffffff',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  tabBtnTextActive: {
    color: '#0f172a',
  },

  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 4,
  },

  templateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  templateChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338ca',
  },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryCard: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0f172a',
  },
  categorySub: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },

  audienceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  audienceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  audienceBtnActive: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  audienceBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  audienceBtnTextActive: {
    color: '#4338ca',
    fontWeight: '700',
  },

  targetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  targetLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  churchChip: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
  },
  churchChipActive: {
    backgroundColor: '#fff7ed',
    borderColor: '#ea580c',
  },
  churchChipText: {
    fontSize: 11,
    color: '#475569',
  },
  churchChipTextActive: {
    color: '#c2410c',
    fontWeight: '700',
  },

  input: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
  },
  textarea: {
    minHeight: 100,
  },

  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },

  historyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  historyDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  historyBody: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 18,
  },
  historyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  historyStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  historyStatText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },

  emptyNotice: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
});
