import React, { useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

export default function NewJobModal({
  visible,
  onClose,
  onSubmit,
  teamList = [],
  areaList = [],
  currentUser,
}) {
  const [dept, setDept] = useState('');
  const [area, setArea] = useState('');
  const [subArea, setSubArea] = useState('');
  const [details, setDetails] = useState('');
  const [photoUri, setPhotoUri] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultTeams = teamList.length > 0 ? teamList : [
    'Engineering',
    'Housekeeping',
    'IT',
    'Security',
    'Front Office',
    'Food & Beverage',
  ];

  const defaultAreas = areaList.length > 0 ? areaList : [
    'Main Building',
    'Lobby & Reception',
    'Guest Rooms - Wing A',
    'Guest Rooms - Wing B',
    'Restaurant & Kitchen',
    'Swimming Pool & Spa',
    'Gardens & Pathway',
    'Waste Management',
  ];

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
        setPhotoUri(result.assets[0].uri);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  const handleSubmit = async () => {
    if (!details.trim()) {
      Alert.alert('Validation Error', 'Please enter job details.');
      return;
    }
    if (!dept) {
      Alert.alert('Validation Error', 'Please select an Issued To Department.');
      return;
    }
    if (!area) {
      Alert.alert('Validation Error', 'Please select an Area.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        dept,
        area,
        sub: subArea,
        details,
        photoUri,
        by: currentUser ? `${currentUser.name} [${currentUser.desg || 'Staff'}]` : 'IT [App admin]',
      });
      // Reset form
      setDetails('');
      setSubArea('');
      setPhotoUri(null);
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header matching workwize-teal modal */}
          <View style={styles.header}>
            <Text style={styles.title}>Create New Job</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Issued To Dept */}
            <Text style={styles.label}>ISSUED TO DEPT. *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {defaultTeams.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, dept === t && styles.chipActive]}
                  onPress={() => setDept(t)}
                >
                  <Text style={[styles.chipText, dept === t && styles.chipTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Area */}
            <Text style={styles.label}>AREA *</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.hScroll}>
              {defaultAreas.slice(0, 10).map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.chip, area === a && styles.chipActive]}
                  onPress={() => setArea(a)}
                >
                  <Text style={[styles.chipText, area === a && styles.chipTextActive]}>
                    {a}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Sub-Area */}
            <Text style={styles.label}>SUB-AREA</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Room 204, Floor 2"
              placeholderTextColor={Colors.placeholder}
              value={subArea}
              onChangeText={setSubArea}
            />

            {/* Job Details */}
            <Text style={styles.label}>JOB DETAILS *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter job detail..."
              placeholderTextColor={Colors.placeholder}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={4}
            />

            {/* Photo Attachment */}
            <Text style={styles.label}>PHOTO (SIZE LIMIT: 5MB)</Text>
            {photoUri ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={styles.previewImage} />
                <TouchableOpacity
                  style={styles.removePhotoBtn}
                  onPress={() => setPhotoUri(null)}
                >
                  <Feather name="trash-2" size={13} color="#FFFFFF" />
                  <Text style={styles.removePhotoText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.dropZone}>
                <TouchableOpacity
                  style={styles.dropBtn}
                  onPress={() => pickImage(true)}
                >
                  <Feather name="camera" size={18} color={Colors.primary} />
                  <Text style={styles.dropText}>Take Photo</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.dropBtn}
                  onPress={() => pickImage(false)}
                >
                  <Feather name="image" size={18} color={Colors.primary} />
                  <Text style={styles.dropText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons (.btns) */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.submitBtnText}>Submit Job</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    maxHeight: '90%',
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
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    padding: 18,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginTop: 12,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  hScroll: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
    backgroundColor: '#F7F9FD',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: Colors.ink,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  input: {
    backgroundColor: '#F7F9FD',
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13.5,
    color: Colors.ink,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  dropZone: {
    flexDirection: 'row',
    gap: 10,
    borderWidth: 2,
    borderColor: '#A9B6E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#F1F4FC',
    padding: 14,
    marginBottom: 10,
  },
  dropBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  dropText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  photoPreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
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
    borderRadius: 10,
    backgroundColor: '#E5E9F6',
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
