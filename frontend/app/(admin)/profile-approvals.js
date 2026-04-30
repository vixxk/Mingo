import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SW } = Dimensions.get('window');


const MOCK_APPROVALS = [
  {
    id: '1',
    listenerName: 'Shruti Jaiswal',
    avatar: require('../../images/user_shruti.png'),
    submittedAt: '10 mins ago',
    changes: {
      hookline: "Here to listen, understand, and help you find peace. Let's talk!",
      tags: ['Anxiety', 'Relationship', 'Career', 'Loneliness'],
      about: "Hi! I am Shruti. I have been a certified listener for over 2 years. I specialize in helping people navigate through difficult times...",
    }
  },
  {
    id: '2',
    listenerName: 'Priya Sharma',
    avatar: require('../../images/user_priya.png'),
    submittedAt: '2 hours ago',
    changes: {
      hookline: "Your safe space to vent without judgment.",
      tags: ['Stress', 'Depression'],
      about: "I'm Priya, a trained active listener. I believe everyone deserves to be heard.",
    }
  }
];

export default function ProfileApprovalsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [approvals, setApprovals] = useState(MOCK_APPROVALS);

  const handleApprove = (id) => {
    Alert.alert('Approved', 'Listener profile changes have been approved and are now live.');
    setApprovals(prev => prev.filter(req => req.id !== id));
  };

  const handleReject = (id) => {
    Alert.alert('Rejected', 'Listener profile changes have been rejected.');
    setApprovals(prev => prev.filter(req => req.id !== id));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Approvals</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {approvals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={64} color="#22C55E" />
            <Text style={styles.emptyText}>All caught up! No pending profile approvals.</Text>
          </View>
        ) : (
          approvals.map((req) => (
            <View key={req.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Image source={req.avatar} style={styles.avatar} />
                <View style={styles.headerInfo}>
                  <Text style={styles.listenerName}>{req.listenerName}</Text>
                  <Text style={styles.submittedAt}>Submitted {req.submittedAt}</Text>
                </View>
              </View>

              <View style={styles.changesSection}>
                <Text style={styles.changeLabel}>Hookline:</Text>
                <Text style={styles.changeValue}>"{req.changes.hookline}"</Text>

                <Text style={styles.changeLabel}>Tags:</Text>
                <Text style={styles.changeValue}>{req.changes.tags.join(', ')}</Text>

                <Text style={styles.changeLabel}>About:</Text>
                <Text style={styles.changeValue} numberOfLines={2}>{req.changes.about}</Text>
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.rejectBtn]} 
                  onPress={() => handleReject(req.id)}
                >
                  <Ionicons name="close" size={20} color="#EF4444" />
                  <Text style={[styles.btnText, { color: '#EF4444' }]}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.approveBtn]} 
                  onPress={() => handleApprove(req.id)}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.btnText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    paddingHorizontal: '4%',
    paddingVertical: '3%',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1A1A',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: SW * 0.045,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  scrollContent: {
    padding: '5%',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '30%',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: SW * 0.04,
    marginTop: '4%',
    fontFamily: 'Inter_500Medium',
  },
  card: {
    backgroundColor: '#111',
    borderRadius: 16,
    padding: '5%',
    marginBottom: '5%',
    borderWidth: 1,
    borderColor: '#222',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: '4%',
  },
  avatar: {
    width: SW * 0.12,
    height: SW * 0.12,
    borderRadius: (SW * 0.12) / 2,
    marginRight: '3%',
  },
  headerInfo: {
    flex: 1,
  },
  listenerName: {
    color: '#fff',
    fontSize: SW * 0.045,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
  },
  submittedAt: {
    color: '#6B7280',
    fontSize: SW * 0.03,
    marginTop: 2,
  },
  changesSection: {
    backgroundColor: '#1A1A1A',
    padding: '4%',
    borderRadius: 12,
    marginBottom: '5%',
  },
  changeLabel: {
    color: '#9CA3AF',
    fontSize: SW * 0.032,
    marginBottom: 2,
    marginTop: 6,
    fontFamily: 'Inter_500Medium',
  },
  changeValue: {
    color: '#E5E7EB',
    fontSize: SW * 0.035,
    fontFamily: 'Inter_400Regular',
    lineHeight: SW * 0.05,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: '3%',
    borderRadius: 12,
    borderWidth: 1,
  },
  rejectBtn: {
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  approveBtn: {
    borderColor: '#22C55E',
    backgroundColor: '#22C55E',
  },
  btnText: {
    color: '#fff',
    fontSize: SW * 0.038,
    fontWeight: '600',
    marginLeft: 6,
  },
});
