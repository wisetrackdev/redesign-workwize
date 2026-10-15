import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from '../theme/colors';
import DropdownModal from './DropdownModal';
import { isSuperAdmin, getIssuedByDisplay } from '../api/dailyJobApi';

export default function NewJobView({
  onSubmit,
  onCancel,
  cachedTeams = [],
  cachedAreas = [],
  userCurrentTeamId = null,
  userSubTeamData = [],
  primaryTeamName = '',
  currentUser,
  currentPropertyId = 'Testing',
  currentPropertyName = 'Testing',
  jobs = [],
}) {
  // Check if current user is SuperAdmin (Superadmin never sees assignment fields)
  const superAdmin = isSuperAdmin(currentUser);

  // Issued By display string matching workwize-teal:
  // e.g. "Testing [Head-House Keeping: Testing-House Keeping]" or "IT [App admin]"
  const issuedByDisplay = useMemo(() => {
    return getIssuedByDisplay(currentUser, primaryTeamName);
  }, [currentUser, primaryTeamName]);

  // Form Fields State
  const [issuedTo, setIssuedTo] = useState('');
  const [issuedToLabel, setIssuedToLabel] = useState('');
  const [issuedBy, setIssuedBy] = useState(issuedByDisplay);
  const [area, setArea] = useState('');
  const [areaLabel, setAreaLabel] = useState('');
  const [subArea, setSubArea] = useState('');
  const [details, setDetails] = useState('');

  // 2 Dynamic Conditional Fields
  const [assignedSubTeam, setAssignedSubTeam] = useState('');
  const [assignedSubTeamLabel, setAssignedSubTeamLabel] = useState('');
  const [assignedSupervisor, setAssignedSupervisor] = useState('');
  const [assignedSupervisorLabel, setAssignedSupervisorLabel] = useState('');

  // Picker Modals Visibility
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [showSubTeamPicker, setShowSubTeamPicker] = useState(false);
  const [showSupervisorPicker, setShowSupervisorPicker] = useState(false);

  // Photo
  const [photoUri, setPhotoUri] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Errors & Warnings
  const [errors, setErrors] = useState({});
  const [subTeamWarning, setSubTeamWarning] = useState('');

  // No Photo Modal Confirmation (Exact match to workwize-teal #noPhotoModal)
  const [showNoPhotoModal, setShowNoPhotoModal] = useState(false);

  // Format Teams for Dropdown (Purely dynamic from API)
  const teamOptions = useMemo(() => {
    if (cachedTeams && cachedTeams.length > 0) {
      return cachedTeams.map((t) => ({
        id: t.teamId || t.teamName,
        label: t.teamName || t.teamId,
        value: t.teamId || t.teamName,
        teamObj: t,
      }));
    }
    return [];
  }, [cachedTeams]);

  // Format Areas for Dropdown (Purely dynamic from API)
  const areaOptions = useMemo(() => {
    if (cachedAreas && cachedAreas.length > 0) {
      return cachedAreas.map((a) => ({
        id: a.areaId || a.areaid || a.areaName,
        label: a.areaName || a.name || a.areaId,
        value: a.areaId || a.areaid || a.areaName,
        areaObj: a,
      }));
    }
    return [];
  }, [cachedAreas]);

  // Synchronize Area dropdown when Property or cachedAreas changes (Matching quickfix logic)
  useEffect(() => {
    if (areaOptions && areaOptions.length > 0) {
      const match = areaOptions.find(
        (o) => String(o.value) === String(area) || String(o.label) === String(areaLabel)
      );
      if (!match) {
        setArea(areaOptions[0].value);
        setAreaLabel(areaOptions[0].label);
        setSubArea('');
      }
    } else {
      setArea('');
      setAreaLabel('');
      setSubArea('');
    }
  }, [currentPropertyId, cachedAreas, areaOptions]);

  // Set default department on mount if user belongs to a department
  useEffect(() => {
    setIssuedBy(issuedByDisplay);
    if (!issuedTo && userCurrentTeamId) {
      const match = teamOptions.find(
        (t) =>
          String(t.value) === String(userCurrentTeamId) ||
          String(t.label).toLowerCase() === String(userCurrentTeamId).toLowerCase()
      );
      if (match) {
        handleDeptSelect(match.value, match);
      }
    }
  }, [userCurrentTeamId, issuedByDisplay, teamOptions]);

  // Condition Check: Exact logic from workwize-teal handleDeptSelectionChange
  // 1. If SuperAdmin / OproAdmin: Hidden fields NEVER show (always false)
  // 2. If Regular user and issuedTo matches userCurrentTeamId: SHOW assignment fields!
  const showAssignmentFields = useMemo(() => {
    if (superAdmin) return false;
    if (!issuedTo || !userCurrentTeamId) return false;

    const issuedToStr = String(issuedTo).toLowerCase().trim();
    const userTeamStr = String(userCurrentTeamId).toLowerCase().trim();

    return (
      issuedToStr === userTeamStr ||
      issuedToStr.includes(userTeamStr) ||
      userTeamStr.includes(issuedToStr)
    );
  }, [superAdmin, issuedTo, userCurrentTeamId]);

  // Find currently selected team object
  const currentTeamObj = useMemo(() => {
    if (!issuedTo) return null;
    return (
      (cachedTeams || []).find(
        (t) =>
          String(t.teamId) === String(issuedTo) ||
          String(t.teamName).toLowerCase() === String(issuedTo).toLowerCase()
      ) || null
    );
  }, [issuedTo, cachedTeams]);

  // Sub-teams for the selected department
  const subTeamsList = useMemo(() => {
    if (!showAssignmentFields) return [];

    let subs = userSubTeamData;
    if ((!subs || !subs.length) && currentTeamObj && currentTeamObj.propsubteams) {
      subs = currentTeamObj.propsubteams;
    }
    return subs || [];
  }, [showAssignmentFields, userSubTeamData, currentTeamObj]);

  // Sub-team Options for Dropdown
  const subTeamOptions = useMemo(() => {
    if (subTeamsList && subTeamsList.length > 0) {
      return subTeamsList.map((st) => ({
        id: st.subteamId || st.subteamName,
        label: st.subteamName || st.subteamId,
        value: st.subteamId || st.subteamName,
        subteamObj: st,
      }));
    }

    // Fallback: If no subteams configured, check if team has members directly
    if (currentTeamObj && currentTeamObj.members && currentTeamObj.members.length > 0) {
      return [
        {
          id: currentTeamObj.teamId || currentTeamObj.teamName,
          label: currentTeamObj.teamName || currentTeamObj.teamId,
          value: currentTeamObj.teamId || currentTeamObj.teamName,
          isDirectTeam: true,
        },
      ];
    }

    return [];
  }, [subTeamsList, currentTeamObj]);

  // Supervisors / Members Options for Dropdown
  const supervisorOptions = useMemo(() => {
    if (!showAssignmentFields) return [];

    // 1. Look inside selected sub-team
    const st = (subTeamsList || []).find(
      (item) =>
        String(item.subteamId) === String(assignedSubTeam) ||
        String(item.subteamName) === String(assignedSubTeam)
    );

    if (st && st.subteams && st.subteams.length > 0) {
      return st.subteams.map((m) => {
        const fullName =
          ((m.firstName || '') + ' ' + (m.lastName || '')).trim() || m.name || m.email;
        return {
          id: m.email,
          label: `${fullName} (${m.email})`,
          value: m.email,
          name: fullName,
        };
      });
    }

    // 2. Fallback: team members directly
    if (currentTeamObj && currentTeamObj.members && currentTeamObj.members.length > 0) {
      return currentTeamObj.members.map((m) => {
        const fullName =
          ((m.firstName || '') + ' ' + (m.lastName || '')).trim() || m.name || m.email;
        return {
          id: m.email,
          label: `${fullName} (${m.email})`,
          value: m.email,
          name: fullName,
        };
      });
    }

    return [];
  }, [showAssignmentFields, subTeamsList, assignedSubTeam, currentTeamObj]);

  // Handle department change & auto-populate sub-teams/supervisors
  const handleDeptSelect = (deptVal, deptItem) => {
    setIssuedTo(deptVal);
    setIssuedToLabel(deptItem?.label || deptVal);
    setErrors((prev) => ({ ...prev, dept: '' }));

    const isMatch =
      !superAdmin &&
      userCurrentTeamId &&
      (String(deptVal).toLowerCase().trim() === String(userCurrentTeamId).toLowerCase().trim() ||
        String(deptItem?.label || '').toLowerCase().trim() ===
          String(userCurrentTeamId).toLowerCase().trim());

    if (isMatch) {
      // Find subteams
      const myTeam =
        (cachedTeams || []).find(
          (t) =>
            String(t.teamId) === String(deptVal) ||
            String(t.teamName).toLowerCase() === String(deptVal).toLowerCase()
        ) || currentTeamObj;

      let subs = userSubTeamData;
      if ((!subs || !subs.length) && myTeam && myTeam.propsubteams) {
        subs = myTeam.propsubteams;
      }

      if (subs && subs.length > 0) {
        setSubTeamWarning('');
        const firstSub = subs[0];
        setAssignedSubTeam(firstSub.subteamId || firstSub.subteamName);
        setAssignedSubTeamLabel(firstSub.subteamName || firstSub.subteamId);

        // Pre-select supervisor if available
        if (firstSub.subteams && firstSub.subteams.length > 0) {
          const firstSup = firstSub.subteams[0];
          const supName =
            ((firstSup.firstName || '') + ' ' + (firstSup.lastName || '')).trim() ||
            firstSup.name ||
            firstSup.email;
          setAssignedSupervisor(firstSup.email);
          setAssignedSupervisorLabel(`${supName} (${firstSup.email})`);
        } else {
          setAssignedSupervisor('');
          setAssignedSupervisorLabel('');
        }
      } else if (myTeam && myTeam.members && myTeam.members.length > 0) {
        setSubTeamWarning('');
        setAssignedSubTeam(myTeam.teamId || myTeam.teamName);
        setAssignedSubTeamLabel(myTeam.teamName || myTeam.teamId);
        const firstM = myTeam.members[0];
        const fn =
          ((firstM.firstName || '') + ' ' + (firstM.lastName || '')).trim() ||
          firstM.name ||
          firstM.email;
        setAssignedSupervisor(firstM.email);
        setAssignedSupervisorLabel(`${fn} (${firstM.email})`);
      } else {
        setSubTeamWarning(
          'Job cannot be added with assignment as there are no sub teams in this department.'
        );
        setAssignedSubTeam('');
        setAssignedSubTeamLabel('');
        setAssignedSupervisor('');
        setAssignedSupervisorLabel('');
      }
    } else {
      setSubTeamWarning('');
      setAssignedSubTeam('');
      setAssignedSubTeamLabel('');
      setAssignedSupervisor('');
      setAssignedSupervisorLabel('');
    }
  };

  const handleSubTeamSelect = (subVal, subItem) => {
    setAssignedSubTeam(subVal);
    setAssignedSubTeamLabel(subItem?.label || subVal);

    // Populate supervisors for this selected subteam
    const st = (subTeamsList || []).find(
      (item) => String(item.subteamId) === String(subVal) || String(item.subteamName) === String(subVal)
    );

    if (st && st.subteams && st.subteams.length > 0) {
      const firstSup = st.subteams[0];
      const supName =
        ((firstSup.firstName || '') + ' ' + (firstSup.lastName || '')).trim() ||
        firstSup.name ||
        firstSup.email;
      setAssignedSupervisor(firstSup.email);
      setAssignedSupervisorLabel(`${supName} (${firstSup.email})`);
    } else {
      setAssignedSupervisor('');
      setAssignedSupervisorLabel('');
    }
  };

  const handleSupervisorSelect = (supVal, supItem) => {
    setAssignedSupervisor(supVal);
    setAssignedSupervisorLabel(supItem?.label || supVal);
  };

  const handleAreaSelect = (areaVal, areaItem) => {
    setArea(areaVal);
    setAreaLabel(areaItem?.label || areaVal);
    setErrors((prev) => ({ ...prev, area: '' }));
  };

  // Image Picker with 5MB validation matching workwize-teal handleNewJobFiles
  const pickImage = async (fromCamera = false) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Camera permission is required.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission required', 'Gallery permission is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        // 5MB size limit check
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          Alert.alert('File size limit', 'Image exceeds the 5MB size limit.');
          return;
        }
        setPhotoUri(asset.uri);
      }
    } catch (e) {
      console.warn('Image picker error:', e);
    }
  };

  // Form Validation & Submission
  const validateAndSubmit = () => {
    const errs = {};
    if (!issuedTo) errs.dept = 'Please select department';
    if (!area) errs.area = 'Please select area';
    if (!details.trim()) errs.details = 'Please enter job details';

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});

    // If NO photo is selected, prompt confirmation modal (workwize-teal #noPhotoModal)
    if (!photoUri) {
      setShowNoPhotoModal(true);
      return;
    }

    executeSubmission();
  };

  const executeSubmission = async () => {
    setShowNoPhotoModal(false);
    setIsSubmitting(true);
    try {
      await onSubmit({
        dept: issuedTo,
        issued_to_team: issuedTo,
        area: area,
        sub: subArea.trim(),
        subareaId: subArea.trim(),
        details: details.trim(),
        job_detail: details.trim(),
        by: issuedBy,
        assigned_dept: showAssignmentFields ? assignedSubTeam : null,
        assigned_supervisor: showAssignmentFields ? assignedSupervisor : null,
        photoUri: photoUri,
      });

      // Reset form
      setIssuedTo('');
      setIssuedToLabel('');
      setArea('');
      setAreaLabel('');
      setSubArea('');
      setDetails('');
      setPhotoUri(null);
      setAssignedSubTeam('');
      setAssignedSubTeamLabel('');
      setAssignedSupervisor('');
      setAssignedSupervisorLabel('');
    } catch (e) {
      Alert.alert('Submission Error', e.message || 'Failed to submit job');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Create New Job Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeading}>Create New Job</Text>
            <Text style={styles.cardSubheading}>
              Property: <Text style={styles.propHighlight}>{currentPropertyName}</Text>
            </Text>
          </View>

          {/* 1. Field: Issued To Dept. */}
          <View style={styles.fld}>
            <Text style={styles.label}>
              Issued To Dept. <Text style={styles.req}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.dropdownBox, errors.dept && styles.dropdownBoxBad]}
              onPress={() => setShowDeptPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={issuedTo ? styles.dropdownVal : styles.dropdownPlaceholder}>
                {issuedToLabel || issuedTo || (teamOptions.length === 0 ? 'No departments available' : 'Select department')}
              </Text>
              <Feather name="chevron-down" size={18} color={Colors.primary} />
            </TouchableOpacity>
            {errors.dept ? <Text style={styles.errText}>{errors.dept}</Text> : null}
          </View>

          {/* 2. Field: Issued By (Readonly formatted input) */}
          <View style={styles.fld}>
            <Text style={styles.label}>Issued By</Text>
            <TextInput
              style={[styles.input, styles.inputReadonly]}
              value={issuedBy}
              editable={false}
            />
          </View>

          {/* 3. Field: Area */}
          <View style={styles.fld}>
            <Text style={styles.label}>
              Area <Text style={styles.req}>*</Text>
            </Text>
            <TouchableOpacity
              style={[styles.dropdownBox, errors.area && styles.dropdownBoxBad]}
              onPress={() => setShowAreaPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={area ? styles.dropdownVal : styles.dropdownPlaceholder}>
                {areaLabel || area || (areaOptions.length === 0 ? 'No areas available' : 'Select area')}
              </Text>
              <Feather name="chevron-down" size={18} color={Colors.primary} />
            </TouchableOpacity>
            {errors.area ? <Text style={styles.errText}>{errors.area}</Text> : null}
          </View>

          {/* 4. Field: Sub-Area */}
          <View style={styles.fld}>
            <Text style={styles.label}>Sub-Area</Text>
            <TextInput
              style={styles.input}
              placeholder="Subarea"
              placeholderTextColor={Colors.placeholder}
              value={subArea}
              onChangeText={setSubArea}
            />
          </View>

          {/* 5. Field: Job Details */}
          <View style={styles.fld}>
            <Text style={styles.label}>
              Job Details <Text style={styles.req}>*</Text>
            </Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.details && styles.inputBad]}
              placeholder="Enter job detail"
              placeholderTextColor={Colors.placeholder}
              value={details}
              onChangeText={(t) => {
                setDetails(t);
                setErrors((p) => ({ ...p, details: '' }));
              }}
              multiline
              numberOfLines={3}
            />
            {errors.details ? <Text style={styles.errText}>{errors.details}</Text> : null}
          </View>

          {/* CONDITIONAL FIELDS 6 & 7 (Shown ONLY when !isSuperAdmin and issuedTo === userCurrentTeamId) */}
          {showAssignmentFields && (
            <View style={styles.assignmentWrap}>
              <View style={styles.assignBadgePill}>
                <Feather name="user-check" size={13} color={Colors.primary} />
                <Text style={styles.assignBadgeText}>
                  Department Assignment ({primaryTeamName || issuedToLabel})
                </Text>
              </View>

              {/* 6. Field: Assign (Dept.) */}
              <View style={styles.fldInner}>
                <Text style={styles.labelSmall}>Assign (Dept.)</Text>
                <TouchableOpacity
                  style={styles.dropdownBoxInner}
                  onPress={() => setShowSubTeamPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={
                      assignedSubTeam ? styles.dropdownVal : styles.dropdownPlaceholder
                    }
                  >
                    {assignedSubTeamLabel || assignedSubTeam || 'Select Sub-Team'}
                  </Text>
                  <Feather name="chevron-down" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {/* 7. Field: Assign (Supervisor) */}
              <View style={styles.fldInner}>
                <Text style={styles.labelSmall}>Assign (Supervisor)</Text>
                <TouchableOpacity
                  style={styles.dropdownBoxInner}
                  onPress={() => setShowSupervisorPicker(true)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={
                      assignedSupervisor ? styles.dropdownVal : styles.dropdownPlaceholder
                    }
                  >
                    {assignedSupervisorLabel ||
                      assignedSupervisor ||
                      '-- Select Member / Supervisor --'}
                  </Text>
                  <Feather name="chevron-down" size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>

              {subTeamWarning ? (
                <Text style={styles.warningText}>{subTeamWarning}</Text>
              ) : null}
            </View>
          )}

          {/* 8. Field: Photo (Size Limit: 5MB) */}
          <View style={styles.fld}>
            <Text style={styles.label}>Photo (Size Limit: 5MB)</Text>
            {photoUri ? (
              <View style={styles.photoPreviewWrap}>
                <Image source={{ uri: photoUri }} style={styles.previewImage} />
                <View style={styles.photoActionsCol}>
                  <Text style={styles.photoAttachedText}>Media attached &middot; max 5MB</Text>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => setPhotoUri(null)}
                  >
                    <Feather name="trash-2" size={12} color="#FFFFFF" />
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.dropArea}>
                <TouchableOpacity
                  style={styles.dropButton}
                  onPress={() => pickImage(true)}
                  activeOpacity={0.8}
                >
                  <Feather name="camera" size={20} color={Colors.primary} />
                  <Text style={styles.dropBtnText}>Take Photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dropButton}
                  onPress={() => pickImage(false)}
                  activeOpacity={0.8}
                >
                  <Feather name="upload-cloud" size={20} color={Colors.primary} />
                  <Text style={styles.dropBtnText}>Upload File</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={styles.photoHintText}>
              Click to upload photo or video &middot; max 5MB
            </Text>
          </View>

          {/* Submit & Cancel Buttons */}
          <View style={styles.btnsRow}>
            <TouchableOpacity
              style={styles.btnCancel}
              onPress={onCancel}
              disabled={isSubmitting}
            >
              <Text style={styles.btnCancelText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSubmit}
              onPress={validateAndSubmit}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.btnSubmitText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* No Photo Confirmation Modal (Exact match to workwize-teal #noPhotoModal) */}
      <Modal visible={showNoPhotoModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.noPhotoDialog}>
            <View style={styles.noPhotoHead}>
              <Text style={styles.noPhotoTitle}>No Image Attached</Text>
              <TouchableOpacity
                onPress={() => setShowNoPhotoModal(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={Colors.muted} />
              </TouchableOpacity>
            </View>
            <Text style={styles.noPhotoPrompt}>
              Do you want to continue without job image?
            </Text>
            <Text style={styles.noPhotoDesc}>
              You have not attached any photo or video for this job.
            </Text>
            <View style={styles.noPhotoBtns}>
              <TouchableOpacity
                style={styles.btnModalSec}
                onPress={() => setShowNoPhotoModal(false)}
              >
                <Text style={styles.btnModalSecText}>Cancel / Add Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnModalPri}
                onPress={executeSubmission}
              >
                <Text style={styles.btnModalPriText}>Continue &amp; Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dropdown Modals */}
      <DropdownModal
        visible={showDeptPicker}
        title="Select Department"
        options={teamOptions}
        selectedValue={issuedTo}
        onSelect={handleDeptSelect}
        onClose={() => setShowDeptPicker(false)}
        placeholder="Search department..."
      />

      <DropdownModal
        visible={showAreaPicker}
        title="Select Area"
        options={areaOptions}
        selectedValue={area}
        onSelect={handleAreaSelect}
        onClose={() => setShowAreaPicker(false)}
        placeholder="Search area..."
      />

      <DropdownModal
        visible={showSubTeamPicker}
        title="Assign (Dept. / Sub-Team)"
        options={subTeamOptions}
        selectedValue={assignedSubTeam}
        onSelect={handleSubTeamSelect}
        onClose={() => setShowSubTeamPicker(false)}
        placeholder="Search sub-team..."
      />

      <DropdownModal
        visible={showSupervisorPicker}
        title="Assign (Supervisor / Member)"
        options={supervisorOptions}
        selectedValue={assignedSupervisor}
        onSelect={handleSupervisorSelect}
        onClose={() => setShowSupervisorPicker(false)}
        placeholder="Search member..."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 110,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.line,
    padding: 18,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardHeading: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 4,
  },
  cardSubheading: {
    fontSize: 13,
    color: Colors.muted,
  },
  propHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  fld: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 6,
  },
  req: {
    color: Colors.red,
  },
  input: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    fontSize: 14,
    color: Colors.ink,
  },
  inputReadonly: {
    backgroundColor: '#F3F6FD',
    color: '#4B5563',
    fontWeight: '600',
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  inputBad: {
    borderColor: Colors.red,
  },
  dropdownBox: {
    backgroundColor: Colors.bgInput,
    borderWidth: 1.5,
    borderColor: Colors.line,
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownBoxBad: {
    borderColor: Colors.red,
  },
  dropdownVal: {
    fontSize: 14,
    color: Colors.ink,
    fontWeight: '600',
    flex: 1,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: Colors.placeholder,
    flex: 1,
  },
  errText: {
    color: Colors.red,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  assignmentWrap: {
    backgroundColor: '#F6F8FE',
    borderWidth: 1.5,
    borderColor: '#D8E2FC',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  assignBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F0FE',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 12,
  },
  assignBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
  fldInner: {
    marginBottom: 12,
  },
  labelSmall: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.ink,
    marginBottom: 5,
  },
  dropdownBoxInner: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  warningText: {
    color: Colors.red,
    fontSize: 12,
    marginTop: 6,
    fontWeight: '600',
  },
  dropArea: {
    flexDirection: 'row',
    gap: 12,
  },
  dropButton: {
    flex: 1,
    height: 54,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  dropBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  photoHintText: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 6,
  },
  photoPreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.line,
    borderRadius: 10,
    backgroundColor: '#F9FAFB',
  },
  previewImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  photoActionsCol: {
    flex: 1,
  },
  photoAttachedText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.greenDark,
    marginBottom: 6,
  },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.red,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  removeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  btnsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  btnCancel: {
    flex: 1,
    height: 46,
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ink,
  },
  btnSubmit: {
    flex: 2,
    height: 46,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  btnSubmitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  /* Modal Confirmation Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: Colors.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noPhotoDialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  noPhotoHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  noPhotoTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
  },
  noPhotoPrompt: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ink,
    marginBottom: 6,
  },
  noPhotoDesc: {
    fontSize: 12.5,
    color: Colors.muted,
    marginBottom: 20,
  },
  noPhotoBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  btnModalSec: {
    flex: 1,
    height: 42,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnModalSecText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.ink,
  },
  btnModalPri: {
    flex: 1,
    height: 42,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnModalPriText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
