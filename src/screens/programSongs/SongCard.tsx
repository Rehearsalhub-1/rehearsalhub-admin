import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PraiseSong } from './types';
import { styles } from './programSongsStyles';

interface SongCardProps {
  item: PraiseSong;
  index: number;
  onPress: () => void;
  onToggleActive: () => void;
  onToggleHeard: () => void;
  onRemove: () => void;
}

export default function SongCard({
  item,
  index,
  onPress,
  onToggleActive,
  onToggleHeard,
  onRemove,
}: SongCardProps) {
  const isHeard = Boolean(item.isHeard ?? item.heard ?? item.status === 'heard');
  const isLive = item.status === 'live' || Boolean(item.isLive);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.trackCard, isLive && styles.trackCardActive]}
    >
      {/* Left Column: Track Number or Album Art Thumbnail */}
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.artworkThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.trackIndexBox}>
          <Text style={styles.trackIndexNum}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>
      )}

      {/* Middle Column: Song Info & Badges */}
      <View style={styles.trackInfoCol}>
        <Text style={styles.trackTitleText} numberOfLines={1}>
          {item.title || 'Untitled Song'}
        </Text>

        <View style={styles.trackMetaRow}>
          {item.leadSinger ? (
            <Text style={styles.trackSingerText} numberOfLines={1}>
              {item.leadSinger}
            </Text>
          ) : item.writer ? (
            <Text style={styles.trackSingerText} numberOfLines={1}>
              {item.writer}
            </Text>
          ) : null}

          {item.key ? (
            <View style={styles.smallKeyChip}>
              <Text style={styles.smallKeyChipText}>{item.key}</Text>
            </View>
          ) : null}

          {item.tempo ? (
            <Text style={styles.smallTempoText}>{item.tempo} BPM</Text>
          ) : null}
        </View>
      </View>

      {/* Right Column: 1-Tap LIVE Broadcast, Heard Toggle & Delete */}
      <View style={styles.trackRightCol}>
        {/* 1-Tap LIVE Toggle */}
        <TouchableOpacity
          style={[
            styles.liveToggleBtn,
            isLive ? styles.liveToggleBtnActive : styles.liveToggleBtnInactive,
          ]}
          onPress={onToggleActive}
          activeOpacity={0.75}
          hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
        >
          <Text
            style={[
              styles.liveToggleBtnText,
              isLive ? styles.liveToggleBtnTextActive : styles.liveToggleBtnTextInactive,
            ]}
          >
            {isLive ? '● LIVE' : 'OFF'}
          </Text>
        </TouchableOpacity>

        {/* 1-Tap Heard Toggle */}
        <TouchableOpacity
          style={[
            styles.heardTouchBtn,
            isHeard ? styles.heardTouchBtnActive : styles.heardTouchBtnInactive,
          ]}
          onPress={onToggleHeard}
          activeOpacity={0.75}
          hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
        >
          <Ionicons
            name={isHeard ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={isHeard ? '#10b981' : '#cbd5e1'}
          />
        </TouchableOpacity>

        {/* Quick delete on right */}
        <TouchableOpacity
          style={styles.deleteTrackTouch}
          onPress={onRemove}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 10 }}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={15} color="#cbd5e1" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
