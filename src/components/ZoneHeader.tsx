import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  FlatList, SafeAreaView, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import { useZoneContext, ZoneOption } from '../context/ZoneContext';
import { useAuth } from '../context/AuthContext';

interface Props {
  /** Optional screen title shown left of the zone badge */
  title?: string;
}

export default function ZoneHeader({ title }: Props) {
  const { activeZone, availableZones, isAllZones, setActiveZone } = useZoneContext();
  const { adminUser } = useAuth();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');

  const isHQ = adminUser?.isHQAdmin === true;
  const badgeLabel = isAllZones ? 'All Zones' : (activeZone?.name ?? '—');
  const badgeColor = isAllZones ? Colors.accent : Colors.info;

  const filteredZones = availableZones.filter((z) =>
    z.name.toLowerCase().includes(search.toLowerCase()),
  );

  function selectZone(zone: ZoneOption | null) {
    setActiveZone(zone);
    setPickerVisible(false);
    setSearch('');
  }

  return (
    <>
      <View style={styles.bar}>
        {title ? <Text style={styles.title}>{title}</Text> : <View style={{ flex: 1 }} />}

        <TouchableOpacity
          style={[styles.badge, { borderColor: badgeColor }]}
          onPress={() => isHQ && setPickerVisible(true)}
          activeOpacity={isHQ ? 0.7 : 1}
        >
          <View style={[styles.dot, { backgroundColor: badgeColor }]} />
          <Text style={[styles.badgeText, { color: badgeColor }]}>{badgeLabel}</Text>
          {isHQ && <Ionicons name="chevron-down" size={12} color={badgeColor} style={{ marginLeft: 2 }} />}
        </TouchableOpacity>
      </View>

      {/* Zone Picker Modal — HQ admin only */}
      <Modal visible={pickerVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickerVisible(false)}>
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Zone View</Text>
            <TouchableOpacity onPress={() => { setPickerVisible(false); setSearch(''); }}>
              <Ionicons name="close" size={22} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrapper}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search zones..."
              placeholderTextColor={Colors.textMuted}
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
                <View style={[styles.zoneIconWrap, { backgroundColor: Colors.accent + '22' }]}>
                  <Ionicons name="globe-outline" size={18} color={Colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.zoneName, isAllZones && { color: Colors.accent }]}>All Zones</Text>
                  <Text style={styles.zoneSub}>Cross-zone view (HQ Admin)</Text>
                </View>
                {isAllZones && <Ionicons name="checkmark" size={18} color={Colors.accent} />}
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
                  <View style={[styles.zoneIconWrap, { backgroundColor: Colors.info + '22' }]}>
                    <Ionicons name="location-outline" size={18} color={Colors.info} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.zoneName, isSelected && { color: Colors.info }]}>{item.name}</Text>
                    <Text style={styles.zoneSub}>{item.invitationCode}</Text>
                  </View>
                  {isSelected && <Ionicons name="checkmark" size={18} color={Colors.info} />}
                </TouchableOpacity>
              );
            }}
            contentContainerStyle={{ paddingBottom: 40 }}
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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modal: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    backgroundColor: Colors.inputBackground,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
  },
  searchInput: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 14,
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  zoneRowActive: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  zoneIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneName: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  zoneSub: {
    color: Colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
});
