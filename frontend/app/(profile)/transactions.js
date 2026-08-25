import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ms, s, vs, hp, wp } from '../../utils/responsive';
import { walletAPI } from '../../utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = ['All', 'Recharges', 'Gifts', 'Sessions'];

const SkeletonTransactionItem = ({ opacity }) => (
  <View style={styles.transactionCard}>
    <View style={styles.cardHeader}>
      <Animated.View style={[styles.skeletonHeader, { opacity }]} />
    </View>
    <View style={styles.cardBody}>
      <View style={styles.infoSection}>
        <Animated.View style={[styles.skeletonTitle, { opacity }]} />
        <Animated.View style={[styles.skeletonSubtitle, { opacity }]} />
      </View>
      <Animated.View style={[styles.skeletonAmount, { opacity }]} />
    </View>
  </View>
);

export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [userRole, setUserRole] = useState('USER');
  const [activeTab, setActiveTab] = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const shimmerAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const fetchRole = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role) setUserRole(user.role);
        }
      } catch (err) {
        console.log('Error fetching userRole in transactions page:', err);
      }
    };
    fetchRole();
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const loadData = useCallback(async (pageNum = 1, isRefreshing = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      
      const tabType = activeTab.replace(' ', '');
      const [transRes, balanceRes] = await Promise.all([
        walletAPI.getTransactions(pageNum, 20, tabType),
        walletAPI.getBalance()
      ]);

      const newTransactions = transRes.data.transactions;
      if (isRefreshing || pageNum === 1) {
        setTransactions(newTransactions);
      } else {
        setTransactions(prev => [...prev, ...newTransactions]);
      }

      setBalance(balanceRes.data.coins);
      setHasMore(newTransactions.length === 20);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData(1);
  }, [activeTab]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(1, true);
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadData(page + 1);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const options = { month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const renderTransactionItem = ({ item }) => {
    const isCredit = item.coins > 0 || item.amount > 0;
    const date = formatDate(item.createdAt);
    
    let title = item.description || 'Transaction';
    let subtitle = '';
    let duration = '';
    const isCallDebit = item.type === 'call_debit';

    const rawSessionId = item.metadata?.sessionId?._id || item.metadata?.sessionId;
    const sessionDisplayId = rawSessionId ? String(rawSessionId).slice(-8) : item._id.toString().slice(-8);

    if (item.type === 'call_debit') {
      const listenerName = item.metadata?.sessionId?.listenerId?.name || 'Listener';
      const diamonds = Math.abs(item.coins / 10);
      title = `${diamonds} ${diamonds === 1 ? 'Diamond' : 'Diamonds'} used for session with ${listenerName}`;
      subtitle = item.description || 'Call minute deducted';
      if (item.metadata?.sessionId?.duration) {
        duration = ` •  ${item.metadata.sessionId.duration.toString().padStart(2, '0')} m`;
      }
    } else if (item.type === 'purchase') {
      title = `Wallet Recharge (Success)`;
      subtitle = `Paid ₹${item.amount} for ${item.coins} Coins`;
    } else if (item.type === 'gift_send') {
      title = `Gift Sent: ${item.description.replace('Sent gift: ', '')}`;
      const recipientName = item.metadata?.sessionId?.listenerId?.name;
      subtitle = recipientName ? `Sent to ${recipientName} during session` : 'Gift sent';
    } else if (item.type === 'gift_receive') {
      title = `Gift Received: ${item.description.replace('Received gift: ', '')}`;
      const senderName = item.metadata?.sessionId?.userId?.name;
      subtitle = senderName ? `Received from ${senderName} during session` : 'Gift received';
    } else if (item.type === 'call_credit') {
      title = 'Session Earnings';
      subtitle = item.description || 'Call earnings credited';
      if (item.metadata?.sessionId?.duration) {
        duration = ` • ${item.metadata.sessionId.duration.toString().padStart(2, '0')} m`;
      }
    } else if (item.type === 'signup_bonus') {
      title = `Signup Bonus (Free Coins)`;
      subtitle = `Received ${item.coins} Coins`;
    } else if (item.type === 'refund') {
      title = `Coins Refunded`;
      subtitle = `Credited ${item.coins} Coins`;
    }

    return (
      <View style={styles.transactionCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>• {date}{duration}</Text>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoSection}>
            <Text style={styles.transactionTitle}>{title}</Text>
            {subtitle ? <Text style={styles.transactionSubtitle}>{subtitle}</Text> : null}
            <TouchableOpacity onPress={() => {/* Download invoice logic */}}>
              <Text style={styles.transactionIdText}>ID: {sessionDisplayId}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.amountSection}>
            <Text style={[styles.amountText, { color: isCredit ? '#22C55E' : '#EF4444' }]}>
              {item.coins !== 0 ? (
                isCallDebit ? (
                  `${item.coins > 0 ? '+' : ''}${item.coins / 10}`
                ) : (
                  `${item.coins > 0 ? '+' : ''}${item.coins}`
                )
              ) : (
                `+₹${(item.amount || 0).toFixed(2)}`
              )}
            </Text>
            {item.coins !== 0 ? (
              isCallDebit ? (
                <View style={[styles.coinIconContainer, { backgroundColor: '#38BDF8' }]}>
                  <Text style={{ fontSize: ms(12) }}>💎</Text>
                </View>
              ) : (
                <View style={styles.coinIconContainer}>
                  <Text style={{ fontSize: ms(12) }}>🪙</Text>
                </View>
              )
            ) : (
              <View style={[styles.coinIconContainer, { backgroundColor: 'rgba(34, 197, 94, 0.2)' }]}>
                <Text style={{ fontSize: ms(12), color: '#22C55E', fontWeight: 'bold' }}>₹</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      
      {}
      <View style={[styles.header, {}]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={wp(6)} color="#fff" />
          <Text style={styles.headerTitle}>Transactions</Text>
        </TouchableOpacity>
        {userRole !== 'LISTENER' && (
          <View style={styles.balanceBadge}>
            <Text style={{ fontSize: 14 }}>🪙</Text>
            <Text style={styles.balanceText}>{balance}</Text>
          </View>
        )}
      </View>

      {}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsScroll}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab && styles.activeTab]}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading && page === 1 ? (
        <FlatList
          data={[1, 2, 3, 4, 5]}
          keyExtractor={(item) => item.toString()}
          renderItem={() => <SkeletonTransactionItem opacity={shimmerAnim} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={transactions}
          renderItem={renderTransactionItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#A855F7" />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color="#333" />
              <Text style={styles.emptyText}>No transactions found</Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? <ActivityIndicator color="#A855F7" style={{ marginVertical: 20 }} /> : null
          }
        />
      )}
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
    justifyContent: 'space-between',
    paddingHorizontal: wp(4),
    paddingVertical: hp(2),
    backgroundColor: '#000',
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
  balanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  balanceText: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_600SemiBold',
  },
  tabsContainer: {
    marginTop: vs(10),
    marginBottom: vs(15),
  },
  tabsScroll: {
    paddingHorizontal: wp(5),
    gap: wp(3),
  },
  tab: {
    paddingHorizontal: wp(6),
    paddingVertical: vs(10),
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTab: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  tabText: {
    color: '#9CA3AF',
    fontSize: ms(14),
    fontFamily: 'Inter_600SemiBold',
  },
  activeTabText: {
    color: '#000',
  },
  listContent: {
    paddingHorizontal: wp(5),
    paddingBottom: vs(20),
  },
  transactionCard: {
    paddingVertical: vs(18),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardHeader: {
    marginBottom: vs(8),
  },
  dateText: {
    color: '#6B7280',
    fontSize: ms(12),
    fontFamily: 'Inter_400Regular',
  },
  cardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoSection: {
    flex: 1,
    marginRight: wp(4),
  },
  transactionTitle: {
    color: '#fff',
    fontSize: ms(16),
    fontFamily: 'Inter_600SemiBold',
    lineHeight: ms(22),
    marginBottom: 4,
  },
  transactionSubtitle: {
    color: '#9CA3AF',
    fontSize: ms(13),
    fontFamily: 'Inter_400Regular',
  },
  transactionIdText: {
    color: '#9CA3AF',
    fontSize: ms(13),
    fontFamily: 'Inter_400Regular',
    textDecorationLine: 'underline',
    marginTop: 2,
  },
  amountSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountText: {
    fontSize: ms(18),
    fontFamily: 'Inter_700Bold',
  },
  coinIconContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(15),
    gap: 15,
  },
  emptyText: {
    color: '#4B5563',
    fontSize: ms(16),
    fontFamily: 'Inter_400Regular',
  },
  skeletonHeader: {
    width: s(80),
    height: vs(12),
    borderRadius: 6,
    backgroundColor: '#1F2937',
    marginBottom: vs(4),
  },
  skeletonTitle: {
    width: '70%',
    height: vs(16),
    borderRadius: 8,
    backgroundColor: '#1F2937',
    marginBottom: vs(8),
  },
  skeletonSubtitle: {
    width: '45%',
    height: vs(12),
    borderRadius: 6,
    backgroundColor: '#111827',
  },
  skeletonAmount: {
    width: s(60),
    height: vs(24),
    borderRadius: 12,
    backgroundColor: '#1F2937',
  },
});
