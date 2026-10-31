/**
 * WorkWize All Jobs List View Logic
 * Connected to live API: api/jobtracker/getpropertyjobs & api/jobtracker/updatejobfields
 * Implements the exact 15 headings and comprehensive filter suite from taskmaster
 */

let allJobsStore = [];
let filteredJobs = [];
let selectedJobIds = new Set();
let currentPage = 1;
let pageSize = 12;
let currentSortField = "createdOn";
let currentSortOrder = "desc";

document.addEventListener("DOMContentLoaded", async function () {
  // Point 15: Restore filter and search state from sessionStorage
  restoreAllJobsState();

  // Parse query string for pre-filled filters (URL params take precedence)
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get("search");
  const areaParam = urlParams.get("area");
  const statusParam = urlParams.get("status");

  const searchInput = document.getElementById("jobSearchInput");
  const areaSelect = document.getElementById("filterArea");
  const statusSelect = document.getElementById("filterStatus");

  if (searchParam && searchInput) searchInput.value = searchParam;
  if (areaParam && areaSelect) areaSelect.value = areaParam;
  if (statusParam && statusSelect) statusSelect.value = statusParam;

  // Page size selector
  const pageSizeSelect = document.getElementById("pageSizeSelect");
  if (pageSizeSelect) {
    pageSizeSelect.value = pageSize;
    pageSizeSelect.addEventListener("change", function () {
      pageSize = parseInt(this.value, 10) || 12;
      currentPage = 1;
      renderTableRows();
      renderPagination();
      updateCounterText();
    });
  }

  // Load jobs from API
  await loadAllJobsFromAPI();

  // Attach Filter Listeners
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      filterAndRenderJobs();
    });
  }

  ["filterProperty", "filterArea", "filterStatus", "filterPriority", "filterAssignedTo", "filterDateSpan", "filterSortOrder"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        if (id === "filterSortOrder") {
          currentSortOrder = el.value || "desc";
        }
        currentPage = 1;
        filterAndRenderJobs();
      });
    }
  });

  const clearFiltersBtn = document.getElementById("clearFiltersBtn");
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", resetAllFilters);
  }

  // Filter Sidebar Drawer Controls
  const filterToggleBtn = document.getElementById("filterToggleBtn");
  const filterSidebar = document.getElementById("filterSidebar");
  const filterSidebarBackdrop = document.getElementById("filterSidebarBackdrop");
  const closeFilterSidebarBtn = document.getElementById("closeFilterSidebarBtn");
  const cancelFilterSidebarBtn = document.getElementById("cancelFilterSidebarBtn");
  const applyFilterBtn = document.getElementById("applyFilterBtn");

  function openFilterSidebar() {
    if (!filterSidebar || !filterSidebarBackdrop) return;
    filterSidebarBackdrop.classList.remove("opacity-0", "pointer-events-none");
    filterSidebarBackdrop.classList.add("opacity-100");
    filterSidebar.classList.remove("translate-x-full");
    filterSidebar.classList.add("translate-x-0");
  }

  function closeFilterSidebar() {
    if (!filterSidebar || !filterSidebarBackdrop) return;
    filterSidebarBackdrop.classList.add("opacity-0", "pointer-events-none");
    filterSidebarBackdrop.classList.remove("opacity-100");
    filterSidebar.classList.add("translate-x-full");
    filterSidebar.classList.remove("translate-x-0");
  }

  if (filterToggleBtn) filterToggleBtn.addEventListener("click", openFilterSidebar);
  if (closeFilterSidebarBtn) closeFilterSidebarBtn.addEventListener("click", closeFilterSidebar);
  if (cancelFilterSidebarBtn) cancelFilterSidebarBtn.addEventListener("click", closeFilterSidebar);
  if (filterSidebarBackdrop) filterSidebarBackdrop.addEventListener("click", closeFilterSidebar);

  if (applyFilterBtn) {
    applyFilterBtn.addEventListener("click", function () {
      closeFilterSidebar();
      currentPage = 1;
      filterAndRenderJobs();
    });
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && filterSidebar && !filterSidebar.classList.contains("translate-x-full")) {
      closeFilterSidebar();
    }
  });

  // Select all checkbox
  const selectAllCheckbox = document.getElementById("selectAllCheckbox");
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener("change", function (e) {
      const isChecked = e.target.checked;
      const rowCheckboxes = document.querySelectorAll(".row-checkbox");
      rowCheckboxes.forEach(cb => {
        cb.checked = isChecked;
        const id = cb.getAttribute("data-id");
        if (isChecked) {
          selectedJobIds.add(id);
        } else {
          selectedJobIds.delete(id);
        }
      });
      updateBulkActionBar();
    });
  }

  // Export button
  const exportBtn = document.getElementById("exportJobsBtn");
  if (exportBtn) {
    exportBtn.addEventListener("click", exportJobsToCSV);
  }

  // Listen for property changes from header
  window.addEventListener("workwize:propertyChanged", function () {
    loadAllJobsFromAPI();
  });
});

async function loadAllJobsFromAPI() {
  const tbody = document.getElementById("allJobsTableBody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="17" class="py-12 text-center text-slate-400">
          <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>
          <p class="text-xs">Fetching job orders from server...</p>
        </td>
      </tr>
    `;
  }

  try {
    const currentPropId = WorkWizeAPI.getCurrentProperty();
    
    // Fetch property jobs & closed jobs in parallel
    const [propRes, closedRes] = await Promise.allSettled([
      WorkWizeAPI.getPropertyJobs(currentPropId),
      WorkWizeAPI.getClosedJobs(currentPropId)
    ]);

    let combinedMap = new Map();

    // 1. Process property jobs
    if (propRes.status === "fulfilled" && propRes.value) {
      const rawJobs = propRes.value?.jobs || propRes.value?.Jobs || propRes.value?.data || (Array.isArray(propRes.value) ? propRes.value : null);
      if (Array.isArray(rawJobs)) {
        rawJobs.forEach(j => {
          const m = mapApiJobToModel(j);
          const key = m.rawId || m.id;
          if (key) combinedMap.set(key, m);
        });
      }
    }

    // 2. Process closed jobs
    if (closedRes.status === "fulfilled" && closedRes.value) {
      const rawClosed = closedRes.value?.jobs || closedRes.value?.Jobs || closedRes.value?.data || (Array.isArray(closedRes.value) ? closedRes.value : null);
      if (Array.isArray(rawClosed)) {
        rawClosed.forEach(j => {
          const m = mapApiJobToModel(j, true);
          const key = m.rawId || m.id;
          if (key) combinedMap.set(key, m);
        });
      }
    }

    if (combinedMap.size > 0) {
      allJobsStore = Array.from(combinedMap.values());
      sortJobsDescending(allJobsStore);
      populateFilterDropdowns();
      const openCount = allJobsStore.filter(j => j.status !== "Closed").length;
      const closedCount = allJobsStore.filter(j => j.status === "Closed").length;
      if (typeof updateHeaderBadges === "function") updateHeaderBadges(openCount, closedCount);
      filterAndRenderJobs();
      return;
    }
  } catch (error) {
    console.warn("API loadAllJobsFromAPI failed:", error.message);
  }

  // If no jobs returned from API or API failed, strictly clear store (no static mock data)
  allJobsStore = [];
  populateFilterDropdowns();
  if (typeof updateHeaderBadges === "function") updateHeaderBadges(0, 0);
  filterAndRenderJobs();
}

/**
 * Point 11: Date Sorting across all sections (Created Date, Expected Date, Close Date)
 */
function sortJobsByField(jobs, field = currentSortField, order = currentSortOrder) {
  if (!Array.isArray(jobs)) return jobs;
  return jobs.sort((a, b) => {
    let valA = a[field];
    let valB = b[field];

    const timeA = (valA && !String(valA).startsWith("0001")) ? new Date(valA).getTime() : 0;
    const timeB = (valB && !String(valB).startsWith("0001")) ? new Date(valB).getTime() : 0;

    if (isNaN(timeA) && isNaN(timeB)) return 0;
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;

    return order === "asc" ? timeA - timeB : timeB - timeA;
  });
}

function sortJobsDescending(jobs) {
  return sortJobsByField(jobs, "createdOn", "desc");
}

function toggleSort(field) {
  if (currentSortField === field) {
    currentSortOrder = currentSortOrder === "asc" ? "desc" : "asc";
  } else {
    currentSortField = field;
    currentSortOrder = "desc";
  }

  // Update Sort dropdown if present
  const sortSelect = document.getElementById("filterSortOrder");
  if (sortSelect) sortSelect.value = currentSortOrder;

  // Update header icons
  ["createdOn", "expectedCompletion", "closeDate"].forEach(f => {
    const icon = document.getElementById(`sortIcon_${f}`);
    if (icon) {
      if (f === currentSortField) {
        icon.className = currentSortOrder === "asc" 
          ? "fa-solid fa-arrow-up-short-wide ml-1 text-blue-600" 
          : "fa-solid fa-arrow-down-short-wide ml-1 text-blue-600";
      } else {
        icon.className = "fa-solid fa-sort ml-1 text-slate-400";
      }
    }
  });

  saveAllJobsState();
  sortJobsByField(filteredJobs, currentSortField, currentSortOrder);
  renderTableRows();
  renderPagination();
  updateCounterText();
}
window.toggleSort = toggleSort;

function isClosedStatus(j) {
  if (!j) return false;
  if (typeof j === "object") {
    if (j.isActive === false || j.isActive === 0) return true;
    if (j.jobCloseOn && !String(j.jobCloseOn).startsWith("0001") && String(j.jobCloseOn) !== "1970-01-01T00:00:00") return true;
    const s = String(j.jobStatus || j.status || "").toLowerCase();
    return s.includes("close") || s.includes("complet");
  }
  const s = String(j).toLowerCase();
  return s.includes("close") || s.includes("complet");
}

function mapApiJobToModel(job, forceClosed = false) {
  const isClosed = forceClosed ||
    job.isActive === false || job.isActive === 0 ||
    isClosedStatus(job.jobStatus || job.JobStatus || job.status || job.Status) ||
    (job.jobCloseOn && !String(job.jobCloseOn).startsWith("0001") && String(job.jobCloseOn) !== "1970-01-01T00:00:00");

  const statusStr = isClosed ? "Closed" : normalizeStatus(job.jobStatus || job.JobStatus || job.status || job.Status);
  const priorityStr = normalizePriority(job.priority || job.Priority);
  const assignees = formatAssignee(job);

  return {
    id: job.orgjobId || job.OrgjobId || job.jobId || job.JobId,
    rawId: job.jobId || job.JobId,
    orgjobId: job.orgjobId || job.OrgjobId,
    villaNumber: job.villaNumber || job.VillaNumber || "",
    details: job.jobDetail || job.JobDetail || job.details || job.Details || "No description",
    createdOn: job.jobCreatedOn || job.JobCreatedOn || job.createdOn || job.CreatedOn,
    location: job.jobLocation || job.JobLocation || job.location || job.Location || "",
    priority: priorityStr,
    status: statusStr,
    isActive: job.isActive !== undefined ? job.isActive : (isClosed ? false : true),
    refNum: job.refNum || job.RefNum || job.refNo || job.RefNo || "",
    assignedTo: assignees,
    expectedCompletion: job.expectedCompletion || job.ExpectedCompletion,
    closeDate: job.jobCloseOn || job.JobCloseOn || job.closeDate,
    uploadCount: job.uploadCount !== undefined ? job.uploadCount : (job.UploadCount !== undefined ? job.UploadCount : (Array.isArray(job.imageUploads) ? job.imageUploads.length : 0)),
    commentCount: job.commentCount !== undefined ? job.commentCount : (job.CommentCount !== undefined ? job.CommentCount : (Array.isArray(job.comments) ? job.comments.length : 0)),
    createdBy: `${job.firstname || job.Firstname || ""} ${job.lastname || job.Lastname || ""}`.trim() || "-",
    propName: job.propName || job.PropName || WorkWizeAPI.getCurrentPropertyName() || "-",
    area: job.areaName || job.AreaName || job.area || job.Area || "General Area"
  };
}

function normalizeStatus(st) {
  if (!st) return "Yet to Commence";
  const s = String(st).toUpperCase();
  if (s.includes("CLOSE") || s.includes("COMPLET")) return "Closed";
  if (s.includes("YET") || s.includes("COMMENCE")) return "Yet to Commence";
  if (s.includes("PROGRESS")) return "In Progress";
  if (s.includes("DISCUSSION")) return "Under Discussion";
  if (s.includes("SPARES") || s.includes("ORDER")) return "Spares on Order";
  if (s.includes("FIX")) return "Fixed";
  return st;
}

function normalizePriority(p) {
  if (!p) return "Medium";
  const s = String(p).toUpperCase();
  if (s.includes("HIGH")) return "High";
  if (s.includes("LOW")) return "Low";
  if (s.includes("SAFETY")) return "Safety";
  return "Medium";
}

function formatAssignee(job) {
  if (Array.isArray(job.data1) && job.data1.length > 0) {
    return job.data1.map(t => t.teamName || t.name || t).join(", ");
  }
  if (job.firstname || job.lastname) {
    return `${job.firstname || ""} ${job.lastname || ""}`.trim();
  }
  return "IT Admin";
}

function formatDate(dateStr) {
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

async function populateFilterDropdowns() {
  const propSelect = document.getElementById("filterProperty");
  const areaSelect = document.getElementById("filterArea");
  const assignedSelect = document.getElementById("filterAssignedTo");

  // Populate Properties
  if (propSelect && typeof WorkWizeAPI !== "undefined") {
    try {
      const props = await WorkWizeAPI.getAllProperties();
      if (Array.isArray(props)) {
        props.forEach(p => {
          if (!Array.from(propSelect.options).some(o => o.value === p.propName)) {
            const opt = document.createElement("option");
            opt.value = p.propName;
            opt.textContent = `Property: ${p.propName}`;
            propSelect.appendChild(opt);
          }
        });
      }
    } catch (e) {
      console.warn("Could not populate property filters:", e);
    }
  }

  // Populate Areas
  if (areaSelect) {
    const areas = [...new Set(allJobsStore.map(j => j.area))].filter(Boolean).sort();
    areas.forEach(area => {
      if (!Array.from(areaSelect.options).some(o => o.value.toLowerCase() === area.toLowerCase())) {
        const opt = document.createElement("option");
        opt.value = area;
        opt.textContent = `Area: ${area}`;
        areaSelect.appendChild(opt);
      }
    });
  }

  // Populate Assignees
  if (assignedSelect) {
    const assignees = [...new Set(allJobsStore.map(j => j.assignedTo))].filter(Boolean).sort();
    assignees.forEach(name => {
      if (!Array.from(assignedSelect.options).some(o => o.value === name)) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        assignedSelect.appendChild(opt);
      }
    });
  }
}

function filterAndRenderJobs() {
  const searchQuery = (document.getElementById("jobSearchInput")?.value || "").toLowerCase().trim();
  const propFilter = document.getElementById("filterProperty")?.value || "";
  const areaFilter = document.getElementById("filterArea")?.value || "";
  const statusFilter = document.getElementById("filterStatus")?.value || "";
  const priorityFilter = document.getElementById("filterPriority")?.value || "";
  const assignedFilter = document.getElementById("filterAssignedTo")?.value || "";
  const dateSpanFilter = document.getElementById("filterDateSpan")?.value || "";

  // Sync Header Segmented Tabs
  const allJobsTab = document.getElementById("headerNavAllJobs");
  const closedJobsTab = document.getElementById("headerNavClosedJobs");
  if (allJobsTab && closedJobsTab) {
    if (statusFilter === "Closed") {
      closedJobsTab.classList.add("on");
      allJobsTab.classList.remove("on");
    } else {
      allJobsTab.classList.add("on");
      closedJobsTab.classList.remove("on");
    }
  }

  const now = new Date().getTime();

  filteredJobs = allJobsStore.filter(job => {
    const matchSearch = !searchQuery ||
      job.id.toLowerCase().includes(searchQuery) ||
      job.details.toLowerCase().includes(searchQuery) ||
      job.area.toLowerCase().includes(searchQuery) ||
      (job.villaNumber && job.villaNumber.toLowerCase().includes(searchQuery)) ||
      (job.location && job.location.toLowerCase().includes(searchQuery)) ||
      (job.refNum && job.refNum.toLowerCase().includes(searchQuery)) ||
      (job.createdBy && job.createdBy.toLowerCase().includes(searchQuery)) ||
      job.status.toLowerCase().includes(searchQuery) ||
      job.assignedTo.toLowerCase().includes(searchQuery);

    const matchProp = !propFilter || (job.propName && job.propName.toLowerCase().includes(propFilter.toLowerCase()));
    const matchArea = !areaFilter || job.area.toLowerCase() === areaFilter.toLowerCase();
    const matchStatus = !statusFilter || job.status.toLowerCase() === statusFilter.toLowerCase();
    const matchPriority = !priorityFilter || job.priority.toLowerCase() === priorityFilter.toLowerCase();
    const matchAssigned = !assignedFilter || job.assignedTo.toLowerCase() === assignedFilter.toLowerCase();

    let matchDateSpan = true;
    if (dateSpanFilter && job.createdOn) {
      const createdTime = new Date(job.createdOn).getTime();
      if (!isNaN(createdTime)) {
        const daysDiff = (now - createdTime) / (1000 * 60 * 60 * 24);
        if (dateSpanFilter === "d30") matchDateSpan = daysDiff <= 30;
        else if (dateSpanFilter === "d60") matchDateSpan = daysDiff > 30 && daysDiff <= 89;
        else if (dateSpanFilter === "d90") matchDateSpan = daysDiff >= 90;
      }
    }

    return matchSearch && matchProp && matchArea && matchStatus && matchPriority && matchAssigned && matchDateSpan;
  });

  // Apply current sorting
  sortJobsByField(filteredJobs, currentSortField, currentSortOrder);

  // Point 15: Save search state to sessionStorage
  saveAllJobsState();

  renderTableRows();
  renderPagination();
  updateCounterText();
  updateActiveFilterBadge();
}

function updateActiveFilterBadge() {
  let count = 0;
  if (document.getElementById("filterStatus")?.value) count++;
  if (document.getElementById("filterPriority")?.value) count++;
  if (document.getElementById("filterAssignedTo")?.value) count++;
  if (document.getElementById("filterDateSpan")?.value) count++;
  if (document.getElementById("filterArea")?.value) count++;

  const badge = document.getElementById("activeFilterBadge");
  const btn = document.getElementById("filterToggleBtn");
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
      if (btn) {
        btn.classList.add("border-blue-500", "text-blue-600", "bg-blue-50/50");
      }
    } else {
      badge.classList.add("hidden");
      if (btn) {
        btn.classList.remove("border-blue-500", "text-blue-600", "bg-blue-50/50");
      }
    }
  }
}

function renderTableRows() {
  const tbody = document.getElementById("allJobsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (filteredJobs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="17" class="py-12 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center gap-3">
            <i class="fa-solid fa-magnifying-glass text-3xl text-slate-300"></i>
            <p class="font-medium text-slate-600">No jobs match your search and filter criteria.</p>
            <button class="text-xs text-blue-600 hover:underline font-semibold" onclick="resetAllFilters()">Reset Filters</button>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  const startIndex = (currentPage - 1) * pageSize;
  const pageJobs = filteredJobs.slice(startIndex, startIndex + pageSize);

  pageJobs.forEach(job => {
    const tr = document.createElement("tr");
    tr.className = "hover:bg-blue-50/30 transition-colors";

    let statusBadgeClass = "badge-in-progress";
    if (job.status === "Yet to Commence") statusBadgeClass = "badge-yet-to-commence";
    else if (job.status === "Under Discussion") statusBadgeClass = "badge-under-discussion";
    else if (job.status === "Closed" || job.status === "Completed") statusBadgeClass = "badge-closed";
    else if (job.status === "Fixed") statusBadgeClass = "badge-open";

    let priorityBadgeClass = "badge-priority-low";
    if (job.priority.toLowerCase() === "high") priorityBadgeClass = "badge-priority-high";
    else if (job.priority.toLowerCase() === "medium") priorityBadgeClass = "badge-priority-medium";
    else if (job.priority.toLowerCase() === "safety") priorityBadgeClass = "badge-priority-safety";

    const isChecked = selectedJobIds.has(job.id);

    tr.innerHTML = `
      <td class="w-10">
        <input type="checkbox" data-id="${job.id}" class="row-checkbox rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" ${isChecked ? "checked" : ""}>
      </td>
      <td>
        <a href="job-details.html?id=${encodeURIComponent(job.rawId || job.id)}" target="_blank" class="font-bold text-blue-600 hover:underline hover:text-blue-800 transition-colors">
          ${job.id}
        </a>
      </td>
      <td class="font-semibold text-slate-800">
        ${job.villaNumber && job.villaNumber !== '-' ? job.villaNumber : '<span class="text-slate-300">-</span>'}
      </td>
      <!-- Point 3: Interactive Job Details on Hover Preview Card -->
      <td class="max-w-[240px] relative group text-slate-700 font-medium">
        <div class="truncate cursor-help flex items-center gap-1.5" title="${escapeHtml(job.details)}">
          <span class="truncate">${escapeHtml(job.details)}</span>
          <i class="fa-solid fa-circle-info text-[10px] text-slate-400 group-hover:text-blue-500 shrink-0"></i>
        </div>
        <!-- Hover Details Card -->
        <div class="hidden group-hover:block absolute left-4 top-full mt-1 w-80 max-w-sm p-3.5 bg-slate-900/95 backdrop-blur text-white text-xs rounded-xl shadow-2xl z-50 pointer-events-none transition-all duration-200 border border-slate-700">
          <div class="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-2">
            <span class="font-bold text-blue-400 flex items-center gap-1.5 text-[11px]"><i class="fa-solid fa-file-lines"></i> Job Details Preview</span>
            <span class="text-[10px] text-slate-400">${job.id}</span>
          </div>
          <p class="whitespace-pre-wrap leading-relaxed text-slate-200 text-xs">${escapeHtml(job.details)}</p>
          <div class="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>Area: <b class="text-slate-200">${escapeHtml(job.area)}</b></span>
            <span>Location: <b class="text-slate-200">${escapeHtml(job.location || 'N/A')}</b></span>
          </div>
        </div>
      </td>
      <td class="text-slate-500">${formatDate(job.createdOn)}</td>
      <td class="text-slate-600">${job.location || '<span class="text-slate-300">-</span>'}</td>
      <td>
        <span class="badge-priority ${priorityBadgeClass}">
          ${job.priority}
        </span>
      </td>
      <td>
        <span class="badge-status ${statusBadgeClass}">
          ${job.status}
        </span>
      </td>
      <td class="text-slate-600 font-mono text-[10px]">${job.refNum || '<span class="text-slate-300">-</span>'}</td>
      <td class="text-slate-700 font-medium whitespace-nowrap">
        <div class="flex items-center gap-1.5">
          <span class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
            ${(job.assignedTo || "IT").slice(0, 2).toUpperCase()}
          </span>
          <span>${job.assignedTo}</span>
        </div>
      </td>
      <td class="text-slate-500 whitespace-nowrap">${formatDate(job.expectedCompletion)}</td>
      <td class="text-slate-500 whitespace-nowrap">${formatDate(job.closeDate)}</td>
      <td class="text-center font-semibold text-slate-600">
        <span class="inline-flex items-center gap-1"><i class="fa-regular fa-image text-blue-500"></i> ${job.uploadCount}</span>
      </td>
      <td class="text-center font-semibold text-slate-600">
        <span class="inline-flex items-center gap-1"><i class="fa-regular fa-comment text-slate-400"></i> ${job.commentCount}</span>
      </td>
      <td class="text-slate-600 whitespace-nowrap">${job.createdBy}</td>
      <td class="text-slate-500 whitespace-nowrap">${job.propName}</td>
      <td class="text-right">
        <div class="relative inline-block text-left dropdown-group">
          <button class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors" onclick="toggleJobActionMenu(this)">
            <i class="fa-solid fa-ellipsis"></i>
          </button>
          <div class="hidden absolute right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-30 text-xs text-slate-700 dropdown-menu">
            <a href="job-details.html?id=${encodeURIComponent(job.rawId || job.id)}" class="flex items-center px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors">
              <i class="fa-regular fa-eye mr-2.5 text-blue-600"></i> View Job
            </a>
            <a href="job-update.html?id=${encodeURIComponent(job.rawId || job.id)}" class="flex items-center px-3 py-2 hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-medium transition-colors">
              <i class="fa-solid fa-pen-to-square mr-2.5 text-amber-600"></i> Update Job
            </a>
            <div class="border-t border-slate-100 my-1"></div>
            <button onclick="typeof handleQuickClose === 'function' ? handleQuickClose('${job.rawId || job.id}') : quickUpdateJobStatus('${job.rawId || job.id}', 'COMPLETED', 'Closed')" class="w-full flex items-center px-3 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium transition-colors">
              <i class="fa-solid fa-circle-check mr-2.5 text-emerald-600"></i> Mark Closed
            </button>
            <!-- Point 14: Super Admin Job Deletion -->
            ${(typeof isSuperAdminRole === 'function' && isSuperAdminRole()) ? `
              <button onclick="superAdminDeleteJob('${job.rawId || job.id}', '${job.id}')" class="w-full flex items-center px-3 py-2 hover:bg-rose-50 text-rose-600 border-t border-slate-100 font-semibold transition-colors">
                <i class="fa-solid fa-trash-can mr-2.5 text-rose-500"></i> Delete Job
              </button>
            ` : ''}
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Attach row checkbox change listeners
  document.querySelectorAll(".row-checkbox").forEach(cb => {
    cb.addEventListener("change", function (e) {
      const id = e.target.getAttribute("data-id");
      if (e.target.checked) {
        selectedJobIds.add(id);
      } else {
        selectedJobIds.delete(id);
      }
      updateBulkActionBar();
    });
  });
}

async function quickUpdateJobStatus(jobId, apiStatus, displayStatus) {
  try {
    const form = new FormData();
    form.append("jobId", jobId);
    form.append("jobStatus", apiStatus);
    if (apiStatus === "COMPLETED") {
      form.append("isActive", "false");
    }

    await WorkWizeAPI.updateJobFields(form);
    showToast(`Job status updated to ${displayStatus}`, "success");
    loadAllJobsFromAPI();
  } catch (e) {
    if (typeof WorkWizeDB !== "undefined") {
      WorkWizeDB.updateJob(jobId, { status: displayStatus });
    }
    showToast(`Job status updated to ${displayStatus}`, "success");
    filterAndRenderJobs();
  }
}

function renderPagination() {
  const container = document.getElementById("jobsPagination") || document.getElementById("paginationContainer");
  if (!container) return;

  const totalPages = Math.ceil(filteredJobs.length / pageSize) || 1;
  container.innerHTML = "";

  // Prev Button
  const prevBtn = document.createElement("button");
  prevBtn.className = `btn-pagination ${currentPage === 1 ? "disabled" : ""}`;
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left text-[10px]"></i>';
  prevBtn.disabled = currentPage === 1;
  prevBtn.onclick = () => {
    if (currentPage > 1) {
      currentPage--;
      renderTableRows();
      renderPagination();
      updateCounterText();
    }
  };
  container.appendChild(prevBtn);

  // Page Numbers
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (startPage > 1) {
    const p1 = document.createElement("button");
    p1.className = "btn-pagination";
    p1.textContent = "1";
    p1.onclick = () => { currentPage = 1; renderTableRows(); renderPagination(); updateCounterText(); };
    container.appendChild(p1);
    if (startPage > 2) {
      const dots = document.createElement("span");
      dots.className = "text-slate-400 text-xs px-1";
      dots.textContent = "...";
      container.appendChild(dots);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.className = `btn-pagination ${i === currentPage ? "active" : ""}`;
    btn.textContent = i;
    btn.onclick = () => {
      currentPage = i;
      renderTableRows();
      renderPagination();
      updateCounterText();
    };
    container.appendChild(btn);
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement("span");
      dots.className = "text-slate-400 text-xs px-1";
      dots.textContent = "...";
      container.appendChild(dots);
    }
    const lastBtn = document.createElement("button");
    lastBtn.className = "btn-pagination";
    lastBtn.textContent = totalPages;
    lastBtn.onclick = () => { currentPage = totalPages; renderTableRows(); renderPagination(); updateCounterText(); };
    container.appendChild(lastBtn);
  }

  // Next Button
  const nextBtn = document.createElement("button");
  nextBtn.className = `btn-pagination ${currentPage === totalPages ? "disabled" : ""}`;
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right text-[10px]"></i>';
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.onclick = () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderTableRows();
      renderPagination();
      updateCounterText();
    }
  };
  container.appendChild(nextBtn);
}

function updateCounterText() {
  const counterEl = document.getElementById("jobsCounterText");
  if (!counterEl) return;

  const total = filteredJobs.length;
  if (total === 0) {
    counterEl.innerHTML = `Showing <span class="font-semibold text-slate-700">0</span> of <span class="font-semibold text-slate-700">0</span> jobs`;
    return;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  counterEl.innerHTML = `Showing <span class="font-bold text-slate-800">${start}</span> to <span class="font-bold text-slate-800">${end}</span> of <span class="font-bold text-slate-900">${total}</span> jobs`;
}

function resetAllFilters() {
  const searchInput = document.getElementById("jobSearchInput");
  const propSelect = document.getElementById("filterProperty");
  const areaSelect = document.getElementById("filterArea");
  const statusSelect = document.getElementById("filterStatus");
  const prioritySelect = document.getElementById("filterPriority");
  const assignedSelect = document.getElementById("filterAssignedTo");
  const dateSpanSelect = document.getElementById("filterDateSpan");

  if (searchInput) searchInput.value = "";
  if (propSelect) propSelect.value = "";
  if (areaSelect) areaSelect.value = "";
  if (statusSelect) statusSelect.value = "";
  if (prioritySelect) prioritySelect.value = "";
  if (assignedSelect) assignedSelect.value = "";
  if (dateSpanSelect) dateSpanSelect.value = "";

  currentPage = 1;
  filterAndRenderJobs();
}

function updateBulkActionBar() {
  const count = selectedJobIds.size;
  const selectAll = document.getElementById("selectAllCheckbox");
  const bar = document.getElementById("bulkActionBar");
  const span = document.getElementById("selectedCountSpan");

  if (span) span.textContent = count;
  if (bar) {
    if (count > 0) bar.classList.remove("hidden");
    else bar.classList.add("hidden");
  }

  if (selectAll) {
    const totalVisible = document.querySelectorAll(".row-checkbox").length;
    selectAll.checked = totalVisible > 0 && count >= totalVisible;
  }
}

function toggleJobActionMenu(btn) {
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

function exportJobsToCSV() {
  if (filteredJobs.length === 0) {
    showToast("No jobs to export.", "error");
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

  const rows = filteredJobs.map(j => [
    `"${j.id}"`,
    `"${j.villaNumber || "-"}"`,
    `"${(j.details || "").replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`,
    `"${j.createdOn || "-"}"`,
    `"${(j.location || "-").replace(/"/g, '""')}"`,
    `"${j.priority}"`,
    `"${j.status}"`,
    `"${j.refNum || "-"}"`,
    `"${(j.assignedTo || "-").replace(/"/g, '""')}"`,
    `"${j.expectedCompletion || "-"}"`,
    `"${j.closeDate || "-"}"`,
    `"${j.uploadCount}"`,
    `"${j.commentCount}"`,
    `"${(j.createdBy || "-").replace(/"/g, '""')}"`,
    `"${(j.propName || "-").replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `WorkWize_Jobs_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Exported ${filteredJobs.length} jobs to CSV.`, "success");
}

function escapeHtml(str) {
  return String(str || "").replace(/"/g, "&quot;");
}

window.quickUpdateJobStatus = quickUpdateJobStatus;
window.loadAllJobsFromAPI = loadAllJobsFromAPI;
window.resetAllFilters = resetAllFilters;
window.exportJobsToCSV = exportJobsToCSV;


// ==========================================
// Point 7: Job Status Permissions Helper
// ==========================================
function isSuperAdminRole() {
  const role = (typeof UserSession !== "undefined" && UserSession.getUserRole) ? UserSession.getUserRole().toUpperCase() : "";
  return role.includes("SUPERADMIN") || role.includes("SUPER ADMIN");
}

function canUserChangeStatus(job) {
  if (!job) return true;
  const role = (typeof UserSession !== "undefined" && UserSession.getUserRole) ? UserSession.getUserRole().toUpperCase() : "";
  if (role.includes("SUPERADMIN") || role.includes("ADMIN") || role.includes("OPROADMIN")) return true;

  const user = (typeof UserSession !== "undefined" && UserSession.getUser) ? UserSession.getUser() : null;
  const userEmail = (user?.email || user?.userName || "").toLowerCase();
  if (job.assignedTo && typeof job.assignedTo === "string" && job.assignedTo.toLowerCase().includes(userEmail)) return true;
  return false;
}

function handleQuickClose(jobId) {
  const job = allJobsStore.find(j => (j.rawId || j.id) === jobId);
  if (job && !canUserChangeStatus(job)) {
    showToast("Permission denied: Only the assigned team or Admin can change job status.", "warning");
    return;
  }
  quickUpdateJobStatus(jobId, 'COMPLETED', 'Closed');
}
window.handleQuickClose = handleQuickClose;

// ==========================================
// Point 14: Super Admin Job Deletion
// ==========================================
async function superAdminDeleteJob(jobId, displayId) {
  if (!confirm(`Are you sure you want to permanently delete Job ${displayId}? All records and attachments will be deleted.`)) return;

  try {
    const propId = WorkWizeAPI.getCurrentProperty();
    await WorkWizeAPI.request("api/jobtracker/deletejob", {
      method: "POST",
      body: { jobId: jobId, propId: propId }
    });

    showToast(`Job ${displayId} deleted successfully.`, "success");
    await loadAllJobsFromAPI();
  } catch (err) {
    showToast(err.message || "Failed to delete job", "error");
  }
}
window.superAdminDeleteJob = superAdminDeleteJob;

// ==========================================
// Point 15: Retain Search and Filter Results in sessionStorage
// ==========================================
function saveAllJobsState() {
  const state = {
    search: document.getElementById("jobSearchInput")?.value || "",
    prop: document.getElementById("filterProperty")?.value || "",
    area: document.getElementById("filterArea")?.value || "",
    status: document.getElementById("filterStatus")?.value || "",
    priority: document.getElementById("filterPriority")?.value || "",
    assignedTo: document.getElementById("filterAssignedTo")?.value || "",
    dateSpan: document.getElementById("filterDateSpan")?.value || "",
    sortField: currentSortField,
    sortOrder: currentSortOrder,
    page: currentPage
  };
  sessionStorage.setItem("taskmaster_all_jobs_state", JSON.stringify(state));
}

function restoreAllJobsState() {
  try {
    const saved = sessionStorage.getItem("taskmaster_all_jobs_state");
    if (!saved) return;
    const state = JSON.parse(saved);

    const searchInput = document.getElementById("jobSearchInput");
    const propSelect = document.getElementById("filterProperty");
    const areaSelect = document.getElementById("filterArea");
    const statusSelect = document.getElementById("filterStatus");
    const prioritySelect = document.getElementById("filterPriority");
    const assignedSelect = document.getElementById("filterAssignedTo");
    const dateSpanSelect = document.getElementById("filterDateSpan");
    const sortSelect = document.getElementById("filterSortOrder");

    if (state.search && searchInput) searchInput.value = state.search;
    if (state.prop && propSelect) propSelect.value = state.prop;
    if (state.area && areaSelect) areaSelect.value = state.area;
    if (state.status && statusSelect) statusSelect.value = state.status;
    if (state.priority && prioritySelect) prioritySelect.value = state.priority;
    if (state.assignedTo && assignedSelect) assignedSelect.value = state.assignedTo;
    if (state.dateSpan && dateSpanSelect) dateSpanSelect.value = state.dateSpan;
    if (state.sortOrder && sortSelect) sortSelect.value = state.sortOrder;

    if (state.sortField) currentSortField = state.sortField;
    if (state.sortOrder) currentSortOrder = state.sortOrder;
    if (state.page) currentPage = state.page;
  } catch (e) {
    console.warn("Could not restore all jobs state:", e);
  }
}
