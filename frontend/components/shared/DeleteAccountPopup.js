import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, ActivityIndicator, TextInput, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

const { width: SW, height: SH } = Dimensions.get('window');

const DELETION_REASONS = [
  { id: 'not_useful', label: 'App is not useful for me' },
  { id: 'privacy', label: 'Privacy concerns' },
  { id: 'too_expensive', label: 'Too expensive' },
  { id: 'bad_experience', label: 'Bad experience with a user' },
  { id: 'found_alternative', label: 'Found a better alternative' },
  { id: 'other', label: 'Other reason' },
];

export default function DeleteAccountPopup({ visible, onClose, onConfirm, isDeleting = false }) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const [selectedReason, setSelectedReason] = useState(null);
  const [customReason, setCustomReason] = useState('');
  const [step, setStep] = useState(1); // 1 = reason selection, 2 = confirmation

  const scrollViewRef = useRef(null);
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSelectedReason(null);
      setCustomReason('');
      setStep(1);
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: SH, duration: 200, useNativeDriver: true }),
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

  const handleNext = () => {
    if (!selectedReason) return;
    setStep(2);
  };

  const handleConfirm = () => {
    const reason = selectedReason === 'other'
      ? customReason.trim() || 'Other reason'
      : DELETION_REASONS.find(r => r.id === selectedReason)?.label || '';
    onConfirm(reason);
  };

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
        <Animated.View style={[st.popupContainer, { transform: [{ translateY: slideAnim }], maxHeight: '85%' }]}>
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
              contentContainerStyle={{ alignItems: 'center', paddingBottom: windowHeight * 0.03 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {/* Icon */}
              <View style={st.iconCircle}>
                <Ionicons name={step === 1 ? "trash" : "alert-circle"} size={32} color="#EF4444" />
              </View>

              {step === 1 ? (
                <>
                  <Text style={st.title}>Delete Account</Text>
                  <Text style={st.description}>
                    We're sorry to see you go. Please tell us why you want to delete your account.
                  </Text>

                  {/* Reasons */}
                  <View style={st.reasonsList}>
                    {DELETION_REASONS.map((reason) => (
                      <TouchableOpacity
                        key={reason.id}
                        style={[st.reasonItem, selectedReason === reason.id && st.reasonItemActive]}
                        onPress={() => setSelectedReason(reason.id)}
                        activeOpacity={0.7}
                      >
                        <View style={[st.radioOuter, selectedReason === reason.id && st.radioOuterActive]}>
                          {selectedReason === reason.id && <View style={st.radioInner} />}
                        </View>
                        <Text style={[st.reasonLabel, selectedReason === reason.id && st.reasonLabelActive]}>
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

                  {/* Next Button */}
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleNext}
                    disabled={!selectedReason}
                    style={[st.btnWrap, !selectedReason && { opacity: 0.4 }]}
                  >
                    <LinearGradient
                      colors={['#EF4444', '#B91C1C']}
                      style={st.actionBtn}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    >
                      <Text style={st.actionBtnText}>Continue</Text>
                      <Ionicons name="arrow-forward" size={SW * 0.04} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={st.title}>Are you sure?</Text>
                  <Text style={st.description}>
                    This action is permanent. You will lose your profile, chat history, favourite listeners, and any remaining coins. This cannot be undone.
                  </Text>

                  <View style={st.warningBox}>
                    <Ionicons name="warning" size={SW * 0.045} color="#F59E0B" />
                    <Text style={st.warningText}>
                      All your data will be permanently removed from Mingo.
                    </Text>
                  </View>

                  <View style={st.buttonRow}>
                    <TouchableOpacity
                      style={st.cancelBtn}
                      activeOpacity={0.7}
                      onPress={onClose}
                    >
                      <Text style={st.cancelText}>Cancel</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={st.deleteBtn}
                      activeOpacity={0.85}
                      onPress={handleConfirm}
                      disabled={isDeleting}
                    >
                      <LinearGradient
                        colors={['#EF4444', '#991B1B']}
                        style={st.deleteBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={st.deleteBtnText}>Delete Forever</Text>
                        )}
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </>
              )}
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
    paddingHorizontal: SW * 0.06,
    paddingTop: SH * 0.035,
    paddingBottom: SH * 0.02,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  closeBtn: {
    position: 'absolute',
    top: SH * 0.018,
    right: SW * 0.06,
    width: SW * 0.08,
    height: SW * 0.08,
    borderRadius: SW * 0.04,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: SW * 0.16,
    height: SW * 0.16,
    borderRadius: SW * 0.08,
    backgroundColor: 'rgba(239,68,68,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SH * 0.015,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.2)',
  },
  title: {
    fontSize: SW * 0.055,
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: SH * 0.008,
    textAlign: 'center',
  },
  description: {
    fontSize: SW * 0.034,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: SW * 0.052,
    marginBottom: SH * 0.02,
  },
  reasonsList: {
    width: '100%',
    gap: SH * 0.01,
    marginBottom: SH * 0.015,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SH * 0.015,
    paddingHorizontal: SW * 0.04,
    borderRadius: SW * 0.03,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: SW * 0.03,
  },
  reasonItemActive: {
    backgroundColor: 'rgba(239,68,68,0.08)',
    borderColor: 'rgba(239,68,68,0.3)',
  },
  radioOuter: {
    width: SW * 0.05,
    height: SW * 0.05,
    borderRadius: SW * 0.025,
    borderWidth: 2,
    borderColor: '#4B5563',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#EF4444',
  },
  radioInner: {
    width: SW * 0.025,
    height: SW * 0.025,
    borderRadius: SW * 0.0125,
    backgroundColor: '#EF4444',
  },
  reasonLabel: {
    color: '#9CA3AF',
    fontSize: SW * 0.035,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  reasonLabelActive: {
    color: '#FCA5A5',
  },
  inputBox: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: SW * 0.03,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    height: SH * 0.08,
    paddingHorizontal: SW * 0.035,
    paddingVertical: SH * 0.01,
    marginBottom: SH * 0.015,
  },
  input: {
    color: '#fff',
    fontSize: SW * 0.034,
    fontFamily: 'Inter_400Regular',
    height: '100%',
    textAlignVertical: 'top',
    padding: 0,
    margin: 0,
  },
  btnWrap: {
    width: '100%',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SH * 0.018,
    borderRadius: SW * 0.04,
    gap: SW * 0.02,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: SW * 0.04,
    fontFamily: 'Inter_700Bold',
  },
  warningBox: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: SW * 0.03,
    paddingVertical: SH * 0.015,
    paddingHorizontal: SW * 0.04,
    gap: SW * 0.025,
    marginBottom: SH * 0.025,
  },
  warningText: {
    color: '#FCD34D',
    fontSize: SW * 0.032,
    fontFamily: 'Inter_400Regular',
    flex: 1,
    lineHeight: SW * 0.048,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SW * 0.03,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    height: SH * 0.065,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelText: {
    fontSize: SW * 0.038,
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
  },
  deleteBtn: {
    flex: 1.2,
    height: SH * 0.065,
    borderRadius: 16,
    overflow: 'hidden',
  },
  deleteBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnText: {
    fontSize: SW * 0.038,
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
});
