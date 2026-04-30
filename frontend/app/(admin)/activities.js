import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';
import { RECENT_ACTIVITIES } from '../../data/admin/adminData';
import { ActivityItem } from '../../components/admin/AdminComponents';

const { height: SH } = Dimensions.get('window');

export default function ActivitiesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  
  const [activities, setActivities] = useState([
    ...RECENT_ACTIVITIES,
    { id: '10', user: 'System', action: 'Daily backup completed', type: 'system', time: '5h ago', icon: 'cloud-done', color: '#10B981' },
    { id: '11', user: 'Admin', action: 'Modified payment gateway settings', type: 'admin', time: '6h ago', icon: 'settings', color: '#6B7280' },
    { id: '12', user: 'User_99', action: 'Reported a bug in audio call', type: 'user', time: '8h ago', icon: 'bug', color: '#F59E0B' },
    { id: '13', user: 'Listener_X', action: 'Updated profile picture', type: 'listener', time: '10h ago', icon: 'image', color: '#3B82F6' },
  ]);

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {}
      <View style={st.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={st.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>All Activities</Text>
        <View style={{ width: s(40) }} />
      </View>

      <ScrollView 
        style={st.list} 
        contentContainerStyle={{ paddingHorizontal: s(16), paddingBottom: SH * 0.05 }} 
        showsVerticalScrollIndicator={false}
      >
        <View style={st.activityCard}>
          {activities.map((activity, index) => (
            <ActivityItem 
              key={activity.id} 
              activity={activity} 
              isLast={index === activities.length - 1} 
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: s(16), paddingVertical: SH * 0.015 },
  backBtn: { width: s(40), height: s(40), borderRadius: s(20), backgroundColor: '#141414', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: ms(20, 0.3), fontWeight: '900', color: '#fff', fontFamily: 'Inter_900Black' },
  list: { flex: 1, marginTop: vs(10) },
  activityCard: {
    backgroundColor: '#141414',
    borderRadius: 20,
    paddingVertical: vs(6),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
});
