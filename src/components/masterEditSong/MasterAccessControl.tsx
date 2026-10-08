import React from 'react';
import { View, Text, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './masterEditSongStyles';

interface MasterAccessControlProps {
  isHQOnly: boolean;
  setIsHQOnly: (val: boolean) => void;
}

export default function MasterAccessControl({
  isHQOnly,
  setIsHQOnly,
}: MasterAccessControlProps) {
  return (
    <View style={styles.tabSection}>
      <View style={styles.card}>
        <View style={styles.cardHeaderWithIcon}>
          <View style={[styles.cardIconBadge, { backgroundColor: isHQOnly ? '#eef2ff' : '#f0fdf4', borderColor: isHQOnly ? '#c7d2fe' : '#bbf7d0' }]}>
            <Ionicons
              name={isHQOnly ? 'lock-closed' : 'globe-outline'}
              size={17}
              color={isHQOnly ? '#4338ca' : '#16a34a'}
            />
          </View>
          <View style={styles.cardHeaderTitles}>
            <Text style={styles.cardSectionTitle}>Catalog Scope & Visibility</Text>
            <Text style={styles.cardHeaderSubtitle}>
              Control zonal access and replication permissions
            </Text>
          </View>
        </View>

        <View style={styles.accessToggleRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.accessTitle}>Headquarters Only (HQ Only)</Text>
            <Text style={styles.accessSubtitle}>
              Restricts this song strictly to Headquarters. Hides it from all regional and zonal church portals.
            </Text>

            <View style={[
              styles.accessStatusPill,
              isHQOnly ? styles.accessStatusPillRestricted : styles.accessStatusPillGlobal,
            ]}>
              <Ionicons
                name={isHQOnly ? 'lock-closed' : 'earth'}
                size={12}
                color={isHQOnly ? '#1e40af' : '#15803d'}
              />
              <Text style={[
                styles.accessStatusText,
                { color: isHQOnly ? '#1e40af' : '#15803d' },
              ]}>
                {isHQOnly ? 'Restricted to Headquarters' : 'Global Master Catalog (Visible to All Zones)'}
              </Text>
            </View>
          </View>

          <Switch
            value={isHQOnly}
            onValueChange={setIsHQOnly}
            trackColor={{ false: '#cbd5e1', true: '#7c3aed' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.hqInfoBox}>
          <Ionicons name="shield-checkmark" size={18} color="#7c3aed" style={{ marginTop: 1 }} />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text style={styles.hqInfoBoxTitle}>Scope Protection Active</Text>
            <Text style={styles.hqInfoBoxText}>
              {isHQOnly
                ? 'Zonal directors and rehearsal portals will not be able to view, rehearse, or clone this song.'
                : 'Zonal directors can view this song in the master library and clone it into their local rehearsal programs.'}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
