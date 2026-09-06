import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface StatTileProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  badgeLabel?: string;
  subtitle?: string;
  loading?: boolean;
  onPress?: () => void;
}

export function StatTile({
  label,
  value,
  icon,
  color = Colors.accent,
  badgeLabel,
  subtitle,
  loading = false,
  onPress,
}: StatTileProps) {
  const Component = onPress ? TouchableOpacity : View;
  const touchProps = onPress ? { onPress, activeOpacity: 0.75 } : {};

  return (
    <Component
      {...touchProps}
      style={styles.card}
    >
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {badgeLabel ? (
          <View style={[styles.badge, { backgroundColor: `${color}12` }]}>
            <Text style={[styles.badgeText, { color }]}>{badgeLabel}</Text>
          </View>
        ) : onPress ? (
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        ) : null}
      </View>

      <View style={styles.body}>
        {loading ? (
          <ActivityIndicator size="small" color={color} style={{ marginVertical: 6, alignSelf: 'flex-start' }} />
        ) : (
          <Text style={styles.valueText}>{value}</Text>
        )}
        <Text style={styles.labelText} numberOfLines={1}>{label}</Text>
        {subtitle ? (
          <Text style={styles.subtitleText} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '46%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    justifyContent: 'space-between',
    shadowColor: '#64748b',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  body: {
    marginTop: 4,
  },
  valueText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#0f172a', // slate-900
    letterSpacing: -0.5,
  },
  labelText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155', // slate-700
    marginTop: 2,
  },
  subtitleText: {
    fontSize: 11,
    color: '#94a3b8', // slate-400
    marginTop: 2,
    fontWeight: '500',
  },
});

