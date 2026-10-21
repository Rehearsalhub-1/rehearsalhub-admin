import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ExportFormat } from '../../utils/exportUtils';

interface MemberExportModalProps {
  visible: boolean;
  onClose: () => void;
  onExport: (format: ExportFormat) => void;
  memberCount: number;
}

export default function MemberExportModal({
  visible,
  onClose,
  onExport,
  memberCount,
}: MemberExportModalProps) {
  const formats: Array<{
    id: ExportFormat;
    label: string;
    sub: string;
    icon: string;
    color: string;
    badge: string;
  }> = [
    {
      id: 'excel',
      label: 'Excel Spreadsheet',
      sub: 'Multi-column worksheet (.xls) for analysis & rosters',
      icon: 'grid-outline',
      color: '#10b981',
      badge: 'XLS',
    },
    {
      id: 'word',
      label: 'Word Document',
      sub: 'Formal formatted document (.doc) with executive header',
      icon: 'document-text-outline',
      color: '#2563eb',
      badge: 'DOC',
    },
    {
      id: 'html',
      label: 'Printable / PDF View',
      sub: 'Clean web layout (.html) optimized for printing to PDF',
      icon: 'print-outline',
      color: '#f59e0b',
      badge: 'PDF',
    },
    {
      id: 'csv',
      label: 'CSV Data File',
      sub: 'Raw tabular text (.csv) for database or spreadsheets',
      icon: 'code-outline',
      color: '#64748b',
      badge: 'CSV',
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={modalStyles.overlay}>
          <TouchableWithoutFeedback>
            <View style={modalStyles.sheet}>
              <View style={modalStyles.header}>
                <View>
                  <Text style={modalStyles.title}>Export Members Directory</Text>
                  <Text style={modalStyles.subtitle}>
                    Exporting {memberCount} member{memberCount === 1 ? '' : 's'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  style={modalStyles.closeBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View style={modalStyles.list}>
                {formats.map((fmt) => (
                  <TouchableOpacity
                    key={fmt.id}
                    style={modalStyles.optionItem}
                    onPress={() => onExport(fmt.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[modalStyles.iconWrap, { backgroundColor: `${fmt.color}15` }]}>
                      <Ionicons name={fmt.icon as any} size={20} color={fmt.color} />
                    </View>
                    <View style={modalStyles.optionBody}>
                      <View style={modalStyles.optionTitleRow}>
                        <Text style={modalStyles.optionTitle}>{fmt.label}</Text>
                        <View style={[modalStyles.badge, { backgroundColor: `${fmt.color}18` }]}>
                          <Text style={[modalStyles.badgeText, { color: fmt.color }]}>{fmt.badge}</Text>
                        </View>
                      </View>
                      <Text style={modalStyles.optionSub}>{fmt.sub}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  sheet: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    marginTop: 6,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f8fafc',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  optionBody: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  optionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  optionSub: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
  },
});
