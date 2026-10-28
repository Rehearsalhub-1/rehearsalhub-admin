import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
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
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null);

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
      duration: 100,
      useNativeDriver: true,
    }).start(() => {
      setVisible(false);
      // Fallback for non-iOS platforms where onDismiss doesn't fire:
      if (Platform.OS !== 'ios') {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        if (action) {
          setTimeout(() => {
            try {
              action();
            } catch (err) {
              console.error('[CustomAlert] onPress error:', err);
            }
          }, 40);
        }
      }
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
    pendingActionRef.current = button.onPress || null;
    hideAlert();
  };

  const getThemeProps = (type: AlertType) => {
    switch (type) {
      case 'success':
        return {
          icon: 'checkmark-circle-outline' as const,
          iconColor: '#059669',
          badgeBg: '#ecfdf5',
          badgeBorder: '#a7f3d0',
          eyebrowBg: '#d1fae5',
          eyebrowText: '#065f46',
          eyebrowLabel: 'COMPLETED',
          accentColor: '#059669',
        };
      case 'danger':
        return {
          icon: 'trash-outline' as const,
          iconColor: '#0f172a',
          badgeBg: '#f1f5f9',
          badgeBorder: '#cbd5e1',
          eyebrowBg: '#f1f5f9',
          eyebrowText: '#334155',
          eyebrowLabel: 'ACTION REQUIRED',
          accentColor: '#0f172a',
        };
      case 'warning':
        return {
          icon: 'warning-outline' as const,
          iconColor: '#d97706',
          badgeBg: '#fffbeb',
          badgeBorder: '#fde68a',
          eyebrowBg: '#fef3c7',
          eyebrowText: '#92400e',
          eyebrowLabel: 'ATTENTION',
          accentColor: '#d97706',
        };
      case 'confirm':
        return {
          icon: 'help-circle-outline' as const,
          iconColor: '#7c3aed',
          badgeBg: '#f5f3ff',
          badgeBorder: '#ddd6fe',
          eyebrowBg: '#ede9fe',
          eyebrowText: '#6d28d9',
          eyebrowLabel: 'CONFIRMATION',
          accentColor: '#7c3aed',
        };
      case 'info':
      default:
        return {
          icon: 'information-circle-outline' as const,
          iconColor: '#7c3aed',
          badgeBg: '#f5f3ff',
          badgeBorder: '#ddd6fe',
          eyebrowBg: '#ede9fe',
          eyebrowText: '#6d28d9',
          eyebrowLabel: 'NOTICE',
          accentColor: '#7c3aed',
        };
    }
  };

  const currentType = config.type || 'info';
  const theme = getThemeProps(currentType);
  const displayIcon = config.icon || theme.icon;
  const buttons = config.buttons || [{ text: 'OK', style: 'default' }];
  const isBinaryChoice = buttons.length === 2;
  const isActionSheet = buttons.length > 2;

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
        onDismiss={() => {
          const action = pendingActionRef.current;
          pendingActionRef.current = null;
          if (action) {
            setTimeout(() => {
              try {
                action();
              } catch (err) {
                console.error('[CustomAlert] onPress error:', err);
              }
            }, 40);
          }
        }}
      >
        <Animated.View style={[styles.backdrop, { opacity: opacityAnim }]}>
          <TouchableOpacity
            style={StyleSheet.absoluteFill}
            activeOpacity={1}
            onPress={() => {
              if (config.cancelable !== false) {
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
            {/* Top Grabber */}
            <View style={styles.cardGrabber} />

            {/* Quick Dismiss Button */}
            {config.cancelable !== false && (
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={hideAlert}
                activeOpacity={0.7}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons name="close" size={16} color="#94a3b8" />
              </TouchableOpacity>
            )}

            {/* Hero Squircle Badge */}
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder },
              ]}
            >
              <Ionicons name={displayIcon} size={28} color={theme.iconColor} />
            </View>

            {/* Eyebrow Chip */}
            <View style={[styles.eyebrowChip, { backgroundColor: theme.eyebrowBg }]}>
              <Text style={[styles.eyebrowText, { color: theme.eyebrowText }]}>
                {theme.eyebrowLabel}
              </Text>
            </View>

            {/* Title */}
            <Text style={styles.title} numberOfLines={2}>
              {config.title}
            </Text>

            {/* Enclosed Message Container */}
            {!!config.message && (
              <View style={styles.messageBox}>
                <Text style={styles.messageText}>{config.message}</Text>
              </View>
            )}

            {/* Actions: Case 1 - Binary Choice (Cancel + Action) */}
            {isBinaryChoice && (
              <View style={styles.binaryButtonsRow}>
                {buttons.map((btn, index) => {
                  const isDestructive = btn.style === 'destructive';
                  const isCancel = btn.style === 'cancel';
                  const isDefault = !isDestructive && !isCancel;

                  return (
                    <TouchableOpacity
                      key={index}
                      activeOpacity={0.82}
                      style={[
                        styles.binaryBtn,
                        isCancel && styles.binaryCancelBtn,
                        isDestructive && styles.binaryDestructiveBtn,
                        isDefault && [styles.binaryDefaultBtn, { backgroundColor: theme.accentColor }],
                      ]}
                      onPress={() => handleButtonPress(btn)}
                    >
                      {isDestructive && (
                        <Ionicons name="trash-outline" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                      )}
                      {isCancel && (
                        <Ionicons name="close-circle-outline" size={15} color="#64748b" style={{ marginRight: 5 }} />
                      )}
                      {isDefault && (
                        <Ionicons name="checkmark-circle-outline" size={16} color="#ffffff" style={{ marginRight: 5 }} />
                      )}
                      <Text
                        style={[
                          styles.binaryBtnText,
                          isCancel && styles.binaryCancelBtnText,
                          isDestructive && styles.binaryDestructiveBtnText,
                          isDefault && styles.binaryDefaultBtnText,
                        ]}
                      >
                        {btn.text}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}

            {/* Actions: Case 2 - Single Button (e.g. OK) */}
            {buttons.length === 1 && (
              <View style={styles.singleButtonContainer}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={[styles.singleBtn, { backgroundColor: theme.accentColor }]}
                  onPress={() => handleButtonPress(buttons[0])}
                >
                  <Text style={styles.singleBtnText}>{buttons[0].text}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Actions: Case 3 - Action Sheet (3+ buttons) */}
            {isActionSheet && (
              <View style={styles.actionSheetContainer}>
                {buttons
                  .filter(b => b.style !== 'cancel')
                  .map((btn, index) => {
                    const isDestructive = btn.style === 'destructive';
                    return (
                      <TouchableOpacity
                        key={index}
                        activeOpacity={0.75}
                        style={[
                          styles.sheetRowBtn,
                          isDestructive && styles.sheetRowDestructiveBtn,
                        ]}
                        onPress={() => handleButtonPress(btn)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
                          <Ionicons
                            name={isDestructive ? 'trash-outline' : 'chevron-forward-circle-outline'}
                            size={16}
                            color={isDestructive ? '#0f172a' : '#7c3aed'}
                            style={{ marginRight: 8 }}
                          />
                          <Text
                            style={[
                              styles.sheetRowText,
                              isDestructive && styles.sheetRowDestructiveText,
                            ]}
                            numberOfLines={1}
                          >
                            {btn.text}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color="#cbd5e1" />
                      </TouchableOpacity>
                    );
                  })}

                {/* Cancel row for Action Sheet */}
                {buttons.some(b => b.style === 'cancel') ? (
                  buttons
                    .filter(b => b.style === 'cancel')
                    .map((btn, index) => (
                      <TouchableOpacity
                        key={`cancel-${index}`}
                        activeOpacity={0.75}
                        style={styles.sheetCancelBtn}
                        onPress={() => handleButtonPress(btn)}
                      >
                        <Text style={styles.sheetCancelText}>{btn.text}</Text>
                      </TouchableOpacity>
                    ))
                ) : (
                  <TouchableOpacity
                    activeOpacity={0.75}
                    style={styles.sheetCancelBtn}
                    onPress={hideAlert}
                  >
                    <Text style={styles.sheetCancelText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
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
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
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
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.16,
    shadowRadius: 32,
    elevation: 14,
    position: 'relative',
  },
  cardGrabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e2e8f0',
    marginBottom: 14,
  },
  closeIconBtn: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconBadge: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  eyebrowChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  eyebrowText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    letterSpacing: -0.3,
    paddingHorizontal: 8,
  },
  messageBox: {
    width: '100%',
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 10,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 19,
    color: '#475569',
    textAlign: 'center',
  },

  // Binary Buttons (Cancel + Confirm)
  binaryButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 10,
    marginTop: 18,
  },
  binaryBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  binaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  binaryCancelBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  binaryCancelBtnText: {
    color: '#475569',
  },
  binaryDestructiveBtn: {
    backgroundColor: '#0f172a',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 3,
  },
  binaryDestructiveBtnText: {
    color: '#ffffff',
  },
  binaryDefaultBtn: {
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  binaryDefaultBtnText: {
    color: '#ffffff',
  },

  // Single Button
  singleButtonContainer: {
    width: '100%',
    marginTop: 18,
  },
  singleBtn: {
    width: '100%',
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 2,
  },
  singleBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },

  // Action Sheet List (3+ buttons)
  actionSheetContainer: {
    width: '100%',
    marginTop: 14,
    gap: 6,
  },
  sheetRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  sheetRowDestructiveBtn: {
    backgroundColor: '#f1f5f9',
    borderColor: '#e2e8f0',
  },
  sheetRowText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#0f172a',
  },
  sheetRowDestructiveText: {
    fontWeight: '700',
    color: '#0f172a',
  },
  sheetCancelBtn: {
    marginTop: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCancelText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748b',
  },
});
