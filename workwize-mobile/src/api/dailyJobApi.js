import { API_CONFIG, getStoredJwt, setStoredUserData, decodeJwtPayload } from './config';
import mockJobsData from '../data/jobs_data.json';

const BASE_URL = API_CONFIG.BASE_URL;

/**
 * Universal date/time & Maldives timezone helpers (UTC+5)
 */
export function pad3(n) {
  const num = parseInt(n, 10) || 1;
  return num < 10 ? '00' + num : num < 100 ? '0' + num : '' + num;
}

export function toMaldivesParts(val) {
  const d = val instanceof Date ? val : new Date(val);
  if (isNaN(d.getTime())) return null;
  const mvt = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  const dd = String(mvt.getUTCDate()).padStart(2, '0');
  const mm = String(mvt.getUTCMonth() + 1).padStart(2, '0');
  const yy = String(mvt.getUTCFullYear()).slice(-2);
  return { dd, mm, yy };
}

export function getJobDateCode(val) {
  let parts = toMaldivesParts(val || new Date());
  if (!parts) parts = toMaldivesParts(new Date());
  return parts.dd + parts.mm + parts.yy;
}

export function cleanIssuedBy(str) {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/\[.*?\]/g, '').replace(/\s+/g, ' ').trim();
}

export function parseFormattedPropId(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  const m = trimmed.match(/^(?:(.+)-)?(\d{6})-(\d+)$/);
  if (m) {
    const serialNum = parseInt(m[3], 10);
    return {
      raw: trimmed,
      prefix: m[1] || '',
      dateCode: m[2],
      serial: serialNum,
      serialStr: pad3(serialNum),
    };
  }
  const mSerial = trimmed.match(/^#?(\d{1,4})$/);
  if (mSerial) {
    const num = parseInt(mSerial[1], 10);
    return {
      raw: trimmed,
      prefix: '',
      dateCode: '',
      serial: num,
      serialStr: pad3(num),
    };
  }
  return null;
}

/**
 * Role Checkers matching workwize-teal
 */
export function isSuperAdmin(user) {
  if (!user) return false;
  const email = String(user.email || user.username || '').toLowerCase();
  if (
    email === 'it@workwise.in' ||
    email === 'it@workwize.in' ||
    email === 'it@workwise@gmail.com' ||
    email === 'it@workwize@gmail.com' ||
    email.startsWith('it@workwi')
  ) {
    return true;
  }
  const roles = Array.isArray(user.role) ? user.role : [user.role];
  return roles.some((r) => {
    const u = String(r).toUpperCase();
    return u === 'SUPERADMIN' || u === 'OPROADMIN';
  });
}

export function isAdmin(user) {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  const roles = Array.isArray(user.role) ? user.role : [user.role];
  return roles.some((r) => {
    const s = String(r || '').toUpperCase().trim();
    return s === 'ADMIN' || s.includes('ADMIN');
  });
}

/**
 * Checks if the logged-in user belongs to the department/team to whom this job was issued
 */
export function isJobIssuedToUserTeam(job, userCurrentTeamId, cachedTeams = []) {
  if (!job || !userCurrentTeamId) return false;
  const targetTeam = String(userCurrentTeamId).toLowerCase().trim();
  if (job.issued_to_team && String(job.issued_to_team).toLowerCase().trim() === targetTeam) {
    return true;
  }
  if (job.dept && String(job.dept).toLowerCase().trim() === targetTeam) {
    return true;
  }
  if (cachedTeams && cachedTeams.length > 0) {
    const userTeam = cachedTeams.find(
      (t) => String(t.teamId || '').toLowerCase().trim() === targetTeam
    );
    if (userTeam) {
      const uName = String(userTeam.teamName || userTeam.name || '').toLowerCase().trim();
      const jDept = String(job.dept || '').toLowerCase().trim();
      const jIssued = String(job.issued_to_team || job.issued_to_team_name || '').toLowerCase().trim();
      if (uName && (uName === jDept || uName === jIssued)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * QuickFix rule: Can Assign Job
 * Only the team to whom the job was issued (or SuperAdmin / Admin) can assign team members.
 */
export function canAssignJob(job, user, userCurrentTeamId, cachedTeams = []) {
  if (!job || !user) return false;
  if ((job.status || '').toLowerCase() === 'closed') return false;
  if (isSuperAdmin(user) || isAdmin(user)) return true;
  return isJobIssuedToUserTeam(job, userCurrentTeamId, cachedTeams);
}

/**
 * QuickFix rule: Can Close Job
 * 1. Superadmin / Oproadmin / Admin can close ANY job
 * 2. Assigned supervisor can close their assigned job (assigned_supervisor === userEmail)
 * 3. Manager of the team to whom the job was issued can close it
 */
export function canCloseJob(job, user, userCurrentTeamId, cachedTeams = []) {
  if (!job || !user) return false;
  if ((job.status || '').toLowerCase() === 'closed') return false;

  // 1. Superadmin / Oproadmin / Admin can close any job
  if (isSuperAdmin(user) || isAdmin(user)) return true;

  // 2. Assigned supervisor can close their assigned job
  const userEmail = String(user.email || user.username || '').toLowerCase().trim();
  const assignedSup = String(job.assigned_supervisor || '').toLowerCase().trim();
  if (userEmail && assignedSup && assignedSup === userEmail) {
    return true;
  }

  // 3. Manager of the team to whom the job was issued can close it
  const roles = Array.isArray(user.role) ? user.role : [user.role];
  const hasManagerRole = roles.some((r) => String(r || '').toUpperCase().includes('MANAGER'));
  if (isJobIssuedToUserTeam(job, userCurrentTeamId, cachedTeams) && hasManagerRole) {
    return true;
  }

  return false;
}

/**
 * QuickFix rule: Can Delete Job
 * ONLY Superadmin and Oproadmin can delete jobs
 */
export function canDeleteJob(user) {
  if (!user) return false;
  return isSuperAdmin(user);
}


/**
 * Team Context Resolver matching workwize-teal updateUserTeamContext
 */
export function updateUserTeamContext(user, teams = [], userTeams = []) {
  if (isSuperAdmin(user)) {
    return {
      userCurrentTeamId: null,
      userSubTeamData: [],
      primaryTeamName: '',
    };
  }

  if (!teams || !teams.length) {
    const fallbackDept = user?.primaryTeam || user?.dept || '';
    return {
      userCurrentTeamId: fallbackDept,
      userSubTeamData: [],
      primaryTeamName: fallbackDept,
    };
  }

  const email = (user && (user.email || user.username)) || '';
  let matchedTeam = null;

  // 1. Check if user email is in team members
  if (email) {
    for (let i = 0; i < teams.length; i++) {
      const t = teams[i];
      if (t.members && Array.isArray(t.members)) {
        for (let m = 0; m < t.members.length; m++) {
          if (t.members[m].email && t.members[m].email.toLowerCase() === email.toLowerCase()) {
            matchedTeam = t;
            break;
          }
        }
      }
      if (matchedTeam) break;
    }
  }

  // 2. Check if cachedUserTeams has primaryteam
  if (!matchedTeam && userTeams && userTeams.length > 0 && userTeams[0].primaryteam) {
    matchedTeam = teams.find((t) => t.teamId === userTeams[0].primaryteam);
  }

  // 3. Fallback by user's primaryTeam or dept attribute
  if (!matchedTeam && (user?.primaryTeam || user?.dept)) {
    const targetName = (user.primaryTeam || user.dept).toLowerCase().trim();
    matchedTeam = teams.find(
      (t) =>
        (t.teamName && t.teamName.toLowerCase().trim() === targetName) ||
        (t.teamId && t.teamId.toLowerCase().trim() === targetName)
    );
  }

  // 4. Fallback to first team
  if (!matchedTeam && teams && teams.length > 0) {
    matchedTeam = teams[0];
  }

  const teamId = matchedTeam ? matchedTeam.teamId : null;
  const subTeams = matchedTeam ? matchedTeam.propsubteams || [] : [];
  let teamName = matchedTeam ? matchedTeam.teamName : '';

  if (userTeams && userTeams.length > 0) {
    const ut = userTeams.find((item) => item.primaryteam === teamId);
    if (ut && ut.primaryteamname) {
      teamName = ut.primaryteamname;
    }
  }

  return {
    userCurrentTeamId: teamId,
    userSubTeamData: subTeams,
    primaryTeamName: teamName,
  };
}

/**
 * Format "Issued By" text string without bracketed metadata
 */
export function getIssuedByDisplay(user, primaryTeamName) {
  if (!user) return 'IT';
  return cleanIssuedBy(user.name) || (isSuperAdmin(user) ? 'IT' : 'User');
}

/**
 * Assign continuous, permanent serial numbers per calendar date (001, 002, 003...)
 * across both open and closed jobs.
 */
export function assignDateBasedSerialNumbers(rawJobs = [], activePropName = 'Testing', areaList = []) {
  if (!Array.isArray(rawJobs) || rawJobs.length === 0) return [];

  const groupsByDate = {};
  const processed = [];

  rawJobs.forEach((op, originalIndex) => {
    if (!op) return;
    const parsed = parseFormattedPropId(op.propId);
    let dateCode = parsed && parsed.dateCode ? parsed.dateCode : getJobDateCode(op.openDate || op.opened || op.createdAt);
    if (!dateCode) dateCode = getJobDateCode(new Date());

    let explicitSerial = (parsed && parsed.serial > 0) ? parsed.serial : (op.serial > 0 ? op.serial : null);

    const item = {
      rawJob: op,
      originalIndex,
      dateCode,
      serial: explicitSerial,
      openTime: new Date(op.openDate || op.opened || op.createdAt || 0).getTime() || 0,
    };

    if (!groupsByDate[dateCode]) {
      groupsByDate[dateCode] = [];
    }
    groupsByDate[dateCode].push(item);
  });

  Object.keys(groupsByDate).forEach((dateCode) => {
    const group = groupsByDate[dateCode];
    const takenSerials = new Set();

    group.forEach((item) => {
      if (item.serial != null) {
        takenSerials.add(item.serial);
      }
    });

    const unassigned = group.filter((item) => item.serial == null);
    unassigned.sort((a, b) => {
      if (a.openTime !== b.openTime) return a.openTime - b.openTime;
      return a.originalIndex - b.originalIndex;
    });

    let currentSeq = 1;
    unassigned.forEach((item) => {
      while (takenSerials.has(currentSeq)) {
        currentSeq++;
      }
      item.serial = currentSeq;
      takenSerials.add(currentSeq);
      currentSeq++;
    });

    group.forEach((item) => {
      const serialStr = pad3(item.serial);
      const canonicalPropId = `${activePropName}-${dateCode}-${serialStr}`;
      item.canonicalPropId = canonicalPropId;
      item.serialStr = serialStr;
      processed.push(item);
    });
  });

  processed.sort((a, b) => a.originalIndex - b.originalIndex);

  return processed.map((item) => {
    return mapApiJob(item.rawJob, item, activePropName, areaList);
  });
}

/**
 * Map API Job shape to App Model matching workwize-teal mapApiJob
 */
export function mapApiJob(op, serialInfo = 0, activePropName = 'Testing', areaList = []) {
  if (!op) return null;

  let photoBefore = '';
  if (op.open_uploads && op.open_uploads.length > 0 && op.open_uploads[0].fileurl) {
    photoBefore = op.open_uploads[0].fileurl;
  } else if (op.photoBefore) {
    photoBefore = op.photoBefore;
  }

  let photoAfter = '';
  if (op.close_uploads && op.close_uploads.length > 0 && op.close_uploads[0].fileurl) {
    photoAfter = op.close_uploads[0].fileurl;
  } else if (op.photoAfter) {
    photoAfter = op.photoAfter;
  }

  // Ensure fully-qualified URL for images
  if (photoBefore && !photoBefore.startsWith('http') && !photoBefore.startsWith('data:') && !photoBefore.startsWith('file:')) {
    photoBefore = BASE_URL.replace(/\/+$/, '') + '/' + photoBefore.replace(/^\/+/, '');
  }
  if (photoAfter && !photoAfter.startsWith('http') && !photoAfter.startsWith('data:') && !photoAfter.startsWith('file:')) {
    photoAfter = BASE_URL.replace(/\/+$/, '') + '/' + photoAfter.replace(/^\/+/, '');
  }

  let assignDept = 'NA';
  if (op.assigned_dept_name) {
    assignDept = op.assigned_dept_name;
  } else if (op.assigned_dept_main) {
    assignDept = op.assigned_dept_main;
  } else if (op.assignDept) {
    assignDept = op.assignDept;
  }

  let assignedName = '';
  if (op.assigned_supervisor) {
    const fn = op.assigned_supervisor_first_name || '';
    const ln = op.assigned_supervisor_last_name || '';
    assignedName = (fn + ' ' + ln).trim() || op.assigned_supervisor;
  } else if (op.assigned) {
    assignedName = op.assigned;
  }

  let closedBy = '';
  if ((op.job_status || op.status) === 'Closed') {
    const cfn = op.assigned_supervisor_first_name || '';
    const cln = op.assigned_supervisor_last_name || '';
    closedBy = (cfn + ' ' + cln).trim() || assignedName || op.closedBy || 'Staff';
  }

  // Canonical propId and serial resolution
  let customJobId = '';
  let serial = 0;
  let serialStr = '001';
  let dateCode = '';

  if (serialInfo && typeof serialInfo === 'object') {
    customJobId = serialInfo.canonicalPropId || '';
    serial = serialInfo.serial || 0;
    serialStr = serialInfo.serialStr || pad3(serial);
    dateCode = serialInfo.dateCode || '';
  }

  if (!customJobId) {
    const parsed = parseFormattedPropId(op.propId);
    if (parsed && parsed.serial > 0) {
      dateCode = parsed.dateCode || getJobDateCode(op.openDate || op.opened);
      serial = parsed.serial;
      serialStr = pad3(serial);
      customJobId = `${activePropName}-${dateCode}-${serialStr}`;
    } else {
      dateCode = getJobDateCode(op.openDate || op.opened);
      const fallbackIdx = typeof serialInfo === 'number' ? serialInfo + 1 : 1;
      serial = fallbackIdx;
      serialStr = pad3(serial);
      customJobId = `${activePropName}-${dateCode}-${serialStr}`;
    }
  }

  const cleanBy = cleanIssuedBy(op.issued_by_team_details || op.creator_name || op.by || 'Staff');
  const cleanClosedBy = cleanIssuedBy(closedBy);

  // Robust Area Resolution (Name preferred over raw ID)
  let resolvedArea = op.areaName || op.area_name || op.areaname || op.area || '';
  if (Array.isArray(areaList) && areaList.length > 0) {
    const matched = areaList.find(
      (a) =>
        String(a.areaId || a.areaid || '') === String(op.areaId || op.areaID || resolvedArea) ||
        String(a.areaName || a.name || '').toLowerCase() === String(resolvedArea).toLowerCase()
    );
    if (matched && (matched.areaName || matched.name)) {
      resolvedArea = matched.areaName || matched.name;
    }
  }
  if (!resolvedArea) resolvedArea = 'General';

  const resolvedSub = op.subarea || op.subArea || op.sub || '';

  return {
    id: op.jobId || op.id || customJobId,
    jobId: op.jobId || op.id,
    propId: customJobId,
    serial: serial,
    serialStr: serialStr,
    dateCode: dateCode,
    details: op.job_detail || op.details || '',
    by: cleanBy,
    dept: op.issued_to_team_name || op.dept || op.issued_to_team || 'Department',
    area: resolvedArea,
    areaName: resolvedArea,
    sub: resolvedSub,
    subarea: resolvedSub,
    areaId: op.areaId || op.areaID,
    issued_to_team: op.issued_to_team,
    issued_by_team: op.issued_by_team,
    assigned_supervisor: op.assigned_supervisor,
    opened: op.openDate || op.opened || '',
    closedAt: op.closeDate || op.closedAt || '',
    photoBefore,
    photoAfter,
    assignDept,
    assigned: assignedName,
    status: op.job_status || op.status || 'Open',
    remarks: op.job_remark || op.remarks || '',
    closedBy: cleanClosedBy,
    raw: op,
  };
}

/**
 * Authenticated API Fetcher
 */
async function apiFetch(endpoint, options = {}) {
  const headers = { ...(options.headers || {}) };
  const jwt = await getStoredJwt();

  // Only attach JWT if it's a real token, not empty or guest demo token, and not calling login
  if (jwt && !jwt.startsWith('demo-') && !headers['Authorization'] && !endpoint.includes('login')) {
    headers['Authorization'] = 'Bearer ' + jwt;
  }

  // Ensure Content-Type is NOT set for FormData so fetch automatically sets multipart boundary
  if (options.body && typeof options.body === 'object' && typeof options.body.append === 'function') {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }
  options.headers = headers;

  const url = endpoint.startsWith('http') ? endpoint : BASE_URL + endpoint;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  options.signal = controller.signal;

  try {
    const response = await fetch(url, options);
    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      let errorMsg = '';
      try {
        const errJson = await response.json();
        errorMsg = errJson.message || errJson.title || JSON.stringify(errJson);
      } catch (e) {
        errorMsg = await response.text();
      }
      throw new Error(errorMsg || `Server error (${response.status})`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.indexOf('application/json') !== -1) {
      return await response.json();
    }
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Server connection timed out. Please check your internet connection.');
    }
    if (err.message && err.message.toLowerCase().includes('network request failed')) {
      throw new Error('Network error. Unable to connect to https://api.workwize.in/.');
    }
    throw err;
  }
}

/**
 * Safely append image file to FormData across modern Expo (WinterCG) and React Native fetch
 */
async function appendImageToFormData(form, fieldName, photoUri, defaultName = 'job_photo.jpg') {
  if (!photoUri) return;
  const filename = photoUri.split('/').pop() || defaultName;
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : `image/jpeg`;

  // 1. Try modern expo-file-system File class (Blob compatible with modern Expo WinterCG fetch)
  try {
    const FileSystem = require('expo-file-system');
    if (FileSystem && FileSystem.File) {
      form.append(fieldName, new FileSystem.File(photoUri));
      return;
    }
  } catch (e) {}

  // 2. Try fetching as Blob
  try {
    const res = await fetch(photoUri);
    if (res && typeof res.blob === 'function') {
      const blob = await res.blob();
      if (blob) {
        form.append(fieldName, blob, filename);
        return;
      }
    }
  } catch (e) {}

  // 3. Fallback to legacy React Native object format
  form.append(fieldName, {
    uri: photoUri,
    name: filename,
    type,
  });
}

export const DailyJobApi = {
  /**
   * Get all properties
   * Endpoint: GET /api/dailyjob/getallproperty or /api/jobtracker/getallproperty
   */
  getAllProperties: async function () {
    try {
      const res = await apiFetch('api/dailyjob/getallproperty', { method: 'GET' });
      if (Array.isArray(res) && res.length > 0) return res;
      if (res && res.data && Array.isArray(res.data)) return res.data;
    } catch (e) {
      if (e.message === 'UNAUTHORIZED') throw e;
      try {
        const res2 = await apiFetch('api/jobtracker/getallproperty', { method: 'GET' });
        if (Array.isArray(res2) && res2.length > 0) return res2;
        if (res2 && res2.data && Array.isArray(res2.data)) return res2.data;
      } catch (e2) {
        if (e2.message === 'UNAUTHORIZED') throw e2;
      }
    }
    return [];
  },

  /**
   * Get Property Info (Areas & Employees)
   * Matches quickfix GetProperyInfo endpoint: POST /api/jobtracker/getpropinfo
   */
  getPropInfo: async function (propId) {
    if (!propId) return null;
    try {
      const form = new FormData();
      form.append('propId', propId);
      const res = await apiFetch('api/jobtracker/getpropinfo', {
        method: 'POST',
        body: form,
      });
      return res;
    } catch (e) {
      return null;
    }
  },

  /**
   * Get QuickFix Jobs for a property
   * Matches quickfix qindex.js: fetches both open jobs and close jobs dynamically
   * Endpoint: POST /api/dailyjob/getallquickfixjobs
   */
  getQuickFixJobs: async function (params = {}) {
    const propId = params.propId || '';
    const activePropName = params.propName || propId || 'Testing';

    try {
      // 1. Fetch Open Jobs from API
      const formOpen = new FormData();
      formOpen.append('propId', propId);
      formOpen.append('jobList', 'open');
      formOpen.append('pageNumber', String(params.pageNumber || 1));
      formOpen.append('pageSize', String(params.pageSize || 200));

      const resOpen = await apiFetch('api/dailyjob/getallquickfixjobs', {
        method: 'POST',
        body: formOpen,
      });

      // 2. Fetch Closed Jobs from API
      const formClose = new FormData();
      formClose.append('propId', propId);
      formClose.append('jobList', 'close');
      formClose.append('pageNumber', '1');
      formClose.append('pageSize', String(params.pageSize || 200));

      let resClose = null;
      try {
        resClose = await apiFetch('api/dailyjob/getallquickfixjobs', {
          method: 'POST',
          body: formClose,
        });
      } catch (errClose) {
        // Closed jobs fetch may be optional or fail if none exist
      }

      if (resOpen || resClose) {
        const rawOpen = Array.isArray(resOpen?.open)
          ? resOpen.open
          : Array.isArray(resOpen)
          ? resOpen
          : [];
        const rawClose = Array.isArray(resClose?.close)
          ? resClose.close
          : Array.isArray(resClose)
          ? resClose
          : Array.isArray(resOpen?.close)
          ? resOpen.close
          : [];

        let teams =
          Array.isArray(resOpen?.teams) && resOpen.teams.length > 0
            ? resOpen.teams
            : Array.isArray(resClose?.teams) && resClose.teams.length > 0
            ? resClose.teams
            : [];

        let areas =
          Array.isArray(resOpen?.areas) && resOpen.areas.length > 0
            ? resOpen.areas
            : Array.isArray(resClose?.areas) && resClose.areas.length > 0
            ? resClose.areas
            : [];

        let userTeam =
          Array.isArray(resOpen?.userTeam) && resOpen.userTeam.length > 0
            ? resOpen.userTeam
            : Array.isArray(resClose?.userTeam) && resClose.userTeam.length > 0
            ? resClose.userTeam
            : [];

        // If areas or teams are not directly in quickfix jobs response, query property info dynamically from API
        if ((!areas.length || !teams.length) && propId) {
          try {
            const propInfo = await DailyJobApi.getPropInfo(propId);
            if (!areas.length && propInfo && Array.isArray(propInfo.propArea) && propInfo.propArea.length > 0) {
              areas = propInfo.propArea.map((a) => ({
                areaId: a.areaid || a.areaId,
                areaName: a.areaName || a.name,
                propsubarea: a.propsubarea || [],
              }));
            }
            if (!teams.length && propInfo && Array.isArray(propInfo.propEmp) && propInfo.propEmp.length > 0) {
              teams = propInfo.propEmp;
            }
          } catch (e) {}
        }

        const allRaw = [
          ...rawOpen.map((j) => ({ ...j, job_status: j.job_status || j.status || 'Open' })),
          ...rawClose.map((j) => ({ ...j, job_status: 'Closed' })),
        ];

        const allMapped = assignDateBasedSerialNumbers(allRaw, activePropName, areas);
        const mappedOpen = allMapped.filter((j) => (j.status || '').toLowerCase() !== 'closed');
        const mappedClosed = allMapped.filter((j) => (j.status || '').toLowerCase() === 'closed');

        return {
          openJobs: mappedOpen,
          closedJobs: mappedClosed,
          teams: teams,
          areas: areas,
          userTeam: userTeam,
          pagination: resOpen?.pagination || resClose?.pagination || {},
          isLive: true,
        };
      }
    } catch (e) {
      if (e.message === 'UNAUTHORIZED') throw e;
    }

    // Local cached fallback from jobs_data.json only if completely offline
    const all = Array.isArray(mockJobsData) ? mockJobsData : [];
    const allMapped = assignDateBasedSerialNumbers(all, activePropName);
    const mappedOpen = allMapped.filter((j) => (j.status || '').toLowerCase() !== 'closed');
    const mappedClosed = allMapped.filter((j) => (j.status || '').toLowerCase() === 'closed');

    return {
      openJobs: mappedOpen,
      closedJobs: mappedClosed,
      teams: [],
      areas: [],
      userTeam: [],
      pagination: { totalOpenJobs: mappedOpen.length, totalCloseJobs: mappedClosed.length },
      isLive: false,
    };
  },

  /**
   * Add New Job
   * Matches quickfix new.js: POST /api/dailyjob/addnewjob
   */
  addNewJob: async function (data, photoUri) {
    const form = new FormData();
    form.append('propId', data.propId || '');
    form.append('areaID', data.areaID || data.area || '');
    form.append('subareaId', data.subareaId || data.sub || '');
    form.append('issued_to_team', data.issued_to_team || data.dept || '');
    form.append('issued_by_team', data.issued_by_team || data.by || '');
    form.append('issued_by_team_details', data.issued_by_team_details || '');
    form.append('creator_name', data.creator_name || '');
    form.append('creator_position', data.creator_position || '');
    form.append('job_detail', data.job_detail || data.details || '');

    // Assign fields (only if assigning within own team)
    if (data.assigned_dept) {
      form.append('assigned_dept', data.assigned_dept);
    }
    if (data.assigned_supervisor) {
      form.append('assigned_supervisor', data.assigned_supervisor);
    }

    if (photoUri) {
      await appendImageToFormData(form, 'jobImages', photoUri, 'job_photo.jpg');
    }

    const res = await apiFetch('api/dailyjob/addnewjob', {
      method: 'POST',
      body: form,
    });
    return { success: true, data: res, isLive: true };
  },

  /**
   * Get Team Members & Subteams for a department
   * Matches quickfix open.js GetTeamMember: POST /api/dailyjob/getpropteam
   */
  getPropTeam: async function (propId, teamId) {
    const form = new FormData();
    form.append('propID', propId || '');
    form.append('teamID', teamId || '');
    return await apiFetch('api/dailyjob/getpropteam', {
      method: 'POST',
      body: form,
    });
  },

  /**
   * Assign team member to a job
   * Matches quickfix open.js AssignTeamMember: POST /api/dailyjob/assignteammember
   */
  assignTeamMember: async function (jobId, propId, teamId, subteamId, assignedToEmail) {
    const form = new FormData();
    form.append('jobId', String(jobId));
    form.append('propId', propId || '');
    form.append('teamId', teamId || '');
    form.append('subteamId', subteamId || '');
    form.append('assignedto', assignedToEmail || '');
    return await apiFetch('api/dailyjob/assignteammember', {
      method: 'POST',
      body: form,
    });
  },

  /**
   * Change Job Status (Assigned -> In-Progress -> Closed)
   * Matches quickfix open.js ChangeJobStatus: POST /api/dailyjob/changejobstatus
   */
  changeJobStatus: async function (jobId, propId, areaId, status, remarks, photoUri) {
    const form = new FormData();
    form.append('jobID', String(jobId));
    form.append('propId', propId || '');
    form.append('areaID', areaId || '');
    form.append('status', status);
    form.append('remarks', remarks || '');

    if (photoUri) {
      await appendImageToFormData(form, 'jobImages', photoUri, 'closed_photo.jpg');
    }

    return await apiFetch('api/dailyjob/changejobstatus', {
      method: 'POST',
      body: form,
    });
  },

  /**
   * User Login
   * Matches quickfix login.html / app_quickfix.js: POST /api/login
   */
  login: async function (email, password, app = 'quickfix') {
    let res;
    try {
      res = await apiFetch('api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Email: email.trim(),
          Password: password.trim(),
          App: app,
        }),
      });
    } catch (err) {
      if (err.message === 'UNAUTHORIZED' || String(err.message).includes('401')) {
        throw new Error('Invalid email/username or password. Please try again.');
      }
      throw err;
    }

    if (res && res.token) {
      const jwt = res.token;
      const payload = decodeJwtPayload(jwt);
      let role = payload ? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] : ['STAFF'];
      if (!Array.isArray(role)) role = [role];

      let fullName = '';
      if (payload) {
        if (payload.FirstName) {
          fullName = (payload.FirstName + (payload.LastName ? (' ' + payload.LastName) : '')).trim();
        } else if (payload.name) {
          fullName = payload.name;
        } else if (payload.unique_name) {
          fullName = payload.unique_name;
        }
      }
      if (!fullName) fullName = email.split('@')[0];

      const updatedUserData = {
        username: email.trim(),
        jwt: jwt,
        name: fullName,
        email: (payload && (payload.Email || payload.email)) || email.trim(),
        role: role,
        prop: payload ? (payload.PrimaryProp || payload.prop) : null,
        desg: payload ? (payload.Designation || payload.desg) : 'Staff',
        access: payload && payload.Access ? (typeof payload.Access === 'string' ? JSON.parse(payload.Access) : payload.Access) : {},
      };

      await setStoredUserData(updatedUserData);
      return updatedUserData;
    }

    throw new Error('Invalid email/username or password. Please try again.');
  },

  /**
   * Guest Demo Login (for offline preview without creating invalid tokens)
   */
  loginGuest: async function () {
    const guestUser = {
      username: 'guest@workwize.in',
      jwt: '',
      name: 'Guest User',
      email: 'guest@workwize.in',
      role: ['MANAGER'],
      prop: 'Testing',
      desg: 'Guest Manager',
      primaryTeam: '',
      access: { QuickFix: 'Full', DailyJobs: 'Full' },
      isGuest: true,
    };
    await setStoredUserData(guestUser);
    return guestUser;
  },
};
