import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs } from '../../utils/responsive';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SendNotificationPopup from '../../components/admin/SendNotificationPopup';
import LogoutPopup from '../../components/shared/LogoutPopup';

const { height: SH } = Dimensions.get('window');

const SETTINGS_SECTIONS = [
  {
    title: 'Platform Control',
    items: [
      { id:'0', label:'System Configuration', icon:'settings-outline', route:'/(admin)/system-config' },
      { id:'1', label:'Push Campaigns', icon:'megaphone-outline', route:'/(admin)/admin-notifications' },
      { id:'2', label:'System Analytics', icon:'stats-chart-outline', route:'/(admin)/admin-analytics' },
      { id:'3', label:'Wallet & Coins', icon:'wallet-outline', route:'/(admin)/admin-wallet' },
      { id:'4', label:'Payout Management', icon:'cash-outline', route:'/(admin)/admin-payouts' },
    ],
  },
  {
    title: 'Management',
    items: [
      { id:'5', label:'Banned Members', icon:'ban-outline', route:'/(admin)/banned-members' },
      { id:'6', label:'Member Reports', icon:'flag-outline', route:'/(admin)/member-reports' },
      { id:'7', label:'Best Choice', icon:'star-outline', route:'/(admin)/best-choice' },
    ],
  },
];

export default function AdminSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);
  const [showLogoutPopup, setShowLogoutPopup] = useState(false);

  const handleLogout = () => {
    setShowLogoutPopup(true);
  };

  const confirmLogout = async () => {
    try { 
      await AsyncStorage.multiRemove(['isAdmin', 'userToken', 'token', 'user', 'listenerStatus']); 
    } catch (e) {}
    setShowLogoutPopup(false);
    router.replace('/welcome');
  };

  const handleMenuPress = (item) => {
    if (item.route) {
      router.push(item.route);
    }
  };

  return (
    <View style={[st.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={st.header}>
        <Text style={st.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={{ flex:1 }} contentContainerStyle={{ paddingHorizontal:s(16), paddingBottom:SH*0.05 }} showsVerticalScrollIndicator={false}>
        {}
        <View style={st.adminCard}>
          <View style={st.adminIcon}>
            <Ionicons name="shield-checkmark" size={28} color="#A855F7" />
          </View>
          <View>
            <Text style={st.adminName}>Admin</Text>
            <Text style={st.adminPhone}>1234567890</Text>
          </View>
          <View style={st.adminBadge}>
            <Text style={st.adminBadgeText}>SUPER ADMIN</Text>
          </View>
        </View>

        {SETTINGS_SECTIONS.map(section => (
          <View key={section.title}>
            <Text style={st.sectionTitle}>{section.title}</Text>
            <View style={st.menuCard}>
              {section.items.map((item, i) => (
                <View key={item.id}>
                  <TouchableOpacity style={st.menuItem} activeOpacity={0.6} onPress={() => handleMenuPress(item)}>
                    <Ionicons name={item.icon} size={20} color="#9CA3AF" style={{ marginRight:s(12), width:s(24) }} />
                    <Text style={st.menuLabel}>{item.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color="#4B5563" />
                  </TouchableOpacity>
                  {i < section.items.length - 1 && <View style={st.divider} />}
                </View>
              ))}
            </View>
          </View>
        ))}

        {}
        <View style={st.menuCard}>
          <TouchableOpacity style={st.menuItem} activeOpacity={0.6} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight:s(12), width:s(24) }} />
            <Text style={[st.menuLabel, { color:'#EF4444' }]}>Logout</Text>
            <Ionicons name="chevron-forward" size={18} color="#4B5563" />
          </TouchableOpacity>
        </View>

        <Text style={st.version}>Mingo Admin v1.0.0</Text>
      </ScrollView>

      {}
      <SendNotificationPopup 
        visible={showNotificationPopup} 
        onClose={() => setShowNotificationPopup(false)} 
      />
      <LogoutPopup 
        visible={showLogoutPopup}
        onCancel={() => setShowLogoutPopup(false)}
        onConfirm={confirmLogout}
      />
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex:1, backgroundColor:'#000' },
  header: { paddingHorizontal:s(16), paddingVertical:SH*0.015 },
  headerTitle: { fontSize:ms(28,0.3), fontWeight:'900', color:'#fff', fontFamily:'Inter_900Black' },
  adminCard: { flexDirection:'row', alignItems:'center', backgroundColor:'#141414', borderRadius:20, padding:s(16), marginBottom:SH*0.025, borderWidth:1, borderColor:'#1F1F1F', gap:s(12) },
  adminIcon: { width:SH*0.06, height:SH*0.06, borderRadius:SH*0.03, backgroundColor:'rgba(168,85,247,0.15)', alignItems:'center', justifyContent:'center' },
  adminName: { fontSize:ms(17,0.3), color:'#fff', fontFamily:'Inter_700Bold' },
  adminPhone: { fontSize:ms(12,0.3), color:'#6B7280', fontFamily:'Inter_400Regular', marginTop:2 },
  adminBadge: { marginLeft:'auto', backgroundColor:'rgba(168,85,247,0.15)', paddingHorizontal:s(10), paddingVertical:4, borderRadius:10 },
  adminBadgeText: { fontSize:ms(9,0.3), color:'#A855F7', fontFamily:'Inter_700Bold', letterSpacing:0.5 },
  sectionTitle: { fontSize:ms(14,0.3), color:'#6B7280', fontFamily:'Inter_700Bold', marginBottom:SH*0.01, marginLeft:s(4), textTransform:'uppercase', letterSpacing:0.5 },
  menuCard: { backgroundColor:'#141414', borderRadius:20, paddingVertical:vs(4), borderWidth:1, borderColor:'#1F1F1F', marginBottom:SH*0.02 },
  menuItem: { flexDirection:'row', alignItems:'center', paddingVertical:SH*0.018, paddingHorizontal:s(16) },
  menuLabel: { flex:1, fontSize:ms(15,0.3), color:'#E5E7EB', fontFamily:'Inter_500Medium' },
  divider: { height:1, backgroundColor:'#1F1F1F', marginHorizontal:s(16) },
  version: { textAlign:'center', fontSize:ms(12,0.3), color:'#374151', fontFamily:'Inter_400Regular', marginTop:SH*0.02 },
});
