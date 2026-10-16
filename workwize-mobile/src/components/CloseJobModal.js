import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import { cleanIssuedBy, resolveUserName } from '../api/dailyJobApi';
import ImagePreviewModal from './ImagePreviewModal';

export default function CloseJobModal({
  visible,
  job,
  onClose,
  onCloseSubmit,
  currentUser,
  userTeamContext,
  cachedTeams = [],
}) {
  const [closingBy, setClosingBy] = useState('');
  const [remarks, setRemarks] = useState('');
  const [photoAfterUri, setPhotoAfterUri] = useState(null);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // When modal opens or target job changes: ALWAYS reset remarks and photos, and pre-select user's name & team
  useEffect(() => {
    if (visible && job) {
      setRemarks('');
      setPhotoAfterUri(null);
      setShowImagePreview(false);

      const rawUser = currentUser?.name || currentUser?.email || currentUser?.username || 'User';
      const userName = resolveUserName(rawUser, cachedTeams);
      const teamName =
        userTeamContext?.primaryTeamName ||
        currentUser?.primaryTeam ||
        currentUser?.dept ||
        job.dept ||
        'General';
      const autoClosingBy = `${userName} (${teamName})`;

      setClosingBy(autoClosingBy);
    }
  }, [visible, job, currentUser, userTeamContext, cachedTeams]);

  if (!job) return null;

  const handleModalClose = () => {
    setRemarks('');
    setPhotoAfterUri(null);
    setShowImagePreview(false);
    onClose();
  };

  const pickImage = async (fromCamera = false) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Camera permission is required.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.7,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Photo library permission is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          quality: 0.7,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setPhotoAfterUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  const handleSubmit = () => {
    if (!remarks.trim()) {
      Alert.alert('Remarks required', 'Please provide completion remarks to close this job.');
      return;
    }

    const rawUser = currentUser?.name || currentUser?.email || currentUser?.username || 'User';
    const userName = resolveUserName(rawUser, cachedTeams);
    const teamName =
      userTeamContext?.primaryTeamName ||
      currentUser?.primaryTeam ||
      currentUser?.dept ||
      job.dept ||
      'General';
    const finalClosingBy = (closingBy && closingBy.trim()) || `${userName} (${teamName})`;

    const doSubmit = () => {
      onCloseSubmit({
        jobId: job.id,
        closingBy: finalClosingBy,
        remarks: remarks.trim(),
        photoAfterUri,
      });
      setRemarks('');
      setPhotoAfterUri(null);
      setShowImagePreview(false);
      onClose();
    };

    // If without photo, prompt confirmation matching workwize-teal / quickfix
    if (!photoAfterUri) {
      Alert.alert(
        'Close without image?',
        'You have not attached any completion photo for this job. Do you want to continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm & Close', onPress: doSubmit },
        ]
      );
      return;
    }

    doSubmit();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Close Job</Text>
              <Text style={styles.subTitle} numberOfLines={1}>
                {job.propId || job.details}
              </Text>
            </View>
            <TouchableOpacity onPress={handleModalClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Team Rule Notice (.team-rule-note) */}
            <View style={styles.noticeBox}>
              <Feather name="info" size={16} color="#92400E" />
              <Text style={styles.noticeText}>
                Job belongs to {job.dept || 'team'}. Closing remarks are required.
              </Text>
            </View>

            {/* Closing Team Member */}
            <Text style={styles.label}>CLOSING TEAM MEMBER</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Ahmed Ali (Housekeeping)"
              placeholderTextColor={Colors.placeholder}
              value={closingBy}
              onChangeText={setClosingBy}
            />

            {/* Completion Remarks */}
            <Text style={styles.label}>COMPLETION REMARKS *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter completion remarks..."
              placeholderTextColor={Colors.placeholder}
              value={remarks}
              onChangeText={setRemarks}
              multiline
              numberOfLines={3}
            />

            {/* Photo After (Optional) */}
            <Text style={styles.label}>PHOTO AFTER (OPTIONAL)</Text>
            {photoAfterUri ? (
              <View style={styles.photoPreviewWrap}>
                <TouchableOpacity
                  onPress={() => setShowImagePreview(true)}
                  activeOpacity={0.85}
                  style={{ width: '100%' }}
                >
                  <Image source={{ uri: photoAfterUri }} style={styles.previewImage} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => setPhotoAfterUri(null)}
                >
                  <Feather name="trash-2" size={13} color="#FFFFFF" />
                  <Text style={styles.removePhotoText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.photoPickerRow}>
                <TouchableOpacity
                  style={styles.photoActionBtn}
                  onPress={() => pickImage(true)}
                >
                  <Feather name="camera" size={16} color={Colors.primary} />
                  <Text style={styles.photoActionText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.photoActionBtn}
                  onPress={() => pickImage(false)}
                >
                  <Feather name="image" size={16} color={Colors.primary} />
                  <Text style={styles.photoActionText}>Choose File</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={handleModalClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmBtn} onPress={handleSubmit}>
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={styles.confirmBtnText}>Confirm & Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        visible={showImagePreview}
        imageUrl={photoAfterUri}
        title="Photo After Preview"
        subTitle={job.propId || ''}
        onClose={() => setShowImagePreview(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.bgOverlay,
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: Colors.line,
    backgroundColor: '#FAFBFD',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.ink,
  },
  subTitle: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
    maxWidth: 260,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  noticeText: {
    flex: 1,
    fontSize: 11.5,
    color: '#92400E',
    fontWeight: '600',
    lineHeight: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginTop: 10,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: '#F7F9FD',
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: Colors.ink,
    marginBottom: 8,
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  photoPickerRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  photoActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.line,
    backgroundColor: '#F7F9FD',
  },
  photoActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  photoPreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  previewImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.red,
  },
  removePhotoText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.line,
    backgroundColor: '#FAFBFD',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E5E9F6',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.green,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
