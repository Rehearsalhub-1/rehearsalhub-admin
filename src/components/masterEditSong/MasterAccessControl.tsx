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
        <View style={styles.accessToggleRow}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text style={styles.accessTitle}>Headquarters Only (HQ Only)</Text>
            <Text style={styles.accessSubtitle}>
              When enabled, this song will only be visible to Headquarter administrators and singers, hiding it from zonal rehearsal portals.
            </Text>
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
            <Text style={styles.hqInfoBoxTitle}>Scope Protection</Text>
            <Text style={styles.hqInfoBoxText}>
              Zonal admins will not be able to clone or view this master repertoire track while HQ Only is activated.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
