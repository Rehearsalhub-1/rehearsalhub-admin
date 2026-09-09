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

  const [zoneModalVisible, setZoneModalVisible] = useState(false);
  const [churchModalVisible, setChurchModalVisible] = useState(false);

  const isHQ = adminUser?.isHQAdmin === true;
  const hasDualRole = Boolean(adminUser?.hasDualRole);
  const hasMultipleChurches = userChurches.length > 1;

  const scopeTitle = isChurchMode
    ? 'Church Admin'
    : isHQ
    ? 'HQ Admin'
    : 'Zonal Admin';

  const rawZoneName = activeZone?.name;
  const cleanZoneName = (rawZoneName && rawZoneName.toLowerCase() !== 'central admin')
    ? rawZoneName
    : 'Your Zone';

  const badgeLabel = isChurchMode
    ? (activeChurch?.name || 'Church Choir')
    : isHQ && (isAllZones || !activeZone)
    ? 'All Ministry Zones'
    : cleanZoneName;

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
    if (isChurchMode && hasMultipleChurches) {
      // In church mode with multiple churches: allow picking which church to administer
      setChurchModalVisible(true);
    } else if (isHQ && availableZones.length > 1) {
      // HQ Admin can select between All Ministry Zones or any specific zone
      setZoneModalVisible(true);
    } else if (hasDualRole) {
      // Direct 1-tap toggle between Hub Mode and Church Mode (zero confusion)
      toggleRoleMode();
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
              activeOpacity={(hasDualRole || (isChurchMode && hasMultipleChurches)) ? 0.75 : 1}
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
              {isChurchMode && hasMultipleChurches ? (
                <View style={[styles.modeToggleChip, { backgroundColor: '#fef3c7' }]}>
                  <Ionicons name="chevron-down" size={11} color="#b45309" />
                </View>
              ) : hasDualRole ? (
                <View
                  style={[
                    styles.modeToggleChip,
                    isChurchMode ? { backgroundColor: '#fef3c7' } : { backgroundColor: '#ede9fe' },
                  ]}
                >
                  <Ionicons
                    name="swap-horizontal"
                    size={11}
                    color={isChurchMode ? '#b45309' : '#6d28d9'}
                  />
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ── Multi-Church Switcher Modal (Only shown when admin coordinates > 1 church) ── */}
      {hasMultipleChurches && (
        <Modal
          visible={churchModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setChurchModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setChurchModalVisible(false)}>
            <Pressable style={styles.modalContainer} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Select Church Choir</Text>
                  <Text style={styles.modalSubtitle}>You coordinate multiple church assemblies</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setChurchModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                {userChurches.map((c: ChurchOption) => {
                  const isSelected = activeChurch?.id === c.id;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.scopeItem, isSelected && styles.scopeItemActiveChurch]}
                      onPress={() => {
                        switchChurch(c);
                        setChurchModalVisible(false);
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
                          {c.role ? `Role: ${c.role}` : 'Church Choir Assembly'}
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

                {/* Direct option to switch back to Zone mode */}
                {hasDualRole && (
                  <TouchableOpacity
                    style={styles.zoneSwitchItem}
                    onPress={() => {
                      setRoleMode('org');
                      setChurchModalVisible(false);
                    }}
                    activeOpacity={0.75}
                  >
                    <Ionicons name="globe-outline" size={18} color="#4f46e5" style={{ marginRight: 10 }} />
                    <Text style={styles.zoneSwitchText}>
                      Switch to {activeZone?.name || 'Zone Mode'}
                    </Text>
                  </TouchableOpacity>
                )}

                <View style={{ height: 16 }} />
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* ── HQ Zone Picker Modal (Allows HQ Admin to view All Zones or select any zone) ── */}
      {isHQ && (
        <Modal
          visible={zoneModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setZoneModalVisible(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setZoneModalVisible(false)}>
            <Pressable style={styles.modalContainer} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>Ministry Zone Scope</Text>
                  <Text style={styles.modalSubtitle}>Select a zone to oversee or view all zones</Text>
                </View>
                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setZoneModalVisible(false)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={styles.modalScroll}>
                {/* Option 1: All Zones (Global Overview) */}
                <TouchableOpacity
                  style={[styles.scopeItem, isAllZones && styles.scopeItemActiveZone]}
                  onPress={() => {
                    switchZone(null);
                    setZoneModalVisible(false);
                  }}
                  activeOpacity={0.75}
                >
                  <View style={[styles.scopeItemIcon, { backgroundColor: '#eef2ff' }]}>
                    <Ionicons name="globe" size={18} color="#4f46e5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.scopeItemName, isAllZones && styles.scopeItemNameActiveZone]}>
                      All Ministry Zones
                    </Text>
                    <Text style={styles.scopeItemMeta}>
                      Global Ministry Overview • All Rehearsals
                    </Text>
                  </View>
                  {isAllZones && (
                    <View style={styles.activeCheckBadge}>
                      <Ionicons name="checkmark-circle" size={18} color="#4f46e5" />
                    </View>
                  )}
                </TouchableOpacity>

                {/* Option 2..N: Individual Zones */}
                {availableZones.map((z: ZoneOption) => {
                  const isSelected = !isAllZones && activeZone?.id === z.id;
                  return (
                    <TouchableOpacity
                      key={z.id}
                      style={[styles.scopeItem, isSelected && styles.scopeItemActiveZone]}
                      onPress={() => {
                        switchZone(z);
                        setZoneModalVisible(false);
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.scopeItemIcon, { backgroundColor: '#faf5ff' }]}>
                        <Ionicons name="location" size={18} color="#7c3aed" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.scopeItemName, isSelected && styles.scopeItemNameActiveZone]}>
                          {z.name}
                        </Text>
                        <Text style={styles.scopeItemMeta}>
                          Code: {z.invitationCode || z.id}
                        </Text>
                      </View>
                      {isSelected && (
                        <View style={styles.activeCheckBadge}>
                          <Ionicons name="checkmark-circle" size={18} color="#7c3aed" />
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
