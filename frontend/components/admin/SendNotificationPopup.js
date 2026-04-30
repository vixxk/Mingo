import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import IssueSentPopup from '../shared/IssueSentPopup';

const { width: SW, height: SH } = Dimensions.get('window');



const sendToBackend = async (payload) => {
  try {
    return { success: true };
  } catch (err) {
    throw err;
  }
};

export default function SendNotificationPopup({ visible, onClose }) {
  const [target, setTarget] = useState('all'); 
  const [heading, setHeading] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Validation Error', 'Message body is required to send a notification.');
      return;
    }

    setIsSending(true);
    try {
      
      await sendToBackend({
        target,
        title: heading.trim(),
        body: message.trim()
      });

      setShowSuccess(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to send notification.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setHeading('');
    setMessage('');
    setTarget('all');
    onClose();
  };

  return (
    <>
      <Modal visible={visible && !showSuccess} transparent animationType="fade" statusBarTranslucent>
        <View style={st.overlay}>
          <KeyboardAvoidingView 
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 20}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={st.modalContent}>
              {}
              <View style={st.header}>
                <View style={st.iconWrap}>
                  <Ionicons name="paper-plane" size={SW * 0.06} color="#A855F7" />
                </View>
                <Text style={st.title}>Send Notification</Text>
                <TouchableOpacity onPress={onClose} style={st.closeBtn}>
                  <Ionicons name="close" size={SW * 0.05} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              {}
              <Text style={st.label}>Send To</Text>
              <View style={st.targetWrap}>
                {['all', 'users', 'listeners'].map((t) => (
                  <TouchableOpacity
                    key={t}
                    activeOpacity={0.7}
                    style={[st.targetBtn, target === t && st.targetActive]}
                    onPress={() => setTarget(t)}
                  >
                    <Text style={[st.targetText, target === t && st.targetTextActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {}
              <Text style={st.label}>Heading (Optional)</Text>
              <View style={st.inputBox}>
                <TextInput
                  style={st.input}
                  placeholder="e.g., Special Offer! 🎉"
                  placeholderTextColor="#4B5563"
                  value={heading}
                  onChangeText={setHeading}
                  maxLength={50}
                />
              </View>

              {}
              <Text style={st.label}>Message Body <Text style={{ color: '#EF4444' }}>*</Text></Text>
              <View style={[st.inputBox, { height: SH * 0.12 }]}>
                <TextInput
                  style={[st.input, { height: '100%', textAlignVertical: 'top' }]}
                  placeholder="Write your message here..."
                  placeholderTextColor="#4B5563"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  scrollEnabled={true}
                  maxLength={200}
                />
              </View>

              {}
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={handleSend}
                disabled={isSending}
                style={{ marginTop: SH * 0.015 }}
              >
                <LinearGradient
                  colors={['#A855F7', '#7E22CE']}
                  style={st.sendBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={st.sendBtnText}>{isSending ? 'Sending...' : 'Send Push Notification'}</Text>
                  <Ionicons name="send" size={SW * 0.04} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      <IssueSentPopup 
        visible={showSuccess} 
        onClose={handleCloseSuccess} 
        title="Notification Sent"
        description={`Notification successfully sent to ${target === 'all' ? 'everyone' : target}!`}
      />
    </>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: SW * 0.05 },
  modalContent: { width: '100%', backgroundColor: '#141414', borderRadius: SW * 0.06, borderWidth: 1, borderColor: '#1F1F1F', padding: SW * 0.05 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SH * 0.025 },
  iconWrap: { width: SW * 0.1, height: SW * 0.1, borderRadius: SW * 0.05, backgroundColor: 'rgba(168,85,247,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: SW * 0.03 },
  title: { flex: 1, fontSize: SW * 0.045, color: '#fff', fontFamily: 'Inter_800ExtraBold' },
  closeBtn: { width: SW * 0.08, height: SW * 0.08, borderRadius: SW * 0.04, backgroundColor: '#1F1F1F', justifyContent: 'center', alignItems: 'center' },
  
  label: { fontSize: SW * 0.035, color: '#9CA3AF', fontFamily: 'Inter_600SemiBold', marginBottom: SH * 0.01, marginTop: SH * 0.015 },
  
  targetWrap: { flexDirection: 'row', backgroundColor: '#000', borderRadius: SW * 0.03, padding: SW * 0.01, borderWidth: 1, borderColor: '#1F1F1F' },
  targetBtn: { flex: 1, paddingVertical: SH * 0.01, alignItems: 'center', borderRadius: SW * 0.02 },
  targetActive: { backgroundColor: '#2D1B36' },
  targetText: { color: '#6B7280', fontSize: SW * 0.035, fontFamily: 'Inter_600SemiBold' },
  targetTextActive: { color: '#A855F7' },
  
  inputBox: { backgroundColor: '#000', borderRadius: SW * 0.03, borderWidth: 1, borderColor: '#1F1F1F', paddingHorizontal: SW * 0.03, paddingVertical: SH * 0.015 },
  input: { color: '#fff', fontSize: SW * 0.035, fontFamily: 'Inter_400Regular', padding: 0, margin: 0 },
  
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SH * 0.018, borderRadius: SW * 0.04, gap: SW * 0.02 },
  sendBtnText: { color: '#fff', fontSize: SW * 0.038, fontFamily: 'Inter_700Bold' }
});
