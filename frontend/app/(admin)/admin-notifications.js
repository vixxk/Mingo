import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { adminAPI } from '../../utils/api';
import { ms, s, wp, hp } from '../../utils/responsive';
import { Skeleton } from '../../components/admin/Skeleton';

const formatTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHrs < 24) return `${diffHrs}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const TARGET_OPTIONS = [
  { id: 'all', label: 'Everyone', icon: 'people' },
  { id: 'users', label: 'Users', icon: 'person' },
  { id: 'listeners', label: 'Listeners', icon: 'headset' },
];

const METHOD_OPTIONS = [
  { id: 'both', label: 'Both', icon: 'layers' },
  { id: 'push', label: 'Push', icon: 'phone-portrait' },
  { id: 'platform', label: 'In-App', icon: 'notifications' },
];

export default function AdminNotifications() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [target, setTarget] = useState('all');
  const [notificationMethod, setNotificationMethod] = useState('both');
  const [sending, setSending] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadHistory = async () => {
    try {
      const res = await adminAPI.getCampaigns();
      setCampaigns(res.data || []);
    } catch (e) {
      console.log('Error loading campaigns:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => { loadHistory(); }, []);

  useEffect(() => {
    if (target === 'specific' && userSearchQuery.length > 2) {
      const timeout = setTimeout(async () => {
        setSearchingUsers(true);
        try {
          const res = await adminAPI.getUsers({ search: userSearchQuery, limit: 5 });
          setSearchResults(res.data?.users || []);
        } catch (e) { console.log(e); }
        finally { setSearchingUsers(false); }
      }, 500);
      return () => clearTimeout(timeout);
    } else { setSearchResults([]); }
  }, [userSearchQuery, target]);

  const toggleUserSelection = (user) => {
    const uid = user.id || user._id;
    if (selectedUsers.find(u => (u.id || u._id) === uid)) {
      setSelectedUsers(selectedUsers.filter(u => (u.id || u._id) !== uid));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
    setUserSearchQuery('');
    setSearchResults([]);
  };

  const handleSend = async () => {
    if (!title || !message) { Alert.alert('Error', 'Please fill all fields'); return; }
    try {
      setSending(true);
      const payload = { title, body: message, target, notificationMethod };
      if (target === 'specific') {
        if (selectedUsers.length === 0) { Alert.alert('Error', 'Select at least one user'); setSending(false); return; }
        payload.userIds = selectedUsers.map(u => u.id || u._id);
      }
      await adminAPI.sendPushNotification(payload);
      Alert.alert('Success', `Campaign "${title}" sent!`);
      setTitle(''); setMessage(''); setSelectedUsers([]); setTarget('all'); setNotificationMethod('both');
      setSending(false);
      loadHistory();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to send');
      setSending(false);
    }
  };

  const renderOptionRow = (options, value, onChange) => (
    <View style={styles.optionRow}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <TouchableOpacity
            key={opt.id}
            style={[styles.optionBtn, active && styles.optionBtnActive]}
            onPress={() => onChange(opt.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.optionIconWrap, active && styles.optionIconWrapActive]}>
              <Ionicons name={opt.icon} size={wp(5)} color={active ? '#fff' : '#6B7280'} />
            </View>
            <Text style={[styles.optionLabel, active && styles.optionLabelActive]} numberOfLines={1}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={wp(6)} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Push Campaigns</Text>
          <Text style={styles.headerSub}>Send notifications to your users</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="megaphone" size={wp(5)} color="#A855F7" />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Campaign Title */}
        <Text style={styles.sectionLabel}>CAMPAIGN TITLE</Text>
        <View style={styles.inputWrap}>
          <Ionicons name="text-outline" size={wp(5)} color="#6B7280" style={{ marginRight: wp(3) }} />
          <TextInput
            style={styles.inputField}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Weekend Special Bonus"
            placeholderTextColor="#3B3B3B"
            selectionColor="#A855F7"
          />
        </View>

        {/* Message Body */}
        <Text style={styles.sectionLabel}>MESSAGE BODY</Text>
        <TextInput
          style={styles.textArea}
          value={message}
          onChangeText={setMessage}
          placeholder="Write your notification message here..."
          placeholderTextColor="#3B3B3B"
          multiline
          selectionColor="#A855F7"
          textAlignVertical="top"
        />

        {/* Target */}
        <Text style={styles.sectionLabel}>TARGET AUDIENCE</Text>
        {renderOptionRow(TARGET_OPTIONS, target, setTarget)}

        {/* Delivery */}
        <Text style={styles.sectionLabel}>DELIVERY METHOD</Text>
        {renderOptionRow(METHOD_OPTIONS, notificationMethod, setNotificationMethod)}

        {/* Specific user search */}
        {target === 'specific' && (
          <View style={styles.specificWrap}>
            <View style={styles.inputWrap}>
              <Ionicons name="search" size={wp(5)} color="#6B7280" style={{ marginRight: wp(3) }} />
              <TextInput
                style={styles.inputField}
                value={userSearchQuery}
                onChangeText={setUserSearchQuery}
                placeholder="Search by name or phone..."
                placeholderTextColor="#3B3B3B"
                selectionColor="#A855F7"
              />
            </View>
            {searchingUsers && <ActivityIndicator color="#A855F7" style={{ marginTop: hp(1.5) }} />}
            {searchResults.length > 0 && (
              <View style={styles.searchResults}>
                {searchResults.map(u => (
                  <TouchableOpacity key={u.id || u._id} style={styles.searchItem} onPress={() => toggleUserSelection(u)}>
                    <View style={styles.searchAvatar}>
                      <Ionicons name="person" size={wp(4)} color="#A855F7" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.searchName} numberOfLines={1}>{u.name}</Text>
                      <Text style={styles.searchPhone}>{u.phone}</Text>
                    </View>
                    <Ionicons name="add-circle" size={wp(6)} color="#A855F7" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {selectedUsers.length > 0 && (
              <View style={{ marginTop: hp(2) }}>
                <Text style={styles.selectedCount}>Selected ({selectedUsers.length})</Text>
                <View style={styles.chipsWrap}>
                  {selectedUsers.map(u => (
                    <View key={u.id || u._id} style={styles.chip}>
                      <Text style={styles.chipText} numberOfLines={1}>{u.name}</Text>
                      <TouchableOpacity onPress={() => toggleUserSelection(u)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={wp(4.5)} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* Send Button */}
        <TouchableOpacity onPress={handleSend} disabled={sending} activeOpacity={0.85} style={{ marginTop: hp(3) }}>
          <LinearGradient
            colors={['#A855F7', '#7C3AED']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sendBtn}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="paper-plane" size={wp(5.5)} color="#fff" />
                <Text style={styles.sendBtnText}>Launch Campaign</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* History */}
        <View style={styles.historyHeader}>
          <Text style={styles.historyHeaderText}>Campaign History</Text>
          <View style={styles.historyBadge}>
            <Text style={styles.historyBadgeText}>{campaigns.length}</Text>
          </View>
        </View>

        {loadingHistory ? (
          <View style={{ marginTop: hp(2) }}>
            {[1, 2, 3].map(i => (
              <Skeleton key={i} width="100%" height={hp(12)} borderRadius={20} style={{ marginBottom: hp(2) }} />
            ))}
          </View>
        ) : campaigns.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons name="megaphone-outline" size={wp(12)} color="#1F1F1F" />
            <Text style={styles.emptyText}>No campaigns sent yet</Text>
            <Text style={styles.emptySubText}>Your sent campaigns will appear here</Text>
          </View>
        ) : (
          campaigns.map((camp) => (
            <View key={camp._id} style={styles.historyCard}>
              <View style={styles.historyCardTop}>
                <View style={styles.historyCardIcon}>
                  <Ionicons name="megaphone" size={wp(4)} color="#A855F7" />
                </View>
                <View style={{ flex: 1, marginLeft: wp(3) }}>
                  <Text style={styles.historyTitle} numberOfLines={1}>{camp.title}</Text>
                  <Text style={styles.historyDate}>{formatTime(camp.createdAt)}</Text>
                </View>
              </View>
              <Text style={styles.historyBody} numberOfLines={2}>{camp.body}</Text>
              <View style={styles.historyMeta}>
                <View style={styles.metaChip}>
                  <Ionicons name="people-outline" size={wp(3.5)} color="#A855F7" />
                  <Text style={styles.metaText}>{camp.target}</Text>
                </View>
                <View style={styles.metaChip}>
                  <Ionicons name="send-outline" size={wp(3.5)} color="#10B981" />
                  <Text style={[styles.metaText, { color: '#10B981' }]}>{camp.sentToCount || 0} sent</Text>
                </View>
              </View>
            </View>
          ))
        )}

        <View style={{ height: hp(5) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#111',
  },
  backBtn: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: '#111',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  headerTitle: {
    fontSize: ms(18),
    color: '#fff',
    fontFamily: 'Inter_700Bold',
  },
  headerSub: {
    fontSize: ms(11),
    color: '#4B5563',
    fontFamily: 'Inter_400Regular',
    marginTop: hp(0.2),
  },
  headerIcon: {
    width: wp(10),
    height: wp(10),
    borderRadius: wp(5),
    backgroundColor: 'rgba(168,85,247,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Scroll
  scroll: {
    paddingHorizontal: wp(4.5),
    paddingTop: hp(2.5),
    paddingBottom: hp(12),
  },

  // Section Labels
  sectionLabel: {
    fontSize: ms(10),
    color: '#6B7280',
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1.2,
    marginBottom: hp(1),
    marginTop: hp(2.5),
  },

  // Input
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderRadius: wp(3.5),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  inputField: {
    flex: 1,
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_500Medium',
    padding: 0,
  },
  textArea: {
    backgroundColor: '#0D0D0D',
    borderRadius: wp(3.5),
    paddingHorizontal: wp(4),
    paddingTop: hp(1.5),
    paddingBottom: hp(1.5),
    borderWidth: 1,
    borderColor: '#1A1A1A',
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_500Medium',
    height: hp(14),
  },

  // Option Buttons (Target / Method)
  optionRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  optionBtn: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderRadius: wp(3.5),
    paddingVertical: hp(1.5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },
  optionBtnActive: {
    backgroundColor: 'rgba(168,85,247,0.12)',
    borderColor: '#A855F7',
  },
  optionIconWrap: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: hp(0.8),
  },
  optionIconWrapActive: {
    backgroundColor: '#A855F7',
  },
  optionLabel: {
    fontSize: ms(10),
    color: '#6B7280',
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
  optionLabelActive: {
    color: '#A855F7',
    fontFamily: 'Inter_700Bold',
  },

  // Specific Search
  specificWrap: {
    marginTop: hp(2),
    paddingTop: hp(2),
    borderTopWidth: 1,
    borderTopColor: '#1A1A1A',
  },
  searchResults: {
    backgroundColor: '#0D0D0D',
    borderRadius: wp(3.5),
    marginTop: hp(1),
    borderWidth: 1,
    borderColor: '#1A1A1A',
    overflow: 'hidden',
  },
  searchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    borderBottomWidth: 1,
    borderBottomColor: '#141414',
  },
  searchAvatar: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: 'rgba(168,85,247,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: wp(3),
  },
  searchName: { color: '#fff', fontSize: ms(13), fontFamily: 'Inter_600SemiBold' },
  searchPhone: { color: '#6B7280', fontSize: ms(11), fontFamily: 'Inter_400Regular', marginTop: hp(0.2) },
  selectedCount: { color: '#9CA3AF', fontSize: ms(12), fontFamily: 'Inter_600SemiBold', marginBottom: hp(1) },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: wp(2) },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(168,85,247,0.1)',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.7),
    borderRadius: wp(5),
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.25)',
    gap: wp(1.5),
    maxWidth: wp(42),
  },
  chipText: { color: '#E9D5FF', fontSize: ms(11), fontFamily: 'Inter_500Medium', flexShrink: 1 },

  // Send Button
  sendBtn: {
    flexDirection: 'row',
    paddingVertical: hp(2.2),
    borderRadius: wp(4),
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp(2.5),
  },
  sendBtnText: {
    color: '#fff',
    fontSize: ms(16),
    fontFamily: 'Inter_800ExtraBold',
  },

  // History
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: hp(4),
    marginBottom: hp(2),
  },
  historyHeaderText: {
    fontSize: ms(16),
    color: '#fff',
    fontFamily: 'Inter_800ExtraBold',
  },
  historyBadge: {
    backgroundColor: 'rgba(168,85,247,0.15)',
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.3),
    borderRadius: wp(3),
    marginLeft: wp(2.5),
  },
  historyBadgeText: {
    color: '#A855F7',
    fontSize: ms(11),
    fontFamily: 'Inter_700Bold',
  },
  historyCard: {
    backgroundColor: '#0A0A0A',
    borderRadius: wp(4),
    padding: wp(4),
    marginBottom: hp(1.5),
    borderWidth: 1,
    borderColor: '#141414',
  },
  historyCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: hp(1),
  },
  historyCardIcon: {
    width: wp(9),
    height: wp(9),
    borderRadius: wp(4.5),
    backgroundColor: 'rgba(168,85,247,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyTitle: {
    color: '#fff',
    fontSize: ms(14),
    fontFamily: 'Inter_700Bold',
  },
  historyDate: {
    color: '#4B5563',
    fontSize: ms(10),
    fontFamily: 'Inter_400Regular',
    marginTop: hp(0.2),
  },
  historyBody: {
    color: '#9CA3AF',
    fontSize: ms(12),
    lineHeight: ms(17),
    fontFamily: 'Inter_400Regular',
    marginBottom: hp(1.5),
    paddingLeft: wp(12),
  },
  historyMeta: {
    flexDirection: 'row',
    gap: wp(3),
    paddingTop: hp(1.2),
    borderTopWidth: 1,
    borderTopColor: '#141414',
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
    borderRadius: wp(3),
    gap: wp(1.5),
  },
  metaText: {
    color: '#A855F7',
    fontSize: ms(10),
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'capitalize',
  },

  // Empty
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: hp(5),
  },
  emptyText: {
    color: '#4B5563',
    fontSize: ms(14),
    fontFamily: 'Inter_600SemiBold',
    marginTop: hp(1.5),
  },
  emptySubText: {
    color: '#374151',
    fontSize: ms(12),
    fontFamily: 'Inter_400Regular',
    marginTop: hp(0.5),
  },
});
