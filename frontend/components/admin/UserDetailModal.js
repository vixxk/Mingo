import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ms, s, vs } from '../../utils/responsive';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const UserDetailModal = ({ visible, user, onClose, onDelete }) => {
  if (!user) return null;

  return (
    <Modal transparent visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {}
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          {}
          <Image source={user.avatar} style={styles.modalAvatar} />
          <Text style={styles.modalName}>{user.name}</Text>
          <Text style={styles.modalPhone}>{user.phone}</Text>
          <View style={[styles.modalStatusBadge, user.status === 'active' ? styles.badgeActive : styles.badgeInactive]}>
            <Text style={[styles.modalStatusText, user.status === 'active' ? styles.badgeActiveText : styles.badgeInactiveText]}>
              {user.status === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {}
            <View style={styles.modalStatsRow}>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatValue}>{user.appOpens}</Text>
                <Text style={styles.modalStatLabel}>App Opens</Text>
              </View>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatValue}>{user.totalTimeSpent}</Text>
                <Text style={styles.modalStatLabel}>Time Spent</Text>
              </View>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatValue}>{user.totalCalls}</Text>
                <Text style={styles.modalStatLabel}>Calls</Text>
              </View>
            </View>

            {}
            <View style={styles.modalDetailCard}>
              {[
                { label: 'Gender', value: user.gender, icon: 'person-outline' },
                { label: 'Language', value: user.language, icon: 'globe-outline' },
                { label: 'Coins', value: `🪙 ${user.coins}`, icon: 'wallet-outline' },
                { label: 'Joined', value: user.joinDate, icon: 'calendar-outline' },
                { label: 'Last Active', value: user.lastActive, icon: 'time-outline' },
              ].map((item, i) => (
                <View key={i}>
                  <View style={styles.modalDetailRow}>
                    <View style={styles.modalDetailLeft}>
                      <Ionicons name={item.icon} size={16} color="#6B7280" />
                      <Text style={styles.modalDetailLabel}>{item.label}</Text>
                    </View>
                    <Text style={styles.modalDetailValue}>{item.value}</Text>
                  </View>
                  {i < 4 && <View style={styles.modalDetailDivider} />}
                </View>
              ))}
            </View>

            {}
            <Text style={styles.modalSubtitle}>Interests</Text>
            <View style={styles.modalChips}>
              {user.interests.map((interest, i) => (
                <View key={i} style={styles.modalChip}>
                  <Text style={styles.modalChipText}>{interest}</Text>
                </View>
              ))}
            </View>

            {}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]} activeOpacity={0.7}>
                <Ionicons name="ban" size={18} color="#EF4444" />
                <Text style={[styles.modalActionText, { color: '#EF4444' }]}>Ban User</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalActionBtn, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]} activeOpacity={0.7}>
                <Ionicons name="chatbubble" size={18} color="#3B82F6" />
                <Text style={[styles.modalActionText, { color: '#3B82F6' }]}>Message</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', marginTop: SCREEN_HEIGHT * 0.01, width: '100%' }]}
              activeOpacity={0.7}
              onPress={() => onDelete(user.id)}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.modalActionText, { color: '#EF4444' }]}>Delete User Permanently</Text>
            </TouchableOpacity>

            <View style={{ height: SCREEN_HEIGHT * 0.04 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0A0A0A',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: SCREEN_HEIGHT * 0.02,
    paddingHorizontal: s(20),
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    alignItems: 'center',
  },
  modalClose: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.02,
    right: s(20),
    width: SCREEN_HEIGHT * 0.04,
    height: SCREEN_HEIGHT * 0.04,
    borderRadius: SCREEN_HEIGHT * 0.02,
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalAvatar: {
    width: SCREEN_HEIGHT * 0.1,
    height: SCREEN_HEIGHT * 0.1,
    borderRadius: SCREEN_HEIGHT * 0.05,
    marginBottom: SCREEN_HEIGHT * 0.012,
    borderWidth: 3,
    borderColor: '#A855F7',
  },
  modalName: {
    fontSize: ms(22, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  modalPhone: {
    fontSize: ms(13, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  modalStatusBadge: {
    paddingHorizontal: s(12),
    paddingVertical: SCREEN_HEIGHT * 0.005,
    borderRadius: 12,
    marginTop: SCREEN_HEIGHT * 0.01,
    marginBottom: SCREEN_HEIGHT * 0.015,
  },
  badgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  badgeInactive: {
    backgroundColor: 'rgba(107, 114, 128, 0.15)',
  },
  badgeActiveText: { color: '#10B981' },
  badgeInactiveText: { color: '#6B7280' },
  modalStatusText: {
    fontSize: ms(12, 0.3),
    fontFamily: 'Inter_700Bold',
  },
  modalScroll: {
    width: '100%',
  },
  modalStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  modalStatBox: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#141414',
    borderRadius: 16,
    paddingVertical: SCREEN_HEIGHT * 0.015,
    marginHorizontal: s(4),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  modalStatValue: {
    fontSize: ms(18, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  modalStatLabel: {
    fontSize: ms(10, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  modalDetailCard: {
    backgroundColor: '#141414',
    borderRadius: 18,
    paddingVertical: SCREEN_HEIGHT * 0.005,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: SCREEN_HEIGHT * 0.02,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SCREEN_HEIGHT * 0.014,
    paddingHorizontal: s(16),
  },
  modalDetailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(8),
  },
  modalDetailLabel: {
    fontSize: ms(13, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
  },
  modalDetailValue: {
    fontSize: ms(13, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_700Bold',
  },
  modalDetailDivider: {
    height: 1,
    backgroundColor: '#1F1F1F',
    marginHorizontal: s(16),
  },
  modalSubtitle: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_700Bold',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  modalChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: s(8),
    marginBottom: SCREEN_HEIGHT * 0.025,
  },
  modalChip: {
    backgroundColor: '#1F2937',
    paddingHorizontal: s(12),
    paddingVertical: SCREEN_HEIGHT * 0.007,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalChipText: {
    fontSize: ms(12, 0.3),
    color: '#D1D5DB',
    fontFamily: 'Inter_500Medium',
  },
  modalActions: {
    flexDirection: 'row',
    gap: s(12),
  },
  modalActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: s(6),
    paddingVertical: SCREEN_HEIGHT * 0.016,
    borderRadius: 16,
  },
  modalActionText: {
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_700Bold',
  },
});

export default UserDetailModal;
