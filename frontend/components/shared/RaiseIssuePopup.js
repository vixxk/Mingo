import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, Dimensions, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import IssueSentPopup from './IssueSentPopup';

const { width: SW, height: SH } = Dimensions.get('window');

export default function RaiseIssuePopup({ visible, onClose }) {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please describe the issue before sending.');
      return;
    }

    setIsSending(true);
    try {
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      setShowSuccess(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to send report. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccess(false);
    setMessage('');
    onClose();
  };

  return (
    <>
      <Modal visible={visible && !showSuccess} transparent animationType="fade" statusBarTranslucent>
        <View style={st.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 20}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={st.modalContent}>
              {}
              <View style={st.header}>
                <View style={st.iconWrap}>
                  <Ionicons name="flag" size={SW * 0.06} color="#EF4444" />
                </View>
                <Text style={st.title}>Raise an Issue</Text>
                <TouchableOpacity onPress={onClose} style={st.closeBtn}>
                  <Ionicons name="close" size={SW * 0.05} color="#9CA3AF" />
                </TouchableOpacity>
              </View>

              <Text style={st.description}>
                Describe the problem you're facing. Our support team will resolve it as soon as possible.
              </Text>

              {}
              <View style={st.inputBox}>
                <TextInput
                  style={st.input}
                  placeholder="Type your issue here..."
                  placeholderTextColor="#4B5563"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  maxLength={500}
                  scrollEnabled={true}
                  textAlignVertical="top"
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
                  colors={['#EF4444', '#B91C1C']}
                  style={st.sendBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={st.sendBtnText}>{isSending ? 'Sending...' : 'Send Report'}</Text>
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
      />
    </>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: SW * 0.05 },
  modalContent: { width: '100%', backgroundColor: '#141414', borderRadius: SW * 0.06, borderWidth: 1, borderColor: '#1F1F1F', padding: SW * 0.05 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: SH * 0.02 },
  iconWrap: { width: SW * 0.1, height: SW * 0.1, borderRadius: SW * 0.05, backgroundColor: 'rgba(239,68,68,0.15)', justifyContent: 'center', alignItems: 'center', marginRight: SW * 0.03 },
  title: { flex: 1, fontSize: SW * 0.045, color: '#fff', fontFamily: 'Inter_800ExtraBold' },
  closeBtn: { width: SW * 0.08, height: SW * 0.08, borderRadius: SW * 0.04, backgroundColor: '#1F1F1F', justifyContent: 'center', alignItems: 'center' },
  description: { fontSize: SW * 0.035, color: '#9CA3AF', fontFamily: 'Inter_400Regular', lineHeight: SW * 0.05, marginBottom: SH * 0.025 },
  inputBox: {
    backgroundColor: '#000',
    borderRadius: SW * 0.03,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    height: SH * 0.18,
    paddingHorizontal: SW * 0.03,
    paddingVertical: SH * 0.015,
  },
  input: {
    color: '#fff',
    fontSize: SW * 0.035,
    fontFamily: 'Inter_400Regular',
    height: '100%',
    textAlignVertical: 'top',
    padding: 0,
    margin: 0,
  },
  sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SH * 0.018, borderRadius: SW * 0.04, gap: SW * 0.02 },
  sendBtnText: { color: '#fff', fontSize: SW * 0.038, fontFamily: 'Inter_700Bold' }
});
