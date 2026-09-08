import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  StatusBar,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, SessionExpiredError } from '../services/api';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const ALLOWED_STUDIO_ROLES = [
  'super_admin',
  'admin',
  'hq_admin',
  'boss',
  'org_admin',
  'zone_admin',
  'zone_coordinator',
  'church_coordinator',
  'subgroup_coordinator',
  'subgroup_admin',
  'group_admin',
  'coordinator',
];

export default function LoginScreen({ navigation }: Props) {
  const { refreshUser } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [kingsChatLoading, setKingsChatLoading] = useState(false);

  // Multi-Account Chooser State
  const [multipleAccounts, setMultipleAccounts] = useState<any[] | null>(null);
  const [savedKcToken, setSavedKcToken] = useState<string>('');
  const [accountSelectLoading, setAccountSelectLoading] = useState(false);

  async function handleSelectAccount(targetEmail: string) {
    if (!savedKcToken) return;
    setAccountSelectLoading(true);
    try {
      const retryRes = await api.auth.kingschatLogin({ accessToken: savedKcToken, selectedEmail: targetEmail, email: targetEmail });

      if (retryRes.success && retryRes.data) {
        const { accessToken: jwtToken, refreshToken, user } = retryRes.data;
        setMultipleAccounts(null);
        await api.auth.storeTokens(jwtToken, refreshToken, user.id);
        await refreshUser();
        navigation.replace('MainTabs');
      } else {
        Alert.alert('Login Failed', retryRes.error || 'Failed to authenticate');
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err?.message || 'Failed to sign into account');
    } finally {
      setAccountSelectLoading(false);
    }
  }

  async function handleKingsChatAuth() {
    setKingsChatLoading(true);
    try {
      const KINGSCHAT_CLIENT_ID =
        process.env.EXPO_PUBLIC_KINGSCHAT_CLIENT_ID || 'a1f444fa-ea50-47cf-ba2b-232d0b46d1f5';
      const authUrl = `https://accounts.kingschat.online/log-in?clientId=${KINGSCHAT_CLIENT_ID}&origin=studio&state=studio`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, 'rehearsalhubadmin://kingschat-callback');

      if (result.type === 'success' && result.url) {
        // Extract token from both query parameters and URL hash fragments
        let accessToken = '';

        const tokenMatch = result.url.match(/(?:access_token|accessToken|token)=([^&#]+)/);
        if (tokenMatch && tokenMatch[1]) {
          accessToken = decodeURIComponent(tokenMatch[1]);
        } else {
          try {
            const cleanUrl = result.url.replace('#', '?');
            const urlObj = new URL(cleanUrl);
            accessToken =
              urlObj.searchParams.get('access_token') ||
              urlObj.searchParams.get('accessToken') ||
              urlObj.searchParams.get('token') ||
              '';
          } catch {}
        }

        if (!accessToken) {
          Alert.alert('Authentication Failed', 'Failed to retrieve access token from KingsChat. Please try again.');
          return;
        }

        const res = await api.auth.kingschatLogin({ accessToken });

        if (!res.success) {
          if (res.code === 'MULTIPLE_ACCOUNTS' && (res as any).accounts?.length > 1) {
            setMultipleAccounts((res as any).accounts);
            setSavedKcToken(accessToken);
            return;
          }

          if (res.code === 'NO_ACCOUNT' || res.code === 'NEW_USER') {
            Alert.alert(
              'No Coordinator Account Found',
              'Your KingsChat profile is not linked to an existing Coordinator account. Please sign in with your email & password first or contact your Zonal Coordinator.'
            );
            return;
          }
          Alert.alert('Login Failed', res.error || 'Failed to authenticate with KingsChat');
          return;
        }

        if (!res.data) {
          Alert.alert('Login Failed', 'Invalid response received from server.');
          return;
        }

        const { accessToken: jwtToken, refreshToken, user } = res.data;
        await api.auth.storeTokens(jwtToken, refreshToken, user.id);
        await refreshUser();
        navigation.replace('MainTabs');
      }
    } catch (err: any) {
      if (!err?.message?.includes('cancel') && !err?.message?.includes('dismissed')) {
        Alert.alert('KingsChat Login Error', err?.message || 'Failed to authenticate with KingsChat');
      }
    } finally {
      setKingsChatLoading(false);
    }
  }

  async function handleLogin() {
    const rawIdentifier = identifier.trim();
    if (!rawIdentifier || !password.trim()) {
      Alert.alert('Sign In Required', 'Please enter your email or username and password.');
      return;
    }

    setLoading(true);
    try {
      const result = await api.auth.login(rawIdentifier, password);

      if (!result.success || !result.data) {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
        return;
      }

      const { accessToken, refreshToken, user } = result.data;
      await api.auth.storeTokens(accessToken, refreshToken, user.id);
      await refreshUser();
      navigation.replace('MainTabs');
    } catch (error: any) {
      if (error instanceof SessionExpiredError) {
        Alert.alert('Login Failed', 'Session expired. Please try again.');
      } else {
        Alert.alert('Login Failed', error?.message || 'Invalid credentials');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header & Branding */}
          <View style={styles.header}>
            <View style={styles.logoBadge}>
              <Ionicons name="musical-notes" size={30} color={Colors.accent} />
            </View>

            <Text style={styles.title}>LoveWorld Singers</Text>
            <Text style={styles.subtitle}>Admin Console</Text>
          </View>

          {/* Sign In Card */}
          <View style={styles.card}>
            {/* 1-Tap KingsChat Button */}
            <TouchableOpacity
              style={[styles.kingschatButton, kingsChatLoading && styles.buttonDisabled]}
              onPress={handleKingsChatAuth}
              disabled={kingsChatLoading}
              activeOpacity={0.85}
            >
              {kingsChatLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.buttonInner}>
                  <Ionicons name="chatbubbles" size={18} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.kingschatButtonText}>Continue with KingsChat</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or sign in with email</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Identifier Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email or Username</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="admin@loveworld.org"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={18}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Sign In</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Security Notice */}
          <View style={styles.footerNotice}>
            <Ionicons name="lock-closed" size={13} color={Colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={styles.footerText}>
              Restricted to authorized choir coordinators & leadership
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Multi-Account Chooser Modal */}
      {multipleAccounts && (
        <Modal
          visible={!!multipleAccounts}
          transparent
          animationType="fade"
          onRequestClose={() => setMultipleAccounts(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { maxHeight: '80%' }]}>
              <View style={styles.modalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="people-outline" size={18} color={Colors.accent} />
                  <Text style={styles.modalTitle}>Select Account</Text>
                </View>
                <TouchableOpacity onPress={() => setMultipleAccounts(null)} hitSlop={10}>
                  <Ionicons name="close" size={20} color={Colors.textPrimary} />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ padding: 18 }}>
                <Text style={styles.modalSub}>
                  Multiple accounts are linked to this KingsChat profile. Choose which account to sign into:
                </Text>

                {multipleAccounts.map((acc, idx) => {
                  const fullName = `${acc.firstName || ''} ${acc.lastName || ''}`.trim() || 'Coordinator';
                  const roleBadge =
                    acc.role === 'super_admin' || acc.role === 'hq_admin' || acc.hasHqAccess
                      ? 'HQ Admin'
                      : acc.role === 'zone_coordinator'
                      ? 'Zonal Coordinator'
                      : acc.role === 'church_coordinator'
                      ? 'Church Coordinator'
                      : acc.role === 'subgroup_coordinator'
                      ? 'Group Coordinator'
                      : 'Choir Member';

                  return (
                    <TouchableOpacity
                      key={acc.id || idx}
                      disabled={accountSelectLoading}
                      onPress={() => handleSelectAccount(acc.email)}
                      style={{
                        backgroundColor: '#ffffff',
                        borderWidth: 1,
                        borderColor: '#e2e8f0',
                        borderRadius: 14,
                        padding: 14,
                        marginBottom: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                          <Text style={{ color: Colors.textPrimary, fontSize: 14, fontWeight: '700' }}>{fullName}</Text>
                          <View style={{ backgroundColor: '#f3e8ff', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ color: '#7c3aed', fontSize: 10, fontWeight: '700' }}>{roleBadge}</Text>
                          </View>
                        </View>
                        <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>{acc.email}</Text>
                        {acc.zoneCode ? (
                          <Text style={{ color: Colors.textMuted, fontSize: 11, marginTop: 2 }}>
                            Zone: {acc.zoneCode}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={Colors.accent} />
                    </TouchableOpacity>
                  );
                })}

                {accountSelectLoading && (
                  <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                    <ActivityIndicator color={Colors.accent} size="small" />
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#f3e8ff',
    borderWidth: 1,
    borderColor: '#e9d5ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    marginTop: 4,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  kingschatButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  kingschatButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  footerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  modalSub: {
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
});
