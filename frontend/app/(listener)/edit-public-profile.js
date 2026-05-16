import { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TextInput, ScrollView, TouchableOpacity,
  Dimensions, Alert, Image, ActivityIndicator, Platform,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Skeleton } from '../../components/admin/Skeleton';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
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
];

const STATUS_CONFIG = {
  pending: { color: '#F59E0B', bg: 'rgba(245,158,11,0.1)', icon: 'time-outline', label: 'Pending Review', msg: 'Your profile is being reviewed by our team.' },
  approved: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)', icon: 'checkmark-circle-outline', label: 'Approved', msg: 'Your profile is live!' },
  rejected: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)', icon: 'close-circle-outline', label: 'Rejected', msg: 'Please review the admin notes and resubmit.' },
  draft: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)', icon: 'create-outline', label: 'Draft', msg: 'You have unsaved draft changes.' },
};

export default function EditPublicProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Popup state
  const [popup, setPopup] = useState({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onConfirm: null
  });

  const showPopup = (type, title, message, onConfirm = null) => {
    setPopup({ visible: true, type, title, message, onConfirm });
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
  const [profileImage, setProfileImage] = useState(null);
  const [coverImage, setCoverImage] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [displayName, setDisplayName] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

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
      setProfileImage(src.profileImage || null);
      setCoverImage(src.coverImage || null);
      setGalleryImages(src.galleryImages || []);
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

  const uploadFileToS3 = async (uri, category) => {
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
    const fileType = mimeMap[ext] || 'image/jpeg';

    // Get presigned URL
    const res = await listenerAPI.getMediaUploadUrls([{ fileType, extension: ext, category }]);
    const upload = res.data.uploads[0];

    // Read file and upload
    const response = await fetch(uri);
    const blob = await response.blob();

    await fetch(upload.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': fileType },
      body: blob,
    });

    return upload.fileUrl;
  };

  const pickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        setUploading(true);
        const fileUrl = await uploadFileToS3(result.assets[0].uri, 'profile_image');
        setProfileImage(fileUrl);
      } catch (err) {
        console.error('Profile image upload failed:', err);
        showPopup('error', 'Upload Failed', 'Could not upload profile image. Please check your connection and try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const pickCoverImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        setUploading(true);
        const fileUrl = await uploadFileToS3(result.assets[0].uri, 'cover_image');
        setCoverImage(fileUrl);
      } catch (err) {
        console.error('Cover image upload failed:', err);
        showPopup('error', 'Upload Failed', 'Could not upload cover image. Please check your connection and try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const pickGalleryImage = async () => {
    if (galleryImages.length >= 6) {
      showPopup('info', 'Limit Reached', 'You can upload a maximum of 6 images to your gallery.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        setUploading(true);
        const fileUrl = await uploadFileToS3(result.assets[0].uri, 'gallery_image');
        setGalleryImages((prev) => [...prev, fileUrl]);
      } catch (err) {
        console.error('Gallery upload failed:', err);
        showPopup('error', 'Upload Failed', 'Could not upload gallery image.');
      } finally {
        setUploading(false);
      }
    }
  };

  const removeGalleryImage = (index) => {
    setGalleryImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      await listenerAPI.updatePublicProfile({
        hookline, aboutMe, expertiseTags: selectedTags,
        languages: selectedLanguages, profileImage, coverImage,
        galleryImages, displayName,
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

    showPopup('confirm', 'Submit Profile?', 'Your changes will be reviewed by our admin team before going live. Continue?', async () => {
      closePopup();
      try {
        setSubmitting(true);
        // Save draft first, then submit
        await listenerAPI.updatePublicProfile({
          hookline, aboutMe, expertiseTags: selectedTags,
          languages: selectedLanguages, profileImage, coverImage,
          galleryImages, displayName,
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
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Public Profile</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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

        {/* Profile Image */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Profile Photo</Text>
          <TouchableOpacity style={styles.profileImagePicker} onPress={pickProfileImage} disabled={uploading} activeOpacity={0.7}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImagePreview} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Ionicons name="camera" size={32} color="#6B7280" />
                <Text style={styles.uploadHint}>Tap to upload</Text>
              </View>
            )}
            {uploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Cover Photo */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Cover Photo</Text>
          <Text style={[styles.charCount, { textAlign: 'left', marginTop: 0, marginBottom: 8 }]}>Banner image displayed at the top of your profile (16:9)</Text>
          <TouchableOpacity style={styles.coverImagePicker} onPress={pickCoverImage} disabled={uploading} activeOpacity={0.7}>
            {coverImage ? (
              <Image source={{ uri: coverImage }} style={styles.coverImagePreview} />
            ) : (
              <View style={styles.coverImagePlaceholder}>
                <Ionicons name="image" size={36} color="#6B7280" />
                <Text style={styles.uploadHint}>Tap to upload cover photo</Text>
              </View>
            )}
            {uploading && (
              <View style={styles.uploadOverlay}>
                <ActivityIndicator size="small" color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          {coverImage && (
            <TouchableOpacity onPress={() => setCoverImage(null)} style={styles.removeCoverBtn}>
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={{ color: '#EF4444', fontSize: SW * 0.03, fontFamily: 'Inter_500Medium', marginLeft: 4 }}>Remove</Text>
            </TouchableOpacity>
          )}
        </View>

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

        {/* Expertise Tags */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Expertise Tags ({selectedTags.length}/6)</Text>
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

        {/* Gallery Images */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Gallery Images ({galleryImages.length}/6)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryRow}>
            {galleryImages.map((url, idx) => (
              <View key={idx} style={styles.galleryThumb}>
                <Image source={{ uri: url }} style={styles.galleryThumbImg} />
                <TouchableOpacity style={styles.removeBtn} onPress={() => removeGalleryImage(idx)}>
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            {galleryImages.length < 6 && (
              <TouchableOpacity style={styles.addGalleryBtn} onPress={pickGalleryImage} disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#8B5CF6" />
                ) : (
                  <>
                    <Ionicons name="add" size={28} color="#8B5CF6" />
                    <Text style={styles.addGalleryText}>Add</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </ScrollView>
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
            disabled={saving || submitting || profileStatus === 'pending'}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={profileStatus === 'pending' ? ['#4B5563', '#374151'] : ['#8B5CF6', '#EC4899']}
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#9CA3AF', fontSize: SW * 0.035, marginTop: 12, fontFamily: 'Inter_400Regular' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: '4%', paddingVertical: '3%',
    borderBottomWidth: 1, borderBottomColor: '#1A1A1A',
  },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: SW * 0.045, fontWeight: '700', fontFamily: 'Inter_700Bold' },
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

  // Profile Image
  profileImagePicker: {
    width: SW * 0.28, height: SW * 0.28, borderRadius: SW * 0.14,
    overflow: 'hidden', alignSelf: 'center', borderWidth: 2, borderColor: '#333',
  },
  profileImagePreview: { width: '100%', height: '100%' },
  profileImagePlaceholder: {
    flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
  },
  uploadHint: { color: '#6B7280', fontSize: SW * 0.028, marginTop: 4, fontFamily: 'Inter_400Regular' },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Cover Image
  coverImagePicker: {
    width: '100%', height: SW * 0.45, borderRadius: 16,
    overflow: 'hidden', borderWidth: 2, borderColor: '#333',
  },
  coverImagePreview: { width: '100%', height: '100%' },
  coverImagePlaceholder: {
    flex: 1, backgroundColor: '#111', alignItems: 'center', justifyContent: 'center',
  },
  removeCoverBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    marginTop: 8, paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, backgroundColor: 'rgba(239,68,68,0.1)',
  },

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

  // Gallery
  galleryRow: { paddingVertical: 4, gap: 10 },
  galleryThumb: {
    width: SW * 0.22, height: SW * 0.22, borderRadius: 12,
    overflow: 'hidden', backgroundColor: '#111',
  },
  galleryThumbImg: { width: '100%', height: '100%' },
  removeBtn: { position: 'absolute', top: 4, right: 4 },
  addGalleryBtn: {
    width: SW * 0.22, height: SW * 0.22, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#333', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#0A0A0A',
  },
  addGalleryText: { color: '#8B5CF6', fontSize: SW * 0.028, marginTop: 2, fontFamily: 'Inter_500Medium' },

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

const LoadingSkeleton = ({ insets }) => (
  <View style={[styles.container, { paddingTop: insets.top }]}>
    <View style={styles.header}>
      <View style={{ width: 28 }}><Skeleton width={24} height={24} borderRadius={12} /></View>
      <Skeleton width={150} height={20} borderRadius={4} />
      <View style={{ width: 28 }} />
    </View>

    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Banner Skeleton */}
      <Skeleton width="100%" height={60} borderRadius={12} style={{ marginBottom: 24 }} />

      {/* Info Text Skeleton */}
      <View style={{ marginBottom: 24 }}>
        <Skeleton width="90%" height={12} borderRadius={4} style={{ marginBottom: 8 }} />
        <Skeleton width="70%" height={12} borderRadius={4} />
      </View>

      {/* Profile Image Skeleton */}
      <View style={{ alignItems: 'center', marginBottom: 32 }}>
        <Skeleton width={SW * 0.28} height={SW * 0.28} borderRadius={SW * 0.14} />
        <Skeleton width={80} height={10} borderRadius={4} style={{ marginTop: 12 }} />
      </View>

      {/* Inputs Skeletons */}
      {[1, 2, 3].map((i) => (
        <View key={i} style={{ marginBottom: 24 }}>
          <Skeleton width={100} height={14} borderRadius={4} style={{ marginBottom: 10 }} />
          <Skeleton width="100%" height={50} borderRadius={12} />
        </View>
      ))}

      {/* Tags Skeleton */}
      <View style={{ marginBottom: 24 }}>
        <Skeleton width={120} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} width={SW * 0.2} height={35} borderRadius={20} />
          ))}
        </View>
      </View>

      {/* Gallery Skeleton */}
      <View style={{ marginBottom: 32 }}>
        <Skeleton width={140} height={14} borderRadius={4} style={{ marginBottom: 12 }} />
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} width={SW * 0.22} height={SW * 0.22} borderRadius={12} />
          ))}
        </View>
      </View>

      {/* Buttons Skeleton */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Skeleton width="48%" height={50} borderRadius={25} />
        <Skeleton width="48%" height={50} borderRadius={25} />
      </View>
    </ScrollView>
  </View>
);
