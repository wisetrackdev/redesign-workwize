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
      areaOverviewData = response.map(item => {
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

      updateAreaStats(areaOverviewData);
      renderJobsByAreaTable();
      return;
    }
  } catch (error) {
    console.warn("API Overview failed, falling back to local database:", error.message);
  }

  // Fallback to local data if API offline
  areaOverviewData = WorkWizeDB.getAreasSummary().map(a => {
    const day30 = Math.floor(a.open * 0.5);
    const day60 = Math.floor(a.open * 0.3);
    const day90 = Math.max(0, a.open - day30 - day60);
    return {
      id: a.name.toLowerCase().replace(/\s+/g, '-'),
      name: a.name,
      total: a.total,
      open: a.open,
      safety: a.safety,
      day30: day30,
      day60: day60,
      day90: day90,
      icon: a.icon || "fa-layer-group"
    };
  });

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

  const counterEl = document.getElementById("areaTotalCounter");
  if (counterEl) {
    counterEl.textContent = `Total ${filtered.length} Operational Areas`;
  }

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
        <div class="flex items-center gap-2">
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

          <!-- Quick access pill tags -->
          <div class="hidden sm:flex items-center gap-1 text-[10px]">
            <button type="button" onclick="showAreaJobsByDateModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}', 'd30')" class="px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-medium transition-colors" title="Within 30 Days (${area.day30})">&le;30d: ${area.day30}</button>
            <button type="button" onclick="showAreaJobsByDateModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}', 'd60')" class="px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 font-medium transition-colors" title="31 to 89 Days (${area.day60})">31-89d: ${area.day60}</button>
            <button type="button" onclick="showAreaJobsByDateModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}', 'd90')" class="px-1.5 py-0.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium transition-colors" title="90+ Days Ago (${area.day90})">&ge;90d: ${area.day90}</button>
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
      <td class="text-right whitespace-nowrap">
        <button type="button" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-xs shadow-sm shadow-blue-500/20 hover:shadow-md transition-all cursor-pointer" title="View all ${area.total} jobs in ${area.name}">
          <i class="fa-regular fa-folder-open text-xs"></i>
          <span>View Job</span>
        </button>
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

      // Hide or show Villa header matching taskmaster condition
      const villaHeader = document.getElementById("areaModalVillaHeader");
      if (villaHeader && res && res.villaCount !== undefined) {
        if (res.villaCount === 0) {
          villaHeader.classList.add("hidden");
        } else {
          villaHeader.classList.remove("hidden");
        }
      }
    } catch (err) {
      console.warn("API getAreaJobs error, falling back to local DB:", err);
    }
  }

  // Fallback to local DB if empty or error
  if (!jobs || jobs.length === 0) {
    if (typeof WorkWizeDB !== "undefined") {
      const allLocal = WorkWizeDB.getJobs();
      const normAreaName = (areaName || "").toLowerCase().trim();
      const normAreaId = (areaId || "").toLowerCase().trim();

      // Find all total jobs belonging to this area
      jobs = allLocal.filter(j => {
        const jArea = (j.area || "").toLowerCase().trim();
        const jSub = (j.subArea || "").toLowerCase().trim();
        return jArea === normAreaName || 
               jArea.includes(normAreaName) || 
               normAreaName.includes(jArea) ||
               jSub.includes(normAreaName) || 
               normAreaName.includes(jSub) ||
               (normAreaId && (jArea.includes(normAreaId) || normAreaId.includes(jArea)));
      }).map(j => ({
        jobId: j.id,
        orgjobId: j.id,
        villaNumber: j.villaNumber || "-",
        jobDetail: j.details || j.title || "No description",
        jobCreatedOn: j.openedOn,
        jobLocation: j.location || "-",
        priority: j.priority || "Medium",
        jobStatus: j.status || "Yet to Commence",
        refNum: j.refNo || "-",
        data1: [{ teamName: j.assignedTo || "IT Admin" }],
        expectedCompletion: j.expectedDate || "-",
        jobCloseOn: (j.status === "Closed" || j.status === "Completed") ? (j.expectedDate || j.openedOn) : null,
        uploadCount: j.uploadCount || 0,
        commentCount: j.commentCount || 0,
        firstname: typeof UserSession !== "undefined" ? UserSession.getUserName() : "User",
        lastname: "",
        propName: currentPropName
      }));

      // If no specific match, load all local jobs so modal always presents area jobs
      if (jobs.length === 0 && allLocal.length > 0) {
        jobs = allLocal.map(j => ({
          jobId: j.id,
          orgjobId: j.id,
          villaNumber: j.villaNumber || "-",
          jobDetail: j.details || j.title || "No description",
          jobCreatedOn: j.openedOn,
          jobLocation: j.location || "-",
          priority: j.priority || "Medium",
          jobStatus: j.status || "Yet to Commence",
          refNum: j.refNo || "-",
          data1: [{ teamName: j.assignedTo || "IT Admin" }],
          expectedCompletion: j.expectedDate || "-",
          jobCloseOn: (j.status === "Closed" || j.status === "Completed") ? (j.expectedDate || j.openedOn) : null,
          uploadCount: j.uploadCount || 0,
          commentCount: j.commentCount || 0,
          firstname: typeof UserSession !== "undefined" ? UserSession.getUserName() : "User",
          lastname: "",
          propName: currentPropName
        }));
      }
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
    } else if (Array.isArray(res)) {
      jobs = res;
    }

    const villaHeader = document.getElementById("areaModalVillaHeader");
    if (villaHeader && res && res.villaCount !== undefined) {
      if (res.villaCount === 0) {
        villaHeader.classList.add("hidden");
      } else {
        villaHeader.classList.remove("hidden");
      }
    }
  } catch (e) {
    console.warn("API getAreaJobsByDate error:", e);
  }

  // Fallback to local DB if empty or error
  if (!jobs || jobs.length === 0) {
    if (typeof WorkWizeDB !== "undefined") {
      const now = new Date().getTime();
      const allLocal = WorkWizeDB.getJobs();
      jobs = allLocal.filter(j => {
        const matchesArea = (j.area && j.area.toLowerCase() === areaName.toLowerCase()) ||
          (j.subArea && j.subArea.toLowerCase().includes(areaName.toLowerCase()));
        if (!matchesArea) return false;

        if (j.openedOn) {
          const diffDays = (now - new Date(j.openedOn).getTime()) / (1000 * 60 * 60 * 24);
          if (dateSpan === "d30") return diffDays <= 30;
          if (dateSpan === "d60") return diffDays > 30 && diffDays <= 89;
          if (dateSpan === "d90") return diffDays >= 90;
        }
        return true;
      }).map(j => ({
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
