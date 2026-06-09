import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Dimensions, KeyboardAvoidingView, Platform, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { userAPI } from '../../utils/api';

const { width: SW, height: SH } = Dimensions.get('window');

const REPORT_CATEGORIES = [
  { id: 'harassment', label: 'Harassment', icon: 'hand-left-outline' },
  { id: 'inappropriate_content', label: 'Inappropriate Content', icon: 'eye-off-outline' },
  { id: 'spam', label: 'Spam', icon: 'mail-unread-outline' },
  { id: 'hate_speech', label: 'Hate Speech', icon: 'megaphone-outline' },
  { id: 'fraud', label: 'Fraud / Scam', icon: 'warning-outline' },
  { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function ReportUserPopup({ visible, onClose, reportedUserId, reportType = 'user_report', sessionId = null, userName = 'this user' }) {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const slideAnim = useRef(new Animated.Value(SH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setSelectedCategory(null);
      setMessage('');
      setShowSuccess(false);
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

  const handleSubmit = async () => {
    if (!selectedCategory) return;

    setIsSending(true);
    try {
      await userAPI.submitReport({
        reportedUserId,
        category: selectedCategory,
        message: message.trim() || `Reported for: ${REPORT_CATEGORIES.find(c => c.id === selectedCategory)?.label}`,
        reportType,
        sessionId,
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Report failed:', err);
    } finally {
      setIsSending(false);
    }
  };

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View style={[st.overlay, { opacity: overlayAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>
      <Animated.View style={[st.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
        <LinearGradient
          colors={['#1A0505', '#0D0D10', '#000']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={st.popup}
        >
          {/* Close Button */}
          <TouchableOpacity style={st.closeBtn} activeOpacity={0.7} onPress={onClose}>
            <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          {showSuccess ? (
            <View style={st.successContainer}>
              <View style={[st.iconCircle, { backgroundColor: 'rgba(16,185,129,0.1)', borderColor: 'rgba(16,185,129,0.2)' }]}>
                <Ionicons name="checkmark-circle" size={36} color="#10B981" />
              </View>
              <Text style={st.title}>Report Submitted</Text>
              <Text style={st.description}>
                Thank you for helping keep Mingo safe. Our team will review this report shortly.
              </Text>
            </View>
          ) : (
            <>
              {/* Header */}
              <View style={st.iconCircle}>
                <Ionicons name="flag" size={32} color="#EF4444" />
              </View>
              <Text style={st.title}>Report {userName}</Text>
              <Text style={st.description}>
                Select a reason for reporting. This helps our safety team take appropriate action.
              </Text>

              {/* Categories */}
              <View style={st.categoriesGrid}>
                {REPORT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[st.categoryItem, selectedCategory === cat.id && st.categoryItemActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cat.icon}
                      size={SW * 0.045}
                      color={selectedCategory === cat.id ? '#EF4444' : '#9CA3AF'}
                    />
                    <Text style={[st.categoryLabel, selectedCategory === cat.id && st.categoryLabelActive]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Optional Message */}
              <View style={st.inputBox}>
                <TextInput
                  style={st.input}
                  placeholder="Add more details (optional)..."
                  placeholderTextColor="#4B5563"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleSubmit}
                disabled={!selectedCategory || isSending}
                style={[st.submitBtnWrap, (!selectedCategory || isSending) && { opacity: 0.5 }]}
              >
                <LinearGradient
                  colors={['#EF4444', '#B91C1C']}
                  style={st.submitBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {isSending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={SW * 0.04} color="#fff" />
                      <Text style={st.submitBtnText}>Submit Report</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}
        </LinearGradient>
      </Animated.View>
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
    paddingBottom: SH * 0.05,
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
  successContainer: {
    alignItems: 'center',
    paddingVertical: SH * 0.02,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
    rowGap: SH * 0.012,
    marginBottom: SH * 0.02,
  },
  categoryItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SH * 0.015,
    paddingHorizontal: SW * 0.035,
    borderRadius: SW * 0.03,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    gap: SW * 0.02,
  },
  categoryItemActive: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderColor: 'rgba(239,68,68,0.35)',
  },
  categoryLabel: {
    color: '#9CA3AF',
    fontSize: SW * 0.031,
    fontFamily: 'Inter_500Medium',
    flex: 1,
  },
  categoryLabelActive: {
    color: '#FCA5A5',
  },
  inputBox: {
    width: '100%',
    backgroundColor: '#000',
    borderRadius: SW * 0.03,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    height: SH * 0.1,
    paddingHorizontal: SW * 0.035,
    paddingVertical: SH * 0.012,
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
  submitBtnWrap: {
    width: '100%',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SH * 0.018,
    borderRadius: SW * 0.04,
    gap: SW * 0.02,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: SW * 0.038,
    fontFamily: 'Inter_700Bold',
  },
});
