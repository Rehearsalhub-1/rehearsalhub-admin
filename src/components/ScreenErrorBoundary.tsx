import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet
} from 'react-native';
import { Colors } from '../constants/Colors';

interface Props {
  children: React.ReactNode;
  screenName?: string;
  onGoBack?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ScreenErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ScreenErrorBoundary] ${this.props.screenName || 'Unknown'} crashed:`, error?.message);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.icon}>⟳</Text>
            <Text style={styles.title}>Reload</Text>
            <Text style={styles.subtitle}>Sorry, their is a hiccup somewhere</Text>

            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleRetry}
              activeOpacity={0.7}
            >
              <Text style={styles.retryText}>Tap to Reload</Text>
            </TouchableOpacity>

            {this.props.onGoBack && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={this.props.onGoBack}
                activeOpacity={0.7}
              >
                <Text style={styles.backText}>Go Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    alignItems: 'center',
    width: '100%',
    maxWidth: 300,
  },
  icon: {
    fontSize: 64,
    color: Colors.accent,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  retryButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  backText: {
    color: Colors.textMuted,
    fontSize: 14,
  },
});

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  screenName: string
) {
  const WithErrorBoundary = React.forwardRef<any, P & { navigation?: any }>((props, _ref) => (
    <ScreenErrorBoundary
      screenName={screenName}
      onGoBack={props.navigation?.canGoBack?.() ? () => props.navigation.goBack() : undefined}
    >
      <WrappedComponent {...(props as P)} />
    </ScreenErrorBoundary>
  ));
  WithErrorBoundary.displayName = `withErrorBoundary(${screenName})`;
  return WithErrorBoundary;
}
