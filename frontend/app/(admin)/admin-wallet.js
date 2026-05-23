import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
  Animated,
  Dimensions,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { adminAPI } from '../../utils/api';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';

function WalletPopup({ visible, type, title, message, onClose }) {
  const slideAnim = useRef(new Animated.Value(400)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  const isSuccess = type === 'success';
  const themeColors = isSuccess 
    ? ['#064E3B', '#022C22', '#000'] 
    : ['#4A1D1D', '#2D1010', '#000'];
  const iconName = isSuccess ? 'checkmark-circle' : 'close-circle';
  const iconColor = isSuccess ? '#10B981' : '#EF4444';
  const btnColors = isSuccess ? ['#10B981', '#059669'] : ['#EF4444', '#B91C1C'];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[st.overlay, { opacity: overlayAnim }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>
        <Animated.View style={[st.popupContainer, { transform: [{ translateY: slideAnim }] }]}>
          <LinearGradient
            colors={themeColors}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[st.popup, { borderColor: isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}
          >
            <TouchableOpacity 
              style={st.closeBtn} 
              activeOpacity={0.7} 
              onPress={onClose}
            >
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <View style={[st.iconCircle, { backgroundColor: isSuccess ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', borderColor: isSuccess ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)' }]}>
              <Ionicons name={iconName} size={32} color={iconColor} />
            </View>

            <Text style={st.title}>{title}</Text>
            <Text style={st.description}>{message}</Text>

            <TouchableOpacity 
              style={st.logoutBtn} 
              activeOpacity={0.85} 
              onPress={onClose}
            >
              <LinearGradient
                colors={btnColors}
                style={st.logoutGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={st.logoutText}>Awesome</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function AdminWallet() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [packages, setPackages] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savingPackages, setSavingPackages] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [popup, setPopup] = useState({ visible: false, type: 'success', title: '', message: '' });

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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleUpdatePackage = (index, field, value) => {
    const newPackages = [...packages];
    newPackages[index][field] = value;
    setPackages(newPackages);
  };

  const handleAddPackage = () => {
    const newPkg = {
      id: 'custom_' + Date.now().toString() + Math.random().toString(36).substr(2, 4),
      coins: 100,
      price: 49,
      originalPrice: 98,
      discount: 50,
      tag: 'Starter Offer'
    };
    setPackages([...packages, newPkg]);
  };

  const handleRemovePackage = (index) => {
    const newPackages = packages.filter((_, i) => i !== index);
    setPackages(newPackages);
    if (settings && settings.activePackagesCount > newPackages.length) {
      setSettings({ ...settings, activePackagesCount: Math.max(1, newPackages.length) });
    }
  };

  const handleResetToDefault = () => {
    const defaults = [
      { id: '1', coins: 40,   originalPrice: 38, price: 19,  discount: 50, tag: 'Starter Offer' },
      { id: '2', coins: 100,  originalPrice: 98, price: 49,  discount: 50, tag: 'Flat 50% Off' },
      { id: '3', coins: 220,  originalPrice: 198, price: 99,  discount: 50, tag: 'Most Popular' },
      { id: '4', coins: 350,  originalPrice: 373, price: 149, discount: 60, tag: 'Flat 60% Off' },
      { id: '5', coins: 850,  originalPrice: 873, price: 349, discount: 60, tag: 'Best Value' },
      { id: '6', coins: 1500, originalPrice: 1198, price: 599, discount: 50, tag: 'Super Saver' },
      { id: '7', coins: 3000, originalPrice: 2497, price: 999, discount: 60, tag: 'Limited Offer' },
    ];
    setPackages(defaults);
    if (settings) {
      setSettings({ ...settings, activePackagesCount: 7 });
    }
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
      setSavingPackages(true);
      const cleaned = packages.map(pkg => ({
        ...pkg,
        coins: Number(pkg.coins) || 0,
        price: Number(pkg.price) || 0,
        originalPrice: Number(pkg.originalPrice) || 0,
        discount: Number(pkg.discount) || 0,
        tag: pkg.tag || '',
        id: pkg.id || 'custom_' + Date.now().toString() + Math.random().toString(36).substr(2, 4)
      }));
      await adminAPI.updateCoinPackages(cleaned);
      setPackages(cleaned);
      setPopup({
        visible: true,
        type: 'success',
        title: 'Packages Saved',
        message: 'Coin packages have been updated successfully.'
      });
    } catch (e) {
      setPopup({
        visible: true,
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to update coin packages. Please try again.'
      });
    } finally {
      setSavingPackages(false);
    }
  };

  const saveSettings = async () => {
    try {
      setSavingSettings(true);
      await adminAPI.updateSettings(settings);
      setPopup({
        visible: true,
        type: 'success',
        title: 'Settings Saved',
        message: 'Global wallet settings have been updated successfully.'
      });
    } catch (e) {
      setPopup({
        visible: true,
        type: 'error',
        title: 'Save Failed',
        message: 'Failed to update global wallet settings. Please try again.'
      });
    } finally {
      setSavingSettings(false);
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

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.addPkgBtn} onPress={handleAddPackage} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#fff" style={{ marginRight: s(4) }} />
            <Text style={styles.addPkgBtnText}>Add Package</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.resetPkgBtn} onPress={handleResetToDefault} activeOpacity={0.8}>
            <Ionicons name="refresh" size={16} color="#A855F7" style={{ marginRight: s(4) }} />
            <Text style={styles.resetPkgBtnText}>Reset Defaults</Text>
          </TouchableOpacity>
        </View>

        {packages.map((pkg, index) => (
          <View key={index} style={styles.packageCard}>
            <View style={styles.packageHeader}>
              <Text style={styles.packageLabel}>Package {index + 1}</Text>
              <TouchableOpacity 
                onPress={() => handleRemovePackage(index)} 
                style={styles.removePkgBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={20} color="#EF4444" />
              </TouchableOpacity>
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
        
        <TouchableOpacity style={styles.saveBtn} onPress={savePackages} disabled={savingPackages}>
          {savingPackages ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Save Packages</Text>}
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

        <Text style={styles.sectionTitle}>Listener Earning Rates</Text>
        <View style={styles.settingsCard}>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Video Call Rate (₹/min)</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.videoPayoutRate?.toString() ?? '4'}
              onChangeText={(v) => setSettings({ ...settings, videoPayoutRate: Number(v) })}
              keyboardType="numeric"
              color="#fff"
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Audio Call Rate (₹/min)</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.audioPayoutRate?.toString() ?? '1'}
              onChangeText={(v) => setSettings({ ...settings, audioPayoutRate: Number(v) })}
              keyboardType="numeric"
              color="#fff"
            />
          </View>
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Chat Rate (₹/5 min)</Text>
            <TextInput
              style={styles.settingInput}
              value={settings.chatPayoutRate?.toString() ?? '2.5'}
              onChangeText={(v) => setSettings({ ...settings, chatPayoutRate: Number(v) })}
              keyboardType="numeric"
              color="#fff"
            />
          </View>
        </View>

        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: '#10B981' }]} onPress={saveSettings} disabled={savingSettings}>
          {savingSettings ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Update Wallet & Earning Settings</Text>}
        </TouchableOpacity>

        <View style={{ height: hp(10) }} />
      </ScrollView>
      <WalletPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup({ ...popup, visible: false })}
      />
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
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
    gap: s(12),
  },
  addPkgBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A855F7',
    paddingVertical: hp(1.2),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.4)',
  },
  addPkgBtnText: {
    color: '#fff',
    fontSize: ms(13),
    fontFamily: 'Inter_700Bold',
  },
  resetPkgBtn: {
    flex: 0.8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168, 85, 247, 0.08)',
    paddingVertical: hp(1.2),
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.2)',
  },
  resetPkgBtnText: {
    color: '#A855F7',
    fontSize: ms(13),
    fontFamily: 'Inter_700Bold',
  },
  removePkgBtn: {
    padding: s(4),
  },

});

const st = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
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
    paddingHorizontal: s(24),
    paddingTop: vs(32),
    paddingBottom: vs(40),
    alignItems: 'center',
    borderWidth: 1,
  },
  closeBtn: {
    position: 'absolute',
    top: vs(16),
    right: s(24),
    width: s(32),
    height: s(32),
    borderRadius: s(16),
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  iconCircle: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: vs(16),
    borderWidth: 1,
  },
  title: {
    fontSize: ms(24, 0.3),
    fontWeight: '900',
    color: '#fff',
    fontFamily: 'Inter_900Black',
    marginBottom: vs(8),
  },
  description: {
    fontSize: ms(15, 0.3),
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(22),
    marginBottom: vs(28),
  },
  logoutBtn: {
    width: '100%',
    height: vs(54),
    borderRadius: 16,
    overflow: 'hidden',
  },
  logoutGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
});
