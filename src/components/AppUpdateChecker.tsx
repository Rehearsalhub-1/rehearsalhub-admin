import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import { Colors } from '../constants/Colors';

export function AppUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (__DEV__) return;
    checkForUpdate();
  }, []);

  async function checkForUpdate() {
    try {
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        await Updates.fetchUpdateAsync();
        setUpdateAvailable(true);
      }
    } catch (e) {
      // Silent fail — update check is non-critical
    }
  }

  async function applyUpdate() {
    setUpdating(true);
    try {
      await Updates.reloadAsync();
    } catch (e) {
      setUpdating(false);
      Alert.alert('Update failed', 'Please restart the app manually.');
    }
  }

  if (!updateAvailable) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>A new update is available</Text>
      <TouchableOpacity style={styles.btn} onPress={applyUpdate} disabled={updating}>
        <Text style={styles.btnText}>{updating ? 'Updating...' : 'Update Now'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    backgroundColor: Colors.accent,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  text: { color: '#fff', fontSize: 13, fontWeight: '500', flex: 1 },
  btn: { backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginLeft: 10 },
  btnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
