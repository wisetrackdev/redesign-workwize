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

document.addEventListener("DOMContentLoaded", async function () {
  // Parse query string for pre-filled filters
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

  ["filterProperty", "filterArea", "filterStatus", "filterPriority", "filterAssignedTo", "filterDateSpan"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
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
    const response = await WorkWizeAPI.getPropertyJobs(currentPropId);

    if (response && Array.isArray(response.jobs) && response.jobs.length > 0) {
      allJobsStore = response.jobs.map(j => mapApiJobToModel(j));
      sortJobsDescending(allJobsStore);
      populateFilterDropdowns();
      filterAndRenderJobs();
      return;
    }
  } catch (error) {
    console.warn("API getpropertyjobs failed, falling back to local database:", error.message);
  }

  // Fallback to local DB
  if (typeof WorkWizeDB !== "undefined") {
    allJobsStore = WorkWizeDB.getJobs().map(j => ({
      id: j.id,
      rawId: j.id,
      orgjobId: j.id,
      villaNumber: j.villaNumber || "-",
      details: j.details || j.title || "No description",
      createdOn: j.openedOn,
      location: j.location || "-",
      priority: j.priority || "Medium",
      status: j.status || "Yet to Commence",
      refNum: j.refNo || "-",
      assignedTo: j.assignedTo || "IT Admin",
      expectedCompletion: j.expectedDate || "-",
      closeDate: j.status === "Closed" ? j.expectedDate : "-",
      uploadCount: 0,
      commentCount: 0,
      createdBy: typeof UserSession !== "undefined" ? UserSession.getUserName() : "Admin",
      propName: WorkWizeAPI.getCurrentPropertyName() || "Main Facility",
      area: j.area || "General Area"
    }));
    sortJobsDescending(allJobsStore);
  }

  populateFilterDropdowns();
  filterAndRenderJobs();
}

/**
 * Sorts jobs descending by date: newest jobs at top, older jobs at bottom
 */
function sortJobsDescending(jobs) {
  if (!Array.isArray(jobs)) return jobs;
  return jobs.sort((a, b) => {
    const timeA = a.createdOn ? new Date(a.createdOn).getTime() : 0;
    const timeB = b.createdOn ? new Date(b.createdOn).getTime() : 0;
    if (isNaN(timeA) && isNaN(timeB)) return 0;
    if (isNaN(timeA)) return 1;
    if (isNaN(timeB)) return -1;
    return timeB - timeA;
  });
}

function mapApiJobToModel(job) {
  const statusStr = normalizeStatus(job.jobStatus);
  const priorityStr = normalizePriority(job.priority);
  const assignees = formatAssignee(job);

  return {
    id: job.orgjobId || job.jobId,
    rawId: job.jobId,
    orgjobId: job.orgjobId,
    villaNumber: job.villaNumber || "",
    details: job.jobDetail || "No description",
    createdOn: job.jobCreatedOn,
    location: job.jobLocation || "",
    priority: priorityStr,
    status: statusStr,
    refNum: job.refNum || "",
    assignedTo: assignees,
    expectedCompletion: job.expectedCompletion,
    closeDate: job.jobCloseOn,
    uploadCount: job.uploadCount !== undefined ? job.uploadCount : (Array.isArray(job.imageUploads) ? job.imageUploads.length : 0),
    commentCount: job.commentCount !== undefined ? job.commentCount : (Array.isArray(job.comments) ? job.comments.length : 0),
    createdBy: `${job.firstname || ""} ${job.lastname || ""}`.trim() || "-",
    propName: job.propName || WorkWizeAPI.getCurrentPropertyName() || "-",
    area: job.areaName || "General Area"
  };
}

function normalizeStatus(st) {
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
      <td class="max-w-[240px] truncate text-slate-700 font-medium" title="${escapeHtml(job.details)}">
        ${escapeHtml(job.details)}
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
          <div class="hidden absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-30 text-xs text-slate-700 dropdown-menu">
            <a href="job-details.html?id=${encodeURIComponent(job.rawId || job.id)}" target="_blank" class="block px-3 py-2 hover:bg-slate-50">
              <i class="fa-regular fa-eye mr-2 text-blue-500"></i> View Details
            </a>
            <button onclick="quickUpdateJobStatus('${job.rawId || job.id}', 'IN_PROGRESS', 'In Progress')" class="w-full text-left px-3 py-2 hover:bg-slate-50">
              <i class="fa-solid fa-play mr-2 text-blue-500"></i> Set In Progress
            </button>
            <button onclick="quickUpdateJobStatus('${job.rawId || job.id}', 'COMPLETED', 'Closed')" class="w-full text-left px-3 py-2 hover:bg-slate-50">
              <i class="fa-solid fa-check mr-2 text-emerald-500"></i> Mark as Closed
            </button>
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
    `"${(j.details || "").replace(/"/g, '""')}"`,
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
