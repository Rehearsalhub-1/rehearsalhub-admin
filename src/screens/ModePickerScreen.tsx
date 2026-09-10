import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAdminStore } from '../stores/adminStore';

export default function ModePickerScreen({ navigation }: any) {
  const session = useAdminStore(s => s.session);
  const setMode = useAdminStore(s => s.setMode);
  const signOut = useAdminStore(s => s.signOut);

  const pick = (mode: 'zone' | 'church') => {
    setMode(mode);
    navigation.replace('MainTabs');
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          navigation.replace('Login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="settings-outline" size={40} color="#7c3aed" style={styles.headerIcon} />
          <Text style={styles.title}>Choose Admin Mode</Text>
          <Text style={styles.sub}>
            Your account has access to both Zone and Church administration.
            {'\n'}Pick a mode to continue — you can switch by logging out.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.card}
          onPress={() => pick('zone')}
          activeOpacity={0.85}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#faf5ff' }]}>
            <Ionicons name="globe-outline" size={30} color="#7c3aed" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Zone Admin</Text>
            <Text style={styles.cardSub}>
              Manage zone programs, members, attendance and songs
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => pick('church')}
          activeOpacity={0.85}
        >
          <View style={[styles.iconWrap, { backgroundColor: '#fff7ed' }]}>
            <Ionicons name="business-outline" size={30} color="#ea580c" />
          </View>
          <View style={styles.cardText}>
            <Text style={styles.cardTitle}>Church Admin</Text>
            <Text style={styles.cardSub}>
              Manage church choir programs, members and songs
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {session && (
          <Text style={styles.greeting}>
            Logged in as {session.name} · {session.email}
          </Text>
        )}

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={16} color="#ef4444" style={{ marginRight: 6 }} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8fafc' },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    alignItems: 'center',
  },
  header: { alignItems: 'center', marginBottom: 40 },
  headerIcon: { marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0f172a',
    marginBottom: 10,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    width: '100%',
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 3,
  },
  cardSub: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  greeting: {
    marginTop: 24,
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  signOutText: {
    fontSize: 14,
    color: '#ef4444',
    fontWeight: '700',
  },
});
