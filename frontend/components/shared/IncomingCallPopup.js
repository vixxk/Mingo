import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  Vibration,
  AppState,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, hp, wp } from '../../utils/responsive';
import { getAvatarUrl } from '../../utils/avatars';
import { playIncomingCallSound, stopIncomingCallSound } from '../../utils/callSounds';

const DedicatedCallPage = ({ call, onAccept, onReject }) => {
  const avatarUrl = getAvatarUrl(call.gender, call.avatarIndex);
  const isVideo = call.callType === 'video';

  return (
    <View style={styles.fullScreenContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#09090E" translucent />
      <LinearGradient
        colors={['#0A0A0F', '#141028', '#09090E']}
        style={styles.gradientBackground}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Top Bar with Mingo Logo on Top Left */}
          <View style={styles.headerRow}>
            <Image
              source={require('../../images/Mingo Splash Text.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Center Section with Caller Photo & Details */}
          <View style={styles.centerSection}>
            <View style={styles.avatarOuterRing}>
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            </View>

            <Text style={styles.callerName} numberOfLines={1}>
              {call.callerName || 'Mingo User'}
            </Text>

            <Text style={styles.callTypeSubtitle}>
              {isVideo ? 'Incoming Video Call...' : 'Incoming Audio Call...'}
            </Text>
          </View>

          {/* Bottom Control Buttons (Decline & Accept) */}
          <View style={styles.bottomActionsContainer}>
            <View style={styles.actionColumn}>
              <TouchableOpacity
                style={[styles.actionButton, styles.declineButton]}
                onPress={() => onReject(call)}
                activeOpacity={0.8}
              >
                <Ionicons name="call-outline" size={wp(7.5)} color="#FFFFFF" style={{ transform: [{ rotate: '135deg' }] }} />
              </TouchableOpacity>
              <Text style={styles.declineLabel}>Decline</Text>
            </View>

            <View style={styles.actionColumn}>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptButton]}
                onPress={() => onAccept(call)}
                activeOpacity={0.8}
              >
                <Ionicons name={isVideo ? 'videocam' : 'call'} size={wp(7.5)} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.acceptLabel}>Pick Call</Text>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const IncomingCallPopup = ({ calls = [], onAccept, onReject, visible }) => {
  const [dismissedCallIds, setDismissedCallIds] = useState([]);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      setAppActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const parentCalls = Array.isArray(calls) ? calls : [];
    setDismissedCallIds((prev) =>
      prev.filter((id) =>
        parentCalls.some((c) => String(c.callId || c.sessionId || c.id || c._id || '') === id)
      )
    );
  }, [calls]);

  const activeCalls = (Array.isArray(calls) ? calls : []).filter((call) => {
    const cid = String(call?.callId || call?.sessionId || call?.id || call?._id || '');
    if (!cid) return false;
    return !dismissedCallIds.includes(cid);
  });

  useEffect(() => {
    if (activeCalls.length > 0 && appActive) {
      const topCall = activeCalls[0];
      const customSoundUrl = topCall?.customRingtoneUrl || topCall?.ringtoneUrl;
      playIncomingCallSound(customSoundUrl);
      Vibration.vibrate([1000, 1000], true);
    } else {
      stopIncomingCallSound();
      Vibration.cancel();
    }
    return () => {
      stopIncomingCallSound();
      Vibration.cancel();
    };
  }, [activeCalls.length, appActive]);

  if (activeCalls.length === 0) return null;

  const currentCall = activeCalls[0];

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent>
      <DedicatedCallPage
        call={currentCall}
        onAccept={() => onAccept(currentCall)}
        onReject={() => onReject(currentCall)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: '#09090E',
  },
  gradientBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: wp(6),
  },
  headerRow: {
    marginTop: hp(4),
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoImage: {
    width: wp(40),
    height: hp(6),
    marginLeft: -wp(4),
  },
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: hp(2),
  },
  avatarOuterRing: {
    width: wp(36),
    height: wp(36),
    borderRadius: wp(18),
    borderWidth: 3,
    borderColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E1B2E',
    shadowColor: '#A855F7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  avatarImage: {
    width: wp(33),
    height: wp(33),
    borderRadius: wp(16.5),
  },
  callerName: {
    color: '#FFFFFF',
    fontSize: ms(24, 0.3),
    fontFamily: 'Inter_700Bold',
    marginTop: hp(3),
    textAlign: 'center',
    paddingHorizontal: wp(5),
  },
  callTypeSubtitle: {
    color: '#C084FC',
    fontSize: ms(16, 0.3),
    fontFamily: 'Inter_500Medium',
    marginTop: hp(1),
    textAlign: 'center',
  },
  bottomActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: hp(8),
    paddingHorizontal: wp(8),
  },
  actionColumn: {
    alignItems: 'center',
  },
  actionButton: {
    width: wp(18),
    height: wp(18),
    borderRadius: wp(9),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineLabel: {
    color: '#EF4444',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_600SemiBold',
    marginTop: hp(1.2),
  },
  acceptLabel: {
    color: '#10B981',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_600SemiBold',
    marginTop: hp(1.2),
  },
});

export default IncomingCallPopup;
