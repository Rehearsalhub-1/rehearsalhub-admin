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
import { apiClient, storeTokens, clearTokens, SessionExpiredError } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';

WebBrowser.maybeCompleteAuthSession();

type Props = {
  navigation: NativeStackNavigationProp<any>;
};

const ALLOWED_STUDIO_ROLES = [
  'super_admin',
  'admin',
  'hq_admin',
  'zone_admin',
  'zone_coordinator',
  'church_coordinator',
  'subgroup_coordinator',
  'subgroup_admin',
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
      const retryRes = await apiClient.post<{
        success: boolean;
        data?: { accessToken: string; refreshToken: string; user: { id: string; email: string; role: string; name?: string } };
        error?: string;
      }>('/auth/kingschat-login', { accessToken: savedKcToken, selectedEmail: targetEmail, email: targetEmail });

      if (retryRes.success && retryRes.data) {
        const { accessToken: jwtToken, refreshToken, user } = retryRes.data;
        const userRole = (user.role || '').toLowerCase().trim();
        if (!ALLOWED_STUDIO_ROLES.includes(userRole)) {
          await clearTokens();
          Alert.alert('Access Restricted', 'This account does not have Coordinator or Admin privileges.');
          return;
        }
        setMultipleAccounts(null);
        await storeTokens(jwtToken, refreshToken, user.id);
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

        const res = await apiClient.post<{
          success: boolean;
          code?: string;
          accounts?: any[];
          data?: { accessToken: string; refreshToken: string; user: { id: string; email: string; role: string; name?: string } };
          error?: string;
        }>('/auth/kingschat-login', { accessToken });

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
        const userRole = (user.role || '').toLowerCase().trim();

        if (!ALLOWED_STUDIO_ROLES.includes(userRole)) {
          await clearTokens();
          Alert.alert(
            'Access Restricted',
            'Your KingsChat account does not have Coordinator or Admin privileges. Please use the RehearsalHub singer app or contact your zonal coordinator.'
          );
          return;
        }

        await storeTokens(jwtToken, refreshToken, user.id);
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
      const result = await apiClient.post<{
        success: boolean;
        data?: { accessToken: string; refreshToken: string; user: { id: string; email: string; role: string; name?: string } };
        error?: string;
      }>('/auth/login', { email: rawIdentifier, password });

      if (!result.success || !result.data) {
        Alert.alert('Login Failed', result.error || 'Invalid credentials');
        return;
      }

      const { accessToken, refreshToken, user } = result.data;
      const userRole = (user.role || '').toLowerCase().trim();

      if (!ALLOWED_STUDIO_ROLES.includes(userRole)) {
        await clearTokens();
        Alert.alert(
          'Access Restricted',
          'This app is for approved Coordinators and Leadership. Please use the RehearsalHub singer app or contact your zonal coordinator.'
        );
        return;
      }

      await storeTokens(accessToken, refreshToken, user.id);
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
      <StatusBar barStyle="light-content" backgroundColor="#0b0514" />

      {/* Ambient background glows */}
      <View style={styles.ambientGlowPurple} />
      <View style={styles.ambientGlowPink} />

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
            <LinearGradient
              colors={['#9333ea', '#c084fc']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.logoBadge}
            >
              <Ionicons name="shield-checkmark" size={34} color="#ffffff" />
            </LinearGradient>

            <Text style={styles.title}>RehearsalHub Studio</Text>
            <Text style={styles.subtitle}>Coordinator & Leadership Portal</Text>
          </View>

          {/* Sign In Card */}
          <View style={styles.card}>
            {/* Identifier Input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email or Username</Text>
              <View style={styles.inputWrapper}>
                <Ionicons name="person-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder="Enter your email or username"
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
                <Ionicons name="lock-closed-outline" size={18} color="rgba(255,255,255,0.4)" style={styles.inputIcon} />
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
                    color="rgba(255,255,255,0.5)"
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
              <LinearGradient
                colors={['#9333ea', '#a855f7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFillObject}
              />
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <View style={styles.buttonInner}>
                  <Text style={styles.buttonText}>Sign In to Studio</Text>
                  <Ionicons name="arrow-forward" size={16} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

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
          </View>

          {/* Security Notice */}
          <View style={styles.footerNotice}>
            <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.35)" style={{ marginRight: 6 }} />
            <Text style={styles.footerText}>
              Restricted to authorized church & zonal coordinators
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
                  <Ionicons name="people-outline" size={18} color="#a855f7" />
                  <Text style={styles.modalTitle}>Select Account</Text>
                </View>
                <TouchableOpacity onPress={() => setMultipleAccounts(null)} hitSlop={10}>
                  <Ionicons name="close" size={20} color="#fff" />
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
                        backgroundColor: 'rgba(255,255,255,0.06)',
                        borderWidth: 1,
                        borderColor: 'rgba(168, 85, 247, 0.3)',
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
                          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{fullName}</Text>
                          <View style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ color: '#c084fc', fontSize: 10, fontWeight: '700' }}>{roleBadge}</Text>
                          </View>
                        </View>
                        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{acc.email}</Text>
                        {acc.zoneCode ? (
                          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 }}>
                            Zone: {acc.zoneCode}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons name="chevron-forward" size={18} color="#a855f7" />
                    </TouchableOpacity>
                  );
                })}

                {accountSelectLoading && (
                  <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                    <ActivityIndicator color="#a855f7" size="small" />
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
    backgroundColor: '#0b0514',
  },
  ambientGlowPurple: {
    position: 'absolute',
    top: -100,
    right: -100,
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(147, 51, 234, 0.18)',
  },
  ambientGlowPink: {
    position: 'absolute',
    bottom: -80,
    left: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(236, 72, 153, 0.12)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#c084fc',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#161324',
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  forgotText: {
    color: '#c084fc',
    fontSize: 11,
    fontWeight: '700',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  eyeBtn: {
    padding: 6,
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#9333ea',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
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
    marginVertical: 14,
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '700',
  },
  kingschatButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: '#0077FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0077FF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
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
    marginTop: 28,
  },
  footerText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#161324',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(167, 139, 250, 0.25)',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '800',
  },
  modalSub: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 13,
    marginBottom: 12,
  },
  modalBtn: {
    backgroundColor: '#9333ea',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  modalBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
});
