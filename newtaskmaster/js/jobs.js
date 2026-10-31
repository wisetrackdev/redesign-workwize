/**
 * WorkWize Jobs by Area Logic
 * Connected to live API: api/jobtracker/getjoboverview & api/jobtracker/getallproperty
 */

let areaOverviewData = [];
let allPropertiesMap = {};

// Standard 8 operational areas matching taskmaster
const ALL_OPERATIONAL_AREAS = [
  { name: "Development/Project", id: "AR_55857", icon: "fa-cubes" },
  { name: "Fire Safety", id: "AR_FIRE", icon: "fa-fire-extinguisher" },
  { name: "Back of the House", id: "AR_BOH", icon: "fa-door-open" },
  { name: "CAPEX", id: "AR_CAPEX", icon: "fa-sack-dollar" },
  { name: "SOP & Checklist", id: "AR_SOP", icon: "fa-list-check" },
  { name: "Energy Management", id: "AR_ENERGY", icon: "fa-bolt-lightning" },
  { name: "Waste Management", id: "AR_WASTE", icon: "fa-recycle" },
  { name: "Utility", id: "AR_UTILITY", icon: "fa-faucet-drip" }
];

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
        <td colspan="6" class="text-center py-10 text-slate-400">
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

        // Mirror taskmaster: if no property or default PROP-001 or invalid, select first valid property
        const storedProp = localStorage.getItem("workwize_current_property");
        if (!storedProp || storedProp === "PROP-001" || !props.some(p => p.propId === storedProp)) {
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

    if (Array.isArray(response)) {
      const apiAreas = response.map(item => {
        const total = (item.total_jobs !== undefined && item.total_jobs !== null && !isNaN(item.total_jobs))
          ? Number(item.total_jobs)
          : ((item.total !== undefined && item.total !== null && !isNaN(item.total)) ? Number(item.total) : 0);

        const open = (item.open_jobs !== undefined && item.open_jobs !== null && !isNaN(item.open_jobs))
          ? Number(item.open_jobs)
          : ((item.open !== undefined && item.open !== null && !isNaN(item.open)) ? Number(item.open) : 0);

        const safety = (item.safety_jobs !== undefined && item.safety_jobs !== null && !isNaN(item.safety_jobs))
          ? Number(item.safety_jobs)
          : ((item.safety !== undefined && item.safety !== null && !isNaN(item.safety)) ? Number(item.safety) : 0);

        // Safe extraction of date breakdown (within 30 days, 31 to 89 days, 90+ days ago)
        // If data exists, display that number, otherwise strictly default to 0
        const jobsObj = item.jobs || {};
        const day30 = (jobsObj.day30 !== undefined && jobsObj.day30 !== null && !isNaN(jobsObj.day30)) ? Number(jobsObj.day30) : 0;
        const day60 = (jobsObj.day60 !== undefined && jobsObj.day60 !== null && !isNaN(jobsObj.day60)) ? Number(jobsObj.day60) : 0;
        const day90 = (jobsObj.day90 !== undefined && jobsObj.day90 !== null && !isNaN(jobsObj.day90)) ? Number(jobsObj.day90) : 0;

        return {
          id: item.areaID || item.id || (item.areaName ? item.areaName.toLowerCase().replace(/\s+/g, '-') : 'area'),
          name: item.areaName || item.name || 'Operational Area',
          total: total,
          open: open,
          safety: safety,
          day30: day30,
          day60: day60,
          day90: day90,
          icon: getAreaIcon(item.areaName || item.name)
        };
      });

      // Merge with standard areas so that all operational areas always show up in the table
      const mergedAreas = [...apiAreas];
      ALL_OPERATIONAL_AREAS.forEach(std => {
        const found = mergedAreas.some(a => 
          a.name.toLowerCase().includes(std.name.toLowerCase()) || 
          std.name.toLowerCase().includes(a.name.toLowerCase()) ||
          a.id === std.id
        );
        if (!found) {
          mergedAreas.push({
            id: std.id,
            name: std.name,
            total: 0,
            open: 0,
            safety: 0,
            day30: 0,
            day60: 0,
            day90: 0,
            icon: std.icon
          });
        }
      });

      areaOverviewData = mergedAreas;
      updateAreaStats(areaOverviewData);
      renderJobsByAreaTable();
      return;
    }
  } catch (error) {
    console.warn("API Overview failed, falling back to local database:", error.message);
  }

  // Fallback: render ALL operational areas with 0 counts (no static mock data)
  areaOverviewData = ALL_OPERATIONAL_AREAS.map(std => ({
    id: std.id,
    name: std.name,
    total: 0,
    open: 0,
    safety: 0,
    day30: 0,
    day60: 0,
    day90: 0,
    icon: std.icon
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

  if (typeof updateHeaderBadges === "function") {
    updateHeaderBadges(open, closed);
  }
}

function renderJobsByAreaTable(filterQuery = "") {
  const tbody = document.getElementById("jobsByAreaTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  const filtered = areaOverviewData.filter(a =>
    a.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const counterEl = document.getElementById("areaTotalCounter");
  if (counterEl) {
    counterEl.textContent = `Total ${filtered.length} Operational Areas`;
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center py-8 text-slate-400 text-xs">
          No operational areas matched "${filterQuery}".
        </td>
      </tr>
    `;
    return;
  }

  const maxJobsInList = Math.max(1, ...areaOverviewData.map(a => Number(a.total) || 0));

  filtered.forEach((area, index) => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/20 transition-colors";

    // Progress bar calculations (proportional to maxJobsInList for visual comparison)
    const totalBarWidth = Math.max(6, Math.min(100, Math.round(((Number(area.total) || 0) / maxJobsInList) * 100)));
    const openBarWidth = area.open > 0 ? Math.max(6, Math.min(100, Math.round(((Number(area.open) || 0) / maxJobsInList) * 100))) : 0;
    const safetyBarWidth = area.safety > 0 ? Math.max(6, Math.min(100, Math.round(((Number(area.safety) || 0) / maxJobsInList) * 100))) : 0;

    const isLastRows = index >= (filtered.length - 3);

    tr.innerHTML = `
      <td class="text-slate-400 font-medium">${index + 1}</td>
      <td class="font-medium text-slate-800">
        <div class="flex items-center gap-2.5">
          <span class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0 shadow-xs">
            <i class="fa-solid ${area.icon}"></i>
          </span>
          <div>
            <a href="javascript:void(0);" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" class="hover:text-blue-600 font-bold text-slate-900 transition-colors cursor-pointer" title="Click to view all jobs in ${area.name}">
              ${area.name}
            </a>
          </div>
        </div>
      </td>
      <td>
        <a href="javascript:void(0);" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" class="font-extrabold text-slate-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5" title="View all ${area.total} jobs in ${area.name}">
          <span>${area.total}</span>
          <i class="fa-solid fa-arrow-up-right-from-square text-[9px] text-slate-300 hover:text-blue-500"></i>
        </a>
      </td>
      <td>
        <!-- Open Count with Dropdown for Age Spans -->
        <div class="relative inline-block text-left dropdown-group">
          <button type="button" class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200/80 transition-all cursor-pointer shadow-xs" onclick="toggleRowMenu(this)" title="Click to view open jobs breakdown by age">
            <span>${area.open}</span>
            <i class="fa-solid fa-chevron-down text-[9px] text-blue-500"></i>
          </button>

          <!-- Dropdown Menu -->
          <div class="hidden absolute left-0 ${isLastRows ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} w-60 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-40 text-xs text-slate-700 dropdown-menu animate-fade-in">
            <div class="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">
              <span>Open Jobs by Age</span>
              <i class="fa-regular fa-clock text-blue-500"></i>
            </div>

            <a href="javascript:void(0);" onclick="showAreaJobsByDateModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}', 'd30')" class="flex items-center justify-between px-3.5 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors">
              <span class="flex items-center gap-2 font-medium">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Within 30 Days
              </span>
              <span class="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">${area.day30}</span>
            </a>

            <a href="javascript:void(0);" onclick="showAreaJobsByDateModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}', 'd60')" class="flex items-center justify-between px-3.5 py-2 hover:bg-amber-50 text-slate-700 hover:text-amber-700 transition-colors">
              <span class="flex items-center gap-2 font-medium">
                <span class="w-2 h-2 rounded-full bg-amber-500"></span> 31 to 89 Days
              </span>
              <span class="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">${area.day60}</span>
            </a>

            <a href="javascript:void(0);" onclick="showAreaJobsByDateModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}', 'd90')" class="flex items-center justify-between px-3.5 py-2 hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-colors">
              <span class="flex items-center gap-2 font-medium">
                <span class="w-2 h-2 rounded-full bg-rose-500"></span> 90+ Days Ago
              </span>
              <span class="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">${area.day90}</span>
            </a>

            <div class="border-t border-slate-100 my-1"></div>

            <a href="javascript:void(0);" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" class="block px-3.5 py-1.5 text-center text-blue-600 hover:bg-blue-50 font-semibold text-[11px]">
              View All Open Jobs (${area.open})
            </a>
          </div>
        </div>
      </td>
      <td>
        <span class="px-2.5 py-0.5 rounded-full text-xs font-bold ${area.safety > 0 ? 'bg-rose-50 text-rose-600 border border-rose-200' : 'text-slate-400 bg-slate-50'}">
          ${area.safety}
        </span>
      </td>
      <td style="min-width: 260px;">
        <!-- 3 Progress Graph Lines: Total Jobs, Open Jobs, Safety Issues -->
        <div class="flex flex-col gap-1.5 py-1">
          <!-- 1. Total Jobs -->
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold text-slate-600 w-16 shrink-0 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Total
            </span>
            <div class="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="bg-emerald-500 h-full rounded-full transition-all duration-300" style="width: ${totalBarWidth}%" title="Total Jobs: ${area.total}"></div>
            </div>
            <span class="text-[11px] font-extrabold text-slate-700 w-6 text-right">${area.total}</span>
          </div>

          <!-- 2. Open Jobs -->
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold text-slate-600 w-16 shrink-0 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-600"></span> Open
            </span>
            <div class="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="bg-blue-600 h-full rounded-full transition-all duration-300" style="width: ${openBarWidth}%" title="Open Jobs: ${area.open}"></div>
            </div>
            <span class="text-[11px] font-extrabold text-blue-600 w-6 text-right">${area.open}</span>
          </div>

          <!-- 3. Safety Issues -->
          <div class="flex items-center gap-2">
            <span class="text-[10px] font-bold text-slate-600 w-16 shrink-0 flex items-center gap-1">
              <span class="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Safety
            </span>
            <div class="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
              <div class="bg-rose-500 h-full rounded-full transition-all duration-300" style="width: ${safetyBarWidth}%" title="Safety Issues: ${area.safety}"></div>
            </div>
            <span class="text-[11px] font-extrabold text-rose-600 w-6 text-right">${area.safety}</span>
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
      } else if (Array.isArray(res)) {
        jobs = res;
      }

      // Keep all 15 table headers visible and aligned 1-to-1 with table rows
      const villaHeader = document.getElementById("areaModalVillaHeader");
      if (villaHeader) {
        villaHeader.classList.remove("hidden");
      }
    } catch (err) {
      console.warn("API getAreaJobs error, falling back to local DB:", err);
    }
  }

  if (!jobs || !Array.isArray(jobs)) {
    jobs = [];
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
    } else if (Array.isArray(res)) {
      jobs = res;
    }

    // Keep all 15 table headers visible and aligned 1-to-1 with table rows
    const villaHeader = document.getElementById("areaModalVillaHeader");
    if (villaHeader) {
      villaHeader.classList.remove("hidden");
    }
  } catch (e) {
    console.warn("API getAreaJobsByDate error:", e);
  }

  if (!jobs || !Array.isArray(jobs)) {
    jobs = [];
  }

  currentAreaModalJobs = jobs;
  renderAreaModalRows(jobs);

  const countSpan = document.getElementById("areaModalJobCount");
  const footerCount = document.getElementById("areaModalFooterCount");
  if (countSpan) countSpan.textContent = jobs.length;
  if (footerCount) footerCount.textContent = `Total ${jobs.length} jobs (${dateLabel})`;

  // Attach search filter inside modal
  const searchInput = document.getElementById("areaModalSearchInput");
  if (searchInput) {
    searchInput.value = "";
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

function renderAreaModalRows(jobs) {
  const tbody = document.getElementById("areaModalTableBody");
  if (!tbody) return;

  // Always keep all 15 columns visible and matching 1:1 with headers
  const villaHeader = document.getElementById("areaModalVillaHeader");
  if (villaHeader) {
    villaHeader.classList.remove("hidden");
  }

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

  // Point 11: Sort area modal jobs by create date with asc/desc toggle
  const sortedJobs = [...jobs].sort((a, b) => {
    const timeA = (a.jobCreatedOn || a.openedOn) ? new Date(a.jobCreatedOn || a.openedOn).getTime() : 0;
    const timeB = (b.jobCreatedOn || b.openedOn) ? new Date(b.jobCreatedOn || b.openedOn).getTime() : 0;
    if (isNaN(timeA) && isNaN(timeB)) return 0;
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;
    return currentAreaModalSortOrder === "asc" ? timeA - timeB : timeB - timeA;
  });

  tbody.innerHTML = sortedJobs.map(j => {
    const displayId = j.orgjobId || j.jobId;
    const rawId = j.jobId || j.orgjobId;

    // Badges
    const normStatus = normalizeStatusString(j.jobStatus || j.status);
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
    const detailText = j.jobDetail || j.details || j.title || "";

    return `
      <tr class="hover:bg-blue-50/40 transition-colors">
        <!-- 1. ID -->
        <td>
          <a href="job-details.html?id=${encodeURIComponent(rawId)}" target="_blank" class="font-bold text-blue-600 hover:underline hover:text-blue-800" title="Open Job ${displayId}">
            ${displayId}
          </a>
        </td>
        <!-- 2. VILLA -->
        <td class="font-semibold text-slate-800">
          ${(j.villaNumber && j.villaNumber !== '-' && j.villaNumber !== 'null') ? j.villaNumber : '<span class="text-slate-300">-</span>'}
        </td>
        <!-- 3. DETAILS (Point 3: Interactive Hover Preview Card) -->
        <td class="max-w-[260px] relative group text-slate-700 font-medium">
          <div class="truncate cursor-help flex items-center gap-1.5" title="${escapeHtml(detailText)}">
            <span class="truncate">${escapeHtml(detailText) || '<span class="text-slate-400">No details provided</span>'}</span>
            <i class="fa-solid fa-circle-info text-[10px] text-slate-400 group-hover:text-blue-500 shrink-0"></i>
          </div>
          <!-- Hover Details Card -->
          <div class="hidden group-hover:block absolute left-4 top-full mt-1 w-80 max-w-sm p-3.5 bg-slate-900/95 backdrop-blur text-white text-xs rounded-xl shadow-2xl z-50 pointer-events-none transition-all duration-200 border border-slate-700">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-2">
              <span class="font-bold text-blue-400 flex items-center gap-1.5 text-[11px]"><i class="fa-solid fa-file-lines"></i> Job Details Preview</span>
              <span class="text-[10px] text-slate-400">${displayId}</span>
            </div>
            <p class="whitespace-pre-wrap leading-relaxed text-slate-200 text-xs">${escapeHtml(detailText)}</p>
            <div class="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Location: <b class="text-slate-200">${escapeHtml(j.jobLocation || j.location || 'N/A')}</b></span>
              <span>Villa: <b class="text-slate-200">${escapeHtml(j.villaNumber || 'N/A')}</b></span>
            </div>
          </div>
        </td>
        <!-- 4. CREATE DATE -->
        <td class="text-slate-500">${formatDateStr(j.jobCreatedOn || j.openedOn)}</td>
        <!-- 5. LOCATION -->
        <td class="text-slate-600">${j.jobLocation || j.location || '<span class="text-slate-300">-</span>'}</td>
        <!-- 6. PRIORITY -->
        <td>
          <span class="badge-priority ${priorityCls}">${normPriority}</span>
        </td>
        <!-- 7. STATUS -->
        <td>
          <span class="badge-status ${statusCls}">${normStatus}</span>
        </td>
        <!-- 8. REF NO -->
        <td class="text-slate-600 font-mono text-[10px]">${(j.refNum && j.refNum !== 'null') ? j.refNum : (j.refNo || '<span class="text-slate-300">-</span>')}</td>
        <!-- 9. ASSIGNED TO -->
        <td class="text-slate-700">${assignedText}</td>
        <!-- 10. EXPECTED COMPLETION DATE -->
        <td class="text-slate-500">${formatDateStr(j.expectedCompletion || j.expectedDate)}</td>
        <!-- 11. CLOSE DATE -->
        <td class="text-slate-500">${formatDateStr(j.jobCloseOn || j.closedOn)}</td>
        <!-- 12. ATTACHMENTS -->
        <td class="text-center font-semibold text-slate-600">
          <span class="inline-flex items-center gap-1"><i class="fa-regular fa-image text-blue-500"></i> ${attachmentsCount}</span>
        </td>
        <!-- 13. COMMENTS -->
        <td class="text-center font-semibold text-slate-600">
          <span class="inline-flex items-center gap-1"><i class="fa-regular fa-comment text-slate-400"></i> ${commentsCount}</span>
        </td>
        <!-- 14. CREATED BY -->
        <td class="text-slate-600">${createdByText}</td>
        <!-- 15. PROPERTY -->
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


// ==========================================
// Point 11: Toggle Date Sort in Area Modal
// ==========================================
function toggleAreaModalDateSort() {
  currentAreaModalSortOrder = currentAreaModalSortOrder === "asc" ? "desc" : "asc";
  const icon = document.getElementById("areaModalSortIcon");
  if (icon) {
    icon.className = currentAreaModalSortOrder === "asc" 
      ? "fa-solid fa-arrow-up-short-wide ml-1 text-blue-600" 
      : "fa-solid fa-arrow-down-short-wide ml-1 text-blue-600";
  }
  const searchInput = document.getElementById("areaModalSearchInput");
  const q = (searchInput?.value || "").toLowerCase().trim();
  const filtered = q ? currentAreaModalJobs.filter(j => {
    const text = ((j.orgjobId || j.jobId || '') + ' ' + (j.jobDetail || j.details || '') + ' ' + (j.jobLocation || '') + ' ' + (j.villaNumber || '')).toLowerCase();
    return text.includes(q);
  }) : currentAreaModalJobs;
  renderAreaModalRows(filtered);
}
window.toggleAreaModalDateSort = toggleAreaModalDateSort;

// ==========================================
// Point 4: Export Area Jobs to CSV with Details
// ==========================================
function exportAreaJobsToCSV() {
  if (!currentAreaModalJobs || currentAreaModalJobs.length === 0) {
    if (typeof showToast === "function") showToast("No jobs to export.", "error");
    else alert("No jobs to export.");
    return;
  }

  const headers = [
    "ID",
    "VILLA",
    "DETAILS",
    "CREATE DATE",
    "LOCATION",
    "PRIORITY",
    "STATUS",
    "REF NO",
    "ASSIGNED TO",
    "EXPECTED COMPLETION DATE",
    "CLOSE DATE",
    "ATTACHMENTS",
    "COMMENTS",
    "CREATED BY",
    "PROPERTY"
  ];

  const rows = currentAreaModalJobs.map(j => {
    const displayId = j.orgjobId || j.jobId;
    const detailText = (j.jobDetail || j.details || "").replace(/"/g, '""').replace(/\r?\n/g, ' ');
    let assigned = "Unassigned";
    if (Array.isArray(j.data1) && j.data1.length > 0) {
      assigned = j.data1.map(t => t.teamName || t.name || t).join(", ");
    } else if (j.assignedTo) {
      assigned = j.assignedTo;
    }
    const createdBy = `${j.firstname || ""} ${j.lastname || ""}`.trim() || "-";

    return [
      `"${displayId}"`,
      `"${j.villaNumber || "-"}"`,
      `"${detailText}"`,
      `"${j.jobCreatedOn || j.openedOn || "-"}"`,
      `"${(j.jobLocation || j.location || "-").replace(/"/g, '""')}"`,
      `"${j.priority || "MEDIUM"}"`,
      `"${j.jobStatus || j.status || "-"}"`,
      `"${j.refNum || j.refNo || "-"}"`,
      `"${assigned.replace(/"/g, '""')}"`,
      `"${j.expectedCompletion || j.expectedDate || "-"}"`,
      `"${j.jobCloseOn || j.closeDate || "-"}"`,
      `"${j.uploadCount !== undefined ? j.uploadCount : (Array.isArray(j.imageUploads) ? j.imageUploads.length : 0)}"`,
      `"${j.commentCount !== undefined ? j.commentCount : (Array.isArray(j.comments) ? j.comments.length : 0)}"`,
      `"${createdBy.replace(/"/g, '""')}"`,
      `"${(j.propName || WorkWizeAPI.getCurrentPropertyName() || "-").replace(/"/g, '""')}"`
    ].join(",");
  });

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  const fileName = (currentAreaModalName ? currentAreaModalName.replace(/\s+/g, '_') : 'Area') + `_Jobs_${new Date().toISOString().split("T")[0]}.csv`;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (typeof showToast === "function") {
    showToast(`Exported ${currentAreaModalJobs.length} area jobs to CSV.`, "success");
  }
}
window.exportAreaJobsToCSV = exportAreaJobsToCSV;
