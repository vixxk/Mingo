import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, hp, wp } from '../../utils/responsive';
import { userAPI } from '../../utils/api';
import StatusPopup from '../../components/shared/StatusPopup';

export default function BillingAddressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [popup, setPopup] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onClose: null,
  });

  useEffect(() => {
    const loadAddress = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const userObj = JSON.parse(userStr);
          if (userObj.billingAddress) setAddress(userObj.billingAddress);
        }
      } catch (e) {
        console.error('Error loading billing address:', e);
      } finally {
        setIsLoading(false);
      }
    };
    loadAddress();
  }, []);

  const handleSave = async () => {
    if (!address.trim()) {
      setPopup({
        visible: true,
        type: 'error',
        title: 'Empty Address',
        message: 'Please enter your billing address before saving.',
        onClose: () => setPopup((prev) => ({ ...prev, visible: false })),
      });
      return;
    }

    setIsSaving(true);
    try {
      await userAPI.updateProfile({ billingAddress: address.trim() });
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const userObj = JSON.parse(userStr);
        userObj.billingAddress = address.trim();
        await AsyncStorage.setItem('user', JSON.stringify(userObj));
      }
      setPopup({
        visible: true,
        type: 'success',
        title: 'Address Saved',
        message: 'Your billing address has been saved successfully.',
        onClose: () => {
          setPopup((prev) => ({ ...prev, visible: false }));
          router.back();
        },
      });
    } catch (e) {
      console.error('Save error:', e);
      setPopup({
        visible: true,
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to save billing address. Please check your connection and try again.',
        onClose: () => setPopup((prev) => ({ ...prev, visible: false })),
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['transparent', '#1A0000', '#4A0000']}
        locations={[0, 0.6, 1]}
        style={styles.bgGradient}
      />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={wp(5.5)} color="#fff" />
          <Text style={styles.headerTitle}>Billing Address</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerRow}>
            <View style={styles.iconBox}>
              <Ionicons name="location-outline" size={wp(6)} color="#F87171" />
            </View>
            <View style={styles.headerTextWrap}>
              <Text style={styles.subtitle}>
                Add the address used for your wallet recharges and invoices.
              </Text>
            </View>
          </View>

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your full billing address..."
            placeholderTextColor="#6B7280"
            value={address}
            onChangeText={setAddress}
            multiline
            maxLength={500}
            editable={!isLoading}
            textAlignVertical="top"
          />
          <Text style={styles.charCount}>{address.length}/500</Text>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={isSaving}
          >
            <LinearGradient
              colors={['#DC2626', '#991B1B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveBtn}
            >
              {isSaving ? (
                <Text style={styles.saveBtnText}>Saving...</Text>
              ) : (
                <>
                  <Ionicons name="save-outline" size={wp(4.5)} color="#fff" style={styles.saveIcon} />
                  <Text style={styles.saveBtnText}>Save Address</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <StatusPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={popup.onClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  bgGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: hp(45),
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
  },
  headerTitle: {
    fontSize: wp(5.5),
    color: '#fff',
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  content: {
    paddingHorizontal: wp(5),
    paddingTop: hp(3),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(2.5),
  },
  iconBox: {
    width: wp(13),
    height: wp(13),
    borderRadius: wp(6.5),
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  headerTextWrap: {
    flex: 1,
    marginLeft: wp(3),
  },
  subtitle: {
    fontSize: ms(12.5, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    lineHeight: ms(18),
  },
  label: {
    fontSize: ms(13, 0.3),
    color: '#fff',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: hp(0.8),
  },
  input: {
    color: '#fff',
    fontSize: ms(14, 0.3),
    fontFamily: 'Inter_400Regular',
    height: hp(10),
    textAlignVertical: 'bottom',
    paddingVertical: hp(1),
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(239, 68, 68, 0.35)',
  },
  charCount: {
    fontSize: ms(10, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    alignSelf: 'flex-end',
    marginTop: hp(0.8),
    marginBottom: hp(2),
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.8),
    borderRadius: wp(4),
  },
  saveIcon: {
    marginRight: wp(2),
  },
  saveBtnText: {
    color: '#fff',
    fontSize: ms(15, 0.3),
    fontFamily: 'Inter_700Bold',
  },
});
