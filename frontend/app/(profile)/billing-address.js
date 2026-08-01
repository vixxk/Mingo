import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ms, s, vs, hp, wp } from '../../utils/responsive';

export default function BillingAddressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 0, backgroundColor: '#000' }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={hp(3.2)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Billing Address</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.placeholderIcon}>
          <Ionicons name="location-outline" size={hp(6)} color="#374151" />
        </View>
        <Text style={styles.placeholderTitle}>Coming Soon</Text>
        <Text style={styles.placeholderSub}>
          Billing address will be available here soon.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  backBtn: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: ms(18, 0.3),
    fontWeight: '800',
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  headerSpacer: {
    width: wp(9),
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(8),
  },
  placeholderIcon: {
    width: hp(14),
    height: hp(14),
    borderRadius: hp(7),
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(2),
  },
  placeholderTitle: {
    fontSize: ms(17, 0.3),
    color: '#E5E7EB',
    fontFamily: 'Inter_700Bold',
    marginBottom: hp(0.8),
  },
  placeholderSub: {
    fontSize: ms(13, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },
});
