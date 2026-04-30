import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';
import { FilterTab } from '../../components/admin/AdminComponents';

const { height: SH } = Dimensions.get('window');


const MOCK_REPORTS = [
  { id: '1', reporter: 'Priya Sharma', role: 'user', message: 'I was unable to complete the payment via UPI. It shows a timeout error.', status: 'pending', time: '10 min ago' },
  { id: '2', reporter: 'Shruti Jaiswal', role: 'listener', message: 'The audio quality is dropping significantly during calls today.', status: 'pending', time: '25 min ago' },
  { id: '3', reporter: 'Ananya', role: 'user', message: 'Reported a listener for inappropriate behavior.', status: 'resolved', time: '2h ago' },
  { id: '4', reporter: 'Neha', role: 'listener', message: 'Balance not reflecting after withdrawal.', status: 'pending', time: '5h ago' },
  { id: '5', reporter: 'Riya', role: 'user', message: 'App crashes when opening settings.', status: 'resolved', time: 'Yesterday' },
];

export default function MemberReportsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [filter, setFilter] = useState('pending');

  const filteredReports = reports.filter(r => r.status === filter);

  const handleAction = (id, newStatus) => {
    Alert.alert(
      newStatus === 'resolved' ? 'Mark as Resolved' : 'Dismiss Report',
      `Are you sure you want to ${newStatus === 'resolved' ? 'resolve' : 'dismiss'} this issue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => {
          setReports(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
        }}
      ]
    );
  };

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={st.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Member Reports</Text>
        <View style={{ width: s(40) }} />
      </View>

      {}
      <View style={st.filterRow}>
        <FilterTab label="Pending" active={filter === 'pending'} onPress={() => setFilter('pending')} />
        <FilterTab label="Resolved" active={filter === 'resolved'} onPress={() => setFilter('resolved')} />
      </View>

      <ScrollView 
        style={st.list} 
        contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }} 
        showsVerticalScrollIndicator={false}
      >
        {filteredReports.length === 0 ? (
          <View style={st.emptyState}>
            <Ionicons name="checkmark-done-circle" size={60} color="#1F2937" />
            <Text style={st.emptyText}>No {filter} reports found</Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <View key={report.id} style={st.reportCard}>
              <View style={st.cardHeader}>
                <View style={st.reporterInfo}>
                  <Text style={st.reporterName}>{report.reporter}</Text>
                  <View style={[st.roleBadge, { backgroundColor: report.role === 'listener' ? 'rgba(168,85,247,0.15)' : 'rgba(59,130,246,0.15)' }]}>
                    <Text style={[st.roleText, { color: report.role === 'listener' ? '#A855F7' : '#3B82F6' }]}>{report.role.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={st.timeText}>{report.time}</Text>
              </View>

              <Text style={st.messageText}>{report.message}</Text>

              {report.status === 'pending' && (
                <View style={st.cardActions}>
                  <TouchableOpacity 
                    style={[st.actionBtn, { backgroundColor: '#10B981' }]} 
                    onPress={() => handleAction(report.id, 'resolved')}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={st.actionText}>Resolve</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[st.actionBtn, { backgroundColor: '#374151' }]} 
                    onPress={() => handleAction(report.id, 'dismissed')}
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={st.actionText}>Dismiss</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: s(16), paddingVertical: SH * 0.015 },
  backBtn: { width: s(40), height: s(40), borderRadius: s(20), backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: ms(20, 0.3), fontWeight: '900', color: '#fff', fontFamily: 'Inter_900Black' },
  filterRow: { flexDirection: 'row', gap: s(10), paddingHorizontal: s(16), marginBottom: vs(15) },
  list: { flex: 1 },
  reportCard: { backgroundColor: '#141414', borderRadius: 20, padding: s(16), marginBottom: vs(12), borderWidth: 1, borderColor: '#1F1F1F' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vs(10) },
  reporterInfo: { flexDirection: 'row', alignItems: 'center', gap: s(8) },
  reporterName: { fontSize: ms(15, 0.3), fontWeight: '700', color: '#fff', fontFamily: 'Inter_700Bold' },
  roleBadge: { paddingHorizontal: s(8), paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: ms(10, 0.3), fontWeight: '800', fontFamily: 'Inter_800ExtraBold' },
  timeText: { fontSize: ms(11, 0.3), color: '#4B5563', fontFamily: 'Inter_400Regular' },
  messageText: { fontSize: ms(14, 0.3), color: '#D1D5DB', fontFamily: 'Inter_400Regular', lineHeight: ms(20), marginBottom: vs(15) },
  cardActions: { flexDirection: 'row', gap: s(10) },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: s(6), paddingHorizontal: s(16), paddingVertical: vs(10), borderRadius: 12 },
  actionText: { fontSize: ms(13, 0.3), color: '#fff', fontFamily: 'Inter_700Bold' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: SH * 0.2 },
  emptyText: { color: '#4B5563', fontSize: ms(16, 0.3), fontFamily: 'Inter_500Medium', marginTop: vs(10) }
});
