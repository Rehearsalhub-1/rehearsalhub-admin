import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

export type AlertType = 'info' | 'success' | 'warning' | 'danger' | 'confirm';

export interface AlertButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void | Promise<void>;
}

export interface AlertConfig {
  title: string;
  message?: string;
  type?: AlertType;
  icon?: keyof typeof Ionicons.glyphMap;
  buttons?: AlertButton[];
  cancelable?: boolean;
}

type ShowAlertSignature = {
  (config: AlertConfig): void;
  (title: string, message?: string, buttons?: AlertButton[], options?: Partial<AlertConfig>): void;
};

interface AlertContextValue {
  showAlert: ShowAlertSignature;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextValue | undefined>(undefined);

// Standalone module ref for global customAlert() invocation
let globalShowAlert: ShowAlertSignature | null = null;

export const customAlert: ShowAlertSignature = (arg1: any, arg2?: any, arg3?: any, arg4?: any) => {
  if (globalShowAlert) {
    globalShowAlert(arg1, arg2, arg3, arg4);
  } else {
    console.warn('[CustomAlert] Provider not mounted yet');
  }
};

export function AlertProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [config, setConfig] = useState<AlertConfig>({ title: '' });

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const animateIn = useCallback(() => {
    scaleAnim.setValue(0.92);
    opacityAnim.setValue(0);
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacityAnim, scaleAnim]);

  const hideAlert = useCallback(() => {
    Animated.timing(opacityAnim, {
      toValue: 0,
      duration: 140,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
    });
  }, [opacityAnim]);

  const showAlert: ShowAlertSignature = useCallback(
    (arg1: any, arg2?: any, arg3?: any, arg4?: any) => {
      let resolvedConfig: AlertConfig;

      if (typeof arg1 === 'object' && arg1 !== null && !Array.isArray(arg1)) {
        resolvedConfig = { ...arg1 };
      } else {
        const title = String(arg1 || '');
        const message = typeof arg2 === 'string' ? arg2 : undefined;
        const buttons = Array.isArray(arg3) ? arg3 : typeof arg2 === 'object' && Array.isArray(arg2) ? arg2 : undefined;
        const extra = typeof arg4 === 'object' ? arg4 : {};
        resolvedConfig = {
          title,
          message,
          buttons,
          ...extra,
        };
      }

      // Infer alert type if not explicitly provided
      if (!resolvedConfig.type) {
        const lowerTitle = resolvedConfig.title.toLowerCase();
        const lowerMsg = (resolvedConfig.message || '').toLowerCase();
        const hasDestructiveBtn = resolvedConfig.buttons?.some(b => b.style === 'destructive');

        if (
          hasDestructiveBtn ||
          lowerTitle.includes('delete') ||
          lowerTitle.includes('remove') ||
          lowerTitle.includes('reject') ||
          lowerTitle.includes('error') ||
          lowerTitle.includes('failed') ||
          lowerMsg.includes('error') ||
          lowerMsg.includes('permanently')
        ) {
          resolvedConfig.type = 'danger';
        } else if (
          lowerTitle.includes('success') ||
          lowerTitle.includes('saved') ||
          lowerTitle.includes('approved') ||
          lowerTitle.includes('created') ||
          lowerTitle.includes('duplicated') ||
          lowerTitle.includes('ready')
        ) {
          resolvedConfig.type = 'success';
        } else if (
          lowerTitle.includes('warning') ||
          lowerTitle.includes('missing') ||
          lowerTitle.includes('required') ||
          lowerTitle.includes('notice') ||
          lowerTitle.includes('cannot')
        ) {
          resolvedConfig.type = 'warning';
        } else if (resolvedConfig.buttons && resolvedConfig.buttons.length > 1) {
          resolvedConfig.type = 'confirm';
        } else {
          resolvedConfig.type = 'info';
        }
      }

      // Default single OK button if none provided
      if (!resolvedConfig.buttons || resolvedConfig.buttons.length === 0) {
        resolvedConfig.buttons = [{ text: 'OK', style: 'default' }];
      }

      setConfig(resolvedConfig);
      setVisible(true);
      animateIn();
    },
    [animateIn]
  );

  globalShowAlert = showAlert;

  const handleButtonPress = (button: AlertButton) => {
    hideAlert();
    if (button.onPress) {
      setTimeout(() => {
        try {
          button.onPress?.();
        } catch (err) {
          console.error('[CustomAlert] onPress error:', err);
        }
      }, 150);
    }
  };

  const getThemeProps = (type: AlertType) => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          iconColor: Colors.success,
          badgeBg: '#ecfdf5',
          badgeBorder: '#a7f3d0',
          accentColor: Colors.success,
        };
      case 'danger':
        return {
          icon: 'alert-circle' as const,
          iconColor: Colors.danger,
          badgeBg: '#fef2f2',
          badgeBorder: '#fecaca',
          accentColor: Colors.danger,
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          iconColor: Colors.warning,
          badgeBg: '#fffbeb',
          badgeBorder: '#fde68a',
          accentColor: Colors.warning,
        };
      case 'confirm':
        return {
          icon: 'help-circle' as const,
          iconColor: Colors.accent,
          badgeBg: '#f3e8ff',
          badgeBorder: '#e9d5ff',
          accentColor: Colors.accent,
        };
      case 'info':
      default:
        return {
          icon: 'information-circle' as const,
          iconColor: Colors.info,
          badgeBg: '#eff6ff',
          badgeBorder: '#bfdbfe',
          accentColor: Colors.info,
        };
    }
  };

  const currentType = config.type || 'info';
  const theme = getThemeProps(currentType);
  const displayIcon = config.icon || theme.icon;
  const buttons = config.buttons || [{ text: 'OK', style: 'default' }];
  const isHorizontalButtons = buttons.length === 2;

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <Modal
        visible={visible}
        transparent={true}
        animationType="none"
        onRequestClose={() => {
          if (config.cancelable !== false) {
            hideAlert();
          }
        }}
      >
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              if (config.cancelable !== false && buttons.length === 1) {
                hideAlert();
              }
            }}
          />
          <Animated.View
            style={[
              styles.card,
              {
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Icon Badge */}
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder },
              ]}
            >
              <Ionicons name={displayIcon} size={32} color={theme.iconColor} />
            </View>

            {/* Title & Message */}
            <Text style={styles.title}>{config.title}</Text>
            {!!config.message && <Text style={styles.message}>{config.message}</Text>}

            {/* Actions */}
            <View
              style={[
                styles.buttonsContainer,
                isHorizontalButtons ? styles.horizontalButtons : styles.verticalButtons,
              ]}
            >
              {buttons.map((btn, index) => {
                const isDestructive = btn.style === 'destructive';
                const isCancel = btn.style === 'cancel';
                const isDefault = !isDestructive && !isCancel;

                return (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    style={[
                      styles.button,
                      isHorizontalButtons && styles.flexButton,
                      isDestructive && styles.destructiveButton,
                      isCancel && styles.cancelButton,
                      isDefault && [styles.defaultButton, { backgroundColor: theme.accentColor }],
                    ]}
                    onPress={() => handleButtonPress(btn)}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && styles.destructiveButtonText,
                        isCancel && styles.cancelButtonText,
                        isDefault && styles.defaultButtonText,
                      ]}
                    >
                      {btn.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    // Return fallback that uses customAlert
    return {
      showAlert: customAlert,
      hideAlert: () => {},
    };
  }
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    zIndex: 99999,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 12,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  buttonsContainer: {
    width: '100%',
    marginTop: 24,
  },
  horizontalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  verticalButtons: {
    flexDirection: 'column',
    gap: 10,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  flexButton: {
    flex: 1,
  },
  defaultButton: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  defaultButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cancelButtonText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
  destructiveButton: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  destructiveButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
