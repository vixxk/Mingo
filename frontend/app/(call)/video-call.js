import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';


import SafetyPopup from '../../components/call/SafetyPopup';

const ZEGO_APP_ID = 1957677411;
const ZEGO_APP_SIGN = 'e418346446c1260bec2887b9fd53391119da27de7328f14d9da229cb7e1d6703';

export default function VideoCallScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { name = 'Listener', callId = 'test_call_id' } = useLocalSearchParams();
  const [showSafety, setShowSafety] = useState(true);

  
  const userID = useRef(`user_${Math.floor(Math.random() * 10000)}`).current;
  const userName = useRef(`User_${Math.floor(Math.random() * 10000)}`).current;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {}
      {}

      {}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 20, marginBottom: 20 }}>Video Call Mock</Text>
        <Text style={{ color: '#9CA3AF', marginBottom: 40 }}>ZegoCloud disabled for Expo Go</Text>
        <TouchableOpacity 
          style={{ backgroundColor: '#EF4444', padding: 15, borderRadius: 30 }}
          onPress={() => router.replace({ pathname: '/(call)/call-feedback', params: { name } })}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>End Call Demo</Text>
        </TouchableOpacity>
      </View>

      {showSafety && <SafetyPopup visible={showSafety} onDismiss={() => setShowSafety(false)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
