
function formatClosedByUser(userVal) {
  if (!userVal || userVal === "-" || userVal === "null" || userVal === "undefined") {
    return "Authorized Officer";
  }
  let str = String(userVal).trim();
  if (str.includes("@")) {
    const emailLower = str.toLowerCase();
    const currentUser = (typeof UserSession !== "undefined" && UserSession.getUser) ? UserSession.getUser() : null;
    const currentEmail = (currentUser?.email || currentUser?.userName || "").toLowerCase();
    if (currentUser && currentEmail && emailLower === currentEmail) {
      const curName = currentUser.name || currentUser.fullName || currentUser.userName || "Admin";
      return `${curName} (${str})`;
    }
    if (emailLower.includes("it@") || emailLower.includes("admin")) {
      return `Testing - IT Admin (${str})`;
    }
    const namePart = str.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    return `${namePart} (${str})`;
  }
  return str;
}
/**
 * WorkWize Closed Jobs Standalone Page Logic
 * Connected to live API: api/jobtracker/getclosedjobs
 * Dedicated view for archived, completed, and closed work orders
 */

let closedJobsStore = [];
let filteredJobs = [];
let selectedJobIds = new Set();
let currentPage = 1;
let pageSize = 25;
let currentSortField = "closeDate";
let currentSortOrder = "desc";
let hasVillas = true;

document.addEventListener("DOMContentLoaded", async function () {
  // Restore filter and search state from sessionStorage
  restoreClosedJobsState();

  // Parse query string for pre-filled filters
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get("search");
  const areaParam = urlParams.get("area");

  const searchInput = document.getElementById("jobSearchInput");
  const areaSelect = document.getElementById("filterArea");

  if (searchParam && searchInput) searchInput.value = searchParam;
  if (areaParam && areaSelect) areaSelect.value = areaParam;

  // Page size selector
  const pageSizeSelect = document.getElementById("pageSizeSelect");
  if (pageSizeSelect) {
    pageSizeSelect.value = pageSize;
    pageSizeSelect.addEventListener("change", function () {
      pageSize = parseInt(this.value, 10) || 25;
      currentPage = 1;
      renderTableRows();
      renderPagination();
      updateCounterText();
    });
  }

  // Load closed jobs from API
  await loadClosedJobsFromAPI();

  // Attach Search Listener
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      filterAndRenderJobs();
    });
  }

  // Attach Filter Listeners
  ["filterProperty", "filterArea", "filterPriority", "filterCreatedBy", "filterFromDate", "filterToDate", "filterSortOrder"].forEach(id => {
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
    loadClosedJobsFromAPI();
  });
});

async function loadClosedJobsFromAPI() {
  const tbody = document.getElementById("closedJobsTableBody");
  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="15" class="py-12 text-center text-slate-400">
          <i class="fa-solid fa-circle-notch fa-spin text-2xl text-emerald-600 mb-2"></i>
          <p class="text-xs">Fetching closed jobs from server...</p>
        </td>
      </tr>
    `;
  }

  try {
    const currentPropId = (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getCurrentProperty === "function")
      ? WorkWizeAPI.getCurrentProperty()
      : localStorage.getItem("workwize_current_property");

    if (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getClosedJobs === "function") {
      const closedRes = await WorkWizeAPI.getClosedJobs(currentPropId);

      let rawJobs = [];
      if (closedRes) {
        if (Array.isArray(closedRes)) rawJobs = closedRes;
        else if (Array.isArray(closedRes.jobs)) rawJobs = closedRes.jobs;
        else if (Array.isArray(closedRes.Jobs)) rawJobs = closedRes.Jobs;
        else if (Array.isArray(closedRes.data)) rawJobs = closedRes.data;

        if (closedRes.villaCount !== undefined) {
          hasVillas = closedRes.villaCount > 0;
        }
      }

      if (rawJobs.length > 0) {
        closedJobsStore = rawJobs.map(j => mapApiJobToModel(j, true));

        // Detect if any job actually has a villa number
        if (!hasVillas || closedJobsStore.every(j => !j.villaNumber || j.villaNumber === "-" || j.villaNumber === "0")) {
          hasVillas = false;
        } else {
          hasVillas = true;
        }

        const villaColHeader = document.getElementById("closedJobsVillaColHeader");
        if (villaColHeader) {
          villaColHeader.style.display = hasVillas ? "" : "none";
        }

        sortJobsByField(closedJobsStore, currentSortField, currentSortOrder);
        populateFilterDropdowns();

        const closedBadge = document.getElementById("headerClosedBadge");
        if (closedBadge) closedBadge.textContent = closedJobsStore.length;

        // Also refresh open badge count via overview if possible
        if (typeof WorkWizeAPI.getJobOverview === "function") {
          WorkWizeAPI.getJobOverview(currentPropId).then(overview => {
            if (Array.isArray(overview)) {
              const opn = overview.reduce((s, a) => s + (Number(a.openJobs || a.open || a.open_jobs) || 0), 0);
              const openBadge = document.getElementById("headerOpenBadge");
              if (openBadge) openBadge.textContent = opn;
            }
          }).catch(() => {});
        }

        filterAndRenderJobs();
        return;
      }
    }
  } catch (error) {
    console.warn("API loadClosedJobsFromAPI failed:", error.message);
  }

  // Fallback to local DB if available
  const localJobs = (typeof WorkWizeDB !== "undefined" && typeof WorkWizeDB.getJobs === "function")
    ? WorkWizeDB.getJobs().filter(j => isClosedStatus(j))
    : [];

  if (localJobs.length > 0) {
    closedJobsStore = localJobs.map(j => mapApiJobToModel(j, true));
    sortJobsByField(closedJobsStore, currentSortField, currentSortOrder);
    populateFilterDropdowns();
    const closedBadge = document.getElementById("headerClosedBadge");
    if (closedBadge) closedBadge.textContent = closedJobsStore.length;
    filterAndRenderJobs();
    return;
  }

  // If empty
  closedJobsStore = [];
  populateFilterDropdowns();
  const closedBadge = document.getElementById("headerClosedBadge");
  if (closedBadge) closedBadge.textContent = "0";
  filterAndRenderJobs();
}

function sortJobsByField(jobs, field = currentSortField, order = currentSortOrder) {
  if (!Array.isArray(jobs)) return jobs;
  return jobs.sort((a, b) => {
    let valA = a[field];
    let valB = b[field];

    const timeA = (valA && !String(valA).startsWith("0001")) ? new Date(valA).getTime() : 0;
    const timeB = (valB && !String(valB).startsWith("0001")) ? new Date(valB).getTime() : 0;

    if (timeA !== timeB) {
      if (isNaN(timeA) && isNaN(timeB)) return 0;
      if (isNaN(timeA)) return 1;
      if (isNaN(timeB)) return -1;
      return order === "asc" ? timeA - timeB : timeB - timeA;
    }

    const idA = String(a.rawId || a.id || a.orgjobId || "");
    const idB = String(b.rawId || b.id || b.orgjobId || "");
    return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });
  });
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
  ["createdOn", "closeDate"].forEach(f => {
    const icon = document.getElementById(`sortIcon_${f}`);
    if (icon) {
      if (f === currentSortField) {
        icon.className = currentSortOrder === "asc" 
          ? "fa-solid fa-arrow-up-short-wide ml-1 text-emerald-600" 
          : "fa-solid fa-arrow-down-short-wide ml-1 text-emerald-600";
      } else {
        icon.className = "fa-solid fa-sort ml-1 text-slate-400";
      }
    }
  });

  saveClosedJobsState();
  sortJobsByField(filteredJobs, currentSortField, currentSortOrder);
  renderTableRows();
  renderPagination();
  updateCounterText();
}
window.toggleSort = toggleSort;

function isClosedStatus(j) {
  if (!j) return false;
  if (typeof j === "object") {
    const s = String(j.jobStatus || j.status || "").toLowerCase();
    if (s === "closed" || s.includes("close")) return true;
    const hasCloseDate = j.jobCloseOn && !String(j.jobCloseOn).startsWith("0001") && String(j.jobCloseOn) !== "1970-01-01T00:00:00" && String(j.jobCloseOn) !== "null";
    if ((j.isActive === false || j.isActive === 0) && hasCloseDate) return true;
    return false;
  }
  const s = String(j).toLowerCase();
  return s === "closed" || s.includes("close");
}

function mapApiJobToModel(job, forceClosed = true) {
  const isClosed = true;
  const statusStr = "Closed";
  const priorityStr = normalizePriority(job.priority || job.Priority);
  const assignees = formatAssignee(job);

  const closeDate = job.jobCloseOn || job.JobCloseOn || job.closeDate || job.closedOn || job.ClosedOn;

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
    isActive: false,
    refNum: job.refNum || job.RefNum || job.refNo || job.RefNo || "",
    assignedTo: assignees,
    expectedCompletion: job.expectedCompletion || job.ExpectedCompletion,
    closeDate: closeDate,
    closedBy: job.jobCloseBy || job.JobCloseBy || job.closedBy || job.ClosedBy || job.closeBy || job.CloseBy || "-",
    closedByName: job.jobCloseByName || job.closeByName || job.closedByName || "",
    uploadCount: job.uploadCount !== undefined ? job.uploadCount : (job.UploadCount !== undefined ? job.UploadCount : (Array.isArray(job.imageUploads) ? job.imageUploads.length : 0)),
    commentCount: job.commentCount !== undefined ? job.commentCount : (job.CommentCount !== undefined ? job.CommentCount : (Array.isArray(job.comments) ? job.comments.length : 0)),
    createdBy: (job.createdBy && job.createdBy !== "-" && job.createdBy !== "null" && job.createdBy !== "undefined")
      ? job.createdBy
      : ((job.firstname || job.Firstname || job.lastname || job.Lastname)
          ? `${job.firstname || job.Firstname || ""} ${job.lastname || job.Lastname || ""}`.trim()
          : (job.userId || job.creator || job.created_by || "-")),
    propName: job.propName || job.PropName || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentPropertyName() : "-"),
    area: job.areaName || job.AreaName || job.area || job.Area || "General Area"
  };
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
    const list = job.data1.map(t => {
      if (typeof t === "string") return t;
      if (typeof t === "object" && t !== null) {
        return t.teamName || t.name || t.team_name || t.assignedTeam || t.team || t.title || "";
      }
      return String(t || "");
    }).filter(Boolean);
    if (list.length > 0) return list.join(", ");
  }
  if (job.firstname || job.lastname) {
    return `${job.firstname || ""} ${job.lastname || ""}`.trim();
  }
  return "IT Admin";
}

function formatDate(dateStr) {
  if (!dateStr || String(dateStr).startsWith("0001") || String(dateStr).startsWith("1970")) {
    return '<span class="text-slate-300">-</span>';
  }
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
  const locationSelect = document.getElementById("filterLocation");
  const assignedSelect = document.getElementById("filterAssignedTo");

  
  // Populate Created By
  const createdBySelect = document.getElementById("filterCreatedBy");
  if (createdBySelect) {
    const currentVal = createdBySelect.value;
    const creators = [...new Set(closedJobsStore.map(j => j.createdBy))].filter(Boolean).sort();
    createdBySelect.innerHTML = '<option value="">Created By: All</option>';
    creators.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      createdBySelect.appendChild(opt);
    });
    if (currentVal) createdBySelect.value = currentVal;
  }

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
    const areas = [...new Set(closedJobsStore.map(j => j.area))].filter(Boolean).sort();
    areas.forEach(area => {
      if (!Array.from(areaSelect.options).some(o => o.value.toLowerCase() === area.toLowerCase())) {
        const opt = document.createElement("option");
        opt.value = area;
        opt.textContent = `Area: ${area}`;
        areaSelect.appendChild(opt);
      }
    });
  }

  // Populate Locations
  if (locationSelect) {
    const locations = [...new Set(closedJobsStore.map(j => j.location))].filter(Boolean).sort();
    locations.forEach(loc => {
      if (!Array.from(locationSelect.options).some(o => o.value.toLowerCase() === loc.toLowerCase())) {
        const opt = document.createElement("option");
        opt.value = loc;
        opt.textContent = `${loc}`;
        locationSelect.appendChild(opt);
      }
    });
  }

  // Populate Assignees
  if (assignedSelect) {
    const assignees = [...new Set(closedJobsStore.map(j => j.assignedTo))].filter(Boolean).sort();
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
  const priorityFilter = document.getElementById("filterPriority")?.value || "";
  const assignedFilter = document.getElementById("filterAssignedTo")?.value || "";
  const locationFilter = document.getElementById("filterLocation")?.value || "";
  const dateSpanFilter = document.getElementById("filterDateSpan")?.value || "";

  const now = new Date().getTime();

  filteredJobs = closedJobsStore.filter(job => {
    const matchSearch = !searchQuery ||
      job.id.toLowerCase().includes(searchQuery) ||
      job.details.toLowerCase().includes(searchQuery) ||
      job.area.toLowerCase().includes(searchQuery) ||
      (job.villaNumber && job.villaNumber.toLowerCase().includes(searchQuery)) ||
      (job.location && job.location.toLowerCase().includes(searchQuery)) ||
      (job.refNum && job.refNum.toLowerCase().includes(searchQuery)) ||
      (job.createdBy && job.createdBy.toLowerCase().includes(searchQuery)) ||
      job.assignedTo.toLowerCase().includes(searchQuery);

    const matchProp = !propFilter || (job.propName && job.propName.toLowerCase().includes(propFilter.toLowerCase()));
    const matchArea = !areaFilter || job.area.toLowerCase() === areaFilter.toLowerCase();
    const matchPriority = !priorityFilter || job.priority.toLowerCase() === priorityFilter.toLowerCase();
    const matchAssigned = !assignedFilter || job.assignedTo.toLowerCase() === assignedFilter.toLowerCase();
    const matchLocation = !locationFilter || (job.location && job.location.toLowerCase() === locationFilter.toLowerCase());

    let matchDateSpan = true;
    if (dateSpanFilter) {
      const targetDate = job.closeDate || job.createdOn;
      if (targetDate) {
        const dateTime = new Date(targetDate).getTime();
        if (!isNaN(dateTime)) {
          const daysDiff = (now - dateTime) / (1000 * 60 * 60 * 24);
          if (dateSpanFilter === "d30") matchDateSpan = daysDiff <= 30;
          else if (dateSpanFilter === "d60") matchDateSpan = daysDiff > 30 && daysDiff <= 89;
          else if (dateSpanFilter === "d90") matchDateSpan = daysDiff >= 90;
        }
      }
    }

    return matchSearch && matchProp && matchArea && matchPriority && matchAssigned && matchDateSpan && matchLocation;
  });

  // Apply current sorting
  sortJobsByField(filteredJobs, currentSortField, currentSortOrder);

  // Save state
  saveClosedJobsState();

  const selectedClosedJobId = sessionStorage.getItem("ww_selected_job_id") || localStorage.getItem("ww_selected_job_id");
  if (selectedClosedJobId) {
    const jobIdx = filteredJobs.findIndex(j => (j.rawId || j.id) === selectedClosedJobId || j.id === selectedClosedJobId);
    if (jobIdx !== -1) {
      currentPage = Math.floor(jobIdx / pageSize) + 1;
    }
  }

  renderTableRows();
  renderPagination();
  updateCounterText();
  updateActiveFilterBadge();
}

function updateActiveFilterBadge() {
  let count = 0;
  if (document.getElementById("filterPriority")?.value) count++;
  if (document.getElementById("filterAssignedTo")?.value) count++;
  if (document.getElementById("filterDateSpan")?.value) count++;
  if (document.getElementById("filterArea")?.value) count++;
  if (document.getElementById("filterLocation")?.value) count++;
  if (document.getElementById("filterProperty")?.value) count++;

  const badge = document.getElementById("activeFilterBadge");
  const btn = document.getElementById("filterToggleBtn");
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.classList.remove("hidden");
      if (btn) {
        btn.classList.add("border-emerald-500", "text-emerald-600", "bg-emerald-50/50");
      }
    } else {
      badge.classList.add("hidden");
      if (btn) {
        btn.classList.remove("border-emerald-500", "text-emerald-600", "bg-emerald-50/50");
      }
    }
  }
}

function renderTableRows() {
  const tbody = document.getElementById("closedJobsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (filteredJobs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="17" class="py-12 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center gap-3">
            <i class="fa-regular fa-circle-check text-4xl text-slate-300"></i>
            <p class="font-medium text-slate-600">No closed jobs match your search and filter criteria.</p>
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
    tr.className = "hover:bg-emerald-50/30 transition-colors cursor-pointer";
    tr.setAttribute("data-job-id", job.rawId || job.id);
    tr.setAttribute("data-display-id", job.id);

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
      <td class="font-semibold text-slate-800" style="${hasVillas ? '' : 'display:none;'}">
        ${job.villaNumber && job.villaNumber !== '-' ? job.villaNumber : '<span class="text-slate-300">-</span>'}
      </td>
      <!-- Interactive Job Details on Hover Preview Card -->
      <td class="max-w-[240px] relative group text-slate-700 font-medium whitespace-nowrap">
        <div class="cursor-help flex items-center gap-1.5 overflow-hidden whitespace-nowrap min-w-0" title="${escapeHtml(stripHtmlToPlain(job.details))}">
          <span class="truncate block max-w-[200px] whitespace-nowrap overflow-hidden">${getFirstLinePreview(job.details, 38)}</span>
          <i class="fa-solid fa-circle-info text-[10px] text-slate-400 group-hover:text-blue-500 shrink-0"></i>
        </div>
        <!-- Hover Details Card -->
        <div class="hidden group-hover:block absolute left-4 top-full mt-1 w-80 sm:w-96 max-w-sm p-3.5 bg-slate-900/95 backdrop-blur text-white text-xs rounded-xl shadow-2xl z-50 pointer-events-none transition-all duration-200 border border-slate-700 whitespace-normal break-words overflow-hidden">
          <div class="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-2">
            <span class="font-bold text-blue-400 flex items-center gap-1.5 text-[11px]"><i class="fa-solid fa-file-lines"></i> Job Details Preview</span>
            <span class="text-[10px] text-slate-400">${job.id}</span>
          </div>
          <p class="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:break-words [&_*]:[overflow-wrap:anywhere] leading-relaxed text-slate-200 text-xs">${renderRichText(job.details)}</p>
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
        <span class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <i class="fa-solid fa-circle-check text-[10px] text-emerald-600"></i> Closed
        </span>
      </td>
      <td class="text-slate-600 font-mono text-[10px]">${job.refNum || '<span class="text-slate-300">-</span>'}</td>
      <td class="text-slate-700 font-medium whitespace-nowrap">
        <div class="flex items-center gap-1.5">
          <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold">
            ${(job.assignedTo || "IT").slice(0, 2).toUpperCase()}
          </span>
          <span>${job.assignedTo}</span>
        </div>
      </td>
      <td class="text-slate-800 font-bold whitespace-nowrap text-emerald-700">
        <i class="fa-regular fa-calendar-check mr-1 text-emerald-500"></i>${formatDate(job.closeDate)}
      </td>
      <td class="text-slate-700 whitespace-nowrap">
        <div class="flex items-center gap-1.5">
          <span class="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[9px] font-bold">
            ${(formatClosedByUser(job.closedBy) || "IT").slice(0, 2).toUpperCase()}
          </span>
          <span title="${escapeHtml(job.closedBy || '')}">${escapeHtml(formatClosedByUser(job.closedBy))}</span>
        </div>
      </td>
      <td class="text-center font-semibold text-slate-600">
        <span class="inline-flex items-center gap-1"><i class="fa-regular fa-image text-blue-500"></i> ${job.uploadCount}</span>
      </td>
      <td class="text-center font-semibold text-slate-600">
        <span class="inline-flex items-center gap-1"><i class="fa-regular fa-comment text-slate-400"></i> ${job.commentCount}</span>
      </td>
      <td class="text-slate-600 whitespace-nowrap">${job.createdBy}</td>
      <td class="text-right">
        <div class="relative inline-block text-left dropdown-group">
          <button class="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer" onclick="toggleJobActionMenu(this)">
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
            <button onclick="reopenClosedJob('${job.rawId || job.id}')" class="w-full flex items-center px-3 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 font-medium transition-colors">
              <i class="fa-solid fa-arrow-rotate-left mr-2.5 text-emerald-600"></i> Re-open Job
            </button>
            <!-- Super Admin Job Deletion (Inside 3-dots only) -->
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

  if (typeof restoreTableRowHighlight === "function") {
    restoreTableRowHighlight(tbody);
  }

  // Attach row checkbox listeners
  const rowCheckboxes = tbody.querySelectorAll(".row-checkbox");
  rowCheckboxes.forEach(cb => {
    cb.addEventListener("change", function () {
      const id = this.getAttribute("data-id");
      if (this.checked) {
        selectedJobIds.add(id);
      } else {
        selectedJobIds.delete(id);
      }
      updateBulkActionBar();
    });
  });

  updateBulkActionBar();
}

function updateBulkActionBar() {
  const bar = document.getElementById("bulkActionBar");
  const countSpan = document.getElementById("selectedCountSpan");
  const selectAll = document.getElementById("selectAllCheckbox");

  if (bar && countSpan) {
    if (selectedJobIds.size > 0) {
      countSpan.textContent = selectedJobIds.size;
      bar.classList.remove("hidden");
    } else {
      bar.classList.add("hidden");
    }
  }

  if (selectAll) {
    const pageCheckboxes = document.querySelectorAll(".row-checkbox");
    if (pageCheckboxes.length > 0 && Array.from(pageCheckboxes).every(cb => cb.checked)) {
      selectAll.checked = true;
    } else {
      selectAll.checked = false;
    }
  }
}

function renderPagination() {
  const container = document.getElementById("jobsPagination") || document.getElementById("paginationContainer");
  if (!container) return;

  const totalPages = Math.ceil(filteredJobs.length / pageSize) || 1;
  container.innerHTML = "";

  // Prev Button
  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
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
    p1.type = "button";
    p1.className = "btn-pagination";
    p1.textContent = "1";
    p1.onclick = () => { currentPage = 1; renderTableRows(); renderPagination(); updateCounterText(); };
    container.appendChild(p1);
    if (startPage > 2) {
      const dots = document.createElement("span");
      dots.className = "text-slate-400 text-xs px-1 select-none";
      dots.textContent = "...";
      container.appendChild(dots);
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
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
      dots.className = "text-slate-400 text-xs px-1 select-none";
      dots.textContent = "...";
      container.appendChild(dots);
    }
    const lastBtn = document.createElement("button");
    lastBtn.type = "button";
    lastBtn.className = "btn-pagination";
    lastBtn.textContent = totalPages;
    lastBtn.onclick = () => { currentPage = totalPages; renderTableRows(); renderPagination(); updateCounterText(); };
    container.appendChild(lastBtn);
  }

  // Next Button
  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
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
  const counter = document.getElementById("jobsCounterText");
  if (!counter) return;

  const total = filteredJobs.length;
  if (total === 0) {
    counter.textContent = "Showing 0 closed jobs";
    return;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, total);
  counter.textContent = `Showing ${start} to ${end} of ${total} closed jobs`;
}

function resetAllFilters() {
  const searchInput = document.getElementById("jobSearchInput");
  const propSelect = document.getElementById("filterProperty");
  const areaSelect = document.getElementById("filterArea");
  const prioritySelect = document.getElementById("filterPriority");
  const assignedSelect = document.getElementById("filterAssignedTo");
  const createdBySelect = document.getElementById("filterCreatedBy");
  const fromDateInput = document.getElementById("filterFromDate");
  const toDateInput = document.getElementById("filterToDate");
  const sortSelect = document.getElementById("filterSortOrder");

  if (searchInput) searchInput.value = "";
  if (propSelect) propSelect.value = "";
  if (areaSelect) areaSelect.value = "";
  if (prioritySelect) prioritySelect.value = "";
  if (assignedSelect) assignedSelect.value = "";
  if (dateSpanSelect) dateSpanSelect.value = "";
  if (locationSelect) locationSelect.value = "";
  if (sortSelect) sortSelect.value = "desc";

  currentSortField = "closeDate";
  currentSortOrder = "desc";
  currentPage = 1;
  selectedJobIds.clear();

  sessionStorage.removeItem("taskmaster_closed_jobs_state");
  filterAndRenderJobs();
}

function toggleJobActionMenu(btn) {
  const menu = btn.nextElementSibling;
  if (!menu) return;

  document.querySelectorAll(".dropdown-menu").forEach(m => {
    if (m !== menu) m.classList.add("hidden");
  });

  menu.classList.toggle("hidden");

  const clickOutside = function (e) {
    if (!btn.contains(e.target) && !menu.contains(e.target)) {
      menu.classList.add("hidden");
      document.removeEventListener("click", clickOutside);
    }
  };
  setTimeout(() => document.addEventListener("click", clickOutside), 0);
}
window.toggleJobActionMenu = toggleJobActionMenu;

async function reopenClosedJob(jobId) {
  if (!confirm("Are you sure you want to re-open this job order?")) return;

  try {
    const propId = (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getCurrentProperty === "function")
      ? WorkWizeAPI.getCurrentProperty()
      : localStorage.getItem("workwize_current_property");

    if (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.updateJobFields === "function") {
      await WorkWizeAPI.updateJobFields(jobId, propId, {
        status: "In Progress",
        jobStatus: "In Progress"
      });
    }

    if (typeof showToast === "function") {
      showToast("Job order re-opened and moved to In Progress.", "success");
    }

    await loadClosedJobsFromAPI();
  } catch (err) {
    console.error("Failed to reopen job:", err);
    if (typeof showToast === "function") {
      showToast(err.message || "Could not re-open job.", "error");
    }
  }
}
window.reopenClosedJob = reopenClosedJob;

function formatDetailForExport(val) {
  if (val === null || val === undefined) return '""';
  let s = String(val);
  s = s.replace(/<br\s*[\/]?>/gi, "\n")
       .replace(/<\/p>/gi, "\n")
       .replace(/<p[^>]*>/gi, "")
       .replace(/<\/div>/gi, "\n")
       .replace(/<div[^>]*>/gi, "")
       .replace(/<li[^>]*>/gi, "• ")
       .replace(/<\/li>/gi, "\n")
       .replace(/<[^>]+>/g, "");
  s = s.replace(/&nbsp;/gi, " ")
       .replace(/&amp;/gi, "&")
       .replace(/&lt;/gi, "<")
       .replace(/&gt;/gi, ">")
       .replace(/&quot;/gi, '"')
       .replace(/&#39;/gi, "'");
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = s.split("\n").map(l => l.trimEnd());
  s = lines.join("\r\n").trim();
  return `"${s.replace(/"/g, '""')}"`;
}

function exportJobsToCSV() {
  const jobsToExport = selectedJobIds.size > 0
    ? filteredJobs.filter(j => selectedJobIds.has(j.id))
    : filteredJobs;

  if (jobsToExport.length === 0) {
    if (typeof showToast === "function") showToast("No closed jobs available to export.", "warning");
    return;
  }

  const headers = [
    "Job ID",
    "Villa",
    "Job Details",
    "Create Date",
    "Location",
    "Priority",
    "Status",
    "Ref No",
    "Assigned To",
    "Closed Date",
    "Closed By",
    "Attachments",
    "Comments",
    "Created By"
  ];

  const rows = jobsToExport.map(j => [
    `"${j.id}"`,
    `"${j.villaNumber || "-"}"`,
    formatDetailForExport(j.details),
    `"${j.createdOn || "-"}"`,
    `"${(j.location || "-").replace(/"/g, '""')}"`,
    `"${j.priority || "Medium"}"`,
    `"${j.status || "Closed"}"`,
    `"${j.refNum || "-"}"`,
    `"${(j.assignedTo || "-").replace(/"/g, '""')}"`,
    `"${j.closeDate || "-"}"`,
    `"${(formatClosedByUser(j.closedBy) || "-").replace(/"/g, '""')}"`,
    `"${j.uploadCount || 0}"`,
    `"${j.commentCount || 0}"`,
    `"${(j.createdBy || "-").replace(/"/g, '""')}"`
  ]);

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `WorkWize_Closed_Jobs_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);

  if (typeof showToast === "function") {
    showToast(`Exported ${jobsToExport.length} closed jobs to CSV.`, "success");
  }
}
window.exportJobsToCSV = exportJobsToCSV;


function getFirstLinePreview(val, maxChars = 38) {
  if (val === null || val === undefined) return '<span class="text-slate-400">No description</span>';
  let s = String(val);
  s = s.replace(/<br\s*[\/]?>/gi, "\n")
       .replace(/<\/p>/gi, "\n")
       .replace(/<p[^>]*>/gi, "")
       .replace(/<\/div>/gi, "\n")
       .replace(/<div[^>]*>/gi, "")
       .replace(/<li[^>]*>/gi, "")
       .replace(/<\/li>/gi, "\n")
       .replace(/<[^>]+>/g, "");
  s = s.replace(/&nbsp;/gi, " ")
       .replace(/&amp;/gi, "&")
       .replace(/&lt;/gi, "<")
       .replace(/&gt;/gi, ">")
       .replace(/&quot;/gi, '"')
       .replace(/&#39;/gi, "'");
  
  const lines = s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '<span class="text-slate-400">No description</span>';

  let firstLine = lines[0];
  let hasMore = lines.length > 1;
  if (firstLine.length > maxChars) {
    firstLine = firstLine.substring(0, maxChars).trim();
    hasMore = true;
  }
  return escapeHtml(firstLine) + (hasMore ? "..." : "");
}

function stripHtmlToPlain(val) {
  if (val === null || val === undefined) return "";
  let s = String(val)
    .replace(/<br\s*[\/]?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/div>/gi, " ")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  return s.replace(/\s+/g, " ").trim();
}

function renderRichText(str) {
  if (str === null || str === undefined) return "";
  const s = String(str);
  if (/<[a-z][\s\S]*>/i.test(s)) {
    return s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
            .replace(/on\w+="[^"]*"/gi, "")
            .replace(/javascript:/gi, "");
  }
  return escapeHtml(s).replace(/\n/g, "<br>");
}

function escapeHtml(str) {
  return String(str || "").replace(/"/g, "&quot;");
}

function isSuperAdminRole() {
  if (typeof UserSession !== "undefined" && typeof UserSession.isSuperAdmin === "function") {
    return UserSession.isSuperAdmin();
  }
  const u = (typeof UserSession !== "undefined" && UserSession.getUser) ? UserSession.getUser() : null;
  const role = (typeof UserSession !== "undefined" && UserSession.getUserRole) ? UserSession.getUserRole().toUpperCase() : "";
  const roles = (typeof UserSession !== "undefined" && UserSession.getUserRoles) ? UserSession.getUserRoles() : [];
  const desg = (u?.desg || "").toUpperCase().replace(/[\s_]+/g, "");
  const email = (typeof UserSession !== "undefined" && UserSession.getUserEmail) ? UserSession.getUserEmail().toLowerCase() : "";
  return roles.some(r => r.replace(/[\s_]+/g, "").includes("SUPERADMIN")) ||
         role.replace(/[\s_]+/g, "").includes("SUPERADMIN") ||
         desg.includes("SUPERADMIN") || email.startsWith("superadmin") || email.includes("superadmin@");
}

async function superAdminDeleteJob(jobId, displayId) {
  if (!confirm(`Are you sure you want to permanently delete Closed Job ${displayId}?`)) return;

  try {
    const propId = WorkWizeAPI.getCurrentProperty();
    if (typeof WorkWizeAPI.deleteJob === "function") {
      await WorkWizeAPI.deleteJob(jobId, propId);
    } else {
      await WorkWizeAPI.request("api/jobtracker/deletejob", {
        method: "POST",
        body: { jobId: jobId, propId: propId }
      });
    }

    if (typeof showToast === "function") showToast(`Job ${displayId} deleted successfully.`, "success");
    await loadClosedJobsFromAPI();
  } catch (err) {
    if (typeof showToast === "function") showToast(err.message || "Failed to delete job", "error");
  }
}
window.superAdminDeleteJob = superAdminDeleteJob;

function saveClosedJobsState() {
  const state = {
    search: document.getElementById("jobSearchInput")?.value || "",
    prop: document.getElementById("filterProperty")?.value || "",
    area: document.getElementById("filterArea")?.value || "",
    location: document.getElementById("filterLocation")?.value || "",
    priority: document.getElementById("filterPriority")?.value || "",
    assignedTo: document.getElementById("filterAssignedTo")?.value || "",
    dateSpan: document.getElementById("filterDateSpan")?.value || "",
    sortField: currentSortField,
    sortOrder: currentSortOrder,
    page: currentPage
  };
  sessionStorage.setItem("taskmaster_closed_jobs_state", JSON.stringify(state));
}

function restoreClosedJobsState() {
  try {
    const saved = sessionStorage.getItem("taskmaster_closed_jobs_state");
    if (!saved) return;
    const state = JSON.parse(saved);

    const searchInput = document.getElementById("jobSearchInput");
    const propSelect = document.getElementById("filterProperty");
    const areaSelect = document.getElementById("filterArea");
    const locationSelect = document.getElementById("filterLocation");
    const prioritySelect = document.getElementById("filterPriority");
    const assignedSelect = document.getElementById("filterAssignedTo");
    const dateSpanSelect = document.getElementById("filterDateSpan");
    const sortSelect = document.getElementById("filterSortOrder");

    if (state.search && searchInput) searchInput.value = state.search;
    if (state.prop && propSelect) propSelect.value = state.prop;
    if (state.area && areaSelect) areaSelect.value = state.area;
    if (state.location && locationSelect) locationSelect.value = state.location;
    if (state.priority && prioritySelect) prioritySelect.value = state.priority;
    if (state.assignedTo && assignedSelect) assignedSelect.value = state.assignedTo;
    if (state.dateSpan && dateSpanSelect) dateSpanSelect.value = state.dateSpan;
    if (state.sortOrder && sortSelect) sortSelect.value = state.sortOrder;

    if (state.sortField) currentSortField = state.sortField;
    if (state.sortOrder) currentSortOrder = state.sortOrder;
    if (state.page) currentPage = state.page;
  } catch (e) {
    console.warn("Could not restore closed jobs state:", e);
  }
}

window.loadClosedJobsFromAPI = loadClosedJobsFromAPI;
window.resetAllFilters = resetAllFilters;
