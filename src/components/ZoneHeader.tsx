import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useZoneContext, ChurchOption, ZoneOption } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  /** Screen title shown in the header */
  title?: string;
  /** Optional subtitle or metadata below title */
  subtitle?: string;
  /** Explicitly show/hide the back button (auto-detected if omitted) */
  showBack?: boolean;
  /** Custom back button press handler */
  onBack?: () => void;
  /** Optional custom right-hand action component */
  rightElement?: React.ReactNode;
  /** Whether to show the mode pill (defaults to true) */
  showZonePicker?: boolean;
}

export default function ZoneHeader({
  title,
  subtitle,
  showBack,
  onBack,
  rightElement,
  showZonePicker = true,
}: Props) {
  const navigation = useNavigation<any>();
  const {
    activeZone,
    isAllZones,
    isChurchMode,
    activeChurch,
    userChurches,
    availableZones,
    switchZone,
    switchChurch,
    toggleRoleMode,
    setRoleMode,
  } = useZoneContext();
  const { adminUser } = useAuth();

  const [switcherModalVisible, setSwitcherModalVisible] = useState(false);

  const isHQ = adminUser?.isHQAdmin === true;
  // Standard app rule: HQ never does church
  const effectiveChurches = isHQ ? [] : userChurches;
  const hasMultipleWorkspaces = (availableZones.length + effectiveChurches.length) > 1;

  const scopeTitle = isHQ
    ? 'HQ Admin'
    : isChurchMode
    ? 'Church Coord'
    : 'Zonal Admin';

  const badgeLabel = isChurchMode
    ? (activeChurch?.name || 'Church Choir')
    : (activeZone?.name || (isHQ ? 'Loveworld Singers HQ' : 'Your Zone'));

  const scopeBadgeColor = isChurchMode ? '#d97706' : isHQ ? '#4f46e5' : '#7c3aed';
  const scopeBadgeBg = isChurchMode ? '#fffbeb' : isHQ ? '#eef2ff' : '#faf5ff';
  const scopeBadgeBorder = isChurchMode ? '#fde68a' : isHQ ? '#c7d2fe' : '#e9d5ff';

  const shouldShowBack = showBack !== undefined ? showBack : (navigation?.canGoBack ? navigation.canGoBack() : false);

  function handleBack() {
    if (onBack) {
      onBack();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    }
  }

  function handlePillPress() {
    if (hasMultipleWorkspaces) {
      setSwitcherModalVisible(true);
    }
  }

  const isMainAdminTitle = !title || title === 'Admin Console' || title === 'Admin Hub';

  return (
    <>
      <View style={styles.bar}>
        <View style={styles.leftArea}>
          {shouldShowBack && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color="#0f172a" />
            </TouchableOpacity>
          )}

          <View style={styles.titleArea}>
            <View style={styles.titleRow}>
              {title ? (
                <Text style={styles.title} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}

              {isMainAdminTitle && (
                <View style={[styles.scopeBadge, { backgroundColor: scopeBadgeBg, borderColor: scopeBadgeBorder }]}>
                  <Ionicons
                    name={isChurchMode ? 'business' : isHQ ? 'shield-checkmark' : 'location'}
                    size={11}
                    color={scopeBadgeColor}
                    style={{ marginRight: 3 }}
                  />
                  <Text style={[styles.scopeBadgeText, { color: scopeBadgeColor }]}>{scopeTitle}</Text>
                </View>
              )}
            </View>

            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.rightArea}>
          {rightElement ? (
            rightElement
          ) : showZonePicker ? (
            <TouchableOpacity
              style={[
                styles.zonePill,
                isChurchMode ? styles.churchPillActive : styles.zonePillActive,
              ]}
              onPress={handlePillPress}
              activeOpacity={hasMultipleWorkspaces ? 0.75 : 1}
            >
              <Ionicons
                name={isChurchMode ? 'business-outline' : 'globe-outline'}
                size={13}
                color={isChurchMode ? '#d97706' : '#7c3aed'}
                style={{ marginRight: 4 }}
              />
              <Text
                style={[styles.zonePillText, isChurchMode && { color: '#92400e' }]}
                numberOfLines={1}
              >
                {badgeLabel}
              </Text>
              {hasMultipleWorkspaces && (
                <View style={[styles.modeToggleChip, isChurchMode ? { backgroundColor: '#fef3c7' } : { backgroundColor: '#ede9fe' }]}>
                  <Ionicons name="chevron-down" size={11} color={isChurchMode ? '#b45309' : '#6d28d9'} />
                </View>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Single Workspace Switcher Modal (Standard Multi-Tenant Switcher) ── */}
      {hasMultipleWorkspaces && (
        <Modal
          visible={switcherModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSwitcherModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setSwitcherModalVisible(false)}>
            <Pressable style={styles.modalContainer} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Switch Workspace</Text>
                  <Text style={styles.modalSubtitle}>Select which choir you want to manage</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setSwitcherModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                {/* 1. Zones Section */}
                {availableZones.map((z: ZoneOption) => {
                  const isSelected = !isChurchMode && activeZone?.id === z.id;
                  return (
                    <TouchableOpacity
                      key={z.id}
                      style={[styles.scopeItem, isSelected && styles.scopeItemActiveZone]}
                      onPress={() => {
                        switchZone(z);
                        setSwitcherModalVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.scopeItemIcon, { backgroundColor: '#eef2ff' }]}>
                        <Ionicons name="globe" size={18} color="#4f46e5" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.scopeItemName, isSelected && styles.scopeItemNameActiveZone]}>
                          {z.name}
                        </Text>
                        <Text style={styles.scopeItemMeta}>
                          {isHQ ? 'Loveworld Singers HQ' : `Zone Code: ${z.invitationCode || z.id}`}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.activeCheckBadge}>
                          <Ionicons name="checkmark-circle" size={18} color="#4f46e5" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {/* 2. Churches Section (Only for Zone Admins / Church Coordinators, NOT HQ) */}
                {effectiveChurches.map((c: ChurchOption) => {
                  const isSelected = isChurchMode && activeChurch?.id === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.scopeItem, isSelected && styles.scopeItemActiveChurch]}
                      onPress={() => {
                        switchChurch(c);
                        setSwitcherModalVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.scopeItemIcon, { backgroundColor: '#fffbeb' }]}>
                        <Ionicons name="business" size={18} color="#d97706" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.scopeItemName, isSelected && styles.scopeItemNameActiveChurch]}>
                          {c.name}
                        </Text>
                        <Text style={styles.scopeItemMeta}>
                          Local Church Choir
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.activeCheckBadge}>
                          <Ionicons name="checkmark-circle" size={18} color="#d97706" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                <View style={{ height: 16 }} />
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

    </>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    minHeight: 56,
  },
  leftArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  titleArea: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 1,
  },
  scopeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  scopeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  rightArea: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    maxWidth: 170,
  },
  zonePillActive: {
    borderColor: '#ddd6fe',
    backgroundColor: '#faf5ff',
  },
  churchPillActive: {
    borderColor: '#fde68a',
    backgroundColor: '#fffbeb',
  },
  modeToggleChip: {
    marginLeft: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zonePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    maxWidth: 110,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  scopeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  scopeItemActiveChurch: {
    borderColor: '#fcd34d',
    backgroundColor: '#fffbeb',
  },
  scopeItemActiveZone: {
    borderColor: '#c7d2fe',
    backgroundColor: '#eef2ff',
  },
  scopeItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  scopeItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  scopeItemNameActiveChurch: {
    color: '#b45309',
  },
  scopeItemNameActiveZone: {
    color: '#4338ca',
  },
  scopeItemMeta: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  activeCheckBadge: {
    marginLeft: 8,
  },
  zoneSwitchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#c7d2fe',
    marginTop: 8,
  },
  zoneSwitchText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4338ca',
  },
});
