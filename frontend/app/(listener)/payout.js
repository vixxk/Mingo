import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { hp, wp, ms, vs } from '../../utils/responsive';
import { payoutAPI, notificationAPI } from '../../utils/api';
import StatusPopup from '../../components/shared/StatusPopup';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: 'time-outline' },
  approved: { label: 'Approved', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)', icon: 'checkmark-circle-outline' },
  on_hold: { label: 'On Hold', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: 'pause-circle-outline' },
  paid: { label: 'Paid', color: '#22C55E', bg: 'rgba(34,197,94,0.12)', icon: 'checkmark-done-circle-outline' },
  rejected: { label: 'Rejected', color: '#EF4444', bg: 'rgba(239,68,68,0.12)', icon: 'close-circle-outline' },
  cancelled: { label: 'Cancelled', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', icon: 'ban-outline' },
};

const FIELD_ICONS = {
  bankName: 'business-outline',
  accountNumber: 'card-outline',
  ifscCode: 'grid-outline',
  phone: 'call-outline',
  panNumber: 'document-text-outline',
};

const formatINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

const BankField = ({ icon, label, value, onChange, placeholder, keyboardType = 'default', maxLength, uppercase = false, secure = false }) => (
  <View style={styles.fieldGroup}>
    <View style={styles.fieldIconWrap}>
      <Ionicons name={icon} size={ms(17)} color="#A78BFA" />
    </View>
    <View style={styles.fieldBody}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        placeholder={placeholder}
        placeholderTextColor="#4B5563"
        value={value}
        onChangeText={(t) => onChange(uppercase ? t.toUpperCase() : t)}
        keyboardType={keyboardType}
        maxLength={maxLength}
        autoCapitalize={uppercase ? 'characters' : 'words'}
        secureTextEntry={secure}
      />
    </View>
  </View>
);

export default function PayoutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingBank, setSavingBank] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dashboard data
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [availableForPayout, setAvailableForPayout] = useState(0);
  const [minPayoutAmount, setMinPayoutAmount] = useState(500);
  const [tdsRate, setTdsRate] = useState(10);
  const [creditMin, setCreditMin] = useState(3);
  const [creditMax, setCreditMax] = useState(7);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [inFlightAmount, setInFlightAmount] = useState(0);
  const [recentRequests, setRecentRequests] = useState([]);

  // Recent payout notifications (in-app preview of pushed alerts)
  const [payoutUpdates, setPayoutUpdates] = useState([]);
  const [updatesLoading, setUpdatesLoading] = useState(false);

  // Bank details form
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    phone: '',
    panNumber: '',
    isComplete: false,
  });

  // Request amount
  const [requestAmount, setRequestAmount] = useState('');

  const [popup, setPopup] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Continue',
    icon: null,
  });

  const showPopup = (type, title, message, onConfirm = null, confirmText = 'Continue', icon = null) => {
    setPopup({ visible: true, type, title, message, onConfirm, confirmText, icon });
  };

  const closePopup = () => {
    setPopup((prev) => ({ ...prev, visible: false, onConfirm: null }));
  };

  const applyDashboard = (data) => {
    setTotalEarnings(data.totalEarnings || 0);
    setAvailableForPayout(data.availableForPayout ?? 0);
    setMinPayoutAmount(data.minPayoutAmount || 500);
    setTdsRate(data.tdsRate ?? 10);
    if (data.creditTimeline) {
      setCreditMin(Math.max(1, data.creditTimeline.min ?? 3));
      setCreditMax(Math.max(1, data.creditTimeline.max ?? 7));
    }
    setHasPendingRequest(!!data.hasPendingRequest);
    setInFlightAmount(data.inFlightAmount || 0);
    setRecentRequests(data.recentRequests || []);

    if (data.bankDetails) {
      setBankDetails({
        bankName: data.bankDetails.bankName || '',
        accountNumber: data.bankDetails.accountNumber || '',
        ifscCode: data.bankDetails.ifscCode || '',
        phone: data.bankDetails.phone || '',
        panNumber: data.bankDetails.panNumber || '',
        isComplete: !!data.bankDetails.isComplete,
      });
    }
    // Default the request amount to the full available balance
    const avail = data.availableForPayout ?? 0;
    if (avail > 0) {
      setRequestAmount((prev) => (prev && Number(prev) > 0 ? prev : String(avail)));
    }
  };

  const loadDashboard = useCallback(async () => {
    try {
      const res = await payoutAPI.getDashboard();
      if (res?.data) applyDashboard(res.data);
    } catch (err) {
      console.log('Payout dashboard load error:', err);
      showPopup('error', 'Load Failed', err.message || 'Failed to load payout details. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadUpdates = useCallback(async () => {
    setUpdatesLoading(true);
    try {
      const res = await payoutAPI.getNotifications(10);
      if (res?.data?.notifications) {
        setPayoutUpdates(res.data.notifications);
      }
    } catch (err) {
      console.log('Payout updates load error:', err);
    } finally {
      setUpdatesLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
      loadUpdates();
    }, [loadDashboard, loadUpdates])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadDashboard(), loadUpdates()]);
  }, [loadDashboard, loadUpdates]);

  const spinAnim = useRef(new Animated.Value(0)).current;

  const handleRefresh = async () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    await onRefresh();
  };

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const isBankDetailsFormComplete = Boolean(
    bankDetails.bankName?.trim() &&
      bankDetails.accountNumber?.trim() &&
      bankDetails.ifscCode?.trim() &&
      bankDetails.phone?.trim() &&
      bankDetails.panNumber?.trim()
  );

  const handleSaveBankDetails = async () => {
    if (!isBankDetailsFormComplete) return;
    setSavingBank(true);
    try {
      const res = await payoutAPI.saveBankDetails(bankDetails);
      if (res?.data) {
        setBankDetails({
          bankName: res.data.bankName || '',
          accountNumber: res.data.accountNumber || '',
          ifscCode: res.data.ifscCode || '',
          phone: res.data.phone || '',
          panNumber: res.data.panNumber || '',
          isComplete: true,
        });
        showPopup('success', 'Bank Details Saved', 'Your bank details have been saved. You can now request a payout.');
      }
    } catch (err) {
      console.log('Save bank details error:', err);
      showPopup('error', 'Save Failed', err.message || 'Failed to save bank details. Please check your inputs.');
    } finally {
      setSavingBank(false);
    }
  };

  const handleQuickAmount = (val) => {
    setRequestAmount(String(Math.floor(val)));
  };

  const handleSubmitRequest = () => {
    const amount = Number(requestAmount);

    if (!bankDetails.isComplete) {
      showPopup('info', 'Bank Details Required', 'Please save your bank details including PAN (for TDS) before requesting a payout.');
      return;
    }
    if (!amount || isNaN(amount) || amount <= 0) {
      showPopup('info', 'Invalid Amount', 'Please enter a valid payout amount.');
      return;
    }
    if (amount < minPayoutAmount) {
      showPopup('info', 'Below Minimum', `Minimum payout request amount is ${formatINR(minPayoutAmount)}.`);
      return;
    }
    if (amount > availableForPayout) {
      showPopup('info', 'Amount Too High', `You can request up to ${formatINR(availableForPayout)}.`);
      return;
    }

    const netAfterTds = Math.round(amount * (1 - tdsRate / 100) * 100) / 100;
    showPopup(
      'confirm',
      'Confirm Payout Request',
      `You are about to request a payout of ${formatINR(amount)}. After ${tdsRate}% TDS deduction, approximately ${formatINR(netAfterTds)} will be credited to your bank account ${creditTimelineText} after approval. Continue?`,
      async () => {
        closePopup();
        setSubmitting(true);
        try {
          const res = await payoutAPI.submitRequest(amount);
          if (res?.data) {
            showPopup('success', 'Request Submitted ✅', `Your payout request of ${formatINR(res.data.amount)} has been submitted. You will be notified once it is processed.`);
            await loadDashboard();
          }
        } catch (err) {
          console.log('Submit payout error:', err);
          showPopup('error', 'Submission Failed', err.message || 'Failed to submit payout request. Please try again.');
        } finally {
          setSubmitting(false);
        }
      },
      'Yes, Submit'
    );
  };

  const progressPct = totalEarnings > 0 ? Math.min(100, (availableForPayout / totalEarnings) * 100) : 0;

  // Credit timeline — admin-configurable, shown as a live range
  const creditTimelineText =
    creditMin === creditMax ? `within ${creditMin} days` : `within ${creditMin}–${creditMax} days`;

  // Recent payout updates helpers
  const unreadUpdates = payoutUpdates.filter((n) => !n.isRead).length;

  const timeAgo = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const getUpdateConfig = (n) => {
    switch (n.status) {
      case 'paid': return { icon: 'checkmark-done-circle', color: '#22C55E', bg: 'rgba(34,197,94,0.12)' };
      case 'approved': return { icon: 'checkmark-circle', color: '#3B82F6', bg: 'rgba(59,130,246,0.12)' };
      case 'rejected': return { icon: 'close-circle', color: '#EF4444', bg: 'rgba(239,68,68,0.12)' };
      case 'on_hold': return { icon: 'hourglass', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' };
      case 'cancelled': return { icon: 'ban', color: '#6B7280', bg: 'rgba(107,114,128,0.12)' };
      default: return { icon: 'paper-plane', color: '#A78BFA', bg: 'rgba(168,85,247,0.12)' };
    }
  };

  const handleMarkUpdateRead = async (n) => {
    if (n.isRead) return;
    try {
      await notificationAPI.markAsRead(n._id);
      setPayoutUpdates((prev) => prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)));
    } catch (err) {
      console.log('Failed to mark payout update as read:', err);
    }
  };

  const handleMarkAllUpdatesRead = async () => {
    if (unreadUpdates === 0) return;
    try {
      await payoutAPI.markAllNotificationsRead();
      setPayoutUpdates((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.log('Failed to mark all payout updates as read:', err);
    }
  };

  // TDS preview — recomputed live as the request amount changes
  const previewGross = Number(requestAmount) || 0;
  const previewTds = Math.round(previewGross * (tdsRate / 100) * 100) / 100;
  const previewNet = Math.round((previewGross - previewTds) * 100) / 100;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={wp(6)} color="#fff" />
          <Text style={styles.headerTitle}>Payout</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={handleRefresh}
          activeOpacity={0.7}
          style={styles.refreshBtn}
        >
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <Ionicons name="refresh" size={22} color="#9CA3AF" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A78BFA" colors={['#A78BFA']} />
        }
      >
        {loading ? (
          <View style={{ paddingTop: hp(4) }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={[styles.skeletonCard, { opacity: 1 - i * 0.18 }]} />
            ))}
          </View>
        ) : (
          <>
            {/* ─── Total Earnings Card ─── */}
            <LinearGradient
              colors={['#2A1445', '#170B2B', '#0D0618']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.earningsCard}
            >
              <View style={styles.earningsTopRow}>
                <View style={styles.earningsLockBadge}>
                  <Ionicons name="lock-closed" size={ms(10)} color="#A78BFA" />
                  <Text style={styles.earningsLockText}>Secured</Text>
                </View>
              </View>
              <Text style={styles.earningsLabel}>Total Earnings</Text>
              <Text style={styles.earningsAmount}>{formatINR(totalEarnings)}</Text>
            </LinearGradient>

            <View style={styles.noteRow}>
              <Ionicons name="information-circle-outline" size={ms(13)} color="#6B7280" />
              <Text style={styles.noteText}>*Earnings may take up to 24 hours to reflect latest calls.</Text>
            </View>

            {/* ─── Banking Details ─── */}
            <View style={styles.sectionHeader}>
              <View style={styles.sectionIconWrap}>
                <Ionicons name="business" size={ms(16)} color="#A78BFA" />
              </View>
              <Text style={styles.sectionTitle}>Banking Details</Text>
            </View>

            <View style={styles.card}>
              <BankField
                icon={FIELD_ICONS.bankName}
                label="Bank Name"
                value={bankDetails.bankName}
                onChange={(v) => setBankDetails((p) => ({ ...p, bankName: v }))}
                placeholder="e.g. HDFC Bank"
                maxLength={100}
              />
              <BankField
                icon={FIELD_ICONS.accountNumber}
                label="Bank Account Number"
                value={bankDetails.accountNumber}
                onChange={(v) => setBankDetails((p) => ({ ...p, accountNumber: v.replace(/[^0-9]/g, '') }))}
                placeholder="Enter account number"
                keyboardType="number-pad"
                maxLength={30}
              />
              <BankField
                icon={FIELD_ICONS.ifscCode}
                label="Bank IFSC Code"
                value={bankDetails.ifscCode}
                onChange={(v) => setBankDetails((p) => ({ ...p, ifscCode: v }))}
                placeholder="e.g. HDFC0001234"
                uppercase
                maxLength={11}
              />
              <BankField
                icon={FIELD_ICONS.phone}
                label="Phone Number"
                value={bankDetails.phone}
                onChange={(v) => setBankDetails((p) => ({ ...p, phone: v.replace(/[^0-9]/g, '') }))}
                placeholder="Registered mobile number"
                keyboardType="phone-pad"
                maxLength={10}
              />
              <BankField
                icon={FIELD_ICONS.panNumber}
                label="PAN Number (for TDS)"
                value={bankDetails.panNumber}
                onChange={(v) => setBankDetails((p) => ({ ...p, panNumber: v }))}
                placeholder="e.g. ABCDE1234F"
                uppercase
                maxLength={10}
              />

              <TouchableOpacity
                style={[styles.saveBankBtnWrap, !isBankDetailsFormComplete && styles.saveBankBtnDisabled]}
                activeOpacity={0.85}
                onPress={handleSaveBankDetails}
                disabled={!isBankDetailsFormComplete || savingBank}
              >
                <LinearGradient
                  colors={!isBankDetailsFormComplete ? ['#374151', '#262626', '#1F1F1F'] : ['#7C3AED', '#6D28D9', '#5B21B6']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={styles.saveBankBtn}
                >
                  {savingBank ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="lock-closed" size={ms(15)} color={!isBankDetailsFormComplete ? '#6B7280' : '#fff'} />
                      <Text style={[styles.saveBankBtnText, !isBankDetailsFormComplete && styles.saveBankBtnTextDisabled]}>
                        {bankDetails.isComplete ? 'Update Bank Details' : 'Save Bank Details'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* ─── Payout Request ─── */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, styles.sectionIconRupee]}>
                <Text style={styles.sectionIconRupeeText}>₹</Text>
              </View>
              <Text style={styles.sectionTitle}>Payout Request</Text>
            </View>

            <View style={styles.card}>
              <View style={styles.infoRow}>
                <View style={styles.infoRowLeft}>
                  <Ionicons name="wallet-outline" size={ms(17)} color="#9CA3AF" />
                  <Text style={styles.infoRowLabel}>Available for payout</Text>
                </View>
                <Text style={[styles.infoRowValue, { color: '#A78BFA' }]}>{formatINR(availableForPayout)}</Text>
              </View>
              <View style={styles.rowDivider} />
              <View style={styles.infoRow}>
                <View style={styles.infoRowLeft}>
                  <Ionicons name="trending-down-outline" size={ms(17)} color="#9CA3AF" />
                  <Text style={styles.infoRowLabel}>Minimum payout request amount</Text>
                </View>
                <Text style={styles.infoRowValue}>{formatINR(minPayoutAmount)}</Text>
              </View>
              <View style={styles.rowDivider} />

              {/* Amount input */}
              <Text style={styles.amountFieldLabel}>Request Amount</Text>
              <View style={styles.amountInputRow}>
                <Text style={styles.amountPrefix}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={requestAmount}
                  onChangeText={(t) => setRequestAmount(t.replace(/[^0-9.]/g, ''))}
                  placeholder="Enter amount"
                  placeholderTextColor="#4B5563"
                  keyboardType="decimal-pad"
                />
              </View>

              {availableForPayout > minPayoutAmount && (
                <View style={styles.quickChipsRow}>
                  <TouchableOpacity
                    style={styles.quickChip}
                    activeOpacity={0.7}
                    onPress={() => handleQuickAmount(minPayoutAmount)}
                  >
                    <Text style={styles.quickChipText}>Min</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.quickChip}
                    activeOpacity={0.7}
                    onPress={() => handleQuickAmount(availableForPayout / 2)}
                  >
                    <Text style={styles.quickChipText}>50%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.quickChip, styles.quickChipMax]}
                    activeOpacity={0.7}
                    onPress={() => handleQuickAmount(availableForPayout)}
                  >
                    <Text style={[styles.quickChipText, styles.quickChipTextMax]}>Max ({formatINR(availableForPayout)})</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* TDS Deduction Preview */}
              {previewGross > 0 && (
                <View style={styles.tdsPreview}>
                  <View style={styles.tdsPreviewHeader}>
                    <Ionicons name="receipt-outline" size={ms(15)} color="#FBBF24" />
                    <Text style={styles.tdsPreviewTitle}>TDS Deduction Preview</Text>
                    <View style={styles.tdsBadge}>
                      <Text style={styles.tdsBadgeText}>{tdsRate}% TDS</Text>
                    </View>
                  </View>
                  <View style={styles.tdsRow}>
                    <Text style={styles.tdsRowLabel}>Request Amount</Text>
                    <Text style={styles.tdsRowValue}>{formatINR(previewGross)}</Text>
                  </View>
                  <View style={styles.tdsRow}>
                    <Text style={styles.tdsRowLabel}>TDS Deduction ({tdsRate}%)</Text>
                    <Text style={[styles.tdsRowValue, { color: '#F87171' }]}>− {formatINR(previewTds)}</Text>
                  </View>
                  <View style={[styles.tdsRow, styles.tdsRowNet]}>
                    <Text style={styles.tdsRowNetLabel}>You will receive</Text>
                    <Text style={styles.tdsRowNetValue}>{formatINR(previewNet)}</Text>
                  </View>
                  <Text style={styles.tdsNote}>
                    TDS is deducted as per Income Tax regulations. Final deduction is subject to your tax profile.
                  </Text>
                </View>
              )}

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
              </View>
              <Text style={styles.progressHint}>
                {hasPendingRequest
                  ? `${formatINR(inFlightAmount)} is under review and will be credited ${creditTimelineText} of approval.`
                  : `${formatINR(availableForPayout)} of your ${formatINR(totalEarnings)} earnings is available to withdraw.`}
              </Text>

              {hasPendingRequest ? (
                <View style={styles.pendingBanner}>
                  <Ionicons name="hourglass-outline" size={ms(16)} color="#F59E0B" />
                  <Text style={styles.pendingBannerText}>You have a payout request under review. New requests can be placed once it is processed.</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.submitBtnWrap}
                  activeOpacity={0.85}
                  onPress={handleSubmitRequest}
                  disabled={submitting}
                >
                  <LinearGradient
                    colors={['#EF4444', '#DC2626', '#B91C1C']}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.submitBtn}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="paper-plane" size={ms(15)} color="#fff" />
                        <Text style={styles.submitBtnText}>Submit Payout Request</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <View style={styles.creditTimelineRow}>
                <Ionicons name="time-outline" size={ms(13)} color="#6B7280" />
                <Text style={styles.creditTimelineText}>Amount will be credited {creditTimelineText}</Text>
              </View>
            </View>

            {/* ─── Payout History ─── */}
            {recentRequests.length > 0 && (
              <>
                <View style={styles.sectionHeader}>
                  <View style={[styles.sectionIconWrap, styles.sectionIconHistory]}>
                    <Ionicons name="time" size={ms(16)} color="#A78BFA" />
                  </View>
                  <Text style={styles.sectionTitle}>Payout History</Text>
                </View>

                <View style={styles.card}>
                  {recentRequests.map((r, idx) => {
                    const conf = STATUS_CONFIG[r.status] || STATUS_CONFIG.pending;
                    const d = new Date(r.createdAt);
                    const dateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                    const isRejected = r.status === 'rejected';

                    return (
                      <View key={String(r._id)}>
                        {idx > 0 && <View style={styles.rowDivider} />}
                        <TouchableOpacity
                          style={styles.historyRow}
                          activeOpacity={isRejected ? 0.7 : 1}
                          disabled={!isRejected}
                          onPress={() => {
                            if (isRejected) {
                              const reason = r.adminNotes
                                ? `Reason: ${r.adminNotes}`
                                : 'Your payout request was not approved by the admin. Please contact support for more details.';
                              showPopup(
                                'error',
                                'Payout Rejected ⚠️',
                                `Payout request of ${formatINR(r.amount)} was rejected.\n\n${reason}`
                              );
                            }
                          }}
                        >
                          <View style={[styles.historyIconWrap, { backgroundColor: conf.bg }]}>
                            <Ionicons name={conf.icon} size={ms(16)} color={conf.color} />
                          </View>
                          <View style={styles.historyInfo}>
                            <Text style={styles.historyAmount}>{formatINR(r.amount)}</Text>
                            <Text style={styles.historyDate}>
                              {dateStr}{r.netAmount > 0 ? `  •  Net ${formatINR(r.netAmount)}` : ''}
                            </Text>
                            {isRejected ? (
                              <Text style={[styles.historyNotes, { color: '#EF4444', fontWeight: '600' }]}>
                                {r.adminNotes ? `Reason: ${r.adminNotes} • Tap to view details` : 'Tap to view details'}
                              </Text>
                            ) : r.adminNotes ? (
                              <Text style={styles.historyNotes} numberOfLines={1}>{r.adminNotes}</Text>
                            ) : null}
                          </View>
                          <View style={[styles.historyBadge, { backgroundColor: conf.bg }]}>
                            <Text style={[styles.historyBadgeText, { color: conf.color }]}>{conf.label}</Text>
                          </View>
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </>
            )}

            {/* ─── Recent Payout Updates (in-app push preview) ─── */}
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIconWrap, styles.sectionIconUpdates]}>
                <Ionicons name="notifications" size={ms(16)} color="#A78BFA" />
              </View>
              <Text style={styles.sectionTitle}>Recent Payout Updates</Text>
              {unreadUpdates > 0 && (
                <View style={styles.updatesCountPill}>
                  <Text style={styles.updatesCountText}>{unreadUpdates}</Text>
                </View>
              )}
              {unreadUpdates > 0 && (
                <TouchableOpacity
                  style={styles.markAllReadBtn}
                  activeOpacity={0.7}
                  onPress={handleMarkAllUpdatesRead}
                >
                  <Text style={styles.markAllReadText}>Mark all read</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.card}>
              {updatesLoading && payoutUpdates.length === 0 ? (
                <View style={styles.updatesEmpty}>
                  <ActivityIndicator size="small" color="#A78BFA" />
                </View>
              ) : payoutUpdates.length === 0 ? (
                <View style={styles.updatesEmpty}>
                  <Ionicons name="notifications-off-outline" size={ms(22)} color="#374151" />
                  <Text style={styles.updatesEmptyText}>
                    No payout notifications yet. You'll see status updates here as soon as your payout is processed.
                  </Text>
                </View>
              ) : (
                payoutUpdates.map((n, idx) => {
                  const conf = getUpdateConfig(n);
                  const isRejected = n.status === 'rejected' || (n.title && n.title.toLowerCase().includes('reject'));
                  return (
                    <TouchableOpacity
                      key={String(n._id)}
                      activeOpacity={0.7}
                      onPress={() => {
                        handleMarkUpdateRead(n);
                        if (isRejected) {
                          showPopup(
                            'error',
                            n.title || 'Payout Rejected ⚠️',
                            n.body || 'Your payout request was rejected by the admin. Please contact support for more details.'
                          );
                        }
                      }}
                    >
                      {idx > 0 && <View style={styles.rowDivider} />}
                      <View style={styles.updateRow}>
                        <View style={[styles.updateIconWrap, { backgroundColor: conf.bg }]}>
                          <Ionicons name={conf.icon} size={ms(15)} color={conf.color} />
                        </View>
                        <View style={styles.updateInfo}>
                          <View style={styles.updateTitleRow}>
                            <Text style={[styles.updateTitle, !n.isRead && styles.updateTitleUnread]} numberOfLines={1}>
                              {n.title}
                            </Text>
                            {Number(n.amount) > 0 && (
                              <Text style={[styles.updateAmount, { color: conf.color }]}>
                                {formatINR(n.amount)}
                              </Text>
                            )}
                          </View>
                          <Text style={[styles.updateBody, isRejected && { color: '#EF4444', fontWeight: '600' }]} numberOfLines={2}>
                            {isRejected ? 'Tap to view more details' : n.body}
                          </Text>
                          <Text style={styles.updateTime}>{timeAgo(n.createdAt)}</Text>
                        </View>
                        {!n.isRead && <View style={styles.updateUnreadDot} />}
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </>
        )}
        <View style={{ height: hp(6) }} />
      </ScrollView>

      <StatusPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={closePopup}
        onConfirm={popup.onConfirm}
        confirmText={popup.confirmText}
        icon={popup.icon}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5) },
  headerTitle: { fontSize: wp(5.5), color: '#fff', fontWeight: '700', fontFamily: 'Inter_700Bold' },
  refreshBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: wp(4), paddingTop: hp(1) },

  // Skeleton
  skeletonCard: {
    height: hp(16),
    borderRadius: wp(4),
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginBottom: hp(2),
  },

  // Earnings card
  earningsCard: {
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.35)',
    padding: wp(5),
    marginBottom: hp(1),
  },
  earningsTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: hp(2) },
  earningsLockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.5),
    borderRadius: wp(3),
    backgroundColor: 'rgba(168,85,247,0.12)',
  },
  earningsLockText: { color: '#A78BFA', fontSize: ms(10), fontFamily: 'Inter_700Bold' },
  earningsLabel: { color: '#9CA3AF', fontSize: ms(13), fontFamily: 'Inter_500Medium', marginBottom: hp(0.4) },
  earningsAmount: {
    color: '#fff',
    fontSize: ms(34, 0.3),
    fontFamily: 'Inter_900Black',
    letterSpacing: -0.5,
    marginBottom: 0,
  },

  noteRow: { flexDirection: 'row', alignItems: 'center', gap: wp(1.5), marginBottom: hp(2.5), paddingHorizontal: wp(1) },
  noteText: { flex: 1, color: '#6B7280', fontSize: ms(11), fontFamily: 'Inter_400Regular', lineHeight: ms(16) },

  // Sections
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: wp(2.5), marginBottom: hp(1.4), marginTop: hp(1) },
  sectionIconWrap: {
    width: wp(8),
    height: wp(8),
    borderRadius: wp(2.2),
    backgroundColor: 'rgba(168,85,247,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionIconRupee: { backgroundColor: 'rgba(168,85,247,0.14)' },
  sectionIconRupeeText: { color: '#A78BFA', fontSize: ms(16), fontWeight: '800', fontFamily: 'Inter_900Black' },
  sectionIconHistory: { backgroundColor: 'rgba(168,85,247,0.14)' },
  sectionIconUpdates: { backgroundColor: 'rgba(168,85,247,0.14)' },
  sectionTitle: { color: '#E5E7EB', fontSize: ms(16), fontWeight: '800', fontFamily: 'Inter_900Black' },
  updatesCountPill: {
    minWidth: wp(5),
    height: wp(5),
    borderRadius: wp(2.5),
    paddingHorizontal: wp(1.5),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(168,85,247,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
  },
  updatesCountText: { color: '#C084FC', fontSize: ms(10), fontFamily: 'Inter_700Bold' },
  markAllReadBtn: {
    marginLeft: 'auto',
    paddingVertical: hp(0.4),
    paddingHorizontal: wp(2.5),
    borderRadius: wp(1.5),
    backgroundColor: 'rgba(168,85,247,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
  },
  markAllReadText: { color: '#A78BFA', fontSize: ms(10.5), fontFamily: 'Inter_600SemiBold' },

  card: {
    backgroundColor: '#141414',
    borderRadius: wp(4),
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: wp(4),
    marginBottom: hp(2),
  },

  // Bank fields
  fieldGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    backgroundColor: '#0F0F0F',
    borderRadius: wp(3),
    borderWidth: 1,
    borderColor: '#262626',
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    marginBottom: hp(1.2),
  },
  fieldIconWrap: { width: wp(6), alignItems: 'center', justifyContent: 'center' },
  fieldBody: { flex: 1 },
  fieldLabel: { color: '#6B7280', fontSize: ms(10), fontFamily: 'Inter_500Medium', marginBottom: 2 },
  fieldInput: { color: '#fff', fontSize: ms(14), fontFamily: 'Inter_500Medium', padding: 0, minHeight: hp(2.6) },

  // Save bank button
  saveBankBtnWrap: { borderRadius: wp(3), overflow: 'hidden', marginTop: hp(1) },
  saveBankBtnDisabled: { opacity: 0.65 },
  saveBankBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    paddingVertical: hp(1.7),
  },
  saveBankBtnText: { color: '#fff', fontSize: ms(14), fontWeight: '800', fontFamily: 'Inter_900Black' },
  saveBankBtnTextDisabled: { color: '#9CA3AF' },

  // Info rows
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: hp(1.2) },
  infoRowLeft: { flexDirection: 'row', alignItems: 'center', gap: wp(2.5), flex: 1 },
  infoRowLabel: { color: '#9CA3AF', fontSize: ms(13), fontFamily: 'Inter_500Medium', flex: 1 },
  infoRowValue: { color: '#E5E7EB', fontSize: ms(14), fontFamily: 'Inter_700Bold' },
  rowDivider: { height: 1, backgroundColor: '#1F1F1F' },

  // Amount input
  amountFieldLabel: { color: '#9CA3AF', fontSize: ms(11), fontFamily: 'Inter_500Medium', marginTop: hp(1), marginBottom: hp(0.6) },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F0F0F',
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
    borderRadius: wp(3),
    paddingHorizontal: wp(3.5),
    marginBottom: hp(1),
  },
  amountPrefix: { color: '#A78BFA', fontSize: ms(20), fontFamily: 'Inter_700Bold', marginRight: wp(1) },
  amountInput: {
    flex: 1,
    color: '#fff',
    fontSize: ms(18),
    fontFamily: 'Inter_700Bold',
    paddingVertical: hp(1.4),
    padding: 0,
  },

  // Quick chips
  quickChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2), marginBottom: hp(1.2) },
  quickChip: {
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.7),
    borderRadius: wp(2),
    backgroundColor: '#1F1F1F',
    borderWidth: 1,
    borderColor: '#2E2E2E',
  },
  quickChipMax: { backgroundColor: 'rgba(168,85,247,0.12)', borderColor: 'rgba(168,85,247,0.4)' },
  quickChipText: { color: '#9CA3AF', fontSize: ms(11), fontFamily: 'Inter_700Bold' },
  quickChipTextMax: { color: '#C084FC' },

  // TDS preview
  tdsPreview: {
    backgroundColor: 'rgba(251,191,36,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(251,191,36,0.3)',
    borderRadius: wp(3),
    padding: wp(3.5),
    marginBottom: hp(1.2),
  },
  tdsPreviewHeader: { flexDirection: 'row', alignItems: 'center', gap: wp(1.8), marginBottom: hp(0.8) },
  tdsPreviewTitle: { flex: 1, color: '#FBBF24', fontSize: ms(12), fontFamily: 'Inter_700Bold' },
  tdsBadge: {
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.4),
    borderRadius: wp(1.5),
    backgroundColor: 'rgba(251,191,36,0.15)',
  },
  tdsBadgeText: { color: '#FBBF24', fontSize: ms(10), fontFamily: 'Inter_700Bold' },
  tdsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: hp(0.45) },
  tdsRowLabel: { color: '#9CA3AF', fontSize: ms(11.5), fontFamily: 'Inter_400Regular' },
  tdsRowValue: { color: '#E5E7EB', fontSize: ms(12.5), fontFamily: 'Inter_700Bold' },
  tdsRowNet: {
    marginTop: hp(0.3),
    paddingTop: hp(0.7),
    borderTopWidth: 1,
    borderTopColor: 'rgba(251,191,36,0.2)',
  },
  tdsRowNetLabel: { color: '#E5E7EB', fontSize: ms(12.5), fontFamily: 'Inter_700Bold' },
  tdsRowNetValue: { color: '#34D399', fontSize: ms(15), fontFamily: 'Inter_900Black' },
  tdsNote: { color: '#6B7280', fontSize: ms(9.5), fontFamily: 'Inter_400Regular', lineHeight: ms(13), marginTop: hp(0.6) },

  // Progress
  progressTrack: {
    height: hp(0.6),
    borderRadius: hp(0.3),
    backgroundColor: '#1F1F1F',
    overflow: 'hidden',
    marginTop: hp(0.6),
    marginBottom: hp(0.8),
  },
  progressFill: { height: '100%', borderRadius: hp(0.3), backgroundColor: '#8B5CF6' },
  progressHint: { color: '#6B7280', fontSize: ms(11), fontFamily: 'Inter_400Regular', lineHeight: ms(16), marginBottom: hp(1.5) },

  // Pending banner
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.35)',
    borderRadius: wp(3),
    padding: wp(3.5),
  },
  pendingBannerText: { flex: 1, color: '#FBBF24', fontSize: ms(11.5), fontFamily: 'Inter_500Medium', lineHeight: ms(16) },

  // Submit button
  submitBtnWrap: { borderRadius: wp(3.5), overflow: 'hidden', marginTop: hp(1) },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    paddingVertical: hp(1.8),
  },
  submitBtnText: { color: '#fff', fontSize: ms(14.5), fontWeight: '800', fontFamily: 'Inter_900Black' },

  creditTimelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: wp(1.5), marginTop: hp(1.4) },
  creditTimelineText: { color: '#6B7280', fontSize: ms(11), fontFamily: 'Inter_400Regular' },

  // History
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2.5), paddingVertical: hp(1.2) },
  historyIconWrap: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyInfo: { flex: 1 },
  historyAmount: { color: '#fff', fontSize: ms(14), fontFamily: 'Inter_700Bold' },
  historyDate: { color: '#6B7280', fontSize: ms(10.5), fontFamily: 'Inter_400Regular', marginTop: 2 },
  historyNotes: { color: '#9CA3AF', fontSize: ms(10), fontFamily: 'Inter_400Regular', marginTop: 2 },
  historyBadge: { paddingHorizontal: wp(2.5), paddingVertical: hp(0.5), borderRadius: wp(1.5) },
  historyBadgeText: { fontSize: ms(10), fontFamily: 'Inter_700Bold' },

  // Recent payout updates
  updatesEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(2.5),
    paddingHorizontal: wp(4),
    gap: hp(0.8),
  },
  updatesEmptyText: {
    color: '#6B7280',
    fontSize: ms(11),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: ms(16),
  },
  updateRow: { flexDirection: 'row', alignItems: 'center', gap: wp(2.5), paddingVertical: hp(1.2) },
  updateIconWrap: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(2.5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateInfo: { flex: 1 },
  updateTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: wp(2) },
  updateTitle: { color: '#9CA3AF', fontSize: ms(12), fontFamily: 'Inter_600SemiBold', flex: 1 },
  updateAmount: { fontSize: ms(12.5), fontFamily: 'Inter_700Bold', flexShrink: 0 },
  updateTitleUnread: { color: '#fff', fontFamily: 'Inter_700Bold' },
  updateBody: { color: '#9CA3AF', fontSize: ms(11), fontFamily: 'Inter_400Regular', lineHeight: ms(15), marginTop: 2 },
  updateTime: { color: '#6B7280', fontSize: ms(10), fontFamily: 'Inter_400Regular', marginTop: 3 },
  updateUnreadDot: {
    width: wp(2),
    height: wp(2),
    borderRadius: wp(1),
    backgroundColor: '#A855F7',
    flexShrink: 0,
  },
});
