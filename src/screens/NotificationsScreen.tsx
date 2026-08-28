import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../lib/apiClient';
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
  const { activeZone, isAllZones } = useZoneContext();

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

      // Zone scoping
      if (activeZone && effectiveAudience !== 'individual') {
        payload.targetZoneId = activeZone.id;
      }

      // Individual targeting — resolve email to userId
      if (effectiveAudience === 'individual' && targetEmail.trim()) {
        const res = await apiClient.get<{ success: boolean; data: any[] }>(
          `/profiles?email=${encodeURIComponent(targetEmail.trim().toLowerCase())}`
        ).catch(() => null);
        const profile = Array.isArray(res?.data) ? res.data[0] : null;
        if (!profile) {
          Alert.alert('Not found', 'No member found with that email.');
          setSending(false);
          return;
        }
        payload.targetAudience = 'individual';
        payload.targetUserId = profile.id;
      }

      await apiClient.post('/notifications/broadcast', payload);

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
      <ZoneHeader title="Send Notification" />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Broadcast Announcement</Text>
        <Text style={styles.sub}>
          {isAllZones
            ? 'Sending to all zones — select a zone above to narrow audience.'
            : `Target: ${activeZone?.name ?? 'Assigned Zone'}`}
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
  heading: { color: Colors.textPrimary, fontSize: 20, fontWeight: '800', marginBottom: 4 },
  sub: { color: Colors.textMuted, fontSize: 13, marginBottom: 20, lineHeight: 18 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 18 },
  optional: { color: Colors.textMuted, fontWeight: '400' },
  input: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  textarea: { height: 100, paddingTop: 12 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionText: { color: Colors.textMuted, fontSize: 12, fontWeight: '600' },
  preview: { marginTop: 24 },
  previewLabel: { color: Colors.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  previewCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 4,
  },
  previewTitle: { color: Colors.textPrimary, fontSize: 14, fontWeight: '700' },
  previewMessage: { color: Colors.textSecondary, fontSize: 13, lineHeight: 18 },
  sendBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  sendBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
