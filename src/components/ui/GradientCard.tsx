import React from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle, StyleProp } from 'react-native';
import { Colors } from '../../constants/Colors';

interface GradientCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  variant?: 'surface' | 'glass' | 'accent' | 'glow' | 'danger';
  onPress?: () => void;
  activeOpacity?: number;
}

export function GradientCard({
  children,
  style,
  contentStyle,
  variant = 'surface',
  onPress,
  activeOpacity = 0.85,
}: GradientCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'accent':
        return {
          backgroundColor: '#faf5ff', // purple-50
          borderColor: '#e9d5ff', // purple-200
        };
      case 'glow':
        return {
          backgroundColor: '#ffffff',
          borderColor: '#d8b4fe', // purple-300
          shadowColor: '#7c3aed',
          shadowOpacity: 0.12,
          shadowRadius: 10,
        };
      case 'danger':
        return {
          backgroundColor: '#fef2f2', // red-50
          borderColor: '#fecaca', // red-200
        };
      case 'glass':
      case 'surface':
      default:
        return {
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0', // slate-200
        };
    }
  };

  const vStyles = getVariantStyles();
  const Component = onPress ? TouchableOpacity : View;
  const touchProps = onPress ? { onPress, activeOpacity } : {};

  return (
    <Component
      {...touchProps}
      style={[
        styles.card,
        {
          backgroundColor: vStyles.backgroundColor,
          borderColor: vStyles.borderColor,
          shadowColor: (vStyles as any).shadowColor || '#64748b',
          shadowOpacity: (vStyles as any).shadowOpacity || 0.05,
          shadowRadius: (vStyles as any).shadowRadius || 8,
        },
        style,
      ]}
    >
      <View style={[styles.content, contentStyle]}>
        {children}
      </View>
    </Component>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  content: {
    padding: 16,
  },
});

