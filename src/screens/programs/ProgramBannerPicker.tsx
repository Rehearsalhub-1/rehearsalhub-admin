import React from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { modalStyles } from './programModalStyles';
import { LOCAL_BANNERS } from './programUtils';

interface ProgramBannerPickerProps {
  bannerKey: string;
  bannerUrl: string;
  onSelectBannerKey: (key: string) => void;
  onChangeBannerUrl: (url: string) => void;
  onClearBanner: () => void;
  showCustomBanner: boolean;
  setShowCustomBanner: React.Dispatch<React.SetStateAction<boolean>>;
  onOpenMediaLibrary: () => void;
}

export function ProgramBannerPicker({
  bannerKey,
  bannerUrl,
  onSelectBannerKey,
  onChangeBannerUrl,
  onClearBanner,
  showCustomBanner,
  setShowCustomBanner,
  onOpenMediaLibrary,
}: ProgramBannerPickerProps) {
  const resolvedBanner = bannerKey
    ? LOCAL_BANNERS.find(b => b.key === bannerKey)?.src
    : bannerUrl
    ? { uri: bannerUrl }
    : null;

  return (
    <View style={modalStyles.bannerSection}>
      <View style={modalStyles.labelWithActionRow}>
        <Text style={modalStyles.label}>BANNER ARTWORK</Text>
        <TouchableOpacity
          style={modalStyles.pickMediaBtn}
          onPress={onOpenMediaLibrary}
          activeOpacity={0.7}
        >
          <Ionicons name="folder-open-outline" size={13} color="#7c3aed" style={{ marginRight: 4 }} />
          <Text style={modalStyles.pickMediaBtnText}>Pick from Media Library</Text>
        </TouchableOpacity>
      </View>

      {resolvedBanner && (
        <View style={{ position: 'relative' }}>
          <Image source={resolvedBanner} style={modalStyles.bannerPreview} resizeMode="cover" />
          {bannerUrl ? (
            <TouchableOpacity
              style={modalStyles.bannerClearBtn}
              onPress={onClearBanner}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={22} color="#ffffff" />
            </TouchableOpacity>
          ) : null}
        </View>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={modalStyles.bannerScroll}>
        {LOCAL_BANNERS.map(b => (
          <TouchableOpacity
            key={b.key}
            onPress={() => onSelectBannerKey(b.key)}
            style={[
              modalStyles.bannerThumb,
              bannerKey === b.key && modalStyles.bannerThumbActive,
            ]}
          >
            <Image source={b.src} style={modalStyles.bannerThumbImg} resizeMode="cover" />
            {bannerKey === b.key && (
              <View style={modalStyles.bannerCheckOverlay}>
                <Ionicons name="checkmark-circle" size={22} color="#7c3aed" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TouchableOpacity
        style={modalStyles.customBannerToggle}
        onPress={() => setShowCustomBanner(p => !p)}
      >
        <Ionicons name="link-outline" size={14} color={Colors.accent} style={{ marginRight: 5 }} />
        <Text style={modalStyles.customBannerToggleText}>
          {showCustomBanner ? 'Hide custom URL' : 'Use custom image URL'}
        </Text>
      </TouchableOpacity>

      {showCustomBanner && (
        <TextInput
          style={[modalStyles.input, { marginTop: 8 }]}
          placeholder="https://..."
          placeholderTextColor={Colors.textMuted}
          value={bannerUrl}
          onChangeText={onChangeBannerUrl}
          autoCapitalize="none"
          keyboardType="url"
        />
      )}
    </View>
  );
}
