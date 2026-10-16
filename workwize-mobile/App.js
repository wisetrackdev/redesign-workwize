import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Colors } from './src/theme/colors';
import Header from './src/components/Header';
import TabBar from './src/components/TabBar';
import JobCard from './src/components/JobCard';
import NewJobView from './src/components/NewJobView';
import FilterModal from './src/components/FilterModal';
import ViewJobModal from './src/components/ViewJobModal';
import AssignModal from './src/components/AssignModal';
import CloseJobModal from './src/components/CloseJobModal';
import EditJobModal from './src/components/EditJobModal';
import DeleteJobModal from './src/components/DeleteJobModal';
import ProfileModal from './src/components/ProfileModal';
import StatsModal from './src/components/StatsModal';
import StatsView from './src/components/StatsView';
import LoginScreen from './src/components/LoginScreen';
import DropdownModal from './src/components/DropdownModal';

import {
  DailyJobApi,
  isSuperAdmin,
  isAdmin,
  updateUserTeamContext,
  getJobDateCode,
  pad3,
} from './src/api/dailyJobApi';
import { getStoredUserData, clearStoredUserData } from './src/api/config';
import initialJobsData from './src/data/jobs_data.json';

export default function App() {
  // Authentication State
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Master Properties State (Matching quickfix architecture)
  const [allProperties, setAllProperties] = useState([
    { propId: 'Testing', propName: 'Testing' },
  ]);
  const [currentPropertyId, setCurrentPropertyId] = useState('Testing');

  // Cached API Data from getallquickfixjobs
  const [cachedTeams, setCachedTeams] = useState([]);
  const [cachedAreas, setCachedAreas] = useState([]);
  const [cachedUserTeams, setCachedUserTeams] = useState([]);

  // Master Jobs State (Synchronized with active property)
  const [jobs, setJobs] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Navigation: 'new' | 'open' | 'closed'
  const [activeTab, setActiveTab] = useState('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [pillFilter, setPillFilter] = useState('all'); // 'all' | 'in-progress' | 'assigned' | 'open'

  const [filterState, setFilterState] = useState({
    status: 'all',
    area: 'all',
    issuedTo: 'all',
    issuedBy: 'all',
    assignedTo: 'all',
    sort: 'new',
    fromDate: '',
    toDate: '',
  });

  // Modals Visibility
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showPropertyPickerModal, setShowPropertyPickerModal] = useState(false);

  // Selected Jobs for Modals
  const [selectedJob, setSelectedJob] = useState(null);
  const [selectedJobForEdit, setSelectedJobForEdit] = useState(null);
  const [selectedJobForDelete, setSelectedJobForDelete] = useState(null);

  // Check stored user & load properties on startup
  useEffect(() => {
    (async () => {
      try {
        const storedUser = await getStoredUserData();
        if (storedUser && storedUser.jwt && !storedUser.jwt.startsWith('demo-')) {
          try {
            const props = await DailyJobApi.getAllProperties();
            if (Array.isArray(props) && props.length > 0) {
              setAllProperties(props);

              const targetPropId =
                storedUser?.prop && props.some((p) => String(p.propId) === String(storedUser.prop))
                  ? storedUser.prop
                  : props[0].propId || props[0].name || 'Testing';

              setCurrentPropertyId(targetPropId);
            }
            setCurrentUser(storedUser);
            setIsLoggedIn(true);
          } catch (err) {
            console.log('Stored session expired or unauthorized. Showing Login screen.');
            await clearStoredUserData();
            setCurrentUser(null);
            setIsLoggedIn(false);
          }
        } else {
          await clearStoredUserData();
          setCurrentUser(null);
          setIsLoggedIn(false);
        }
      } catch (e) {
        setIsLoggedIn(false);
      }
    })();
  }, []);

  // Compute active user team context matching workwize-teal
  const userTeamContext = useMemo(() => {
    return updateUserTeamContext(currentUser, cachedTeams, cachedUserTeams);
  }, [currentUser, cachedTeams, cachedUserTeams]);

  // Find active property name for display in Header & modals
  const activePropertyObj = useMemo(() => {
    return (
      allProperties.find(
        (p) =>
          String(p.propId || p.id) === String(currentPropertyId) ||
          String(p.propName || p.name) === String(currentPropertyId)
      ) || null
    );
  }, [allProperties, currentPropertyId]);

  const currentPropertyName =
    activePropertyObj?.propName || activePropertyObj?.name || currentPropertyId || 'Testing';

  // Role-Based Property List Filter:
  // EXACT rule from workwize-teal renderPropertySelector:
  // If SuperAdmin / OproAdmin (or it@workwise.in): Show ALL properties from API
  // If other user: Show ONLY their assigned property (currentUser.prop)
  const visibleProperties = useMemo(() => {
    if (isSuperAdmin(currentUser)) {
      return allProperties;
    }
    const userProp = currentUser?.prop;
    if (userProp && Array.isArray(allProperties)) {
      const match = allProperties.find(
        (p) =>
          String(p.propId || p.id) === String(userProp) ||
          String(p.propName || p.name) === String(userProp)
      );
      if (match) return [match];
    }
    return allProperties.length > 0 ? [allProperties[0]] : [];
  }, [allProperties, currentUser]);

  // Formatted property options for direct DropdownModal
  const propertyDropdownItems = useMemo(() => {
    return visibleProperties.map((p) => ({
      id: p.propId || p.id || p.propName,
      label: p.propName || p.name || String(p.propId),
      value: p.propId || p.id || p.propName,
      sublabel: p.propId ? `Property ID: ${p.propId}` : undefined,
    }));
  }, [visibleProperties]);

  // Sync Jobs, Teams, and Areas from API matching workwize-teal fetchAllJobsFromApi
  const fetchJobs = useCallback(
    async (targetPropId) => {
      setIsRefreshing(true);
      const activeProp = targetPropId || currentPropertyId || 'Testing';
      try {
        const res = await DailyJobApi.getQuickFixJobs({
          propId: activeProp,
          propName: currentPropertyName,
        });

        if (res) {
          if (res.teams && res.teams.length > 0) {
            setCachedTeams(res.teams);
          }
          if (res.areas && res.areas.length > 0) {
            setCachedAreas(res.areas);
          }
          if (res.userTeam && res.userTeam.length > 0) {
            setCachedUserTeams(res.userTeam);
          }

          const openList = Array.isArray(res.openJobs) ? res.openJobs : [];
          const closeList = Array.isArray(res.closedJobs) ? res.closedJobs : [];
          const combined = [...openList, ...closeList];

          setJobs(combined);
        }
      } catch (e) {
        console.warn('Sync completed with local cache:', e);
      } finally {
        setIsRefreshing(false);
      }
    },
    [currentPropertyId, currentPropertyName]
  );

  // Load jobs when user is logged in and property changes
  useEffect(() => {
    if (isLoggedIn && currentPropertyId) {
      fetchJobs(currentPropertyId);
    }
  }, [isLoggedIn, currentPropertyId]);

  // Login Handlers
  const handleLoginSuccess = async (username, password) => {
    const user = await DailyJobApi.login(username, password);
    setCurrentUser(user);
    setIsLoggedIn(true);

    try {
      const props = await DailyJobApi.getAllProperties();
      if (Array.isArray(props) && props.length > 0) {
        setAllProperties(props);

        // If regular user has assigned prop in props, pick it; else default to first
        let targetPropId = props[0].propId || props[0].name;
        if (user.prop && props.some((p) => String(p.propId) === String(user.prop))) {
          targetPropId = user.prop;
        }

        setCurrentPropertyId(targetPropId);
        fetchJobs(targetPropId);
        return;
      }
    } catch (e) {
      console.warn('Could not load properties on login:', e);
    }

    fetchJobs(currentPropertyId);
  };

  const handleLogout = async () => {
    await clearStoredUserData();
    setCurrentUser(null);
    setIsLoggedIn(false);
    setShowProfileModal(false);
    setShowPropertyPickerModal(false);
  };

  // Switch Property Handler (matching workwize-teal renderPropertySelector opt.click)
  const handleSelectProperty = (propItem) => {
    const propId = propItem.value || propItem.propId || propItem.id || String(propItem);
    const propName = propItem.label || propItem.propName || propItem.name || propId;
    setCurrentPropertyId(propId);
    setShowPropertyPickerModal(false);
    fetchJobs(propId);
    Alert.alert('Property Switched', `Active property: ${propName}`);
  };

  // Distinct Filter Lists
  const areaList = useMemo(() => {
    if (cachedAreas && cachedAreas.length > 0) {
      return cachedAreas.map((a) => a.areaName || a.areaId).sort();
    }
    const set = new Set();
    jobs.forEach((j) => {
      if (j.area) set.add(j.area);
    });
    return Array.from(set).sort();
  }, [cachedAreas, jobs]);

  const teamList = useMemo(() => {
    if (cachedTeams && cachedTeams.length > 0) {
      return cachedTeams.map((t) => t.teamName || t.teamId).sort();
    }
    const set = new Set();
    jobs.forEach((j) => {
      if (j.dept) set.add(j.dept);
      if (j.issued_to_team) set.add(j.issued_to_team);
    });
    return Array.from(set).sort();
  }, [cachedTeams, jobs]);

  // Distinct Issued By list matching QuickFix
  const issuedByList = useMemo(() => {
    const set = new Set();
    jobs.forEach((j) => {
      const val =
        (j.raw && j.raw.issued_by_team_details) ||
        j.issued_by_team_details ||
        j.by ||
        j.creator_name;
      if (val && typeof val === 'string') {
        const str = val.trim();
        if (
          str &&
          str !== 'Select Issued By' &&
          str !== 'NA' &&
          str !== 'na' &&
          str.toLowerCase() !== 'null' &&
          str.toLowerCase() !== 'undefined'
        ) {
          set.add(str);
        }
      }
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Distinct Assign To list
  const assignToList = useMemo(() => {
    const set = new Set();
    jobs.forEach((j) => {
      const val = j.assigned;
      if (val && typeof val === 'string') {
        const str = val.trim();
        if (
          str &&
          str !== 'NA' &&
          str !== 'na' &&
          str !== 'Unassigned' &&
          str !== 'Not assigned' &&
          str.toLowerCase() !== 'null' &&
          str.toLowerCase() !== 'undefined'
        ) {
          set.add(str);
        }
      }
    });
    return Array.from(set).sort();
  }, [jobs]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return (
      filterState.status !== 'all' ||
      filterState.area !== 'all' ||
      filterState.issuedTo !== 'all' ||
      (filterState.issuedBy && filterState.issuedBy !== 'all') ||
      (filterState.assignedTo && filterState.assignedTo !== 'all') ||
      !!filterState.fromDate ||
      !!filterState.toDate ||
      filterState.sort !== 'new'
    );
  }, [filterState]);

  // Counts
  const openCount = useMemo(() => {
    return jobs.filter((j) => (j.status || '').toLowerCase() !== 'closed').length;
  }, [jobs]);

  const closedCount = useMemo(() => {
    return jobs.filter((j) => (j.status || '').toLowerCase() === 'closed').length;
  }, [jobs]);

  // Filtered and Sorted Jobs
  const displayedJobs = useMemo(() => {
    return jobs
      .filter((job) => {
        const isJobClosed = (job.status || '').toLowerCase() === 'closed';

        if (activeTab === 'open' && isJobClosed) return false;
        if (activeTab === 'closed' && !isJobClosed) return false;

        // Pill filter
        if (pillFilter !== 'all') {
          const st = (job.status || '').toLowerCase();
          if (pillFilter === 'in-progress' && !st.includes('progress')) return false;
          if (pillFilter === 'assigned' && st !== 'assigned') return false;
          if (pillFilter === 'open' && st !== 'open') return false;
        }

        // Drawer Filters: Status
        if (filterState.status !== 'all') {
          const st = (job.status || '').toLowerCase();
          if (filterState.status === 'In-Progress' && !st.includes('progress')) return false;
          if (filterState.status.toLowerCase() !== st) return false;
        }

        // Drawer Filters: Area
        if (filterState.area !== 'all' && job.area !== filterState.area) {
          return false;
        }

        // Drawer Filters: Issued To
        if (
          filterState.issuedTo !== 'all' &&
          job.dept !== filterState.issuedTo &&
          job.issued_to_team !== filterState.issuedTo
        ) {
          return false;
        }

        // Drawer Filters: Issued By
        if (filterState.issuedBy && filterState.issuedBy !== 'all') {
          const selBy = filterState.issuedBy.trim().toLowerCase();
          const jBy = (job.by || '').trim().toLowerCase();
          const jCreator = (job.creator_name || '').trim().toLowerCase();
          const jDetails = (
            (job.raw && job.raw.issued_by_team_details) ||
            job.issued_by_team_details ||
            ''
          ).trim().toLowerCase();

          if (jBy !== selBy && jCreator !== selBy && jDetails !== selBy) {
            return false;
          }
        }

        // Drawer Filters: Assign To
        if (filterState.assignedTo && filterState.assignedTo !== 'all') {
          if (filterState.assignedTo === '__unassigned__') {
            const asg = (job.assigned || '').trim();
            if (asg && asg !== 'NA' && asg !== 'na' && asg !== 'Not assigned' && asg !== 'Unassigned') {
              return false;
            }
          } else {
            const asg = (job.assigned || '').trim();
            if (asg.toLowerCase() !== filterState.assignedTo.trim().toLowerCase()) {
              return false;
            }
          }
        }

        // Date Range filter
        if (filterState.fromDate) {
          const opened = new Date(job.opened || job.createdAt);
          const from = new Date(filterState.fromDate);
          if (opened < from) return false;
        }
        if (filterState.toDate) {
          const opened = new Date(job.opened || job.createdAt);
          const to = new Date(filterState.toDate + 'T23:59:59');
          if (opened > to) return false;
        }

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const details = (job.details || '').toLowerCase();
          const area = (job.area || '').toLowerCase();
          const sub = (job.sub || '').toLowerCase();
          const by = (job.by || job.creator_name || '').toLowerCase();
          const status = (job.status || '').toLowerCase();
          const idStr = String(job.id || '');
          const propIdStr = String(job.propId || '').toLowerCase();

          return (
            details.includes(q) ||
            area.includes(q) ||
            sub.includes(q) ||
            by.includes(q) ||
            status.includes(q) ||
            idStr.includes(q) ||
            propIdStr.includes(q)
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (filterState.sort === 'new') {
          const da = new Date(a.opened || a.createdAt || 0);
          const db = new Date(b.opened || b.createdAt || 0);
          return db - da;
        }
        if (filterState.sort === 'old') {
          const da = new Date(a.opened || a.createdAt || 0);
          const db = new Date(b.opened || b.createdAt || 0);
          return da - db;
        }
        if (filterState.sort === 'az') {
          return (a.details || '').localeCompare(b.details || '');
        }
        if (filterState.sort === 'area') {
          return (a.area || '').localeCompare(b.area || '');
        }
        return 0;
      });
  }, [jobs, activeTab, pillFilter, filterState, searchQuery]);

  // Actions: Create Job
  const handleCreateJob = async (newJobData) => {
    const nextId = jobs.length > 0 ? Math.max(...jobs.map((j) => Number(j.id) || 0)) + 1 : 1;
    const nowIso = new Date().toISOString();
    const dateCode = getJobDateCode(nowIso);
    const customJobId = `${currentPropertyName}-${dateCode}-${pad3(nextId)}`;

    const created = {
      id: nextId,
      jobId: nextId,
      propId: customJobId,
      details: newJobData.details,
      by: newJobData.by,
      dept: newJobData.dept,
      area: newJobData.area,
      sub: newJobData.sub,
      opened: nowIso,
      status: 'Open',
      photoBefore: newJobData.photoUri || null,
      assignDept: newJobData.assigned_dept || 'NA',
      assigned: newJobData.assigned_supervisor || '',
      remarks: null,
      closedBy: null,
      closedAt: null,
    };

    setJobs((prev) => [created, ...prev]);
    setActiveTab('open');

    // Call backend API
    await DailyJobApi.addNewJob(
      {
        ...newJobData,
        propId: currentPropertyId,
      },
      newJobData.photoUri
    );

    // Refresh from API
    fetchJobs(currentPropertyId);
  };

  // Actions: Assign Staff
  const handleAssignSubmit = ({ jobId, subTeam, member, remarks }) => {
    const emailMatch = typeof member === 'string' ? member.match(/\[(.*?)\]/) : null;
    const assignedEmail = emailMatch ? emailMatch[1] : member;

    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          return {
            ...j,
            status: 'Assigned',
            assignDept: subTeam,
            assigned: member,
            remarks: remarks || j.remarks,
          };
        }
        return j;
      })
    );

    const targetJob = jobs.find((j) => j.id === jobId);
    const teamId = targetJob?.issued_to_team || targetJob?.dept || '';
    DailyJobApi.assignTeamMember(jobId, currentPropertyId, teamId, subTeam, assignedEmail);
  };

  // Actions: Close Job
  const handleCloseSubmit = ({ jobId, closingBy, remarks, photoAfterUri }) => {
    const nowIso = new Date().toISOString();
    setJobs((prev) =>
      prev.map((j) => {
        if (j.id === jobId) {
          return {
            ...j,
            status: 'Closed',
            closedBy,
            remarks,
            closedAt: nowIso,
            photoAfter: photoAfterUri || j.photoAfter,
          };
        }
        return j;
      })
    );

    const targetJob = jobs.find((j) => j.id === jobId);
    const areaId = targetJob?.areaId || targetJob?.area || '';
    DailyJobApi.changeJobStatus(jobId, currentPropertyId, areaId, 'Closed', remarks, photoAfterUri);
  };

  // Actions: Edit Job
  const handleOpenEdit = (job) => {
    setSelectedJobForEdit(job);
    setShowEditModal(true);
  };

  const handleSaveEdit = (updatedJob) => {
    setJobs((prev) =>
      prev.map((j) => (String(j.id) === String(updatedJob.id) ? { ...j, ...updatedJob } : j))
    );
    DailyJobApi.changeJobStatus(
      updatedJob.id,
      currentPropertyId,
      updatedJob.area,
      updatedJob.status,
      updatedJob.remarks
    );
  };

  // Actions: Delete Job
  const handlePromptDelete = (job) => {
    setSelectedJobForDelete(job);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = (job) => {
    setJobs((prev) => prev.filter((j) => String(j.id) !== String(job.id)));
  };

  if (!isLoggedIn) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#EBF1FD" />
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primaryDark} />
      <KeyboardAvoidingView
        style={styles.keyboardWrap}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* WorkWize Header with Profile & Segmented Tabs */}
        <Header
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab);
            setPillFilter('all');
          }}
          onOpenNewJob={() => setActiveTab('new')}
          onOpenProfile={() => setShowProfileModal(true)}
          onOpenPropertyPicker={() => setShowPropertyPickerModal(true)}
          onOpenFilter={() => setShowFilterModal(true)}
          propertyName={currentPropertyName}
          currentUser={currentUser}
          openCount={openCount}
          closedCount={closedCount}
        />

        {/* Tab View Switching: 'new' vs 'stats' vs 'open' / 'closed' */}
        {activeTab === 'new' ? (
          <NewJobView
            onSubmit={handleCreateJob}
            onCancel={() => setActiveTab('open')}
            cachedTeams={cachedTeams}
            cachedAreas={cachedAreas}
            userCurrentTeamId={userTeamContext.userCurrentTeamId}
            userSubTeamData={userTeamContext.userSubTeamData}
            primaryTeamName={userTeamContext.primaryTeamName}
            currentUser={currentUser}
            currentPropertyId={currentPropertyId}
            currentPropertyName={currentPropertyName}
            jobs={jobs}
          />
        ) : activeTab === 'stats' ? (
          <StatsView
            jobs={jobs}
            currentPropertyName={currentPropertyName}
            onSelectFilter={(st) => {
              setFilterState((prev) => ({ ...prev, status: st }));
              if (st === 'Closed') {
                setActiveTab('closed');
              } else {
                setActiveTab('open');
              }
            }}
          />
        ) : (
          <View style={styles.contentWrap}>
            {/* Sticky Search & Filter Toolbar (.sticky-bar .topbar) */}
            <View style={styles.searchFilterRow}>
              <View style={styles.searchBox}>
                <Feather name="search" size={16} color={Colors.muted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by job, area, sub-area..."
                  placeholderTextColor={Colors.placeholder}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  clearButtonMode="while-editing"
                />
                {searchQuery.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchQuery('')}>
                    <Ionicons name="close-circle" size={16} color={Colors.muted} />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                style={[
                  styles.btnFilterChip,
                  hasActiveFilters && styles.btnFilterChipActive,
                ]}
                onPress={() => setShowFilterModal(true)}
                activeOpacity={0.8}
              >
                <Feather
                  name="sliders"
                  size={14}
                  color={hasActiveFilters ? '#FFFFFF' : Colors.primary}
                />
                <Text
                  style={[
                    styles.btnFilterText,
                    hasActiveFilters && styles.btnFilterTextActive,
                  ]}
                >
                  Filter{hasActiveFilters ? ' •' : ''}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Status Filter Chips (.chips) */}
            <View style={styles.chipsRow}>
              <TouchableOpacity
                style={[styles.chip, pillFilter === 'all' && styles.chipActive]}
                onPress={() => setPillFilter('all')}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, pillFilter === 'all' && styles.chipTextActive]}>
                  All
                </Text>
              </TouchableOpacity>

              {activeTab === 'open' && (
                <>
                  <TouchableOpacity
                    style={[styles.chip, pillFilter === 'in-progress' && styles.chipActive]}
                    onPress={() => setPillFilter('in-progress')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        pillFilter === 'in-progress' && styles.chipTextActive,
                      ]}
                    >
                      In Progress
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.chip, pillFilter === 'assigned' && styles.chipActive]}
                    onPress={() => setPillFilter('assigned')}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        pillFilter === 'assigned' && styles.chipTextActive,
                      ]}
                    >
                      Assigned
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.chip, pillFilter === 'open' && styles.chipActive]}
                    onPress={() => setPillFilter('open')}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, pillFilter === 'open' && styles.chipTextActive]}>
                      Pending
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              <Text style={styles.countText}>
                {displayedJobs.length} {activeTab} jobs
              </Text>
            </View>

            {/* Job Cards List */}
            <FlatList
              data={displayedJobs}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <JobCard
                  job={item}
                  isClosed={activeTab === 'closed'}
                  onPress={(j) => {
                    setSelectedJob(j);
                    setShowViewModal(true);
                  }}
                  onEdit={handleOpenEdit}
                  onAssign={(j) => {
                    setSelectedJob(j);
                    setShowAssignModal(true);
                  }}
                  onClose={(j) => {
                    setSelectedJob(j);
                    setShowCloseModal(true);
                  }}
                />
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={isRefreshing}
                  onRefresh={() => fetchJobs(currentPropertyId)}
                  tintColor={Colors.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Feather name="inbox" size={48} color={Colors.muted} />
                  <Text style={styles.emptyTitle}>No Jobs Found</Text>
                  <Text style={styles.emptySubtitle}>
                    {searchQuery
                      ? 'Try searching with different keywords'
                      : 'No jobs in this category'}
                  </Text>
                  {searchQuery ? (
                    <TouchableOpacity
                      style={styles.emptyResetBtn}
                      onPress={() => setSearchQuery('')}
                    >
                      <Text style={styles.emptyResetText}>Clear Search</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              }
            />
          </View>
        )}

        {/* Fully Functional Mobile Bottom TabBar */}
        <TabBar
          activeTab={activeTab}
          openCount={openCount}
          closedCount={closedCount}
          onPressNewJob={() => setActiveTab('new')}
          onPressOpenJobs={() => {
            setActiveTab('open');
            setPillFilter('all');
          }}
          onPressClosedJobs={() => {
            setActiveTab('closed');
            setPillFilter('all');
          }}
          onPressFilter={() => setShowFilterModal(true)}
          onPressStats={() => setActiveTab('stats')}
        />

        {/* Modal Dialogs */}
        <FilterModal
          visible={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filterState={filterState}
          onApply={setFilterState}
          areaList={areaList}
          teamList={teamList}
          issuedByList={issuedByList}
          assignToList={assignToList}
        />

        <ViewJobModal
          visible={showViewModal}
          job={selectedJob}
          onClose={() => setShowViewModal(false)}
          onEdit={handleOpenEdit}
          onDelete={handlePromptDelete}
          onAssign={(j) => {
            setSelectedJob(j);
            setShowAssignModal(true);
          }}
          onCloseJob={(j) => {
            setSelectedJob(j);
            setShowCloseModal(true);
          }}
        />

        <AssignModal
          visible={showAssignModal}
          job={selectedJob}
          onClose={() => setShowAssignModal(false)}
          onAssignSubmit={handleAssignSubmit}
          cachedTeams={cachedTeams}
          userTeamContext={userTeamContext}
        />

        <CloseJobModal
          visible={showCloseModal}
          job={selectedJob}
          onClose={() => setShowCloseModal(false)}
          onCloseSubmit={handleCloseSubmit}
          currentUser={currentUser}
        />

        <EditJobModal
          visible={showEditModal}
          job={selectedJobForEdit}
          onClose={() => setShowEditModal(false)}
          onSave={handleSaveEdit}
          onDelete={handlePromptDelete}
          teamList={teamList}
          areaList={areaList}
        />

        <DeleteJobModal
          visible={showDeleteModal}
          job={selectedJobForDelete}
          onClose={() => setShowDeleteModal(false)}
          onConfirmDelete={handleConfirmDelete}
        />

        <ProfileModal
          visible={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          currentUser={currentUser}
          allProperties={visibleProperties}
          currentPropertyId={currentPropertyId}
          onSelectProperty={handleSelectProperty}
          openCount={openCount}
          closedCount={closedCount}
          primaryTeamName={userTeamContext.primaryTeamName}
          onLogout={handleLogout}
        />

        <StatsModal
          visible={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          allJobs={jobs}
          onSelectStatusFilter={(st) => {
            setFilterState((prev) => ({ ...prev, status: st }));
            if (st === 'Closed') setActiveTab('closed');
            else setActiveTab('open');
          }}
        />

        {/* Direct Property Selector Modal (Tapped from Header Property Pill) */}
        <DropdownModal
          visible={showPropertyPickerModal}
          onClose={() => setShowPropertyPickerModal(false)}
          title="Select Property"
          items={propertyDropdownItems}
          selectedValue={currentPropertyId}
          onSelect={(propId, item) => handleSelectProperty(item)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  keyboardWrap: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  contentWrap: {
    flex: 1,
    paddingHorizontal: 12,
  },
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    height: 42,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: Colors.ink,
    height: '100%',
  },
  btnFilterChip: {
    height: 42,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnFilterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  btnFilterText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  btnFilterTextActive: {
    color: '#FFFFFF',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.line,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.muted,
  },
  chipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  countText: {
    marginLeft: 'auto',
    fontSize: 11.5,
    color: Colors.muted,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 90,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.ink,
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.muted,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  emptyResetBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.line,
  },
  emptyResetText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: Colors.primary,
  },
});
