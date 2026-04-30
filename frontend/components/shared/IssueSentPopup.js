import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function IssueSentPopup({ visible, onClose, title = "Issue Sent", description = "Your report has been received. Our team will look into it shortly and resolve it as soon as possible." }) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={st.overlay}>
        <View style={st.modalContent}>
          <TouchableOpacity onPress={onClose} style={st.closeBtn}>
            <Ionicons name="close" size={width * 0.05} color="#9CA3AF" />
          </TouchableOpacity>
          <View style={st.iconContainer}>
            <Ionicons name="checkmark-circle" size={width * 0.15} color="#22C55E" />
          </View>
          <Text style={st.title}>{title}</Text>
          <Text style={st.description}>
            {description}
          </Text>
          
          <TouchableOpacity activeOpacity={0.8} onPress={onClose} style={st.btnWrapper}>
            <LinearGradient
              colors={['#22C55E', '#16A34A']}
              style={st.btn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={st.btnText}>Okay</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.85)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: '5%' 
  },
  modalContent: { 
    width: '85%', 
    backgroundColor: '#141414', 
    borderRadius: width * 0.06, 
    borderWidth: 1, 
    borderColor: '#1F1F1F', 
    padding: '6%',
    alignItems: 'center'
  },
  closeBtn: {
    position: 'absolute',
    top: width * 0.04,
    right: width * 0.04,
    width: width * 0.08,
    height: width * 0.08,
    borderRadius: width * 0.04,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  iconContainer: {
    width: width * 0.2,
    height: width * 0.2,
    borderRadius: width * 0.1,
    backgroundColor: 'rgba(34,197,94,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '5%'
  },
  title: { 
    fontSize: width * 0.055, 
    color: '#fff', 
    fontFamily: 'Inter_800ExtraBold',
    marginBottom: '3%',
    textAlign: 'center'
  },
  description: { 
    fontSize: width * 0.035, 
    color: '#9CA3AF', 
    fontFamily: 'Inter_400Regular', 
    textAlign: 'center',
    lineHeight: width * 0.05,
    marginBottom: '8%'
  },
  btnWrapper: {
    width: '100%'
  },
  btn: { 
    width: '100%',
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: '4%', 
    borderRadius: width * 0.04 
  },
  btnText: { 
    color: '#fff', 
    fontSize: width * 0.04, 
    fontFamily: 'Inter_700Bold' 
  }
});
