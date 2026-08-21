import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { callAPI, listenersAPI } from '../../utils/api';
import { formatSessionDuration, formatSessionType } from '../../utils/sessionFormat';
import RaiseIssuePopup from '../../components/shared/RaiseIssuePopup';
import StatusPopup from '../../components/shared/StatusPopup';
import SkeletonRecentList from '../../components/SkeletonRecentList';

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

const SessionCard = ({ item, index, onShowOfflinePopup }) => {
  const router = useRouter();
  const [calling, setCalling] = useState(false);

  const handleConnect = async (type) => {
    if (calling) return;
    setCalling(true);
    const targetId = item.listenerId || item.id;
    try {
      if (targetId) {
        const profileRes = await listenersAPI.getPublicProfile(targetId);
        if (profileRes?.data && !profileRes.data.isOnline) {
          onShowOfflinePopup(item.name);
          setCalling(false);
          return;
        }
      }
    } catch (e) {
      console.log('Error checking listener online status:', e);
    }
    setCalling(false);

    if (type === 'chat') {
      router.push({
        pathname: '/(chat)/chat',
        params: { listenerId: targetId, name: item.name }
      });
    } else {
      router.push({
        pathname: '/(call)/connecting',
        params: {
          name: item.name,
          callType: type || item.callType || 'audio',
          callId: `call_${Date.now()}`,
          roomId: `room_${Date.now()}`,
          listenerId: targetId,
          avatarIndex: item.avatarIndex || '0',
          gender: item.gender || 'Female'
        }
      });
    }
  };

  const handleProfilePress = () => {
    if (calling) return;
    const targetId = item.listenerId || item.id;
    if (targetId) {
      router.push(`/listener-profile/${targetId}`);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => handleConnect(item.callType || 'audio')}
      disabled={calling}
    >
      <LinearGradient
        colors={item.gradientColors || GRADIENTS[index % GRADIENTS.length]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.sessionCard}
      >
        <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.8} disabled={calling}>
          <View style={styles.sessionAvatar}>
            <Ionicons
              name={item.callType === 'video' ? 'videocam' : item.callType === 'chat' ? 'chatbubble-ellipses' : 'call'}
              size={wp(5)}
              color="#fff"
            />
          </View>
        </TouchableOpacity>
        <View style={styles.sessionInfo}>
          <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.8} disabled={calling}>
            <Text style={styles.sessionName}>{item.name}</Text>
          </TouchableOpacity>
          <Text style={styles.sessionMeta}>
            {item.typeLabel} Call • {item.durationLabel || '0 mins'} •{' '}
            {item.callTime}
          </Text>
        </View>
        <View style={styles.sessionDiamonds}>
          <Ionicons name="diamond" size={wp(4)} color="#F59E0B" />
          <Text style={styles.sessionDiamondText}>{item.diamonds}</Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

export default function RecentSessionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIssuePopup, setShowIssuePopup] = useState(false);
  const [statusPopupVisible, setStatusPopupVisible] = useState(false);
  const [statusPopupTitle, setStatusPopupTitle] = useState('');
  const [statusPopupMessage, setStatusPopupMessage] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await callAPI.getHistory(5, 0);
      if (res?.data) {
        setSessions(
          res.data.map((call, index) => {
            const isVideo = call.callType === 'video';
            const coinsPerMin = isVideo ? 40 : 10;
            const rawDur = (call.duration != null && call.duration > 0)
              ? call.duration
              : (call.status === 'completed' ? 1 : 0);
            const dur = rawDur > 60 ? Math.ceil(rawDur / 60) : rawDur;
            const coins = (call.coinsDeducted && call.coinsDeducted > 0)
              ? call.coinsDeducted
              : (call.status === 'completed' ? dur * coinsPerMin : 0);
            const diamonds = Math.floor(coins / 10);

            return {
              id: call._id,
              listenerId: call.listenerId?._id || call.listenerId,
              name: call.listenerId?.name || 'Unknown',
              duration: `${dur} min${dur === 1 ? '' : 's'}`,
              durationLabel: formatSessionDuration({ ...call, duration: dur }),
              callType: call.callType || 'audio',
              typeLabel: formatSessionType(call),
              callTime: formatCallTime(call.startTime || call.createdAt),
              diamonds: diamonds,
              gradientColors: GRADIENTS[index % GRADIENTS.length],
            };
          })
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

      {loading ? (
        <SkeletonRecentList variant="sessions" />
      ) : (
        <FlatList
          style={styles.list}
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>Your last 5 sessions</Text>
          }
          renderItem={({ item, index }) => (
            <SessionCard 
              item={item} 
              index={index} 
              onShowOfflinePopup={(name) => {
                setStatusPopupTitle('Listener is offline');
                setStatusPopupMessage(`${name} isn't online right now. Please try again when they're back online.`);
                setStatusPopupVisible(true);
              }}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="call-outline" size={wp(14)} color="#4B5563" />
              <Text style={styles.emptyTitle}>No Sessions Yet</Text>
              <Text style={styles.emptySubtitle}>
                Your recent call sessions will appear here.
              </Text>
            </View>
          }
        />
      )}

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

      <StatusPopup
        visible={statusPopupVisible}
        type="error"
        title={statusPopupTitle}
        message={statusPopupMessage}
        icon="cloud-offline-outline"
        onClose={() => setStatusPopupVisible(false)}
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