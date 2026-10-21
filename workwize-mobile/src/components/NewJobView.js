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
import { isSuperAdmin, getIssuedByDisplay, cleanIssuedBy, DailyJobApi } from '../api/dailyJobApi';

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
  onSelectFilter,
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
  const [subAreaLabel, setSubAreaLabel] = useState('');
  const [details, setDetails] = useState('');

  // 2 Dynamic Conditional Fields
  const [assignedSubTeam, setAssignedSubTeam] = useState('');
  const [assignedSubTeamLabel, setAssignedSubTeamLabel] = useState('');
  const [assignedSupervisor, setAssignedSupervisor] = useState('');
  const [assignedSupervisorLabel, setAssignedSupervisorLabel] = useState('');

  // Picker Modals Visibility
  const [showDeptPicker, setShowDeptPicker] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [showSubAreaPicker, setShowSubAreaPicker] = useState(false);
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

  // Dynamic Dashboard Stats from API (Matching workwize-teal #periodStatBoxes & #agingStatBoxes)
  const [dashboardStats, setDashboardStats] = useState(null);
  const [statsPeriod, setStatsPeriod] = useState('today'); // 'today' | 'weekly' | 'monthly'

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (currentPropertyId) {
        try {
          const res = await DailyJobApi.getDashboardStats(currentPropertyId);
          if (isMounted && res) {
            setDashboardStats(res.data || res);
          }
        } catch (e) {
          console.warn('Dashboard stats fetch in NewJobView:', e);
        }
      }
    })();
    return () => { isMounted = false; };
  }, [currentPropertyId]);

  const activeStats = useMemo(() => {
    if (dashboardStats) {
      let root = dashboardStats.data && dashboardStats.data.today ? dashboardStats.data : dashboardStats;
      const pData = root[statsPeriod] || root.today || {};
      const aging = root.aging || root.agingOverOneWeek || {};
      return {
        total: pData.total != null ? pData.total : 0,
        open: pData.open != null ? pData.open : 0,
        assigned: pData.assigned != null ? pData.assigned : 0,
        inProgress: pData.inProgress != null ? pData.inProgress : 0,
        closed: pData.closed != null ? pData.closed : 0,
        todayCount: root.today ? (root.today.total != null ? root.today.total : 0) : 0,
        weeklyCount: root.weekly ? (root.weekly.total != null ? root.weekly.total : 0) : 0,
        monthlyCount: root.monthly ? (root.monthly.total != null ? root.monthly.total : 0) : 0,
        agingOpen: aging.open != null ? aging.open : 0,
        agingAssigned: aging.assigned != null ? aging.assigned : 0,
        agingInProgress: aging.inProgress != null ? aging.inProgress : 0,
      };
    }

    // Local calculation fallback if offline
    const now = new Date();
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    const filtered = (jobs || []).filter((j) => {
      const d = new Date(j.opened || j.createdAt || now).getTime();
      if (isNaN(d)) return true;
      if (statsPeriod === 'today') {
        const jd = new Date(d);
        return (
          jd.getDate() === now.getDate() &&
          jd.getMonth() === now.getMonth() &&
          jd.getFullYear() === now.getFullYear()
        );
      } else if (statsPeriod === 'weekly') {
        return d >= oneWeekAgo;
      }
      return d >= thirtyDaysAgo;
    });

    return {
      total: filtered.length,
      open: filtered.filter((j) => (j.status || '').toLowerCase() === 'open').length,
      assigned: filtered.filter((j) => (j.status || '').toLowerCase() === 'assigned').length,
      inProgress: filtered.filter((j) => (j.status || '').toLowerCase().includes('progress')).length,
      closed: filtered.filter((j) => (j.status || '').toLowerCase() === 'closed').length,
      todayCount: (jobs || []).filter((j) => {
        const jd = new Date(j.opened || j.createdAt || now);
        return jd.getDate() === now.getDate() && jd.getMonth() === now.getMonth() && jd.getFullYear() === now.getFullYear();
      }).length,
      weeklyCount: (jobs || []).filter((j) => new Date(j.opened || j.createdAt || now).getTime() >= oneWeekAgo).length,
      monthlyCount: (jobs || []).filter((j) => new Date(j.opened || j.createdAt || now).getTime() >= thirtyDaysAgo).length,
      agingOpen: (jobs || []).filter((j) => (j.status || '').toLowerCase() === 'open' && new Date(j.opened || j.createdAt || now).getTime() < oneWeekAgo).length,
      agingAssigned: (jobs || []).filter((j) => (j.status || '').toLowerCase() === 'assigned' && new Date(j.opened || j.createdAt || now).getTime() < oneWeekAgo).length,
      agingInProgress: (jobs || []).filter((j) => (j.status || '').toLowerCase().includes('progress') && new Date(j.opened || j.createdAt || now).getTime() < oneWeekAgo).length,
    };
  }, [dashboardStats, statsPeriod, jobs]);

  const handleStatCardClick = (statusFilter) => {
    if (onSelectFilter) {
      onSelectFilter(statusFilter);
    }
  };


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
      return cachedAreas.map((a) => {
        const aName = a.areaName || a.name || String(a.areaId || a.areaid || '');
        const aId = a.areaId || a.areaid || aName;
        return {
          id: String(aId),
          label: aName,
          value: String(aId),
          areaName: aName,
          areaObj: a,
        };
      });
    }
    return [];
  }, [cachedAreas]);

  // Selected area object
  const currentAreaObj = useMemo(() => {
    if (!area && !areaLabel) return null;
    return (
      (cachedAreas || []).find(
        (a) =>
          String(a.areaId || a.areaid) === String(area) ||
          String(a.areaName || a.name).toLowerCase() === String(areaLabel || area).toLowerCase()
      ) || null
    );
  }, [area, areaLabel, cachedAreas]);

  // Dynamic Sub-Area Options (from propsubarea, existing jobs, or common defaults)
  const subAreaOptions = useMemo(() => {
    const list = [];
    const set = new Set();

    // 1. From current area's propsubarea array
    if (currentAreaObj) {
      const subs = currentAreaObj.propsubarea || currentAreaObj.subareas || currentAreaObj.subArea || [];
      if (Array.isArray(subs)) {
        subs.forEach((s) => {
          const name = typeof s === 'string' ? s : (s.subareaName || s.subAreaName || s.name || s.subareaId || s.subarea);
          const id = typeof s === 'string' ? s : (s.subareaId || s.id || name);
          if (name && !set.has(name.toLowerCase())) {
            set.add(name.toLowerCase());
            list.push({ id: String(id), label: name, value: name });
          }
        });
      }
    }

    // 2. From existing jobs under this area
    if (jobs && jobs.length > 0) {
      const targetAreaName = (areaLabel || area || '').toLowerCase();
      jobs.forEach((j) => {
        const jArea = String(j.area || '').toLowerCase();
        if ((!targetAreaName || jArea === targetAreaName) && j.sub && typeof j.sub === 'string') {
          const sName = j.sub.trim();
          if (sName && sName !== 'NA' && sName !== 'na' && !set.has(sName.toLowerCase())) {
            set.add(sName.toLowerCase());
            list.push({ id: sName, label: sName, value: sName });
          }
        }
      });
    }

    // 3. Fallback defaults if none configured yet
    if (list.length === 0) {
      const defaults = ['General Area', 'Room 101', 'Room 102', 'Lobby', 'Ground Floor', 'First Floor', 'Kitchen', 'Corridor', 'Washroom'];
      defaults.forEach((d) => {
        list.push({ id: d, label: d, value: d });
      });
    }

    return list;
  }, [currentAreaObj, area, areaLabel, jobs]);

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
        setSubAreaLabel('');
      }
    } else {
      setArea('');
      setAreaLabel('');
      setSubArea('');
      setSubAreaLabel('');
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
    const chosenName = areaItem?.areaName || areaItem?.label || areaVal;
    const chosenId = areaItem?.value || areaItem?.id || areaVal;
    setArea(chosenId);
    setAreaLabel(chosenName);
    setErrors((prev) => ({ ...prev, area: '' }));
    setSubArea('');
    setSubAreaLabel('');
  };

  const handleSubAreaSelect = (subVal, subItem) => {
    const chosenName = subItem?.label || subVal;
    setSubArea(chosenName);
    setSubAreaLabel(chosenName);
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
    const chosenAreaName = areaLabel || area;
    const chosenDeptName = issuedToLabel || issuedTo;
    const chosenSubName = (subAreaLabel || subArea || '').trim();

    try {
      await onSubmit({
        dept: chosenDeptName,
        deptId: issuedTo,
        issued_to_team: issuedTo,
        issued_to_team_name: chosenDeptName,
        area: chosenAreaName,
        areaName: chosenAreaName,
        areaId: area,
        areaID: area,
        sub: chosenSubName,
        subarea: chosenSubName,
        subareaId: chosenSubName,
        details: details.trim(),
        job_detail: details.trim(),
        by: cleanIssuedBy(issuedBy),
        creator_name: cleanIssuedBy(issuedBy),
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
      setSubAreaLabel('');
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
              value={cleanIssuedBy(issuedBy)}
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
              <Text style={areaLabel || area ? styles.dropdownVal : styles.dropdownPlaceholder}>
                {areaLabel || (areaOptions.length === 0 ? 'No areas available' : 'Select area')}
              </Text>
              <Feather name="chevron-down" size={18} color={Colors.primary} />
            </TouchableOpacity>
            {errors.area ? <Text style={styles.errText}>{errors.area}</Text> : null}
          </View>

          {/* 4. Field: Sub-Area (Styled exactly like Area dropdown) */}
          <View style={styles.fld}>
            <Text style={styles.label}>Sub-Area</Text>
            <TouchableOpacity
              style={styles.dropdownBox}
              onPress={() => setShowSubAreaPicker(true)}
              activeOpacity={0.8}
            >
              <Text style={subAreaLabel || subArea ? styles.dropdownVal : styles.dropdownPlaceholder}>
                {subAreaLabel || subArea || 'Select or enter subarea'}
              </Text>
              <Feather name="chevron-down" size={18} color={Colors.primary} />
            </TouchableOpacity>
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

        {/* ================= Job Statistics & Aging of Jobs (Exact match to workwize-teal) ================= */}
        <View style={styles.statsCard}>
          <View style={styles.statsTopBar}>
            <View>
              <Text style={styles.statsHeading}>Job Statistics</Text>
              <Text style={styles.statsSubHeading}>
                Property: <Text style={styles.propNameText}>{currentPropertyName}</Text>
              </Text>
            </View>

            {/* Period selector tabs: Today, Weekly, Monthly */}
            <View style={styles.statPeriodTabs}>
              <TouchableOpacity
                style={[styles.ptab, statsPeriod === 'today' && styles.ptabActive]}
                onPress={() => setStatsPeriod('today')}
                activeOpacity={0.8}
              >
                <Text style={[styles.ptabText, statsPeriod === 'today' && styles.ptabTextActive]}>
                  Today {activeStats.todayCount > 0 ? `(${activeStats.todayCount})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ptab, statsPeriod === 'weekly' && styles.ptabActive]}
                onPress={() => setStatsPeriod('weekly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.ptabText, statsPeriod === 'weekly' && styles.ptabTextActive]}>
                  Weekly {activeStats.weeklyCount > 0 ? `(${activeStats.weeklyCount})` : ''}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ptab, statsPeriod === 'monthly' && styles.ptabActive]}
                onPress={() => setStatsPeriod('monthly')}
                activeOpacity={0.8}
              >
                <Text style={[styles.ptabText, statsPeriod === 'monthly' && styles.ptabTextActive]}>
                  Monthly {activeStats.monthlyCount > 0 ? `(${activeStats.monthlyCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Metric Boxes Grid: Total, Open, Assigned, In-Progress, Closed */}
          <View style={styles.metricGrid}>
            <TouchableOpacity
              style={[styles.mBox, styles.mBoxTotal]}
              onPress={() => handleStatCardClick('all')}
              activeOpacity={0.8}
            >
              <View style={[styles.mIconWrap, { backgroundColor: '#EEF2FF' }]}>
                <Feather name="briefcase" size={16} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.mLabel}>TOTAL</Text>
                <Text style={styles.mNum}>{activeStats.total}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mBox, styles.mBoxOpen]}
              onPress={() => handleStatCardClick('Open')}
              activeOpacity={0.8}
            >
              <View style={[styles.mIconWrap, { backgroundColor: '#FEF3C7' }]}>
                <Feather name="clock" size={16} color={Colors.amberDark} />
              </View>
              <View>
                <Text style={styles.mLabel}>OPEN</Text>
                <Text style={[styles.mNum, { color: Colors.amberDark }]}>{activeStats.open}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mBox, styles.mBoxAssigned]}
              onPress={() => handleStatCardClick('Assigned')}
              activeOpacity={0.8}
            >
              <View style={[styles.mIconWrap, { backgroundColor: '#E0E7FF' }]}>
                <Feather name="user-check" size={16} color="#4338CA" />
              </View>
              <View>
                <Text style={styles.mLabel}>ASSIGNED</Text>
                <Text style={[styles.mNum, { color: '#4338CA' }]}>{activeStats.assigned}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mBox, styles.mBoxInProgress]}
              onPress={() => handleStatCardClick('In-Progress')}
              activeOpacity={0.8}
            >
              <View style={[styles.mIconWrap, { backgroundColor: '#EDE9FE' }]}>
                <Feather name="play-circle" size={16} color={Colors.progressDark} />
              </View>
              <View>
                <Text style={styles.mLabel}>IN PROGRESS</Text>
                <Text style={[styles.mNum, { color: Colors.progressDark }]}>{activeStats.inProgress}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mBox, styles.mBoxClosed]}
              onPress={() => handleStatCardClick('Closed')}
              activeOpacity={0.8}
            >
              <View style={[styles.mIconWrap, { backgroundColor: '#DCFCE7' }]}>
                <Feather name="check-circle" size={16} color={Colors.greenDark} />
              </View>
              <View>
                <Text style={styles.mLabel}>CLOSED</Text>
                <Text style={[styles.mNum, { color: Colors.greenDark }]}>{activeStats.closed}</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Aging of Jobs Section (> 7 Days Old) */}
          <View style={styles.agingSection}>
            <View style={styles.agingHeader}>
              <View style={styles.agingTitleRow}>
                <Feather name="alert-circle" size={15} color={Colors.red} />
                <Text style={styles.agingTitle}>Aging of Jobs</Text>
              </View>
              <View style={styles.agingBadge}>
                <Text style={styles.agingBadgeText}>&gt; 7 Days Old</Text>
              </View>
            </View>

            <View style={styles.agingRow}>
              <TouchableOpacity
                style={styles.agingBox}
                onPress={() => handleStatCardClick('Open')}
                activeOpacity={0.8}
              >
                <Text style={styles.agingBoxLabel}>OPEN</Text>
                <Text style={[styles.agingBoxNum, { color: Colors.amberDark }]}>
                  {activeStats.agingOpen}
                </Text>
                <Text style={styles.agingBoxSub}>&gt; 7 days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.agingBox}
                onPress={() => handleStatCardClick('Assigned')}
                activeOpacity={0.8}
              >
                <Text style={styles.agingBoxLabel}>ASSIGNED</Text>
                <Text style={[styles.agingBoxNum, { color: '#4338CA' }]}>
                  {activeStats.agingAssigned}
                </Text>
                <Text style={styles.agingBoxSub}>&gt; 7 days</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.agingBox}
                onPress={() => handleStatCardClick('In-Progress')}
                activeOpacity={0.8}
              >
                <Text style={styles.agingBoxLabel}>IN-PROGRESS</Text>
                <Text style={[styles.agingBoxNum, { color: Colors.progressDark }]}>
                  {activeStats.agingInProgress}
                </Text>
                <Text style={styles.agingBoxSub}>&gt; 7 days</Text>
              </TouchableOpacity>
            </View>
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
        allowCustom={true}
      />

      <DropdownModal
        visible={showSubAreaPicker}
        title="Select Sub-Area"
        options={subAreaOptions}
        selectedValue={subArea}
        onSelect={handleSubAreaSelect}
        onClose={() => setShowSubAreaPicker(false)}
        placeholder="Search or enter custom subarea..."
        allowCustom={true}
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
  /* Stats Card in NewJobView */
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.line,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statsTopBar: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 14,
  },
  statsHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
  },
  statsSubHeading: {
    fontSize: 12,
    color: Colors.muted,
    marginTop: 2,
  },
  propNameText: {
    fontWeight: '700',
    color: Colors.primaryDeep,
  },
  statPeriodTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  ptab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ptabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ptabText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: Colors.muted,
  },
  ptabTextActive: {
    fontWeight: '800',
    color: Colors.primaryDeep,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  mBox: {
    flexBasis: '48%',
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  mBoxTotal: {
    backgroundColor: '#F8FAFC',
  },
  mBoxOpen: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FEF3C7',
  },
  mBoxAssigned: {
    backgroundColor: '#EEF2FF',
    borderColor: '#E0E7FF',
  },
  mBoxInProgress: {
    backgroundColor: '#F5F3FF',
    borderColor: '#EDE9FE',
  },
  mBoxClosed: {
    backgroundColor: '#F0FDF4',
    borderColor: '#DCFCE7',
  },
  mIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    textTransform: 'uppercase',
  },
  mNum: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.ink,
    marginTop: 1,
  },
  agingSection: {
    backgroundColor: '#FFF1F2',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFE4E6',
  },
  agingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  agingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  agingTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
  },
  agingBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  agingBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991B1B',
  },
  agingRow: {
    flexDirection: 'row',
    gap: 8,
  },
  agingBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FECDD3',
  },
  agingBoxLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: Colors.muted,
    marginBottom: 2,
  },
  agingBoxNum: {
    fontSize: 15,
    fontWeight: '800',
  },
  agingBoxSub: {
    fontSize: 9,
    color: Colors.muted,
    marginTop: 2,
  },

});