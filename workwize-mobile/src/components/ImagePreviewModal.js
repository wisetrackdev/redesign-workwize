import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';

/**
 * Universal Mobile Image Preview Modal with bottom close button
 */
export default function ImagePreviewModal({
  visible,
  imageUrl,
  title = 'Image Preview',
  subTitle = '',
  onClose,
}) {
  if (!imageUrl) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        <SafeAreaView style={styles.safeArea}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.titleCol}>
              <Text style={styles.title} numberOfLines={1}>
                {title}
              </Text>
              {subTitle ? (
                <Text style={styles.subTitle} numberOfLines={1}>
                  {subTitle}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.headerCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Center Image Container */}
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </View>

          {/* Bottom Action Bar with prominent Close Button */}
          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={styles.bottomCloseBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Feather name="x-circle" size={18} color="#FFFFFF" />
              <Text style={styles.bottomCloseText}>Close Preview</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.94)',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.12)',
  },
  titleCol: {
    flex: 1,
    marginRight: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.65)',
    marginTop: 2,
    fontWeight: '600',
  },
  headerCloseBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
  },
  bottomCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary || '#1B365D',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  bottomCloseText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
