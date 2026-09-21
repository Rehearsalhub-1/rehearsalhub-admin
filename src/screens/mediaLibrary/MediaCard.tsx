import React from 'react';
import { View, Text, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaItem } from './types';
import { styles } from './mediaLibraryStyles';
import { formatFileSize, formatDate } from './mediaLibraryUtils';

interface MediaCardProps {
  item: MediaItem;
  isCurrentActive: boolean;
  isCurrentPlaying: boolean;
  isBuffering: boolean;
  isSelected: boolean;
  isSelectMode: boolean;
  onToggleSelect: (id: string) => void;
  onOpenMedia: (item: MediaItem) => void;
  onTogglePlay: (item: MediaItem) => void;
  onOpenRename: (item: MediaItem) => void;
  onShare: (item: MediaItem) => void;
  onDelete: (item: MediaItem) => void;
}

export default function MediaCard({
  item,
  isCurrentActive,
  isCurrentPlaying,
  isBuffering,
  isSelected,
  isSelectMode,
  onToggleSelect,
  onOpenMedia,
  onTogglePlay,
  onOpenRename,
  onShare,
  onDelete,
}: MediaCardProps) {
  const isAudio = item.type === 'audio';
  const isVideo = item.type === 'video';
  const isImage = item.type === 'image';
  const isDoc = item.type === 'document';

  const categoryLabel = isAudio
    ? 'Audio Stem'
    : isVideo
    ? 'Rehearsal Video'
    : isImage
    ? 'Photo & Image'
    : 'Sheet Music';

  return (
    <View
      style={[
        styles.card,
        isCurrentActive && styles.cardActiveAudio,
        isSelected && styles.cardSelected,
      ]}
    >
      <View style={styles.cardMainRow}>
        {/* Checkbox in Select Mode */}
        {isSelectMode ? (
          <TouchableOpacity
            style={styles.checkboxTouch}
            onPress={() => onToggleSelect(item.id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={22}
              color={isSelected ? '#7c3aed' : '#94a3b8'}
            />
          </TouchableOpacity>
        ) : null}

        {/* Leading Icon / Thumbnail */}
        {isVideo && item.thumbnail ? (
          <TouchableOpacity
            style={styles.mediaThumbBox}
            activeOpacity={0.85}
            onPress={() => onOpenMedia(item)}
          >
            <Image source={{ uri: item.thumbnail }} style={styles.mediaThumb} />
            <View style={styles.playOverlay}>
              <Ionicons name="play" size={16} color="#ffffff" style={{ marginLeft: 2 }} />
            </View>
          </TouchableOpacity>
        ) : isImage && (item.thumbnail || item.url) ? (
          <TouchableOpacity
            style={styles.mediaThumbBox}
            activeOpacity={0.85}
            onPress={() => onOpenMedia(item)}
          >
            <Image source={{ uri: item.thumbnail || item.url }} style={styles.mediaThumb} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.iconBadge,
              isAudio && styles.iconAudio,
              isVideo && styles.iconVideo,
              isImage && styles.iconImage,
              isDoc && styles.iconDoc,
            ]}
            onPress={() => onOpenMedia(item)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={
                isAudio
                  ? 'musical-note'
                  : isVideo
                  ? 'videocam'
                  : isImage
                  ? 'image'
                  : 'document-text'
              }
              size={22}
              color={
                isAudio
                  ? '#7c3aed'
                  : isVideo
                  ? '#2563eb'
                  : isImage
                  ? '#db2777'
                  : '#059669'
              }
            />
          </TouchableOpacity>
        )}

        {/* Details */}
        <TouchableOpacity
          style={styles.cardInfo}
          activeOpacity={0.75}
          onPress={() => onOpenMedia(item)}
        >
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.metaRow}>
            <Text
              style={[
                styles.categoryPillText,
                isImage && { color: '#db2777' },
                isDoc && { color: '#059669' },
                isVideo && { color: '#2563eb' },
              ]}
            >
              {categoryLabel}
            </Text>
            {item.size ? (
              <>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.metaSubText}>{formatFileSize(item.size)}</Text>
              </>
            ) : null}
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaSubText}>{formatDate(item.uploadedAt)}</Text>
          </View>

          {item.description ? (
            <Text style={styles.itemDesc} numberOfLines={1}>
              {item.description}
            </Text>
          ) : null}
        </TouchableOpacity>

        {/* Primary Action Button */}
        {!isSelectMode ? (
          isAudio ? (
            <TouchableOpacity
              style={[styles.primaryActionBtn, isCurrentPlaying && styles.primaryActionBtnActive]}
              onPress={() => onTogglePlay(item)}
              activeOpacity={0.8}
            >
              {isCurrentActive && isBuffering ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Ionicons
                  name={isCurrentPlaying ? 'pause' : 'play'}
                  size={16}
                  color="#ffffff"
                  style={!isCurrentPlaying ? { marginLeft: 2 } : undefined}
                />
              )}
              <Text style={styles.primaryActionText}>
                {isCurrentPlaying ? 'Pause' : 'Play'}
              </Text>
            </TouchableOpacity>
          ) : isImage ? (
            <TouchableOpacity
              style={[styles.viewActionBtn, { backgroundColor: '#fdf2f8', borderColor: '#fbcfe8' }]}
              onPress={() => onOpenMedia(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="eye-outline" size={15} color="#db2777" style={{ marginRight: 4 }} />
              <Text style={[styles.viewActionText, { color: '#db2777' }]}>Photo</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.viewActionBtn}
              onPress={() => onOpenMedia(item)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isVideo ? 'play-outline' : 'document-outline'}
                size={15}
                color="#7c3aed"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.viewActionText}>
                {isVideo ? 'Watch' : 'Score'}
              </Text>
            </TouchableOpacity>
          )
        ) : null}
      </View>

      {/* Bottom Utility Row */}
      <View style={styles.cardBottomRow}>
        <Text style={styles.zoneTag}>
          {item.forHq ? '⭐ Global HQ Catalog' : '📍 Local Repertoire'}
        </Text>

        <View style={styles.utilityBtns}>
          {/* Rename Button */}
          <TouchableOpacity
            style={styles.utilBtn}
            onPress={() => onOpenRename(item)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="pencil-outline" size={14} color="#7c3aed" />
            <Text style={[styles.utilBtnText, { color: '#7c3aed' }]}>Rename</Text>
          </TouchableOpacity>

          {/* Share Button */}
          <TouchableOpacity
            style={styles.utilBtn}
            onPress={() => onShare(item)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="share-outline" size={15} color="#64748b" />
            <Text style={styles.utilBtnText}>Share</Text>
          </TouchableOpacity>

          {/* Delete Button */}
          <TouchableOpacity
            style={styles.utilBtn}
            onPress={() => onDelete(item)}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={15} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
