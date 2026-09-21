import React from 'react';
import { View, Text, TouchableOpacity, TextInput } from 'react-native';
import { styles } from './memberManagementStyles';

interface MemberRoleEditorProps {
  selectedRole: 'singer' | 'zone_admin' | 'church_admin';
  setSelectedRole: (role: 'singer' | 'zone_admin' | 'church_admin') => void;
  church: string;
  setChurch: (val: string) => void;
  zoneName?: string;
}

export default function MemberRoleEditor({
  selectedRole,
  setSelectedRole,
  church,
  setChurch,
  zoneName,
}: MemberRoleEditorProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardHeading}>Member Role</Text>
      <Text style={styles.cardHint}>Assign role status and administrative jurisdiction.</Text>

      <View style={styles.roleOptionsList}>
        {/* 1. Singer */}
        <TouchableOpacity
          style={[styles.roleOptionRow, selectedRole === 'singer' && styles.roleOptionRowActive]}
          onPress={() => setSelectedRole('singer')}
          activeOpacity={0.7}
        >
          <View style={[styles.roleRadioCircle, selectedRole === 'singer' && styles.roleRadioCircleActive]}>
            {selectedRole === 'singer' && <View style={styles.roleRadioDot} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.roleTitleRow}>
              <Text style={[styles.roleTitleText, selectedRole === 'singer' && styles.roleTitleTextActive]}>
                Singer
              </Text>
              <View style={styles.rolePillSlate}>
                <Text style={styles.rolePillSlateText}>Standard</Text>
              </View>
            </View>
            <Text style={styles.roleSubText}>Standard choir singer with repertoire & rehearsal access</Text>
          </View>
        </TouchableOpacity>

        {/* 2. Zone Admin */}
        <TouchableOpacity
          style={[styles.roleOptionRow, selectedRole === 'zone_admin' && styles.roleOptionRowActive]}
          onPress={() => setSelectedRole('zone_admin')}
          activeOpacity={0.7}
        >
          <View style={[styles.roleRadioCircle, selectedRole === 'zone_admin' && styles.roleRadioCircleActive]}>
            {selectedRole === 'zone_admin' && <View style={styles.roleRadioDot} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.roleTitleRow}>
              <Text style={[styles.roleTitleText, selectedRole === 'zone_admin' && styles.roleTitleTextActive]}>
                Zone Admin
              </Text>
              <View style={styles.rolePillPurple}>
                <Text style={styles.rolePillPurpleText}>Zone Lead</Text>
              </View>
            </View>
            <Text style={styles.roleSubText}>
              Admin of {zoneName || 'assigned zone'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* 3. Church Admin */}
        <TouchableOpacity
          style={[
            styles.roleOptionRow,
            selectedRole === 'church_admin' && styles.roleOptionRowActive,
            { borderBottomWidth: 0 },
          ]}
          onPress={() => setSelectedRole('church_admin')}
          activeOpacity={0.7}
        >
          <View style={[styles.roleRadioCircle, selectedRole === 'church_admin' && styles.roleRadioCircleActive]}>
            {selectedRole === 'church_admin' && <View style={styles.roleRadioDot} />}
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.roleTitleRow}>
              <Text style={[styles.roleTitleText, selectedRole === 'church_admin' && styles.roleTitleTextActive]}>
                Church Admin
              </Text>
              <View style={styles.rolePillSky}>
                <Text style={styles.rolePillSkyText}>Assembly</Text>
              </View>
            </View>
            <Text style={styles.roleSubText}>Admin of a particular church assembly</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* If Church Admin: show Church Assembly input */}
      {selectedRole === 'church_admin' && (
        <View style={styles.churchInputContainer}>
          <Text style={styles.inputLabel}>Particular Church Assembly Administered</Text>
          <TextInput
            style={styles.input}
            value={church}
            onChangeText={setChurch}
            placeholder="e.g. Christ Embassy LCA"
            placeholderTextColor="#94a3b8"
          />
          <Text style={styles.churchInputNote}>
            This member will have administrative access for this specific church chapter.
          </Text>
        </View>
      )}
    </View>
  );
}
