import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './attendanceStyles';

export type ExportFormat = 'excel' | 'word' | 'html' | 'csv';

interface AttendanceActionMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateGeofence: () => void;
  onOpenManual: () => void;
  onExport: (format: ExportFormat) => void;
  onRefresh: () => void;
}

export default function AttendanceActionMenuModal({
  visible,
  onClose,
  onNavigateGeofence,
  onOpenManual,
  onExport,
  onRefresh,
}: AttendanceActionMenuModalProps) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<'main' | 'export'>('main');

  useEffect(() => {
    if (!visible) {
      setView('main');
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.actionSheetOverlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.actionSheetContent, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
          <View style={styles.grabBar} />

          {view === 'main' ? (
            <>
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

              {/* Option 3: Export Attendance Report */}
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => setView('export')}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetItemIconWrap, { backgroundColor: '#ecfdf5' }]}>
                  <Ionicons name="download-outline" size={18} color="#10b981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetItemTitle}>Export Attendance Report</Text>
                  <Text style={styles.sheetItemSub}>Share as Excel, Word, PDF or CSV</Text>
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
            </>
          ) : (
            <>
              {/* Sub-view: Select Export Format */}
              <View style={styles.actionSheetHeader}>
                <TouchableOpacity
                  onPress={() => setView('main')}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="chevron-back" size={20} color="#7c3aed" />
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#7c3aed' }}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.actionSheetTitle}>Select Format</Text>

                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Format 1: Excel */}
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  onExport('excel');
                  setView('main');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetItemIconWrap, { backgroundColor: '#ecfdf5' }]}>
                  <Ionicons name="grid-outline" size={18} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetItemTitle}>Excel Spreadsheet (.xls)</Text>
                  <Text style={styles.sheetItemSub}>Formatted table with colors for Microsoft Excel</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </TouchableOpacity>

              {/* Format 2: Word */}
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  onExport('word');
                  setView('main');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetItemIconWrap, { backgroundColor: '#eff6ff' }]}>
                  <Ionicons name="document-text-outline" size={18} color="#2563eb" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetItemTitle}>Word Document (.doc)</Text>
                  <Text style={styles.sheetItemSub}>Printable letterhead document for Microsoft Word</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </TouchableOpacity>

              {/* Format 3: Print / PDF HTML */}
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  onExport('html');
                  setView('main');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetItemIconWrap, { backgroundColor: '#f5f3ff' }]}>
                  <Ionicons name="print-outline" size={18} color="#7c3aed" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetItemTitle}>Print / Save as PDF (.html)</Text>
                  <Text style={styles.sheetItemSub}>Web document ready to Print or Save as PDF</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </TouchableOpacity>

              {/* Format 4: Raw CSV */}
              <TouchableOpacity
                style={styles.sheetItem}
                onPress={() => {
                  onExport('csv');
                  setView('main');
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.sheetItemIconWrap, { backgroundColor: '#f8fafc' }]}>
                  <Ionicons name="download-outline" size={18} color="#64748b" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetItemTitle}>Raw CSV File (.csv)</Text>
                  <Text style={styles.sheetItemSub}>Standard comma-separated spreadsheet data</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

