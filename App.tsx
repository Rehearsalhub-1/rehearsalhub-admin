import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, AppState, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ZoneProvider } from './src/context/ZoneContext';
import { AlertProvider } from './src/context/AlertContext';
import AppNavigator from './src/navigation/AppNavigator';
import { AppUpdateChecker } from './src/components/AppUpdateChecker';
import { Colors } from './src/constants/Colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

const NavTheme = {
  dark: false,
  colors: {
    primary:      Colors.accent,
    background:   Colors.background,
    card:         Colors.card,
    text:         Colors.textPrimary,
    border:       Colors.border,
    notification: Colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: 'normal' as const },
    medium:  { fontFamily: 'System', fontWeight: '500' as const },
    bold:    { fontFamily: 'System', fontWeight: 'bold' as const },
    heavy:   { fontFamily: 'System', fontWeight: '900' as const },
  },
};

function AuthGate() {
  const { loading, isAdmin, session } = useAuth();
  const needsScopeSelection = Boolean(session?.isDualRole || (session?.churches?.length || 0) > 1);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.accent} />
      </View>
    );
  }

  return (
    <SafeAreaProvider style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" />
      <NavigationContainer theme={NavTheme}>
        <AppNavigator initialRoute={isAdmin ? (needsScopeSelection ? 'ModePicker' : 'MainTabs') : 'Login'} />
      </NavigationContainer>
      <AppUpdateChecker />
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <AlertProvider>
      <AuthProvider>
        <ZoneProvider>
          <AuthGate />
        </ZoneProvider>
      </AuthProvider>
    </AlertProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
