/**
 * WorkWize Jobs by Area Logic
 * Connected to live API: api/jobtracker/getjoboverview & api/jobtracker/getallproperty
 */

let areaOverviewData = [];
let allPropertiesMap = {};

document.addEventListener("DOMContentLoaded", function () {
  initJobsByArea();
  initAreaSearch();

  // Listen for property changes from header
  window.addEventListener("workwize:propertyChanged", function (e) {
    initJobsByArea();
  });
});

async function initJobsByArea() {
  const tbody = document.getElementById("jobsByAreaTableBody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-10 text-slate-400">
          <i class="fa-solid fa-circle-notch fa-spin text-xl text-blue-600 mb-2"></i>
          <p class="text-xs">Loading operational areas from server...</p>
        </td>
      </tr>
    `;
  }

  try {
    // 1. Fetch properties if possible
    try {
      const props = await WorkWizeAPI.getAllProperties();
      if (Array.isArray(props) && props.length > 0) {
        props.forEach(p => {
          allPropertiesMap[p.propId] = p.propName;
        });

        // If no property selected, pick first
        if (!localStorage.getItem("workwize_current_property")) {
          WorkWizeAPI.setCurrentProperty(props[0].propId, props[0].propName);
        }
      }
    } catch (e) {
      console.warn("Could not load properties from API:", e.message);
    }

    const currentPropId = WorkWizeAPI.getCurrentProperty();
    const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();

    const subtitleEl = document.getElementById("jobsPropertySubtitle");
    if (subtitleEl) {
      subtitleEl.textContent = `Property: ${currentPropName} - Track and manage jobs across areas`;
    }

    // 2. Fetch Job Overview by Area from API
    const response = await WorkWizeAPI.getJobOverview(currentPropId);

    if (Array.isArray(response) && response.length > 0) {
      areaOverviewData = response.map(item => ({
        id: item.areaID || item.id,
        name: item.areaName || item.name,
        total: item.total_jobs !== undefined ? item.total_jobs : (item.total || 0),
        open: item.open_jobs !== undefined ? item.open_jobs : (item.open || 0),
        safety: item.safety_jobs !== undefined ? item.safety_jobs : (item.safety || 0),
        day30: item.jobs ? item.jobs.day30 : 0,
        day60: item.jobs ? item.jobs.day60 : 0,
        day90: item.jobs ? item.jobs.day90 : 0,
        icon: getAreaIcon(item.areaName || item.name)
      }));

      updateAreaStats(areaOverviewData);
      renderJobsByAreaTable();
      return;
    }
  } catch (error) {
    console.warn("API Overview failed, falling back to local database:", error.message);
  }

  // Fallback to local data if API offline
  areaOverviewData = WorkWizeDB.getAreasSummary().map(a => ({
    id: a.name.toLowerCase().replace(/\s+/g, '-'),
    name: a.name,
    total: a.total,
    open: a.open,
    safety: a.safety,
    day30: Math.floor(a.open * 0.5),
    day60: Math.floor(a.open * 0.3),
    day90: Math.floor(a.open * 0.2),
    icon: a.icon || "fa-layer-group"
  }));

  updateAreaStats(areaOverviewData);
  renderJobsByAreaTable();
}

function updateAreaStats(areas) {
  const total = areas.reduce((sum, a) => sum + (Number(a.total) || 0), 0);
  const open = areas.reduce((sum, a) => sum + (Number(a.open) || 0), 0);
  const safety = areas.reduce((sum, a) => sum + (Number(a.safety) || 0), 0);
  const closed = Math.max(0, total - open);

  const totalEl = document.getElementById("statTotalJobs");
  const openEl = document.getElementById("statOpenJobs");
  const closedEl = document.getElementById("statClosedJobs");
  const safetyEl = document.getElementById("statSafetyJobs");

  if (totalEl) totalEl.textContent = total;
  if (openEl) openEl.textContent = open;
  if (closedEl) closedEl.textContent = closed;
  if (safetyEl) safetyEl.textContent = safety;
}

function renderJobsByAreaTable(filterQuery = "") {
  const tbody = document.getElementById("jobsByAreaTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const filtered = areaOverviewData.filter(a =>
    a.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center py-8 text-slate-400 text-xs">
          No operational areas matched "${filterQuery}".
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach((area, index) => {
    const tr = document.createElement("tr");

    // Dual progress calculations
    const closed = Math.max(0, area.total - area.open);
    const closedPct = area.total > 0 ? (closed / area.total) * 100 : 0;
    const openPct = area.total > 0 ? (area.open / area.total) * 100 : 0;

    tr.innerHTML = `
      <td class="text-slate-400 font-medium">${index + 1}</td>
      <td class="font-medium text-slate-800">
        <div class="flex items-center gap-2.5">
          <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0">
            <i class="fa-solid ${area.icon}"></i>
          </span>
          <div>
            <a href="javascript:void(0);" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" class="hover:text-blue-600 font-semibold transition-colors cursor-pointer" title="Click to view all jobs in ${area.name}">
              ${area.name}
            </a>
          </div>
        </div>
      </td>
      <td class="font-bold text-slate-800">
        <a href="javascript:void(0);" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" class="hover:text-blue-600 transition-colors">
          ${area.total}
        </a>
      </td>
      <td>
        <div class="flex items-center gap-2">
          <a href="javascript:void(0);" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" class="font-bold text-slate-800 hover:text-blue-600 transition-colors">
            ${area.open}
          </a>
          ${(area.day30 || area.day60 || area.day90) ? `
            <div class="flex items-center gap-1">
              ${area.day30 ? `<button type="button" onclick="showAreaJobsByDateModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}', 'd30')" class="text-[10px] bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 px-1.5 py-0.5 rounded font-medium transition-colors" title="Within 30 Days (${area.day30})">&le;30d: ${area.day30}</button>` : ''}
              ${area.day60 ? `<button type="button" onclick="showAreaJobsByDateModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}', 'd60')" class="text-[10px] bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 px-1.5 py-0.5 rounded font-medium transition-colors" title="31 to 89 Days (${area.day60})">31-89d: ${area.day60}</button>` : ''}
            </div>
          ` : ''}
        </div>
      </td>
      <td>
        <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${area.safety > 0 ? 'bg-rose-50 text-rose-600' : 'text-slate-400'}">
          ${area.safety}
        </span>
      </td>
      <td style="width: 220px;">
        <div class="flex items-center gap-3">
          <div class="progress-dual flex-1">
            <div class="progress-segment-closed" style="width: ${closedPct}%" title="Closed: ${closed}"></div>
            <div class="progress-segment-open" style="width: ${openPct}%" title="Open: ${area.open}"></div>
          </div>
          <div class="text-[11px] font-bold text-slate-500 w-12 text-right leading-none">
            <span class="text-blue-600">${area.total}</span>
          </div>
        </div>
      </td>
      <td class="text-right">
        <div class="relative inline-block text-left dropdown-group">
          <button class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors" onclick="toggleRowMenu(this)" title="Actions">
            <i class="fa-solid fa-ellipsis"></i>
          </button>
          <div class="hidden absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-20 text-xs text-slate-700 dropdown-menu">
            <a href="javascript:void(0);" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" class="block px-3.5 py-2 hover:bg-slate-50 text-blue-600 font-semibold">
              <i class="fa-regular fa-folder-open mr-2 text-blue-500"></i> View All Jobs
            </a>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openCreateJobForArea(areaName, areaId) {
  if (typeof openModal === "function") {
    openModal();
    const areaSelect = document.getElementById("modalArea");
    if (areaSelect) {
      // Find matching option
      for (let i = 0; i < areaSelect.options.length; i++) {
        if (areaSelect.options[i].text.toLowerCase() === areaName.toLowerCase() || areaSelect.options[i].value === areaId) {
          areaSelect.selectedIndex = i;
          if (typeof handleModalAreaChange === "function") {
            handleModalAreaChange();
          }
          break;
        }
      }
    }
  }
}

function getAreaIcon(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("compliance") || n.includes("legal")) return "fa-scale-balanced";
  if (n.includes("project") || n.includes("develop")) return "fa-cubes";
  if (n.includes("fire") || n.includes("safety")) return "fa-fire-extinguisher";
  if (n.includes("house") || n.includes("back")) return "fa-door-open";
  if (n.includes("capex")) return "fa-sack-dollar";
  if (n.includes("sop") || n.includes("checklist")) return "fa-list-check";
  if (n.includes("energy")) return "fa-bolt-lightning";
  if (n.includes("waste")) return "fa-recycle";
  if (n.includes("utility")) return "fa-faucet-drip";
  if (n.includes("villa") || n.includes("room")) return "fa-hotel";
  return "fa-layer-group";
}

function escapeHtml(str) {
  return String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");
}

function initAreaSearch() {
  const searchInput = document.getElementById("areaSearchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", function (e) {
    renderJobsByAreaTable(e.target.value.trim());
  });
}

function toggleRowMenu(btn) {
  const menu = btn.nextElementSibling;
  document.querySelectorAll(".dropdown-menu").forEach(m => {
    if (m !== menu) m.classList.add("hidden");
  });
  if (menu) {
    menu.classList.toggle("hidden");
  }
}

document.addEventListener("click", function (e) {
  if (!e.target.closest(".dropdown-group")) {
    document.querySelectorAll(".dropdown-menu").forEach(m => m.classList.add("hidden"));
  }
});

// Area Jobs Pop-up Modal Management (Mirrors taskmaster JobDetailsform)
let currentAreaModalJobs = [];

async function showAreaJobsModal(areaId, areaName) {
  const modal = document.getElementById("areaJobsModal");
  const titleArea = document.getElementById("areaModalAreaName");
  const titleProp = document.getElementById("areaModalPropName");
  const countSpan = document.getElementById("areaModalJobCount");
  const footerCount = document.getElementById("areaModalFooterCount");
  const searchInput = document.getElementById("areaModalSearchInput");
  const tbody = document.getElementById("areaModalTableBody");

  if (!modal || !tbody) return;

  const currentPropId = WorkWizeAPI.getCurrentProperty();
  const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();

  if (titleArea) titleArea.textContent = areaName;
  if (titleProp) titleProp.textContent = `[${currentPropName}]`;
  if (searchInput) searchInput.value = "";

  tbody.innerHTML = `
    <tr>
      <td colspan="15" class="py-12 text-center text-slate-400">
        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>
        <p class="text-xs">Loading jobs for ${areaName}...</p>
      </td>
    </tr>
  `;

  modal.classList.add("open");
  initAreaModalCloseListeners();

  let jobs = [];

  if (typeof WorkWizeAPI !== "undefined") {
    try {
      const res = await WorkWizeAPI.getAreaJobs(areaId);
      if (res && Array.isArray(res.jobs)) {
        jobs = res.jobs;
      }
    } catch (err) {
      console.warn("API getAreaJobs error, falling back to local DB:", err);
    }
  }

  // Fallback to local DB if empty or error
  if (!jobs || jobs.length === 0) {
    if (typeof WorkWizeDB !== "undefined") {
      const allLocal = WorkWizeDB.getJobs();
      jobs = allLocal.filter(j => 
        (j.area && j.area.toLowerCase() === areaName.toLowerCase()) ||
        (j.subArea && j.subArea.toLowerCase().includes(areaName.toLowerCase()))
      ).map(j => ({
        jobId: j.id,
        orgjobId: j.id,
        villaNumber: j.villaNumber || "-",
        jobDetail: j.details || j.title,
        jobCreatedOn: j.openedOn,
        jobLocation: j.location,
        priority: j.priority,
        jobStatus: j.status,
        refNum: j.refNo || "-",
        data1: [{ teamName: j.assignedTo }],
        expectedCompletion: j.expectedDate,
        jobCloseOn: j.status === "Closed" ? j.expectedDate : null,
        uploadCount: 0,
        commentCount: 0,
        firstname: typeof UserSession !== "undefined" ? UserSession.getUserName() : "User",
        lastname: "",
        propName: currentPropName
      }));
    }
  }

  currentAreaModalJobs = jobs;
  renderAreaModalRows(jobs);

  if (countSpan) countSpan.textContent = jobs.length;
  if (footerCount) footerCount.textContent = `Total ${jobs.length} jobs in ${areaName}`;

  // Search inside modal
  if (searchInput) {
    searchInput.oninput = function (e) {
      const q = e.target.value.toLowerCase().trim();
      const filtered = currentAreaModalJobs.filter(j => {
        const id = (j.orgjobId || j.jobId || "").toLowerCase();
        const detail = (j.jobDetail || j.title || "").toLowerCase();
        const villa = (j.villaNumber || "").toLowerCase();
        const loc = (j.jobLocation || "").toLowerCase();
        const ref = (j.refNum || "").toLowerCase();
        const stat = (j.jobStatus || "").toLowerCase();
        return id.includes(q) || detail.includes(q) || villa.includes(q) || loc.includes(q) || ref.includes(q) || stat.includes(q);
      });
      renderAreaModalRows(filtered);
    };
  }
}

async function showAreaJobsByDateModal(areaId, areaName, dateSpan) {
  const modal = document.getElementById("areaJobsModal");
  const titleArea = document.getElementById("areaModalAreaName");
  const titleProp = document.getElementById("areaModalPropName");
  const tbody = document.getElementById("areaModalTableBody");

  if (!modal || !tbody) return;

  const currentPropId = WorkWizeAPI.getCurrentProperty();
  const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();

  let dateLabel = "Within 30 Days";
  if (dateSpan === "d60") dateLabel = "31 to 89 Days";
  else if (dateSpan === "d90") dateLabel = "90+ Days Ago";

  if (titleArea) titleArea.textContent = `${areaName} (${dateLabel})`;
  if (titleProp) titleProp.textContent = `[${currentPropName}]`;

  tbody.innerHTML = `
    <tr>
      <td colspan="15" class="py-12 text-center text-slate-400">
        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>
        <p class="text-xs">Loading ${dateLabel} jobs for ${areaName}...</p>
      </td>
    </tr>
  `;

  modal.classList.add("open");
  initAreaModalCloseListeners();

  let jobs = [];
  try {
    const res = await WorkWizeAPI.getAreaJobsByDate(areaId, dateSpan);
    if (res && Array.isArray(res.jobs)) {
      jobs = res.jobs;
    }
  } catch (e) {
    console.warn("API getAreaJobsByDate error:", e);
  }

  currentAreaModalJobs = jobs;
  renderAreaModalRows(jobs);

  const countSpan = document.getElementById("areaModalJobCount");
  const footerCount = document.getElementById("areaModalFooterCount");
  if (countSpan) countSpan.textContent = jobs.length;
  if (footerCount) footerCount.textContent = `Total ${jobs.length} jobs (${dateLabel})`;
}

function renderAreaModalRows(jobs) {
  const tbody = document.getElementById("areaModalTableBody");
  if (!tbody) return;

  if (!jobs || jobs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="15" class="py-10 text-center text-slate-400 text-xs">
          No jobs found for this selection.
        </td>
      </tr>
    `;
    return;
  }

  // Sort jobs descending by create date (newest on top, older at bottom)
  const sortedJobs = [...jobs].sort((a, b) => {
    const timeA = (a.jobCreatedOn || a.openedOn) ? new Date(a.jobCreatedOn || a.openedOn).getTime() : 0;
    const timeB = (b.jobCreatedOn || b.openedOn) ? new Date(b.jobCreatedOn || b.openedOn).getTime() : 0;
    if (isNaN(timeA) && isNaN(timeB)) return 0;
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;
    return timeB - timeA;
  });

  tbody.innerHTML = sortedJobs.map(j => {
    const displayId = j.orgjobId || j.jobId;
    const rawId = j.jobId || j.orgjobId;

    // Badges
    const normStatus = normalizeStatusString(j.jobStatus);
    const normPriority = normalizePriorityString(j.priority);

    let statusCls = "badge-in-progress";
    if (normStatus === "Yet to Commence") statusCls = "badge-yet-to-commence";
    else if (normStatus === "Under Discussion") statusCls = "badge-under-discussion";
    else if (normStatus === "Closed" || normStatus === "Completed") statusCls = "badge-closed";
    else if (normStatus === "Fixed") statusCls = "badge-open";

    let priorityCls = "badge-priority-medium";
    if (normPriority.toLowerCase() === "high") priorityCls = "badge-priority-high";
    else if (normPriority.toLowerCase() === "low") priorityCls = "badge-priority-low";
    else if (normPriority.toLowerCase() === "safety") priorityCls = "badge-priority-safety";

    // Assigned text
    let assignedText = "Unassigned";
    if (Array.isArray(j.data1) && j.data1.length > 0) {
      assignedText = j.data1.map(t => t.teamName || t.name || t).join(", ");
    } else if (j.assignedTo) {
      assignedText = j.assignedTo;
    }

    const createdByText = `${j.firstname || ""} ${j.lastname || ""}`.trim() || "-";
    const attachmentsCount = j.uploadCount !== undefined ? j.uploadCount : (Array.isArray(j.imageUploads) ? j.imageUploads.length : 0);
    const commentsCount = j.commentCount !== undefined ? j.commentCount : (Array.isArray(j.comments) ? j.comments.length : 0);
    const propDisplay = j.propName || WorkWizeAPI.getCurrentPropertyName() || "-";

    return `
      <tr class="hover:bg-blue-50/40 transition-colors">
        <td>
          <a href="job-details.html?id=${encodeURIComponent(rawId)}" target="_blank" class="font-bold text-blue-600 hover:underline hover:text-blue-800" title="Open Job ${displayId}">
            ${displayId}
          </a>
        </td>
        <td class="font-semibold text-slate-800">
          ${j.villaNumber && j.villaNumber !== '-' ? j.villaNumber : '<span class="text-slate-300">-</span>'}
        </td>
        <td class="max-w-[260px] truncate text-slate-700 font-medium" title="${escapeHtml(j.jobDetail || '')}">
          ${j.jobDetail || '<span class="text-slate-400">No details provided</span>'}
        </td>
        <td class="text-slate-500">${formatDateStr(j.jobCreatedOn)}</td>
        <td class="text-slate-600">${j.jobLocation || '<span class="text-slate-300">-</span>'}</td>
        <td>
          <span class="badge-priority ${priorityCls}">${normPriority}</span>
        </td>
        <td>
          <span class="badge-status ${statusCls}">${normStatus}</span>
        </td>
        <td class="text-slate-600 font-mono text-[10px]">${j.refNum || '<span class="text-slate-300">-</span>'}</td>
        <td class="text-slate-700">${assignedText}</td>
        <td class="text-slate-500">${formatDateStr(j.expectedCompletion)}</td>
        <td class="text-slate-500">${formatDateStr(j.jobCloseOn)}</td>
        <td class="text-center font-semibold text-slate-600">
          <span class="inline-flex items-center gap-1"><i class="fa-regular fa-image text-blue-500"></i> ${attachmentsCount}</span>
        </td>
        <td class="text-center font-semibold text-slate-600">
          <span class="inline-flex items-center gap-1"><i class="fa-regular fa-comment text-slate-400"></i> ${commentsCount}</span>
        </td>
        <td class="text-slate-600">${createdByText}</td>
        <td class="text-slate-500">${propDisplay}</td>
      </tr>
    `;
  }).join("");
}

function initAreaModalCloseListeners() {
  const modal = document.getElementById("areaJobsModal");
  const closeBtn = document.getElementById("closeAreaModalBtn");
  const closeBtnBottom = document.getElementById("closeAreaModalBtnBottom");

  function closeAreaModal() {
    if (modal) modal.classList.remove("open");
  }

  if (closeBtn) closeBtn.onclick = closeAreaModal;
  if (closeBtnBottom) closeBtnBottom.onclick = closeAreaModal;

  if (modal) {
    modal.onclick = function (e) {
      if (e.target === modal) closeAreaModal();
    };
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeAreaModal();
  });
}

function normalizeStatusString(st) {
  if (!st) return "Yet to Commence";
  const s = String(st).toUpperCase();
  if (s.includes("YET") || s.includes("COMMENCE")) return "Yet to Commence";
  if (s.includes("PROGRESS")) return "In Progress";
  if (s.includes("DISCUSSION")) return "Under Discussion";
  if (s.includes("SPARES") || s.includes("ORDER")) return "Spares on Order";
  if (s.includes("FIX")) return "Fixed";
  if (s.includes("CLOSE") || s.includes("COMPLET")) return "Closed";
  return st;
}

function normalizePriorityString(p) {
  if (!p) return "Medium";
  const s = String(p).toUpperCase();
  if (s.includes("HIGH")) return "High";
  if (s.includes("LOW")) return "Low";
  if (s.includes("SAFETY")) return "Safety";
  return "Medium";
}

function formatDateStr(dateStr) {
  if (!dateStr || dateStr.startsWith("0001")) return '<span class="text-slate-300">-</span>';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
}

window.initJobsByArea = initJobsByArea;
window.renderJobsByAreaTable = renderJobsByAreaTable;
window.showAreaJobsModal = showAreaJobsModal;
window.showAreaJobsByDateModal = showAreaJobsByDateModal;
