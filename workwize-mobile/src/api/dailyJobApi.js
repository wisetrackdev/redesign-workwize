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

export function parseFormattedPropId(str) {
  if (!str || typeof str !== 'string') return null;
  const trimmed = str.trim();
  const m = trimmed.match(/^(.+)-(\d{6})-(\d+)$/);
  if (!m) return null;
  return {
    raw: trimmed,
    prefix: m[1],
    dateCode: m[2],
    serial: parseInt(m[3], 10),
    serialStr: m[3],
  };
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
  return roles.some((r) => String(r).toUpperCase() === 'ADMIN');
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
 * Format "Issued By" text string matching workwize-teal
 */
export function getIssuedByDisplay(user, primaryTeamName) {
  if (!user) return 'IT [App admin]';
  if (isSuperAdmin(user)) {
    return `${user.name || 'IT'} [${user.desg || 'App admin'}]`;
  }
  const teamLabel = primaryTeamName || user.primaryTeam || user.dept || '';
  return `${user.name || 'User'} [${user.desg || 'Staff'}${teamLabel ? ': ' + teamLabel : ''}]`;
}

/**
 * Map API Job shape to App Model matching workwize-teal mapApiJob
 */
export function mapApiJob(op, index = 0, activePropName = 'Testing') {
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

  // Generate or preserve formatted propId: [Prefix]-[DDMMYY]-[Serial]
  let customJobId = op.propId || '';
  const parsed = parseFormattedPropId(op.propId);
  if (parsed) {
    customJobId = `${activePropName}-${parsed.dateCode}-${pad3(parsed.serial)}`;
  } else {
    const dateCode = getJobDateCode(op.openDate || op.opened);
    customJobId = `${activePropName}-${dateCode}-${pad3(index + 1)}`;
  }

  return {
    id: op.jobId || op.id || index + 1,
    jobId: op.jobId || op.id,
    propId: customJobId,
    details: op.job_detail || op.details || '',
    by: op.issued_by_team_details || op.creator_name || op.by || 'Staff',
    dept: op.issued_to_team_name || op.dept || op.issued_to_team || 'Department',
    area: op.area_name || op.area || 'General',
    sub: op.subarea || op.sub || '',
    areaId: op.areaId,
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
    closedBy,
    raw: op,
  };
}

/**
 * Authenticated API Fetcher
 */
async function apiFetch(endpoint, options = {}) {
  const headers = options.headers || {};
  const jwt = await getStoredJwt();

  // Only attach JWT if it's a real token, not empty or guest demo token
  if (jwt && !jwt.startsWith('demo-') && !headers['Authorization']) {
    headers['Authorization'] = 'Bearer ' + jwt;
  }
  options.headers = headers;

  const url = endpoint.startsWith('http') ? endpoint : BASE_URL + endpoint;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
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
    throw err;
  }
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

        const mappedOpen = rawOpen.map((j, idx) => mapApiJob(j, idx, activePropName));
        const mappedClosed = rawClose.map((j, idx) => mapApiJob(j, rawOpen.length + idx, activePropName));

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
    const openRaw = all.filter((j) => (j.status || '').toLowerCase() !== 'closed');
    const closeRaw = all.filter((j) => (j.status || '').toLowerCase() === 'closed');

    return {
      openJobs: openRaw.map((j, idx) => mapApiJob(j, idx, activePropName)),
      closedJobs: closeRaw.map((j, idx) => mapApiJob(j, openRaw.length + idx, activePropName)),
      teams: [],
      areas: [],
      userTeam: [],
      pagination: { totalOpenJobs: openRaw.length, totalCloseJobs: closeRaw.length },
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
      const filename = photoUri.split('/').pop() || 'job_photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      form.append('jobImages', {
        uri: photoUri,
        name: filename,
        type,
      });
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
      const filename = photoUri.split('/').pop() || 'closed_photo.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      form.append('jobImages', {
        uri: photoUri,
        name: filename,
        type,
      });
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
    const res = await apiFetch('api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        Email: email,
        Password: password,
        App: app,
      }),
    });

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
        username: email,
        jwt: jwt,
        name: fullName,
        email: (payload && (payload.Email || payload.email)) || email,
        role: role,
        prop: payload ? (payload.PrimaryProp || payload.prop) : null,
        desg: payload ? (payload.Designation || payload.desg) : 'Staff',
        access: payload && payload.Access ? (typeof payload.Access === 'string' ? JSON.parse(payload.Access) : payload.Access) : {},
      };

      await setStoredUserData(updatedUserData);
      return updatedUserData;
    }

    throw new Error('Invalid email or password.');
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
