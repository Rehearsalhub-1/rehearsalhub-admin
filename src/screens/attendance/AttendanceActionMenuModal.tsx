import React from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './attendanceStyles';

interface AttendanceActionMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateGeofence: () => void;
  onOpenManual: () => void;
  onExportCSV: () => void;
  onRefresh: () => void;
}

export default function AttendanceActionMenuModal({
  visible,
  onClose,
  onNavigateGeofence,
  onOpenManual,
  onExportCSV,
  onRefresh,
}: AttendanceActionMenuModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.actionSheetOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.actionSheetContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View style={styles.grabBar} />

          <View style={styles.actionSheetHeader}>
            <Text style={styles.actionSheetTitle}>Attendance Options</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Option 1: Geofence Settings */}
          <TouchableOpacity
            style={styles.sheetItem}
            onPress={onNavigateGeofence}
            activeOpacity={0.7}
          >
            <View style={[styles.sheetItemIconWrap, { backgroundColor: '#f5f3ff' }]}>
              <Ionicons name="navigate-outline" size={18} color="#7c3aed" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetItemTitle}>Venue Geofence & GPS</Text>
              <Text style={styles.sheetItemSub}>Configure rehearsal perimeter & GPS boundary</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Option 2: Manual Clock-In */}
          <TouchableOpacity
            style={styles.sheetItem}
            onPress={onOpenManual}
            activeOpacity={0.7}
          >
            <View style={[styles.sheetItemIconWrap, { backgroundColor: '#eff6ff' }]}>
              <Ionicons name="person-add-outline" size={18} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetItemTitle}>Manual Clock-In</Text>
              <Text style={styles.sheetItemSub}>Record singer without personal device</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Option 3: Export CSV */}
          <TouchableOpacity
            style={styles.sheetItem}
            onPress={onExportCSV}
            activeOpacity={0.7}
          >
            <View style={[styles.sheetItemIconWrap, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="download-outline" size={18} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetItemTitle}>Export Attendance CSV</Text>
              <Text style={styles.sheetItemSub}>Download roster for rehearsal session</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>

          {/* Option 4: Refresh */}
          <TouchableOpacity
            style={styles.sheetItem}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <View style={[styles.sheetItemIconWrap, { backgroundColor: '#f8fafc' }]}>
              <Ionicons name="refresh" size={18} color="#64748b" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetItemTitle}>Sync & Refresh</Text>
              <Text style={styles.sheetItemSub}>Reload latest logs from server</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
