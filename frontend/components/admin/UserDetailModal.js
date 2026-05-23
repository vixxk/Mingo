import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { adminAPI } from '../../utils/api';
import ToastNotification from '../shared/ToastNotification';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const UserDetailModal = ({ visible, user, onClose, onDelete, onBan }) => {
  // Interests State
  const [localInterests, setLocalInterests] = useState([]);
  const [isEditingInterests, setIsEditingInterests] = useState(false);
  const [newInterest, setNewInterest] = useState('');
  const [savingInterests, setSavingInterests] = useState(false);

  // Message State
  const [isMessaging, setIsMessaging] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  // Custom Confirmation Dialog State
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'ban' | 'delete', title: string, desc: string, onConfirm: () => void }

  // Sync user interests
  useEffect(() => {
    if (user && user.interests) {
      setLocalInterests(user.interests);
    } else {
      setLocalInterests([]);
    }
  }, [user]);

  if (!user) return null;

  const isBanned = user.isBanned || false;

  const handleSaveInterests = async () => {
    try {
      setSavingInterests(true);
      await adminAPI.updateUserInterests(user.id, localInterests);
      user.interests = localInterests; // Update parent reference
      setIsEditingInterests(false);
      setToast({ visible: true, message: 'Interests updated successfully', type: 'success' });
    } catch (e) {
      console.log('Failed to save interests:', e);
      setToast({ visible: true, message: 'Failed to save interests', type: 'error' });
    } finally {
      setSavingInterests(false);
    }
  };

  const handleAddInterest = () => {
    const trimmed = newInterest.trim();
    if (trimmed && !localInterests.includes(trimmed)) {
      setLocalInterests([...localInterests, trimmed]);
      setNewInterest('');
    }
  };

  const handleRemoveInterest = (indexToRemove) => {
    setLocalInterests(localInterests.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSendMessage = async () => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    try {
      setSendingMessage(true);
      await adminAPI.sendAdminMessage(user.id, trimmed);
      setMessageText('');
      setIsMessaging(false);
      setToast({ visible: true, message: 'Message sent successfully', type: 'success' });
    } catch (e) {
      console.log('Failed to send message:', e);
      setToast({ visible: true, message: 'Failed to send message', type: 'error' });
    } finally {
      setSendingMessage(false);
    }
  };

  const triggerBanConfirm = () => {
    setConfirmAction({
      type: 'ban',
      title: isBanned ? 'Unban User' : 'Ban User',
      desc: `Are you sure you want to ${isBanned ? 'unban' : 'ban'} ${user.name}? This will update their login status immediately.`,
      onConfirm: () => {
        onBan(user.id, isBanned);
        setConfirmAction(null);
      }
    });
  };

  const triggerDeleteConfirm = () => {
    setConfirmAction({
      type: 'delete',
      title: 'Delete User Permanently',
      desc: `This action cannot be undone. All data for ${user.name} will be permanently removed. Are you sure?`,
      onConfirm: () => {
        onDelete(user.id);
        setConfirmAction(null);
      }
    });
  };

  return (
    <Modal transparent visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header Close */}
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>

          <Image source={user.avatar} style={styles.modalAvatar} />
          <Text style={styles.modalName}>{user.name}</Text>
          <Text style={styles.modalPhone}>{user.phone}</Text>
          <View style={[styles.modalStatusBadge, { backgroundColor: user.isBanned ? 'rgba(239, 68, 68, 0.15)' : (user.isOnline ? 'rgba(16, 185, 129, 0.15)' : 'rgba(107, 114, 128, 0.15)') }]}>
            <Text style={[styles.modalStatusText, { color: user.isBanned ? '#EF4444' : (user.isOnline ? '#10B981' : '#6B7280') }]}>
              {user.isBanned ? 'Banned' : (user.isOnline ? 'Online' : 'Offline')}
            </Text>
          </View>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {/* Stats Row */}
            <View style={styles.modalStatsRow}>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatValue}>{user.appOpens || 0}</Text>
                <Text style={styles.modalStatLabel}>App Opens</Text>
              </View>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatValue}>{user.totalTimeSpent || '0h 0m'}</Text>
                <Text style={styles.modalStatLabel}>Time Spent</Text>
              </View>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatValue}>{user.totalCalls || 0}</Text>
                <Text style={styles.modalStatLabel}>Calls</Text>
              </View>
            </View>

            {/* Detail Card */}
            <View style={styles.modalDetailCard}>
              {[
                { label: 'Gender', value: user.gender || 'Not specified', icon: 'person-outline' },
                { label: 'Language', value: user.language || 'English', icon: 'globe-outline' },
                { label: 'Coins', value: `🪙 ${user.coins || 0}`, icon: 'wallet-outline' },
                { label: 'Joined', value: user.joinDate || (user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'), icon: 'calendar-outline' },
                { label: 'Last Active', value: user.lastActive || 'Recently', icon: 'time-outline' },
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

            {/* Interests Section */}
            <View style={styles.interestsHeader}>
              <Text style={styles.modalSubtitle}>Interests</Text>
              {!isEditingInterests ? (
                <TouchableOpacity onPress={() => setIsEditingInterests(true)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.editActions}>
                  <TouchableOpacity onPress={handleSaveInterests} disabled={savingInterests}>
                    {savingInterests ? (
                      <ActivityIndicator size="small" color="#A855F7" />
                    ) : (
                      <Text style={[styles.editBtnText, { color: '#10B981', marginRight: 12 }]}>Save</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setIsEditingInterests(false); setLocalInterests(user.interests || []); }}>
                    <Text style={[styles.editBtnText, { color: '#EF4444' }]}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {isEditingInterests && (
              <View style={styles.addInterestContainer}>
                <TextInput
                  style={styles.interestInput}
                  placeholder="Add new interest..."
                  placeholderTextColor="#4B5563"
                  value={newInterest}
                  onChangeText={setNewInterest}
                />
                <TouchableOpacity style={styles.addInterestBtn} onPress={handleAddInterest}>
                  <Ionicons name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.modalChips}>
              {localInterests.map((interest, i) => (
                <View key={i} style={styles.modalChip}>
                  <Text style={styles.modalChipText}>{interest}</Text>
                  {isEditingInterests && (
                    <TouchableOpacity onPress={() => handleRemoveInterest(i)} style={styles.removeChipBtn}>
                      <Ionicons name="close-circle" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  )}
                </View>
              ))}
              {localInterests.length === 0 && (
                <Text style={styles.noInterestsText}>No interests listed</Text>
              )}
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: isBanned ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }]}
                activeOpacity={0.7}
                onPress={triggerBanConfirm}
              >
                <Ionicons name={isBanned ? "checkmark-circle" : "ban"} size={18} color={isBanned ? "#10B981" : "#EF4444"} />
                <Text style={[styles.modalActionText, { color: isBanned ? "#10B981" : "#EF4444" }]}>
                  {isBanned ? 'Unban User' : 'Ban User'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalActionBtn, { backgroundColor: 'rgba(168, 85, 247, 0.15)' }]}
                activeOpacity={0.7}
                onPress={() => setIsMessaging(true)}
              >
                <Ionicons name="chatbubble" size={18} color="#A855F7" />
                <Text style={[styles.modalActionText, { color: '#A855F7' }]}>Message</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.modalActionBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)', marginTop: SCREEN_HEIGHT * 0.01, width: '100%' }]}
              activeOpacity={0.7}
              onPress={triggerDeleteConfirm}
            >
              <Ionicons name="trash-outline" size={18} color="#EF4444" />
              <Text style={[styles.modalActionText, { color: '#EF4444' }]}>Delete User Permanently</Text>
            </TouchableOpacity>

            <View style={{ height: SCREEN_HEIGHT * 0.04 }} />
          </ScrollView>
        </View>

        {/* MESSAGE OVERLAY (100% consistent styling using screen width/height percentages) */}
        {isMessaging && (
          <View style={styles.overlayContainer}>
            <View style={styles.dialogBox}>
              <View style={[styles.confirmIconContainer, { backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                <Ionicons name="chatbubble" size={28} color="#A855F7" />
              </View>
              <Text style={styles.dialogTitle}>Send Message</Text>
              <Text style={styles.dialogDesc}>Send a support message directly to {user.name}.</Text>

              <TextInput
                style={styles.dialogInput}
                placeholder="Type your message here..."
                placeholderTextColor="#4B5563"
                multiline
                numberOfLines={4}
                value={messageText}
                onChangeText={setMessageText}
              />

              <View style={styles.dialogButtons}>
                <TouchableOpacity
                  style={styles.dialogBtnCancel}
                  onPress={() => { setIsMessaging(false); setMessageText(''); }}
                  disabled={sendingMessage}
                >
                  <Text style={styles.dialogBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialogBtnConfirm}
                  onPress={handleSendMessage}
                  disabled={sendingMessage || !messageText.trim()}
                >
                  <LinearGradient
                    colors={['#A855F7', '#7C3AED']}
                    style={styles.gradientBtn}
                  >
                    {sendingMessage ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.dialogBtnConfirmText}>Send</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* CUSTOM CONFIRMATION DIALOG (Theme matched and consistent on all screen sizes) */}
        {confirmAction && (
          <View style={styles.overlayContainer}>
            <View style={styles.dialogBox}>
              <View style={[styles.confirmIconContainer, { backgroundColor: confirmAction.type === 'delete' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(168, 85, 247, 0.1)' }]}>
                <Ionicons
                  name={confirmAction.type === 'delete' ? 'trash' : 'ban'}
                  size={28}
                  color={confirmAction.type === 'delete' ? '#EF4444' : '#A855F7'}
                />
              </View>
              <Text style={styles.dialogTitle}>{confirmAction.title}</Text>
              <Text style={styles.dialogDesc}>{confirmAction.desc}</Text>

              <View style={styles.dialogButtons}>
                <TouchableOpacity
                  style={styles.dialogBtnCancel}
                  onPress={() => setConfirmAction(null)}
                >
                  <Text style={styles.dialogBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dialogBtnConfirm}
                  onPress={confirmAction.onConfirm}
                >
                  <LinearGradient
                    colors={confirmAction.type === 'delete' ? ['#EF4444', '#DC2626'] : ['#A855F7', '#7C3AED']}
                    style={styles.gradientBtn}
                  >
                    <Text style={styles.dialogBtnConfirmText}>Confirm</Text>
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
  interestsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SCREEN_HEIGHT * 0.01,
  },
  modalSubtitle: {
    fontSize: ms(14, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_700Bold',
  },
  editBtnText: {
    fontSize: ms(13),
    color: '#A855F7',
    fontFamily: 'Inter_700Bold',
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addInterestContainer: {
    flexDirection: 'row',
    marginBottom: SCREEN_HEIGHT * 0.015,
    gap: s(8),
  },
  interestInput: {
    flex: 1,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 12,
    color: '#fff',
    paddingHorizontal: s(12),
    height: SCREEN_HEIGHT * 0.05,
    fontSize: ms(13),
    fontFamily: 'Inter_400Regular',
  },
  addInterestBtn: {
    width: SCREEN_HEIGHT * 0.05,
    height: SCREEN_HEIGHT * 0.05,
    borderRadius: 12,
    backgroundColor: '#A855F7',
    alignItems: 'center',
    justifyContent: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(4),
  },
  modalChipText: {
    fontSize: ms(12, 0.3),
    color: '#D1D5DB',
    fontFamily: 'Inter_500Medium',
  },
  removeChipBtn: {
    marginLeft: s(2),
  },
  noInterestsText: {
    color: '#4B5563',
    fontSize: ms(13),
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
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

  // Dialog Overlays (Percentage of screen width and height)
  overlayContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  dialogInput: {
    width: '100%',
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 14,
    color: '#fff',
    padding: wp(3),
    fontSize: ms(13.5),
    fontFamily: 'Inter_400Regular',
    textAlignVertical: 'top',
    height: hp(12),
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
  gradientBtn: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogBtnConfirmText: {
    color: '#FFF',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
});

export default UserDetailModal;
