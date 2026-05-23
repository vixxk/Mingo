import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { LinearGradient } from 'expo-linear-gradient';
import { adminAPI } from '../../utils/api';
import ToastNotification from '../../components/shared/ToastNotification';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';

const { height: SH } = Dimensions.get('window');

const getAvatarImage = (gender, index) => {
  const parsedIndex = parseInt(index, 10) || 0;
  if (gender === 'Male') {
    const maleAvatars = [
      require('../../images/male_avatar_1_1776972918440.png'),
      require('../../images/male_avatar_2_1776972933241.png'),
      require('../../images/male_avatar_3_1776972950218.png'),
      require('../../images/male_avatar_4_1776972963577.png'),
      require('../../images/male_avatar_5_1776972978900.png'),
      require('../../images/male_avatar_6_1776972993180.png'),
      require('../../images/male_avatar_7_1776973008143.png'),
      require('../../images/male_avatar_8_1776973021635.png'),
    ];
    return maleAvatars[parsedIndex] || maleAvatars[0];
  } else {
    const femaleAvatars = [
      require('../../images/female_avatar_1_1776973035859.png'),
      require('../../images/female_avatar_2_1776973050039.png'),
      require('../../images/female_avatar_3_1776973063471.png'),
      require('../../images/female_avatar_4_1776973077539.png'),
      require('../../images/female_avatar_5_1776973090730.png'),
      require('../../images/female_avatar_6_1776973108100.png'),
      require('../../images/female_avatar_7_1776973124018.png'),
      require('../../images/female_avatar_8_1776973138772.png'),
    ];
    return femaleAvatars[parsedIndex] || femaleAvatars[0];
  }
};

export default function BannedMembersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unbanning, setUnbanning] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const fetchBannedMembers = useCallback(async () => {
    try {
      const response = await adminAPI.getBannedMembers();
      const data = response.data || [];
      setMembers(data);
    } catch (error) {
      console.error('Failed to load banned members:', error);
      setToast({ visible: true, message: 'Failed to load banned members', type: 'error' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchBannedMembers();
    }, [fetchBannedMembers])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBannedMembers();
  }, [fetchBannedMembers]);

  const triggerUnbanConfirm = (member) => {
    setConfirmAction({
      memberId: member._id || member.id,
      name: member.name || member.username,
      title: 'Unban Member',
      desc: `Are you sure you want to unban ${member.name || member.username}? They will be able to log back in immediately.`,
      onConfirm: async () => {
        const id = member._id || member.id;
        setConfirmAction(null);
        setUnbanning(id);
        try {
          await adminAPI.toggleBanUser(id);
          setMembers((prev) => prev.filter((m) => (m._id || m.id) !== id));
          setToast({ visible: true, message: 'Member unbanned successfully', type: 'success' });
        } catch (error) {
          console.error('Failed to unban:', error);
          setToast({ visible: true, message: 'Failed to unban member', type: 'error' });
        } finally {
          setUnbanning(null);
        }
      }
    });
  };

  if (loading) {
    return (
      <View style={[st.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <AdminPageSkeleton type="list" />
      </View>
    );
  }

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <View style={st.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={st.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Banned Members</Text>
        <View style={{ width: s(40) }} />
      </View>

      {}
      <ScrollView
        style={st.list}
        contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#A855F7"
            colors={['#A855F7']}
          />
        }
      >
        {members.length === 0 ? (
          <View style={st.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={48} color="#333" />
            <Text style={st.emptyText}>No banned members found</Text>
          </View>
        ) : (
          members.map((member) => {
            const memberId = member._id || member.id;
            return (
              <View key={memberId} style={st.card}>
                <Image
                  source={getAvatarImage(member.gender, member.avatarIndex)}
                  style={st.avatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={st.name}>{member.name || member.username}</Text>
                  <Text style={st.meta}>
                    {member.phone} • {member.role}
                  </Text>
                  <View style={st.badge}>
                    <Ionicons name="ban" size={12} color="#EF4444" />
                    <Text style={st.badgeText}>Banned</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={st.unbanBtn}
                  activeOpacity={0.7}
                  onPress={() => triggerUnbanConfirm(member)}
                  disabled={unbanning === memberId}
                >
                  {unbanning === memberId ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={st.unbanText}>Unban</Text>
                  )}
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* CUSTOM CONFIRMATION DIALOG */}
      {confirmAction && (
        <View style={st.overlayContainer}>
          <View style={st.dialogBox}>
            <View style={[st.confirmIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
              <Ionicons name="checkmark-circle" size={28} color="#10B981" />
            </View>
            <Text style={st.dialogTitle}>{confirmAction.title}</Text>
            <Text style={st.dialogDesc}>{confirmAction.desc}</Text>

            <View style={st.dialogButtons}>
              <TouchableOpacity
                style={st.dialogBtnCancel}
                onPress={() => setConfirmAction(null)}
              >
                <Text style={st.dialogBtnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={st.dialogBtnConfirm}
                onPress={confirmAction.onConfirm}
              >
                <LinearGradient
                  colors={['#10B981', '#059669']}
                  style={st.gradientBtn}
                >
                  <Text style={st.dialogBtnConfirmText}>Confirm</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Toast Notification */}
      <ToastNotification
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onDismiss={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: {
    color: '#9CA3AF',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_400Regular',
    marginTop: vs(12),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: s(16),
    paddingVertical: SH * 0.015,
  },
  backBtn: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: ms(20, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },

  list: { flex: 1, marginTop: vs(10) },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 16,
    padding: s(14),
    marginBottom: SH * 0.012,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  avatar: {
    width: SH * 0.06,
    height: SH * 0.06,
    borderRadius: SH * 0.03,
    marginRight: s(12),
  },
  name: { fontSize: ms(15, 0.3), color: '#fff', fontFamily: 'Inter_700Bold' },
  meta: {
    fontSize: ms(12, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: s(8),
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
    gap: 4,
  },
  badgeText: { color: '#EF4444', fontSize: ms(10, 0.3), fontFamily: 'Inter_600SemiBold' },
  unbanBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: s(16),
    paddingVertical: SH * 0.008,
    borderRadius: 16,
    minWidth: s(70),
    alignItems: 'center',
  },
  unbanText: { color: '#fff', fontSize: ms(12, 0.3), fontFamily: 'Inter_700Bold' },

  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SH * 0.1,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_500Medium',
    marginTop: vs(12),
    textAlign: 'center',
  },
  overlayContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  dialogBox: {
    width: wp(82),
    backgroundColor: '#0F0E11',
    borderRadius: 24,
    paddingHorizontal: wp(6),
    paddingVertical: hp(3),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#1F1F1F',
  },
  confirmIconContainer: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(1.5),
  },
  dialogTitle: {
    fontSize: ms(18),
    fontFamily: 'Inter_900Black',
    color: '#FFF',
    marginBottom: hp(1),
    textAlign: 'center',
  },
  dialogDesc: {
    fontSize: ms(13),
    color: '#9CA3AF',
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    lineHeight: hp(2.2),
    marginBottom: hp(2.5),
  },
  dialogButtons: {
    flexDirection: 'row',
    gap: wp(3),
    width: '100%',
  },
  dialogBtnCancel: {
    flex: 1,
    height: hp(5.5),
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: '#3F3F46',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialogBtnCancelText: {
    color: '#A1A1AA',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
  dialogBtnConfirm: {
    flex: 1,
    height: hp(5.5),
    borderRadius: 30,
    overflow: 'hidden',
  },
  dialogBtnConfirmText: {
    color: '#FFF',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
  gradientBtn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
