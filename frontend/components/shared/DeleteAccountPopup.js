import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, wp, hp, SCREEN_HEIGHT } from '../../utils/responsive';

const DELETION_REASONS = [
  { id: 'not_hear', label: 'Not able to hear listener' },
  { id: 'abusive', label: 'Abusive language' },
  { id: 'not_polite', label: 'Listener not polite' },
  { id: 'not_interested', label: 'Listener not interested' },
  { id: 'asked_money', label: 'Asked for money' },
  { id: 'other', label: 'Other' },
];

const DELETION_INFO = [
  [
    { text: 'Your account information will be kept for ' },
    { text: '30 days', bold: true },
    { text: ' after your deletion request. If you do not log in during this period, your account will be permanently deleted.' },
  ],
  [
    { text: 'Once your account is permanently deleted, you ' },
    { text: 'cannot log in or recover your account', bold: true },
    { text: '.' },
  ],
  [
    { text: 'After deletion, your personal information, profile, wallet balance, transaction history, coins, and other account data will be permanently removed, except where we are required by law to retain certain records.' },
  ],
  [
    { text: 'Unused coins, wallet balance, rewards, or credits will not be refunded', bold: true },
    { text: ' and will be permanently forfeited after your account is deleted.' },
  ],
  [
    { text: 'If your account is under investigation for fraud, abuse, illegal activity, or a legal request, Mingo may delay or deny the deletion request until the investigation is complete.' },
  ],
  [
    { text: 'Deleting your account ' },
    { text: 'does not release you from any legal obligations or liabilities', bold: true },
    { text: ' arising from your use of the platform before deletion.' },
  ],
];

export default function DeleteAccountPopup({ visible, onClose, onConfirm, isDeleting = false }) {
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState('');
  const [showMore, setShowMore] = useState(false);

  const scrollViewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setCustomReason('');
      setShowMore(false);
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SCREEN_HEIGHT, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedReason === 'other') {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  }, [selectedReason]);

  const handleConfirm = useCallback(() => {
    const reason = selectedReason === 'other'
      ? customReason.trim()
      : DELETION_REASONS.find(r => r.id === selectedReason)?.label || '';
    onConfirm(reason);
  }, [selectedReason, customReason, onConfirm]);

  const canConfirm = !!selectedReason && (selectedReason !== 'other' || customReason.trim().length > 0);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[st.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={StyleSheet.absoluteFill}
        pointerEvents="box-none"
      >
        <Animated.View style={[st.popupContainer, { transform: [{ translateY: slideAnim }], maxHeight: '90%' }]}>
          <LinearGradient
            colors={['#1A0505', '#0D0D10', '#000']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[st.popup, { maxHeight: '100%' }]}
          >
            {/* Close Button */}
            <TouchableOpacity style={st.closeBtn} activeOpacity={0.7} onPress={onClose}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <ScrollView
              ref={scrollViewRef}
              style={{ width: '100%' }}
              contentContainerStyle={st.scrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Icon */}
              <View style={st.iconCircle}>
                <Ionicons name="trash" size={wp(8)} color="#EF4444" />
              </View>

              <Text style={st.title}>Delete Account</Text>

              {/* Deletion Information */}
              <View style={st.infoContainer}>
                <Text style={st.infoHeaderText}>Before you delete your account, please read the following:</Text>
                
                {(showMore ? DELETION_INFO : DELETION_INFO.slice(0, 3)).map((info, index) => (
                  <View key={index} style={st.infoItem}>
                    <Ionicons name="close-circle" size={wp(4)} color="#EF4444" style={st.infoIcon} />
                    <Text style={st.infoText}>
                      {info.map((part, i) => (
                        <Text key={i} style={part.bold ? st.infoTextBold : null}>{part.text}</Text>
                      ))}
                    </Text>
                  </View>
                ))}

                <TouchableOpacity 
                  style={st.viewMoreBtn}
                  onPress={() => setShowMore(!showMore)}
                  activeOpacity={0.7}
                >
                  <Text style={st.viewMoreText}>{showMore ? 'View less' : 'View more'}</Text>
                  <Ionicons name={showMore ? "chevron-up" : "chevron-down"} size={wp(4)} color="#9CA3AF" />
                </TouchableOpacity>

                <Text style={st.infoFooter}>
                  For more information, please refer to our{'\n'}
                  <Text style={st.linkText} onPress={() => Linking.openURL('https://www.talkmingo.com/privacy-policy')}>Privacy Policy</Text> and{' '}
                  <Text style={st.linkText} onPress={() => Linking.openURL('https://www.talkmingo.com/terms')}>Terms of Service</Text>
                </Text>
              </View>

              {/* Reason Selection */}
              <Text style={st.reasonTitle}>Please select at least one reason for deleting your account</Text>
              
              <View style={st.reasonsContainer}>
                {DELETION_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.id}
                    style={[st.reasonChip, selectedReason === reason.id && st.reasonChipActive]}
                    onPress={() => setSelectedReason(reason.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[st.reasonChipText, selectedReason === reason.id && st.reasonChipTextActive]}>
                      {reason.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Custom reason input */}
              {selectedReason === 'other' && (
                <View style={st.inputBox}>
                  <TextInput
                    style={st.input}
                    placeholder="Please specify..."
                    placeholderTextColor="#4B5563"
                    value={customReason}
                    onChangeText={setCustomReason}
                    multiline
                    maxLength={300}
                    textAlignVertical="top"
                    onFocus={() => {
                      setTimeout(() => {
                        scrollViewRef.current?.scrollToEnd({ animated: true });
                      }, 150);
                    }}
                  />
                </View>
              )}

              {/* Help Text */}
              <Text style={st.helpText}>
                Need help? Please write to:{' '}
                <Text style={st.helpEmail} onPress={() => Linking.openURL('mailto:support@talkmingo.com')}>
                  support@talkmingo.com
                </Text>
              </Text>

              {/* Delete Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleConfirm}
                disabled={!canConfirm || isDeleting}
                style={[st.btnWrap, (!canConfirm || isDeleting) && { opacity: 0.4 }]}
              >
                <LinearGradient
                  colors={['#EF4444', '#B91C1C']}
                  style={st.actionBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={st.actionBtnText}>Delete Account</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </LinearGradient>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const st = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 1000,
  },
  popupContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1001,
  },
  popup: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: wp(6),
    paddingTop: hp(3.5),
    paddingBottom: hp(2),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  closeBtn: {
    position: 'absolute',
    top: hp(1.8),
    right: wp(6),
    width: wp(8),
    height: wp(8),
    borderRadius: wp(4),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: wp(16),
    height: wp(16),
    borderRadius: wp(8),
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  title: {
    fontSize: ms(22),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: hp(1.5),
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  infoContainer: {
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.1)',
  },
  infoHeaderText: {
    color: '#FCA5A5',
    fontSize: ms(13),
    fontFamily: 'Inter_600SemiBold',
    marginBottom: hp(1),
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: hp(1),
    alignItems: 'flex-start',
  },
  infoIcon: {
    marginTop: 3,
    marginRight: wp(2),
  },
  infoText: {
    color: '#F3F4F6',
    fontSize: ms(12),
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(18),
    flex: 1,
  },
  infoTextBold: {
    color: '#FCA5A5',
    fontFamily: 'Inter_700Bold',
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: hp(0.5),
    gap: wp(1),
  },
  viewMoreText: {
    color: '#9CA3AF',
    fontSize: ms(12),
    fontFamily: 'Inter_500Medium',
  },
  infoFooter: {
    color: '#9CA3AF',
    fontSize: ms(11),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginTop: hp(1.5),
  },
  linkText: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  reasonTitle: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_600SemiBold',
    marginBottom: hp(1.5),
    textAlign: 'center',
  },
  reasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(3),
    justifyContent: 'center',
    marginBottom: hp(2),
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: hp(3),
  },
  reasonChip: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.2),
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  reasonChipActive: {
    backgroundColor: 'rgba(239,68,68,0.15)',
    borderColor: '#EF4444',
  },
  reasonChipText: {
    color: '#9CA3AF',
    fontSize: ms(12),
    fontFamily: 'Inter_500Medium',
  },
  reasonChipTextActive: {
    color: '#FCA5A5',
  },
  inputBox: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    height: hp(10),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    marginBottom: hp(1.5),
  },
  input: {
    color: '#fff',
    fontSize: ms(13),
    fontFamily: 'Inter_400Regular',
    height: '100%',
    textAlignVertical: 'top',
    padding: 0,
    margin: 0,
  },
  helpText: {
    color: '#6B7280',
    fontSize: ms(12),
    fontFamily: 'Inter_400Regular',
    marginBottom: hp(2),
    textAlign: 'center',
  },
  helpEmail: {
    color: '#3B82F6',
    textDecorationLine: 'underline',
  },
  btnWrap: {
    width: '100%',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.8),
    borderRadius: 24,
    gap: wp(2),
  },
  actionBtnText: {
    color: '#fff',
    fontSize: ms(16),
    fontFamily: 'Inter_700Bold',
  },
});
