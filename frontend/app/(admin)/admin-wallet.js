import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { adminAPI } from '../../utils/api';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';

export default function AdminWallet() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [packages, setPackages] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [pkgRes, setRes] = await Promise.all([
        adminAPI.getCoinPackages(),
        adminAPI.getSettings()
      ]);
      setPackages(pkgRes.data || []);
      setSettings(setRes.data || {});
    } catch (e) {
      console.error('Failed to load wallet data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleUpdatePackage = (index, field, value) => {
    const newPackages = [...packages];
    newPackages[index][field] = field === 'price' || field === 'coins' ? Number(value) : value;
    setPackages(newPackages);
  };

  const handleTogglePopular = (index) => {
    const newPackages = packages.map((pkg, i) => ({
      ...pkg,
      isPopular: i === index ? !pkg.isPopular : false // Only one can be popular
    }));
    setPackages(newPackages);
  };

  const savePackages = async () => {
    try {
      setSaving(true);
      await adminAPI.updateCoinPackages(packages);
      Alert.alert('Success', 'Coin packages updated successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to update packages');
    } finally {
      setSaving(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await adminAPI.updateSettings(settings);
      Alert.alert('Success', 'Wallet settings updated successfully');
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
        <AdminPageSkeleton type="wallet" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet & Coins</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionTitle}>Coin Packages</Text>
        {packages.map((pkg, index) => (
          <View key={index} style={styles.packageCard}>
            <View style={styles.packageHeader}>
              <Text style={styles.packageLabel}>Package {index + 1}</Text>
              <View style={styles.idBadge}>
                <Text style={styles.idText}>ID: {pkg.id}</Text>
              </View>
            </View>
            
            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Coins</Text>
                <TextInput
                  style={styles.input}
                  value={pkg.coins?.toString()}
                  onChangeText={(v) => handleUpdatePackage(index, 'coins', v)}
                  keyboardType="numeric"
                  color="#fff"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Sale Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={pkg.price?.toString()}
                  onChangeText={(v) => handleUpdatePackage(index, 'price', v)}
                  keyboardType="numeric"
                  color="#fff"
                />
              </View>
            </View>

            <View style={[styles.inputRow, { marginTop: hp(1.5) }]}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Original Price (₹)</Text>
                <TextInput
                  style={styles.input}
                  value={pkg.originalPrice?.toString()}
                  onChangeText={(v) => handleUpdatePackage(index, 'originalPrice', v)}
                  keyboardType="numeric"
                  color="#fff"
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Discount (%)</Text>
                <TextInput
                  style={styles.input}
                  value={pkg.discount?.toString()}
                  onChangeText={(v) => handleUpdatePackage(index, 'discount', v)}
                  keyboardType="numeric"
                  color="#fff"
                />
              </View>
            </View>

            <View style={{ marginTop: hp(1.5) }}>
              <Text style={styles.inputLabel}>Badge Tag (e.g. Most Popular)</Text>
              <TextInput
                style={styles.input}
                value={pkg.tag}
                onChangeText={(v) => handleUpdatePackage(index, 'tag', v)}
                placeholder="No tag"
                placeholderTextColor="#4B5563"
                color="#fff"
              />
            </View>
          </View>
        ))}
        
        <TouchableOpacity style={styles.saveBtn} onPress={savePackages} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Packages</Text>}
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={styles.sectionTitle}>Global Wallet Settings</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Coin to Diamond Ratio (1:X)</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.coinToDiamondRatio?.toString()}
              onChangeText={(v) => setSettings({ ...settings, coinToDiamondRatio: Number(v) })}
              keyboardType="numeric"
              color="#fff"
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Diamond to INR Ratio (1:X)</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.diamondToInrRatio?.toString()}
              onChangeText={(v) => setSettings({ ...settings, diamondToInrRatio: Number(v) })}
              keyboardType="numeric"
              color="#fff"
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Commission %</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.commissionPercentage?.toString()}
              onChangeText={(v) => setSettings({ ...settings, commissionPercentage: Number(v) })}
              keyboardType="numeric"
              color="#fff"
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Min Withdrawal (₹)</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.minWithdrawalLimit?.toString()}
              onChangeText={(v) => setSettings({ ...settings, minWithdrawalLimit: Number(v) })}
              keyboardType="numeric"
              color="#fff"
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10B981' }]} onPress={saveSettings} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Wallet Settings</Text>}
        </TouchableOpacity>

        <View style={{ height: hp(10) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: wp(3),
  },
  headerTitle: {
    flex: 1,
    fontSize: ms(20),
    color: '#fff',
    fontFamily: 'Inter_900Black',
  },
  scrollContent: { padding: wp(4) },
  sectionTitle: { fontSize: ms(18), color: '#fff', fontFamily: 'Inter_800ExtraBold', marginBottom: hp(2), marginTop: hp(1) },
  packageCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  packageHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: hp(1.5) },
  packageLabel: { color: '#A855F7', fontSize: ms(14), fontFamily: 'Inter_700Bold' },
  popularRow: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  popularText: { color: '#9CA3AF', fontSize: ms(12) },
  inputRow: { flexDirection: 'row', gap: wp(4) },
  inputGroup: { flex: 1 },
  inputLabel: { color: '#4B5563', fontSize: ms(10), marginBottom: hp(0.5) },
  input: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: wp(3),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  saveBtn: {
    backgroundColor: '#A855F7',
    padding: hp(2),
    borderRadius: 16,
    alignItems: 'center',
    marginTop: hp(1),
    marginBottom: hp(2),
  },
  saveBtnText: { color: '#fff', fontSize: ms(16), fontFamily: 'Inter_700Bold' },
  divider: { height: 1, backgroundColor: '#1A1A1A', marginVertical: hp(2) },
  settingsCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#141414',
  },
  settingLabel: { color: '#D1D5DB', fontSize: ms(14), flex: 1 },
  idBadge: {
    backgroundColor: '#1F1F1F',
    paddingHorizontal: s(8),
    paddingVertical: vs(2),
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#333',
  },
  idText: {
    color: '#9CA3AF',
    fontSize: ms(10),
    fontFamily: 'Inter_700Bold',
  },
  settingInput: {
    backgroundColor: '#141414',
    borderRadius: 8,
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.5),
    width: wp(25),
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
});
