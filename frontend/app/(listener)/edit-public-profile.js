import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity,
  Dimensions, Alert, ActivityIndicator, Platform, RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Skeleton } from '../../components/admin/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listenerAPI } from '../../utils/api';
import StatusPopup from '../../components/shared/StatusPopup';

const { width: SW, height: SH } = Dimensions.get('window');

const AVAILABLE_TAGS = [
  'Anxiety', 'Relationship', 'Career', 'Loneliness', 'Depression',
  'Stress', 'Self-esteem', 'Family', 'Breakup', 'Motivation',
  'Grief', 'Anger', 'Sleep', 'Addiction', 'LGBTQ+',
];

const AVAILABLE_LANGUAGES = [
  'English', 'Hindi', 'Tamil', 'Telugu', 'Kannada',
  'Malayalam', 'Bengali', 'Marathi', 'Gujarati', 'Punjabi',
  'Odia', 'Assamese',
];

const STATUS_CONFIG = {
  pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: 'time-outline', label: 'Pending Review', msg: 'Your profile is being reviewed by our team.' },
  approved: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', icon: 'checkmark-circle-outline', label: 'Approved', msg: 'Your profile is live!' },
  rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: 'close-circle-outline', label: 'Rejected', msg: 'Please review the admin notes and resubmit.' },
  draft: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: 'create-outline', label: 'Draft', msg: 'You have unsaved draft changes.' },
};

function arraysEqualIgnoringOrder(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b)) return false
  if (a.length !== b.length) return false
  const sortedA = [...a].map(String).sort()
  const sortedB = [...b].map(String).sort()
  return sortedA.every((value, index) => value === sortedB[index])
}

export default function EditPublicProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Popup state
  const [popup, setPopup] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onConfirm: null,
    icon: null
  });

  const showPopup = (type, title, message, onConfirm = null, icon = null) => {
    setPopup({ visible: true, type, title, message, onConfirm, icon });
  };

  const closePopup = () => {
    setPopup(prev => ({ ...prev, visible: false }));
  };

  const [profileStatus, setProfileStatus] = useState('none');
  const [adminNotes, setAdminNotes] = useState('');

  // Form fields
  const [hookline, setHookline] = useState('');
  const [aboutMe, setAboutMe] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedLanguages, setSelectedLanguages] = useState(['English']);
  const [displayName, setDisplayName] = useState('');
  const originalRef = useRef(null);

  const hasChanges = (() => {
    if (!originalRef.current) return false
    const o = originalRef.current
    return o.hookline !== hookline
      || o.aboutMe !== aboutMe
      || o.displayName !== displayName
      || !arraysEqualIgnoringOrder(o.selectedTags, selectedTags)
      || !arraysEqualIgnoringOrder(o.selectedLanguages, selectedLanguages)
  })()

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await listenerAPI.getMyProfile();
      const d = res.data;
      setProfileStatus(d.profileStatus || 'none');
      setAdminNotes(d.profileAdminNotes || '');
      setDisplayName(d.displayName || '');
      const src = d.draftProfile || d.publicProfile || {};
      setHookline(src.hookline || '');
      setAboutMe(src.aboutMe || '');
      setSelectedTags(src.expertiseTags || []);
      setSelectedLanguages(src.languages?.length ? src.languages : ['English']);
      originalRef.current = {
        hookline: src.hookline || '',
        aboutMe: src.aboutMe || '',
        displayName: d.displayName || '',
        selectedTags: src.expertiseTags || [],
        selectedLanguages: src.languages?.length ? src.languages : ['English'],
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await listenerAPI.getMyProfile();
      const d = res.data;

      setProfileStatus(d.profileStatus || 'none');
      setAdminNotes(d.profileAdminNotes || '');
      setDisplayName(d.displayName || '');

      // Load draft if exists, otherwise load public profile
      const src = d.draftProfile || d.publicProfile || {};
      setHookline(src.hookline || '');
      setAboutMe(src.aboutMe || '');
      setSelectedTags(src.expertiseTags || []);
      setSelectedLanguages(src.languages?.length ? src.languages : ['English']);
      originalRef.current = {
        hookline: src.hookline || '',
        aboutMe: src.aboutMe || '',
        displayName: d.displayName || '',
        selectedTags: src.expertiseTags || [],
        selectedLanguages: src.languages?.length ? src.languages : ['English'],
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      showPopup('error', 'Load Failed', 'Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 6 ? [...prev, tag] : prev
    );
  };

  const toggleLanguage = (lang) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? (prev.length > 1 ? prev.filter((l) => l !== lang) : prev) : [...prev, lang]
    );
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      await listenerAPI.updatePublicProfile({
        hookline, aboutMe, expertiseTags: selectedTags,
        languages: selectedLanguages,
        displayName,
      });
      setProfileStatus('draft');
      showPopup('success', 'Saved!', 'Your draft has been saved successfully.');
    } catch (err) {
      console.error('Save draft failed:', err);
      showPopup('error', 'Save Failed', err.message || 'Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!hookline.trim() || !aboutMe.trim()) {
      showPopup('info', 'Incomplete', 'Please fill in both the Hookline and About Me sections.');
      return;
    }

    showPopup('confirm', 'Submit Profile', 'Your changes will be reviewed by our admin team before going live. Continue?', async () => {
      closePopup();
      try {
        setSubmitting(true);
        // Save draft first, then submit
        await listenerAPI.updatePublicProfile({
          hookline, aboutMe, expertiseTags: selectedTags,
          languages: selectedLanguages,
          displayName,
        });
        await listenerAPI.submitProfileForApproval();
        setProfileStatus('pending');
        showPopup('success', 'Submitted!', 'Your profile has been submitted for approval. You will be notified once it is live.');
      } catch (err) {
        console.error('Submit failed:', err);
        showPopup('error', 'Submit Failed', err.message || 'Failed to submit profile.');
      } finally {
        setSubmitting(false);
      }
    });
  };

  if (loading) {
    return <LoadingSkeleton insets={insets} />;
  }

  const statusConf = STATUS_CONFIG[profileStatus];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Edit Public Profile</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#8B5CF6" colors={['#8B5CF6']} />}>
        {/* Status Banner */}
        {statusConf && (
          <View style={[styles.statusBanner, { backgroundColor: statusConf.bg, borderColor: statusConf.color }]}>
            <Ionicons name={statusConf.icon} size={20} color={statusConf.color} />
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: statusConf.color }]}>{statusConf.label}</Text>
              <Text style={styles.statusMsg}>{statusConf.msg}</Text>
            </View>
          </View>
        )}

        {/* Admin Rejection Notes */}
        {profileStatus === 'rejected' && adminNotes ? (
          <View style={styles.adminNotesBox}>
            <Ionicons name="warning" size={18} color="#EF4444" />
            <Text style={styles.adminNotesText}>{adminNotes}</Text>
          </View>
        ) : null}

        <Text style={styles.infoText}>
          Customize your public-facing profile. Changes require admin approval before going live.
        </Text>

        {/* Display Name */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Display Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your display name"
            placeholderTextColor="#6B7280"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={50}
          />
        </View>

        {/* Hookline */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hookline *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Here to listen and help you find peace."
            placeholderTextColor="#6B7280"
            value={hookline}
            onChangeText={setHookline}
            maxLength={150}
          />
          <Text style={styles.charCount}>{hookline.length}/150</Text>
        </View>

        {/* About Me */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>About Me *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tell users about your expertise, experience, and what makes you a great listener..."
            placeholderTextColor="#6B7280"
            value={aboutMe}
            onChangeText={setAboutMe}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={2000}
          />
          <Text style={styles.charCount}>{aboutMe.length}/2000</Text>
        </View>

        {/* Interest Tags */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Interest Tags ({selectedTags.length}/6)</Text>
          <View style={styles.chipGrid}>
            {AVAILABLE_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <TouchableOpacity
                  key={tag}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{tag}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Languages */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Languages</Text>
          <View style={styles.chipGrid}>
            {AVAILABLE_LANGUAGES.map((lang) => {
              const active = selectedLanguages.includes(lang);
              return (
                <TouchableOpacity
                  key={lang}
                  style={[styles.chip, active && styles.langChipActive]}
                  onPress={() => toggleLanguage(lang)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, active && styles.langChipTextActive]}>{lang}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonsRow}>
          <TouchableOpacity
            style={styles.draftBtnContainer}
            onPress={handleSaveDraft}
            disabled={saving || submitting}
            activeOpacity={0.8}
          >
            <View style={styles.draftBtn}>
              {saving ? <ActivityIndicator size="small" color="#8B5CF6" /> : (
                <>
                  <Ionicons name="save-outline" size={18} color="#8B5CF6" />
                  <Text style={styles.draftBtnText}>Save Draft</Text>
                </>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.submitBtnContainer}
            onPress={handleSubmit}
            disabled={saving || submitting || profileStatus === 'pending' || !hasChanges}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={profileStatus === 'pending' || !hasChanges ? ['#4B5563', '#374151'] : ['#8B5CF6', '#EC4899']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.submitBtn}
            >
              {submitting ? <ActivityIndicator size="small" color="#fff" /> : (
                <>
                  <Ionicons name="send" size={16} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {profileStatus === 'pending' ? 'Under Review' : 'Submit'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <StatusPopup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={closePopup}
        onConfirm={popup.onConfirm}
        icon={popup.icon}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9CA3AF', fontSize: SW * 0.035, marginTop: 12, fontFamily: 'Inter_400Regular' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SW * 0.05,
    paddingVertical: SH * 0.015,
    gap: SW * 0.02,
  },
  backBtn: {
    padding: 4,
    marginLeft: -SW * 0.02,
  },
  headerTitle: {
    color: '#fff',
    fontSize: SW * 0.075,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
  },
  scrollContent: { padding: '5%' },

  // Status Banner
  statusBanner: {
    flexDirection: 'row', alignItems: 'center', padding: '4%',
    borderRadius: 12, borderWidth: 1, marginBottom: '4%', gap: 10,
  },
  statusInfo: { flex: 1 },
  statusLabel: { fontSize: SW * 0.036, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  statusMsg: { color: '#9CA3AF', fontSize: SW * 0.03, marginTop: 2, fontFamily: 'Inter_400Regular' },

  adminNotesBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: '4%',
    backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 12,
    borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', marginBottom: '4%',
  },
  adminNotesText: { flex: 1, color: '#FCA5A5', fontSize: SW * 0.032, fontFamily: 'Inter_400Regular', lineHeight: SW * 0.048 },

  infoText: { color: '#9CA3AF', fontSize: SW * 0.033, marginBottom: '6%', lineHeight: SW * 0.05, fontFamily: 'Inter_400Regular' },

  inputGroup: { marginBottom: '6%' },
  label: { color: '#E5E7EB', fontSize: SW * 0.036, fontFamily: 'Inter_500Medium', marginBottom: '2%' },
  input: {
    backgroundColor: '#111', borderWidth: 1, borderColor: '#333', borderRadius: 12,
    color: '#fff', paddingHorizontal: '4%', paddingVertical: '3.5%',
    fontSize: SW * 0.036, fontFamily: 'Inter_400Regular',
  },
  textArea: { minHeight: SH * 0.13, textAlignVertical: 'top' },
  charCount: { color: '#4B5563', fontSize: SW * 0.028, marginTop: 4, textAlign: 'right', fontFamily: 'Inter_400Regular' },

  // Chips
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: SH * 0.009, paddingHorizontal: SW * 0.035,
    borderRadius: 20, borderWidth: 1, borderColor: '#333', backgroundColor: '#111',
  },
  chipActive: { borderColor: '#8B5CF6', backgroundColor: 'rgba(139,92,246,0.15)' },
  chipText: { color: '#9CA3AF', fontSize: SW * 0.031, fontFamily: 'Inter_500Medium' },
  chipTextActive: { color: '#C4B5FD' },
  langChipActive: { borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.15)' },
  langChipTextActive: { color: '#93C5FD' },

  // Buttons
  buttonsRow: { flexDirection: 'row', gap: 12, marginTop: '4%' },
  draftBtnContainer: { flex: 1, borderRadius: 25, overflow: 'hidden' },
  draftBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: '12%', borderRadius: 25, borderWidth: 1.5, borderColor: '#8B5CF6',
  },
  draftBtnText: { color: '#8B5CF6', fontSize: SW * 0.036, fontWeight: '700', fontFamily: 'Inter_700Bold' },
  submitBtnContainer: { flex: 1, borderRadius: 25, overflow: 'hidden' },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: '12%',
  },
  submitBtnText: { color: '#fff', fontSize: SW * 0.036, fontWeight: '700', fontFamily: 'Inter_700Bold' },
});

// Chip skeleton heights/widths mirror the real chip styles (text size + padding)
const CHIP_HEIGHT = SH * 0.009 * 2 + SW * 0.031 + 6;
const CHIP_WIDTHS = [0.24, 0.3, 0.2, 0.26, 0.32, 0.22];

const LoadingSkeleton = ({ insets }) => (
  <View style={[styles.container, { paddingTop: insets.top }]}>
    {/* Header */}
    <View style={styles.header}>
      <Skeleton width={SW * 0.45} height={SW * 0.07} borderRadius={6} />
    </View>

    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Status Banner Skeleton (icon + label + msg) */}
      <View style={[styles.statusBanner, { borderColor: '#1F1F1F' }]}>
        <Skeleton width={20} height={20} borderRadius={10} />
        <View style={styles.statusInfo}>
          <Skeleton width={110} height={14} borderRadius={4} style={{ marginBottom: 6 }} />
          <Skeleton width="80%" height={12} borderRadius={4} />
        </View>
      </View>

      {/* Info Text Skeleton */}
      <View style={{ marginBottom: '6%' }}>
        <Skeleton width="95%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={12} borderRadius={4} />
      </View>

      {/* Display Name Input Group */}
      <View style={styles.inputGroup}>
        <Skeleton width={110} height={14} borderRadius={4} style={{ marginBottom: '2%' }} />
        <Skeleton width="100%" height={48} borderRadius={12} />
      </View>

      {/* Hookline Input Group (with char count) */}
      <View style={styles.inputGroup}>
        <Skeleton width={90} height={14} borderRadius={4} style={{ marginBottom: '2%' }} />
        <Skeleton width="100%" height={48} borderRadius={12} />
        <Skeleton width={48} height={10} borderRadius={4} style={{ marginTop: 4, alignSelf: 'flex-end' }} />
      </View>

      {/* About Me Input Group (tall textarea + char count) */}
      <View style={styles.inputGroup}>
        <Skeleton width={90} height={14} borderRadius={4} style={{ marginBottom: '2%' }} />
        <Skeleton width="100%" height={SH * 0.13} borderRadius={12} />
        <Skeleton width={48} height={10} borderRadius={4} style={{ marginTop: 4, alignSelf: 'flex-end' }} />
      </View>

      {/* Interest Tags Group (label + chip grid) */}
      <View style={styles.inputGroup}>
        <Skeleton width={150} height={14} borderRadius={4} style={{ marginBottom: '2%' }} />
        <View style={styles.chipGrid}>
          {CHIP_WIDTHS.map((w, i) => (
            <Skeleton key={i} width={SW * w} height={CHIP_HEIGHT} borderRadius={20} />
          ))}
        </View>
      </View>

      {/* Languages Group (label + chip grid) */}
      <View style={styles.inputGroup}>
        <Skeleton width={100} height={14} borderRadius={4} style={{ marginBottom: '2%' }} />
        <View style={styles.chipGrid}>
          {CHIP_WIDTHS.slice(0, 5).map((w, i) => (
            <Skeleton key={i} width={SW * (w + 0.04)} height={CHIP_HEIGHT} borderRadius={20} />
          ))}
        </View>
      </View>

      {/* Action Buttons Skeleton */}
      <View style={styles.buttonsRow}>
        <Skeleton width="48%" height={58} borderRadius={25} />
        <Skeleton width="48%" height={58} borderRadius={25} />
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  </View>
);
