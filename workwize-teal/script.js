(function () {
  'use strict';

  /* =====================================================================
     DATA MODEL
       id          -> Sr.No
       details     -> Job Details
       by          -> Issued By
       dept        -> Issued To
       area        -> Area
       sub         -> Sub-Area
       opened      -> Open Date/Time
       photoBefore -> Photo Before
       assignDept  -> Assign Sub-Dept.
       assigned    -> Assign Name
       photoAfter  -> Photo After
       status      -> Status  (Open | Assigned | Closed)
       remarks     -> Remarks
       closedBy    -> Closed By
       closedAt    -> Closed Date/Time
     ===================================================================== */
  var KEY = 'workwize_jobs_v3';
  var ME = 'IT [App admin: null]';

  /* Team members per department for Assign & Close validation */
  var TEAM_MEMBERS = {
    'Testing-House Keeping': [
      { name: 'HK Team Manager', role: 'Head / Manager' },
      { name: 'Housekeeping Supervisor 1', role: 'Supervisor' },
      { name: 'Housekeeping Supervisor2', role: 'Supervisor' },
      { name: 'Test1 Supervisor', role: 'Supervisor' },
      { name: 'Testing Manager', role: 'Manager' },
      { name: 'Room Attendant', role: 'Staff' },
      { name: 'Shiva', role: 'Staff' },
      { name: 'Nikhil', role: 'Staff' }
    ],
    'Testing-Engineering': [
      { name: 'Chief Engineer', role: 'Head of Engineering' },
      { name: 'Rahul [Manager-Tech.Ops]', role: 'Manager' },
      { name: 'Test 1', role: 'Engineer' },
      { name: 'Electrician', role: 'Technician' },
      { name: 'Plumber', role: 'Technician' },
      { name: 'HVAC Technician', role: 'Technician' },
      { name: 'Engineering Supervisor', role: 'Supervisor' }
    ],
    'Testing-Security': [
      { name: 'Security Officer', role: 'Head of Security' },
      { name: 'Security Supervisor', role: 'Supervisor' },
      { name: 'Security Guard 1', role: 'Guard' },
      { name: 'Security Guard 2', role: 'Guard' }
    ]
  };

  function getMembersForDept(dept) {
    if (TEAM_MEMBERS[dept]) return TEAM_MEMBERS[dept];
    for (var k in TEAM_MEMBERS) {
      if (k.toLowerCase().indexOf(dept.toLowerCase()) !== -1 || dept.toLowerCase().indexOf(k.toLowerCase()) !== -1) {
        return TEAM_MEMBERS[k];
      }
    }
    return [
      { name: 'Team Lead', role: 'Lead' },
      { name: 'Staff Member 1', role: 'Staff' },
      { name: 'Staff Member 2', role: 'Staff' }
    ];
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function getPropId(j) {
    if (j && j.propId) return j.propId;
    var d = new Date((j && j.opened) || Date.now());
    var dd = pad(isNaN(d.getDate()) ? 1 : d.getDate());
    var mm = pad(isNaN(d.getMonth()) ? 1 : d.getMonth() + 1);
    var yy = isNaN(d.getFullYear()) ? '26' : String(d.getFullYear()).slice(-2);
    var prefix = 'Testing';
    if (j && j.dept && j.dept.indexOf('-') !== -1) {
      prefix = j.dept.split('-')[0].trim() || 'Testing';
    }
    var num = String((j && j.id) || 1).padStart(3, '0');
    return prefix + '-' + dd + mm + yy + '-' + num;
  }

  function load() {
    var list = [];
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
      }
    } catch (e) { /* ignore */ }
    if (!list.length && window.WORKWIZE_SEED_JOBS && window.WORKWIZE_SEED_JOBS.length) {
      list = JSON.parse(JSON.stringify(window.WORKWIZE_SEED_JOBS));
    }
    list.forEach(function (j) {
      if (!j.propId) j.propId = getPropId(j);
    });
    return list;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(jobs)); }
    catch (e) { toast('Browser storage is full - photos may not be saved'); }
  }

  /* ================= State ================= */
  var jobs = load();
  var state = { tab: 'open', q: '', status: 'all', area: 'all', sort: 'new', pageSize: 50, layout: 'list', page: { open: 1, closed: 1 } };
  var editId = null, editFromView = false, deleteId = null, photoData = '';
  var assignTargetId = null;
  var closeTargetId = null, closePhotoData = '';
  var editPhotos = { Before: '', After: '' };
  var ctx = { ids: [], id: null };            // View-popup navigation context
  var quickTarget = null;                      // 'Before' | 'After' for quick upload inside View

  /* ================= Helpers ================= */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); };
  var na = function (s) { return s && s !== 'NA' && s !== 'na' ? esc(s) : '<span class="na">NA</span>'; };

  function fmt(iso) {
    if (!iso || iso === 'NA' || iso === 'na') return 'NA';
    var d = new Date(iso);
    if (isNaN(d.getTime())) {
      var m = String(iso).match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s*(\d{1,2}):(\d{1,2})/);
      if (m) {
        return pad(parseInt(m[1], 10)) + '/' + pad(parseInt(m[2], 10)) + '/' + m[3] + ', ' + pad(parseInt(m[4], 10)) + ':' + pad(parseInt(m[5], 10));
      }
      return String(iso);
    }
    return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ', ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function span(a, b) {
    var da = new Date(a), db = new Date(b);
    if (isNaN(da.getTime()) || isNaN(db.getTime())) return 'Recently';
    var m = Math.max(0, Math.round((db - da) / 60000));
    if (m < 60) return m + ' min';
    var h = Math.floor(m / 60); if (h < 24) return h + 'h ' + (m % 60) + 'm';
    var d = Math.floor(h / 24); return d + 'd ' + (h % 24) + 'h';
  }

  function nextId() { return jobs.reduce(function (m, j) { return Math.max(m, j.id); }, 0) + 1; }
  function byId(id) { return jobs.filter(function (j) { return j.id === id; })[0]; }
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(function () { t.classList.remove('show'); }, 2500);
  }

  function words() { return state.q ? state.q.toLowerCase().split(/\s+/).filter(Boolean) : []; }
  function hl(text) {
    var w = words(); text = String(text == null ? '' : text);
    if (!w.length) return esc(text);
    var re = new RegExp('(' + w.map(function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') + ')', 'ig');
    return text.split(re).map(function (p, i) { return i % 2 ? '<mark>' + esc(p) + '</mark>' : esc(p); }).join('');
  }

  function matches(j) {
    var w = words(); if (!w.length) return true;
    var propId = j.propId || getPropId(j);
    var hay = [j.id, propId, j.details, j.by, j.dept, j.area, j.sub, j.assigned, j.assignDept, j.status, j.remarks, j.closedBy, fmt(j.opened)].join(' ').toLowerCase();
    return w.every(function (x) { return hay.indexOf(x) !== -1; });
  }

  function baseFor(tab) { return jobs.filter(function (j) { return tab === 'closed' ? j.status === 'Closed' : j.status !== 'Closed'; }); }
  function listFor(tab, ignoreStatus) {
    var arr = baseFor(tab).filter(function (j) {
      return matches(j) && (state.area === 'all' || j.area === state.area) &&
        (ignoreStatus || tab === 'closed' || state.status === 'all' || j.status === state.status);
    });
    var s = state.sort;
    arr.sort(function (a, b) {
      if (s === 'old') return (new Date(a.opened) - new Date(b.opened)) || (a.id - b.id);
      if (s === 'az') return a.details.localeCompare(b.details);
      if (s === 'area') return a.area.localeCompare(b.area) || a.details.localeCompare(b.details);
      return (new Date(b.opened) - new Date(a.opened)) || (b.id - a.id);
    });
    return arr;
  }

  var I = {
    dots: '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
    eye: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>',
    edit: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/></svg>',
    del: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>',
    check: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M8 12.5l3 3 5-6"/></svg>',
    undo: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5"/></svg>',
    user: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>',
    dept: '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
    img: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
    up: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4M6 10l6-6 6 6M4 20h16"/></svg>',
    tick: '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>'
  };

  /* ================= 3-Dot Menu ================= */
  function menuHTML(j) {
    var closed = j.status === 'Closed';
    var isAssigned = j.status === 'Assigned';
    return '<div class="dots"><button type="button" data-act="menu" aria-label="More options">' + I.dots + '</button><div class="menu">' +
      '<button data-act="view" data-id="' + j.id + '">' + I.eye + ' View Details</button>' +
      (!closed ? '<button data-act="assign" data-id="' + j.id + '">' + I.user + (isAssigned ? ' Reassign' : ' Assign to Team') + '</button>' : '') +
      (!closed ? '<button data-act="close" data-id="' + j.id + '">' + I.check + ' Close Job</button>' : '') +
      '<button data-act="edit" data-id="' + j.id + '">' + I.edit + ' Edit Job</button>' +
      '<button class="del" data-act="delete" data-id="' + j.id + '">' + I.del + ' Delete Job</button>' +
      '</div></div>';
  }

  function photoBeforePreview(j) {
    if (j.photoBefore && j.photoBefore !== 'na' && j.photoBefore !== 'NA') {
      if (j.photoBefore.indexOf('data:image') === 0 || j.photoBefore.indexOf('http') === 0) {
        return '<img src="' + esc(j.photoBefore) + '" class="thumb-preview" alt="Photo Before" data-zoom title="Click to view photo">';
      }
      return '<span class="pf" title="' + esc(j.photoBefore) + '">' + I.img + ' Photo: ' + esc(j.photoBefore) + '</span>';
    }
    return '<span class="no-photo-badge">' + I.img + ' No Photo</span>';
  }

  function clsOf(j) { return j.status === 'Closed' ? 'Closed' : j.status === 'Open' ? 'Open' : ''; }

  /* ================= Cards / Rows (Mandatory Columns) ================= */
  function cardHTML(j) {
    var closed = j.status === 'Closed';
    var isAssigned = j.status === 'Assigned';
    var propId = j.propId || getPropId(j);

    // 1. Job details + Issued To right under it
    var issuedToSub = '<div class="issued-to-bar">' + I.dept + ' <span>Issued To:</span> <b>' + hl(j.dept) + '</b></div>';

    // 2. Mandatory columns:
    // Area & Sub-area | Open Date & Time | Photo Before | Status / Assigned To
    var rows =
      '<span>Area & Sub</span><b title="' + esc(j.area + ' > ' + j.sub) + '">' + hl(j.area) + (j.sub ? ' &rsaquo; ' + hl(j.sub) : '') + '</b>' +
      '<span>Opened</span><b>' + fmt(j.opened) + '</b>' +
      '<span>Photo Before</span><div>' + photoBeforePreview(j) + '</div>' +
      (closed
        ? '<span>Closed by</span><b title="' + esc(j.closedBy) + '">' + na(j.closedBy) + ' &middot; ' + fmt(j.closedAt) + '</b>'
        : '<span>Assigned To</span><b title="' + esc(j.assigned) + '">' + (j.assigned ? hl(j.assigned) + (j.assignDept && j.assignDept !== 'NA' ? ' <small style="color:var(--muted)">(' + esc(j.assignDept) + ')</small>' : '') : '<span class="na">Not assigned</span>') + '</b>');

    // Bottom direct actions: Assign / Reassign for open tab jobs; No reopen button for closed jobs
    var bottomActions = !closed
      ? '<div class="btns-row"><button type="button" class="btn-assign" data-act="assign" data-id="' + j.id + '">' + I.user + (isAssigned ? ' Reassign' : ' Assign') + '</button></div>'
      : '';

    return '<article class="jcard ' + clsOf(j) + '" data-id="' + j.id + '" tabindex="0">' +
      '<div class="top">' +
        '<div class="left"><span class="prop-badge" title="Job ID">' + esc(propId) + '</span><span class="tag st-' + j.status + '">' + j.status + '</span></div>' +
        menuHTML(j) +
      '</div>' +
      '<h3 title="' + esc(j.details) + '">' + hl(j.details) + '</h3>' +
      issuedToSub +
      '<div class="kv">' + rows + '</div>' +
      '<div class="card-actions">' +
        '<div class="dt">' + (closed ? 'Resolved in ' + span(j.opened, j.closedAt) : 'Open ' + span(j.opened, new Date())) + '</div>' +
        bottomActions +
      '</div>' +
    '</article>';
  }

  function rowHTML(j) {
    var closed = j.status === 'Closed';
    var isAssigned = j.status === 'Assigned';
    var propId = j.propId || getPropId(j);

    var acts = !closed
      ? '<button type="button" class="btn-assign" data-act="assign" data-id="' + j.id + '" style="padding:5px 9px">' + I.user + (isAssigned ? ' Reassign' : ' Assign') + '</button>'
      : '';

    return '<article class="jrow ' + clsOf(j) + '" data-id="' + j.id + '" tabindex="0">' +
      '<div class="rt">' +
        '<span class="prop-badge" title="Job ID">' + esc(propId) + '</span>' +
        '<b title="' + esc(j.details) + '">' + hl(j.details) + '</b>' +
        '<small>' + I.dept + ' ' + hl(j.dept) + '</small>' +
      '</div>' +
      '<div class="rc"><span>Area &amp; Sub</span>' + hl(j.area) + (j.sub ? ' &rsaquo; ' + hl(j.sub) : '') + '</div>' +
      '<div class="rc"><span>Opened</span>' + fmt(j.opened) + '</div>' +
      '<div class="rc"><span>Photo Before</span>' + photoBeforePreview(j) + '</div>' +
      '<div class="rs"><span class="tag st-' + j.status + '">' + j.status + '</span></div>' +
      '<div class="row-acts">' + acts + '</div>' +
      menuHTML(j) +
    '</article>';
  }

  /* ================= Pager ================= */
  function pagerHTML(total, tab) {
    var pages = Math.max(1, Math.ceil(total / state.pageSize));
    var cur = Math.min(state.page[tab], pages); state.page[tab] = cur;
    var from = total ? (cur - 1) * state.pageSize + 1 : 0, to = Math.min(total, cur * state.pageSize);
    var b = '<button data-pg="' + (cur - 1) + '"' + (cur === 1 ? ' disabled' : '') + '>&lsaquo;</button>', last = 0;
    for (var p = 1; p <= pages; p++) {
      if (pages > 7 && p !== 1 && p !== pages && Math.abs(p - cur) > 1) { if (last !== -1) { b += '<button disabled>&hellip;</button>'; last = -1; } continue; }
      last = p; b += '<button data-pg="' + p + '" class="' + (p === cur ? 'on' : '') + '">' + p + '</button>';
    }
    b += '<button data-pg="' + (cur + 1) + '"' + (cur === pages ? ' disabled' : '') + '>&rsaquo;</button>';
    return '<div>Showing ' + from + ' to ' + to + ' of ' + total + ' entries</div><div class="pg">' + b + '</div>';
  }

  /* ================= Render ================= */
  function renderFilters() {
    var tab = state.tab;
    var chips = '';
    if (tab === 'open') {
      var base = listFor('open', true);
      var cnt = { all: base.length, Open: 0, Assigned: 0 };
      base.forEach(function (j) { if (cnt[j.status] !== undefined) cnt[j.status]++; });
      chips = [['all', 'All'], ['Open', 'Open'], ['Assigned', 'Assigned']].map(function (c) {
        return '<button data-status="' + c[0] + '" class="' + (state.status === c[0] ? 'on' : '') + '">' + c[1] + ' <em>' + cnt[c[0]] + '</em></button>';
      }).join('');
    }
    $('#statusChips').innerHTML = chips; $('#statusChips').hidden = !chips;

    var areas = {}; jobs.forEach(function (j) { if (j.area) areas[j.area] = 1; });
    $('#fltArea').innerHTML = '<option value="all">All areas</option>' + Object.keys(areas).sort().map(function (a) {
      return '<option' + (state.area === a ? ' selected' : '') + '>' + esc(a) + '</option>'; }).join('');
    $('#viewGrid').classList.toggle('on', state.layout === 'grid');
    $('#viewList').classList.toggle('on', state.layout === 'list');
    var active = state.q || state.area !== 'all' || (tab === 'open' && state.status !== 'all');
    $('#clearFilters').hidden = !active;
  }

  function renderList(tab) {
    var all = listFor(tab);
    var start = (state.page[tab] - 1) * state.pageSize;
    var cont = $('#' + tab + 'Cards');
    cont.className = 'cards' + (state.layout === 'list' ? ' list' : '');
    var items = all.slice(start, start + state.pageSize);
    cont.innerHTML = items.length ? items.map(state.layout === 'list' ? rowHTML : cardHTML).join('')
      : '<div class="empty"><div class="big">&#128269;</div>' + (words().length || state.area !== 'all' || state.status !== 'all' ? 'No jobs match your filters.<br><button class="link" data-act="clearAll">Clear filters</button>' : 'No ' + tab + ' jobs yet.') + '</div>';
    $('#' + tab + 'Pager').innerHTML = items.length ? pagerHTML(all.length, tab) : '';
    $('#resultCount').textContent = all.length + (all.length === 1 ? ' job' : ' jobs');
    renderFilters();
  }

  function renderRecent() {
    var items = jobs.filter(matches).sort(function (a, b) { return new Date(b.opened) - new Date(a.opened); }).slice(0, 8);
    $('#recentList').innerHTML = items.length ? items.map(function (j) {
      var propId = j.propId || getPropId(j);
      return '<li data-view="' + j.id + '"><div><b>' + hl(j.details) + '</b><small><span class="prop-badge" style="font-size:10.5px;padding:1px 6px">' + esc(propId) + '</span> &middot; ' + esc(j.dept) + ' &middot; ' + esc(j.area) + ' &middot; ' + fmt(j.opened) + '</small></div><span class="tag st-' + j.status + '">' + j.status + '</span></li>';
    }).join('') : '<li class="nohover">No matching jobs</li>';
  }

  function render() {
    $('#openBadge').textContent = baseFor('open').length;
    $('#closedBadge').textContent = baseFor('closed').length;
    if (state.tab === 'new') renderRecent(); else renderList(state.tab);
  }

  function setTab(tab) {
    state.tab = tab; state.status = 'all';
    $$('.tab').forEach(function (b) { b.classList.toggle('on', b.dataset.tab === tab); });
    ['new', 'open', 'closed'].forEach(function (t) { $('#view-' + t).hidden = t !== tab; });
    $('#tools').hidden = $('#filters').hidden = tab === 'new';
    $('#search').placeholder = tab === 'new' ? 'Search recent jobs...' : 'Search by job, area, sub-area, issued to, status...';
    state.page.open = state.page.closed = 1;
    render(); window.scrollTo(0, 0);
  }

  /* ================= Toolbar events ================= */
  $('#tabs').addEventListener('click', function (e) { var b = e.target.closest('.tab'); if (b) setTab(b.dataset.tab); });
  function resetPages() { state.page.open = state.page.closed = 1; }
  $('#search').addEventListener('input', function (e) {
    state.q = e.target.value.trim(); $('#clearSearch').hidden = !state.q; resetPages(); render();
  });
  $('#clearSearch').addEventListener('click', function () { $('#search').value = ''; state.q = ''; this.hidden = true; resetPages(); render(); $('#search').focus(); });
  function clearAll() {
    state.q = ''; state.area = 'all'; state.status = 'all'; $('#search').value = ''; $('#clearSearch').hidden = true; resetPages(); render();
  }
  $('#clearFilters').addEventListener('click', clearAll);
  $('#statusChips').addEventListener('click', function (e) { var b = e.target.closest('[data-status]'); if (b) { state.status = b.dataset.status; resetPages(); render(); } });
  $('#fltArea').addEventListener('change', function (e) { state.area = e.target.value; resetPages(); render(); });
  $('#sortBy').addEventListener('change', function (e) { state.sort = e.target.value; resetPages(); render(); });
  $('#pageSize').addEventListener('change', function (e) { state.pageSize = parseInt(e.target.value, 10); resetPages(); render(); });
  $('#viewGrid').addEventListener('click', function () { state.layout = 'grid'; try { localStorage.setItem('ww_layout_v4', 'grid'); } catch (e) {} render(); });
  $('#viewList').addEventListener('click', function () { state.layout = 'list'; try { localStorage.setItem('ww_layout_v4', 'list'); } catch (e) {} render(); });
  try {
    var savedLayout = localStorage.getItem('ww_layout_v4');
    state.layout = savedLayout === 'grid' ? 'grid' : 'list';
  } catch (e) {}

  /* ================= Click handling (delegated) ================= */
  function closeMenus() { $$('.dots.open').forEach(function (d) { d.classList.remove('open'); }); }

  document.addEventListener('click', function (e) {
    var t = e.target;
    if (!t.closest('.dots')) closeMenus();

    var pg = t.closest('[data-pg]');
    if (pg) { if (!pg.disabled) { state.page[state.tab] = parseInt(pg.dataset.pg, 10); renderList(state.tab); window.scrollTo({ top: 0, behavior: 'smooth' }); } return; }

    var rec = t.closest('li[data-view]');
    if (rec) { openView(parseInt(rec.dataset.view, 10), $$('#recentList li[data-view]').map(function (l) { return parseInt(l.dataset.view, 10); })); return; }

    var btn = t.closest('[data-act]');
    if (btn) {
      var act = btn.dataset.act, id = parseInt(btn.dataset.id, 10);
      if (act === 'menu') { var d = btn.parentNode, was = d.classList.contains('open'); closeMenus(); if (!was) d.classList.add('open'); return; }
      if (act === 'clearAll') { clearAll(); return; }
      closeMenus();
      doAction(act, id);
      return;
    }

    // click anywhere else on a card / row opens the details modal
    var card = t.closest('.jcard, .jrow');
    if (card && !t.closest('.dots') && !t.closest('.card-actions') && !t.closest('.row-acts')) {
      openView(parseInt(card.dataset.id, 10), listFor(state.tab).map(function (j) { return j.id; }));
    }
  });

  document.addEventListener('keydown', function (e) {
    var card = e.target.closest && e.target.closest('.jcard, .jrow');
    if (card && (e.key === 'Enter' || e.key === ' ') && e.target === card) {
      e.preventDefault(); openView(parseInt(card.dataset.id, 10), listFor(state.tab).map(function (j) { return j.id; }));
    }
  });

  function doAction(act, id) {
    var job = byId(id); if (!job && act !== 'noop') return;
    if (act === 'view') openView(id, listFor(state.tab).map(function (j) { return j.id; }));
    else if (act === 'assign') openAssign(job);
    else if (act === 'close') openClose(job);
    else if (act === 'edit') openEdit(job, false);
    else if (act === 'delete') openDelete(job);
    else if (act === 'reopen') {
      job.status = job.assigned ? 'Assigned' : 'Open';
      job.closedAt = ''; job.closedBy = '';
      save(); render(); refreshView(id); toast('Job ' + (job.propId || getPropId(job)) + ' reopened');
    }
  }

  /* =====================================================================
     ASSIGN MODAL (Department-specific team assignment)
     ===================================================================== */
  function populateAssignMembers(dept, currentAssigned) {
    var members = getMembersForDept(dept);
    var html = '<option value="">-- Select Team Member --</option>';
    members.forEach(function (m) {
      var sel = (currentAssigned && currentAssigned === m.name) ? ' selected' : '';
      html += '<option value="' + esc(m.name) + '"' + sel + '>' + esc(m.name) + ' (' + esc(m.role) + ')</option>';
    });
    html += '<option value="__custom__">+ Enter custom name...</option>';
    $('#asMember').innerHTML = html;
    $('#customMemberWrap').hidden = true;
    $('#asCustomMember').value = '';
  }

  function openAssign(job) {
    assignTargetId = job.id;
    var propId = job.propId || getPropId(job);
    $('#assignId').textContent = propId;
    $('#assignBrief').innerHTML =
      '<b>' + esc(job.details) + '</b>' +
      '<small><b>Prop ID:</b> ' + esc(propId) + '</small>' +
      '<small><b>Issued To:</b> ' + esc(job.dept) + '</small>' +
      '<small><b>Area:</b> ' + esc(job.area) + (job.sub ? ' &rsaquo; ' + esc(job.sub) : '') + '</small>' +
      '<small><b>Status:</b> ' + esc(job.status) + '</small>';

    var dept = job.dept || 'Testing-House Keeping';
    if ($('#asDept option[value="' + dept + '"]')) {
      $('#asDept').value = dept;
    } else {
      $('#asDept').value = 'Testing-House Keeping';
    }

    populateAssignMembers($('#asDept').value, job.assigned);
    $('#asRemarks').value = '';
    $('#assignModal').hidden = false;
  }

  $('#asDept').addEventListener('change', function () {
    populateAssignMembers(this.value, '');
  });

  $('#asMember').addEventListener('change', function () {
    $('#customMemberWrap').hidden = this.value !== '__custom__';
    if (this.value === '__custom__') $('#asCustomMember').focus();
  });

  $('#assignForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var job = byId(assignTargetId); if (!job) return;
    var dept = $('#asDept').value;
    var member = $('#asMember').value;
    if (member === '__custom__') {
      member = $('#asCustomMember').value.trim();
    }
    if (!member) {
      toast('Please select or enter a team member to assign.');
      return;
    }

    var notes = $('#asRemarks').value.trim();
    job.assignDept = dept;
    job.assigned = member;
    job.status = 'Assigned';
    if (notes) {
      job.remarks = job.remarks ? (job.remarks + ' | ' + notes) : notes;
    }

    save();
    closeModals();
    render();
    refreshView(job.id);
    toast('Job ' + (job.propId || getPropId(job)) + ' assigned to ' + member + ' (' + dept + ')');
  });

  /* =====================================================================
     CLOSE MODAL (Team validation & closure)
     ===================================================================== */
  function openClose(job) {
    closeTargetId = job.id;
    closePhotoData = '';
    var propId = job.propId || getPropId(job);
    $('#closeId').textContent = propId;
    $('#closeBrief').innerHTML =
      '<b>' + esc(job.details) + '</b>' +
      '<small><b>Prop ID:</b> ' + esc(propId) + '</small>' +
      '<small><b>Issued To Dept:</b> ' + esc(job.dept) + '</small>' +
      '<small><b>Area:</b> ' + esc(job.area) + (job.sub ? ' &rsaquo; ' + esc(job.sub) : '') + '</small>' +
      '<small><b>Opened:</b> ' + fmt(job.opened) + '</small>';

    $('#closeTeamNotice').innerHTML =
      'Job belongs to <b>' + esc(job.dept) + '</b>. Authorized team members of ' + esc(job.dept) + ' can close this job.';

    // Populate eligible closers from the same team + Admin
    var members = getMembersForDept(job.dept);
    var html = '<option value="">-- Select Closer --</option>';
    members.forEach(function (m) {
      var sel = (job.assigned && job.assigned === m.name) ? ' selected' : '';
      html += '<option value="' + esc(m.name) + '"' + sel + '>' + esc(m.name) + ' (' + esc(job.dept) + ')</option>';
    });
    html += '<option value="' + ME + '">' + ME + '</option>';
    $('#clBy').innerHTML = html;
    if (!job.assigned && members.length) $('#clBy').selectedIndex = 1;

    $('#clRemarks').value = 'Done.';
    $('#closePhotoPrev').hidden = true;
    $('#closePhotoPrev').src = '';
    $('#closePhotoDel').hidden = true;
    $('#closeModal').hidden = false;
  }

  $('#closePhotoPick').addEventListener('click', function () { $('#closePhotoInput').click(); });
  $('#closePhotoDel').addEventListener('click', function () {
    closePhotoData = '';
    $('#closePhotoPrev').hidden = true;
    $('#closePhotoPrev').src = '';
    this.hidden = true;
  });
  $('#closePhotoInput').addEventListener('change', function (e) {
    var f = e.target.files[0]; e.target.value = ''; if (!f) return;
    readPhoto(f, function (err, data) {
      if (err) { toast(err); return; }
      closePhotoData = data;
      $('#closePhotoPrev').src = data;
      $('#closePhotoPrev').hidden = false;
      $('#closePhotoDel').hidden = false;
    });
  });

  $('#closeForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var job = byId(closeTargetId); if (!job) return;
    var closer = $('#clBy').value;
    if (!closer) {
      toast('Please select who is closing the job.');
      return;
    }
    var rem = $('#clRemarks').value.trim() || 'Done.';
    job.status = 'Closed';
    job.closedBy = closer;
    job.closedAt = new Date().toISOString();
    job.remarks = rem;
    if (closePhotoData) job.photoAfter = closePhotoData;

    save();
    closeModals();
    render();
    refreshView(job.id);
    toast('Job ' + (job.propId || getPropId(job)) + ' closed by ' + closer);
  });

  /* =====================================================================
     VIEW DETAILS POPUP
     ===================================================================== */
  function openView(id, ids) {
    var j = byId(id); if (!j) return;
    ctx.ids = ids && ids.indexOf(id) !== -1 ? ids : [id]; ctx.id = id;
    renderView(); $('#viewModal').hidden = false; document.body.classList.add('noscroll');
  }
  function refreshView(id) { if (!$('#viewModal').hidden && ctx.id === id) renderView(); }
  function field(label, val, full) { return '<div class="fv-i' + (full ? ' full' : '') + '"><span>' + label + '</span><b>' + val + '</b></div>'; }
  function photoPanel(which, src) {
    return '<div class="ph"><div class="ph-h"><span>Photo ' + which + '</span><button class="mini" data-q="' + which + '">' + I.up + (src ? ' Replace' : ' Upload') + '</button></div>' +
      (src ? '<img src="' + src + '" alt="Photo ' + which + '" data-zoom>' : '<div class="ph-none">' + I.img + '<span>No photo ' + which.toLowerCase() + '</span></div>') + '</div>';
  }

  function renderView() {
    var j = byId(ctx.id); if (!j) return;
    var closed = j.status === 'Closed', pos = ctx.ids.indexOf(j.id), tot = ctx.ids.length;
    var isAssigned = (j.assigned && j.assigned !== 'NA') || j.status === 'Assigned';
    var age = closed ? 'Resolved in ' + span(j.opened, j.closedAt) : 'Open for ' + span(j.opened, new Date());

    var steps = [
      { done: true, cur: false, t: 'Job Created', s: fmt(j.opened), x: 'by ' + esc(j.by) },
      { done: isAssigned, cur: !isAssigned && !closed, t: isAssigned ? 'Assigned to ' + esc(j.assigned) : 'Waiting for assignment', s: isAssigned ? (j.assignDept && j.assignDept !== 'NA' ? esc(j.assignDept) : 'Assigned') : 'Not assigned yet', x: '' },
      { done: closed, cur: !closed && isAssigned, t: closed ? 'Closed' : 'In progress', s: closed ? fmt(j.closedAt) : 'Pending resolution', x: closed ? 'by ' + esc(j.closedBy || 'NA') : '' }
    ];
    var tl = steps.map(function (s) {
      return '<li class="' + (s.done ? 'done' : s.cur ? 'cur' : '') + '"><div class="dot">' + (s.done ? I.tick : '') + '</div><div><b>' + s.t + '</b><small>' + s.s + '</small>' + (s.x ? '<small>' + s.x + '</small>' : '') + '</div></li>';
    }).join('');

    var propId = j.propId || getPropId(j);
    var fields =
      field('Prop ID', '<b class="prop-text">' + esc(propId) + '</b>') +
      field('Job Details', esc(j.details), true) +
      field('Issued To', esc(j.dept)) + field('Issued By', esc(j.by)) +
      field('Area', esc(j.area)) + field('Sub-Area', na(j.sub)) +
      field('Open Date/Time', fmt(j.opened)) + field('Status', '<span class="tag st-' + j.status + '">' + j.status + '</span>') +
      field('Assign Sub-Dept.', na(j.assignDept)) + field('Assign Name', na(j.assigned)) +
      (closed ? field('Closed By', na(j.closedBy)) + field('Closed Date/Time', fmt(j.closedAt)) : '') +
      field('Remarks', na(j.remarks), true);

    var viewActions = '';
    if (!closed) {
      viewActions =
        '<button class="btn p" data-vact="assign">' + I.user + (isAssigned ? ' Reassign' : ' Assign Job') + '</button>' +
        '<button class="btn g" data-vact="close">' + I.check + ' Close Job</button>';
    }

    $('#viewDialog').innerHTML =
      '<div class="vhead ' + clsOf(j) + '"><div class="vtop"><div class="vchips"><span class="prop-badge" style="font-size:12px;padding:3px 9px">' + esc(propId) + '</span><span class="tag st-' + j.status + '">' + j.status + '</span><span class="age">' + age + '</span></div>' +
      '<div class="vnav"><button data-vnav="-1" title="Previous (&larr;)"' + (pos <= 0 ? ' disabled' : '') + '>&lsaquo;</button><span>' + (pos + 1) + ' of ' + tot + '</span><button data-vnav="1" title="Next (&rarr;)"' + (pos >= tot - 1 ? ' disabled' : '') + '>&rsaquo;</button><button class="vx" data-vclose title="Close (Esc)">&times;</button></div></div>' +
      '<h2>' + esc(j.details) + '</h2><p>Issued To: ' + esc(j.dept) + ' &middot; ' + esc(j.area) + (j.sub ? ' &rsaquo; ' + esc(j.sub) : '') + '</p></div>' +
      '<div class="vbody"><div class="vmain"><h4>Job Information</h4><div class="fv">' + fields + '</div>' +
      '<h4>Photos</h4><div class="phs">' + photoPanel('Before', j.photoBefore) + photoPanel('After', j.photoAfter) + '</div></div>' +
      '<aside class="vside"><h4>Progress</h4><ul class="tl">' + tl + '</ul>' +
      '<div class="vfact"><span>Time ' + (closed ? 'taken' : 'open') + '</span><b>' + (closed ? span(j.opened, j.closedAt) : span(j.opened, new Date())) + '</b></div></aside></div>' +
      '<div class="vfoot"><button class="btn dl" data-vact="delete">' + I.del + ' Delete</button><span class="sp"></span>' +
      '<button class="btn s" data-vact="edit">' + I.edit + ' Edit</button>' +
      viewActions + '</div>';
    $('#viewDialog').scrollTop = 0;
    var vb = $('.vbody', $('#viewDialog')); if (vb) vb.scrollTop = 0;
  }

  function vnav(d) {
    var i = ctx.ids.indexOf(ctx.id) + d; if (i < 0 || i >= ctx.ids.length) return;
    ctx.id = ctx.ids[i]; renderView();
  }
  function closeView() { $('#viewModal').hidden = true; document.body.classList.remove('noscroll'); }

  $('#viewModal').addEventListener('click', function (e) {
    var t = e.target;
    if (t === this || t.closest('[data-vclose]')) { closeView(); return; }
    var n = t.closest('[data-vnav]'); if (n && !n.disabled) { vnav(parseInt(n.dataset.vnav, 10)); return; }
    var z = t.closest('[data-zoom]'); if (z) { $('#lightbox img').src = z.src; $('#lightbox').hidden = false; return; }
    var q = t.closest('[data-q]'); if (q) { quickTarget = q.dataset.q; $('#quickPhoto').click(); return; }
    var a = t.closest('[data-vact]');
    if (a) {
      var id = ctx.id;
      var act = a.dataset.vact;
      if (act === 'edit') { closeView(); openEdit(byId(id), true); }
      else if (act === 'assign') { openAssign(byId(id)); }
      else if (act === 'close') { openClose(byId(id)); }
      else if (act === 'delete') { openDelete(byId(id)); }
      else if (act === 'reopen') { doAction('reopen', id); }
    }
  });
  $('#lightbox').addEventListener('click', function () { this.hidden = true; });

  $('#quickPhoto').addEventListener('change', function (e) {
    var f = e.target.files[0]; e.target.value = ''; if (!f || !quickTarget) return;
    var which = quickTarget;
    readPhoto(f, function (err, data) {
      if (err) { toast(err); return; }
      var j = byId(ctx.id); j['photo' + which] = data; save(); render(); renderView(); toast('Photo ' + which.toLowerCase() + ' saved');
    });
  });

  /* ================= Photo helper (resize + 5MB check) ================= */
  var MAX = 5 * 1024 * 1024;
  function readPhoto(file, cb) {
    if (!/^image\//.test(file.type)) return cb('Please choose an image file.');
    if (file.size > MAX) return cb('File is larger than 5MB.');
    var r = new FileReader();
    r.onload = function () {
      var img = new Image();
      img.onload = function () {
        var s = Math.min(1, 560 / Math.max(img.width, img.height));
        var c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        cb(null, c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = function () { cb('Could not read this image.'); };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }

  /* =====================================================================
     EDIT
     ===================================================================== */
  function setPP(which, src) {
    var pp = $('.pp[data-which="' + which + '"]'); editPhotos[which] = src || '';
    var im = $('img', pp); im.hidden = !src; if (src) im.src = src;
    $('.none', pp).hidden = !!src;
  }
  function openEdit(j, fromView) {
    editId = j.id; editFromView = !!fromView;
    var propId = j.propId || getPropId(j);
    $('#editId').textContent = propId;
    $('#eDetails').value = j.details; $('#eDept').value = j.dept; $('#eArea').value = j.area; $('#eSub').value = j.sub;
    $('#eSubDept').value = j.assignDept || 'NA'; $('#eAssigned').value = j.assigned || '';
    $('#eStatus').value = j.status; $('#eClosedBy').value = j.closedBy || ''; $('#eRemarks').value = j.remarks || '';
    $('#eClosedByWrap').hidden = j.status !== 'Closed'; $('#editPhotoErr').textContent = '';
    setPP('Before', j.photoBefore); setPP('After', j.photoAfter);
    $('#editModal').hidden = false; $('#eDetails').focus();
  }
  $('#eStatus').addEventListener('change', function () {
    $('#eClosedByWrap').hidden = this.value !== 'Closed'; if (this.value === 'Closed' && !$('#eClosedBy').value) $('#eClosedBy').value = ME;
  });
  $$('#editModal .pp').forEach(function (pp) {
    var which = pp.dataset.which, input = $('input', pp);
    $('[data-pick]', pp).addEventListener('click', function () { input.click(); });
    $('[data-remove]', pp).addEventListener('click', function () { setPP(which, ''); });
    input.addEventListener('change', function () {
      var f = input.files[0]; input.value = ''; if (!f) return;
      readPhoto(f, function (err, data) { $('#editPhotoErr').textContent = err || ''; if (!err) setPP(which, data); });
    });
  });
  $('#editForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var det = $('#eDetails').value.trim(); if (!det) { $('#eDetails').focus(); return; }
    var j = byId(editId); if (!j) return;
    var was = j.status, st = $('#eStatus').value;
    j.details = det; j.dept = $('#eDept').value; j.area = $('#eArea').value; j.sub = $('#eSub').value.trim();
    j.assignDept = $('#eSubDept').value; j.assigned = $('#eAssigned').value.trim(); j.remarks = $('#eRemarks').value.trim();
    j.photoBefore = editPhotos.Before; j.photoAfter = editPhotos.After; j.status = st;
    if (st === 'Closed') { j.closedBy = $('#eClosedBy').value.trim() || ME; if (was !== 'Closed') j.closedAt = new Date().toISOString(); }
    else { j.closedAt = ''; j.closedBy = ''; }
    save(); closeModals(); render(); toast('Job ' + (j.propId || getPropId(j)) + ' updated');
    if (editFromView) openView(j.id, ctx.ids);
  });

  /* ================= Delete ================= */
  function openDelete(j) {
    deleteId = j.id;
    var propId = j.propId || getPropId(j);
    $('#delText').textContent = 'Are you sure you want to delete job ' + propId + ' "' + j.details + '"? This cannot be undone.';
    $('#delModal').hidden = false;
  }
  $('#confirmDelete').addEventListener('click', function () {
    var id = deleteId, i = ctx.ids.indexOf(id);
    var job = byId(id);
    var pId = job ? (job.propId || getPropId(job)) : '';
    jobs = jobs.filter(function (j) { return j.id !== id; });
    ctx.ids = ctx.ids.filter(function (x) { return x !== id; });
    save(); $('#delModal').hidden = true; render(); toast('Job ' + pId + ' deleted');
    if (!$('#viewModal').hidden) {
      if (ctx.ids.length) { ctx.id = ctx.ids[Math.min(i, ctx.ids.length - 1)]; renderView(); } else closeView();
    }
  });

  function closeModals() {
    $('#assignModal').hidden = true;
    $('#closeModal').hidden = true;
    $('#editModal').hidden = true;
    $('#delModal').hidden = true;
  }
  document.addEventListener('click', function (e) {
    if (e.target.hasAttribute('data-close') || (e.target.classList.contains('modal') && e.target.id !== 'viewModal')) {
      var wasEdit = !$('#editModal').hidden && editFromView;
      closeModals(); if (wasEdit) openView(editId, ctx.ids);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (!$('#lightbox').hidden) { $('#lightbox').hidden = true; return; }
      if (!$('#delModal').hidden) { $('#delModal').hidden = true; return; }
      if (!$('#assignModal').hidden) { $('#assignModal').hidden = true; return; }
      if (!$('#closeModal').hidden) { $('#closeModal').hidden = true; return; }
      if (!$('#editModal').hidden) { var w = editFromView; closeModals(); if (w) openView(editId, ctx.ids); return; }
      if (!$('#viewModal').hidden) { closeView(); return; }
      closeMenus();
    }
    if (!$('#viewModal').hidden && $('#editModal').hidden && $('#delModal').hidden && $('#assignModal').hidden && $('#closeModal').hidden && !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName)) {
      if (e.key === 'ArrowLeft') vnav(-1); if (e.key === 'ArrowRight') vnav(1);
    }
  });

  /* ================= New Job Form ================= */
  function setPhoto(file) {
    var err = $('#photoErr'); err.textContent = ''; if (!file) return;
    readPhoto(file, function (er, data) {
      if (er) { err.textContent = er; $('#fPhoto').value = ''; return; }
      photoData = data; $('#preview').src = data; $('#preview').hidden = false; $('#dropText').hidden = true;
    });
  }
  $('#fPhoto').addEventListener('change', function (e) { setPhoto(e.target.files[0]); });
  var drop = $('#drop');
  ['dragover', 'dragenter'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function () { drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { e.preventDefault(); setPhoto(e.dataTransfer.files[0]); });

  function resetForm() {
    $('#jobForm').reset(); photoData = '';
    $('#preview').hidden = true; $('#preview').src = ''; $('#dropText').hidden = false; $('#photoErr').textContent = '';
    $$('.fld.bad').forEach(function (f) { f.classList.remove('bad'); });
    $$('#jobForm .err').forEach(function (x) { if (x.id !== 'photoErr') x.textContent = ''; });
  }
  $('#btnCancel').addEventListener('click', resetForm);
  function check(id, msg) {
    var el = $('#' + id), box = el.closest('.fld'), bad = !el.value.trim();
    box.classList.toggle('bad', bad); box.querySelector('.err').textContent = bad ? msg : ''; return !bad;
  }
  $('#jobForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = check('fDept', 'Select a department'); ok = check('fArea', 'Select an area') && ok; ok = check('fDetails', 'Enter job details') && ok;
    if (!ok) return;
    var id = nextId();
    var opened = new Date().toISOString();
    var dept = $('#fDept').value;
    var propId = getPropId({ id: id, opened: opened, dept: dept });
    jobs.unshift({
      id: id, propId: propId, details: $('#fDetails').value.trim(), by: $('#fBy').value, dept: dept, area: $('#fArea').value, sub: $('#fSub').value.trim(),
      opened: opened, photoBefore: photoData, assignDept: 'NA', assigned: '', photoAfter: '', status: 'Open', remarks: '', closedBy: '', closedAt: ''
    });
    save(); resetForm(); render(); setTab('open'); toast('Job ' + propId + ' created - see it in the Open tab');
  });

  /* ================= Export ================= */
  function exportRows() {
    var head = ['Job ID', 'Job Details', 'Issued By', 'Issued To', 'Area', 'Sub-Area', 'Open Date/Time', 'Assign Sub-Dept', 'Assign Name', 'Status', 'Closed By', 'Closed Date/Time', 'Remarks'];
    return [head].concat(listFor(state.tab).map(function (j) {
      return [j.propId || getPropId(j), j.details, j.by, j.dept, j.area, j.sub, fmt(j.opened), j.assignDept || 'NA', j.assigned || 'NA', j.status, j.closedBy || '', j.closedAt ? fmt(j.closedAt) : '', j.remarks || ''];
    }));
  }
  $('#btnCopy').addEventListener('click', function () {
    var txt = exportRows().map(function (r) { return r.join('\t'); }).join('\n');
    (navigator.clipboard ? navigator.clipboard.writeText(txt) : Promise.reject()).then(function () { toast('Copied ' + (exportRows().length - 1) + ' rows'); }, function () { toast('Copy not allowed in this browser'); });
  });

  function exportExcel() {
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
      toast('Exported ' + (rows.length - 1) + ' jobs to Excel (' + fileName + ')');
    } else {
      var csv = '\uFEFF' + rows.map(function (r) { return r.map(function (c) { return '"' + String(c).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8' }));
      a.download = fileName; a.click(); URL.revokeObjectURL(a.href);
      toast('Exported ' + (rows.length - 1) + ' jobs');
    }
  }

  var btnExcel = $('#btnExcel') || $('#btnCsv');
  if (btnExcel) btnExcel.addEventListener('click', exportExcel);
  var btnCsv = $('#btnCsv');
  if (btnCsv && btnCsv !== btnExcel) btnCsv.addEventListener('click', exportExcel);
  $('#btnPrint').addEventListener('click', function () { window.print(); });

  /* ================= Reset Demo ================= */
  $('#resetDemo').addEventListener('click', function () {
    if (!confirm('Reset all jobs from the Excel & CSV database (351 jobs)?')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    jobs = (window.WORKWIZE_SEED_JOBS && window.WORKWIZE_SEED_JOBS.length) ? JSON.parse(JSON.stringify(window.WORKWIZE_SEED_JOBS)) : [];
    jobs.forEach(function (j) { if (!j.propId) j.propId = getPropId(j); });
    save(); clearAll(); render(); toast('All 351 jobs from Excel & CSV restored!');
  });

  var toTop = $('#toTop');
  window.addEventListener('scroll', function () { toTop.hidden = window.scrollY < 500; }, { passive: true });
  toTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });

  // Default to Open tab so user directly sees the Excel jobs!
  setTab('open');
})();
