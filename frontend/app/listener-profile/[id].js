import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, Animated, ActivityIndicator, Modal } from 'react-native';
import { Skeleton } from '../../components/admin/Skeleton';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, useEffect, useState } from 'react';
import { listenersAPI, userAPI } from '../../utils/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SW, height: SH } = Dimensions.get('window');

const getAvatarImage = (gender, index) => {
  const parsedIndex = parseInt(index, 10) || 0;
  if (gender === 'Male') {
    const m = [
      require('../../images/male_avatar_1_1776972918440.png'),
      require('../../images/male_avatar_2_1776972933241.png'),
      require('../../images/male_avatar_3_1776972950218.png'),
      require('../../images/male_avatar_4_1776972963577.png'),
      require('../../images/male_avatar_5_1776972978900.png'),
      require('../../images/male_avatar_6_1776972993180.png'),
      require('../../images/male_avatar_7_1776973008143.png'),
      require('../../images/male_avatar_8_1776973021635.png'),
    ];
    return m[parsedIndex] || m[0];
  }
  const f = [
    require('../../images/female_avatar_1_1776973035859.png'),
    require('../../images/female_avatar_2_1776973050039.png'),
    require('../../images/female_avatar_3_1776973063471.png'),
    require('../../images/female_avatar_4_1776973077539.png'),
    require('../../images/female_avatar_5_1776973090730.png'),
    require('../../images/female_avatar_6_1776973108100.png'),
    require('../../images/female_avatar_7_1776973124018.png'),
    require('../../images/female_avatar_8_1776973138772.png'),
  ];
  return f[parsedIndex] || f[0];
};

export default function ListenerProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFavourite, setIsFavourite] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [viewerVisible, setViewerVisible] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const avatarScale = useRef(new Animated.Value(0.7)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const actionsAnim = useRef(new Animated.Value(0)).current;
  const coverOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await listenersAPI.getPublicProfile(id);
      setProfile(res.data);

      // Check if listener is in user's favourites
      try {
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const user = JSON.parse(userData);
          const favs = user.favouriteListeners || [];
          setIsFavourite(favs.includes(id));
        }
      } catch (e) {
        // If that fails, try fetching from API
        try {
          const favRes = await userAPI.getFavourites();
          const favIds = (favRes.data || []).map(f => f._id || f.userId?._id || f);
          setIsFavourite(favIds.includes(id));
        } catch (_) {}
      }

      runEntryAnimation();
    } catch (err) {
      console.error('Failed to fetch listener profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const runEntryAnimation = () => {
    Animated.parallel([
      Animated.timing(coverOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(avatarScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }),
    ]).start(() => {
      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 60, useNativeDriver: true }),
        ]),
        Animated.timing(statsAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.timing(actionsAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleToggleFavourite = async () => {
    setIsFavourite(!isFavourite);
    try {
      await userAPI.toggleFavourite(id);
    } catch (err) {
      setIsFavourite(isFavourite); // revert
      console.error('Toggle favourite failed:', err);
    }
  };

  const openViewer = (image) => {
    setSelectedImage(image);
    setViewerVisible(true);
  };

  const ImageViewerModal = () => (
    <Modal
      visible={viewerVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setViewerVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity 
          style={styles.modalCloseBtn} 
          onPress={() => setViewerVisible(false)}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={32} color="#fff" />
        </TouchableOpacity>
        
        {selectedImage && (
          <Image 
            source={typeof selectedImage === 'string' ? { uri: selectedImage } : selectedImage} 
            style={styles.fullImage}
            resizeMode="contain"
          />
        )}
      </View>
    </Modal>
  );

  if (loading) {
    return <ProfileViewSkeleton insets={insets} />;
  }

  if (!profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={48} color="#6B7280" />
        <Text style={styles.loadingText}>Profile not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#8B5CF6', fontFamily: 'Inter_700Bold' }}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const pub = profile.publicProfile || {};
  const avatarSource = pub.profileImage || profile.profileImage
    ? { uri: pub.profileImage || profile.profileImage }
    : getAvatarImage(profile.gender, profile.avatarIndex);
  const coverImage = pub.coverImage || null;
  const gradientColors = profile.gradientColors?.length >= 2
    ? profile.gradientColors
    : ['#7C3AED', '#6D28D9', '#4C1D95'];
  const tags = pub.expertiseTags || [];
  const languages = pub.languages || ['English'];
  const galleryImages = pub.galleryImages || [];
  const hookline = pub.hookline || '';
  const aboutMe = pub.aboutMe || '';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ImageViewerModal />
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={SW * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listener Profile</Text>
        <TouchableOpacity style={styles.heartBtn} activeOpacity={0.7} onPress={handleToggleFavourite}>
          <Ionicons name={isFavourite ? "heart" : "heart-outline"} size={SW * 0.06} color={isFavourite ? "#EF4444" : "#fff"} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Animated.View style={[styles.heroSection, { opacity: headerOpacity }]}>
          {coverImage ? (
            <Animated.View style={{ opacity: coverOpacity }}>
              <TouchableOpacity onPress={() => openViewer(coverImage)} activeOpacity={0.9}>
                <Image source={{ uri: coverImage }} style={styles.coverPhoto} />
                <LinearGradient
                  colors={['transparent', 'rgba(0,0,0,0.7)']}
                  style={styles.coverOverlay}
                />
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <LinearGradient
              colors={gradientColors.length >= 3 ? gradientColors : [...gradientColors, gradientColors[1]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.coverGradient}
            >
              <View style={styles.decoCircle1} />
              <View style={styles.decoCircle2} />
              <View style={styles.decoCircle3} />
            </LinearGradient>
          )}

          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarScale }] }]}>
            <TouchableOpacity onPress={() => openViewer(avatarSource)} activeOpacity={0.9}>
              <LinearGradient
                colors={['#8B5CF6', '#EC4899', '#F59E0B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarGradientBorder}
              >
                <Image source={avatarSource} style={styles.avatar} />
              </LinearGradient>
            </TouchableOpacity>
            {profile.isOnline && (
              <View style={[styles.onlineIndicator, profile.isBusy && { backgroundColor: '#EF4444' }]}>
                <View style={[styles.onlineDot, profile.isBusy && { backgroundColor: '#fff' }]} />
              </View>
            )}
          </Animated.View>

          <View style={styles.nameRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: SW * 0.015 }}>
              <Text style={styles.name}>{profile.displayName || profile.name || 'Listener'}</Text>
              {profile.isBusy && (
                <View style={{ backgroundColor: 'rgba(239, 68, 68, 0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                  <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: 'bold' }}>BUSY</Text>
                </View>
              )}
            </View>
            {profile.verified && (
              <View style={styles.verifiedBadge}>
                <View style={styles.verifiedBadgeBg} />
                <MaterialIcons name="verified" size={SW * 0.055} color="#38BDF8" />
              </View>
            )}
          </View>

          <View style={styles.ratingRow}>
            <Ionicons name="star" size={SW * 0.04} color="#F59E0B" />
            <Text style={styles.ratingText}>{profile.rating || 0}</Text>
            <Text style={styles.reviewsText}>({profile.totalSessions || 0} sessions)</Text>
          </View>
        </Animated.View>

        {/* Animated Content */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>


          {/* Hookline */}
          {hookline ? (
            <View style={styles.hooklineCard}>
              <LinearGradient
                colors={['rgba(139,92,246,0.12)', 'rgba(236,72,153,0.08)', 'rgba(0,0,0,0)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hooklineGradient}
              >
                <Text style={styles.hookline}>"{hookline}"</Text>
              </LinearGradient>
            </View>
          ) : null}

          {/* Stats Row */}
          <Animated.View style={[styles.statsRow, { opacity: statsAnim }]}>
            <View style={styles.statItem}>
              <LinearGradient colors={['rgba(34,197,94,0.15)', 'rgba(34,197,94,0.05)']} style={styles.statIconBg}>
                <Ionicons name="headset" size={SW * 0.05} color="#22C55E" />
              </LinearGradient>
              <Text style={styles.statValue}>{profile.totalSessions || 0}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient colors={['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.05)']} style={styles.statIconBg}>
                <Ionicons name="star" size={SW * 0.05} color="#F59E0B" />
              </LinearGradient>
              <Text style={styles.statValue}>{profile.rating || 0}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient colors={['rgba(139,92,246,0.15)', 'rgba(139,92,246,0.05)']} style={styles.statIconBg}>
                <Ionicons name="shield-checkmark" size={SW * 0.05} color="#8B5CF6" />
              </LinearGradient>
              <Text style={styles.statValue}>{profile.verified ? 'Yes' : 'No'}</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </View>
          </Animated.View>

          {/* Action Buttons */}
          <Animated.View style={[styles.actionRow, { opacity: actionsAnim }]}>
            {profile.audioEnabled !== false && (
              <TouchableOpacity 
                style={[styles.actionBtnWrapper, profile.isBusy && { opacity: 0.5 }]} 
                activeOpacity={0.85}
                disabled={profile.isBusy}
                onPress={() => router.push({
                  pathname: '/(call)/connecting',
                  params: {
                    name: profile.displayName || profile.name || 'Listener',
                    callType: 'audio',
                    callId: `call_${Date.now()}`,
                    roomId: `room_${Date.now()}`,
                    listenerId: id,
                    avatarIndex: profile.avatarIndex || '0',
                    gender: profile.gender || 'Female'
                  }
                })}
              >
                <LinearGradient colors={['#22C55E', '#16A34A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
                  <Ionicons name="call" size={SW * 0.05} color="#fff" />
                  <Text style={styles.actionBtnText}>Voice</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            {profile.videoEnabled === true && (
              <TouchableOpacity 
                style={[styles.actionBtnWrapper, profile.isBusy && { opacity: 0.5 }]} 
                activeOpacity={0.85}
                disabled={profile.isBusy}
                onPress={() => router.push({
                  pathname: '/(call)/connecting',
                  params: {
                    name: profile.displayName || profile.name || 'Listener',
                    callType: 'video',
                    callId: `call_${Date.now()}`,
                    roomId: `room_${Date.now()}`,
                    listenerId: id,
                    avatarIndex: profile.avatarIndex || '0',
                    gender: profile.gender || 'Female'
                  }
                })}
              >
                <LinearGradient colors={['#3B82F6', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
                  <Ionicons name="videocam" size={SW * 0.05} color="#fff" />
                  <Text style={styles.actionBtnText}>Video</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            {profile.chatEnabled !== false && (
              <TouchableOpacity 
                style={[styles.actionBtnWrapper, profile.isBusy && { opacity: 0.5 }]} 
                activeOpacity={0.85}
                disabled={profile.isBusy}
                onPress={() => router.push({
                  pathname: '/(chat)/chat',
                  params: {
                    name: profile.displayName || profile.name || 'Listener',
                    id: id,
                    avatarIndex: profile.avatarIndex || '0',
                    gender: profile.gender || 'Female'
                  }
                })}
              >
                <LinearGradient colors={['#EC4899', '#DB2777']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.actionBtn}>
                  <Ionicons name="chatbubble" size={SW * 0.045} color="#fff" />
                  <Text style={styles.actionBtnText}>Chat</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Gallery */}
          {galleryImages.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="images" size={SW * 0.045} color="#F59E0B" />
                <Text style={styles.sectionTitle}>Gallery</Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                {galleryImages.map((img, idx) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.galleryImageWrapper}
                    onPress={() => openViewer(img)}
                    activeOpacity={0.9}
                  >
                    <Image source={{ uri: img }} style={styles.galleryImage} />
                    <LinearGradient colors={['transparent', 'rgba(0,0,0,0.4)']} style={styles.galleryOverlay} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Expertise Tags */}
          {tags.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pricetag" size={SW * 0.045} color="#8B5CF6" />
                <Text style={styles.sectionTitle}>Expertise</Text>
              </View>
              <View style={styles.tagsContainer}>
                {tags.map((tag, idx) => (
                  <View key={idx} style={styles.tagWrapper}>
                    <LinearGradient
                      colors={['rgba(139,92,246,0.2)', 'rgba(236,72,153,0.1)']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={styles.tag}
                    >
                      <Text style={styles.tagText}>{tag}</Text>
                    </LinearGradient>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Languages */}
          {languages.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="globe" size={SW * 0.045} color="#3B82F6" />
                <Text style={styles.sectionTitle}>Languages</Text>
              </View>
              <View style={styles.languagesRow}>
                {languages.map((lang, idx) => (
                  <View key={idx} style={styles.languageChip}>
                    <Text style={styles.languageText}>{lang}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* About Me */}
          {aboutMe ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="person" size={SW * 0.045} color="#22C55E" />
                <Text style={styles.sectionTitle}>About Me</Text>
              </View>
              <View style={styles.aboutCard}>
                <Text style={styles.aboutText}>{aboutMe}</Text>
              </View>
            </View>
          ) : null}

          <View style={{ height: SH * 0.05 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9CA3AF', fontSize: SW * 0.035, marginTop: 12, fontFamily: 'Inter_400Regular' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: '4%', paddingVertical: SH * 0.015,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: SW * 0.1, height: SW * 0.1, borderRadius: SW * 0.05,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  heartBtn: {
    width: SW * 0.1, height: SW * 0.1, borderRadius: SW * 0.05,
    backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: SW * 0.045, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 0.3 },
  scrollContent: { paddingBottom: SH * 0.03 },

  heroSection: { alignItems: 'center', marginBottom: SH * 0.01 },
  coverGradient: { width: '100%', height: SH * 0.18, overflow: 'hidden' },
  coverPhoto: { width: '100%', height: SH * 0.18 },
  coverOverlay: { ...StyleSheet.absoluteFillObject },
  decoCircle1: {
    position: 'absolute', width: SW * 0.4, height: SW * 0.4, borderRadius: SW * 0.2,
    backgroundColor: 'rgba(255,255,255,0.06)', top: -SW * 0.15, right: -SW * 0.1,
  },
  decoCircle2: {
    position: 'absolute', width: SW * 0.25, height: SW * 0.25, borderRadius: SW * 0.125,
    backgroundColor: 'rgba(255,255,255,0.04)', bottom: -SW * 0.08, left: -SW * 0.05,
  },
  decoCircle3: {
    position: 'absolute', width: SW * 0.15, height: SW * 0.15, borderRadius: SW * 0.075,
    backgroundColor: 'rgba(236,72,153,0.15)', top: SH * 0.04, left: SW * 0.3,
  },

  avatarContainer: { marginTop: -(SW * 0.14), alignItems: 'center' },
  avatarGradientBorder: {
    width: SW * 0.28, height: SW * 0.28, borderRadius: SW * 0.14,
    alignItems: 'center', justifyContent: 'center', padding: SW * 0.008,
  },
  avatar: { width: '100%', height: '100%', borderRadius: SW * 0.14, borderWidth: 3, borderColor: '#000' },
  onlineIndicator: {
    position: 'absolute', bottom: SW * 0.01, right: SW * 0.02,
    width: SW * 0.055, height: SW * 0.055, borderRadius: SW * 0.0275,
    backgroundColor: '#000', alignItems: 'center', justifyContent: 'center',
  },
  onlineDot: { width: SW * 0.035, height: SW * 0.035, borderRadius: SW * 0.0175, backgroundColor: '#22C55E' },

  nameRow: { flexDirection: 'row', alignItems: 'center', marginTop: SH * 0.012, gap: SW * 0.015 },
  name: { color: '#fff', fontSize: SW * 0.06, fontWeight: '800', fontFamily: 'Inter_900Black', letterSpacing: -0.5 },
  verifiedBadge: { justifyContent: 'center', alignItems: 'center' },
  verifiedBadgeBg: { position: 'absolute', width: SW * 0.025, height: SW * 0.025, backgroundColor: '#fff', borderRadius: SW * 0.0125 },

  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: SH * 0.006, gap: SW * 0.012 },
  ratingText: { color: '#F59E0B', fontSize: SW * 0.04, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  reviewsText: { color: '#6B7280', fontSize: SW * 0.034, fontFamily: 'Inter_400Regular' },

  hooklineCard: {
    marginHorizontal: '5%', marginTop: SH * 0.02, borderRadius: SW * 0.04,
    overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(139,92,246,0.15)',
  },
  hooklineGradient: { paddingVertical: SH * 0.022, paddingHorizontal: '5%', alignItems: 'center' },
  hooklineIcon: { marginBottom: SH * 0.008 },
  hookline: { color: '#D1D5DB', fontSize: SW * 0.038, fontStyle: 'italic', textAlign: 'center', lineHeight: SW * 0.058, fontFamily: 'Inter_400Regular' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly',
    marginHorizontal: '5%', marginTop: SH * 0.025,
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: SW * 0.04,
    paddingVertical: SH * 0.02, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statIconBg: {
    width: SW * 0.1, height: SW * 0.1, borderRadius: SW * 0.05,
    alignItems: 'center', justifyContent: 'center', marginBottom: SH * 0.008,
  },
  statValue: { color: '#fff', fontSize: SW * 0.045, fontWeight: '800', fontFamily: 'Inter_700Bold' },
  statLabel: { color: '#6B7280', fontSize: SW * 0.028, fontFamily: 'Inter_400Regular', marginTop: SH * 0.002 },
  statDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.08)' },

  actionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: '5%', marginTop: SH * 0.025, gap: SW * 0.025 },
  actionBtnWrapper: { flex: 1, borderRadius: SW * 0.04, overflow: 'hidden' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SH * 0.018, gap: SW * 0.015, borderRadius: SW * 0.04 },
  actionBtnText: { color: '#fff', fontSize: SW * 0.035, fontWeight: '700', fontFamily: 'Inter_700Bold' },

  section: { paddingHorizontal: '5%', marginTop: SH * 0.03 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SW * 0.02, marginBottom: SH * 0.015 },
  sectionTitle: { color: '#fff', fontSize: SW * 0.043, fontWeight: '700', fontFamily: 'Inter_700Bold', letterSpacing: 0.2 },

  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: SW * 0.022 },
  tagWrapper: { borderRadius: SW * 0.05, overflow: 'hidden' },
  tag: { paddingVertical: SH * 0.01, paddingHorizontal: SW * 0.045, borderRadius: SW * 0.05, borderWidth: 1, borderColor: 'rgba(139,92,246,0.25)' },
  tagText: { color: '#C4B5FD', fontSize: SW * 0.033, fontFamily: 'Inter_500Medium', fontWeight: '500' },

  languagesRow: { flexDirection: 'row', gap: SW * 0.025 },
  languageChip: { backgroundColor: 'rgba(59,130,246,0.12)', paddingVertical: SH * 0.01, paddingHorizontal: SW * 0.045, borderRadius: SW * 0.05, borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)' },
  languageText: { color: '#93C5FD', fontSize: SW * 0.033, fontFamily: 'Inter_500Medium', fontWeight: '500' },

  aboutCard: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: SW * 0.04, padding: '4.5%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  aboutText: { color: '#9CA3AF', fontSize: SW * 0.036, lineHeight: SW * 0.058, fontFamily: 'Inter_400Regular' },

  galleryScroll: { paddingRight: '5%' },
  galleryImageWrapper: { width: SW * 0.6, height: SW * 0.38, borderRadius: SW * 0.04, overflow: 'hidden', marginRight: SW * 0.03, backgroundColor: '#111' },
  galleryImage: { width: '100%', height: '100%' },
  galleryOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 25,
  },
  fullImage: {
    width: SW,
    height: SH * 0.8,
  },
});

const ProfileViewSkeleton = ({ insets }) => (
  <View style={[styles.container, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      <Skeleton width={SW * 0.1} height={SW * 0.1} borderRadius={SW * 0.05} />
      <Skeleton width={150} height={20} borderRadius={4} />
      <Skeleton width={SW * 0.1} height={SW * 0.1} borderRadius={SW * 0.05} />
    </View>

    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Hero Skeleton */}
      <Skeleton width="100%" height={SH * 0.16} borderRadius={0} />
      <View style={{ alignItems: 'center', marginTop: -(SW * 0.14) }}>
        <Skeleton width={SW * 0.28} height={SW * 0.28} borderRadius={SW * 0.14} />
        <Skeleton width={180} height={24} borderRadius={4} style={{ marginTop: 16 }} />
        <Skeleton width={120} height={16} borderRadius={4} style={{ marginTop: 8 }} />
      </View>

      {/* Stats Skeleton */}
      <View style={[styles.statsRow, { borderStyle: 'solid' }]}>
        {[1, 2, 3].map((i) => (
          <View key={i} style={{ alignItems: 'center', flex: 1 }}>
            <Skeleton width={SW * 0.1} height={SW * 0.1} borderRadius={SW * 0.05} style={{ marginBottom: 8 }} />
            <Skeleton width={40} height={14} borderRadius={4} />
          </View>
        ))}
      </View>

      {/* Action Buttons Skeleton */}
      <View style={styles.actionRow}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} width="31%" height={50} borderRadius={12} />
        ))}
      </View>

      {/* Section Skeletons */}
      {[1, 2].map((i) => (
        <View key={i} style={styles.section}>
          <Skeleton width={120} height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} width={SW * 0.22} height={35} borderRadius={20} />
            ))}
          </View>
        </View>
      ))}

      {/* About Skeleton */}
      <View style={styles.section}>
        <Skeleton width={120} height={18} borderRadius={4} style={{ marginBottom: 12 }} />
        <Skeleton width="100%" height={100} borderRadius={16} />
      </View>
    </ScrollView>
  </View>
);
