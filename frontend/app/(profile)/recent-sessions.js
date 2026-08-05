import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { callAPI } from '../../utils/api';
import RaiseIssuePopup from '../../components/shared/RaiseIssuePopup';

const GRADIENTS = [
  ['#5C21B6', '#121212'],
  ['#451A03', '#121212'],
  ['#0F766E', '#121212'],
  ['#15803D', '#121212'],
];

const formatCallTime = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterday = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const targetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
  const timeStr = date.toLocaleTimeString('en-US', timeOptions).toLowerCase();

  if (targetDate.getTime() === todayStart.getTime()) return `${timeStr} Today`;
  if (targetDate.getTime() === yesterday.getTime()) return `${timeStr} Yesterday`;
  return `${timeStr} ${date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`;
};

const SessionCard = ({ item, index }) => (
  <LinearGradient
    colors={item.gradientColors || GRADIENTS[index % GRADIENTS.length]}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 0 }}
    style={styles.sessionCard}
  >
    <View style={styles.sessionAvatar}>
      <Ionicons
        name={item.callType === 'video' ? 'videocam' : 'call'}
        size={wp(5)}
        color="#fff"
      />
    </View>
    <View style={styles.sessionInfo}>
      <Text style={styles.sessionName}>{item.name}</Text>
      <Text style={styles.sessionMeta}>
        {item.callType === 'video' ? 'Video' : 'Audio'} Call • {item.duration || '0 mins'} •{' '}
        {item.callTime}
      </Text>
    </View>
    <View style={styles.sessionDiamonds}>
      <Ionicons name="diamond" size={wp(4)} color="#F59E0B" />
      <Text style={styles.sessionDiamondText}>{item.diamonds}</Text>
    </View>
  </LinearGradient>
);

export default function RecentSessionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIssuePopup, setShowIssuePopup] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAPI.getHistory(5, 0);
      if (res?.data) {
        setSessions(
          res.data.map((call, index) => ({
            id: call._id,
            name: call.listenerId?.name || 'Unknown',
            duration: `${call.duration || 0} mins`,
            callType: call.callType || 'audio',
            callTime: formatCallTime(call.startTime || call.createdAt),
            diamonds: Math.floor((call.coinsDeducted || 0) / 10),
            gradientColors: GRADIENTS[index % GRADIENTS.length],
          }))
        );
      }
    } catch (e) {
      console.error('Failed to load recent sessions:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['transparent', '#1A0000', '#4A0000']}
        locations={[0, 0.6, 1]}
        style={styles.bgGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={wp(5.5)} color="#fff" />
          <Text style={styles.headerTitle}>Recent Sessions</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.list}
        data={sessions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.sectionTitle}>Your last 5 sessions</Text>
        }
        renderItem={({ item, index }) => <SessionCard item={item} index={index} />}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator size="large" color="#EF4444" style={styles.loader} />
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="call-outline" size={wp(14)} color="#4B5563" />
              <Text style={styles.emptyTitle}>No Sessions Yet</Text>
              <Text style={styles.emptySubtitle}>
                Your recent call sessions will appear here.
              </Text>
            </View>
          )
        }
      />

      <View style={styles.reportFooter}>
        <TouchableOpacity
          style={styles.reportBtnWrap}
          activeOpacity={0.8}
          onPress={() => setShowIssuePopup(true)}
        >
          <LinearGradient
            colors={['#EF4444', '#B91C1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.reportBtn}
          >
            <Ionicons name="flag-outline" size={wp(5)} color="#fff" style={styles.reportIcon} />
            <Text style={styles.reportBtnText}>Report an Issue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <RaiseIssuePopup
        visible={showIssuePopup}
        onClose={() => setShowIssuePopup(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: hp(45),
  },

  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  headerTitle: {
    fontSize: wp(5.5),
    color: '#fff',
    fontWeight: '600',
  },

  /* List */
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: ms(13, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginBottom: hp(1),
  },
  loader: {
    marginTop: hp(8),
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    marginTop: hp(12),
    gap: hp(0.8),
  },
  emptyTitle: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginTop: hp(1),
  },
  emptySubtitle: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  /* Session Card */
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: wp(4),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    marginBottom: hp(1.2),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  sessionAvatar: {
    width: wp(13),
    height: wp(13),
    borderRadius: wp(6.5),
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  sessionInfo: {
    flex: 1,
  },
  sessionName: {
    fontSize: ms(15, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginBottom: hp(0.3),
  },
  sessionMeta: {
    fontSize: ms(12, 0.3),
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
  },
  sessionDiamonds: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
  },
  sessionDiamondText: {
    fontSize: ms(14, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },

  /* Report Button */
  reportFooter: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(2) + 10,
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
    backgroundColor: '#000',
  },
  reportBtnWrap: {
    marginTop: 0,
    marginBottom: 0,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.4),
    borderRadius: wp(3.5),
  },
  reportIcon: {
    marginRight: wp(2),
  },
  reportBtnText: {
    color: '#fff',
    fontSize: ms(15, 0.3),
    fontFamily: 'Inter_700Bold',
  },
});