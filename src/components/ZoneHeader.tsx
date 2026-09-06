import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  FlatList, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useZoneContext, ZoneOption } from '../context/ZoneContext';
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
  /** Whether to show the zone switcher pill (defaults to true) */
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
  const { activeZone, availableZones, isAllZones, setActiveZone } = useZoneContext();
  const { adminUser } = useAuth();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');

  const isHQ = adminUser?.isHQAdmin === true;
  const isChurch = (adminUser?.role || '').toLowerCase().includes('church') || (adminUser?.role || '').toLowerCase().includes('subgroup');
  const badgeLabel = isAllZones ? 'All Zones' : (activeZone?.name ?? 'HQ');

  const scopeTitle = isChurch ? 'Church Scope' : isHQ ? 'HQ Admin' : 'Zonal Portal';
  const scopeBadgeColor = isChurch ? '#d97706' : isHQ ? '#4f46e5' : '#7c3aed';
  const scopeBadgeBg = isChurch ? '#fffbeb' : isHQ ? '#eef2ff' : '#faf5ff';
  const scopeBadgeBorder = isChurch ? '#fde68a' : isHQ ? '#c7d2fe' : '#e9d5ff';

  const shouldShowBack = showBack !== undefined ? showBack : (navigation?.canGoBack ? navigation.canGoBack() : false);

  const filteredZones = availableZones.filter((z) =>
    z.name.toLowerCase().includes(search.toLowerCase()),
  );

  function selectZone(zone: ZoneOption | null) {
    setActiveZone(zone);
    setPickerVisible(false);
    setSearch('');
  }

  function handleBack() {
    if (onBack) {
      onBack();
    } else if (navigation?.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
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
              style={styles.zonePill}
              onPress={() => isHQ && setPickerVisible(true)}
              activeOpacity={isHQ ? 0.75 : 1}
            >
              <Ionicons name="globe-outline" size={13} color="#7c3aed" style={{ marginRight: 5 }} />
              <Text style={styles.zonePillText} numberOfLines={1}>
                {badgeLabel}
              </Text>
              {isHQ && <Ionicons name="chevron-down" size={11} color="#64748b" style={{ marginLeft: 3 }} />}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Zone Picker Modal — HQ admin only */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerVisible(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Select Zone View</Text>
              <Text style={styles.modalSubtitle}>Filter catalog and metrics by zone</Text>
            </View>
            <TouchableOpacity onPress={() => { setPickerVisible(false); setSearch(''); }} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrapper}>
            <Ionicons name="search" size={16} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search zones..."
              placeholderTextColor="#94a3b8"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
          </View>

          <FlatList
            data={filteredZones}
            keyExtractor={(z) => z.id}
            ListHeaderComponent={
              <TouchableOpacity
                style={[styles.zoneRow, isAllZones && styles.zoneRowActive]}
                onPress={() => selectZone(null)}
                activeOpacity={0.75}
              >
                <View style={[styles.zoneIconWrap, { backgroundColor: '#f3e8ff' }]}>
                  <Ionicons name="globe-outline" size={18} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.zoneName, isAllZones && { color: '#7c3aed', fontWeight: '800' }]}>All Zones</Text>
                  <Text style={styles.zoneSub}>Cross-zone global aggregated view</Text>
                </View>
                {isAllZones && <Ionicons name="checkmark-circle" size={20} color="#7c3aed" />}
              </TouchableOpacity>
            }
            renderItem={({ item }) => {
              const isSelected = activeZone?.id === item.id;
              return (
                <TouchableOpacity
                  style={[styles.zoneRow, isSelected && styles.zoneRowActive]}
                  onPress={() => selectZone(item)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.zoneIconWrap, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="location-outline" size={18} color="#2563eb" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.zoneName, isSelected && { color: '#2563eb', fontWeight: '800' }]}>{item.name}</Text>
                    <Text style={styles.zoneSub}>{item.invitationCode ? `Code: ${item.invitationCode}` : 'Zone Hub'}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color="#2563eb" />}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          />
        </SafeAreaView>
      </Modal>
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
    maxWidth: 140,
  },
  zonePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  modal: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  modalSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8,
  },
  zoneRowActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#faf5ff',
  },
  zoneIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneName: {
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  zoneSub: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
});
