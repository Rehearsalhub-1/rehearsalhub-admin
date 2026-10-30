import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useAdminStore, LinkedAccountItem } from '../stores/adminStore';
import { useAlert } from '../context/AlertContext';

interface AdminScopeModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function AdminScopeModal({ visible, onClose }: AdminScopeModalProps) {
  const session = useAdminStore(s => s.session);
  const linkedAccounts = useAdminStore(s => s.linkedAccounts);
  const setMode = useAdminStore(s => s.setMode);
  const setChurch = useAdminStore(s => s.setChurch);
  const fetchLinkedAccounts = useAdminStore(s => s.fetchLinkedAccounts);
  const switchAccount = useAdminStore(s => s.switchAccount);
  const { showAlert } = useAlert();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [fetchingAccounts, setFetchingAccounts] = useState(false);

  useEffect(() => {
    if (visible) {
      setFetchingAccounts(true);
      fetchLinkedAccounts().finally(() => {
        setFetchingAccounts(false);
      });
    }
  }, [visible]);

  if (!session) return null;

  const hasZoneAccess = session.role === 'hq_admin' || session.role === 'zone_admin';
  const isHQ = session.isHQ || session.role === 'hq_admin';
  const isChurchMode = session.mode === 'church';
  const currentChurchId = session.churchId;
  const churches = session.churches || [];

  const handleSelectZone = async () => {
    if (session.mode === 'zone') {
      onClose();
      return;
    }
    setLoadingAction('zone');
    try {
      await setMode('zone');
      onClose();
    } catch (err: any) {
      showAlert('Switch Failed', err?.message || 'Could not switch to Zone mode');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSelectChurch = async (churchId: string) => {
    if (isChurchMode && currentChurchId === churchId) {
      onClose();
      return;
    }
    setLoadingAction(`church-${churchId}`);
    try {
      await setChurch(churchId);
      onClose();
    } catch (err: any) {
      showAlert('Switch Failed', err?.message || 'Could not switch to Church');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSwitchAccount = async (account: LinkedAccountItem) => {
    if (account.isCurrent) {
      onClose();
      return;
    }
    setLoadingAction(`account-${account.id}`);
    try {
      await switchAccount(account.id);
      onClose();
    } catch (err: any) {
      showAlert('Account Switch Failed', err?.message || 'Unable to switch account');
    } finally {
      setLoadingAction(null);
    }
  };

  const activeLabel = isChurchMode
    ? (session.churchName || 'Church Choir')
    : (session.zoneName || (isHQ ? 'Loveworld Singers HQ' : 'Assigned Zone'));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Switch Workspace</Text>
              <Text style={styles.subtitle}>
                Select an active choir, zone, or linked admin account
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Current Active Workspace Indicator */}
          <View style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <View style={styles.pulseDot} />
              <Text style={styles.currentLabel}>ACTIVE WORKSPACE</Text>
            </View>
            <View style={styles.currentRow}>
              <View style={[styles.iconWrap, { backgroundColor: isChurchMode ? '#fff7ed' : '#faf5ff' }]}>
                <Ionicons
                  name={isChurchMode ? 'business' : isHQ ? 'shield-checkmark' : 'globe'}
                  size={20}
                  color={isChurchMode ? '#ea580c' : '#7c3aed'}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.currentTitle} numberOfLines={1}>{activeLabel}</Text>
                <Text style={styles.currentSub}>
                  {isChurchMode ? 'Church Choir Admin' : isHQ ? 'HQ Super Admin' : 'Zonal Choir Admin'}
                </Text>
              </View>
              <View style={styles.livePill}>
                <Text style={styles.livePillText}>Active</Text>
              </View>
            </View>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Zone Workspace Option */}
            {hasZoneAccess && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>ZONE WORKSPACE</Text>
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    !isChurchMode && styles.optionCardActive,
                  ]}
                  onPress={handleSelectZone}
                  disabled={loadingAction !== null}
                  activeOpacity={0.8}
                >
                  <View style={[styles.optionIconWrap, { backgroundColor: '#faf5ff' }]}>
                    <Ionicons name="globe-outline" size={22} color="#7c3aed" />
                  </View>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>{session.zoneName || 'Zonal Workspace'}</Text>
                    <Text style={styles.optionSub}>Manage zone programs, members, and songs</Text>
                  </View>
                  {loadingAction === 'zone' ? (
                    <ActivityIndicator size="small" color="#7c3aed" />
                  ) : !isChurchMode ? (
                    <View style={styles.activeCheck}>
                      <Ionicons name="checkmark" size={16} color="#ffffff" />
                    </View>
                  ) : (
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Church Workspaces Option */}
            {churches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionHeader}>
                  CHURCH CHOIR WORKSPACES ({churches.length})
                </Text>
                {churches.map(church => {
                  const isSelected = isChurchMode && currentChurchId === church.id;
                  const isLoadingThis = loadingAction === `church-${church.id}`;

                  return (
                    <TouchableOpacity
                      key={church.id}
                      style={[
                        styles.optionCard,
                        isSelected && styles.optionCardActiveChurch,
                      ]}
                      onPress={() => handleSelectChurch(church.id)}
                      disabled={loadingAction !== null}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.optionIconWrap, { backgroundColor: '#fff7ed' }]}>
                        <Ionicons name="business-outline" size={22} color="#ea580c" />
                      </View>
                      <View style={styles.optionContent}>
                        <Text style={styles.optionTitle}>{church.name}</Text>
                        <Text style={styles.optionSub}>Manage church choir sets and rehearsals</Text>
                      </View>
                      {isLoadingThis ? (
                        <ActivityIndicator size="small" color="#ea580c" />
                      ) : isSelected ? (
                        <View style={[styles.activeCheck, { backgroundColor: '#ea580c' }]}>
                          <Ionicons name="checkmark" size={16} color="#ffffff" />
                        </View>
                      ) : (
                        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Linked Accounts Section (Multi-Account Switching) */}
            {linkedAccounts.length > 1 && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeader}>LINKED ADMIN ACCOUNTS</Text>
                  {fetchingAccounts && <ActivityIndicator size="small" color={Colors.accent} />}
                </View>
                <Text style={styles.sectionHelp}>
                  Switch to your other registered role without signing out
                </Text>

                {linkedAccounts.map(acc => {
                  const isCurrent = acc.isCurrent;
                  const isLoadingThis = loadingAction === `account-${acc.id}`;
                  const isChurchRole = acc.role.toLowerCase().includes('church') || Boolean(acc.churchId);

                  return (
                    <TouchableOpacity
                      key={acc.id}
                      style={[
                        styles.optionCard,
                        isCurrent && styles.optionCardCurrentAccount,
                      ]}
                      onPress={() => handleSwitchAccount(acc)}
                      disabled={loadingAction !== null || isCurrent}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.optionIconWrap, { backgroundColor: isChurchRole ? '#fff7ed' : '#eef2ff' }]}>
                        <Ionicons
                          name={isChurchRole ? 'business-outline' : 'shield-checkmark-outline'}
                          size={22}
                          color={isChurchRole ? '#ea580c' : '#4f46e5'}
                        />
                      </View>
                      <View style={styles.optionContent}>
                        <View style={styles.accountHeaderRow}>
                          <Text style={styles.optionTitle}>{acc.name || acc.email}</Text>
                          {isCurrent && (
                            <View style={styles.currentBadge}>
                              <Text style={styles.currentBadgeText}>Current</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.optionSub}>
                          {acc.churchName || acc.zoneName || acc.email} · {acc.role.replace(/_/g, ' ')}
                        </Text>
                      </View>
                      {isLoadingThis ? (
                        <ActivityIndicator size="small" color={Colors.accent} />
                      ) : !isCurrent ? (
                        <View style={styles.switchPill}>
                          <Text style={styles.switchPillText}>Switch</Text>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  currentCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 16,
  },
  currentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
    marginRight: 6,
  },
  currentLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
    letterSpacing: 0.8,
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  currentTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  currentSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  livePill: {
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  livePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  scroll: {
    maxHeight: 400,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionHelp: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
    marginTop: -4,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  optionCardActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },
  optionCardActiveChurch: {
    borderColor: '#ea580c',
    backgroundColor: '#fff7ed',
  },
  optionCardCurrentAccount: {
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    opacity: 0.8,
  },
  optionIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  optionSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  activeCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#7c3aed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  currentBadge: {
    backgroundColor: '#e2e8f0',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
  switchPill: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  switchPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7c3aed',
  },
});
