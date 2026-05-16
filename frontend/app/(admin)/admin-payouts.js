import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ms, s, vs, wp, hp } from '../../utils/responsive';
import { adminAPI } from '../../utils/api';
import { AdminPageSkeleton } from '../../components/admin/Skeleton';

export default function AdminPayouts() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const loadPayouts = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getPayouts({ status: filter });
      setPayouts(res.data.payouts || []);
    } catch (e) {
      console.error('Failed to load payouts:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayouts();
  }, [filter]);

  const handleUpdateStatus = async (id, status) => {
    try {
      await adminAPI.updatePayoutStatus(id, { status, adminNotes, transactionId });
      Alert.alert('Success', `Payout marked as ${status}`);
      setModalVisible(false);
      loadPayouts();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to update payout');
    }
  };

  const renderPayoutItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.payoutItem}
      onPress={() => {
        setSelectedPayout(item);
        setAdminNotes(item.adminNotes || '');
        setTransactionId(item.transactionId || '');
        setModalVisible(true);
      }}
    >
      <View style={styles.payoutHeader}>
        <View>
          <Text style={styles.listenerName}>{item.listenerId?.name || 'Unknown'}</Text>
          <Text style={styles.listenerPhone}>{item.listenerId?.phone || 'No phone'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.payoutDetails}>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Amount</Text>
          <Text style={styles.detailValue}>₹{item.amount}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Diamonds</Text>
          <Text style={styles.detailValue}>{item.diamonds}</Text>
        </View>
        <View style={styles.detailItem}>
          <Text style={styles.detailLabel}>Date</Text>
          <Text style={styles.detailValue}>{new Date(item.createdAt).toLocaleDateString()}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return '#F59E0B';
      case 'paid': return '#10B981';
      case 'rejected': return '#EF4444';
      case 'on_hold': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payout Management</Text>
      </View>

      <View style={styles.filterBar}>
        {['pending', 'paid', 'rejected', 'all'].map((f) => (
          <TouchableOpacity 
            key={f} 
            style={[styles.filterBtn, filter === f && styles.activeFilterBtn]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.activeFilterText]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <AdminPageSkeleton type="list" />
      ) : (
        <FlatList
          data={payouts}
          renderItem={renderPayoutItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="cash-outline" size={64} color="#333" />
              <Text style={styles.emptyText}>No payout requests found</Text>
            </View>
          }
        />
      )}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Process Payout</Text>
            {selectedPayout && (
              <ScrollView>
                <View style={styles.modalInfo}>
                  <Text style={styles.modalLabel}>Listener:</Text>
                  <Text style={styles.modalValue}>{selectedPayout.listenerId?.name}</Text>
                  
                  <Text style={styles.modalLabel}>Amount:</Text>
                  <Text style={[styles.modalValue, { color: '#10B981', fontSize: ms(20) }]}>₹{selectedPayout.amount}</Text>
                  
                  <Text style={styles.modalLabel}>Payment Details:</Text>
                  <View style={styles.paymentBox}>
                    <Text style={styles.paymentText}>UPI ID: {selectedPayout.paymentDetails?.upiId || 'N/A'}</Text>
                    <Text style={styles.paymentText}>Bank: {selectedPayout.paymentDetails?.bankAccount || 'N/A'}</Text>
                    <Text style={styles.paymentText}>Holder: {selectedPayout.paymentDetails?.accountHolderName || 'N/A'}</Text>
                  </View>

                  <Text style={styles.modalLabel}>Transaction ID (if paid):</Text>
                  <TextInput
                    style={styles.input}
                    value={transactionId}
                    onChangeText={setTransactionId}
                    placeholder="Enter reference ID"
                    placeholderTextColor="#4B5563"
                  />

                  <Text style={styles.modalLabel}>Admin Notes:</Text>
                  <TextInput
                    style={[styles.input, { height: vs(80) }]}
                    value={adminNotes}
                    onChangeText={setAdminNotes}
                    placeholder="Internal notes"
                    placeholderTextColor="#4B5563"
                    multiline
                  />
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#10B981' }]}
                    onPress={() => handleUpdateStatus(selectedPayout._id, 'paid')}
                  >
                    <Text style={styles.actionBtnText}>Mark as Paid</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#EF4444' }]}
                    onPress={() => handleUpdateStatus(selectedPayout._id, 'rejected')}
                  >
                    <Text style={styles.actionBtnText}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#3B82F6' }]}
                    onPress={() => handleUpdateStatus(selectedPayout._id, 'on_hold')}
                  >
                    <Text style={styles.actionBtnText}>On Hold</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: '#333' }]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.actionBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
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
  filterBar: {
    flexDirection: 'row',
    padding: wp(4),
    gap: wp(2),
  },
  filterBtn: {
    paddingHorizontal: wp(4),
    paddingVertical: hp(1),
    borderRadius: 20,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  activeFilterBtn: { backgroundColor: '#A855F7', borderColor: '#A855F7' },
  filterText: { color: '#9CA3AF', fontSize: ms(12), fontFamily: 'Inter_600SemiBold' },
  activeFilterText: { color: '#fff' },
  listContent: { padding: wp(4), paddingBottom: hp(10) },
  payoutItem: {
    backgroundColor: '#0A0A0A',
    borderRadius: 16,
    padding: wp(4),
    marginBottom: hp(2),
    borderWidth: 1,
    borderColor: '#111',
  },
  payoutHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: hp(1.5) },
  listenerName: { color: '#fff', fontSize: ms(16), fontFamily: 'Inter_700Bold' },
  listenerPhone: { color: '#6B7280', fontSize: ms(12) },
  statusBadge: { paddingHorizontal: wp(3), paddingVertical: hp(0.5), borderRadius: 12 },
  statusText: { fontSize: ms(10), fontFamily: 'Inter_700Bold' },
  payoutDetails: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1A1A1A', paddingTop: hp(1.5) },
  detailItem: { alignItems: 'center' },
  detailLabel: { color: '#4B5563', fontSize: ms(10), textTransform: 'uppercase' },
  detailValue: { color: '#D1D5DB', fontSize: ms(14), fontFamily: 'Inter_600SemiBold', marginTop: hp(0.5) },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: hp(10) },
  emptyText: { color: '#4B5563', fontSize: ms(16), marginTop: hp(2) },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0F0F0F', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: wp(6), maxHeight: hp(80) },
  modalTitle: { color: '#fff', fontSize: ms(22), fontFamily: 'Inter_800ExtraBold', marginBottom: hp(3), textAlign: 'center' },
  modalInfo: { marginBottom: hp(3) },
  modalLabel: { color: '#9CA3AF', fontSize: ms(12), marginBottom: hp(0.5), marginTop: hp(1.5) },
  modalValue: { color: '#fff', fontSize: ms(16), fontFamily: 'Inter_600SemiBold' },
  paymentBox: { backgroundColor: '#141414', padding: wp(3), borderRadius: 12, marginTop: hp(0.5) },
  paymentText: { color: '#D1D5DB', fontSize: ms(13), marginBottom: hp(0.5) },
  input: {
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: wp(4),
    color: '#fff',
    marginTop: hp(0.5),
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  modalActions: { gap: hp(1.5), marginTop: hp(2) },
  actionBtn: { padding: hp(1.8), borderRadius: 16, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontSize: ms(16), fontFamily: 'Inter_700Bold' },
});
