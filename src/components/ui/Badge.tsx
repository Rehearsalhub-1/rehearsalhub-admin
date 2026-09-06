import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export type BadgeVariant =
  | 'live'
  | 'ongoing'
  | 'prerehearsal'
  | 'draft'
  | 'archived'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'soprano'
  | 'alto'
  | 'tenor'
  | 'bass'
  | 'lead'
  | 'band'
  | 'key'
  | 'tempo'
  | 'custom';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  textStyle?: TextStyle;
  pulse?: boolean;
}

export function Badge({
  label,
  variant = 'custom',
  color,
  icon,
  size = 'sm',
  style,
  textStyle,
  pulse = false,
}: BadgeProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'live':
        return {
          bg: '#fef2f2', // rose-50
          border: '#fecaca', // rose-200
          text: '#e11d48', // rose-600
          defaultIcon: 'radio' as const,
        };
      case 'ongoing':
      case 'approved':
        return {
          bg: '#ecfdf5', // emerald-50
          border: '#a7f3d0', // emerald-200
          text: '#059669', // emerald-600
          defaultIcon: 'checkmark-circle' as const,
        };
      case 'prerehearsal':
      case 'pending':
        return {
          bg: '#fffbeb', // amber-50
          border: '#fde68a', // amber-200
          text: '#d97706', // amber-600
          defaultIcon: 'time' as const,
        };
      case 'rejected':
        return {
          bg: '#fef2f2', // red-50
          border: '#fecaca', // red-200
          text: '#dc2626', // red-600
          defaultIcon: 'close-circle' as const,
        };
      case 'draft':
      case 'archived':
        return {
          bg: '#f8fafc', // slate-50
          border: '#e2e8f0', // slate-200
          text: '#64748b', // slate-500
          defaultIcon: 'archive-outline' as const,
        };
      case 'soprano':
        return {
          bg: '#fdf2f8', // pink-50
          border: '#fbcfe8', // pink-200
          text: '#db2777', // pink-600
        };
      case 'alto':
        return {
          bg: '#faf5ff', // purple-50
          border: '#e9d5ff', // purple-200
          text: '#7c3aed', // purple-600
        };
      case 'tenor':
        return {
          bg: '#eff6ff', // blue-50
          border: '#bfdbfe', // blue-200
          text: '#2563eb', // blue-600
        };
      case 'bass':
        return {
          bg: '#f0f9ff', // sky-50
          border: '#bae6fd', // sky-200
          text: '#0284c7', // sky-600
        };
      case 'lead':
        return {
          bg: '#fffbeb', // amber-50
          border: '#fde68a', // amber-200
          text: '#d97706', // amber-600
          defaultIcon: 'mic-outline' as const,
        };
      case 'band':
        return {
          bg: '#f5f3ff', // violet-50
          border: '#ddd6fe', // violet-200
          text: '#7c3aed', // violet-600
          defaultIcon: 'musical-notes-outline' as const,
        };
      case 'key':
        return {
          bg: '#faf5ff', // purple-50
          border: '#e9d5ff', // purple-200
          text: '#7c3aed',
          defaultIcon: 'key-outline' as const,
        };
      case 'tempo':
        return {
          bg: '#eff6ff', // blue-50
          border: '#bfdbfe', // blue-200
          text: '#2563eb',
          defaultIcon: 'speedometer-outline' as const,
        };
      case 'custom':
      default:
        const baseColor = color || Colors.accent;
        return {
          bg: `${baseColor}15`,
          border: `${baseColor}30`,
          text: baseColor,
        };
    }
  };

  const vStyles = getVariantStyles();
  const activeIcon = icon || (vStyles as any).defaultIcon;

  const isSmall = size === 'sm';
  const isLarge = size === 'lg';

  const iconSize = isSmall ? 11 : isLarge ? 15 : 13;
  const paddingH = isSmall ? 8 : isLarge ? 14 : 10;
  const paddingV = isSmall ? 3 : isLarge ? 6 : 4;
  const fontSize = isSmall ? 11 : isLarge ? 13 : 12;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: vStyles.bg,
          borderColor: vStyles.border,
          paddingHorizontal: paddingH,
          paddingVertical: paddingV,
        },
        style,
      ]}
    >
      {pulse && <View style={[styles.pulseDot, { backgroundColor: vStyles.text }]} />}
      {activeIcon && (
        <Ionicons
          name={activeIcon}
          size={iconSize}
          color={vStyles.text}
          style={{ marginRight: 4 }}
        />
      )}
      <Text
        style={[
          styles.text,
          {
            color: vStyles.text,
            fontSize,
          },
          textStyle,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
