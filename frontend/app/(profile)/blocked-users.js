import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, s, vs, hp, wp } from '../../utils/responsive';
import { getAvatarUrl } from '../../utils/avatars';
import { userAPI } from '../../utils/api';

export default function BlockedUsersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [userRole, setUserRole] = useState('USER');
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingUnblock, setPendingUnblock] = useState(null);
  const [unblocking, setUnblocking] = useState(false);

  const loadBlocked = useCallback(async () => {
    try {
      const res = await userAPI.getBlockedUsers();
      const list = res?.data || [];
      setBlockedUsers(list);
    } catch (e) {
      console.error('Error loading blocked users:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const init = async () => {
        try {
          const userStr = await AsyncStorage.getItem('user');
          if (userStr) {
            const user = JSON.parse(userStr);
            if (user.role) setUserRole(user.role);
          }
        } catch (e) {}
      };
      init();
      loadBlocked();
    }, [loadBlocked])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadBlocked();
  };

  const confirmUnblock = async () => {
    if (!pendingUnblock) return;
    setUnblocking(true);
    try {
      const targetId = pendingUnblock._id || pendingUnblock.id;
      await userAPI.unblockUser(targetId);
      setBlockedUsers(prev => prev.filter(u => (u._id || u.id) !== targetId));
      setPendingUnblock(null);
    } catch (e) {
      console.error('Error unblocking user:', e);
    } finally {
      setUnblocking(false);
    }
  };

  const title = userRole === 'LISTENER' ? 'Blocked Users' : 'Blocked Listeners';

  const renderItem = ({ item }) => {
    const name = item.name || item.username || 'Unknown';
    const avatarUrl = getAvatarUrl(item.gender, item.avatarIndex);
    return (
      <View style={styles.itemCard}>
        <Image source={{ uri: avatarUrl }} style={styles.itemAvatar} resizeMode="cover" />
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{name}</Text>
          <Text style={styles.itemSub}>Blocked</Text>
        </View>
        <TouchableOpacity
          style={styles.unblockBtn}
          activeOpacity={0.8}
          onPress={() => setPendingUnblock(item)}
        >
          <Text style={styles.unblockBtnText}>Unblock</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIcon}>
        <Ionicons name="shield-checkmark-outline" size={hp(7)} color="#374151" />
      </View>
      <Text style={styles.emptyTitle}>No blocked {userRole === 'LISTENER' ? 'users' : 'listeners'}</Text>
      <Text style={styles.emptySub}>
        {userRole === 'LISTENER'
          ? 'Users you block will appear here.'
          : 'Listeners you block will appear here.'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 0, backgroundColor: '#000' }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={hp(3.2)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#EC4899" />
        </View>
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => String(item._id || item.id)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.listContent,
            blockedUsers.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#EC4899"
              colors={['#EC4899']}
            />
          }
          ListEmptyComponent={renderEmpty}
        />
      )}

      <Modal
        transparent
        visible={!!pendingUnblock}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setPendingUnblock(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPendingUnblock(null)}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              activeOpacity={0.7}
              onPress={() => setPendingUnblock(null)}
            >
              <Ionicons name="close" size={hp(3)} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <View style={styles.modalIconContainer}>
              <Ionicons name="person-outline" size={hp(4.5)} color="#EF4444" />
            </View>

            <Text style={styles.modalTitle}>Unblock {pendingUnblock?.name || 'User'}?</Text>
            <Text style={styles.modalSub}>
              They will be able to contact you again after unblocking.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
                onPress={() => setPendingUnblock(null)}
                disabled={unblocking}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                activeOpacity={0.8}
                onPress={confirmUnblock}
                disabled={unblocking}
              >
                {unblocking ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Unblock</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
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
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  backBtn: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: ms(18, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  headerSpacer: {
    width: wp(9),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(6),
    gap: hp(1.4),
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: hp(2.2),
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3.5),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  itemAvatar: {
    width: wp(13),
    height: wp(13),
    borderRadius: wp(6.5),
    backgroundColor: '#1F2937',
  },
  itemInfo: {
    flex: 1,
    marginLeft: wp(3),
  },
  itemName: {
    fontSize: ms(15, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_600SemiBold',
  },
  itemSub: {
    fontSize: ms(11, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: hp(0.2),
  },
  unblockBtn: {
    paddingHorizontal: wp(5),
    paddingVertical: hp(1),
    borderRadius: hp(2),
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  unblockBtnText: {
    fontSize: ms(13, 0.3),
    color: '#EF4444',
    fontFamily: 'Inter_700Bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  emptyIcon: {
    width: hp(14),
    height: hp(14),
    borderRadius: hp(7),
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
  },
  emptyTitle: {
    fontSize: ms(17, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_700Bold',
    marginBottom: hp(0.8),
  },
  emptySub: {
    fontSize: ms(13, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(6),
  },
  modalContent: {
    backgroundColor: '#141414',
    borderRadius: hp(4),
    padding: s(24),
    width: '100%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
    position: 'relative',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: vs(16),
    right: s(24),
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalIconContainer: {
    width: hp(11),
    height: hp(11),
    borderRadius: hp(5.5),
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2.4),
  },
  modalTitle: {
    fontSize: ms(24, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  modalSub: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: vs(20),
    fontFamily: 'Inter_400Regular',
    marginBottom: hp(3.8),
  },
  modalButtons: {
    flexDirection: 'row',
    gap: s(12),
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: vs(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#1F1F1F',
  },
  modalCancelText: {
    fontSize: ms(16, 0.3),
    color: '#D1D5DB',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: vs(16),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#EF4444',
  },
  modalConfirmText: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
  },
});
