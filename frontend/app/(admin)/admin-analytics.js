import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { adminAPI } from '../../utils/api';
import { LineChart, BarChart, PieChart } from "react-native-gifted-charts";
import { AdminPageSkeleton } from '../../components/admin/Skeleton';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function AdminAnalytics() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState('7');

  const TIMELINE_OPTIONS = [
    { id: '7', label: '7D' },
    { id: '30', label: '1M' },
    { id: '90', label: '3M' },
    { id: '365', label: '1Y' },
  ];

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getStats({ timeline });
      setStats(res.data);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeline]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <AdminPageSkeleton type="analytics" />
      </View>
    );
  }

  const revenueData = (stats.charts?.dailyRevenue || []).map(item => ({
    value: item.amount,
    label: item._id.split('-').slice(1).join('/'),
  }));

  const userGrowthData = (stats.charts?.dailyRegistrations || []).map(item => ({
    value: item.count,
    label: item._id.split('-').slice(1).join('/'),
  }));

  const totalPeople = (stats.totalUsers || 0) + (stats.totalListeners || 0);

  const pieData = [
    { 
      value: stats.totalUsers || 0.1, 
      color: '#A855F7', 
      gradientCenterColor: '#7C3AED',
      text: 'Users',
      actualValue: stats.totalUsers || 0
    },
    { 
      value: stats.totalListeners || 0.1, 
      color: '#10B981', 
      gradientCenterColor: '#059669',
      text: 'Listeners',
      actualValue: stats.totalListeners || 0
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Platform Analytics</Text>
      </View>

      <View style={styles.timelineContainer}>
        {TIMELINE_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={[styles.timelineBtn, timeline === opt.id && styles.timelineBtnActive]}
            onPress={() => setTimeline(opt.id)}
            activeOpacity={0.7}
          >
            <Text style={[styles.timelineText, timeline === opt.id && styles.timelineTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Active Today</Text>
            <Text style={styles.summaryValue}>{stats.activeUsersToday || 0}</Text>
            <Text style={styles.summarySubtext}>Users online</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Calls</Text>
            <Text style={styles.summaryValue}>{stats.totalCalls || 0}</Text>
            <Text style={styles.summarySubtext}>Completed sessions</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>User Distribution</Text>
        <View style={styles.chartCard}>
          <View style={styles.pieContainer}>
            <View style={styles.pieWrapper}>
              <PieChart
                data={pieData}
                donut
                showGradient
                sectionAutoFocus
                radius={wp(22)}
                innerRadius={wp(15)}
                innerCircleColor={'#0A0A0A'}
                centerLabelComponent={() => (
                  <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: ms(24), fontFamily: 'Inter_900Black' }}>
                      {totalPeople}
                    </Text>
                    <Text style={{ color: '#6B7280', fontSize: ms(10), fontFamily: 'Inter_600SemiBold', marginTop: -2 }}>
                      TOTAL
                    </Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.legend}>
              {pieData.map((item, index) => {
                const percentage = totalPeople > 0 ? Math.round((item.actualValue / totalPeople) * 100) : 0;
                return (
                  <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <View style={{ flex: 1, marginLeft: s(10) }}>
                      <Text style={styles.legendText}>{item.text}</Text>
                      <Text style={styles.legendValue}>{item.actualValue.toLocaleString()}</Text>
                    </View>
                    <Text style={styles.legendPercentage}>{percentage}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Revenue Performance</Text>
        <View style={styles.chartCard}>
          <LineChart
            data={revenueData}
            color="#10B981"
            thickness={3}
            dataPointsColor="#10B981"
            noOfSections={4}
            yAxisTextStyle={{ color: '#6B7280', fontSize: ms(10) }}
            xAxisLabelTextStyle={{ color: '#6B7280', fontSize: ms(10) }}
            width={SCREEN_WIDTH - s(80)}
            height={vs(180)}
            spacing={s(45)}
            curved
            areaChart
            hideRules
            startFillColor="rgba(16, 185, 129, 0.3)"
            endFillColor="rgba(16, 185, 129, 0.01)"
          />
        </View>

        <Text style={styles.sectionTitle}>Registration Trends</Text>
        <View style={styles.chartCard}>
          <BarChart
            data={userGrowthData}
            barWidth={s(25)}
            noOfSections={4}
            barBorderRadius={6}
            frontColor="#A855F7"
            yAxisTextStyle={{ color: '#6B7280', fontSize: ms(10) }}
            xAxisLabelTextStyle={{ color: '#6B7280', fontSize: ms(10) }}
            width={SCREEN_WIDTH - s(80)}
            height={vs(180)}
            hideRules
          />
        </View>

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
    padding: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: { marginRight: wp(4) },
  headerTitle: { fontSize: ms(20), color: '#fff', fontFamily: 'Inter_700Bold' },
  timelineContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: wp(3),
    paddingVertical: hp(1.5),
    paddingHorizontal: wp(4),
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  timelineBtn: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(5),
    borderRadius: 20,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  timelineBtnActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#A855F7',
  },
  timelineText: {
    color: '#6B7280',
    fontSize: ms(12),
    fontFamily: 'Inter_600SemiBold',
  },
  timelineTextActive: {
    color: '#A855F7',
  },
  scrollContent: { padding: wp(4) },
  summaryGrid: { flexDirection: 'row', gap: wp(4), marginBottom: hp(3) },
  summaryCard: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    borderRadius: 20,
    padding: wp(4),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  summaryLabel: { color: '#9CA3AF', fontSize: ms(12) },
  summaryValue: { color: '#fff', fontSize: ms(24), fontFamily: 'Inter_900Black', marginVertical: hp(0.5) },
  summarySubtext: { color: '#10B981', fontSize: ms(10), fontFamily: 'Inter_700Bold' },
  sectionTitle: { fontSize: ms(18), color: '#fff', fontFamily: 'Inter_800ExtraBold', marginBottom: hp(2), marginTop: hp(1) },
  chartCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: 24,
    padding: wp(5),
    marginBottom: hp(3),
    borderWidth: 1,
    borderColor: '#111',
  },
  pieContainer: { flexDirection: 'column', alignItems: 'center' },
  pieWrapper: { marginBottom: hp(3) },
  legend: { width: '100%', gap: hp(1.5), paddingHorizontal: wp(2) },
  legendItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#111',
    padding: wp(3),
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1F1F1F'
  },
  legendDot: { width: wp(3), height: wp(3), borderRadius: wp(1.5) },
  legendText: { color: '#9CA3AF', fontSize: ms(11), fontFamily: 'Inter_500Medium' },
  legendValue: { color: '#fff', fontSize: ms(16), fontFamily: 'Inter_800ExtraBold', marginTop: 2 },
  legendPercentage: { color: '#fff', fontSize: ms(16), fontFamily: 'Inter_700Bold' },
});
