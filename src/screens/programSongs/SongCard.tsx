import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PraiseSong } from './types';
import { styles } from './programSongsStyles';
import { customAlert } from '../../context/AlertContext';

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

  const metaParts = [
    item.leadSinger || item.writer || null,
    item.key ? `Key ${item.key}` : null,
    item.tempo ? `${item.tempo} BPM` : null,
  ].filter(Boolean);

  const handleOpenMenu = (e?: any) => {
    e?.stopPropagation?.();
    const options: any[] = [
      {
        text: '✏️ Edit Song Details',
        onPress: onPress,
      },
      {
        text: isLive ? '⏹ End LIVE Status' : '📻 Broadcast as LIVE Active Song',
        onPress: onToggleActive,
      },
      {
        text: isHeard ? '⭕ Mark as Left (Unheard)' : '✓ Mark as Rehearsed (Heard)',
        onPress: onToggleHeard,
      },
      {
        text: '🗑️ Remove from Rehearsal Setlist',
        style: 'destructive',
        onPress: onRemove,
      },
      { text: 'Cancel', style: 'cancel' },
    ];

    customAlert(item.title || 'Rehearsal Song', 'Song Setlist Actions', options);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.trackCard,
        isLive && styles.trackCardActive,
        isHeard && styles.trackCardHeard,
      ]}
    >
      {/* Left indicator stripe for live song */}
      {isLive && <View style={styles.liveLeftStripe} />}

      {/* Left: Artwork or Clean Index Number */}
      {item.imageUrl ? (
        <Image
          source={{ uri: item.imageUrl }}
          style={styles.artworkThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.trackIndexBox, isLive && styles.trackIndexBoxLive]}>
          <Text style={[styles.trackIndexNum, isLive && styles.trackIndexNumLive]}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>
      )}

      {/* Center: Title & Clean Musical Metadata */}
      <View style={styles.trackInfoCol}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text
            style={[
              styles.trackTitleText,
              isHeard && styles.trackTitleTextHeard,
              isLive && styles.trackTitleTextLive,
            ]}
            numberOfLines={1}
          >
            {item.title || 'Untitled Song'}
          </Text>
          {isLive && (
            <View style={styles.liveBadgeSmall}>
              <View style={styles.liveDotPulse} />
              <Text style={styles.liveBadgeSmallText}>LIVE</Text>
            </View>
          )}
        </View>

        <Text
          style={[styles.trackMetaText, isHeard && styles.trackMetaTextHeard]}
          numberOfLines={1}
        >
          {metaParts.length > 0 ? metaParts.join(' • ') : 'Loveworld Singers'}
        </Text>
      </View>

      {/* Right Column: Broadcast Trigger, Heard Toggle & Action Menu */}
      <View style={styles.trackRightCol}>
        {/* 1-Tap Go LIVE (discreet broadcast icon) */}
        {!isLive && (
          <TouchableOpacity
            style={styles.setLiveTouchBtn}
            onPress={onToggleActive}
            hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
            activeOpacity={0.7}
          >
            <Ionicons name="radio-outline" size={17} color="#94a3b8" />
          </TouchableOpacity>
        )}

        {/* 1-Tap Heard / Checkmark */}
        <TouchableOpacity
          style={styles.heardTouchBtn}
          onPress={onToggleHeard}
          activeOpacity={0.65}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
        >
          <Ionicons
            name={isHeard ? 'checkmark-circle' : 'ellipse-outline'}
            size={22}
            color={isHeard ? '#10b981' : '#cbd5e1'}
          />
        </TouchableOpacity>

        {/* 3-Dots Action Menu */}
        <TouchableOpacity
          style={styles.menuTouchBtn}
          onPress={handleOpenMenu}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 8 }}
        >
          <Ionicons name="ellipsis-vertical" size={15} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}
