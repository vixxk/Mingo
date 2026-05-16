import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  ScrollView,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, hp, wp } from '../../utils/responsive';
import { walletAPI } from '../../utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TABS = ['All', 'Payments', 'Sessions', 'Free Coins'];

export default function TransactionsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('All');
  const [transactions, setTransactions] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

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
    const isCredit = item.coins > 0;
    const date = formatDate(item.createdAt);
    
    let title = item.description || 'Transaction';
    let subtitle = `Transaction ID: ${item._id.toString().slice(-8)}`;
    let duration = '';

    if (item.type === 'call_debit') {
      const listenerName = item.metadata?.sessionId?.listenerId?.name || 'Listener';
      const diamonds = Math.abs(item.coins / 10);
      title = `${diamonds} Diamond used for session with ${listenerName}`;
      if (item.metadata?.sessionId?.duration) {
        duration = ` •  ${item.metadata.sessionId.duration.toString().padStart(2, '0')} m`;
      }
    } else if (item.type === 'purchase') {
      title = `Wallet recharge ₹${item.amount}`;
      subtitle = 'Download Invoice';
    } else if (item.type === 'gift_send') {
      title = `Gift sent: ${item.description.split(': ')[1] || 'Gift'}`;
    }

    return (
      <View style={styles.transactionCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>•  {date}{duration}</Text>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoSection}>
            <Text style={styles.transactionTitle}>{title}</Text>
            <TouchableOpacity onPress={() => {/* Download invoice logic */}}>
              <Text style={styles.transactionSubtitle}>{subtitle}</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.amountSection}>
            <Text style={[styles.amountText, { color: isCredit ? '#22C55E' : '#EF4444' }]}>
              {isCredit ? '+' : ''}{item.coins}
            </Text>
            <View style={styles.coinIconContainer}>
              <Text style={{ fontSize: ms(12) }}>🪙</Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <SafeAreaView style={{ flex: 0, backgroundColor: '#000' }} />
      
      {}
      <View style={[styles.header, { paddingTop: insets.top + vs(10) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transactions</Text>
        <View style={styles.balanceBadge}>
          <Text style={{ fontSize: 14 }}>🪙</Text>
          <Text style={styles.balanceText}>{balance}</Text>
        </View>
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
        <View style={styles.centerContainer}>
          <ActivityIndicator color="#A855F7" size="large" />
        </View>
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
    paddingHorizontal: wp(5),
    paddingBottom: vs(15),
    backgroundColor: '#000',
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: ms(20),
    fontFamily: 'Inter_700Bold',
    color: '#fff',
    marginLeft: wp(4),
    flex: 1,
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
    textDecorationLine: 'underline',
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
});
