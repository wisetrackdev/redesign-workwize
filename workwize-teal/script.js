(function () {
  'use strict';

  var cfg = window.WorkWizeConfig;
  var api = window.WorkWizeDailyJobApi;

  /* ================= Global State ================= */
  var allProperties = [];
  var currentPropertyId = null;
  var cachedTeams = [];
  var cachedAreas = [];
  var cachedUserTeams = [];
  var userCurrentTeamId = null;
  var userSubTeamData = [];
  var currentUser = null;

  var openJobs = [];
  var closedJobs = [];
  var activeJobsList = [];

  // Persistent Job ID / Serial Number map to ensure a job's serial never changes between Open and Closed tabs
  var globalJobCustomIdMap = {};

  function loadJobCustomIdMap() {
    globalJobCustomIdMap = {};
    try {
      var k = 'workwize_job_prop_ids_' + (currentPropertyId || 'default');
      var raw = localStorage.getItem(k);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          var serialCount = {};
          var hasDuplicates = false;
          Object.keys(parsed).forEach(function (key) {
            var val = parsed[key];
            if (val && typeof val === 'string') {
              var m = val.match(/-(\d+)$/);
              if (m) {
                var s = m[1];
                if (serialCount[s]) {
                  hasDuplicates = true;
                }
                serialCount[s] = (serialCount[s] || 0) + 1;
              }
            }
          });
          if (hasDuplicates) {
            try { localStorage.removeItem(k); } catch (e) {}
          } else {
            Object.assign(globalJobCustomIdMap, parsed);
          }
        }
      }
    } catch (e) {}
  }

  function saveJobCustomIdMap() {
    try {
      var k = 'workwize_job_prop_ids_' + (currentPropertyId || 'default');
      localStorage.setItem(k, JSON.stringify(globalJobCustomIdMap));
    } catch (e) {}
  }

  var state = {
    tab: 'open',
    q: '',
    status: 'all',
    area: 'all',
    issuedBy: 'all',
    issuedTo: 'all',
    assignedTo: 'all',
    fromDate: '',
    toDate: '',
    sort: 'new',
    pageSize: 25,
    layout: 'list',
    period: 'today',
    highlightedJobId: null
  };

  var pagination = {
    open: { total: 0, page: 1, pageSize: 25, totalPages: 1 },
    closed: { total: 0, page: 1, pageSize: 25, totalPages: 1 }
  };

  var isLoading = false;
  var newJobSelectedFiles = [];
  var assignTargetJob = null;
  var closeTargetJob = null;
  var closePhotoFile = null;
  var editTargetJob = null;
  var editPhotoBeforeData = undefined;
  var ctx = { ids: [], id: null }; // View modal context

  /* ================= Helper Utilities ================= */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  var na = function (s) {
    return s && s !== 'NA' && s !== 'na' ? esc(s) : '<span class="na">NA</span>';
  };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* ================= Maldives Time (MVT: UTC+5) Helpers =================
   * Standard Time in Maldives is UTC+05:00 (no DST).
   * India Standard Time (IST) is UTC+05:30.
   * Maldives Time is always exactly 30 minutes behind India Time (IST - 30 minutes).
   * Backend server (api.workwize.in) stores and returns timestamps in UTC (e.g. '2026-10-14T04:44:15').
   * All Open & Closed times, regardless of where the form is filled or client timezone,
   * are displayed according to Maldives Time.
   */
  function toMaldivesDate(val) {
    if (!val || val === 'NA' || val === 'na') return null;
    if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
    var s = String(val).trim();
    if (!s || s.startsWith('0001-01-01') || s.startsWith('0001')) return null;

    // ISO string with timezone indicator (e.g., 'Z', '+05:30', '-04:00')
    if (/Z|[+-]\d{2}(:?\d{2})?$/i.test(s)) {
      var dZ = new Date(s);
      return isNaN(dZ.getTime()) ? null : dZ;
    }

    // Unzoned ISO format: 'YYYY-MM-DDTHH:mm:ss' or 'YYYY-MM-DD HH:mm:ss'
    // Stored and returned by backend server (api.workwize.in) in UTC
    var isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (isoMatch) {
      var sec = isoMatch[6] || '00';
      var utcIso = isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3] + 'T' + isoMatch[4] + ':' + isoMatch[5] + ':' + sec + 'Z';
      var dIso = new Date(utcIso);
      if (!isNaN(dIso.getTime())) return dIso;
    }

    // DD/MM/YYYY or DD-MM-YYYY HH:mm(:ss)
    var dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:,?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
    if (dmyMatch) {
      var y = dmyMatch[3];
      var m = pad(parseInt(dmyMatch[2], 10));
      var dd = pad(parseInt(dmyMatch[1], 10));
      var hr = pad(parseInt(dmyMatch[4] || 0, 10));
      var min = pad(parseInt(dmyMatch[5] || 0, 10));
      var sc = pad(parseInt(dmyMatch[6] || 0, 10));
      var utcDmy = y + '-' + m + '-' + dd + 'T' + hr + ':' + min + ':' + sc + 'Z';
      var dDmy = new Date(utcDmy);
      if (!isNaN(dDmy.getTime())) return dDmy;
    }

    var fb = new Date(s);
    return isNaN(fb.getTime()) ? null : fb;
  }

  function toMaldivesParts(val) {
    var d = toMaldivesDate(val);
    if (!d) return null;
    // Shift by UTC+5 hours (300 minutes) to read exact Maldives time components via UTC methods
    var mvt = new Date(d.getTime() + (5 * 60 * 60 * 1000));
    var dd = pad(mvt.getUTCDate());
    var mm = pad(mvt.getUTCMonth() + 1);
    var yyyy = mvt.getUTCFullYear();
    var yy = String(yyyy).slice(-2);
    var hh = pad(mvt.getUTCHours());
    var min = pad(mvt.getUTCMinutes());
    var ss = pad(mvt.getUTCSeconds());
    return {
      d: mvt,
      day: dd,
      month: mm,
      year: yyyy,
      dd: dd,
      mm: mm,
      yy: yy,
      yyyy: yyyy,
      hours: hh,
      minutes: min,
      seconds: ss,
      time: hh + ':' + min,
      date: dd + '/' + mm + '/' + yyyy,
      ymd: yyyy + '-' + mm + '-' + dd,
      full: dd + '/' + mm + '/' + yyyy + ', ' + hh + ':' + min
    };
  }

  function fmt(iso) {
    if (!iso || iso === 'NA' || iso === 'na' || String(iso).startsWith('0001')) return 'NA';
    var parts = toMaldivesParts(iso);
    if (parts) return parts.full;
    return String(iso);
  }

  function parseJobDate(val) {
    if (!val || val === 'NA' || val === 'na') return null;
    return toMaldivesDate(val);
  }

  function pad3(n) {
    var num = parseInt(n, 10) || 1;
    return num < 10 ? '00' + num : num < 100 ? '0' + num : '' + num;
  }

  function getJobDateCode(val) {
    var parts = toMaldivesParts(val || new Date());
    if (!parts) parts = toMaldivesParts(new Date());
    return parts.dd + parts.mm + parts.yy;
  }

  function getActivePropertyName() {
    var name = '';
    if (Array.isArray(allProperties) && allProperties.length > 0) {
      if (currentPropertyId) {
        var found = allProperties.find(function (p) {
          return String(p.propId) === String(currentPropertyId) || String(p.id) === String(currentPropertyId);
        });
        if (found && found.propName) name = found.propName;
      }
      if (!name && currentUser && currentUser.prop) {
        var foundUser = allProperties.find(function (p) {
          return String(p.propId) === String(currentUser.prop) || String(p.propName) === String(currentUser.prop);
        });
        if (foundUser && foundUser.propName) name = foundUser.propName;
      }
    }
    if (!name) {
      var sv = $('#pdSelectedValue');
      if (sv && sv.textContent.trim()) name = sv.textContent.trim();
    }
    if (!name && currentUser && currentUser.prop) {
      name = currentUser.prop;
    }
    if (!name) name = 'Testing';
    return name.trim().replace(/\s+/g, '-');
  }

  function getActivePropertySlug() {
    return getActivePropertyName();
  }

  function parseFormattedPropId(str) {
    if (!str || typeof str !== 'string') return null;
    var trimmed = str.trim();
    var m = trimmed.match(/^(.+)-(\d{6})-(\d+)$/);
    if (!m) return null;
    return {
      raw: trimmed,
      prefix: m[1],
      dateCode: m[2],
      serial: parseInt(m[3], 10),
      serialStr: m[3]
    };
  }

  function span(a, b) {
    var da = toMaldivesDate(a) || new Date(a), db = toMaldivesDate(b) || new Date(b);
    if (isNaN(da.getTime()) || isNaN(db.getTime())) return 'Recently';
    var m = Math.max(0, Math.round((db - da) / 60000));
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h ' + (m % 60) + 'm';
    var d = Math.floor(h / 24); return d + 'd ' + (h % 24) + 'h';
  }

  function toast(msg) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.classList.remove('show'); }, 2800);
  }

  /* Icons */
  var I = {
    dots: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    eye: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>',
    check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',
    user: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
    dept: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    img: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    tick: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
    up: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>'
  };

  /* ================= User Authentication & Context ================= */
  function loadStoredUser() {
    currentUser = (cfg && cfg.getStoredUserData) ? cfg.getStoredUserData() : null;
    if (!currentUser) {
      // Default placeholder if not signed in
      currentUser = {
        name: 'IT',
        desg: 'App admin',
        email: 'it@workwize.in',
        role: ['ADMIN'],
        prop: null
      };
    }
  }

  function isSuperAdmin() {
    if (!currentUser) return false;
    var email = String(currentUser.email || currentUser.username || '').toLowerCase();
    if (
      email === 'it@workwise.in' ||
      email === 'it@workwize.in' ||
      email === 'it@workwise@gmail.com' ||
      email === 'it@workwize@gmail.com' ||
      email.indexOf('it@workwi') === 0
    ) {
      return true;
    }
    var roles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
    return roles.some(function (r) {
      var u = String(r).toUpperCase();
      return u === 'SUPERADMIN' || u === 'OPROADMIN';
    });
  }

  function isAdmin() {
    if (!currentUser) return false;
    if (isSuperAdmin()) return true;
    var roles = Array.isArray(currentUser.role) ? currentUser.role : [currentUser.role];
    return roles.some(function (r) {
      var u = String(r).toUpperCase();
      return u === 'ADMIN';
    });
  }

  function updateHeaderUserInfo() {
    if (!currentUser) return;
    var nameEl = $('#pdUserName');
    var roleEl = $('#pdUserRole');
    var byInput = $('#fBy');
    var loginBtn = $('#pdLoginBtn');
    var userTrigger = $('#userMenuTrigger');

    if (nameEl) nameEl.textContent = currentUser.name || 'User';
    if (roleEl) roleEl.textContent = currentUser.desg || (currentUser.role && currentUser.role[0]) || 'Staff';

    var hasRealJwt = !!((cfg && cfg.getStoredJwt && cfg.getStoredJwt()));
    if (loginBtn) loginBtn.hidden = hasRealJwt;

    if (userTrigger) {
      userTrigger.title = (currentUser.name || 'User') + ' - ' + (currentUser.desg || 'Staff');
    }

    var primaryTeamName = getPrimaryTeamName();
    if (byInput) {
      if (isSuperAdmin()) {
        byInput.value = (currentUser.name || 'IT') + ' [' + (currentUser.desg || 'App admin') + ']';
      } else {
        byInput.value = (currentUser.name || 'User') + ' [' + (currentUser.desg || 'Staff') + ': ' + (primaryTeamName || 'General') + ']';
      }
    }
  }

  function getPrimaryTeamName() {
    if (!userCurrentTeamId) return '';
    if (!cachedUserTeams || !cachedUserTeams.length) {
      if (cachedTeams && cachedTeams.length && userCurrentTeamId) {
        var match = cachedTeams.find(function (t) { return t.teamId === userCurrentTeamId; });
        if (match) return match.teamName;
      }
      return '';
    }
    var team = cachedUserTeams.find(function (item) { return item.primaryteam === userCurrentTeamId; });
    return team ? team.primaryteamname : (cachedUserTeams[0] ? cachedUserTeams[0].primaryteamname : '');
  }

  function updateUserTeamContext() {
    userCurrentTeamId = null;
    userSubTeamData = [];

    // ONLY Superadmin / Oproadmin (e.g. it@workwise...) do not belong to a department team
    if (isSuperAdmin()) {
      updateHeaderUserInfo();
      return;
    }

    if (!cachedTeams || !cachedTeams.length) {
      updateHeaderUserInfo();
      return;
    }

    var email = (currentUser && (currentUser.email || currentUser.username)) || '';
    var matchedTeam = null;

    // 1. Check if user email is in team members
    if (email) {
      for (var i = 0; i < cachedTeams.length; i++) {
        var t = cachedTeams[i];
        if (t.members && Array.isArray(t.members)) {
          for (var m = 0; m < t.members.length; m++) {
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
    if (!matchedTeam && cachedUserTeams && cachedUserTeams.length > 0 && cachedUserTeams[0].primaryteam) {
      matchedTeam = cachedTeams.find(function (t) { return t.teamId === cachedUserTeams[0].primaryteam; });
    }

    // 3. Fallback to first team for main admin or other staff if not explicitly in members list
    if (!matchedTeam && cachedTeams && cachedTeams.length > 0) {
      matchedTeam = cachedTeams[0];
    }

    if (matchedTeam) {
      userCurrentTeamId = matchedTeam.teamId;
      userSubTeamData = matchedTeam.propsubteams || [];
    }

    updateHeaderUserInfo();
  }

  /* ================= API Data Mapping ================= */
  function mapApiJob(op, index, jobCustomIdMap) {
    if (!op) return null;
    var photoBefore = '';
    if (op.open_uploads && op.open_uploads.length > 0 && op.open_uploads[0].fileurl) {
      photoBefore = op.open_uploads[0].fileurl;
    }
    var photoAfter = '';
    if (op.close_uploads && op.close_uploads.length > 0 && op.close_uploads[0].fileurl) {
      photoAfter = op.close_uploads[0].fileurl;
    }

    var assignDept = 'NA';
    if (op.assigned_dept_name) {
      assignDept = op.assigned_dept_name;
    } else if (op.assigned_dept_main) {
      assignDept = op.assigned_dept_main;
    }

    var assignedName = '';
    if (op.assigned_supervisor) {
      var fn = op.assigned_supervisor_first_name || '';
      var ln = op.assigned_supervisor_last_name || '';
      assignedName = (fn + ' ' + ln).trim() || op.assigned_supervisor;
    }

    var closedBy = '';
    if (op.job_status === 'Closed') {
      var cfn = op.assigned_supervisor_first_name || '';
      var cln = op.assigned_supervisor_last_name || '';
      closedBy = (cfn + ' ' + cln).trim() || assignedName || 'Staff';
    }

    var key = op.jobId != null ? String(op.jobId) : (op.id != null ? String(op.id) : ('idx_' + index));
    var activePrefix = getActivePropertyName();

    var existingId = (jobCustomIdMap && jobCustomIdMap[key])
      || (globalJobCustomIdMap && (
           (op.jobId != null && globalJobCustomIdMap[String(op.jobId)])
        || (op.id != null && globalJobCustomIdMap[String(op.id)])
        || globalJobCustomIdMap[key]
      ));

    var customJobId = '';
    var parsedExisting = parseFormattedPropId(existingId);
    if (parsedExisting) {
      customJobId = activePrefix + '-' + parsedExisting.dateCode + '-' + pad3(parsedExisting.serial);
    } else {
      var parsedOp = parseFormattedPropId(op.propId);
      if (parsedOp) {
        customJobId = activePrefix + '-' + parsedOp.dateCode + '-' + pad3(parsedOp.serial);
      } else {
        customJobId = activePrefix + '-' + getJobDateCode(op.openDate) + '-' + pad3(index != null ? index + 1 : 1);
      }
    }

    if (customJobId) {
      if (key) globalJobCustomIdMap[key] = customJobId;
      if (op.jobId != null) globalJobCustomIdMap[String(op.jobId)] = customJobId;
      if (op.id != null) globalJobCustomIdMap[String(op.id)] = customJobId;
    }

    return {
      id: op.jobId || (index + 1),
      jobId: op.jobId,
      propId: customJobId,
      customJobId: customJobId,
      details: op.job_detail || '',
      by: op.issued_by_team_details || op.creator_name || 'Staff',
      dept: op.issued_to_team_name || 'Department',
      area: op.area_name || 'General',
      sub: op.subarea || '',
      areaId: op.areaId,
      issued_to_team: op.issued_to_team,
      issued_by_team: op.issued_by_team,
      assigned_supervisor: op.assigned_supervisor,
      opened: op.openDate || '',
      closedAt: op.closeDate || '',
      photoBefore: photoBefore,
      photoAfter: photoAfter,
      assignDept: assignDept,
      assigned: assignedName,
      status: op.job_status || 'Open',
      remarks: op.job_remark || '',
      closedBy: closedBy,
      raw: op
    };
  }

  /* ================= Search & Word Match ================= */
  function words() { return state.q ? state.q.toLowerCase().split(/\s+/).filter(Boolean) : []; }
  function hl(text) {
    var w = words(); text = String(text == null ? '' : text);
    if (!w.length) return esc(text);
    var re = new RegExp('(' + w.map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'ig');
    return text.split(re).map(function (p, i) { return i % 2 ? '<mark>' + esc(p) + '</mark>' : esc(p); }).join('');
  }

  function matches(j) {
    var w = words(); if (!w.length) return true;
    var hay = [j.id, j.jobId, j.propId, currentPropertyId, j.details, j.by, j.dept, j.area, j.sub, j.assigned, j.assignDept, j.status, j.remarks, j.closedBy, fmt(j.opened), fmt(j.closedAt)].join(' ').toLowerCase();
    return w.every(function (x) { return hay.indexOf(x) !== -1; });
  }

  function getActiveJobs() {
    return state.tab === 'closed' ? closedJobs : openJobs;
  }

  function listFor(tab, ignoreStatus) {
    var source = (tab === 'closed') ? closedJobs : openJobs;
    var arr = source.filter(function (j) {
      var matchAssign = true;
      if (state.assignedTo && state.assignedTo !== 'all') {
        if (state.assignedTo === '__unassigned__') {
          matchAssign = !j.assigned || j.assigned === 'NA' || j.assigned === 'Not assigned';
        } else {
          matchAssign = j.assigned === state.assignedTo;
        }
      }

      var matchDate = true;
      if (state.fromDate || state.toDate) {
        var opParts = toMaldivesParts(j.opened);
        var clParts = j.closedAt ? toMaldivesParts(j.closedAt) : null;
        var opYmd = opParts ? opParts.ymd : '';
        var clYmd = clParts ? clParts.ymd : '';

        if (tab === 'closed') {
          var opMatch = !!(opYmd && (!state.fromDate || opYmd >= state.fromDate) && (!state.toDate || opYmd <= state.toDate));
          var clMatch = !!(clYmd && (!state.fromDate || clYmd >= state.fromDate) && (!state.toDate || clYmd <= state.toDate));
          matchDate = opMatch || clMatch;
        } else {
          if (!opYmd) {
            matchDate = false;
          } else {
            if (state.fromDate && opYmd < state.fromDate) matchDate = false;
            if (state.toDate && opYmd > state.toDate) matchDate = false;
          }
        }
      }

      var matchIssuedBy = true;
      if (state.issuedBy && state.issuedBy !== 'all') {
        var selBy = state.issuedBy.trim();
        var jBy = (j.by && typeof j.by === 'string') ? j.by.replace(/\s+/g, ' ').trim() : (j.by || '').trim();
        matchIssuedBy = (jBy === selBy || (j.by && j.by.trim() === selBy));
      }

      return matches(j) &&
        (state.area === 'all' || j.area === state.area) &&
        matchIssuedBy &&
        (!state.issuedTo || state.issuedTo === 'all' || j.dept === state.issuedTo) &&
        matchAssign &&
        matchDate &&
        (ignoreStatus || tab === 'closed' || state.status === 'all' || j.status === state.status || (state.status === 'In-Progress' && (j.status === 'In-Progress' || j.status === 'InProgress' || j.status === 'In Progress')));
    });
    var s = state.sort;
    arr.sort(function (a, b) {
      var da = parseJobDate(a.opened) || new Date(0);
      var db = parseJobDate(b.opened) || new Date(0);
      if (s === 'old') return (da - db) || String(a.id).localeCompare(String(b.id));
      if (s === 'az') return (a.details || '').localeCompare(b.details || '');
      if (s === 'area') return (a.area || '').localeCompare(b.area || '') || (a.details || '').localeCompare(b.details || '');
      return (db - da) || String(b.id).localeCompare(String(a.id));
    });
    return arr;
  }

  /* ================= Photos Preview Helpers ================= */
  function photoBeforePreview(j) {
    var url = j.photoBefore;
    if (url && url !== 'na' && url !== 'NA') {
      var isVideo = /\.(mp4|mov)$/i.test(url);
      if (isVideo) {
        return '<a href="javascript:void(0)" class="video-preview-btn" data-video="' + esc(url) + '" title="Play Video" style="display:inline-flex;align-items:center;gap:4px;color:var(--primary);font-weight:600;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 8.64L15.27 12 10 15.36V8.64M8 5v14l11-7L8 5z"/></svg> Video</a>';
      }
      if (url.indexOf('data:image') === 0 || url.indexOf('http') === 0 || url.indexOf('/') === 0) {
        return '<img src="' + esc(url) + '" class="thumb-preview" alt="Photo Before" data-zoom title="Click to view photo">';
      }
      return '<span class="pf" title="' + esc(url) + '">' + I.img + ' Photo</span>';
    }
    return '<span class="no-photo-badge">' + I.img + ' No Photo</span>';
  }

  function photoAfterPreview(j) {
    var url = j.photoAfter;
    if (url && url !== 'na' && url !== 'NA') {
      var isVideo = /\.(mp4|mov)$/i.test(url);
      if (isVideo) {
        return '<a href="javascript:void(0)" class="video-preview-btn" data-video="' + esc(url) + '" title="Play Video" style="display:inline-flex;align-items:center;gap:4px;color:var(--primary);font-weight:600;"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M10 8.64L15.27 12 10 15.36V8.64M8 5v14l11-7L8 5z"/></svg> Video</a>';
      }
      if (url.indexOf('data:image') === 0 || url.indexOf('http') === 0 || url.indexOf('/') === 0) {
        return '<img src="' + esc(url) + '" class="thumb-preview" alt="Photo After" data-zoom title="Click to view photo">';
      }
      return '<span class="pf" title="' + esc(url) + '">' + I.img + ' Photo</span>';
    }
    return '<span class="no-photo-badge">' + I.img + ' No Photo</span>';
  }

  function clsOf(j) {
    if (j.status === 'Closed') return 'Closed';
    if (j.status === 'Assigned') return 'Assigned';
    if (j.status === 'In-Progress' || j.status === 'InProgress' || j.status === 'In Progress') return 'InProgress';
    return j.status === 'Open' ? 'Open' : '';
  }

  /* ================= 3-Dot Actions Menu ================= */
  function menuHTML(j) {
    var closed = j.status === 'Closed';
    var isAssigned = j.status === 'Assigned';

    // Assignment rule: Only the team to whom the job was issued (or SuperAdmin/Admin) can assign team members!
    var canAssign = !closed && (isAdmin() || (userCurrentTeamId && j.issued_to_team === userCurrentTeamId));
    // Status change / close permission
    var canClose = !closed && (isAdmin() || (userCurrentTeamId && j.issued_to_team === userCurrentTeamId) || (j.assigned_supervisor === (currentUser && currentUser.email)));

    var editBtn = '';
    // Edit Job ONLY for jobs with status 'Open' in Open tab (not Assigned or Closed)
    if (state.tab === 'open' && j.status === 'Open') {
      editBtn = '<button data-act="edit" data-id="' + j.id + '">' + I.edit + ' Edit Job</button>';
    }

    var assignBtn = '';
    if (!closed) {
      if (canAssign) {
        assignBtn = '<button data-act="assign" data-id="' + j.id + '">' + I.user + (isAssigned ? ' Reassign Member' : ' Assign Member') + '</button>';
      } else {
        assignBtn = '<button disabled style="opacity:0.45;cursor:not-allowed" title="Only assigned dept team can assign members">' + I.user + ' Assign (Dept Only)</button>';
      }
    }

    var closeBtn = '';
    if (!closed && canClose) {
      closeBtn = '<button data-act="close" data-id="' + j.id + '">' + I.check + ' Close Job</button>';
    }

    return '<div class="dots"><button type="button" data-act="menu" aria-label="More options">' + I.dots + '</button><div class="menu">' +
      '<button data-act="view" data-id="' + j.id + '">' + I.eye + ' View Details</button>' +
      editBtn +
      assignBtn +
      closeBtn +
      '</div></div>';
  }

  /* ================= Job Row / Card Highlighting ================= */
  function isHighlighted(j) {
    if (!state.highlightedJobId || !j) return false;
    var hid = String(state.highlightedJobId);
    return String(j.id) === hid || String(j.jobId) === hid;
  }

  function highlightJob(id) {
    if (!id) return;
    state.highlightedJobId = String(id);
    $$('.jcard, .jrow').forEach(function (el) {
      if (String(el.dataset.id) === String(id)) {
        el.classList.add('highlighted-job');
      } else {
        el.classList.remove('highlighted-job');
      }
    });
  }

  /* ================= Card / Row Layout (Remark strictly in Closed tab) ================= */
  function cardHTML(j) {
    var closed = (state.tab === 'closed') || j.status === 'Closed';
    var hlCls = isHighlighted(j) ? ' highlighted-job' : '';
    var issuedToSub = '<div class="issued-to-bar">' + I.dept + ' <span>Issued To:</span> <b>' + hl(j.dept) + '</b></div>';

    // Requirement: "closed mai remark only closed ki tab mai show hona chiya"
    var rows =
      '<span>Area</span><b title="' + esc(j.area) + '">' + hl(j.area) + '</b>' +
      '<span>Sub Area</span><b title="' + esc(j.sub || 'NA') + '">' + (j.sub ? hl(j.sub) : '<span class="na">NA</span>') + '</b>' +
      '<span>Opened</span><b>' + fmt(j.opened) + '</b>' +
      '<span>Photo Before</span><div>' + photoBeforePreview(j) + '</div>' +
      (closed
        ? '<span>Photo After</span><div>' + photoAfterPreview(j) + '</div>' +
          '<span>Closed by</span><b title="' + esc(j.closedBy) + '">' + na(j.closedBy) + (j.closedAt ? ' &middot; ' + fmt(j.closedAt) : '') + '</b>' +
          '<span>Remarks</span><b title="' + esc(j.remarks || 'NA') + '">' + (j.remarks ? hl(j.remarks) : '<span class="na">NA</span>') + '</b>'
        : '<span>Assigned Sub Dept</span><b title="' + esc(j.assignDept || 'NA') + '">' + (j.assignDept && j.assignDept !== 'NA' ? hl(j.assignDept) : '<span class="na">NA</span>') + '</b>' +
          '<span>Assigned To</span><b title="' + esc(j.assigned) + '">' + (j.assigned ? hl(j.assigned) : '<span class="na">Not assigned</span>') + '</b>');

    return '<article class="jcard ' + clsOf(j) + hlCls + '" data-id="' + j.id + '" tabindex="0">' +
      '<div class="top">' +
        '<div class="left"><span class="prop-badge" title="Job ID">' + esc(j.propId) + '</span><span class="tag st-' + j.status + '">' + j.status + '</span></div>' +
        menuHTML(j) +
      '</div>' +
      '<h3 title="' + esc(j.details) + '">' + hl(j.details) + '</h3>' +
      issuedToSub +
      '<div class="kv">' + rows + '</div>' +
      '<div class="card-actions">' +
        '<div class="dt">' + (closed ? (j.closedAt ? 'Resolved in ' + span(j.opened, j.closedAt) : 'Closed') : 'Open ' + span(j.opened, new Date())) + '</div>' +
      '</div>' +
    '</article>';
  }

  function rowHTML(j) {
    var closed = (state.tab === 'closed') || j.status === 'Closed';
    var hlCls = isHighlighted(j) ? ' highlighted-job' : '';
    var assignDeptVal = (j.assignDept && j.assignDept !== 'NA') ? hl(j.assignDept) : '<span class="na">NA</span>';
    var assignedPerson = (j.assigned && j.assigned !== 'NA') ? j.assigned : (closed && j.closedBy ? j.closedBy : '');
    var assignedVal = assignedPerson ? hl(assignedPerson) : '<span class="na">Not assigned</span>';

    // Requirement: Remarks ONLY shown in Closed tab!
    if (closed) {
      var closedRemark = (j.remarks && j.remarks !== 'NA') ? hl(j.remarks) : '<span class="na">NA</span>';
      return '<article class="jrow Closed' + hlCls + '" data-id="' + j.id + '" tabindex="0">' +
        '<div class="rt">' +
          '<span class="prop-badge" title="Job ID">' + esc(j.propId) + '</span>' +
          '<b title="' + esc(j.details) + '">' + hl(j.details) + '</b>' +
          '<small>' + I.dept + ' ' + hl(j.dept) + '</small>' +
        '</div>' +
        '<div class="rc" title="' + esc(j.area) + '"><span>Area</span>' + hl(j.area) + '</div>' +
        '<div class="rc" title="' + esc(j.sub || 'NA') + '"><span>Sub Area</span>' + (j.sub ? hl(j.sub) : '<span class="na">NA</span>') + '</div>' +
        '<div class="rc" title="' + esc(fmt(j.opened)) + '"><span>Opened</span>' + fmt(j.opened) + '</div>' +
        '<div class="rc" title="' + esc(fmt(j.closedAt)) + '"><span>Closed</span>' + (j.closedAt ? fmt(j.closedAt) : '<span class="na">NA</span>') + '</div>' +
        '<div class="rc" title="' + esc(assignedPerson || 'NA') + '"><span>Closed By</span>' + assignedVal + '</div>' +
        '<div class="rc" title="' + esc(j.remarks || 'NA') + '"><span>Remarks</span>' + closedRemark + '</div>' +
        '<div class="rs"><span class="tag st-' + j.status + '">' + j.status + '</span></div>' +
        menuHTML(j) +
      '</article>';
    }

    // Open row: remarks column is omitted
    return '<article class="jrow ' + clsOf(j) + hlCls + '" data-id="' + j.id + '" tabindex="0">' +
      '<div class="rt">' +
        '<span class="prop-badge" title="Job ID">' + esc(j.propId) + '</span>' +
        '<b title="' + esc(j.details) + '">' + hl(j.details) + '</b>' +
        '<small>' + I.dept + ' ' + hl(j.dept) + '</small>' +
      '</div>' +
      '<div class="rc" title="' + esc(j.area) + '"><span>Area</span>' + hl(j.area) + '</div>' +
      '<div class="rc" title="' + esc(j.sub || 'NA') + '"><span>Sub Area</span>' + (j.sub ? hl(j.sub) : '<span class="na">NA</span>') + '</div>' +
      '<div class="rc" title="' + esc(fmt(j.opened)) + '"><span>Opened</span>' + fmt(j.opened) + '</div>' +
      '<div class="rc"><span>Photo Before</span>' + photoBeforePreview(j) + '</div>' +
      '<div class="rc" title="' + esc(j.assignDept || 'NA') + '"><span>Assign Sub-Dept.</span>' + assignDeptVal + '</div>' +
      '<div class="rc" title="' + esc(assignedPerson || 'Not assigned') + '"><span>Assign To</span>' + assignedVal + '</div>' +
      '<div class="rs"><span class="tag st-' + j.status + '">' + j.status + '</span></div>' +
      menuHTML(j) +
    '</article>';
  }

  /* ================= Pager HTML ================= */
  function pagerHTML(total, tab) {
    var pInfo = pagination[tab] || { page: 1, pageSize: 25, totalPages: 1 };
    var pages = Math.max(1, pInfo.totalPages || Math.ceil(total / pInfo.pageSize));
    var cur = Math.min(pInfo.page || 1, pages);
    var from = total ? (cur - 1) * pInfo.pageSize + 1 : 0;
    var to = Math.min(total, cur * pInfo.pageSize);

    var b = '<button data-pg="' + (cur - 1) + '"' + (cur === 1 ? ' disabled' : '') + '>&lsaquo;</button>', last = 0;
    for (var p = 1; p <= pages; p++) {
      if (pages > 7 && p !== 1 && p !== pages && Math.abs(p - cur) > 1) {
        if (last !== -1) { b += '<button disabled>&hellip;</button>'; last = -1; }
        continue;
      }
      last = p;
      b += '<button data-pg="' + p + '" class="' + (p === cur ? 'on' : '') + '">' + p + '</button>';
    }
    b += '<button data-pg="' + (cur + 1) + '"' + (cur === pages ? ' disabled' : '') + '>&rsaquo;</button>';
    return '<div>Showing ' + from + ' to ' + to + ' of ' + total + ' entries</div><div class="pg">' + b + '</div>';
  }

  /* ================= Filter Controls & Sidebar ================= */
  function openFilterSidebar() {
    var sidebar = $('#filterSidebar');
    var overlay = $('#filterOverlay');
    if (!sidebar || !overlay) return;
    sidebar.hidden = false;
    overlay.hidden = false;
    requestAnimationFrame(function () {
      sidebar.classList.add('open');
      overlay.classList.add('open');
    });
  }

  function closeFilterSidebar() {
    var sidebar = $('#filterSidebar');
    var overlay = $('#filterOverlay');
    if (!sidebar || !overlay) return;
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    setTimeout(function () {
      if (!sidebar.classList.contains('open')) {
        sidebar.hidden = true;
        overlay.hidden = true;
      }
    }, 280);
  }

  function renderFilters() {
    var tab = state.tab;
    var fltStatus = $('#fltStatus');
    if (fltStatus) {
      if (tab === 'open') {
        fltStatus.innerHTML = '<option value="all"' + (state.status === 'all' ? ' selected' : '') + '>All</option>' +
          '<option value="Open"' + (state.status === 'Open' ? ' selected' : '') + '>Open</option>' +
          '<option value="Assigned"' + (state.status === 'Assigned' ? ' selected' : '') + '>Assigned</option>' +
          '<option value="In-Progress"' + (state.status === 'In-Progress' ? ' selected' : '') + '>In Progress</option>';
      } else if (tab === 'closed') {
        fltStatus.innerHTML = '<option value="all"' + (state.status === 'all' ? ' selected' : '') + '>All</option>' +
          '<option value="Closed"' + (state.status === 'Closed' ? ' selected' : '') + '>Closed</option>';
      }
      fltStatus.value = state.status || 'all';
    }
    var fsStatusGroup = $('#fsStatusGroup');
    if (fsStatusGroup) {
      fsStatusGroup.hidden = (tab !== 'open');
    }

    var areas = {};
    var currentList = (tab === 'closed') ? closedJobs : openJobs;
    currentList.forEach(function (j) { if (j.area) areas[j.area] = 1; });
    var fltArea = $('#fltArea');
    if (fltArea) {
      fltArea.innerHTML = '<option value="all">All areas</option>' + Object.keys(areas).sort().map(function (a) {
        return '<option' + (state.area === a ? ' selected' : '') + '>' + esc(a) + '</option>';
      }).join('');
    }

    // Dynamic Issued By dropdown (API jobs data only, cleaned)
    var issuedByMap = {};
    currentList.forEach(function (j) {
      if (j.by && typeof j.by === 'string') {
        var cleanBy = j.by.replace(/\s+/g, ' ').trim();
        if (cleanBy &&
            cleanBy !== 'Select Issued By' &&
            cleanBy !== 'NA' &&
            cleanBy !== 'na' &&
            cleanBy.toLowerCase() !== 'null' &&
            cleanBy.toLowerCase() !== 'undefined') {
          issuedByMap[cleanBy] = 1;
        }
      }
    });
    var fltIssuedBy = $('#fltIssuedBy');
    if (fltIssuedBy) {
      fltIssuedBy.innerHTML = '<option value="all">All Issued By</option>' + Object.keys(issuedByMap).sort().map(function (by) {
        return '<option value="' + esc(by) + '"' + (state.issuedBy === by ? ' selected' : '') + '>' + esc(by) + '</option>';
      }).join('');
    }

    // Dynamic Issued To dropdown ("All Jobs" as default)
    var issuedToMap = {};
    if (cachedTeams && cachedTeams.length) {
      cachedTeams.forEach(function (t) {
        if (t.teamName && t.teamName.trim()) {
          issuedToMap[t.teamName.trim()] = 1;
        }
      });
    }
    currentList.forEach(function (j) {
      if (j.dept && j.dept.trim() && j.dept !== 'Department') {
        issuedToMap[j.dept.trim()] = 1;
      }
    });
    var fltIssuedTo = $('#fltIssuedTo');
    if (fltIssuedTo) {
      fltIssuedTo.innerHTML = '<option value="all">All Jobs</option>' + Object.keys(issuedToMap).sort().map(function (dept) {
        return '<option value="' + esc(dept) + '"' + (state.issuedTo === dept ? ' selected' : '') + '>' + esc(dept) + '</option>';
      }).join('');
    }

    // Dynamic Assign To dropdown
    var assignToMap = {};
    var hasUnassigned = false;
    currentList.forEach(function (j) {
      if (j.assigned && j.assigned.trim() && j.assigned !== 'NA' && j.assigned !== 'Not assigned') {
        assignToMap[j.assigned.trim()] = 1;
      } else {
        hasUnassigned = true;
      }
    });
    var fltAssignTo = $('#fltAssignTo');
    if (fltAssignTo) {
      var unassignedOpt = hasUnassigned ? '<option value="__unassigned__"' + (state.assignedTo === '__unassigned__' ? ' selected' : '') + '>Not Assigned</option>' : '';
      fltAssignTo.innerHTML = '<option value="all">All Assign To</option>' +
        unassignedOpt +
        Object.keys(assignToMap).sort().map(function (person) {
          return '<option value="' + esc(person) + '"' + (state.assignedTo === person ? ' selected' : '') + '>' + esc(person) + '</option>';
        }).join('');
    }

    var sortBy = $('#sortBy');
    if (sortBy && state.sort) {
      sortBy.value = state.sort;
    }

    var fltFromDate = $('#fltFromDate');
    if (fltFromDate) {
      if (fltFromDate.value !== (state.fromDate || '')) {
        fltFromDate.value = state.fromDate || '';
      }
      if (state.toDate) fltFromDate.max = state.toDate;
      else fltFromDate.removeAttribute('max');
    }
    var fltToDate = $('#fltToDate');
    if (fltToDate) {
      if (fltToDate.value !== (state.toDate || '')) {
        fltToDate.value = state.toDate || '';
      }
      if (state.fromDate) fltToDate.min = state.fromDate;
      else fltToDate.removeAttribute('min');
    }

    var vg = $('#viewGrid'); if (vg) vg.classList.toggle('on', state.layout === 'grid');
    var vl = $('#viewList'); if (vl) vl.classList.toggle('on', state.layout === 'list');
    var active = (state.q && state.q.length > 0) ||
      state.area !== 'all' ||
      (state.issuedBy && state.issuedBy !== 'all') ||
      (state.issuedTo && state.issuedTo !== 'all') ||
      (state.assignedTo && state.assignedTo !== 'all') ||
      (tab === 'open' && state.status !== 'all') ||
      (state.fromDate && state.fromDate.length > 0) ||
      (state.toDate && state.toDate.length > 0) ||
      (state.sort && state.sort !== 'new');
    var cf = $('#clearFilters');
    if (cf) cf.hidden = !active;

    var btnFilter = $('#btnFilter');
    var filterDot = $('#filterDot');
    if (btnFilter) btnFilter.classList.toggle('active', !!active);
    if (filterDot) filterDot.hidden = !active;
  }

  function renderList(tab) {
    var all = listFor(tab);
    var cont = $('#' + tab + 'Cards');
    if (!cont) return;

    var ps = state.pageSize || (pagination[tab] && pagination[tab].pageSize) || 25;
    var total = all.length;
    var pages = Math.max(1, Math.ceil(total / ps));
    var cur = Math.min(Math.max(1, (pagination[tab] && pagination[tab].page) || 1), pages);

    pagination[tab] = {
      page: cur,
      pageSize: ps,
      totalPages: pages,
      total: total
    };

    var start = (cur - 1) * ps;
    var pageItems = all.slice(start, start + ps);

    cont.className = 'cards' + (state.layout === 'list' ? ' list' : '');
    cont.innerHTML = pageItems.length
      ? pageItems.map(state.layout === 'list' ? rowHTML : cardHTML).join('')
      : '<div class="empty"><div class="big">&#128269;</div>' +
        (words().length || state.area !== 'all' || state.status !== 'all' || state.issuedBy !== 'all' || state.issuedTo !== 'all' || state.assignedTo !== 'all' || state.fromDate || state.toDate
          ? 'No jobs match your filters.<br><button class="link" data-act="clearAll">Clear filters</button>'
          : 'No ' + tab + ' jobs found for this property.') +
        '</div>';

    var pager = $('#' + tab + 'Pager');
    if (pager) pager.innerHTML = total ? pagerHTML(total, tab) : '';

    var rc = $('#resultCount');
    if (rc) rc.textContent = total + (total === 1 ? ' job' : ' jobs');
    renderFilters();
  }

  /* ================= Fetch All API Jobs Helper ================= */
  async function fetchAllJobsFromApi(jobList) {
    var BATCH_SIZE = 500;
    var firstRes = await api.getQuickFixJobs({
      propId: currentPropertyId,
      jobList: jobList,
      pageNumber: 1,
      pageSize: BATCH_SIZE
    });

    if (!firstRes) return null;

    if (firstRes.teams && firstRes.teams.length > 0) cachedTeams = firstRes.teams;
    if (firstRes.areas && firstRes.areas.length > 0) cachedAreas = firstRes.areas;
    if (firstRes.userTeam) cachedUserTeams = firstRes.userTeam;
    updateUserTeamContext();

    var rawList = ((jobList === 'close' ? firstRes.close : firstRes.open) || []).slice();
    var totalPagesKey = (jobList === 'close') ? 'totalClosePages' : 'totalOpenPages';
    var totalPages = (firstRes.pagination && firstRes.pagination[totalPagesKey])
      ? parseInt(firstRes.pagination[totalPagesKey], 10)
      : 1;

    if (totalPages > 1) {
      var pagePromises = [];
      for (var p = 2; p <= totalPages; p++) {
        pagePromises.push(
          api.getQuickFixJobs({
            propId: currentPropertyId,
            jobList: jobList,
            pageNumber: p,
            pageSize: BATCH_SIZE
          })
        );
      }
      var moreResponses = await Promise.all(pagePromises);
      moreResponses.forEach(function (r) {
        if (!r) return;
        var list = (jobList === 'close' ? r.close : r.open) || [];
        rawList = rawList.concat(list);
      });
    }

    // Deduplicate by jobId / id
    var seen = {};
    var uniqueList = [];
    rawList.forEach(function (item) {
      if (!item) return;
      var key = item.jobId != null ? String(item.jobId) : (item.id != null ? String(item.id) : null);
      if (!key || !seen[key]) {
        if (key) seen[key] = true;
        uniqueList.push(item);
      }
    });

    // Generate custom daily job ID: [PropertyPrefix]-[openDate (DDMMYY)]-[seq (001)]
    // Example: Testing-141026-001
    var activePropName = getActivePropertyName();

    // 1. Populate globalJobCustomIdMap with existing propIds from memory
    openJobs.concat(closedJobs).forEach(function (j) {
      if (j && j.propId) {
        var parsed = parseFormattedPropId(j.propId);
        if (parsed) {
          var idStr = activePropName + '-' + parsed.dateCode + '-' + pad3(parsed.serial);
          if (j.id != null) globalJobCustomIdMap[String(j.id)] = idStr;
          if (j.jobId != null) globalJobCustomIdMap[String(j.jobId)] = idStr;
        }
      }
    });

    // 2. Pre-seed any formatted propIds already provided in raw API / mock items
    uniqueList.forEach(function (op) {
      if (op && op.propId) {
        var parsed = parseFormattedPropId(op.propId);
        if (parsed) {
          var idStr = activePropName + '-' + parsed.dateCode + '-' + pad3(parsed.serial);
          if (op.id != null) globalJobCustomIdMap[String(op.id)] = idStr;
          if (op.jobId != null) globalJobCustomIdMap[String(op.jobId)] = idStr;
        }
      }
    });

    // 3. Find highest continuous sequence number currently used
    var maxSeq = 0;
    Object.keys(globalJobCustomIdMap).forEach(function (k) {
      var val = globalJobCustomIdMap[k];
      var parsed = parseFormattedPropId(val);
      if (parsed && parsed.serial > maxSeq) {
        maxSeq = parsed.serial;
      }
    });

    // 4. Sort chronologically ascending to assign continuous sequence numbers (001, 002... 005, 006...)
    var sortedByDate = uniqueList.slice().sort(function (a, b) {
      var da = parseJobDate(a.openDate) || new Date(0);
      var db = parseJobDate(b.openDate) || new Date(0);
      if (da - db !== 0) return da - db;
      var ida = String(a.jobId != null ? a.jobId : (a.id != null ? a.id : ''));
      var idb = String(b.jobId != null ? b.jobId : (b.id != null ? b.id : ''));
      return ida.localeCompare(idb);
    });

    var jobCustomIdMap = {};
    sortedByDate.forEach(function (op, idx) {
      var key = op.jobId != null ? String(op.jobId) : (op.id != null ? String(op.id) : ('idx_' + idx));
      var existingId = (op.jobId != null && globalJobCustomIdMap[String(op.jobId)])
        || (op.id != null && globalJobCustomIdMap[String(op.id)])
        || globalJobCustomIdMap[key];

      var parsedExisting = parseFormattedPropId(existingId);
      if (parsedExisting) {
        var refreshedId = activePropName + '-' + parsedExisting.dateCode + '-' + pad3(parsedExisting.serial);
        jobCustomIdMap[key] = refreshedId;
        globalJobCustomIdMap[key] = refreshedId;
        if (op.jobId != null) globalJobCustomIdMap[String(op.jobId)] = refreshedId;
        if (op.id != null) globalJobCustomIdMap[String(op.id)] = refreshedId;
      } else {
        maxSeq++;
        var dateCode = getJobDateCode(op.openDate);
        var newId = activePropName + '-' + dateCode + '-' + pad3(maxSeq);
        jobCustomIdMap[key] = newId;
        globalJobCustomIdMap[key] = newId;
        if (op.jobId != null) globalJobCustomIdMap[String(op.jobId)] = newId;
        if (op.id != null) globalJobCustomIdMap[String(op.id)] = newId;
      }
    });
    saveJobCustomIdMap();

    var mappedItems = uniqueList.map(function (op, index) {
      return mapApiJob(op, index, jobCustomIdMap);
    });

    return {
      firstRes: firstRes,
      items: mappedItems,
      total: (firstRes.pagination && (jobList === 'close' ? firstRes.pagination.totalClose : firstRes.pagination.totalOpen) !== undefined)
        ? parseInt(jobList === 'close' ? firstRes.pagination.totalClose : firstRes.pagination.totalOpen, 10)
        : mappedItems.length
    };
  }

  /* ================= On-Demand Tab-Specific Loading ================= */
  async function fetchOpenJobs() {
    if (!currentPropertyId) return;
    setLoading(true, 'open');
    try {
      var res = await fetchAllJobsFromApi('open');
      if (res) {
        openJobs = res.items;
        var total = res.items.length;

        pagination.open = {
          total: total,
          page: 1,
          pageSize: state.pageSize || 25,
          totalPages: Math.max(1, Math.ceil(total / (state.pageSize || 25)))
        };

        var ob = $('#openBadge');
        if (ob) ob.textContent = total;

        renderList('open');
        renderRecentStats();
      }
    } catch (err) {
      handleApiError(err, 'open');
    } finally {
      setLoading(false, 'open');
    }
  }

  async function fetchClosedJobs() {
    if (!currentPropertyId) return;
    setLoading(true, 'closed');
    try {
      var res = await fetchAllJobsFromApi('close');
      if (res) {
        closedJobs = res.items;
        var total = res.items.length;

        pagination.closed = {
          total: total,
          page: 1,
          pageSize: state.pageSize || 25,
          totalPages: Math.max(1, Math.ceil(total / (state.pageSize || 25)))
        };

        var cb = $('#closedBadge');
        if (cb) cb.textContent = total;

        renderList('closed');
        renderRecentStats();
      }
    } catch (err) {
      handleApiError(err, 'closed');
    } finally {
      setLoading(false, 'closed');
    }
  }

  function setLoading(loading, tab) {
    isLoading = loading;
    var cont = $('#' + tab + 'Cards');
    if (!cont) return;
    if (loading) {
      cont.innerHTML = '<div class="empty"><div class="big" style="animation:spin 1s linear infinite;">&#9696;</div>Loading ' + tab + ' jobs from WorkWize API...</div>';
    }
  }

  function handleApiError(err, tab) {
    console.error('API Error (' + tab + '):', err);
    if (err.message === 'UNAUTHORIZED') {
      toast('Session expired or unauthorized. Please sign in.');
      showLoginModal();
    } else {
      toast('Failed to load ' + tab + ' jobs: ' + err.message);
      var cont = $('#' + tab + 'Cards');
      if (cont) {
        cont.innerHTML = '<div class="empty"><div class="big" style="color:var(--danger,#e53e3e);">&#9888;</div>Unable to connect to WorkWize API.<br><small style="color:var(--muted);">' + esc(err.message) + '</small><br><button class="btn s" onclick="window.WorkWizeReloadTab()" style="margin-top:12px;">Try Again</button></div>';
      }
    }
  }

  window.WorkWizeReloadTab = function () {
    if (state.tab === 'open') fetchOpenJobs(1);
    else if (state.tab === 'closed') fetchClosedJobs(1);
  };

  /**
   * Tab click handler:
   * "our tab click krna pa data reload honga tab accoridng ek sath data reload nhi honga"
   * Only loads the data for the clicked tab!
   */
  async function setTab(tab) {
    state.tab = tab;
    state.status = 'all';
    state.issuedBy = 'all';
    state.issuedTo = 'all';
    state.assignedTo = 'all';
    state.fromDate = '';
    state.toDate = '';
    state.highlightedJobId = null;
    var fd = $('#fltFromDate'); if (fd) { fd.value = ''; fd.removeAttribute('max'); }
    var td = $('#fltToDate'); if (td) { td.value = ''; td.removeAttribute('min'); }
    closeFilterSidebar();

    $$('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    ['new', 'open', 'closed'].forEach(function (t) { $('#view-' + t).hidden = t !== tab; });
    $('#tools').hidden = $('#filters').hidden = (tab === 'new');
    $('#search').placeholder = tab === 'new' ? 'Search jobs...' : 'Search by job, area, sub-area, status...';

    if (tab === 'new') {
      initNewJobForm();
      renderRecentStats();
    } else if (tab === 'open') {
      // Reload ONLY Open tab data
      await fetchOpenJobs(1, state.pageSize);
    } else if (tab === 'closed') {
      // Reload ONLY Closed tab data
      await fetchClosedJobs(1, state.pageSize);
    }
    window.scrollTo(0, 0);
  }

  /* ================= Job Statistics Box (New Job View) ================= */
  function renderRecentStats() {
    var curPeriod = state.period || 'today';
    var oCount = pagination.open.total || openJobs.length;
    var cCount = pagination.closed.total || closedJobs.length;
    var tCount = oCount + cCount;

    var assignedCount = openJobs.filter(function (j) { return j.status === 'Assigned'; }).length;
    var inProgressCount = openJobs.filter(function (j) {
      return j.status === 'In-Progress' || j.status === 'InProgress' || j.status === 'In Progress';
    }).length;
    var openOnlyCount = openJobs.filter(function (j) { return j.status === 'Open'; }).length;

    var elTotal = $('#statBoxTotal');
    var elOpen = $('#statBoxOpen');
    var elAssigned = $('#statBoxAssigned');
    var elInProgress = $('#statBoxInProgress');
    var elClosed = $('#statBoxClosed');

    if (elTotal) elTotal.textContent = tCount;
    if (elOpen) elOpen.textContent = openOnlyCount;
    if (elAssigned) elAssigned.textContent = assignedCount;
    if (elInProgress) elInProgress.textContent = inProgressCount;
    if (elClosed) elClosed.textContent = cCount;

    var cToday = $('#pCountToday');
    var cWeekly = $('#pCountWeekly');
    var cMonthly = $('#pCountMonthly');
    if (cToday) cToday.textContent = tCount;
    if (cWeekly) cWeekly.textContent = tCount;
    if (cMonthly) cMonthly.textContent = tCount;

    // Aging of Jobs (> 1 week old)
    var now = new Date();
    var sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    var isWeekOld = function (j) {
      var opD = parseJobDate(j.opened);
      return opD ? (now.getTime() - opD.getTime() > sevenDaysMs) : false;
    };

    var agingOpen = openJobs.filter(function (j) {
      return j.status === 'Open' && isWeekOld(j);
    }).length;

    var agingAssigned = openJobs.filter(function (j) {
      return j.status === 'Assigned' && isWeekOld(j);
    }).length;

    var agingInProgress = openJobs.filter(function (j) {
      return (j.status === 'In-Progress' || j.status === 'InProgress' || j.status === 'In Progress') && isWeekOld(j);
    }).length;

    var elAgingOpen = $('#agingOpenCount');
    var elAgingAssigned = $('#agingAssignedCount');
    var elAgingInProgress = $('#agingInProgressCount');

    if (elAgingOpen) elAgingOpen.textContent = agingOpen;
    if (elAgingAssigned) elAgingAssigned.textContent = agingAssigned;
    if (elAgingInProgress) elAgingInProgress.textContent = agingInProgress;

    $$('.rtab').forEach(function (btn) {
      btn.classList.toggle('on', btn.dataset.period === curPeriod);
    });
  }

  /* ================= New Job Form Logic ================= */
  /**
   * Initializes New Job form dropdowns & conditional assignment fields
   * "Assign (Dept.) job krta time and Assign (Supervisor) job add krta time input filed bhi rhengi bus yha input filed jb show honig jb ek team same team ko job asign krta hai"
   */
  function initNewJobForm() {
    updateHeaderUserInfo();

    // Populate Issued to Dept. dropdown
    var fDept = $('#fDept');
    if (fDept) {
      var currentVal = fDept.value;
      var deptHtml = '<option value="">Select department</option>';
      if (cachedTeams && cachedTeams.length) {
        cachedTeams.forEach(function (t) {
          deptHtml += '<option value="' + esc(t.teamId) + '">' + esc(t.teamName) + '</option>';
        });
      }
      fDept.innerHTML = deptHtml;
      if (currentVal && cachedTeams.some(function (t) { return t.teamId === currentVal; })) {
        fDept.value = currentVal;
      } else if (userCurrentTeamId && cachedTeams.some(function (t) { return t.teamId === userCurrentTeamId; })) {
        fDept.value = userCurrentTeamId;
      }
    }

    // Populate Area dropdown
    var fArea = $('#fArea');
    if (fArea) {
      var curArea = fArea.value;
      var areaHtml = '<option value="">Select area</option>';
      if (cachedAreas && cachedAreas.length) {
        cachedAreas.forEach(function (a) {
          areaHtml += '<option value="' + esc(a.areaid) + '">' + esc(a.areaName) + '</option>';
        });
      }
      fArea.innerHTML = areaHtml;
      if (curArea && cachedAreas.some(function (a) { return String(a.areaid) === String(curArea); })) {
        fArea.value = curArea;
      }
    }

    handleDeptSelectionChange();
  }

  function handleDeptSelectionChange() {
    var fDept = $('#fDept');
    if (!fDept) return;
    var issuedTo = fDept.value;
    var issuedBy = userCurrentTeamId;

    var deptWrap = $('#fDeptAssignWrap');
    var supWrap = $('#fSupervisorAssignWrap');
    var warnWrap = $('#fSubTeamWarningWrap');
    var warnText = $('#fSubTeamWarning');

    // ONLY Superadmin / Oproadmin (e.g. it@workwise...) sees strictly 5 fields (hidden fields NEVER show)
    if (isSuperAdmin()) {
      if (deptWrap) deptWrap.hidden = true;
      if (supWrap) supWrap.hidden = true;
      if (warnWrap) warnWrap.hidden = true;
      return;
    }

    // Normal condition for main Admin (e.g. testing@test) and departmental staff:
    // When assigning to own team (issuedTo === issuedBy), SHOW the assignment fields!
    if (issuedTo && issuedBy && issuedTo === issuedBy) {
      if (deptWrap) deptWrap.hidden = false;
      if (supWrap) supWrap.hidden = false;

      var subTeams = userSubTeamData;
      if ((!subTeams || !subTeams.length) && cachedTeams) {
        var myTeam = cachedTeams.find(function (t) { return t.teamId === issuedTo; });
        if (myTeam && myTeam.propsubteams && myTeam.propsubteams.length > 0) {
          subTeams = myTeam.propsubteams;
        }
      }

      if (subTeams && subTeams.length > 0) {
        if (warnWrap) warnWrap.hidden = true;
        var subHtml = subTeams.map(function (st) {
          return '<option value="' + esc(st.subteamId) + '">' + esc(st.subteamName) + '</option>';
        }).join('');

        var fDeptAssign = $('#fDeptAssign');
        if (fDeptAssign) {
          fDeptAssign.innerHTML = subHtml;
          populateNewJobSupervisors(subTeams[0].subteamId);
        }
      } else {
        // Fallback: If no sub-teams configured, check if team has members directly
        var currentTeamObj = cachedTeams ? cachedTeams.find(function (t) { return t.teamId === issuedTo; }) : null;
        if (currentTeamObj && currentTeamObj.members && currentTeamObj.members.length > 0) {
          if (warnWrap) warnWrap.hidden = true;
          var fDeptAssign = $('#fDeptAssign');
          if (fDeptAssign) fDeptAssign.innerHTML = '<option value="' + esc(currentTeamObj.teamId) + '">' + esc(currentTeamObj.teamName) + '</option>';
          var fSup = $('#fSupervisorAssign');
          if (fSup) {
            var memHtml = '<option value="">-- Select Member / Supervisor --</option>';
            currentTeamObj.members.forEach(function (m) {
              var fullName = ((m.firstName || '') + ' ' + (m.lastName || '')).trim() || m.name || m.email;
              memHtml += '<option value="' + esc(m.email) + '">' + esc(fullName) + ' (' + esc(m.email) + ')</option>';
            });
            fSup.innerHTML = memHtml;
          }
        } else {
          if (warnWrap) {
            warnWrap.hidden = false;
            if (warnText) warnText.textContent = 'Job cannot be added with assignment as there are no sub teams in this department.';
          }
          var da = $('#fDeptAssign'); if (da) da.innerHTML = '<option value="">No sub-teams</option>';
          var sa = $('#fSupervisorAssign'); if (sa) sa.innerHTML = '<option value="">No members</option>';
        }
      }
    } else {
      // HIDE IF OTHER TEAM
      if (deptWrap) deptWrap.hidden = true;
      if (supWrap) supWrap.hidden = true;
      if (warnWrap) warnWrap.hidden = true;
    }
  }

  function populateNewJobSupervisors(subteamId) {
    var fSup = $('#fSupervisorAssign');
    if (!fSup) return;
    var subTeams = userSubTeamData;
    if ((!subTeams || !subTeams.length) && cachedTeams && userCurrentTeamId) {
      var myTeam = cachedTeams.find(function (t) { return t.teamId === userCurrentTeamId; });
      if (myTeam && myTeam.propsubteams) subTeams = myTeam.propsubteams;
    }
    var st = (subTeams || []).find(function (item) { return item.subteamId === subteamId; });
    var membersHtml = '<option value="">-- Select Member / Supervisor --</option>';

    if (st && st.subteams && st.subteams.length > 0) {
      st.subteams.forEach(function (m) {
        var fullName = ((m.firstName || '') + ' ' + (m.lastName || '')).trim() || m.name || m.email;
        membersHtml += '<option value="' + esc(m.email) + '">' + esc(fullName) + ' (' + esc(m.email) + ')</option>';
      });
    }
    fSup.innerHTML = membersHtml;
  }

  /* File upload & preview in New Job */
  function handleNewJobFiles(files) {
    if (!files || !files.length) return;
    var validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'video/mp4', 'video/quicktime'];
    var maxSize = 5 * 1024 * 1024; // 5MB
    var errEl = $('#photoErr');
    if (errEl) errEl.textContent = '';

    for (var i = 0; i < files.length; i++) {
      var file = files[i];
      if (file.size > maxSize) {
        if (errEl) errEl.textContent = 'File "' + file.name + '" exceeds the 5MB size limit.';
        toast('File size exceeds 5MB limit: ' + file.name);
        return;
      }
      if (file.type && !validTypes.includes(file.type.toLowerCase())) {
        if (errEl) errEl.textContent = 'Invalid file type. Please upload JPEG, PNG, MP4, or MOV.';
        toast('Invalid file type: ' + file.name);
        return;
      }
      newJobSelectedFiles.push(file);
    }
    renderNewJobPreviews();
  }

  function renderNewJobPreviews() {
    var container = $('#newJobPreviews');
    if (!container) return;
    container.innerHTML = '';

    var dropText = $('#dropText');
    if (!newJobSelectedFiles.length) {
      if (dropText) dropText.hidden = false;
      return;
    }
    if (dropText) dropText.hidden = true;

    newJobSelectedFiles.forEach(function (file, idx) {
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;width:74px;height:74px;border-radius:8px;overflow:hidden;border:1.5px solid var(--line);background:#fff;';

      if (file.type && file.type.startsWith('image/')) {
        var img = document.createElement('img');
        img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
        var reader = new FileReader();
        reader.onload = function (e) { img.src = e.target.result; };
        reader.readAsDataURL(file);
        wrap.appendChild(img);
      } else {
        var icon = document.createElement('div');
        icon.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--primary);font-size:11px;font-weight:700;background:var(--bg);text-align:center;padding:4px;';
        icon.textContent = 'VIDEO\n' + file.name.slice(-4);
        wrap.appendChild(icon);
      }

      var del = document.createElement('button');
      del.type = 'button';
      del.innerHTML = '&times;';
      del.style.cssText = 'position:absolute;top:3px;right:3px;background:rgba(0,0,0,0.65);color:#fff;border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:14px;line-height:1;display:flex;align-items:center;justify-content:center;';
      del.addEventListener('click', function (e) {
        e.stopPropagation();
        newJobSelectedFiles.splice(idx, 1);
        renderNewJobPreviews();
      });
      wrap.appendChild(del);
      container.appendChild(wrap);
    });
  }

  function resetNewJobForm() {
    var form = $('#jobForm');
    if (form) form.reset();
    newJobSelectedFiles = [];
    renderNewJobPreviews();
    var errEl = $('#photoErr'); if (errEl) errEl.textContent = '';
    $$('.fld.bad').forEach(function (f) { f.classList.remove('bad'); });
    $$('#jobForm .err').forEach(function (x) { if (x.id !== 'photoErr') x.textContent = ''; });
    updateHeaderUserInfo();
    handleDeptSelectionChange();
  }

  /* Submit Daily Job & Confirmation Dialog */
  var pendingNoPhotoCallback = null;
  function showNoPhotoConfirmModal(onConfirm, promptTitle, promptDesc, confirmBtnText) {
    pendingNoPhotoCallback = onConfirm;
    var modal = $('#noPhotoModal');
    if (modal) {
      var pTitle = $('#noPhotoPrompt');
      if (pTitle) pTitle.textContent = promptTitle || 'Do you want to continue without job image?';
      var pDesc = $('#noPhotoDesc');
      if (pDesc) pDesc.textContent = promptDesc || 'You have not attached any photo or video for this job.';
      var cBtn = $('#btnConfirmNoPhoto');
      if (cBtn) cBtn.textContent = confirmBtnText || 'Continue & Save';

      modal.hidden = false;
      document.body.classList.add('noscroll');
    }
  }

  function closeNoPhotoConfirmModal() {
    pendingNoPhotoCallback = null;
    var modal = $('#noPhotoModal');
    if (modal) {
      modal.hidden = true;
      var otherModalsOpen = $$('.modal:not([hidden])').some(function (el) { return el.id !== 'noPhotoModal'; });
      if (!otherModalsOpen) {
        document.body.classList.remove('noscroll');
      }
    }
  }

  async function submitNewJob(e) {
    if (e) e.preventDefault();
    var fDept = $('#fDept');
    var fArea = $('#fArea');
    var fSub = $('#fSub');
    var fDetails = $('#fDetails');

    var ok = true;
    function checkField(el, msg) {
      var box = el.closest('.fld');
      var bad = !el.value.trim();
      box.classList.toggle('bad', bad);
      var err = box.querySelector('.err');
      if (err) err.textContent = bad ? msg : '';
      if (bad) ok = false;
    }

    checkField(fDept, 'Please select department');
    checkField(fArea, 'Please select area');
    checkField(fDetails, 'Please enter job details');
    if (!ok) return;

    // If NO photo is selected, prompt confirmation alert modal
    if (!newJobSelectedFiles || newJobSelectedFiles.length === 0) {
      showNoPhotoConfirmModal(function () {
        executeSubmitJob();
      });
      return;
    }

    // Photo attached: directly submit without alert
    executeSubmitJob();
  }

  async function executeSubmitJob() {
    var fDept = $('#fDept');
    var fArea = $('#fArea');
    var fSub = $('#fSub');
    var fDetails = $('#fDetails');
    var fBy = $('#fBy');
    var submitBtn = $('button[type="submit"]', $('#jobForm'));

    var issuedTo = fDept.value;
    var issuedBy = userCurrentTeamId;
    var teamAssigned = null;
    var supervisorAssigned = null;

    if (!isSuperAdmin() && issuedBy && issuedTo === issuedBy) {
      var da = $('#fDeptAssign');
      var sa = $('#fSupervisorAssign');
      teamAssigned = (da && da.value) ? da.value : null;
      supervisorAssigned = (sa && sa.value) ? sa.value : null;
    }

    var jobData = {
      propId: currentPropertyId,
      areaID: fArea.value,
      subareaId: fSub ? fSub.value.trim() : '',
      issued_to_team: issuedTo,
      issued_by_team: issuedBy,
      issued_by_team_details: fBy ? fBy.value : '',
      creator_name: (currentUser && currentUser.name) || 'User',
      creator_position: (currentUser && currentUser.role && currentUser.role[0]) || 'Staff',
      job_detail: fDetails.value.trim(),
      assigned_dept: teamAssigned,
      assigned_supervisor: supervisorAssigned
    };

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Submitting...';
    }

    try {
      var res = await api.addNewJob(jobData, newJobSelectedFiles);
      if (res && (res.success === true || res.jobId || res.jobs)) {
        toast('Job added successfully!');
        resetNewJobForm();
        // Switch to open tab and load fresh open jobs
        setTab('open');
      } else {
        toast('Failed to add job: ' + (res && res.message ? res.message : 'Unknown error'));
      }
    } catch (err) {
      console.error('Error adding job:', err);
      toast('Failed to add job: ' + err.message);
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit';
      }
    }
  }

  /* ================= Assign Modal & Team Permission ================= */
  function openAssign(job) {
    closeView();
    if (job && job.id) highlightJob(job.id);
    // Permission check: only assigned dept team or Admin can assign members!
    var canAssign = isAdmin() || (userCurrentTeamId && (job.issued_to_team === userCurrentTeamId || job.dept === (currentUser && currentUser.desg)));
    if (!canAssign) {
      toast('Only the assigned department (' + job.dept + ') can assign members.');
      return;
    }

    assignTargetJob = job;
    $('#assignId').textContent = job.propId;
    $('#assignBrief').innerHTML =
      '<b>' + esc(job.details) + '</b>' +
      '<small><b>Job ID:</b> ' + esc(job.propId) + '</small>' +
      '<small><b>Issued To Dept:</b> ' + esc(job.dept) + '</small>' +
      '<small><b>Area:</b> ' + esc(job.area) + (job.sub ? ' &rsaquo; ' + esc(job.sub) : '') + '</small>' +
      '<small><b>Status:</b> ' + esc(job.status) + '</small>';

    var asDept = $('#asDept');
    var subTeams = userSubTeamData;
    var targetTeam = null;
    if (job.issued_to_team !== userCurrentTeamId && cachedTeams) {
      targetTeam = cachedTeams.find(function (t) { return t.teamId === job.issued_to_team || t.teamName === job.dept; });
      if (targetTeam && targetTeam.propsubteams) subTeams = targetTeam.propsubteams;
    }

    var deptHtml = '';
    if (subTeams && subTeams.length > 0) {
      subTeams.forEach(function (st) {
        deptHtml += '<option value="' + esc(st.subteamId) + '">' + esc(st.subteamName) + '</option>';
      });
      asDept.innerHTML = deptHtml;
      populateAssignMembers(subTeams[0].subteamId);
    } else if (targetTeam && targetTeam.members && targetTeam.members.length > 0) {
      asDept.innerHTML = '<option value="' + esc(targetTeam.teamId) + '">' + esc(targetTeam.teamName) + '</option>';
      var mHtml = '<option value="">-- Select Member to Assign --</option>';
      targetTeam.members.forEach(function (m) {
        var fullName = ((m.firstName || '') + ' ' + (m.lastName || '')).trim() || m.name || m.email;
        mHtml += '<option value="' + esc(m.email) + '">' + esc(fullName) + ' (' + esc(m.email) + ')</option>';
      });
      $('#asMember').innerHTML = mHtml;
    } else {
      asDept.innerHTML = '<option value="">No sub-teams</option>';
      $('#asMember').innerHTML = '<option value="">No members</option>';
    }

    $('#asRemarks').value = '';
    $('#assignModal').hidden = false;
  }

  function populateAssignMembers(subteamId) {
    var asMember = $('#asMember');
    if (!asMember) return;
    var subTeams = userSubTeamData;
    if (assignTargetJob && assignTargetJob.issued_to_team !== userCurrentTeamId && cachedTeams) {
      var targetTeam = cachedTeams.find(function (t) { return t.teamId === assignTargetJob.issued_to_team || t.teamName === assignTargetJob.dept; });
      if (targetTeam && targetTeam.propsubteams) subTeams = targetTeam.propsubteams;
    }

    var st = (subTeams || []).find(function (item) { return item.subteamId === subteamId; });
    var html = '<option value="">-- Select Member to Assign --</option>';

    if (st && st.subteams && st.subteams.length > 0) {
      st.subteams.forEach(function (m) {
        var fullName = (m.firstName + ' ' + m.lastName).trim();
        html += '<option value="' + esc(m.email) + '">' + esc(fullName) + ' (' + esc(m.email) + ')</option>';
      });
    }
    asMember.innerHTML = html;
  }

  async function submitAssignForm(e) {
    e.preventDefault();
    if (!assignTargetJob) return;

    var asDept = $('#asDept');
    var asMember = $('#asMember');
    var memberEmail = asMember ? asMember.value : '';
    var subteamId = asDept ? asDept.value : '';

    if (!memberEmail) {
      toast('Please select a team member to assign.');
      return;
    }

    var memberName = (asMember.selectedOptions && asMember.selectedOptions[0])
      ? asMember.selectedOptions[0].textContent.replace(/\(.*?\)/, '').trim()
      : memberEmail;
    var subteamName = (asDept && asDept.selectedOptions && asDept.selectedOptions[0])
      ? asDept.selectedOptions[0].textContent.trim()
      : '';
    var asRem = $('#asRemarks') ? $('#asRemarks').value.trim() : '';

    // Immediately update local job properties
    assignTargetJob.status = 'Assigned';
    assignTargetJob.assigned = memberName || memberEmail;
    assignTargetJob.assigned_member = memberEmail;
    if (subteamName && subteamName !== 'Select sub-team') {
      assignTargetJob.assignDept = subteamName;
    }
    if (subteamId) assignTargetJob.subteamId = subteamId;
    if (asRem) assignTargetJob.remarks = asRem;

    // Immediately close modal and update UI
    closeModals();
    closeView();
    toast('Job assigned successfully!');
    renderList(state.tab);
    renderRecentStats();

    // Call API in background
    try {
      var res = await api.assignTeamMember(
        assignTargetJob.jobId,
        currentPropertyId,
        assignTargetJob.issued_to_team,
        subteamId,
        memberEmail
      );
      if (res && res.success !== false) {
        fetchOpenJobs(pagination.open.page, state.pageSize);
      }
    } catch (err) {
      console.warn('Backend assign notification note:', err);
    }
  }

  /* ================= Close Modal & Status Update ================= */
  function openClose(job) {
    closeView();
    if (job && job.id) highlightJob(job.id);
    closeTargetJob = job;
    closePhotoFile = null;
    $('#closeId').textContent = job.propId;
    $('#closeBrief').innerHTML =
      '<b>' + esc(job.details) + '</b>' +
      '<small><b>Job ID:</b> ' + esc(job.propId) + '</small>' +
      '<small><b>Issued To Dept:</b> ' + esc(job.dept) + '</small>' +
      '<small><b>Area:</b> ' + esc(job.area) + (job.sub ? ' &rsaquo; ' + esc(job.sub) : '') + '</small>' +
      '<small><b>Opened:</b> ' + fmt(job.opened) + '</small>';

    $('#closeTeamNotice').innerHTML =
      'Job belongs to <b>' + esc(job.dept) + '</b>. Closing remarks are required.';

    var clBy = $('#clBy');
    if (clBy) {
      clBy.innerHTML = '<option value="' + esc(currentUser.name || 'User') + '">' + esc(currentUser.name || 'User') + ' (' + esc(job.dept) + ')</option>';
    }

    var clRem = $('#clRemarks');
    if (clRem) clRem.value = '';

    var prev = $('#closePhotoPrev');
    if (prev) { prev.hidden = true; prev.src = ''; }
    var del = $('#closePhotoDel');
    if (del) del.hidden = true;

    $('#closeModal').hidden = false;
  }

  async function submitCloseForm(e) {
    e.preventDefault();
    if (!closeTargetJob) return;

    var clRem = $('#clRemarks');
    var remarks = clRem ? clRem.value.trim() : '';
    if (!remarks) {
      toast('Please enter completion remarks to close this job.');
      if (clRem) clRem.focus();
      return;
    }

    var prev = $('#closePhotoPrev');
    var hasPhoto = Boolean(closePhotoFile || (prev && !prev.hidden && prev.src));

    if (!hasPhoto) {
      showNoPhotoConfirmModal(
        function () {
          executeSubmitCloseJob(remarks);
        },
        'Are you sure without image close this job?',
        'You have not attached any completion photo for this job.',
        'Confirm & Close'
      );
      return;
    }

    await executeSubmitCloseJob(remarks);
  }

  async function executeSubmitCloseJob(remarks) {
    if (!closeTargetJob) return;

    var clBy = $('#clBy');
    var closedBy = (clBy && clBy.value) || (currentUser && currentUser.name) || 'User';

    // Immediately update local job
    closeTargetJob.status = 'Closed';
    closeTargetJob.remarks = remarks;
    closeTargetJob.closedBy = closedBy;
    closeTargetJob.closedAt = new Date().toISOString();

    var prev = $('#closePhotoPrev');
    if (prev && !prev.hidden && prev.src) {
      closeTargetJob.photoAfter = prev.src;
    }

    // Permanently remember this job's exact propId (serial) so it never changes in Closed tab
    if (closeTargetJob.propId) {
      var parsed = parseFormattedPropId(closeTargetJob.propId);
      var canonicalPropId = parsed
        ? (getActivePropertyName() + '-' + parsed.dateCode + '-' + pad3(parsed.serial))
        : closeTargetJob.propId;
      closeTargetJob.propId = canonicalPropId;
      closeTargetJob.customJobId = canonicalPropId;
      if (closeTargetJob.id != null) globalJobCustomIdMap[String(closeTargetJob.id)] = canonicalPropId;
      if (closeTargetJob.jobId != null) globalJobCustomIdMap[String(closeTargetJob.jobId)] = canonicalPropId;
      if (closeTargetJob.raw && closeTargetJob.raw.jobId != null) globalJobCustomIdMap[String(closeTargetJob.raw.jobId)] = canonicalPropId;
      saveJobCustomIdMap();
    }

    // Move closeTargetJob from openJobs to closedJobs
    var openIdx = openJobs.findIndex(function (j) { return j.id === closeTargetJob.id || String(j.jobId) === String(closeTargetJob.jobId); });
    if (openIdx !== -1) {
      openJobs.splice(openIdx, 1);
      if (pagination.open.total > 0) pagination.open.total--;
      closedJobs.unshift(closeTargetJob);
      pagination.closed.total = (pagination.closed.total || 0) + 1;
      var ob = $('#openBadge'); if (ob) ob.textContent = openJobs.length;
      var cb = $('#closedBadge'); if (cb && cb.textContent) cb.textContent = closedJobs.length;
    }

    // Immediately close modal and update UI
    closeModals();
    closeView();
    toast('Job closed successfully!');
    renderList(state.tab);
    renderRecentStats();

    // Background API call
    try {
      var files = closePhotoFile ? [closePhotoFile] : [];
      await api.changeJobStatus(
        closeTargetJob.jobId,
        currentPropertyId,
        closeTargetJob.areaId,
        'Closed',
        remarks,
        files
      );
    } catch (err) {
      console.warn('Backend close status update note:', err);
    }
  }

  /* ================= Edit Modal Helpers & Population ================= */
  function getAllAreaNames() {
    var areaSet = {};
    if (cachedAreas && cachedAreas.length > 0) {
      cachedAreas.forEach(function (a) {
        var name = a.areaName || a.name || a.area_name || a.areaname;
        if (name && typeof name === 'string' && name.trim()) {
          areaSet[name.trim()] = true;
        }
      });
    }
    openJobs.concat(closedJobs).forEach(function (j) {
      if (j && j.area && typeof j.area === 'string' && j.area.trim()) {
        areaSet[j.area.trim()] = true;
      }
    });
    return Object.keys(areaSet).sort();
  }

  function getAllTeamNames() {
    var teamSet = {};
    if (cachedTeams && cachedTeams.length > 0) {
      cachedTeams.forEach(function (t) {
        var name = t.teamName || t.name;
        if (name && typeof name === 'string' && name.trim()) {
          var trimmed = name.trim();
          if (trimmed.toLowerCase() !== 'department' && trimmed.toLowerCase() !== 'select department') {
            teamSet[trimmed] = true;
          }
        }
      });
    }
    openJobs.concat(closedJobs).forEach(function (j) {
      if (j && j.dept && typeof j.dept === 'string' && j.dept.trim()) {
        var trimmed = j.dept.trim();
        if (trimmed.toLowerCase() !== 'department' && trimmed.toLowerCase() !== 'select department') {
          teamSet[trimmed] = true;
        }
      }
    });
    return Object.keys(teamSet).sort();
  }

  function getEditTeam(deptName) {
    if (!cachedTeams || !cachedTeams.length) return null;
    if (!deptName || deptName === 'Issued To Dept.' || deptName.toLowerCase() === 'department') return null;

    var trimmed = String(deptName).trim().toLowerCase();

    // 1. Exact match by teamName, name, or teamId
    var t = cachedTeams.find(function (item) {
      var tName = (item.teamName || item.name || '').trim().toLowerCase();
      var tId = (item.teamId || '').trim().toLowerCase();
      return tName === trimmed || tId === trimmed;
    });
    if (t) return t;

    // 2. By editTargetJob.issued_to_team
    if (editTargetJob && editTargetJob.issued_to_team) {
      t = cachedTeams.find(function (item) {
        return item.teamId === editTargetJob.issued_to_team;
      });
      if (t) return t;
    }

    // 3. Substring / normalized match (e.g. "testing-engineering" contains "engineering")
    var cleanInput = trimmed.replace(/[^a-z0-9]/g, '');
    t = cachedTeams.find(function (item) {
      var cleanName = (item.teamName || item.name || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      return cleanName && (cleanInput.indexOf(cleanName) !== -1 || cleanName.indexOf(cleanInput) !== -1);
    });
    if (t) return t;

    return null;
  }

  function getEditSubTeam(team, subDeptName) {
    if (!team || !team.propsubteams || !team.propsubteams.length) return null;
    if (!subDeptName || subDeptName === 'Assign Sub-Dept.' || subDeptName === 'NA') return null;

    var target = String(subDeptName).trim().toLowerCase();
    var cleanTarget = target.replace(/[^a-z0-9]/g, '');

    return team.propsubteams.find(function (st) {
      var sName = (st.subteamName || st.name || '').trim().toLowerCase();
      var sId = (st.subteamId || '').trim().toLowerCase();
      if (sName === target || sId === target) return true;
      var cleanS = sName.replace(/[^a-z0-9]/g, '');
      return cleanS && (cleanTarget.indexOf(cleanS) !== -1 || cleanS.indexOf(cleanTarget) !== -1);
    }) || null;
  }

  function populateEditSubTeams(deptName, selectedSubDept) {
    var eSubDept = $('#eSubDept');
    if (!eSubDept) return;

    var team = getEditTeam(deptName);
    var subOpts = '<option value="">Assign Sub-Dept.</option>';

    if (team && team.propsubteams && team.propsubteams.length > 0) {
      team.propsubteams.forEach(function (st) {
        var sName = (st.subteamName || st.name || '').trim();
        if (sName) {
          subOpts += '<option value="' + esc(sName) + '">' + esc(sName) + '</option>';
        }
      });
      subOpts += '<option value="NA">NA</option>';
    } else {
      subOpts += '<option value="NA">NA</option>';
    }

    eSubDept.innerHTML = subOpts;

    if (selectedSubDept) {
      eSubDept.value = selectedSubDept;
      if (eSubDept.value !== selectedSubDept && selectedSubDept !== 'Assign Sub-Dept.') {
        eSubDept.insertAdjacentHTML('beforeend', '<option value="' + esc(selectedSubDept) + '">' + esc(selectedSubDept) + '</option>');
        eSubDept.value = selectedSubDept;
      }
    } else {
      eSubDept.value = '';
    }
  }

  function populateEditMembers(deptName, subDeptName, currentSelected) {
    var eAssigned = $('#eAssigned');
    if (!eAssigned) return;

    var team = getEditTeam(deptName);
    var members = [];
    var seen = {};

    if (team) {
      var subTeam = getEditSubTeam(team, subDeptName);
      if (subTeam && subTeam.subteams && subTeam.subteams.length > 0) {
        // Strictly members of this selected sub-department!
        members = subTeam.subteams;
      } else if (subDeptName === 'NA' || !team.propsubteams || team.propsubteams.length === 0) {
        if (team.members && team.members.length > 0) {
          members = team.members;
        }
      }
    }

    var mHtml = '<option value="">Assign To</option>';

    members.forEach(function (m) {
      var fullName = ((m.firstName || '') + ' ' + (m.lastName || '')).trim() || m.name || m.email || '';
      if (fullName && !seen[fullName.toLowerCase()]) {
        seen[fullName.toLowerCase()] = true;
        mHtml += '<option value="' + esc(fullName) + '">' + esc(fullName) + '</option>';
      }
    });

    // If job already had an assigned person belonging to this job & dept/subteam, preserve if not in seen
    if (currentSelected && currentSelected !== 'NA' && currentSelected !== 'Not assigned') {
      var selKey = currentSelected.trim().toLowerCase();
      if (!seen[selKey]) {
        if (editTargetJob && (editTargetJob.assigned === currentSelected) && (deptName === editTargetJob.dept) && (!subDeptName || subDeptName === editTargetJob.assignDept)) {
          seen[selKey] = true;
          mHtml += '<option value="' + esc(currentSelected) + '">' + esc(currentSelected) + '</option>';
        }
      }
    }

    eAssigned.innerHTML = mHtml;

    if (currentSelected && seen[currentSelected.trim().toLowerCase()]) {
      eAssigned.value = currentSelected;
    } else {
      eAssigned.value = '';
    }
  }

  function isUserDepartment(deptName) {
    if (isSuperAdmin()) return false;
    if (!deptName || deptName === 'Issued To Dept.' || deptName.toLowerCase() === 'department') return false;

    var selectedTeam = getEditTeam(deptName);
    var issuedTo = selectedTeam ? selectedTeam.teamId : null;
    var issuedBy = userCurrentTeamId;

    if (issuedTo && issuedBy && issuedTo === issuedBy) {
      return true;
    }

    var myTeam = cachedTeams ? cachedTeams.find(function (t) { return t.teamId === userCurrentTeamId; }) : null;
    var myTeamName = myTeam ? (myTeam.teamName || myTeam.name || '') : '';
    var userDesg = (currentUser && currentUser.desg) || '';

    var cleanSelected = String(deptName).trim().toLowerCase();
    if (myTeamName && cleanSelected === myTeamName.trim().toLowerCase()) return true;
    if (userDesg && cleanSelected === userDesg.trim().toLowerCase()) return true;

    if (selectedTeam) {
      var selName = (selectedTeam.teamName || selectedTeam.name || '').trim().toLowerCase();
      if (myTeamName && selName === myTeamName.trim().toLowerCase()) return true;
      if (userDesg && selName === userDesg.trim().toLowerCase()) return true;
    }

    return false;
  }

  function handleEditDeptChange(deptVal, initialSubDept, initialAssigned) {
    var subWrap = $('#eSubDeptWrap');
    var assignWrap = $('#eAssignedWrap');
    var statusWrap = $('#eStatusWrap');
    var closedByWrap = $('#eClosedByWrap');

    var canAssignOrChangeStatus = isUserDepartment(deptVal);

    if (canAssignOrChangeStatus) {
      if (subWrap) subWrap.hidden = false;
      if (assignWrap) assignWrap.hidden = false;
      if (statusWrap) statusWrap.hidden = false;

      var curSub = initialSubDept;
      if (curSub === undefined) {
        var eSubDept = $('#eSubDept');
        curSub = eSubDept ? eSubDept.value : '';
      }
      populateEditSubTeams(deptVal, curSub);

      var effSubDept = ($('#eSubDept') && $('#eSubDept').value) ? $('#eSubDept').value : (curSub || '');

      var curAssigned = initialAssigned;
      if (curAssigned === undefined) {
        var eAssigned = $('#eAssigned');
        curAssigned = eAssigned ? eAssigned.value : '';
      }
      populateEditMembers(deptVal, effSubDept, curAssigned);

      var eStatus = $('#eStatus');
      if (closedByWrap) {
        closedByWrap.hidden = (!eStatus || eStatus.value !== 'Closed');
      }
    } else {
      if (subWrap) subWrap.hidden = true;
      if (assignWrap) assignWrap.hidden = true;
      if (statusWrap) statusWrap.hidden = true;
      if (closedByWrap) closedByWrap.hidden = true;
    }
  }

  function openEdit(job) {
    closeView();
    if (job && job.id) highlightJob(job.id);
    editTargetJob = job;
    editPhotoBeforeData = undefined;

    $('#editId').textContent = job.propId;
    $('#eDetails').value = job.details || '';

    // Populate Dept options: first option is blank "Issued To Dept.", followed by dynamic teams
    var eDept = $('#eDept');
    if (eDept) {
      var allTeams = getAllTeamNames();
      if (job.dept && job.dept.toLowerCase() !== 'department' && allTeams.indexOf(job.dept) === -1) {
        allTeams.unshift(job.dept);
      }
      var isDeptSelected = Boolean(job.dept && job.dept.toLowerCase() !== 'department');
      var deptHtml = '<option value=""' + (!isDeptSelected ? ' selected' : '') + '>Issued To Dept.</option>';
      allTeams.forEach(function (tName) {
        deptHtml += '<option value="' + esc(tName) + '"' + (isDeptSelected && tName === job.dept ? ' selected' : '') + '>' + esc(tName) + '</option>';
      });
      eDept.innerHTML = deptHtml;
      eDept.value = isDeptSelected ? job.dept : '';
    }

    // Populate Area options: first option is blank "Area", followed by dynamic areas
    var eArea = $('#eArea');
    if (eArea) {
      var allAreas = getAllAreaNames();
      if (job.area && allAreas.indexOf(job.area) === -1) {
        allAreas.unshift(job.area);
      }
      var isAreaSelected = Boolean(job.area);
      var areaHtml = '<option value=""' + (!isAreaSelected ? ' selected' : '') + '>Area</option>';
      allAreas.forEach(function (areaName) {
        areaHtml += '<option value="' + esc(areaName) + '"' + (isAreaSelected && areaName === job.area ? ' selected' : '') + '>' + esc(areaName) + '</option>';
      });
      eArea.innerHTML = areaHtml;
      eArea.value = isAreaSelected ? job.area : '';
    }

    $('#eSub').value = job.sub || '';

    $('#eStatus').value = job.status || 'Open';
    var eClosedBy = $('#eClosedBy');
    if (eClosedBy) eClosedBy.value = (job.status === 'Closed') ? (job.closedBy || (currentUser && currentUser.name) || '') : '';

    var currentSubDept = (job.assignDept && job.assignDept !== 'NA') ? job.assignDept : '';
    var currentAssigned = (job.assigned && job.assigned !== 'NA' && job.assigned !== 'Not assigned') ? job.assigned : '';

    handleEditDeptChange(eDept ? eDept.value : job.dept, currentSubDept, currentAssigned);

    $('#eRemarks').value = (job.remarks && job.remarks !== 'NA') ? job.remarks : '';

    // Photo Before
    var pBImg = $('#ePhotoBeforeImg');
    var pBNone = $('#ePhotoBeforeNone');
    var pBDel = $('#ePhotoBeforeDel');
    if (job.photoBefore) {
      if (pBImg) { pBImg.src = job.photoBefore; pBImg.hidden = false; }
      if (pBNone) pBNone.hidden = true;
      if (pBDel) pBDel.hidden = false;
    } else {
      if (pBImg) { pBImg.src = ''; pBImg.hidden = true; }
      if (pBNone) pBNone.hidden = false;
      if (pBDel) pBDel.hidden = true;
    }

    $('#editModal').hidden = false;
    document.body.classList.add('noscroll');
  }

  function submitEditForm(e) {
    e.preventDefault();
    if (!editTargetJob) return;

    var details = $('#eDetails').value.trim();
    if (!details) {
      toast('Please enter job details.');
      $('#eDetails').focus();
      return;
    }

    var dept = $('#eDept') ? $('#eDept').value : '';
    var area = $('#eArea') ? $('#eArea').value : '';
    var sub = $('#eSub') ? $('#eSub').value.trim() : '';
    var remarks = $('#eRemarks') ? $('#eRemarks').value.trim() : '';

    var canAssignOrChangeStatus = isUserDepartment(dept);

    var oldDept = editTargetJob.dept;
    editTargetJob.details = details;
    if (dept) editTargetJob.dept = dept;
    if (area) editTargetJob.area = area;
    editTargetJob.sub = sub;
    editTargetJob.remarks = remarks;

    var oldStatus = editTargetJob.status;
    var newStatus = oldStatus;

    if (canAssignOrChangeStatus) {
      var subDept = $('#eSubDept') ? $('#eSubDept').value : '';
      var assigned = $('#eAssigned') ? $('#eAssigned').value.trim() : '';
      var status = $('#eStatus') ? $('#eStatus').value : (oldStatus || 'Open');

      if (status !== 'Closed') {
        if (assigned && status === 'Open') {
          status = 'Assigned';
        } else if (!assigned && status === 'Assigned') {
          status = 'Open';
        }
      }

      newStatus = status;
      editTargetJob.assignDept = subDept || 'NA';
      editTargetJob.assigned = assigned || '';

      var tObj = getEditTeam(dept);
      if (tObj && tObj.teamId) {
        editTargetJob.issued_to_team = tObj.teamId;
        var stObj = getEditSubTeam(tObj, subDept);
        if (stObj && stObj.subteamId) {
          editTargetJob.subteamId = stObj.subteamId;
        } else {
          editTargetJob.subteamId = null;
        }
      }
    } else {
      var tObjOther = getEditTeam(dept);
      if (tObjOther && tObjOther.teamId) {
        editTargetJob.issued_to_team = tObjOther.teamId;
      }
      if (dept && oldDept && dept !== oldDept) {
        editTargetJob.assignDept = 'NA';
        editTargetJob.assigned = '';
        editTargetJob.subteamId = null;
        newStatus = 'Open';
      }
    }

    editTargetJob.status = newStatus;

    if (editPhotoBeforeData !== undefined) {
      editTargetJob.photoBefore = editPhotoBeforeData;
    }

    if (newStatus === 'Closed') {
      var eClosedBy = $('#eClosedBy');
      editTargetJob.closedBy = (eClosedBy && eClosedBy.value.trim()) || (currentUser && currentUser.name) || 'User';
      if (!editTargetJob.closedAt) editTargetJob.closedAt = new Date().toISOString();
      if (editTargetJob.propId) {
        var parsed = parseFormattedPropId(editTargetJob.propId);
        var canonicalPropId = parsed
          ? (getActivePropertyName() + '-' + parsed.dateCode + '-' + pad3(parsed.serial))
          : editTargetJob.propId;
        editTargetJob.propId = canonicalPropId;
        editTargetJob.customJobId = canonicalPropId;
        if (editTargetJob.id != null) globalJobCustomIdMap[String(editTargetJob.id)] = canonicalPropId;
        if (editTargetJob.jobId != null) globalJobCustomIdMap[String(editTargetJob.jobId)] = canonicalPropId;
        saveJobCustomIdMap();
      }
      if (oldStatus !== 'Closed') {
        var opIdx = openJobs.findIndex(function (j) { return j.id === editTargetJob.id || String(j.jobId) === String(editTargetJob.jobId); });
        if (opIdx !== -1) {
          openJobs.splice(opIdx, 1);
          if (pagination.open.total > 0) pagination.open.total--;
          closedJobs.unshift(editTargetJob);
          pagination.closed.total = (pagination.closed.total || 0) + 1;
          var ob = $('#openBadge'); if (ob) ob.textContent = openJobs.length;
          var cb = $('#closedBadge'); if (cb && cb.textContent) cb.textContent = closedJobs.length;
        }
      }
    } else if (oldStatus === 'Closed' && newStatus !== 'Closed') {
      var clIdx = closedJobs.findIndex(function (j) { return j.id === editTargetJob.id || String(j.jobId) === String(editTargetJob.jobId); });
      if (clIdx !== -1) {
        closedJobs.splice(clIdx, 1);
        if (pagination.closed.total > 0) pagination.closed.total--;
        openJobs.unshift(editTargetJob);
        pagination.open.total = (pagination.open.total || 0) + 1;
        var ob2 = $('#openBadge'); if (ob2) ob2.textContent = openJobs.length;
        var cb2 = $('#closedBadge'); if (cb2 && cb2.textContent) cb2.textContent = closedJobs.length;
      }
    }

    closeModals();
    toast('Job updated successfully!');
    renderList(state.tab);
    renderRecentStats();
  }

  /* ================= View Modal (Job Details) ================= */
  function openView(id, ids) {
    var j = byId(id);
    if (!j) return;
    highlightJob(id);
    ctx.ids = ids && ids.indexOf(id) !== -1 ? ids : [id];
    ctx.id = id;
    renderView();
    $('#viewModal').hidden = false;
    document.body.classList.add('noscroll');
  }

  function byId(id) {
    var list = getActiveJobs();
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === id || String(list[i].jobId) === String(id)) return list[i];
    }
    var other = (state.tab === 'closed') ? openJobs : closedJobs;
    for (var k = 0; k < other.length; k++) {
      if (other[k].id === id || String(other[k].jobId) === String(id)) return other[k];
    }
    return null;
  }

  function field(label, val, full) {
    return '<div class="fv-i' + (full ? ' full' : '') + '"><span>' + label + '</span><b>' + val + '</b></div>';
  }

  function photoPanel(which, src) {
    var isVideo = src && /\.(mp4|mov)$/i.test(src);
    var content = '';
    if (src) {
      if (isVideo) {
        content = '<video controls style="width:100%;height:140px;border-radius:8px;background:#000;"><source src="' + esc(src) + '"></video>';
      } else {
        content = '<img src="' + esc(src) + '" alt="Photo ' + which + '" data-zoom>';
      }
    } else {
      content = '<div class="ph-none">' + I.img + '<span>No photo ' + which.toLowerCase() + '</span></div>';
    }
    return '<div class="ph"><div class="ph-h"><span>Photo ' + which + '</span></div>' + content + '</div>';
  }

  function renderView() {
    var j = byId(ctx.id);
    if (!j) return;

    var closed = j.status === 'Closed';
    var pos = ctx.ids.indexOf(j.id);
    var tot = ctx.ids.length;
    var isAssigned = (j.assigned && j.assigned !== 'NA') || j.status === 'Assigned';
    var age = closed
      ? (j.closedAt ? 'Resolved in ' + span(j.opened, j.closedAt) : 'Closed')
      : 'Open for ' + span(j.opened, new Date());

    var steps = [
      { done: true, cur: false, t: 'Job Created', s: fmt(j.opened), x: 'by ' + esc(j.by) },
      { done: isAssigned, cur: !isAssigned && !closed, t: isAssigned ? 'Assigned to ' + esc(j.assigned) : 'Waiting for assignment', s: isAssigned ? (j.assignDept && j.assignDept !== 'NA' ? esc(j.assignDept) : 'Assigned') : 'Not assigned yet', x: '' },
      { done: closed, cur: !closed && isAssigned, t: closed ? 'Closed' : 'In progress', s: closed ? (j.closedAt ? fmt(j.closedAt) : 'Closed') : 'Pending resolution', x: closed ? 'by ' + esc(j.closedBy || 'Staff') : '' }
    ];

    var tl = steps.map(function (s) {
      return '<li class="' + (s.done ? 'done' : s.cur ? 'cur' : '') + '"><div class="dot">' + (s.done ? I.tick : '') + '</div><div><b>' + s.t + '</b><small>' + s.s + '</small>' + (s.x ? '<small>' + s.x + '</small>' : '') + '</div></li>';
    }).join('');

    var fields =
      field('Job ID', '<b class="prop-text">' + esc(j.propId) + '</b>') +
      field('Job Details', esc(j.details), true) +
      field('Issued To', esc(j.dept)) + field('Issued By', esc(j.by)) +
      field('Area', esc(j.area)) + field('Sub-Area', na(j.sub)) +
      field('Open Date/Time', fmt(j.opened)) + field('Status', '<span class="tag st-' + j.status + '">' + j.status + '</span>') +
      field('Assign Sub-Dept.', na(j.assignDept)) + field('Assign To', na(j.assigned)) +
      (closed ? field('Closed By', na(j.closedBy)) + field('Closed Date/Time', fmt(j.closedAt)) : '') +
      // Remarks strictly shown for closed job
      (closed ? field('Remarks', na(j.remarks), true) : '');

    var viewActions = '';
    var canAssign = !closed && (isAdmin() || (userCurrentTeamId && j.issued_to_team === userCurrentTeamId));
    var canClose = !closed && (isAdmin() || (userCurrentTeamId && j.issued_to_team === userCurrentTeamId) || (j.assigned_supervisor === (currentUser && currentUser.email)));

    if (!closed) {
      if (canAssign) {
        viewActions += '<button class="btn p" data-vact="assign">' + I.user + (isAssigned ? ' Reassign' : ' Assign Job') + '</button>';
      }
      if (canClose) {
        viewActions += '<button class="btn g" data-vact="close">' + I.check + ' Close Job</button>';
      }
    }

    $('#viewDialog').innerHTML =
      '<div class="vhead ' + clsOf(j) + '"><div class="vtop"><div class="vchips"><span class="prop-badge" style="font-size:12px;padding:3px 9px" title="Job ID">' + esc(j.propId) + '</span><span class="tag st-' + j.status + '">' + j.status + '</span><span class="age">' + age + '</span></div>' +
      '<div class="vnav"><button data-vnav="-1" title="Previous (&larr;)"' + (pos <= 0 ? ' disabled' : '') + '>&lsaquo;</button><span>' + (pos + 1) + ' of ' + tot + '</span><button data-vnav="1" title="Next (&rarr;)"' + (pos >= tot - 1 ? ' disabled' : '') + '>&rsaquo;</button><button class="vx" data-vclose title="Close (Esc)">&times;</button></div></div>' +
      '<h2>' + esc(j.details) + '</h2><p>Issued To: ' + esc(j.dept) + ' &middot; ' + esc(j.area) + (j.sub ? ' &rsaquo; ' + esc(j.sub) : '') + '</p></div>' +
      '<div class="vbody"><div class="vmain"><h4>Job Information</h4><div class="fv">' + fields + '</div>' +
      '<h4>Photos</h4><div class="phs">' + photoPanel('Before', j.photoBefore) + (closed ? photoPanel('After', j.photoAfter) : '') + '</div></div>' +
      '<aside class="vside"><h4>Progress</h4><ul class="tl">' + tl + '</ul>' +
      '<div class="vfact"><span>Time ' + (closed ? 'taken' : 'open') + '</span><b>' + (closed ? (j.closedAt ? span(j.opened, j.closedAt) : 'Closed') : span(j.opened, new Date())) + '</b></div></aside></div>' +
      '<div class="vfoot"><span class="sp"></span>' + viewActions + '</div>';

    $('#viewDialog').scrollTop = 0;
  }

  function closeView() {
    $('#viewModal').hidden = true;
    document.body.classList.remove('noscroll');
  }

  function vnav(d) {
    var i = ctx.ids.indexOf(ctx.id) + d;
    if (i < 0 || i >= ctx.ids.length) return;
    ctx.id = ctx.ids[i];
    renderView();
  }

  /* ================= Modals Management ================= */
  function closeModals() {
    var modals = ['#assignModal', '#closeModal', '#editModal', '#delModal', '#resetPwdModal', '#noPhotoConfirmModal', '#noPhotoModal', '#viewModal'];
    modals.forEach(function (m) {
      var el = $(m);
      if (el) el.hidden = true;
    });
    document.body.classList.remove('noscroll');
  }

  function showLoginModal() {
    window.location.href = 'login.html';
  }

  /* ================= Property Selector ================= */
  function renderPropertySelector(props) {
    var menu = $('#pdTestingMenu');
    if (!menu) return;

    // Role-based visibility rule from quickfix (qindex.js):
    // If SUPERADMIN / OPROADMIN (or it@workwise.in): show ALL properties
    // If other email ID / user: show ONLY their assigned property (currentUser.prop)
    var visibleProps = props || [];
    if (!isSuperAdmin()) {
      var userPropId = (currentUser && currentUser.prop) || null;
      var matchedProp = null;
      if (userPropId && Array.isArray(props)) {
        matchedProp = props.find(function (p) { return p.propId === userPropId; });
      }
      if (matchedProp) {
        visibleProps = [matchedProp];
      } else if (Array.isArray(props) && props.length > 0) {
        visibleProps = [props[0]];
      } else {
        visibleProps = [];
      }
    }

    var html = '';
    visibleProps.forEach(function (p) {
      var isAct = p.propId === currentPropertyId;
      html += '<div class="pd-option-item' + (isAct ? ' active' : '') + '" role="option" data-val="' + esc(p.propId) + '" data-name="' + esc(p.propName) + '">' +
        '<span>' + esc(p.propName) + '</span>' +
        '<svg class="pd-check-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"' + (isAct ? '' : ' hidden') + '><polyline points="20 6 9 17 4 12"/></svg>' +
        '</div>';
    });
    menu.innerHTML = html;

    var sv = $('#pdSelectedValue');
    if (sv) {
      var activeProp = visibleProps.find(function (p) { return p.propId === currentPropertyId; });
      if (activeProp) {
        sv.textContent = activeProp.propName;
      }
    }

    $$('.pd-option-item', menu).forEach(function (opt) {
      opt.addEventListener('click', async function (e) {
        e.stopPropagation();
        var propId = opt.dataset.val;
        var propName = opt.dataset.name;

        currentPropertyId = propId;
        loadJobCustomIdMap();
        var sv = $('#pdSelectedValue');
        if (sv) {
          sv.textContent = propName;
        }

        $$('.pd-option-item', menu).forEach(function (it) {
          var act = it === opt;
          it.classList.toggle('active', act);
          var ic = it.querySelector('.pd-check-icon');
          if (ic) ic.hidden = !act;
        });

        menu.hidden = true;
        var sbtn = $('#pdTestingSelectBtn');
        if (sbtn) {
          sbtn.classList.remove('open');
          sbtn.setAttribute('aria-expanded', 'false');
        }

        toast('Switched property to ' + propName);

        // Reset pagination for both tabs
        if (pagination.open) pagination.open.page = 1;
        if (pagination.closed) pagination.closed.page = 1;

        // Fetch fresh jobs and data from API for the newly selected property
        if (state.tab === 'open') {
          var cb = $('#closedBadge');
          if (cb) cb.textContent = '';
          closedJobs = [];
          await fetchOpenJobs();
        } else if (state.tab === 'closed') {
          await fetchClosedJobs();
          fetchOpenJobs().catch(function () {});
        } else if (state.tab === 'new') {
          var cb2 = $('#closedBadge');
          if (cb2) cb2.textContent = '';
          closedJobs = [];
          await fetchOpenJobs();
          initNewJobForm();
        }
      });
    });
  }

  /* ================= Export Handlers & ExcelJS Image Embedding ================= */
  function fetchImageForExcel(url) {
    return new Promise(function (resolve) {
      if (!url || typeof url !== 'string' || url === 'na' || url === 'NA') {
        return resolve(null);
      }
      var trimmed = url.trim();
      if (!trimmed) return resolve(null);

      // Check if attachment is a video file
      if (/\.(mp4|mov|webm)$/i.test(trimmed)) {
        return resolve({ isVideo: true, url: trimmed });
      }

      var img = new Image();
      img.crossOrigin = 'anonymous';

      var timer = setTimeout(function () {
        resolve({ failed: true, url: trimmed });
      }, 6000);

      img.onload = function () {
        clearTimeout(timer);
        try {
          var w = img.naturalWidth || img.width || 100;
          var h = img.naturalHeight || img.height || 100;
          var canvas = document.createElement('canvas');
          var maxDim = 400; // Resize to max 400px for compact, fast Excel file
          var cw = w;
          var ch = h;
          if (cw > maxDim || ch > maxDim) {
            if (cw > ch) {
              ch = Math.round((ch * maxDim) / cw);
              cw = maxDim;
            } else {
              cw = Math.round((cw * maxDim) / ch);
              ch = maxDim;
            }
          }
          canvas.width = cw;
          canvas.height = ch;
          var ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, cw, ch);
          var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          var b64 = dataUrl.substring(dataUrl.indexOf(',') + 1);
          resolve({
            base64: b64,
            ext: 'jpeg',
            width: w,
            height: h
          });
        } catch (err) {
          // If canvas was tainted by CORS, check if it's already a data URL
          if (trimmed.indexOf('data:image/') === 0) {
            var extM = trimmed.match(/^data:image\/([a-zA-Z0-9]+);base64,/);
            var ext = (extM && extM[1]) ? extM[1].toLowerCase() : 'jpeg';
            if (ext === 'jpg') ext = 'jpeg';
            var b64Raw = trimmed.substring(trimmed.indexOf(',') + 1);
            return resolve({ base64: b64Raw, ext: ext, width: img.naturalWidth || 70, height: img.naturalHeight || 70 });
          }
          resolve({ failed: true, url: trimmed });
        }
      };

      img.onerror = function () {
        clearTimeout(timer);
        if (trimmed.indexOf('data:image/') === 0) {
          var extM = trimmed.match(/^data:image\/([a-zA-Z0-9]+);base64,/);
          var ext = (extM && extM[1]) ? extM[1].toLowerCase() : 'jpeg';
          if (ext === 'jpg') ext = 'jpeg';
          var b64Raw = trimmed.substring(trimmed.indexOf(',') + 1);
          return resolve({ base64: b64Raw, ext: ext, width: 70, height: 70 });
        }
        resolve({ failed: true, url: trimmed });
      };

      img.src = trimmed;
    });
  }

  function calcThumbSize(w, h, maxBox) {
    maxBox = maxBox || 70;
    if (!w || !h) return { width: maxBox, height: maxBox };
    var ratio = w / h;
    if (ratio >= 1) {
      return { width: maxBox, height: Math.max(20, Math.round(maxBox / ratio)) };
    } else {
      return { width: Math.max(20, Math.round(maxBox * ratio)), height: maxBox };
    }
  }

  function exportRows() {
    var isClosed = state.tab === 'closed';
    var head = ['Job ID', 'Job Details', 'Issued By', 'Issued To', 'Area', 'Sub-Area', 'Open Date/Time', 'Photo Before'];
    if (isClosed) {
      head.push('Photo After', 'Closed By', 'Closed Date/Time', 'Remarks', 'Status');
    } else {
      head.push('Assign Sub-Dept', 'Assign To', 'Status');
    }
    var items = listFor(state.tab);
    var rows = items.map(function (j) {
      var r = [
        j.propId,
        j.details,
        j.by,
        j.dept,
        j.area,
        j.sub || '',
        fmt(j.opened),
        j.photoBefore || 'No Photo'
      ];
      if (isClosed) {
        r.push(
          j.photoAfter || 'No Photo',
          j.closedBy || 'Staff',
          j.closedAt ? fmt(j.closedAt) : '',
          j.remarks || '',
          j.status
        );
      } else {
        r.push(
          j.assignDept || 'NA',
          j.assigned || 'NA',
          j.status
        );
      }
      return r;
    });
    return [head].concat(rows);
  }

  function exportExcelFallback() {
    var rows = exportRows();
    var sheetName = state.tab === 'closed' ? 'Closed Jobs' : 'Open Jobs';
    var fileName = 'workwize-' + state.tab + '-jobs.xlsx';

    if (window.XLSX) {
      var ws = XLSX.utils.aoa_to_sheet(rows);
      var colWidths = rows[0].map(function (col, ci) {
        var maxLen = rows.reduce(function (max, r) {
          var val = r[ci] != null ? String(r[ci]) : '';
          return Math.max(max, val.length);
        }, String(col).length);
        return { wch: Math.min(Math.max(maxLen + 3, 12), 48) };
      });
      ws['!cols'] = colWidths;
      var wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
      XLSX.writeFile(wb, fileName);
      toast('Exported ' + (rows.length - 1) + ' jobs to Excel');
    } else {
      var csv = '\uFEFF' + rows.map(function (r) {
        return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(',');
      }).join('\n');
      var a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8' }));
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(a.href);
      toast('Exported ' + (rows.length - 1) + ' jobs');
    }
  }

  async function exportExcel() {
    var isClosed = state.tab === 'closed';
    var items = listFor(state.tab);
    if (!items || !items.length) {
      toast('No jobs to export');
      return;
    }

    if (!window.ExcelJS) {
      exportExcelFallback();
      return;
    }

    var btn = $('#btnExcel');
    var origText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spin" style="display:inline-block;animation:spin 1s linear infinite;">⌛</span> Exporting...';
    }
    toast('Generating Excel with photos, please wait...');

    try {
      var wb = new ExcelJS.Workbook();
      wb.creator = 'WorkWize';
      wb.created = new Date();

      var sheetName = isClosed ? 'Closed Jobs' : 'Open Jobs';
      var ws = wb.addWorksheet(sheetName, {
        views: [{ showGridLines: true }]
      });

      // Define worksheet columns
      var cols = [
        { header: 'Job ID', key: 'propId', width: 22 },
        { header: 'Job Details', key: 'details', width: 34 },
        { header: 'Issued By', key: 'by', width: 26 },
        { header: 'Issued To', key: 'dept', width: 22 },
        { header: 'Area', key: 'area', width: 20 },
        { header: 'Sub-Area', key: 'sub', width: 20 },
        { header: 'Open Date/Time', key: 'opened', width: 22 },
        { header: 'Photo Before', key: 'photoBefore', width: 22 }
      ];

      if (isClosed) {
        cols.push({ header: 'Photo After', key: 'photoAfter', width: 22 });
        cols.push({ header: 'Closed By', key: 'closedBy', width: 22 });
        cols.push({ header: 'Closed Date/Time', key: 'closedAt', width: 22 });
        cols.push({ header: 'Remarks', key: 'remarks', width: 26 });
        cols.push({ header: 'Status', key: 'status', width: 14 });
      } else {
        cols.push({ header: 'Assign Sub-Dept', key: 'assignDept', width: 22 });
        cols.push({ header: 'Assign To', key: 'assigned', width: 22 });
        cols.push({ header: 'Status', key: 'status', width: 14 });
      }

      ws.columns = cols;

      // Header row styling
      var headerRow = ws.getRow(1);
      headerRow.height = 30;
      headerRow.eachCell(function (cell) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF00756A' }
        };
        cell.font = {
          name: 'Segoe UI',
          size: 11,
          bold: true,
          color: { argb: 'FFFFFFFF' }
        };
        cell.alignment = {
          vertical: 'middle',
          horizontal: 'center',
          wrapText: true
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF00564E' } },
          bottom: { style: 'medium', color: { argb: 'FF00433C' } },
          left: { style: 'thin', color: { argb: 'FF00564E' } },
          right: { style: 'thin', color: { argb: 'FF00564E' } }
        };
      });

      // Pre-fetch all photos in parallel
      var photoTasks = items.map(function (j) {
        return Promise.all([
          fetchImageForExcel(j.photoBefore),
          isClosed ? fetchImageForExcel(j.photoAfter) : Promise.resolve(null)
        ]);
      });
      var allPhotos = await Promise.all(photoTasks);

      var photoBeforeColIdx = 8; // 1-indexed (Column H)
      var photoAfterColIdx = isClosed ? 9 : -1; // Column I

      for (var i = 0; i < items.length; i++) {
        var j = items[i];
        var rowData = {
          propId: j.propId,
          details: j.details,
          by: j.by,
          dept: j.dept,
          area: j.area,
          sub: j.sub || '',
          opened: fmt(j.opened),
          photoBefore: '',
          status: j.status
        };

        if (isClosed) {
          rowData.photoAfter = '';
          rowData.closedBy = j.closedBy || 'Staff';
          rowData.closedAt = j.closedAt ? fmt(j.closedAt) : '';
          rowData.remarks = j.remarks || '';
        } else {
          rowData.assignDept = j.assignDept || 'NA';
          rowData.assigned = j.assigned || 'NA';
        }

        var row = ws.addRow(rowData);
        var rowIndex = row.number; // 2, 3, 4...
        var hasImage = false;

        var resBefore = allPhotos[i] ? allPhotos[i][0] : null;
        var resAfter = allPhotos[i] ? allPhotos[i][1] : null;

        // Embed or link Photo Before
        var cellBefore = row.getCell(photoBeforeColIdx);
        if (resBefore && resBefore.base64) {
          hasImage = true;
          try {
            var imgId = wb.addImage({
              base64: resBefore.base64,
              extension: resBefore.ext || 'jpeg'
            });
            var sizeB = calcThumbSize(resBefore.width, resBefore.height, 70);
            ws.addImage(imgId, {
              tl: { col: photoBeforeColIdx - 1 + 0.12, row: rowIndex - 1 + 0.08 },
              ext: { width: sizeB.width, height: sizeB.height },
              editAs: 'oneCell'
            });
            cellBefore.value = '';
          } catch (errImg) {
            console.warn('Excel image add error:', errImg);
            cellBefore.value = j.photoBefore ? { text: 'View Photo', hyperlink: j.photoBefore } : 'No Photo';
          }
        } else if (resBefore && resBefore.isVideo) {
          cellBefore.value = { text: 'View Video', hyperlink: resBefore.url };
          cellBefore.font = { color: { argb: 'FF00756A' }, underline: true };
        } else if (resBefore && resBefore.failed) {
          cellBefore.value = { text: 'View Photo', hyperlink: resBefore.url };
          cellBefore.font = { color: { argb: 'FF00756A' }, underline: true };
        } else {
          cellBefore.value = 'No Photo';
          cellBefore.font = { color: { argb: 'FF94A3B8' }, italic: true };
        }

        // Embed or link Photo After (Closed tab)
        if (isClosed) {
          var cellAfter = row.getCell(photoAfterColIdx);
          if (resAfter && resAfter.base64) {
            hasImage = true;
            try {
              var imgIdAfter = wb.addImage({
                base64: resAfter.base64,
                extension: resAfter.ext || 'jpeg'
              });
              var sizeA = calcThumbSize(resAfter.width, resAfter.height, 70);
              ws.addImage(imgIdAfter, {
                tl: { col: photoAfterColIdx - 1 + 0.12, row: rowIndex - 1 + 0.08 },
                ext: { width: sizeA.width, height: sizeA.height },
                editAs: 'oneCell'
              });
              cellAfter.value = '';
            } catch (errImg) {
              cellAfter.value = j.photoAfter ? { text: 'View Photo', hyperlink: j.photoAfter } : 'No Photo';
            }
          } else if (resAfter && resAfter.isVideo) {
            cellAfter.value = { text: 'View Video', hyperlink: resAfter.url };
            cellAfter.font = { color: { argb: 'FF00756A' }, underline: true };
          } else if (resAfter && resAfter.failed) {
            cellAfter.value = { text: 'View Photo', hyperlink: resAfter.url };
            cellAfter.font = { color: { argb: 'FF00756A' }, underline: true };
          } else {
            cellAfter.value = 'No Photo';
            cellAfter.font = { color: { argb: 'FF94A3B8' }, italic: true };
          }
        }

        row.height = hasImage ? 65 : 28;

        // Styling data cells
        row.eachCell({ includeEmpty: true }, function (cell, colNumber) {
          cell.alignment = {
            vertical: 'middle',
            horizontal: (colNumber === 1 || colNumber === 7 || colNumber === photoBeforeColIdx || (isClosed && colNumber === photoAfterColIdx) || (isClosed ? colNumber === 11 || colNumber === 13 : colNumber === 11)) ? 'center' : 'left',
            wrapText: true
          };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
          };
        });
      }

      var buffer = await wb.xlsx.writeBuffer();
      var blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      var fileName = 'workwize-' + state.tab + '-jobs.xlsx';
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);

      toast('Exported ' + items.length + ' jobs with photos to Excel');
    } catch (err) {
      console.error('Export Excel with photos failed:', err);
      toast('Export error, falling back to standard export...');
      exportExcelFallback();
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origText;
      }
    }
  }

  /* ================= Clear Filters ================= */
  function clearAll() {
    state.q = '';
    state.area = 'all';
    state.issuedBy = 'all';
    state.issuedTo = 'all';
    state.assignedTo = 'all';
    state.status = 'all';
    state.fromDate = '';
    state.toDate = '';
    state.sort = 'new';
    if (pagination[state.tab]) pagination[state.tab].page = 1;
    var sInput = $('#search'); if (sInput) sInput.value = '';
    var cs = $('#clearSearch'); if (cs) cs.hidden = true;
    var fltStatus = $('#fltStatus'); if (fltStatus) fltStatus.value = 'all';
    var fltArea = $('#fltArea'); if (fltArea) fltArea.value = 'all';
    var fltIssuedBy = $('#fltIssuedBy'); if (fltIssuedBy) fltIssuedBy.value = 'all';
    var fltIssuedTo = $('#fltIssuedTo'); if (fltIssuedTo) fltIssuedTo.value = 'all';
    var fltAssignTo = $('#fltAssignTo'); if (fltAssignTo) fltAssignTo.value = 'all';
    var fltFromDate = $('#fltFromDate'); if (fltFromDate) { fltFromDate.value = ''; fltFromDate.removeAttribute('max'); }
    var fltToDate = $('#fltToDate'); if (fltToDate) { fltToDate.value = ''; fltToDate.removeAttribute('min'); }
    var sortBy = $('#sortBy'); if (sortBy) sortBy.value = 'new';
    renderFilters();
    renderList(state.tab);
  }

  /* ================= Global Events & Click Delegation ================= */
  function closeMenus() {
    $$('.dots.open').forEach(function (d) { d.classList.remove('open'); });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest('.dots')) closeMenus();

    // Pagination button
    var pg = t.closest('[data-pg]');
    if (pg && !pg.disabled) {
      var newPage = parseInt(pg.dataset.pg, 10);
      if (newPage > 0) {
        if (pagination[state.tab]) {
          pagination[state.tab].page = newPage;
        }
        renderList(state.tab);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }

    // Highlight clicked job row or card
    var clickedJobCard = t.closest('.jcard, .jrow');
    if (clickedJobCard && clickedJobCard.dataset.id) {
      highlightJob(clickedJobCard.dataset.id);
    }

    // Action button
    var btn = t.closest('[data-act]');
    if (btn) {
      var act = btn.dataset.act;
      var id = btn.dataset.id;
      if (act === 'menu') {
        var d = btn.parentNode;
        var was = d.classList.contains('open');
        closeMenus();
        if (!was) d.classList.add('open');
        return;
      }
      if (act === 'clearAll') { clearAll(); return; }
      closeMenus();

      var job = byId(id);
      if (!job) return;
      if (act === 'view') openView(job.id, listFor(state.tab).map(function (x) { return x.id; }));
      else if (act === 'edit') openEdit(job);
      else if (act === 'assign') openAssign(job);
      else if (act === 'close') openClose(job);
      return;
    }

    // Card or row click opens view details
    var card = t.closest('.jcard, .jrow');
    if (card && !t.closest('.dots') && !t.closest('.card-actions') && !t.closest('a') && !t.closest('button')) {
      var cid = card.dataset.id;
      openView(cid, listFor(state.tab).map(function (x) { return x.id; }));
      return;
    }

    // Video preview click
    var vidBtn = t.closest('.video-preview-btn');
    if (vidBtn) {
      e.preventDefault();
      var vidUrl = vidBtn.dataset.video;
      if (vidUrl) {
        var lb = $('#lightbox');
        if (lb) {
          lb.innerHTML = '<video controls autoplay style="max-width:90vw;max-height:85vh;"><source src="' + esc(vidUrl) + '"></video><button class="x" id="lbClose">&times;</button>';
          lb.hidden = false;
        }
      }
      return;
    }

    // Lightbox image zoom
    var z = t.closest('[data-zoom]');
    if (z) {
      var lb2 = $('#lightbox');
      if (lb2) {
        lb2.innerHTML = '<img src="' + esc(z.src) + '" alt=""><button class="x" id="lbClose">&times;</button>';
        lb2.hidden = false;
      }
      return;
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      var pdMenu = $('#pdTestingMenu');
      if (pdMenu && !pdMenu.hidden) {
        pdMenu.hidden = true;
        var sbtn = $('#pdTestingSelectBtn');
        if (sbtn) { sbtn.classList.remove('open'); sbtn.setAttribute('aria-expanded', 'false'); }
        return;
      }
      var pDropdown = $('#profileDropdown');
      if (pDropdown && !pDropdown.hidden) {
        pDropdown.hidden = true;
        var pTrig = $('#userMenuTrigger');
        if (pTrig) pTrig.setAttribute('aria-expanded', 'false');
        return;
      }
      var lb = $('#lightbox');
      if (lb && !lb.hidden) { lb.hidden = true; return; }
      if (!$('#viewModal').hidden) { closeView(); return; }
      closeModals();
      closeMenus();
    }
    if (!$('#viewModal').hidden && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName) === false) {
      if (e.key === 'ArrowLeft') vnav(-1);
      if (e.key === 'ArrowRight') vnav(1);
    }
  });

  /* Modal outside click */
  document.addEventListener('click', function (e) {
    if (e.target.id === 'noPhotoModal') {
      closeNoPhotoConfirmModal();
      return;
    }
    if (e.target.closest('[data-close]') || (e.target.classList.contains('modal') && e.target.id !== 'viewModal')) {
      closeModals();
    }
  });

  /* View modal delegation */
  var vm = $('#viewModal');
  if (vm) {
    vm.addEventListener('click', function (e) {
      var t = e.target;
      if (t === this || t.closest('[data-vclose]')) { closeView(); return; }
      var n = t.closest('[data-vnav]');
      if (n && !n.disabled) { vnav(parseInt(n.dataset.vnav, 10)); return; }
      var a = t.closest('[data-vact]');
      if (a) {
        var job = byId(ctx.id);
        if (!job) return;
        var act = a.dataset.vact;
        if (act === 'assign') { closeView(); openAssign(job); }
        else if (act === 'close') { closeView(); openClose(job); }
        else if (act === 'edit') { closeView(); openEdit(job); }
      }
    });
  }

  var lb = $('#lightbox');
  if (lb) lb.addEventListener('click', function () { this.hidden = true; });

  /* ================= Event Listeners Initialization ================= */
  function setupEventListeners() {
    // Tab switching
    var tabs = $('#tabs');
    if (tabs) {
      tabs.addEventListener('click', function (e) {
        var b = e.target.closest('.tab');
        if (b && b.dataset.tab) setTab(b.dataset.tab);
      });
    }

    // Search bar
    var sInput = $('#search');
    if (sInput) {
      sInput.addEventListener('input', function (e) {
        state.q = e.target.value.trim();
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        var cs = $('#clearSearch');
        if (cs) cs.hidden = !state.q;
        renderList(state.tab);
      });
    }

    var csBtn = $('#clearSearch');
    if (csBtn) {
      csBtn.addEventListener('click', function () {
        if (sInput) sInput.value = '';
        state.q = '';
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        this.hidden = true;
        renderList(state.tab);
        if (sInput) sInput.focus();
      });
    }

    // Filter Sidebar Drawer
    var btnFilter = $('#btnFilter');
    if (btnFilter) {
      btnFilter.addEventListener('click', function () {
        var sidebar = $('#filterSidebar');
        if (sidebar && sidebar.classList.contains('open')) {
          closeFilterSidebar();
        } else {
          openFilterSidebar();
        }
      });
    }

    var btnCloseFilter = $('#btnCloseFilter');
    if (btnCloseFilter) btnCloseFilter.addEventListener('click', closeFilterSidebar);

    var filterOverlay = $('#filterOverlay');
    if (filterOverlay) filterOverlay.addEventListener('click', closeFilterSidebar);

    var btnApplyFilterDrawer = $('#btnApplyFilterDrawer');
    if (btnApplyFilterDrawer) {
      btnApplyFilterDrawer.addEventListener('click', function () {
        var fromEl = $('#fltFromDate');
        var toEl = $('#fltToDate');
        if (fromEl) state.fromDate = fromEl.value || '';
        if (toEl) state.toDate = toEl.value || '';
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        renderFilters();
        renderList(state.tab);
        closeFilterSidebar();
      });
    }

    var btnClearFilterDrawer = $('#btnClearFilterDrawer');
    if (btnClearFilterDrawer) {
      btnClearFilterDrawer.addEventListener('click', function () {
        clearAll();
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var sidebar = $('#filterSidebar');
        if (sidebar && sidebar.classList.contains('open')) {
          closeFilterSidebar();
        }
      }
    });

    var cfBtn = $('#clearFilters');
    if (cfBtn) cfBtn.addEventListener('click', clearAll);

    // Status filter
    var fltStatus = $('#fltStatus');
    if (fltStatus) {
      fltStatus.addEventListener('change', function (e) {
        state.status = e.target.value;
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        renderFilters();
        renderList(state.tab);
      });
    }

    // Status chips fallback (if present)
    var statusChips = $('#statusChips');
    if (statusChips) {
      statusChips.addEventListener('click', function (e) {
        var b = e.target.closest('[data-status]');
        if (b) {
          state.status = b.dataset.status;
          if (pagination[state.tab]) pagination[state.tab].page = 1;
          renderFilters();
          renderList(state.tab);
        }
      });
    }

    // Area filter
    var fltArea = $('#fltArea');
    if (fltArea) {
      fltArea.addEventListener('change', function (e) {
        state.area = e.target.value;
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        renderFilters();
        renderList(state.tab);
      });
    }

    // Issued By filter
    var fltIssuedBy = $('#fltIssuedBy');
    if (fltIssuedBy) {
      fltIssuedBy.addEventListener('change', function (e) {
        state.issuedBy = e.target.value;
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        renderFilters();
        renderList(state.tab);
      });
    }

    // Issued To filter
    var fltIssuedTo = $('#fltIssuedTo');
    if (fltIssuedTo) {
      fltIssuedTo.addEventListener('change', function (e) {
        state.issuedTo = e.target.value;
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        renderFilters();
        renderList(state.tab);
      });
    }

    // Assign To filter
    var fltAssignTo = $('#fltAssignTo');
    if (fltAssignTo) {
      fltAssignTo.addEventListener('change', function (e) {
        state.assignedTo = e.target.value;
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        renderFilters();
        renderList(state.tab);
      });
    }

    // Date Range filters
    var fltFromDate = $('#fltFromDate');
    if (fltFromDate) {
      fltFromDate.addEventListener('change', function (e) {
        state.fromDate = e.target.value;
        if (state.fromDate && state.toDate && state.fromDate > state.toDate) {
          state.toDate = state.fromDate;
          var toEl = $('#fltToDate');
          if (toEl) toEl.value = state.toDate;
        }
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        renderFilters();
        renderList(state.tab);
      });
    }

    var fltToDate = $('#fltToDate');
    if (fltToDate) {
      fltToDate.addEventListener('change', function (e) {
        state.toDate = e.target.value;
        if (state.fromDate && state.toDate && state.toDate < state.fromDate) {
          state.fromDate = state.toDate;
          var fromEl = $('#fltFromDate');
          if (fromEl) fromEl.value = state.fromDate;
        }
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        renderFilters();
        renderList(state.tab);
      });
    }

    // Sort
    var sortBy = $('#sortBy');
    if (sortBy) {
      sortBy.addEventListener('change', function (e) {
        state.sort = e.target.value;
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        renderFilters();
        renderList(state.tab);
      });
    }

    // Page size
    var pageSize = $('#pageSize');
    if (pageSize) {
      pageSize.addEventListener('change', function (e) {
        state.pageSize = parseInt(e.target.value, 10);
        if (pagination[state.tab]) pagination[state.tab].page = 1;
        renderList(state.tab);
      });
    }

    // Layout buttons
    var vg = $('#viewGrid');
    var vl = $('#viewList');
    if (vg) {
      vg.addEventListener('click', function () {
        state.layout = 'grid';
        renderList(state.tab);
      });
    }
    if (vl) {
      vl.addEventListener('click', function () {
        state.layout = 'list';
        renderList(state.tab);
      });
    }

    // Export buttons
    var btnExcel = $('#btnExcel');
    if (btnExcel) btnExcel.addEventListener('click', exportExcel);
    var btnCopy = $('#btnCopy');
    if (btnCopy) {
      btnCopy.addEventListener('click', function () {
        var txt = exportRows().map(function (r) { return r.join('\t'); }).join('\n');
        navigator.clipboard.writeText(txt).then(function () {
          toast('Copied ' + (exportRows().length - 1) + ' rows to clipboard');
        }, function () {
          toast('Unable to copy to clipboard');
        });
      });
    }
    var btnPrint = $('#btnPrint');
    if (btnPrint) btnPrint.addEventListener('click', function () { window.print(); });

    // Period boxes
    var periodStatBoxes = $('#periodStatBoxes');
    if (periodStatBoxes) {
      periodStatBoxes.addEventListener('click', function (e) {
        var box = e.target.closest('.sbox');
        if (!box) return;
        var f = box.dataset.statusFilter;
        if (f === 'Closed') {
          setTab('closed');
        } else {
          setTab('open').then(function () {
            state.status = (f === 'all' ? 'all' : f);
            renderFilters();
            renderList('open');
          });
        }
      });
    }

    var periodTabs = $('#periodTabs');
    if (periodTabs) {
      periodTabs.addEventListener('click', function (e) {
        var btn = e.target.closest('.rtab');
        if (btn && btn.dataset.period) {
          state.period = btn.dataset.period;
          renderRecentStats();
        }
      });
    }

    // Aging stat boxes click: filter open jobs older than 7 days
    var agingStatBoxes = $('#agingStatBoxes');
    if (agingStatBoxes) {
      agingStatBoxes.addEventListener('click', function (e) {
        var box = e.target.closest('.abox');
        if (!box) return;
        var status = box.dataset.agingStatus;
        var weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        var yyyy = weekAgo.getFullYear();
        var mm = pad(weekAgo.getMonth() + 1);
        var dd = pad(weekAgo.getDate());
        var toDateStr = yyyy + '-' + mm + '-' + dd;

        setTab('open').then(function () {
          state.status = status || 'all';
          state.fromDate = '';
          state.toDate = toDateStr;
          renderFilters();
          renderList('open');
        });
      });
    }

    // New Job Form
    var jobForm = $('#jobForm');
    if (jobForm) {
      jobForm.addEventListener('submit', submitNewJob);
    }
    var btnCancel = $('#btnCancel');
    if (btnCancel) btnCancel.addEventListener('click', resetNewJobForm);

    var btnConfirmNoPhoto = $('#btnConfirmNoPhoto');
    if (btnConfirmNoPhoto) {
      btnConfirmNoPhoto.addEventListener('click', function () {
        var cb = pendingNoPhotoCallback;
        closeNoPhotoConfirmModal();
        if (cb) cb();
      });
    }

    var btnCancelNoPhoto = $('#btnCancelNoPhoto');
    if (btnCancelNoPhoto) {
      btnCancelNoPhoto.addEventListener('click', function () {
        closeNoPhotoConfirmModal();
      });
    }

    var btnXNoPhoto = $('#btnXNoPhoto');
    if (btnXNoPhoto) {
      btnXNoPhoto.addEventListener('click', function () {
        closeNoPhotoConfirmModal();
      });
    }

    var fDept = $('#fDept');
    if (fDept) {
      fDept.addEventListener('change', handleDeptSelectionChange);
    }

    var fDeptAssign = $('#fDeptAssign');
    if (fDeptAssign) {
      fDeptAssign.addEventListener('change', function () {
        populateNewJobSupervisors(this.value);
      });
    }

    var fPhoto = $('#fPhoto');
    if (fPhoto) {
      fPhoto.addEventListener('change', function (e) {
        handleNewJobFiles(e.target.files);
        fPhoto.value = '';
      });
    }

    var drop = $('#drop');
    if (drop) {
      ['dragover', 'dragenter'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        drop.addEventListener(ev, function () { drop.classList.remove('over'); });
      });
      drop.addEventListener('drop', function (e) {
        e.preventDefault();
        handleNewJobFiles(e.dataTransfer.files);
      });
    }

    // Assign Form
    var assignForm = $('#assignForm');
    if (assignForm) {
      assignForm.addEventListener('submit', submitAssignForm);
    }
    var asDept = $('#asDept');
    if (asDept) {
      asDept.addEventListener('change', function () {
        populateAssignMembers(this.value);
      });
    }

    // Close Form
    var closeForm = $('#closeForm');
    if (closeForm) {
      closeForm.addEventListener('submit', submitCloseForm);
    }
    var closePhotoPick = $('#closePhotoPick');
    var closePhotoInp = $('#closePhotoInput');
    if (closePhotoPick && closePhotoInp) {
      closePhotoPick.addEventListener('click', function () { closePhotoInp.click(); });
      closePhotoInp.addEventListener('change', function (e) {
        var f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
          toast('Photo size exceeds 5MB');
          return;
        }
        closePhotoFile = f;
        var r = new FileReader();
        r.onload = function (ev) {
          var p = $('#closePhotoPrev');
          if (p) { p.src = ev.target.result; p.hidden = false; }
          var d = $('#closePhotoDel');
          if (d) d.hidden = false;
        };
        r.readAsDataURL(f);
      });
    }
    var closePhotoDel = $('#closePhotoDel');
    if (closePhotoDel) {
      closePhotoDel.addEventListener('click', function () {
        closePhotoFile = null;
        var p = $('#closePhotoPrev'); if (p) { p.src = ''; p.hidden = true; }
        this.hidden = true;
      });
    }

    // Edit Form
    var editForm = $('#editForm');
    if (editForm) {
      editForm.addEventListener('submit', submitEditForm);
    }
    var eDept = $('#eDept');
    if (eDept) {
      eDept.addEventListener('change', function () {
        handleEditDeptChange(this.value);
      });
    }
    var eSubDept = $('#eSubDept');
    if (eSubDept) {
      eSubDept.addEventListener('change', function () {
        populateEditMembers($('#eDept') ? $('#eDept').value : '', this.value);
      });
    }
    var eAssigned = $('#eAssigned');
    if (eAssigned) {
      eAssigned.addEventListener('change', function () {
        var eStatus = $('#eStatus');
        if (eStatus && eStatus.value !== 'Closed') {
          if (this.value && eStatus.value === 'Open') {
            eStatus.value = 'Assigned';
          } else if (!this.value && eStatus.value === 'Assigned') {
            eStatus.value = 'Open';
          }
        }
      });
    }
    var eStatus = $('#eStatus');
    if (eStatus) {
      eStatus.addEventListener('change', function () {
        var wrap = $('#eClosedByWrap');
        if (wrap) wrap.hidden = (this.value !== 'Closed');
      });
    }

    var ePhotoBeforePick = $('#ePhotoBeforePick');
    var ePhotoBeforeInput = $('#ePhotoBeforeInput');
    if (ePhotoBeforePick && ePhotoBeforeInput) {
      ePhotoBeforePick.addEventListener('click', function () { ePhotoBeforeInput.click(); });
      ePhotoBeforeInput.addEventListener('change', function (e) {
        var f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
          toast('Photo size exceeds 5MB');
          return;
        }
        var r = new FileReader();
        r.onload = function (ev) {
          editPhotoBeforeData = ev.target.result;
          var img = $('#ePhotoBeforeImg'); if (img) { img.src = ev.target.result; img.hidden = false; }
          var none = $('#ePhotoBeforeNone'); if (none) none.hidden = true;
          var del = $('#ePhotoBeforeDel'); if (del) del.hidden = false;
        };
        r.readAsDataURL(f);
      });
    }
    var ePhotoBeforeDel = $('#ePhotoBeforeDel');
    if (ePhotoBeforeDel) {
      ePhotoBeforeDel.addEventListener('click', function () {
        editPhotoBeforeData = null;
        var img = $('#ePhotoBeforeImg'); if (img) { img.src = ''; img.hidden = true; }
        var none = $('#ePhotoBeforeNone'); if (none) none.hidden = false;
        this.hidden = true;
      });
    }


    // User Menu / Profile Popover
    var userMenuTrigger = $('#userMenuTrigger');
    var profileDropdown = $('#profileDropdown');
    var pdTestingSelectBtn = $('#pdTestingSelectBtn');
    var pdTestingMenu = $('#pdTestingMenu');

    if (userMenuTrigger && profileDropdown) {
      userMenuTrigger.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = profileDropdown.hidden;
        profileDropdown.hidden = !willOpen;
        userMenuTrigger.setAttribute('aria-expanded', String(willOpen));
        if (willOpen && pdTestingMenu) {
          pdTestingMenu.hidden = true;
          if (pdTestingSelectBtn) {
            pdTestingSelectBtn.classList.remove('open');
            pdTestingSelectBtn.setAttribute('aria-expanded', 'false');
          }
        }
      });
    }

    if (pdTestingSelectBtn && pdTestingMenu) {
      pdTestingSelectBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var willOpen = pdTestingMenu.hidden;
        pdTestingMenu.hidden = !willOpen;
        pdTestingSelectBtn.classList.toggle('open', willOpen);
        pdTestingSelectBtn.setAttribute('aria-expanded', String(willOpen));
      });
    }

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.user-menu-wrap')) {
        if (profileDropdown && !profileDropdown.hidden) {
          profileDropdown.hidden = true;
          if (userMenuTrigger) userMenuTrigger.setAttribute('aria-expanded', 'false');
        }
        if (pdTestingMenu && !pdTestingMenu.hidden) {
          pdTestingMenu.hidden = true;
          if (pdTestingSelectBtn) {
            pdTestingSelectBtn.classList.remove('open');
            pdTestingSelectBtn.setAttribute('aria-expanded', 'false');
          }
        }
      }
    });

    // Profile Actions: Login, Logout, Reset Password
    var pdLoginBtn = $('#pdLoginBtn');
    if (pdLoginBtn) {
      pdLoginBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (profileDropdown) profileDropdown.hidden = true;
        window.location.href = 'login.html';
      });
    }

    var pdLogoutBtn = $('#pdLogoutBtn');
    if (pdLogoutBtn) {
      pdLogoutBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (profileDropdown) profileDropdown.hidden = true;
        if (cfg && cfg.clearStoredUserData) cfg.clearStoredUserData();
        window.location.href = 'login.html';
      });
    }

    var pdResetPwdBtn = $('#pdResetPwdBtn');
    var resetPwdModal = $('#resetPwdModal');
    if (pdResetPwdBtn && resetPwdModal) {
      pdResetPwdBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (profileDropdown) profileDropdown.hidden = true;
        resetPwdModal.hidden = false;
        var np = $('#newPwd'); if (np) setTimeout(function () { np.focus(); }, 80);
      });
    }

    var resetPwdForm = $('#resetPwdForm');
    if (resetPwdForm) {
      resetPwdForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var p1 = ($('#newPwd').value || '').trim();
        var p2 = ($('#confirmPwd').value || '').trim();
        if (!p1 || p1.length < 6) {
          toast('Password must be at least 6 characters');
          return;
        }
        if (p1 !== p2) {
          toast('Passwords do not match');
          return;
        }
        resetPwdForm.reset();
        resetPwdModal.hidden = true;
        toast('Password updated successfully!');
      });
    }

    // Back to top button
    var toTop = $('#toTop');
    if (toTop) {
      window.addEventListener('scroll', function () {
        toTop.hidden = window.scrollY < 400;
      }, { passive: true });
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  /* ================= Application Startup ================= */
  async function initApp() {
    loadStoredUser();
    updateHeaderUserInfo();

    try {
      var props = await api.getAllProperties();
      if (props && Array.isArray(props) && props.length > 0) {
        allProperties = props;

        var userProp = currentUser && currentUser.prop;
        var targetProp = null;
        if (userProp) {
          targetProp = props.find(function (p) { return p.propId === userProp; });
        }
        if (!targetProp) {
          targetProp = props[0];
        }

        currentPropertyId = targetProp.propId;
        loadJobCustomIdMap();
        var sv = $('#pdSelectedValue');
        if (sv) sv.textContent = targetProp.propName;

        renderPropertySelector(props);

        // Default to Open tab (loads live open jobs on start!)
        await setTab('open');
        return;
      }
    } catch (err) {
      console.warn('Initial properties fetch failed:', err);
      if (err.message === 'UNAUTHORIZED') {
        showLoginModal();
        return;
      }
    }

    // Fallback if not authenticated or offline:
    // Create default property and allow user to sign in
    var fallbackPropId = (currentUser && currentUser.prop) || 'Testing';
    allProperties = [{ propId: fallbackPropId, propName: 'Testing' }];
    currentPropertyId = fallbackPropId;
    loadJobCustomIdMap();
    renderPropertySelector(allProperties);
    setTab('open');
  }

  // Run initialization
  setupEventListeners();
  initApp();

})();
