import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { adminAPI } from '../../utils/api';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';

export default function SystemConfigScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    coinToDiamondRatio: '1',
    diamondToInrRatio: '1',
    commissionPercentage: '30',
    minWithdrawalLimit: '500',
    maintenanceMode: false,
    otpSettingsEnabled: true,
  });

  const loadSettings = async () => {
    try {
      const res = await adminAPI.getSettings();
      if (res?.data) {
        setSettings({
          coinToDiamondRatio: res.data.coinToDiamondRatio?.toString() || '1',
          diamondToInrRatio: res.data.diamondToInrRatio?.toString() || '1',
          commissionPercentage: res.data.commissionPercentage?.toString() || '30',
          minWithdrawalLimit: res.data.minWithdrawalLimit?.toString() || '500',
          maintenanceMode: res.data.maintenanceMode || false,
          otpSettingsEnabled: res.data.otpSettings?.enabled !== false,
        });
      }
    } catch (e) {
      console.log('Error loading settings', e);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [])
  );

  const handleSave = async () => {
    try {
      setSaving(true);
      const payload = {
        coinToDiamondRatio: parseFloat(settings.coinToDiamondRatio),
        diamondToInrRatio: parseFloat(settings.diamondToInrRatio),
        commissionPercentage: parseFloat(settings.commissionPercentage),
        minWithdrawalLimit: parseFloat(settings.minWithdrawalLimit),
        maintenanceMode: settings.maintenanceMode,
        otpSettings: { enabled: settings.otpSettingsEnabled, provider: 'firebase' }
      };
      await adminAPI.updateSettings(payload);
      Alert.alert('Success', 'System settings updated successfully.');
    } catch (e) {
      Alert.alert('Error', 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <AdminPageSkeleton type="list" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Config</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Conversion Rates</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Coin to Diamond Ratio (e.g. 1)</Text>
            <TextInput
              style={styles.input}
              value={settings.coinToDiamondRatio}
              onChangeText={(t) => setSettings(p => ({ ...p, coinToDiamondRatio: t }))}
              keyboardType="numeric"
              placeholderTextColor="#6B7280"
              color="#fff"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Diamond to INR Ratio (e.g. 1)</Text>
            <TextInput
              style={styles.input}
              value={settings.diamondToInrRatio}
              onChangeText={(t) => setSettings(p => ({ ...p, diamondToInrRatio: t }))}
              keyboardType="numeric"
              placeholderTextColor="#6B7280"
              color="#fff"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Limits & Commission</Text>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Platform Commission %</Text>
            <TextInput
              style={styles.input}
              value={settings.commissionPercentage}
              onChangeText={(t) => setSettings(p => ({ ...p, commissionPercentage: t }))}
              keyboardType="numeric"
              placeholderTextColor="#6B7280"
              color="#fff"
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Min Withdrawal Limit (₹)</Text>
            <TextInput
              style={styles.input}
              value={settings.minWithdrawalLimit}
              onChangeText={(t) => setSettings(p => ({ ...p, minWithdrawalLimit: t }))}
              keyboardType="numeric"
              placeholderTextColor="#6B7280"
              color="#fff"
            />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Toggles</Text>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>OTP Login</Text>
              <Text style={styles.switchSub}>Enable or disable Firebase OTP</Text>
            </View>
            <Switch
              value={settings.otpSettingsEnabled}
              onValueChange={(v) => setSettings(p => ({ ...p, otpSettingsEnabled: v }))}
              trackColor={{ false: '#374151', true: '#A855F7' }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Maintenance Mode</Text>
              <Text style={styles.switchSub}>Show under maintenance screen to users</Text>
            </View>
            <Switch
              value={settings.maintenanceMode}
              onValueChange={(v) => setSettings(p => ({ ...p, maintenanceMode: v }))}
              trackColor={{ false: '#374151', true: '#EF4444' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save Configuration'}</Text>
        </TouchableOpacity>
        <View style={{ height: hp(4) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: wp(4), paddingVertical: hp(1.5), borderBottomWidth: 1, borderBottomColor: '#1A1A1A' },
  backBtn: { marginRight: wp(4) },
  headerTitle: { fontSize: ms(20), color: '#fff', fontFamily: 'Inter_700Bold' },
  scrollView: { flex: 1 },
  scrollContent: { padding: wp(4) },
  card: { backgroundColor: '#0A0A0A', borderRadius: 20, padding: wp(4), marginBottom: hp(2), borderWidth: 1, borderColor: '#1F1F1F' },
  sectionTitle: { fontSize: ms(16), color: '#fff', fontFamily: 'Inter_700Bold', marginBottom: hp(2) },
  inputGroup: { marginBottom: hp(2) },
  label: { color: '#9CA3AF', fontSize: ms(12), fontFamily: 'Inter_500Medium', marginBottom: hp(1) },
  input: { backgroundColor: '#141414', borderRadius: 12, padding: wp(3), borderWidth: 1, borderColor: '#1F1F1F', color: '#fff', fontSize: ms(14) },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: hp(1) },
  switchLabel: { color: '#fff', fontSize: ms(14), fontFamily: 'Inter_600SemiBold' },
  switchSub: { color: '#6B7280', fontSize: ms(11), fontFamily: 'Inter_400Regular', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#1F1F1F', marginVertical: hp(1) },
  saveBtn: { backgroundColor: '#A855F7', padding: hp(2), borderRadius: 16, alignItems: 'center', marginTop: hp(2) },
  saveBtnText: { color: '#fff', fontSize: ms(16), fontFamily: 'Inter_700Bold' },
});
