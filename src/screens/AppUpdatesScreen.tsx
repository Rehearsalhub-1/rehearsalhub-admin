import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import ZoneHeader from '../components/ZoneHeader';
import { api } from '../services/api';
import { Colors } from '../constants/Colors';

interface AppUpdateConfig {
  latestVersion: string;
  minRequiredVersion: string;
  downloadUrl: string;
  releaseNotes: string;
  forceUpdate?: boolean;
}

export default function AppUpdatesScreen() {
  const [latestVersion, setLatestVersion] = useState('2.4.0');
  const [minRequiredVersion, setMinRequiredVersion] = useState('2.0.0');
  const [downloadUrl, setDownloadUrl] = useState('https://rehearsalhub.app/download');
  const [releaseNotes, setReleaseNotes] = useState(
    '• AudioLab Pitch & Key Shift engine v2\n• Instant push notifications for scheduled rehearsals\n• Real-time geofenced attendance clock-in\n• Offline choir setlist and lyric caching'
  );
  const [forceUpdate, setForceUpdate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadVersionControl() {
      setLoading(true);
      try {
        const res = await api.settings.get('version-control');
        const data = res?.data || res;
        if (data) {
          if (data.latestVersion) setLatestVersion(String(data.latestVersion));
          if (data.minRequiredVersion) setMinRequiredVersion(String(data.minRequiredVersion));
          if (data.downloadUrl) setDownloadUrl(String(data.downloadUrl));
          if (data.releaseNotes) setReleaseNotes(String(data.releaseNotes));
          if (typeof data.forceUpdate === 'boolean') setForceUpdate(data.forceUpdate);
        }
      } catch (err: any) {
        console.warn('Could not load version control settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadVersionControl();
  }, []);

  function bumpVersion(type: 'patch' | 'minor') {
    const parts = latestVersion.split('.').map((p) => parseInt(p, 10) || 0);
    while (parts.length < 3) parts.push(0);
    if (type === 'patch') {
      parts[2] += 1;
    } else {
      parts[1] += 1;
      parts[2] = 0;
    }
    setLatestVersion(parts.join('.'));
  }

  async function handleSave() {
    if (!latestVersion.trim()) {
      Alert.alert('Missing Field', 'Please enter a valid Latest Version (e.g. 2.4.0)');
      return;
    }
    if (!downloadUrl.trim()) {
      Alert.alert('Missing Field', 'Please enter a download URL for singers');
      return;
    }

    setSaving(true);
    try {
      const payload: AppUpdateConfig = {
        latestVersion: latestVersion.trim(),
        minRequiredVersion: minRequiredVersion.trim() || latestVersion.trim(),
        downloadUrl: downloadUrl.trim(),
        releaseNotes: releaseNotes.trim(),
        forceUpdate,
      };

      await api.settings.update('version-control', payload);
      Alert.alert(
        'App Updates Published! 🚀',
        `Version ${latestVersion.trim()} is now published. Singers on earlier builds will receive the update prompt on mobile launch.`
      );
    } catch (err: any) {
      Alert.alert('Save Failed', err?.message || 'Could not update version settings.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ZoneHeader title="App Version Control" showBack={true} />

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loadingText}>Fetching version control rules...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header Card */}
          <View style={styles.heroCard}>
            <View style={styles.heroIconBox}>
              <Ionicons name="phone-portrait-outline" size={24} color="#6366f1" />
            </View>
            <View style={styles.heroTextCol}>
              <Text style={styles.heroTitle}>Mobile App Version Control</Text>
              <Text style={styles.heroSub}>
                Manage required mobile versions for singers and push OTA or store update prompts.
              </Text>
            </View>
          </View>

          {/* Quick Version Bump */}
          <View style={styles.bumpCard}>
            <Text style={styles.bumpTitle}>Quick Version Increment</Text>
            <View style={styles.bumpRow}>
              <TouchableOpacity style={styles.bumpBtn} onPress={() => bumpVersion('patch')} activeOpacity={0.7}>
                <Ionicons name="add-circle-outline" size={15} color="#4f46e5" />
                <Text style={styles.bumpBtnText}>+0.0.1 Patch</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.bumpBtn} onPress={() => bumpVersion('minor')} activeOpacity={0.7}>
                <Ionicons name="arrow-up-circle-outline" size={15} color="#4f46e5" />
                <Text style={styles.bumpBtnText}>+0.1.0 Minor</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Form Fields */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionHeader}>VERSION CONFIGURATION</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Latest Released Version</Text>
              <TextInput
                style={styles.textInput}
                value={latestVersion}
                onChangeText={setLatestVersion}
                placeholder="e.g. 2.4.0"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>Singers with lower builds will see the update banner.</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Minimum Required Version (Mandatory)</Text>
              <TextInput
                style={styles.textInput}
                value={minRequiredVersion}
                onChangeText={setMinRequiredVersion}
                placeholder="e.g. 2.0.0"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>
                Users below this version cannot proceed without updating.
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>App Download / Store URL</Text>
              <TextInput
                style={styles.textInput}
                value={downloadUrl}
                onChangeText={setDownloadUrl}
                placeholder="https://rehearsalhub.app/download"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
              />
              <Text style={styles.helperText}>Direct link opened when singer taps "Update Now".</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Release Notes</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={releaseNotes}
                onChangeText={setReleaseNotes}
                placeholder="List key highlights and bug fixes..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.switchTitle}>Enforce Immediate Update</Text>
                <Text style={styles.switchSub}>
                  When active, blocks all choir members from bypassing the update dialogue.
                </Text>
              </View>
              <Switch
                value={forceUpdate}
                onValueChange={setForceUpdate}
                trackColor={{ false: '#cbd5e1', true: '#818cf8' }}
                thumbColor={forceUpdate ? '#4f46e5' : '#f8fafc'}
              />
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Publish Version Config</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  heroIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  heroTextCol: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  heroSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 16,
  },
  bumpCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
  },
  bumpTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 8,
  },
  bumpRow: {
    flexDirection: 'row',
    gap: 10,
  },
  bumpBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f3ff',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  bumpBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4f46e5',
    marginLeft: 6,
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.6,
    marginBottom: 14,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
  },
  textArea: {
    height: 84,
    textAlignVertical: 'top',
  },
  helperText: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    marginTop: 4,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
  },
  switchSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    lineHeight: 15,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
