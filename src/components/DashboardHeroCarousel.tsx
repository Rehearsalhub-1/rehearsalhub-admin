import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useZoneContext } from '../context/ZoneContext';

interface SlideItem {
  id: string;
  image: any;
  tag: string;
  tagBg: string;
  tagColor: string;
  tagBorder: string;
  title: string;
  subtitle: string;
  actionText: string;
  iconName: keyof typeof Ionicons.glyphMap;
  route: string;
  params?: any;
}

const SLIDES: SlideItem[] = [
  {
    id: 'slide-programs',
    image: require('../../assets/banners/banner1.jpg'),
    tag: 'PROGRAMS & SETS',
    tagBg: 'rgba(124, 58, 237, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(196, 181, 253, 0.5)',
    title: 'Rehearsal Programs & Sets',
    subtitle: 'Manage running orders, vocal keys & setlists',
    actionText: 'Programs',
    iconName: 'musical-notes',
    route: 'Programs',
  },
  {
    id: 'slide-submissions',
    image: require('../../assets/banners/banner8.jpg'),
    tag: 'SONG SUBMISSIONS',
    tagBg: 'rgba(225, 29, 72, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(253, 164, 175, 0.5)',
    title: 'Singer Submissions Desk',
    subtitle: 'Review member audio demos & approve into library',
    actionText: 'Submissions',
    iconName: 'cloud-upload-outline',
    route: 'SubmittedSongs',
  },
  {
    id: 'slide-master',
    image: require('../../assets/banners/banner2.jpg'),
    tag: 'VOCAL REPERTOIRE',
    tagBg: 'rgba(16, 185, 129, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(110, 231, 183, 0.5)',
    title: 'All Ministered Catalog',
    subtitle: 'Master songs, lead arrangements & solfa notes',
    actionText: 'Repertoire',
    iconName: 'library-outline',
    route: 'MasterLibrary',
  },
  {
    id: 'slide-attendance',
    image: require('../../assets/banners/banner5.png'),
    tag: 'ATTENDANCE CLOCK-IN',
    tagBg: 'rgba(5, 150, 105, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(52, 211, 153, 0.5)',
    title: 'Session Passcodes & QR',
    subtitle: 'Generate clock-in codes, track singer arrivals live',
    actionText: 'Attendance',
    iconName: 'calendar-number-outline',
    route: 'Attendance',
  },
  {
    id: 'slide-churches',
    image: require('../../assets/banners/banner6.png'),
    tag: 'CHURCHES & CHAPTERS',
    tagBg: 'rgba(2, 132, 199, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(56, 189, 248, 0.5)',
    title: 'Assemblies & Subgroups',
    subtitle: 'Approve new churches, assign coordinators & rosters',
    actionText: 'Churches',
    iconName: 'business-outline',
    route: 'Churches',
  },
  {
    id: 'slide-schedule',
    image: require('../../assets/banners/banner3.jpg'),
    tag: 'WEEKLY SCHEDULE',
    tagBg: 'rgba(217, 119, 6, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(251, 191, 36, 0.5)',
    title: 'Schedule Manager',
    subtitle: 'Weekly choir rehearsal plans & setlist milestones',
    actionText: 'Schedule',
    iconName: 'list-outline',
    route: 'Schedule',
  },
  {
    id: 'slide-media',
    image: require('../../assets/banners/banner7.webp'),
    tag: 'MEDIA ASSETS',
    tagBg: 'rgba(37, 99, 235, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(96, 165, 250, 0.5)',
    title: 'Rehearsal Media Hub',
    subtitle: 'Practice videos, isolated audio stems & lead sheets',
    actionText: 'Media Assets',
    iconName: 'folder-open-outline',
    route: 'MediaLibrary',
  },
  {
    id: 'slide-members',
    image: require('../../assets/banners/banner4.jpg'),
    tag: 'CHOIR ROSTER',
    tagBg: 'rgba(79, 70, 229, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(129, 140, 248, 0.5)',
    title: 'Global Singer Directory',
    subtitle: 'Soprano, Alto, Tenor & Bass singers across chapters',
    actionText: 'Directory',
    iconName: 'people-outline',
    route: 'Members',
  },
  {
    id: 'slide-notifications',
    image: require('../../assets/banners/banner8.jpg'),
    tag: 'ANNOUNCEMENTS',
    tagBg: 'rgba(217, 119, 6, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(252, 211, 77, 0.5)',
    title: 'Broadcast Push Alerts',
    subtitle: 'Send instant rehearsal notices to choir members',
    actionText: 'Broadcast',
    iconName: 'notifications-outline',
    route: 'Notifications',
  },
  {
    id: 'slide-calendar',
    image: require('../../assets/banners/banner9.jpg'),
    tag: 'EVENTS CALENDAR',
    tagBg: 'rgba(37, 99, 235, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(147, 197, 253, 0.5)',
    title: 'Rehearsal Calendar',
    subtitle: 'Scheduled sessions, programs & vocal deadlines',
    actionText: 'Calendar',
    iconName: 'calendar-outline',
    route: 'Calendar',
  },
  {
    id: 'slide-categories',
    image: require('../../assets/banners/banner2.jpg'),
    tag: 'CLASSIFICATIONS',
    tagBg: 'rgba(16, 185, 129, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(110, 231, 183, 0.5)',
    title: 'Categories & Tags',
    subtitle: 'Organize worship anthems by themes, seasons & keys',
    actionText: 'Categories',
    iconName: 'pricetags-outline',
    route: 'Categories',
  },
  {
    id: 'slide-analytics',
    image: require('../../assets/banners/banner3.jpg'),
    tag: 'ANALYTICS & METRICS',
    tagBg: 'rgba(5, 150, 105, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(52, 211, 153, 0.5)',
    title: 'Attendance & Song Trends',
    subtitle: 'Weekly turnout rates, top songs & ministry KPIs',
    actionText: 'Analytics',
    iconName: 'bar-chart-outline',
    route: 'Analytics',
  },
  {
    id: 'slide-support',
    image: require('../../assets/banners/banner4.jpg'),
    tag: 'SUPPORT DESK',
    tagBg: 'rgba(219, 39, 119, 0.9)',
    tagColor: '#ffffff',
    tagBorder: 'rgba(244, 114, 182, 0.5)',
    title: 'Singer Support Desk',
    subtitle: 'Direct member inquiries, questions & feedback',
    actionText: 'Support',
    iconName: 'chatbubbles-outline',
    route: 'SupportChat',
  },
];

export default function DashboardHeroCarousel() {
  const navigation = useNavigation<any>();
  const { isChurchMode, activeChurch } = useZoneContext();
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const isInteracting = useRef(false);

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = screenWidth - 32; // 16px padding on both sides

  const slides = React.useMemo(() => {
    if (isChurchMode) {
      return SLIDES.filter(s => 
        !['slide-submissions', 'slide-churches', 'slide-categories', 'slide-analytics', 'slide-logs'].includes(s.id)
      ).map(s => {
        if (s.id === 'slide-programs') {
          return {
            ...s,
            title: `${activeChurch?.name || 'Church'} Programs`,
            subtitle: 'Manage local rehearsal setlists & running orders',
          };
        }
        return s;
      });
    }
    return SLIDES;
  }, [isChurchMode, activeChurch?.name]);

  useEffect(() => {
    if (activeIndex >= slides.length) {
      setActiveIndex(0);
    }
  }, [slides.length, activeIndex]);

  // Auto-scroll every 4.2 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (isInteracting.current || slides.length === 0) return;
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % slides.length;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        return nextIndex;
      });
    }, 4200);

    return () => clearInterval(timer);
  }, [slides.length]);

  function onMomentumScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / cardWidth);
    if (index >= 0 && index < slides.length) {
      setActiveIndex(index);
    }
    isInteracting.current = false;
  }

  function handlePress(slide: SlideItem) {
    if (slide.route) {
      navigation.navigate(slide.route, slide.params);
    }
  }

  const currentSlide = slides[activeIndex] || slides[0] || SLIDES[0];

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth}
        snapToAlignment="center"
        decelerationRate="fast"
        onScrollBeginDrag={() => {
          isInteracting.current = true;
        }}
        onMomentumScrollEnd={onMomentumScrollEnd}
        getItemLayout={(_, index) => ({
          length: cardWidth,
          offset: cardWidth * index,
          index,
        })}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, { width: cardWidth }]}
            activeOpacity={0.92}
            onPress={() => handlePress(item)}
          >
            {/* Background Image */}
            <Image
              source={item.image}
              style={styles.image}
              resizeMode="cover"
            />

            {/* Gradient Vignette for Readability */}
            <LinearGradient
              colors={['rgba(15, 23, 42, 0.15)', 'rgba(15, 23, 42, 0.72)', 'rgba(15, 23, 42, 0.94)']}
              locations={[0, 0.52, 1]}
              style={StyleSheet.absoluteFill}
            />

            {/* Content Container */}
            <View style={styles.content}>
              {/* Top Tag & Slide Counter Pill */}
              <View style={styles.topRow}>
                <View
                  style={[
                    styles.tagBadge,
                    {
                      backgroundColor: item.tagBg,
                      borderColor: item.tagBorder,
                    },
                  ]}
                >
                  <Text style={[styles.tagText, { color: item.tagColor }]}>
                    {item.tag}
                  </Text>
                </View>

                <View style={styles.counterBadge}>
                  <Text style={styles.counterText}>
                    {activeIndex + 1} / {slides.length}
                  </Text>
                </View>
              </View>

              {/* Bottom Details & Action */}
              <View style={styles.bottomRow}>
                <View style={styles.textColumn}>
                  <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={1}>
                    {item.subtitle}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handlePress(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={item.iconName} size={13} color="#0f172a" style={{ marginRight: 4 }} />
                  <Text style={styles.actionBtnText}>{item.actionText}</Text>
                  <Ionicons name="chevron-forward" size={11} color="#0f172a" style={{ marginLeft: 2 }} />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      {/* Pagination Strip */}
      <View style={styles.paginationStrip}>
        <Text style={styles.paginationHint} numberOfLines={1}>
          Featured Module: <Text style={{ color: '#7c3aed', fontWeight: '700' }}>{currentSlide?.tag || ''}</Text>
        </Text>

        <View style={styles.dotsRow}>
          {slides.map((_, idx) => {
            const isActive = idx === activeIndex;
            return (
              <View
                key={idx}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 12,
  },
  card: {
    height: 155,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    position: 'relative',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 3,
  },
  image: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
  },
  content: {
    ...StyleSheet.absoluteFill,
    padding: 14,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  counterBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  counterText: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 10,
    fontWeight: '700',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 10,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    color: '#ffffff',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    lineHeight: 14,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 9,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  actionBtnText: {
    color: '#0f172a',
    fontSize: 11,
    fontWeight: '700',
  },
  paginationStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
    paddingHorizontal: 2,
  },
  paginationHint: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3.5,
  },
  dot: {
    height: 3.5,
    borderRadius: 2,
  },
  dotActive: {
    width: 12,
    backgroundColor: '#7c3aed',
  },
  dotInactive: {
    width: 3.5,
    backgroundColor: '#cbd5e1',
  },
});
