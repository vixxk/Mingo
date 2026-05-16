import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ms, s, vs } from '../../utils/responsive';

const { height: SH, width: SW } = Dimensions.get('window');


export const StatCard = ({ title, value, icon, gradient, subtitle, onPress }) => (
  <TouchableOpacity 
    activeOpacity={onPress ? 0.8 : 1} 
    onPress={onPress}
    disabled={!onPress}
  >
    <LinearGradient colors={gradient} start={{ x:0,y:0 }} end={{ x:1,y:1 }} style={cStyles.statCard}>
      <View style={cStyles.statIconWrap}>
        <Ionicons name={icon} size={20} color="rgba(255,255,255,0.9)" />
      </View>
      <Text style={cStyles.statValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      <Text style={cStyles.statTitle} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
      {subtitle && <Text style={cStyles.statSub} numberOfLines={1} adjustsFontSizeToFit>{subtitle}</Text>}
    </LinearGradient>
  </TouchableOpacity>
);


export const FilterTab = ({ label, active, onPress }) => (
  <TouchableOpacity style={[cStyles.filterTab, active && cStyles.filterActive]} onPress={onPress} activeOpacity={0.7}>
    <Text style={[cStyles.filterText, active && cStyles.filterTextActive]}>{label}</Text>
  </TouchableOpacity>
);


export const StatusBadge = ({ status, color }) => (
  <View style={[cStyles.statusBadge, { backgroundColor: `${color}20` }]}>
    <View style={[cStyles.statusDot, { backgroundColor: color }]} />
    <Text style={[cStyles.statusText, { color }]}>{status}</Text>
  </View>
);


export const SectionTitle = ({ children }) => (
  <Text style={cStyles.sectionTitle}>{children}</Text>
);


export const ActivityItem = ({ activity, isLast }) => (
  <View>
    <View style={cStyles.activityItem}>
      <View style={[cStyles.activityIcon, { backgroundColor: `${activity.color}20` }]}>
        <Ionicons name={activity.icon} size={18} color={activity.color} />
      </View>
      <View style={cStyles.activityContent}>
        <Text style={cStyles.activityUser}>{activity.user}</Text>
        <Text style={cStyles.activityAction}>{activity.action}</Text>
      </View>
      <Text style={cStyles.activityTime}>{activity.time}</Text>
    </View>
    {!isLast && <View style={cStyles.activityDivider} />}
  </View>
);

const cStyles = StyleSheet.create({
  statCard: {
    width: (SW - s(42)) / 2,
    borderRadius: 20,
    padding: s(16),
    minHeight: SH * 0.14,
    justifyContent: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  statIconWrap: {
    width: SH * 0.04, height: SH * 0.04, borderRadius: SH * 0.02,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: SH * 0.01,
  },
  statValue: { fontSize: ms(28,0.3), fontWeight:'900', color:'#fff', fontFamily:'Inter_900Black' },
  statTitle: { fontSize: ms(12,0.3), color:'rgba(255,255,255,0.6)', fontFamily:'Inter_500Medium', marginTop:2 },
  statSub: { fontSize: ms(10,0.3), color:'rgba(255,255,255,0.35)', fontFamily:'Inter_400Regular', marginTop:2 },
  filterTab: { paddingHorizontal: s(14), paddingVertical: SH*0.008, borderRadius:20, backgroundColor:'#111', borderWidth:1, borderColor:'#1F1F1F' },
  filterActive: { backgroundColor:'rgba(168,85,247,0.15)', borderColor:'#A855F7' },
  filterText: { fontSize: ms(12,0.3), color:'#6B7280', fontFamily:'Inter_500Medium' },
  filterTextActive: { color:'#A855F7' },
  statusBadge: { flexDirection:'row', alignItems:'center', alignSelf:'flex-start', paddingHorizontal:s(8), paddingVertical:3, borderRadius:8, marginTop:4, gap:4 },
  statusDot: { width:6, height:6, borderRadius:3 },
  statusText: { fontSize: ms(10,0.3), fontFamily:'Inter_700Bold', textTransform:'capitalize' },
  sectionTitle: { fontSize: ms(18,0.3), fontWeight:'800', color:'#fff', fontFamily:'Inter_900Black', marginBottom: SH*0.015 },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SH * 0.015,
    paddingHorizontal: s(16),
  },
  activityIcon: {
    width: SH * 0.045,
    height: SH * 0.045,
    borderRadius: SH * 0.0225,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: s(12),
  },
  activityContent: { flex: 1 },
  activityUser: { fontSize: ms(14,0.3), color:'#fff', fontFamily:'Inter_700Bold' },
  activityAction: { fontSize: ms(12,0.3), color:'#6B7280', fontFamily:'Inter_400Regular', marginTop:1 },
  activityTime: { fontSize: ms(11,0.3), color:'#4B5563', fontFamily:'Inter_400Regular' },
  activityDivider: { height:1, backgroundColor:'#1F1F1F', marginHorizontal:s(16) },
});
