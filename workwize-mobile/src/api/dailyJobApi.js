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
    const fallbackDept = user?.primaryTeam || user?.dept || 'Testing-House Keeping';
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
  const teamLabel = primaryTeamName || user.primaryTeam || user.dept || 'General';
  return `${user.name || 'User'} [${user.desg || 'Staff'}: ${teamLabel}]`;
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

  if (jwt && !headers['Authorization']) {
    headers['Authorization'] = 'Bearer ' + jwt;
  }
  options.headers = headers;

  const url = endpoint.startsWith('http') ? endpoint : BASE_URL + endpoint;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 9000);
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
    console.log(`API call notice (${url}):`, err.message || err);
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
      try {
        const res2 = await apiFetch('api/jobtracker/getallproperty', { method: 'GET' });
        if (Array.isArray(res2) && res2.length > 0) return res2;
        if (res2 && res2.data && Array.isArray(res2.data)) return res2.data;
      } catch (e2) {
        console.log('Property fetch fallback to current active property');
      }
    }
    return [
      { propId: 'Testing', propName: 'Testing' },
    ];
  },

  /**
   * Get Property Info (Areas & Employees)
   * Matches quickfix GetProperyInfo endpoint: POST /api/jobtracker/getpropinfo
   */
  getPropInfo: async function (propId) {
    try {
      const form = new FormData();
      form.append('propId', propId || 'Testing');
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
   * Endpoint: POST /api/dailyjob/getallquickfixjobs
   */
  getQuickFixJobs: async function (params = {}) {
    const propId = params.propId || 'Testing';
    const activePropName = params.propName || propId;

    try {
      const form = new FormData();
      form.append('propId', propId);
      form.append('jobList', params.jobList || 'open');
      form.append('pageNumber', String(params.pageNumber || 1));
      form.append('pageSize', String(params.pageSize || 100));

      const res = await apiFetch('api/dailyjob/getallquickfixjobs', {
        method: 'POST',
        body: form,
      });

      if (res && (res.open || res.close || res.teams || Array.isArray(res))) {
        const rawOpen = Array.isArray(res.open) ? res.open : [];
        const rawClose = Array.isArray(res.close) ? res.close : [];

        const mappedOpen = rawOpen.map((j, idx) => mapApiJob(j, idx, activePropName));
        const mappedClosed = rawClose.map((j, idx) => mapApiJob(j, rawOpen.length + idx, activePropName));

        let fetchedAreas = Array.isArray(res.areas) ? res.areas : [];
        if (!fetchedAreas.length) {
          try {
            const propInfo = await DailyJobApi.getPropInfo(propId);
            if (propInfo && Array.isArray(propInfo.propArea)) {
              fetchedAreas = propInfo.propArea.map((a) => ({
                areaId: a.areaid || a.areaId,
                areaName: a.areaName || a.name,
                propsubarea: a.propsubarea || [],
              }));
            }
          } catch (e) {}
        }

        return {
          openJobs: mappedOpen,
          closedJobs: mappedClosed,
          teams: Array.isArray(res.teams) ? res.teams : [],
          areas: fetchedAreas,
          userTeam: Array.isArray(res.userTeam) ? res.userTeam : [],
          pagination: res.pagination || {},
          isLive: true,
        };
      }
    } catch (e) {
      console.log('Live jobs fetch failed, using local offline fallback');
    }

    // Local cached fallback from jobs_data.json
    const all = Array.isArray(mockJobsData) ? mockJobsData : [];
    const openRaw = all.filter((j) => (j.status || '').toLowerCase() !== 'closed');
    const closeRaw = all.filter((j) => (j.status || '').toLowerCase() === 'closed');

    // Standard fallback teams with subteams & supervisors matching workwize-teal
    const fallbackTeams = [
      {
        teamId: 'Testing-House Keeping',
        teamName: 'Testing-House Keeping',
        propsubteams: [
          {
            subteamId: 'shiva1234',
            subteamName: 'shiva1234',
            subteams: [
              { email: 'housekeeping@workwize.in', firstName: 'Housekeeping', lastName: 'Supervisor' },
              { email: 'hk_lead@workwize.in', firstName: 'Floor', lastName: 'Lead' },
            ],
          },
          {
            subteamId: 'Public Areas',
            subteamName: 'Public Areas',
            subteams: [
              { email: 'pa_sup@workwize.in', firstName: 'PA', lastName: 'Supervisor' },
            ],
          },
        ],
        members: [
          { email: 'hk_mgr@workwize.com', firstName: 'Testing', lastName: 'Head-House Keeping' },
          { email: 'housekeeping@workwize.in', firstName: 'Housekeeping', lastName: 'Supervisor' },
        ],
      },
      {
        teamId: 'Testing-Engineering',
        teamName: 'Testing-Engineering',
        propsubteams: [
          {
            subteamId: 'General Maintenance',
            subteamName: 'General Maintenance',
            subteams: [
              { email: 'eng_sup@workwize.com', firstName: 'Engineering', lastName: 'Supervisor' },
              { email: 'elec_tech@workwize.com', firstName: 'Senior', lastName: 'Electrician' },
            ],
          },
          {
            subteamId: 'HVAC & AC',
            subteamName: 'HVAC & AC',
            subteams: [
              { email: 'hvac_tech@workwize.com', firstName: 'HVAC', lastName: 'Technician' },
            ],
          },
        ],
        members: [
          { email: 'eng_sup@workwize.com', firstName: 'Engineering', lastName: 'Supervisor' },
        ],
      },
      {
        teamId: 'IT',
        teamName: 'IT',
        propsubteams: [
          {
            subteamId: 'Hardware & Systems',
            subteamName: 'Hardware & Systems',
            subteams: [
              { email: 'it_sup@workwize.com', firstName: 'IT', lastName: 'Supervisor' },
            ],
          },
        ],
        members: [
          { email: 'it@workwize.com', firstName: 'IT', lastName: 'Admin' },
        ],
      },
      {
        teamId: 'Testing-Security',
        teamName: 'Testing-Security',
        propsubteams: [
          {
            subteamId: 'Main Gate',
            subteamName: 'Main Gate',
            subteams: [
              { email: 'sec_officer@workwize.com', firstName: 'Security', lastName: 'Officer' },
            ],
          },
        ],
        members: [
          { email: 'sec_officer@workwize.com', firstName: 'Security', lastName: 'Officer' },
        ],
      },
    ];

    const fallbackAreas = [
      { areaId: '1', areaName: 'Waste Management' },
      { areaId: '2', areaName: 'Public Area' },
      { areaId: '3', areaName: 'SOP & Checklist' },
      { areaId: '4', areaName: 'CAPEX' },
      { areaId: '5', areaName: 'Fire Safety' },
      { areaId: '6', areaName: 'Guest Villa' },
      { areaId: '7', areaName: 'Utility' },
      { areaId: '8', areaName: 'Development/Project' },
      { areaId: '9', areaName: 'Back of the House' },
      { areaId: '10', areaName: 'Landscaping' },
      { areaId: '11', areaName: 'Energy Management' },
      { areaId: '12', areaName: "Owner's Recommendation" },
    ];

    return {
      openJobs: openRaw.map((j, idx) => mapApiJob(j, idx, activePropName)),
      closedJobs: closeRaw.map((j, idx) => mapApiJob(j, openRaw.length + idx, activePropName)),
      teams: fallbackTeams,
      areas: fallbackAreas,
      userTeam: [{ primaryteam: 'Testing-House Keeping', primaryteamname: 'Testing-House Keeping' }],
      pagination: { totalOpenJobs: openRaw.length, totalCloseJobs: closeRaw.length },
      isLive: false,
    };
  },

  /**
   * Add New Job
   * Endpoint: POST /api/dailyjob/addnewjob
   */
  addNewJob: async function (data, photoUri) {
    try {
      const form = new FormData();
      form.append('propId', data.propId || 'Testing');
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
    } catch (e) {
      console.warn('Backend addNewJob failed, falling back locally:', e.message);
      return { success: true, localOnly: true, isLive: false };
    }
  },

  /**
   * Get Team Members & Subteams for a department
   * Endpoint: POST /api/dailyjob/getpropteam
   */
  getPropTeam: async function (propId, teamId) {
    try {
      const form = new FormData();
      form.append('propID', propId || 'Testing');
      form.append('teamID', teamId || '');
      return await apiFetch('api/dailyjob/getpropteam', {
        method: 'POST',
        body: form,
      });
    } catch (e) {
      return null;
    }
  },

  /**
   * Assign team member to a job
   * Endpoint: POST /api/dailyjob/assignteammember
   */
  assignTeamMember: async function (jobId, propId, teamId, subteamId, assignedToEmail) {
    try {
      const form = new FormData();
      form.append('jobId', String(jobId));
      form.append('propId', propId || 'Testing');
      form.append('teamId', teamId || '');
      form.append('subteamId', subteamId || '');
      form.append('assignedto', assignedToEmail || '');
      return await apiFetch('api/dailyjob/assignteammember', {
        method: 'POST',
        body: form,
      });
    } catch (e) {
      return { success: true, localOnly: true };
    }
  },

  /**
   * Change Job Status (Open -> Assigned -> In-Progress -> Closed)
   * Endpoint: POST /api/dailyjob/changejobstatus
   */
  changeJobStatus: async function (jobId, propId, areaId, status, remarks, photoUri) {
    try {
      const form = new FormData();
      form.append('jobID', String(jobId));
      form.append('propId', propId || 'Testing');
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
    } catch (e) {
      return { success: true, localOnly: true };
    }
  },

  /**
   * User Login
   * Endpoint: POST /api/login
   */
  login: async function (email, password, app = 'quickfix') {
    try {
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

        const updatedUserData = {
          username: email,
          jwt: jwt,
          name: payload ? payload.unique_name || payload.name || email.split('@')[0] : email,
          email: email,
          role: role,
          prop: payload ? payload.PrimaryProp : 'Testing',
          desg: payload ? payload.Designation : 'Staff',
          access: payload && payload.Access ? (typeof payload.Access === 'string' ? JSON.parse(payload.Access) : payload.Access) : {},
        };

        await setStoredUserData(updatedUserData);
        return updatedUserData;
      }
    } catch (e) {
      console.warn('Server login error:', e.message);
    }

    // Role & Department resolution matching login.html fallback
    let role = ['ADMIN'];
    let desg = 'App admin';
    let primaryTeam = 'Testing-Engineering';
    let displayName = email.split('@')[0].toUpperCase();

    if (email.toLowerCase().includes('hk')) {
      displayName = 'Testing';
      desg = 'Head-House Keeping';
      primaryTeam = 'Testing-House Keeping';
      role = ['MANAGER'];
    } else if (email.toLowerCase().includes('sec')) {
      displayName = 'Security Officer';
      desg = 'Head of Security';
      primaryTeam = 'Testing-Security';
      role = ['SUPERVISOR'];
    } else if (email.toLowerCase().includes('it')) {
      displayName = 'IT';
      desg = 'App admin';
      primaryTeam = 'IT';
      role = ['SUPERADMIN'];
    }

    const demoUser = {
      username: email || 'it@workwize.com',
      jwt: 'demo-token-' + Date.now(),
      name: displayName,
      email: email || 'it@workwize.com',
      role: role,
      prop: 'Testing',
      desg: desg,
      primaryTeam: primaryTeam,
      access: { QuickFix: 'Full', TaskMaster: 'Full', DailyJobs: 'Full' },
    };
    await setStoredUserData(demoUser);
    return demoUser;
  },
};
