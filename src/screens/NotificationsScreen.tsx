import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';
import ZoneHeader from '../components/ZoneHeader';
import { useAuth } from '../context/AuthContext';
import { useZoneContext } from '../context/ZoneContext';

interface TypeOption {
  value: 'info' | 'warning' | 'success' | 'rehearsal' | 'announcement';
  label: string;
  color: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const TYPE_OPTIONS: TypeOption[] = [
  { value: 'info',         label: 'Info',         color: Colors.info,      iconName: 'information-circle-outline' },
  { value: 'warning',      label: 'Warning',      color: Colors.warning,   iconName: 'warning-outline' },
  { value: 'success',      label: 'Success',      color: Colors.success,   iconName: 'checkmark-circle-outline' },
  { value: 'rehearsal',    label: 'Rehearsal',    color: Colors.accent,    iconName: 'musical-notes-outline' },
  { value: 'announcement', label: 'Announcement', color: '#e879f9',        iconName: 'megaphone-outline' },
];

interface AudienceOption {
  value: 'all' | 'zone' | 'individual';
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
}

const AUDIENCE_OPTIONS: AudienceOption[] = [
  { value: 'all',        label: 'All Members',    iconName: 'globe-outline' },
  { value: 'zone',       label: 'This Zone Only', iconName: 'location-outline' },
  { value: 'individual', label: 'Specific Person', iconName: 'person-outline' },
];

type TypeValue = TypeOption['value'];
type AudienceValue = AudienceOption['value'];

export default function NotificationsScreen() {
  const { adminUser } = useAuth();
  const { activeZone, isAllZones, isChurchMode, activeChurch } = useZoneContext();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState<TypeValue>('info');
  const [audience, setAudience] = useState<AudienceValue>('all');
  const [targetEmail, setTargetEmail] = useState('');
  const [actionUrl, setActionUrl] = useState('');
  const [sending, setSending] = useState(false);

  // For zone admins, force audience to zone only
  const effectiveAudience = !adminUser?.isHQAdmin ? 'zone' : audience;

  async function sendNotification() {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Missing fields', 'Title and message are required.');
      return;
    }
    if (effectiveAudience === 'individual' && !targetEmail.trim()) {
      Alert.alert('Missing field', 'Enter the target member email.');
      return;
    }

    setSending(true);
    try {
      const payload: Record<string, any> = {
        title: title.trim(),
        message: message.trim(),
        type,
        category: type === 'rehearsal' ? 'rehearsal' : type === 'announcement' ? 'announcement' : 'admin',
        priority: type === 'warning' ? 'high' : 'medium',
        targetAudience: effectiveAudience === 'zone' ? 'all' : effectiveAudience,
        senderId: adminUser?.id || '',
        senderName: adminUser?.name || adminUser?.email?.split('@')[0] || 'Coordinator',
        actionUrl: actionUrl.trim() || undefined,
      };

      // Scope targeting
      if (isChurchMode && activeChurch) {
        payload.targetSubGroupId = activeChurch.id;
        payload.targetChurchId = activeChurch.id;
      } else if (activeZone && effectiveAudience !== 'individual') {
        payload.targetZoneId = activeZone.id;
      }

      // Individual targeting — resolve email to userId
      if (effectiveAudience === 'individual' && targetEmail.trim()) {
        const res = await api.members.getDirectory(undefined, 10, targetEmail.trim().toLowerCase()).catch(() => null);
        const profile = Array.isArray(res?.data) ? res.data[0] : null;
        if (!profile) {
          Alert.alert('Not found', 'No member found with that email.');
          setSending(false);
          return;
        }
        payload.targetAudience = 'individual';
        payload.targetUserId = profile.id;
      }

      await api.notifications.broadcast(payload as any);

      Alert.alert('Sent!', 'Notification dispatched successfully.');
      setTitle('');
      setMessage('');
      setTargetEmail('');
      setActionUrl('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to send notification.');
    } finally {
      setSending(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ZoneHeader title={isChurchMode ? "Church Choir Broadcast" : "Broadcast Notifications"} />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sub}>
          {isChurchMode
            ? `Target Audience: ${activeChurch?.name || 'Local Church Choir'}`
            : isAllZones
            ? 'Sending to all choir zones — select a zone to narrow audience.'
            : `Target Audience: ${activeZone?.name ?? 'Assigned Zone'}`}
        </Text>

        {/* Title */}
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={title}
          onChangeText={setTitle}
          placeholder="e.g. Rehearsal Update & Schedule"
          placeholderTextColor={Colors.textMuted}
        />

        {/* Message */}
        <Text style={styles.label}>Message Body</Text>
        <TextInput
          style={[styles.input, styles.textarea]}
          value={message}
          onChangeText={setMessage}
          placeholder="Write the announcement message here..."
          placeholderTextColor={Colors.textMuted}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />

        {/* Type */}
        <Text style={styles.label}>Notification Category</Text>
        <View style={styles.optionRow}>
          {TYPE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.optionBtn,
                type === opt.value && { borderColor: opt.color, backgroundColor: opt.color + '18' },
              ]}
              onPress={() => setType(opt.value)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={opt.iconName}
                size={14}
                color={type === opt.value ? opt.color : Colors.textMuted}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.optionText, type === opt.value && { color: opt.color, fontWeight: '700' }]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Audience (HQ admin only — zone admin is always zone-scoped) */}
        {adminUser?.isHQAdmin && (
          <>
            <Text style={styles.label}>Audience Scope</Text>
            <View style={styles.optionRow}>
              {AUDIENCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.optionBtn,
                    audience === opt.value && { borderColor: Colors.accent, backgroundColor: Colors.accentSubtle },
                  ]}
                  onPress={() => setAudience(opt.value)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={opt.iconName}
                    size={14}
                    color={audience === opt.value ? Colors.accentBright : Colors.textMuted}
                    style={{ marginRight: 6 }}
                  />
                  <Text style={[styles.optionText, audience === opt.value && { color: Colors.accentBright, fontWeight: '700' }]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Individual target email */}
        {effectiveAudience === 'individual' && (
          <>
            <Text style={styles.label}>Target Member Email</Text>
            <TextInput
              style={styles.input}
              value={targetEmail}
              onChangeText={setTargetEmail}
              placeholder="member@loveworld.org"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        )}

        {/* Optional action URL */}
        <Text style={styles.label}>Action Route <Text style={styles.optional}>(optional)</Text></Text>
        <TextInput
          style={styles.input}
          value={actionUrl}
          onChangeText={setActionUrl}
          placeholder="e.g. /songs/123 or /rehearsal"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="none"
        />

        {/* Preview */}
        {(title.trim() || message.trim()) && (
          <View style={styles.preview}>
            <Text style={styles.previewLabel}>Message Preview</Text>
            <View style={styles.previewCard}>
              <Text style={styles.previewTitle}>{title || 'Announcement Title'}</Text>
              <Text style={styles.previewMessage}>{message || 'Message body will appear here...'}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.sendBtn, sending && { opacity: 0.6 }]}
          onPress={sendNotification}
          disabled={sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.sendBtnText}>Broadcast Notification</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: 20 },
  heading: { color: Colors.textPrimary, fontSize: 18, fontWeight: '800', letterSpacing: -0.3, marginBottom: 4 },
  sub: { color: Colors.textMuted, fontSize: 12, marginBottom: 20, lineHeight: 18 },
  label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 18 },
  optional: { color: Colors.textMuted, fontWeight: '400' },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  textarea: { height: 110, paddingTop: 12 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  optionText: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  preview: { marginTop: 24 },
  previewLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  previewCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 6,
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  previewTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '800' },
  previewMessage: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20 },
  sendBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  sendBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800', letterSpacing: 0.2 },
});
