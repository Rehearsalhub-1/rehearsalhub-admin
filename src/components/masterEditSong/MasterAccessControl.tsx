import React from 'react';
import { View, Text, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './masterEditSongStyles';

interface MasterAccessControlProps {
  isHQOnly: boolean;
  setIsHQOnly: (val: boolean) => void;
  isHidden?: boolean;
  setIsHidden?: (val: boolean) => void;
}

export default function MasterAccessControl({
  isHQOnly,
  setIsHQOnly,
  isHidden = false,
  setIsHidden,
}: MasterAccessControlProps) {
  const isHQRestricted = Boolean(isHQOnly || isHidden);

  const handleToggle = (val: boolean) => {
    setIsHQOnly(val);
    if (setIsHidden) setIsHidden(val);
  };

  return (
    <View style={styles.tabSection}>
      <View style={styles.card}>
        <View style={styles.cardHeaderWithIcon}>
          <View
            style={[
              styles.cardIconBadge,
              {
                backgroundColor: isHQRestricted ? '#eef2ff' : '#f0fdf4',
                borderColor: isHQRestricted ? '#c7d2fe' : '#bbf7d0',
              },
            ]}
          >
            <Ionicons
              name={isHQRestricted ? 'lock-closed' : 'globe-outline'}
              size={17}
              color={isHQRestricted ? '#4338ca' : '#16a34a'}
            />
          </View>
          <View style={styles.cardHeaderTitles}>
            <Text style={styles.cardSectionTitle}>Zonal Access & Visibility</Text>
            <Text style={styles.cardHeaderSubtitle}>
              {isHQRestricted
                ? 'HQ Only • Hidden from regional & zonal church portals'
                : 'Global Catalog • Available across all zones'}
            </Text>
          </View>
        </View>

        <View style={styles.accessToggleRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.accessTitle}>
              {isHQRestricted ? 'Loveworld Singers HQ Only' : 'Global (All Zones)'}
            </Text>
            <Text style={styles.accessSubtitle}>
              {isHQRestricted
                ? 'Visible strictly to Loveworld Singers HQ admins. Hidden from all other regional & zonal choir portals.'
                : 'Shared globally across all regional and zonal church rehearsal hubs.'}
            </Text>

            <View
              style={[
                styles.accessStatusPill,
                isHQRestricted
                  ? styles.accessStatusPillRestricted
                  : styles.accessStatusPillGlobal,
              ]}
            >
              <Ionicons
                name={isHQRestricted ? 'lock-closed' : 'earth'}
                size={12}
                color={isHQRestricted ? '#4338ca' : '#15803d'}
              />
              <Text
                style={[
                  styles.accessStatusText,
                  { color: isHQRestricted ? '#4338ca' : '#15803d' },
                ]}
              >
                {isHQRestricted ? 'HQ Only • Hidden from Zones' : 'Global • All Zones'}
              </Text>
            </View>
          </View>

          <Switch
            value={isHQRestricted}
            onValueChange={handleToggle}
            trackColor={{ false: '#cbd5e1', true: '#6366f1' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>
    </View>
  );
}

