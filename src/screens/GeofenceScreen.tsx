import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useZoneContext } from '../context/ZoneContext';
import { api } from '../services/api';
import { customAlert } from '../context/AlertContext';

interface VenuePreset {
  name: string;
  lat: string;
  lon: string;
  radius: string;
  description: string;
}

const VENUE_PRESETS: VenuePreset[] = [
  {
    name: 'Loveworld Convocation Arena (LCA)',
    lat: '6.618640',
    lon: '3.361420',
    radius: '350',
    description: 'Ikeja, Lagos • Main Rehearsal & Broadcast Arena',
  },
  {
    name: 'Loveworld Crusade Grounds',
    lat: '6.744120',
    lon: '3.472140',
    radius: '500',
    description: 'Asese, Ogun State • Mega Rehearsal Camp',
  },
  {
    name: 'Loveworld Studio A',
    lat: '6.458985',
    lon: '3.406232',
    radius: '200',
    description: 'Central Broadcast & AudioLab Studio',
  },
  {
    name: 'Oasis Studio Center',
    lat: '6.462110',
    lon: '3.411250',
    radius: '150',
    description: 'Live Band & Vocal Rehearsal Suite',
  },
  {
    name: 'Main Church Auditorium',
    lat: '6.601840',
    lon: '3.351520',
    radius: '250',
    description: 'Sunday Service & Choir Staging Hall',
  },
  {
    name: 'Cape Town Assembly Hall',
    lat: '-33.924870',
    lon: '18.424060',
    radius: '250',
    description: 'Regional Zonal & Church Assembly',
  },
  {
    name: 'Johannesburg Central Hall',
    lat: '-26.204100',
    lon: '28.047300',
    radius: '300',
    description: 'Southern Africa Zonal Rehearsal Hub',
  },
];

const RADIUS_OPTIONS = ['100', '200', '300', '500', '1000'];

export default function GeofenceScreen() {
  const navigation = useNavigation<any>();
  const { activeZone, isChurchMode, activeChurch } = useZoneContext();

  const [venueName, setVenueName] = useState('');
  const [lat, setLat] = useState('6.458985');
  const [lon, setLon] = useState('3.406232');
  const [radius, setRadius] = useState('200');
  const [activeEventName, setActiveEventName] = useState('Choir Rehearsal');
  const [isEnabled, setIsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // Storage key matching rehearsalhub pattern
  const isHQ = !isChurchMode && (!activeZone || activeZone.id === 'zone-001');
  const docId = isChurchMode && activeChurch?.id
    ? `geofence_${activeChurch.id}`
    : isHQ
    ? 'geofence_hq'
    : `geofence_${activeZone?.id || 'default'}`;

  const currentScopeTitle = isChurchMode
    ? (activeChurch?.name || 'Local Church Choir')
    : (activeZone?.name || 'Your Loveworld Singers');

  useEffect(() => {
    async function loadGeofence() {
      setLoading(true);
      try {
        const res = await api.settings.get(docId);
        if (res?.data) {
          const d = res.data;
          if (d.venueName) setVenueName(d.venueName);
          if (d.latitude != null) setLat(String(d.latitude));
          if (d.longitude != null) setLon(String(d.longitude));
          if (d.radius != null) setRadius(String(d.radius));
          if (d.activeEventName) setActiveEventName(d.activeEventName);
          if (d.isEnabled !== undefined) setIsEnabled(Boolean(d.isEnabled));
        } else {
          setVenueName(currentScopeTitle + ' Venue');
          setLat('6.458985');
          setLon('3.406232');
          setRadius('200');
          setActiveEventName('Choir Rehearsal');
          setIsEnabled(true);
        }
      } catch (e) {
        console.warn('[Geofence] Load error:', e);
        setVenueName(currentScopeTitle + ' Venue');
        setLat('6.458985');
        setLon('3.406232');
        setRadius('200');
        setActiveEventName('Choir Rehearsal');
        setIsEnabled(true);
      } finally {
        setLoading(false);
      }
    }

    loadGeofence();
  }, [docId, currentScopeTitle]);

  // Request location permission & acquire high-accuracy GPS
  async function handleGetCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        customAlert(
          'Location Permission Required',
          'Please allow location access in your device settings so RehearsalHub Admin can detect your current rehearsal hall coordinates.'
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const detectedLat = location.coords.latitude.toFixed(6);
      const detectedLon = location.coords.longitude.toFixed(6);

      setLat(detectedLat);
      setLon(detectedLon);

      customAlert(
        'GPS Location Acquired',
        `Venue coordinates set to your current device position:\n\nLatitude: ${detectedLat}°N\nLongitude: ${detectedLon}°E`
      );
    } catch (e: any) {
      customAlert('GPS Location Error', e.message || 'Unable to retrieve device GPS fix.');
    } finally {
      setLocating(false);
    }
  }

  async function handleSave() {
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    const radNum = parseInt(radius, 10);

    if (isNaN(latNum) || isNaN(lonNum)) {
      customAlert('Invalid Coordinates', 'Please enter valid numerical latitude and longitude.');
      return;
    }

    if (isNaN(radNum) || radNum < 20) {
      customAlert('Invalid Radius', 'Please enter a radius of at least 20 meters.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        venueName: venueName.trim() || currentScopeTitle + ' Venue',
        latitude: latNum,
        longitude: lonNum,
        radius: radNum,
        activeEventName: activeEventName.trim() || 'Rehearsal',
        isEnabled,
        zoneId: isChurchMode ? (activeChurch?.id || '') : (activeZone?.id || ''),
        scope: isChurchMode ? 'church' : 'zone',
        updatedAt: new Date().toISOString(),
      };

      await api.settings.update(docId, payload);
      if (isHQ && activeZone?.id && activeZone.id !== 'zone-001') {
        await api.settings.update(`geofence_${activeZone.id}`, payload).catch(() => null);
      } else if (isHQ && activeZone?.id === 'zone-001') {
        await api.settings.update('geofence_zone-001', payload).catch(() => null);
      }

      customAlert(
        'Geofence Saved',
        `Geofenced clock-in for "${currentScopeTitle}" is now active with a ${radNum}m radius.`
      );
    } catch (e: any) {
      console.error('[Geofence] Save error:', e);
      customAlert(
        'Save Failed',
        e?.message || e?.error || 'Failed to save geofence configuration.'
      );
    } finally {
      setSaving(false);
    }
  }

  function applyPreset(preset: VenuePreset) {
    setVenueName(preset.name);
    setLat(preset.lat);
    setLon(preset.lon);
    setRadius(preset.radius);
    customAlert('Preset Applied', `Loaded coordinates for ${preset.name}.`);
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Executive Top Bar ── */}
      <View style={styles.topBar}>
        <View style={styles.leftBarGroup}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="chevron-back" size={20} color="#475569" />
          </TouchableOpacity>
          <View>
            <Text style={styles.screenTitle}>Venue Geofence</Text>
            <Text style={styles.screenSubtitle} numberOfLines={1}>
              {currentScopeTitle}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.topSaveBtn, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={16} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.topSaveBtnText}>Save</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#7c3aed" />
          <Text style={styles.loaderText}>Loading venue GPS settings...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Master Boundary Switch ── */}
          <View style={styles.card}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1, marginRight: 12 }}>
                <Text style={styles.cardHeaderTitle}>ENFORCE GPS BOUNDARY</Text>
                <Text style={styles.cardHelperText}>
                  {isEnabled
                    ? 'Singers must be physically inside venue radius to clock in'
                    : 'Location check disabled — singers can check in from anywhere'}
                </Text>
              </View>
              <Switch
                value={isEnabled}
                onValueChange={setIsEnabled}
                trackColor={{ false: '#cbd5e1', true: '#c4b5fd' }}
                thumbColor={isEnabled ? '#7c3aed' : '#ffffff'}
              />
            </View>
          </View>

          {/* ── Venue & Event Configuration ── */}
          <View style={styles.card}>
            <Text style={styles.cardHeaderTitle}>VENUE & EVENT DETAILS</Text>

            <Text style={styles.fieldLabel}>Venue / Hall Name</Text>
            <TextInput
              style={styles.input}
              value={venueName}
              onChangeText={setVenueName}
              placeholder="e.g. Loveworld Convocation Arena (LCA)"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.fieldLabel}>Active Event / Rehearsal</Text>
            <TextInput
              style={styles.input}
              value={activeEventName}
              onChangeText={setActiveEventName}
              placeholder="e.g. Praise Night Rehearsal"
              placeholderTextColor="#94a3b8"
            />

            {/* GPS Coordinates Header & Device Location Button */}
            <View style={styles.gpsSectionHeader}>
              <Text style={styles.fieldLabel}>GPS COORDINATES</Text>
              <TouchableOpacity
                style={[styles.currentLocationBtn, locating && { opacity: 0.7 }]}
                onPress={handleGetCurrentLocation}
                disabled={locating}
                activeOpacity={0.75}
              >
                {locating ? (
                  <ActivityIndicator size="small" color="#7c3aed" style={{ marginRight: 5 }} />
                ) : (
                  <Ionicons name="locate" size={14} color="#7c3aed" style={{ marginRight: 5 }} />
                )}
                <Text style={styles.currentLocationText}>
                  {locating ? 'Acquiring GPS...' : 'Use Current Location'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.coordsRow}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.coordSubLabel}>Latitude (°N)</Text>
                <TextInput
                  style={styles.input}
                  value={lat}
                  onChangeText={setLat}
                  keyboardType="numeric"
                  placeholder="6.458985"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.coordSubLabel}>Longitude (°E)</Text>
                <TextInput
                  style={styles.input}
                  value={lon}
                  onChangeText={setLon}
                  keyboardType="numeric"
                  placeholder="3.406232"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            {/* Radius Chips */}
            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Clock-In Radius (Meters)</Text>
            <View style={styles.radiusRow}>
              {RADIUS_OPTIONS.map(r => {
                const isActive = radius === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[styles.radiusChip, isActive && styles.radiusChipActive]}
                    onPress={() => setRadius(r)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.radiusChipText, isActive && styles.radiusChipTextActive]}>
                      {r}m
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── Ministry Venue Presets ── */}
          <View style={styles.card}>
            <View style={styles.presetsHeaderRow}>
              <Ionicons name="compass-outline" size={16} color="#7c3aed" style={{ marginRight: 6 }} />
              <Text style={styles.cardHeaderTitle}>QUICK VENUE PRESETS</Text>
            </View>
            <Text style={styles.cardHelperText}>
              Tap to apply verified GPS coordinates for primary ministry venues:
            </Text>

            <View style={{ marginTop: 10 }}>
              {VENUE_PRESETS.map((preset, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.presetItem}
                  onPress={() => applyPreset(preset)}
                  activeOpacity={0.7}
                >
                  <View style={styles.presetIconWrap}>
                    <Ionicons name="location" size={16} color="#7c3aed" />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.presetName} numberOfLines={1}>
                      {preset.name}
                    </Text>
                    <Text style={styles.presetDesc} numberOfLines={1}>
                      {preset.description}
                    </Text>
                  </View>
                  <View style={styles.presetRadiusBadge}>
                    <Text style={styles.presetRadiusText}>{preset.radius}m</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── Bottom Save Button ── */}
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator color="#ffffff" style={{ marginRight: 8 }} />
            ) : (
              <Ionicons name="checkmark-done" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.saveBtnText}>
              {saving ? 'Publishing...' : 'Save & Publish Geofence'}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  leftBarGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  screenTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1e293b',
    letterSpacing: -0.3,
  },
  screenSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  topSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  topSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748b',
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7c3aed',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  cardHelperText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 3,
    lineHeight: 16,
  },
  gpsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  coordSubLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  currentLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f3ff',
    borderWidth: 1,
    borderColor: '#ddd6fe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  currentLocationText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
  },
  coordsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radiusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  radiusChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radiusChipActive: {
    borderColor: '#7c3aed',
    backgroundColor: '#7c3aed',
  },
  radiusChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  radiusChipTextActive: {
    color: '#ffffff',
  },
  presetsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    backgroundColor: '#f8fafc',
    marginBottom: 6,
  },
  presetIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#f5f3ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  presetName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  presetDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  presetRadiusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: '#ede9fe',
    borderWidth: 1,
    borderColor: '#ddd6fe',
  },
  presetRadiusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6d28d9',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#7c3aed',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
