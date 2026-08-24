import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { walletAPI } from '../../utils/api';
import RaiseIssuePopup from '../../components/shared/RaiseIssuePopup';
import SkeletonRecentList from '../../components/SkeletonRecentList';

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};

const PaymentCard = ({ item }) => {
  const isCredit = item.coins > 0 || item.amount > 0;
  const date = formatDate(item.createdAt);
  const transactionId = item._id.toString();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(transactionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  let title = item.description || 'Transaction';
  let subtitle = '';

  if (item.type === 'call_debit') {
    const listenerName = item.metadata?.sessionId?.listenerId?.name || 'Listener';
    title = `Session with ${listenerName}`;
    subtitle = `${Math.abs(item.coins / 10)} Diamonds used`;
  } else if (item.type === 'purchase') {
    title = 'Wallet Recharge (Success)';
    subtitle = `Paid ₹${item.amount} for ${item.coins} Coins`;
  } else if (item.type === 'gift_send') {
    title = `Gift Sent: ${(item.description || '').replace('Sent gift: ', '') || 'Gift'}`;
  } else if (item.type === 'gift_receive') {
    title = `Gift Received`;
  } else if (item.type === 'call_credit') {
    const callerName = item.metadata?.sessionId?.userId?.name || 'User';
    title = `Session Earnings (${callerName})`;
    subtitle = item.description || 'Call earnings credited';
  } else if (item.type === 'signup_bonus') {
    title = 'Signup Bonus (Free Coins)';
    subtitle = `Received ${item.coins} Coins`;
  } else if (item.type === 'refund') {
    title = 'Coins Refunded';
    subtitle = `Credited ${item.coins} Coins`;
  }

  const amountLabel =
    item.coins !== 0 ? `${item.coins > 0 ? '+' : ''}${item.coins}` : `+₹${(item.amount || 0).toFixed(2)}`;

  return (
    <View style={styles.paymentCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>• {date}</Text>
      </View>
      <View style={styles.cardBody}>
        <View style={styles.infoSection}>
          <Text style={styles.paymentTitle}>{title}</Text>
          {!!subtitle && <Text style={styles.paymentSubtitle}>{subtitle}</Text>}
        </View>
        <Text style={[styles.amountText, { color: isCredit ? '#22C55E' : '#EF4444' }]}>
          {amountLabel}
        </Text>
      </View>
      <View style={styles.transactionIdRow}>
        <Ionicons name="finger-print-outline" size={wp(3.5)} color="#6B7280" />
        <Text style={styles.transactionIdText} numberOfLines={1}>
          Transaction ID: {transactionId}
        </Text>
        <TouchableOpacity
          style={[styles.copyBtn, copied && styles.copyBtnActive]}
          onPress={handleCopy}
          activeOpacity={0.7}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={wp(3.5)}
            color={copied ? '#22C55E' : '#9CA3AF'}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function RecentPaymentsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showIssuePopup, setShowIssuePopup] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await walletAPI.getTransactions(1, 5, 'All');
      if (res?.data?.transactions) {
        setPayments(res.data.transactions);
      }
    } catch (e) {
      console.error('Failed to load recent payments:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      <LinearGradient
        colors={['transparent', '#1A0000', '#4A0000']}
        locations={[0, 0.6, 1]}
        style={styles.bgGradient}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={wp(5.5)} color="#fff" />
          <Text style={styles.headerTitle}>Recent Payments</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <SkeletonRecentList variant="payments" />
      ) : (
        <FlatList
          style={styles.list}
          data={payments}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text style={styles.sectionTitle}>Your last 5 payments</Text>
          }
          renderItem={({ item }) => <PaymentCard item={item} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="wallet-outline" size={wp(14)} color="#4B5563" />
              <Text style={styles.emptyTitle}>No Payments Yet</Text>
              <Text style={styles.emptySubtitle}>
                Your recent wallet transactions will appear here.
              </Text>
            </View>
          }
        />
      )}

      <View style={styles.reportFooter}>
        <TouchableOpacity
          style={styles.reportBtnWrap}
          activeOpacity={0.8}
          onPress={() => setShowIssuePopup(true)}
        >
          <LinearGradient
            colors={['#EF4444', '#B91C1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.reportBtn}
          >
            <Ionicons name="flag-outline" size={wp(5)} color="#fff" style={styles.reportIcon} />
            <Text style={styles.reportBtnText}>Report an Issue</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <RaiseIssuePopup
        visible={showIssuePopup}
        onClose={() => setShowIssuePopup(false)}
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

  /* Header */
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
  },

  /* List */
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: ms(13, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginBottom: hp(1),
  },

  /* Empty State */
  emptyState: {
    alignItems: 'center',
    marginTop: hp(12),
    gap: hp(0.8),
  },
  emptyTitle: {
    fontSize: ms(16, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginTop: hp(1),
  },
  emptySubtitle: {
    fontSize: ms(13, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  /* Payment Card */
  paymentCard: {
    backgroundColor: '#141414',
    borderRadius: wp(3.5),
    borderWidth: 1,
    borderColor: '#1F1F1F',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1),
    marginBottom: hp(0.8),
  },
  cardHeader: {
    marginBottom: hp(0.3),
  },
  dateText: {
    fontSize: ms(10, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  cardBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoSection: {
    flex: 1,
    marginRight: wp(3),
  },
  paymentTitle: {
    fontSize: ms(12.5, 0.3),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    marginBottom: hp(0.2),
  },
  paymentSubtitle: {
    fontSize: ms(10.5, 0.3),
    color: '#9CA3AF',
    fontFamily: 'Inter_400Regular',
  },
  amountText: {
    fontSize: ms(12.5, 0.3),
    fontFamily: 'Inter_700Bold',
  },
  transactionIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    marginTop: hp(0.6),
    paddingTop: hp(0.6),
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
  },
  transactionIdText: {
    fontSize: ms(9.5, 0.3),
    color: '#6B7280',
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
  copyBtn: {
    width: wp(6),
    height: wp(6),
    borderRadius: wp(3),
    backgroundColor: '#1F1F1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: wp(1),
  },
  copyBtnActive: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },

  /* Report Button */
  reportFooter: {
    paddingHorizontal: wp(4),
    paddingTop: hp(1),
    paddingBottom: hp(2) + 10,
    borderTopWidth: 1,
    borderTopColor: '#1F1F1F',
    backgroundColor: '#000',
  },
  reportBtnWrap: {
    marginTop: 0,
    marginBottom: 0,
  },
  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1.4),
    borderRadius: wp(3.5),
  },
  reportIcon: {
    marginRight: wp(2),
  },
  reportBtnText: {
    color: '#fff',
    fontSize: ms(15, 0.3),
    fontFamily: 'Inter_700Bold',
  },
});