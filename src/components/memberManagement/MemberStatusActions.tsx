import React from 'react';
import { View, Text, Switch, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './memberManagementStyles';

interface MemberAccountStatusProps {
  isActive: boolean;
  setIsActive: (val: boolean) => void;
}

export function MemberAccountStatus({ isActive, setIsActive }: MemberAccountStatusProps) {
  return (
    <View style={styles.card}>
      <View style={styles.switchRow}>
        <View>
          <Text style={styles.cardHeading}>Account Status</Text>
          <Text style={[styles.statusSubText, isActive ? styles.textActive : styles.textInactive]}>
            {isActive ? '● Active — Authorized access' : '○ Suspended / Inactive'}
          </Text>
        </View>
        <Switch
          value={isActive}
          onValueChange={setIsActive}
          trackColor={{ false: '#e2e8f0', true: '#a7f3d0' }}
          thumbColor={isActive ? '#10b981' : '#94a3b8'}
        />
      </View>
    </View>
  );
}

interface MemberBottomBarProps {
  saving: boolean;
  onRemove: () => void;
  onClose: () => void;
  onSave: () => void;
}

export function MemberBottomBar({ saving, onRemove, onClose, onSave }: MemberBottomBarProps) {
  return (
    <View style={styles.bottomBar}>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={onRemove}
        activeOpacity={0.7}
        disabled={saving}
      >
        <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 4 }} />
        <Text style={styles.removeBtnText}>Remove</Text>
      </TouchableOpacity>

      <View style={styles.bottomRightGroup}>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={onClose}
          activeOpacity={0.7}
          disabled={saving}
        >
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={onSave}
          activeOpacity={0.85}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default MemberAccountStatus;
