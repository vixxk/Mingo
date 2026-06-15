import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Switch,
  Modal,
  Animated,
  Platform,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { adminAPI } from '../../utils/api';
import { PieChart } from "react-native-gifted-charts";
import { AdminPageSkeleton } from '../../components/admin/Skeleton';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getDaysInMonth = (month, year) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (month, year) => {
  return new Date(year, month, 1).getDay();
};

function AnalyticsPopup({ visible, type, title, message, onClose }) {
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
              style={st.actionBtn} 
              activeOpacity={0.85} 
              onPress={onClose}
            >
              <LinearGradient
                colors={btnColors}
                style={st.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={st.actionText}>Got it</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
}

export default function AdminAnalytics() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeline, setTimeline] = useState('7');

  // PDF Export States
  const [pdfTimeline, setPdfTimeline] = useState('7');
  const [useSpecificDay, setUseSpecificDay] = useState(false);
  const [specificDayText, setSpecificDayText] = useState('');
  
  const [includeUsers, setIncludeUsers] = useState(true);
  const [includeListeners, setIncludeListeners] = useState(true);
  const [includeGifts, setIncludeGifts] = useState(true);
  const [includeTransactions, setIncludeTransactions] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Popup modal state
  const [popup, setPopup] = useState({ visible: false, type: 'success', title: '', message: '' });

  // Calendar states
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMode, setCalendarMode] = useState('single'); // 'single' or 'range'
  const [calendarModalVisible, setCalendarModalVisible] = useState(false);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStartDate, setSelectedStartDate] = useState(null);
  const [selectedEndDate, setSelectedEndDate] = useState(null);

  const TIMELINE_OPTIONS = [
    { id: '7', label: '7D' },
    { id: '30', label: '1M' },
    { id: '90', label: '3M' },
    { id: '365', label: '1Y' },
  ];

  const loadData = async (isRefresher = false) => {
    try {
      if (!isRefresher) setLoading(true);
      const res = await adminAPI.getStats({ timeline });
      setStats(res.data);
    } catch (e) {
      console.error('Failed to load analytics:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
  }, [timeline]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [timeline])
  );

  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const handleDayPress = (dateObj) => {
    if (calendarMode === 'single') {
      setSelectedDate(dateObj);
    } else {
      if (!selectedStartDate || (selectedStartDate && selectedEndDate)) {
        setSelectedStartDate(dateObj);
        setSelectedEndDate(null);
      } else if (dateObj < selectedStartDate) {
        setSelectedStartDate(dateObj);
      } else {
        setSelectedEndDate(dateObj);
      }
    }
  };

  const isDateSelected = (dateObj) => {
    const formatYMD = (d) => d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : '';
    const targetYMD = formatYMD(dateObj);
    
    if (calendarMode === 'single') {
      return formatYMD(selectedDate) === targetYMD;
    } else {
      return formatYMD(selectedStartDate) === targetYMD || formatYMD(selectedEndDate) === targetYMD;
    }
  };

  const isDateInRange = (dateObj) => {
    if (calendarMode === 'range' && selectedStartDate && selectedEndDate) {
      return dateObj >= selectedStartDate && dateObj <= selectedEndDate;
    }
    return false;
  };

  const handleApplyDates = () => {
    if (calendarMode === 'single') {
      if (!selectedDate) {
        setPopup({
          visible: true,
          type: 'error',
          title: 'Selection Missing',
          message: 'Please select a day on the calendar.'
        });
        return;
      }
      setSpecificDayText(selectedDate.toISOString().split('T')[0]);
      setUseSpecificDay(true);
      setSelectedStartDate(null);
      setSelectedEndDate(null);
    } else {
      if (!selectedStartDate || !selectedEndDate) {
        setPopup({
          visible: true,
          type: 'error',
          title: 'Selection Missing',
          message: 'Please select both a start date and an end date.'
        });
        return;
      }
      setSpecificDayText(`${selectedStartDate.toISOString().split('T')[0]} to ${selectedEndDate.toISOString().split('T')[0]}`);
      setUseSpecificDay(true);
      setSelectedDate(null);
    }
    setCalendarModalVisible(false);
  };

  const handleExportPDF = async () => {
    try {
      setGeneratingPdf(true);
      
      const params = {};
      if (useSpecificDay) {
        if (!specificDayText) {
          setPopup({
            visible: true,
            type: 'error',
            title: 'Date Selection Missing',
            message: 'Please choose a specific day or date range to generate the report.'
          });
          setGeneratingPdf(false);
          return;
        }
        if (specificDayText.includes(' to ')) {
          const parts = specificDayText.split(' to ');
          params.startDate = parts[0];
          params.endDate = parts[1];
        } else {
          params.specificDay = specificDayText;
        }
      } else {
        params.timeline = pdfTimeline;
      }
      
      const types = [];
      if (includeUsers) types.push('users');
      if (includeListeners) types.push('listeners');
      if (includeGifts) types.push('gifts');
      if (includeTransactions) types.push('transactions');
      
      if (types.length === 0) {
        setPopup({
          visible: true,
          type: 'error',
          title: 'No Sections Selected',
          message: 'Please choose at least one data section (e.g. Registered Users) to include.'
        });
        setGeneratingPdf(false);
        return;
      }
      
      params.types = types.join(',');
      
      const res = await adminAPI.getExportData(params);
      const data = res.data || {};
      
      let htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; background-color: #ffffff; color: #333333; }
              h1 { color: #A855F7; border-bottom: 2px solid #A855F7; padding-bottom: 10px; font-size: 24px; margin-bottom: 5px; }
              h2 { color: #111111; margin-top: 30px; font-size: 18px; border-bottom: 1px solid #eeeeee; padding-bottom: 5px; }
              table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; font-size: 11px; }
              th { background-color: #f3f4f6; color: #374151; font-weight: bold; text-align: left; padding: 8px; border: 1px solid #e5e7eb; }
              td { padding: 8px; border: 1px solid #e5e7eb; word-break: break-word; }
              tr:nth-child(even) { background-color: #f9fafb; }
              .meta-box { background-color: #f3f4f6; border-radius: 8px; padding: 12px; margin-bottom: 20px; font-size: 12px; line-height: 1.5; }
              .meta-title { font-weight: bold; color: #111111; }
              .empty-msg { color: #9ca3af; font-style: italic; padding: 10px 0; }
            </style>
          </head>
          <body>
            <h1>Mingo Analytical Report</h1>
            <div class="meta-box">
              <div><span class="meta-title">Report Generated:</span> ${new Date().toLocaleString()}</div>
              <div><span class="meta-title">Filter Span:</span> ${useSpecificDay ? `Day/Range: ${specificDayText}` : `${pdfTimeline === 'all' ? 'All Time' : `${pdfTimeline} Days`}`}</div>
            </div>
      `;

      if (includeUsers && data.users) {
        htmlContent += `
          <h2>Registered Users (${data.users.length})</h2>
          ${data.users.length === 0 ? '<div class="empty-msg">No users registered during this period</div>' : `
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Registered At</th>
                </tr>
              </thead>
              <tbody>
                ${data.users.map(u => `
                  <tr>
                    <td>${u.name || '-'}</td>
                    <td>${u.username || '-'}</td>
                    <td>${u.phone || '-'}</td>
                    <td>${u.email || '-'}</td>
                    <td>${u.isBanned ? 'Banned' : 'Active'}</td>
                    <td>${new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        `;
      }

      if (includeListeners && data.listeners) {
        htmlContent += `
          <h2>Approved Listeners (${data.listeners.length})</h2>
          ${data.listeners.length === 0 ? '<div class="empty-msg">No listeners found</div>' : `
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Phone</th>
                  <th>Total Earnings</th>
                  <th>Rating</th>
                  <th>Verified</th>
                </tr>
              </thead>
              <tbody>
                ${data.listeners.map(l => `
                  <tr>
                    <td>${l.userId?.name || '-'}</td>
                    <td>${l.userId?.username || '-'}</td>
                    <td>${l.userId?.phone || '-'}</td>
                    <td>₹${(l.earnings || 0).toFixed(2)}</td>
                    <td>${l.rating || 0} ★ (${l.totalSessions || 0} sessions)</td>
                    <td>${l.verified ? 'Yes' : 'No'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        `;
      }

      if (includeGifts && data.gifts) {
        htmlContent += `
          <h2>Gift Transactions (${data.gifts.length})</h2>
          ${data.gifts.length === 0 ? '<div class="empty-msg">No gift logs during this period</div>' : `
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Type</th>
                  <th>Coins</th>
                  <th>Amount (₹)</th>
                  <th>Description</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${data.gifts.map(g => `
                  <tr>
                    <td>${g.userId?.name || 'System'} (${g.userId?.username || '-'})</td>
                    <td>${g.type}</td>
                    <td>${g.coins}</td>
                    <td>₹${g.amount}</td>
                    <td>${g.description || '-'}</td>
                    <td>${new Date(g.createdAt).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        `;
      }

      if (includeTransactions && data.transactions) {
        htmlContent += `
          <h2>Wallet Transactions (${data.transactions.length})</h2>
          ${data.transactions.length === 0 ? '<div class="empty-msg">No wallet transactions during this period</div>' : `
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Type</th>
                  <th>Coins</th>
                  <th>Amount (₹)</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${data.transactions.map(t => `
                  <tr>
                    <td>${t.userId?.name || 'System'} (${t.userId?.username || '-'})</td>
                    <td>${t.type}</td>
                    <td>${t.coins}</td>
                    <td>₹${t.amount}</td>
                    <td>${t.description || '-'}</td>
                    <td>${t.status}</td>
                    <td>${new Date(t.createdAt).toLocaleString()}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        `;
      }

      htmlContent += `
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      const friendlyName = `Mingo_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      const targetUri = `${FileSystem.cacheDirectory}${friendlyName}`;
      
      await FileSystem.copyAsync({
        from: uri,
        to: targetUri
      });

      if (Platform.OS === 'android') {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (permissions.granted) {
          const base64 = await FileSystem.readAsStringAsync(targetUri, { encoding: FileSystem.EncodingType.Base64 });
          const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
            permissions.directoryUri,
            friendlyName,
            'application/pdf'
          );
          await FileSystem.writeAsStringAsync(fileUri, base64, { encoding: FileSystem.EncodingType.Base64 });
          
          setPopup({
            visible: true,
            type: 'success',
            title: 'Report Downloaded',
            message: 'Your analytical PDF report has been generated and saved to your chosen folder successfully!'
          });
        } else {
          await Sharing.shareAsync(targetUri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Download PDF',
            UTI: 'com.adobe.pdf'
          });
        }
      } else {
        await Sharing.shareAsync(targetUri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Download PDF',
          UTI: 'com.adobe.pdf'
        });
      }
    } catch (e) {
      console.error('Failed to generate PDF:', e);
      setPopup({
        visible: true,
        type: 'error',
        title: 'Export Failed',
        message: 'Could not export analytical report: ' + e.message
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar style="light" />
        <AdminPageSkeleton type="analytics" />
      </View>
    );
  }

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

  // Calendar setup
  const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
  const firstDay = getFirstDayOfMonth(calendarMonth, calendarYear);
  const daysGrid = [];
  for (let i = 0; i < firstDay; i++) {
    daysGrid.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysGrid.push(new Date(calendarYear, calendarMonth, d));
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Platform Analytics</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#A855F7']}
            tintColor="#A855F7"
          />
        }
      >
        {/* PDF Export Section */}
        <Text style={styles.sectionTitle}>Export Report (PDF)</Text>
        <View style={styles.chartCard}>
          <Text style={styles.pdfLabel}>Time Span</Text>
          <View style={styles.pdfTimelineRow}>
            {TIMELINE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.pdfTimelineBtn, pdfTimeline === opt.id && !useSpecificDay && styles.pdfTimelineBtnActive]}
                onPress={() => {
                  setPdfTimeline(opt.id);
                  setUseSpecificDay(false);
                }}
              >
                <Text style={[styles.pdfTimelineBtnText, pdfTimeline === opt.id && !useSpecificDay && styles.pdfTimelineBtnTextActive]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Filter by Day / Range</Text>
            <Switch
              value={useSpecificDay}
              onValueChange={setUseSpecificDay}
              trackColor={{ false: '#222', true: '#A855F7' }}
              thumbColor={useSpecificDay ? '#fff' : '#888'}
            />
          </View>

          {useSpecificDay && (
            <TouchableOpacity 
              style={styles.dateSelectorTrigger}
              onPress={() => setCalendarModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={[styles.dateSelectorText, specificDayText ? { color: '#fff' } : { color: '#6B7280' }]}>
                {specificDayText || 'Select Date / Date Range'}
              </Text>
              <Ionicons name="calendar" size={18} color="#A855F7" />
            </TouchableOpacity>
          )}

          <Text style={[styles.pdfLabel, { marginTop: hp(2) }]}>Include Sections</Text>
          
          <View style={styles.checkboxRow}>
            <Text style={styles.checkboxLabel}>Registered Users</Text>
            <Switch
              value={includeUsers}
              onValueChange={setIncludeUsers}
              trackColor={{ false: '#222', true: '#A855F7' }}
              thumbColor={includeUsers ? '#fff' : '#888'}
            />
          </View>
          <View style={styles.checkboxRow}>
            <Text style={styles.checkboxLabel}>Approved Listeners</Text>
            <Switch
              value={includeListeners}
              onValueChange={setIncludeListeners}
              trackColor={{ false: '#222', true: '#A855F7' }}
              thumbColor={includeListeners ? '#fff' : '#888'}
            />
          </View>
          <View style={styles.checkboxRow}>
            <Text style={styles.checkboxLabel}>Gifts Sent/Received</Text>
            <Switch
              value={includeGifts}
              onValueChange={setIncludeGifts}
              trackColor={{ false: '#222', true: '#A855F7' }}
              thumbColor={includeGifts ? '#fff' : '#888'}
            />
          </View>
          <View style={styles.checkboxRow}>
            <Text style={styles.checkboxLabel}>Wallet & Call Transactions</Text>
            <Switch
              value={includeTransactions}
              onValueChange={setIncludeTransactions}
              trackColor={{ false: '#222', true: '#A855F7' }}
              thumbColor={includeTransactions ? '#fff' : '#888'}
            />
          </View>

          <TouchableOpacity 
            style={[styles.downloadBtn, generatingPdf && styles.downloadBtnDisabled]} 
            onPress={handleExportPDF}
            disabled={generatingPdf}
            activeOpacity={0.8}
          >
            {generatingPdf ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="document-text" size={18} color="#fff" style={{ marginRight: s(6) }} />
                <Text style={styles.downloadBtnText}>Export & Download PDF</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

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

            {/* User Distribution Timeline Selector */}
            <View style={[styles.timelineContainer, { marginTop: hp(2.5), width: '100%', borderBottomWidth: 0, paddingVertical: 0 }]}>
              {TIMELINE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.timelineBtn, { flex: 1, alignItems: 'center' }, timeline === opt.id && styles.timelineBtnActive]}
                  onPress={() => setTimeline(opt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timelineText, timeline === opt.id && styles.timelineTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={{ height: hp(10) }} />
      </ScrollView>

      {/* Calendar Picker Modal */}
      <Modal 
        transparent 
        visible={calendarModalVisible} 
        onRequestClose={() => setCalendarModalVisible(false)} 
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.calendarModal}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>
                {calendarMode === 'single' ? 'Select Date' : 'Select Date Range'}
              </Text>
              <TouchableOpacity onPress={() => setCalendarModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarModeSelector}>
              <TouchableOpacity 
                style={[styles.calendarModeBtn, calendarMode === 'single' && styles.calendarModeBtnActive]}
                onPress={() => setCalendarMode('single')}
              >
                <Text style={[styles.calendarModeText, calendarMode === 'single' && styles.calendarModeTextActive]}>
                  Single Day
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.calendarModeBtn, calendarMode === 'range' && styles.calendarModeBtnActive]}
                onPress={() => setCalendarMode('range')}
              >
                <Text style={[styles.calendarModeText, calendarMode === 'range' && styles.calendarModeTextActive]}>
                  Date Range
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.monthController}>
              <TouchableOpacity onPress={handlePrevMonth}>
                <Ionicons name="chevron-back" size={20} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.monthYearText}>
                {new Date(calendarYear, calendarMonth).toLocaleString('default', { month: 'long' })} {calendarYear}
              </Text>
              <TouchableOpacity onPress={handleNextMonth}>
                <Ionicons name="chevron-forward" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.daysOfWeekRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <Text key={day} style={styles.dayOfWeekText}>{day}</Text>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {daysGrid.map((dateObj, index) => {
                if (!dateObj) {
                  return <View key={`empty-${index}`} style={styles.dayCellEmpty} />;
                }
                
                const dayNum = dateObj.getDate();
                const isSelected = isDateSelected(dateObj);
                const isInRange = isDateInRange(dateObj);

                return (
                  <TouchableOpacity
                    key={`day-${dayNum}`}
                    style={[
                      styles.dayCell,
                      isSelected && styles.dayCellSelected,
                      isInRange && styles.dayCellInRange
                    ]}
                    onPress={() => handleDayPress(dateObj)}
                  >
                    <Text style={[
                      styles.dayCellText,
                      isSelected && styles.dayCellTextSelected,
                      isInRange && styles.dayCellTextInRange
                    ]}>
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.selectionFeedback}>
              {calendarMode === 'single' ? (
                <Text style={styles.feedbackInfo}>
                  Selected: {selectedDate ? selectedDate.toLocaleDateString() : 'None'}
                </Text>
              ) : (
                <Text style={styles.feedbackInfo}>
                  Range: {selectedStartDate ? selectedStartDate.toLocaleDateString() : 'Start'} to {selectedEndDate ? selectedEndDate.toLocaleDateString() : 'End'}
                </Text>
              )}
            </View>

            <TouchableOpacity style={styles.applyDateBtn} onPress={handleApplyDates}>
              <Text style={styles.applyDateBtnText}>Apply Selection</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Popup Modal */}
      <AnalyticsPopup
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
  pdfLabel: {
    color: '#9CA3AF',
    fontSize: ms(13),
    fontFamily: 'Inter_700Bold',
    marginBottom: hp(1),
  },
  pdfTimelineRow: {
    flexDirection: 'row',
    gap: wp(2),
    marginBottom: hp(2),
  },
  pdfTimelineBtn: {
    flex: 1,
    paddingVertical: hp(1),
    borderRadius: 12,
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    alignItems: 'center',
  },
  pdfTimelineBtnActive: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
    borderColor: '#A855F7',
  },
  pdfTimelineBtnText: {
    color: '#6B7280',
    fontSize: ms(12),
    fontFamily: 'Inter_600SemiBold',
  },
  pdfTimelineBtnTextActive: {
    color: '#A855F7',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: hp(1),
  },
  toggleLabel: {
    color: '#fff',
    fontSize: ms(13),
    fontFamily: 'Inter_500Medium',
  },
  dateSelectorTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#111',
    borderRadius: 12,
    padding: wp(3),
    borderWidth: 1,
    borderColor: '#1F1F1F',
    marginTop: hp(0.5),
  },
  dateSelectorText: {
    fontSize: ms(13),
    fontFamily: 'Inter_500Medium',
  },
  checkboxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: hp(1.2),
    borderBottomWidth: 1,
    borderBottomColor: '#141414',
  },
  checkboxLabel: {
    color: '#D1D5DB',
    fontSize: ms(13),
  },
  downloadBtn: {
    backgroundColor: '#A855F7',
    paddingVertical: hp(1.8),
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(3),
  },
  downloadBtnDisabled: {
    opacity: 0.6,
  },
  downloadBtnText: {
    color: '#fff',
    fontSize: ms(15),
    fontFamily: 'Inter_700Bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: wp(4),
  },
  calendarModal: {
    width: '100%',
    maxWidth: wp(90),
    backgroundColor: '#0F0F0F',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#1F1F1F',
    padding: wp(5),
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  calendarTitle: {
    color: '#fff',
    fontSize: ms(16),
    fontFamily: 'Inter_700Bold',
  },
  calendarModeSelector: {
    flexDirection: 'row',
    backgroundColor: '#161616',
    borderRadius: 12,
    padding: wp(1),
    marginBottom: hp(2),
  },
  calendarModeBtn: {
    flex: 1,
    paddingVertical: hp(1),
    alignItems: 'center',
    borderRadius: 10,
  },
  calendarModeBtnActive: {
    backgroundColor: '#A855F7',
  },
  calendarModeText: {
    color: '#6B7280',
    fontSize: ms(12),
    fontFamily: 'Inter_600SemiBold',
  },
  calendarModeTextActive: {
    color: '#fff',
  },
  monthController: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: hp(2),
    paddingHorizontal: wp(2),
  },
  monthYearText: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  dayOfWeekText: {
    color: '#4B5563',
    width: wp(10),
    textAlign: 'center',
    fontSize: ms(11),
    fontFamily: 'Inter_600SemiBold',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    height: wp(10),
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    marginVertical: hp(0.3),
  },
  dayCellEmpty: {
    width: '14.28%',
    height: wp(10),
  },
  dayCellSelected: {
    backgroundColor: '#A855F7',
  },
  dayCellInRange: {
    backgroundColor: 'rgba(168, 85, 247, 0.2)',
  },
  dayCellText: {
    color: '#D1D5DB',
    fontSize: ms(12),
    fontFamily: 'Inter_500Medium',
  },
  dayCellTextSelected: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  dayCellTextInRange: {
    color: '#A855F7',
  },
  selectionFeedback: {
    marginTop: hp(2),
    alignItems: 'center',
    paddingVertical: hp(1),
    backgroundColor: '#161616',
    borderRadius: 12,
  },
  feedbackInfo: {
    color: '#A855F7',
    fontSize: ms(12),
    fontFamily: 'Inter_600SemiBold',
  },
  applyDateBtn: {
    backgroundColor: '#A855F7',
    paddingVertical: hp(1.5),
    borderRadius: 16,
    alignItems: 'center',
    marginTop: hp(2),
  },
  applyDateBtnText: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
});

const st = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  popupContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: hp(4),
    paddingHorizontal: wp(4),
  },
  popup: {
    width: '100%',
    backgroundColor: '#0A0A0A',
    borderRadius: 24,
    borderWidth: 1,
    padding: wp(6),
    alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute',
    top: hp(1.5),
    right: wp(4),
    zIndex: 10,
  },
  iconCircle: {
    width: wp(14),
    height: wp(14),
    borderRadius: wp(7),
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(2),
  },
  title: {
    color: '#fff',
    fontSize: ms(18),
    fontFamily: 'Inter_700Bold',
    marginBottom: hp(1),
    textAlign: 'center',
  },
  description: {
    color: '#9CA3AF',
    fontSize: ms(13),
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginBottom: hp(3),
    lineHeight: hp(2.2),
  },
  actionBtn: {
    width: '100%',
    height: hp(6),
    borderRadius: 16,
    overflow: 'hidden',
  },
  actionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
});
