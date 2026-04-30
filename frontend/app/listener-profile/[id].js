import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRef, useEffect, useState } from 'react';

const { width: SW, height: SH } = Dimensions.get('window');


const MOCK_LISTENER_PROFILE = {
  id: '1',
  name: 'Shruti Jaiswal',
  avatar: require('../../images/user_shruti.png'),
  hookline: 'Here to listen, understand, and help you find peace. Let\'s talk!',
  tags: ['Anxiety', 'Relationship', 'Career', 'Loneliness'],
  about: 'Hi! I am Shruti. I have been a certified listener for over 2 years. I specialize in helping people navigate through difficult times, especially concerning relationships and career stress. I believe in creating a safe, non-judgmental space for everyone.',
  images: [
    'https://picsum.photos/400/300?random=1',
    'https://picsum.photos/400/300?random=2',
  ],
  isVerified: true,
  rating: 4.8,
  reviews: 124,
  totalSessions: 580,
  hoursListened: 312,
  languages: ['English', 'Hindi'],
};

export default function ListenerProfileScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  
  const profile = MOCK_LISTENER_PROFILE;

  
  const [isFavourite, setIsFavourite] = useState(false);

  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(SH * 0.04)).current;
  const avatarScale = useRef(new Animated.Value(0.5)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(avatarScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 50, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {}
      <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={SW * 0.06} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Listener Profile</Text>
        <TouchableOpacity style={styles.heartBtn} activeOpacity={0.7} onPress={() => setIsFavourite(!isFavourite)}>
          <Ionicons name={isFavourite ? "heart" : "heart-outline"} size={SW * 0.06} color={isFavourite ? "#EF4444" : "#fff"} />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {}
        <Animated.View style={[styles.heroSection, { opacity: headerOpacity }]}>
          <LinearGradient
            colors={['#7C3AED', '#6D28D9', '#4C1D95']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.coverGradient}
          >
            {}
            <View style={styles.decoCircle1} />
            <View style={styles.decoCircle2} />
            <View style={styles.decoCircle3} />
          </LinearGradient>

          {}
          <Animated.View style={[styles.avatarContainer, { transform: [{ scale: avatarScale }] }]}>
            <LinearGradient
              colors={['#8B5CF6', '#EC4899', '#F59E0B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.avatarGradientBorder}
            >
              <Image source={profile.avatar} style={styles.avatar} />
            </LinearGradient>
            {}
            <View style={styles.onlineIndicator}>
              <View style={styles.onlineDot} />
            </View>
          </Animated.View>

          {}
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            {profile.isVerified && (
              <View style={styles.verifiedBadge}>
                <View style={styles.verifiedBadgeBg} />
                <MaterialIcons name="verified" size={SW * 0.055} color="#38BDF8" />
              </View>
            )}
          </View>

          {}
          <View style={styles.ratingRow}>
            <Ionicons name="star" size={SW * 0.04} color="#F59E0B" />
            <Text style={styles.ratingText}>{profile.rating}</Text>
            <Text style={styles.reviewsText}>({profile.reviews} reviews)</Text>
          </View>
        </Animated.View>

        {}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {}
          <View style={styles.hooklineCard}>
            <LinearGradient
              colors={['rgba(139,92,246,0.12)', 'rgba(236,72,153,0.08)', 'rgba(0,0,0,0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hooklineGradient}
            >
              <Ionicons name="chatbubble-ellipses" size={SW * 0.05} color="rgba(139,92,246,0.6)" style={styles.hooklineIcon} />
              <Text style={styles.hookline}>"{profile.hookline}"</Text>
            </LinearGradient>
          </View>

          {}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <LinearGradient
                colors={['rgba(34,197,94,0.15)', 'rgba(34,197,94,0.05)']}
                style={styles.statIconBg}
              >
                <Ionicons name="headset" size={SW * 0.05} color="#22C55E" />
              </LinearGradient>
              <Text style={styles.statValue}>{profile.totalSessions}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient
                colors={['rgba(59,130,246,0.15)', 'rgba(59,130,246,0.05)']}
                style={styles.statIconBg}
              >
                <Ionicons name="time" size={SW * 0.05} color="#3B82F6" />
              </LinearGradient>
              <Text style={styles.statValue}>{profile.hoursListened}h</Text>
              <Text style={styles.statLabel}>Listened</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <LinearGradient
                colors={['rgba(245,158,11,0.15)', 'rgba(245,158,11,0.05)']}
                style={styles.statIconBg}
              >
                <Ionicons name="star" size={SW * 0.05} color="#F59E0B" />
              </LinearGradient>
              <Text style={styles.statValue}>{profile.rating}</Text>
              <Text style={styles.statLabel}>Rating</Text>
            </View>
          </View>

          {}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtnWrapper} activeOpacity={0.85}>
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionBtn}
              >
                <Ionicons name="call" size={SW * 0.05} color="#fff" />
                <Text style={styles.actionBtnText}>Voice</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnWrapper} activeOpacity={0.85}>
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionBtn}
              >
                <Ionicons name="videocam" size={SW * 0.05} color="#fff" />
                <Text style={styles.actionBtnText}>Video</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtnWrapper} activeOpacity={0.85}>
              <LinearGradient
                colors={['#EC4899', '#DB2777']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.actionBtn}
              >
                <Ionicons name="chatbubble" size={SW * 0.045} color="#fff" />
                <Text style={styles.actionBtnText}>Chat</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetag" size={SW * 0.045} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Expertise</Text>
            </View>
            <View style={styles.tagsContainer}>
              {profile.tags.map((tag, idx) => (
                <View key={idx} style={styles.tagWrapper}>
                  <LinearGradient
                    colors={['rgba(139,92,246,0.2)', 'rgba(236,72,153,0.1)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.tag}
                  >
                    <Text style={styles.tagText}>{tag}</Text>
                  </LinearGradient>
                </View>
              ))}
            </View>
          </View>

          {}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="globe" size={SW * 0.045} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Languages</Text>
            </View>
            <View style={styles.languagesRow}>
              {profile.languages.map((lang, idx) => (
                <View key={idx} style={styles.languageChip}>
                  <Text style={styles.languageText}>{lang}</Text>
                </View>
              ))}
            </View>
          </View>

          {}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={SW * 0.045} color="#22C55E" />
              <Text style={styles.sectionTitle}>About Me</Text>
            </View>
            <View style={styles.aboutCard}>
              <Text style={styles.aboutText}>{profile.about}</Text>
            </View>
          </View>

          {}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images" size={SW * 0.045} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Gallery</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
              {profile.images.map((img, idx) => (
                <View key={idx} style={styles.galleryImageWrapper}>
                  <Image source={{ uri: img }} style={styles.galleryImage} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.4)']}
                    style={styles.galleryOverlay}
                  />
                </View>
              ))}
            </ScrollView>
          </View>

          {}
          <View style={{ height: SH * 0.05 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: '4%',
    paddingVertical: SH * 0.015,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: SW * 0.1,
    height: SW * 0.1,
    borderRadius: SW * 0.05,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtn: {
    width: SW * 0.1,
    height: SW * 0.1,
    borderRadius: SW * 0.05,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: SW * 0.045,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.3,
  },
  scrollContent: {
    paddingBottom: SH * 0.03,
  },

  
  heroSection: {
    alignItems: 'center',
    marginBottom: SH * 0.01,
  },
  coverGradient: {
    width: '100%',
    height: SH * 0.16,
    overflow: 'hidden',
  },
  decoCircle1: {
    position: 'absolute',
    width: SW * 0.4,
    height: SW * 0.4,
    borderRadius: SW * 0.2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -SW * 0.15,
    right: -SW * 0.1,
  },
  decoCircle2: {
    position: 'absolute',
    width: SW * 0.25,
    height: SW * 0.25,
    borderRadius: SW * 0.125,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -SW * 0.08,
    left: -SW * 0.05,
  },
  decoCircle3: {
    position: 'absolute',
    width: SW * 0.15,
    height: SW * 0.15,
    borderRadius: SW * 0.075,
    backgroundColor: 'rgba(236,72,153,0.15)',
    top: SH * 0.04,
    left: SW * 0.3,
  },

  
  avatarContainer: {
    marginTop: -(SW * 0.14),
    alignItems: 'center',
  },
  avatarGradientBorder: {
    width: SW * 0.28,
    height: SW * 0.28,
    borderRadius: SW * 0.14,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SW * 0.008,
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: SW * 0.14,
    borderWidth: 3,
    borderColor: '#000',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: SW * 0.01,
    right: SW * 0.02,
    width: SW * 0.055,
    height: SW * 0.055,
    borderRadius: SW * 0.0275,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: SW * 0.035,
    height: SW * 0.035,
    borderRadius: SW * 0.0175,
    backgroundColor: '#22C55E',
  },

  
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SH * 0.012,
    gap: SW * 0.015,
  },
  name: {
    color: '#fff',
    fontSize: SW * 0.06,
    fontWeight: '800',
    fontFamily: 'Inter_900Black',
    letterSpacing: -0.5,
  },
  verifiedBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadgeBg: {
    position: 'absolute',
    width: SW * 0.025,
    height: SW * 0.025,
    backgroundColor: '#fff',
    borderRadius: SW * 0.0125,
  },

  
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SH * 0.006,
    gap: SW * 0.012,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: SW * 0.04,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  reviewsText: {
    color: '#6B7280',
    fontSize: SW * 0.034,
    fontFamily: 'Inter_400Regular',
  },

  
  hooklineCard: {
    marginHorizontal: '5%',
    marginTop: SH * 0.02,
    borderRadius: SW * 0.04,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.15)',
  },
  hooklineGradient: {
    paddingVertical: SH * 0.022,
    paddingHorizontal: '5%',
    alignItems: 'center',
  },
  hooklineIcon: {
    marginBottom: SH * 0.008,
  },
  hookline: {
    color: '#D1D5DB',
    fontSize: SW * 0.038,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: SW * 0.058,
    fontFamily: 'Inter_400Regular',
  },

  
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    marginHorizontal: '5%',
    marginTop: SH * 0.025,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: SW * 0.04,
    paddingVertical: SH * 0.02,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconBg: {
    width: SW * 0.1,
    height: SW * 0.1,
    borderRadius: SW * 0.05,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SH * 0.008,
  },
  statValue: {
    color: '#fff',
    fontSize: SW * 0.045,
    fontWeight: '800',
    fontFamily: 'Inter_700Bold',
  },
  statLabel: {
    color: '#6B7280',
    fontSize: SW * 0.028,
    fontFamily: 'Inter_400Regular',
    marginTop: SH * 0.002,
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: '5%',
    marginTop: SH * 0.025,
    gap: SW * 0.025,
  },
  actionBtnWrapper: {
    flex: 1,
    borderRadius: SW * 0.04,
    overflow: 'hidden',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SH * 0.018,
    gap: SW * 0.015,
    borderRadius: SW * 0.04,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: SW * 0.035,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },

  
  section: {
    paddingHorizontal: '5%',
    marginTop: SH * 0.03,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SW * 0.02,
    marginBottom: SH * 0.015,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: SW * 0.043,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.2,
  },

  
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SW * 0.022,
  },
  tagWrapper: {
    borderRadius: SW * 0.05,
    overflow: 'hidden',
  },
  tag: {
    paddingVertical: SH * 0.01,
    paddingHorizontal: SW * 0.045,
    borderRadius: SW * 0.05,
    borderWidth: 1,
    borderColor: 'rgba(139,92,246,0.25)',
  },
  tagText: {
    color: '#C4B5FD',
    fontSize: SW * 0.033,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
  },

  
  languagesRow: {
    flexDirection: 'row',
    gap: SW * 0.025,
  },
  languageChip: {
    backgroundColor: 'rgba(59,130,246,0.12)',
    paddingVertical: SH * 0.01,
    paddingHorizontal: SW * 0.045,
    borderRadius: SW * 0.05,
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.2)',
  },
  languageText: {
    color: '#93C5FD',
    fontSize: SW * 0.033,
    fontFamily: 'Inter_500Medium',
    fontWeight: '500',
  },

  
  aboutCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: SW * 0.04,
    padding: '4.5%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  aboutText: {
    color: '#9CA3AF',
    fontSize: SW * 0.036,
    lineHeight: SW * 0.058,
    fontFamily: 'Inter_400Regular',
  },

  
  galleryScroll: {
    paddingRight: '5%',
  },
  galleryImageWrapper: {
    width: SW * 0.6,
    height: SW * 0.38,
    borderRadius: SW * 0.04,
    overflow: 'hidden',
    marginRight: SW * 0.03,
    backgroundColor: '#111',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  galleryOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '30%',
  },
});
