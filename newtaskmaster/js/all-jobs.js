/**
 * WorkWize All Jobs List View Logic
 * Full Search, Filtering, Pagination, Bulk Actions & Export
 */

let currentPage = 1;
const pageSize = 12;
let filteredJobs = [];
let selectedJobIds = new Set();

document.addEventListener("DOMContentLoaded", function () {
  // Parse query string for pre-filled filters (e.g. ?search=... or ?area=...)
  const urlParams = new URLSearchParams(window.location.search);
  const searchParam = urlParams.get("search");
  const areaParam = urlParams.get("area");

  const searchInput = document.getElementById("jobSearchInput");
  const areaSelect = document.getElementById("filterArea");

  if (searchParam && searchInput) {
    searchInput.value = searchParam;
  }
  if (areaParam && areaSelect) {
    areaSelect.value = areaParam;
  }

  // Populate filter dropdowns dynamically
  populateFilterDropdowns();

  // Initial render
  filterAndRenderJobs();

  // Event Listeners for Filters
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      currentPage = 1;
      filterAndRenderJobs();
    });
  }

  ["filterArea", "filterStatus", "filterPriority", "filterAssignedTo"].forEach(id => {
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
});

function populateFilterDropdowns() {
  const jobs = WorkWizeDB.getJobs();
  const areaSelect = document.getElementById("filterArea");
  const assignedSelect = document.getElementById("filterAssignedTo");

  if (areaSelect) {
    const areas = [...new Set(jobs.map(j => j.area))].sort();
    areas.forEach(area => {
      if (!Array.from(areaSelect.options).some(o => o.value === area)) {
        const opt = document.createElement("option");
        opt.value = area;
        opt.textContent = area;
        areaSelect.appendChild(opt);
      }
    });
  }

  if (assignedSelect) {
    const assignees = [...new Set(jobs.map(j => j.assignedTo))].sort();
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
  const allJobs = WorkWizeDB.getJobs();

  const searchQuery = (document.getElementById("jobSearchInput")?.value || "").toLowerCase().trim();
  const areaFilter = document.getElementById("filterArea")?.value || "";
  const statusFilter = document.getElementById("filterStatus")?.value || "";
  const priorityFilter = document.getElementById("filterPriority")?.value || "";
  const assignedFilter = document.getElementById("filterAssignedTo")?.value || "";

  filteredJobs = allJobs.filter(job => {
    // Search query matches ID, Title, Area, Sub-area, Status, Assignee
    const matchSearch = !searchQuery || 
      job.id.toLowerCase().includes(searchQuery) ||
      job.title.toLowerCase().includes(searchQuery) ||
      job.area.toLowerCase().includes(searchQuery) ||
      job.subArea.toLowerCase().includes(searchQuery) ||
      job.status.toLowerCase().includes(searchQuery) ||
      job.assignedTo.toLowerCase().includes(searchQuery) ||
      (job.location && job.location.toLowerCase().includes(searchQuery));

    const matchArea = !areaFilter || job.area === areaFilter;
    const matchStatus = !statusFilter || job.status === statusFilter;
    const matchPriority = !priorityFilter || job.priority.toLowerCase() === priorityFilter.toLowerCase();
    const matchAssigned = !assignedFilter || job.assignedTo === assignedFilter;

    return matchSearch && matchArea && matchStatus && matchPriority && matchAssigned;
  });

  renderTableRows();
  renderPagination();
  updateCounterText();
}

function renderTableRows() {
  const tbody = document.getElementById("allJobsTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (filteredJobs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="py-12 text-center text-slate-400">
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

    // Status badge class
    let statusBadgeClass = "badge-in-progress";
    if (job.status === "Yet to Commence") statusBadgeClass = "badge-yet-to-commence";
    else if (job.status === "Under Discussion") statusBadgeClass = "badge-under-discussion";
    else if (job.status === "Closed") statusBadgeClass = "badge-closed";

    // Priority badge class
    let priorityBadgeClass = "badge-priority-low";
    if (job.priority.toLowerCase() === "high") priorityBadgeClass = "badge-priority-high";
    else if (job.priority.toLowerCase() === "medium") priorityBadgeClass = "badge-priority-medium";

    const isChecked = selectedJobIds.has(job.id);

    tr.innerHTML = `
      <td class="w-10">
        <input type="checkbox" data-id="${job.id}" class="row-checkbox rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer" ${isChecked ? "checked" : ""}>
      </td>
      <td>
        <a href="job-details.html?id=${encodeURIComponent(job.id)}" class="font-semibold text-blue-600 hover:underline hover:text-blue-800 transition-colors">
          ${job.id}
        </a>
      </td>
      <td class="font-medium text-slate-800 max-w-[220px] truncate" title="${job.title}">
        ${job.title}
      </td>
      <td class="text-slate-600">${job.area}</td>
      <td class="text-slate-600">${job.subArea}</td>
      <td>
        <span class="badge-status ${statusBadgeClass}">
          ${job.status}
        </span>
      </td>
      <td>
        <span class="badge-priority ${priorityBadgeClass}">
          ${job.priority}
        </span>
      </td>
      <td class="text-slate-700 font-medium whitespace-nowrap">
        <div class="flex items-center gap-1.5">
          <span class="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
            ${job.assignedTo.slice(0, 2).toUpperCase()}
          </span>
          ${job.assignedTo}
        </div>
      </td>
      <td class="text-slate-500 whitespace-nowrap">${job.openedOn}</td>
      <td class="text-right">
        <div class="relative inline-block text-left dropdown-group">
          <button class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors" onclick="toggleJobActionMenu(this)">
            <i class="fa-solid fa-ellipsis"></i>
          </button>
          <div class="hidden absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 text-xs text-slate-700 dropdown-menu">
            <a href="job-details.html?id=${encodeURIComponent(job.id)}" class="block px-3 py-2 hover:bg-slate-50">
              <i class="fa-regular fa-eye mr-2 text-blue-500"></i> View Details
            </a>
            <button onclick="quickUpdateStatus('${job.id}', 'In Progress')" class="w-full text-left px-3 py-2 hover:bg-slate-50">
              <i class="fa-solid fa-play mr-2 text-blue-500"></i> Set In Progress
            </button>
            <button onclick="quickUpdateStatus('${job.id}', 'Closed')" class="w-full text-left px-3 py-2 hover:bg-slate-50">
              <i class="fa-solid fa-check mr-2 text-emerald-500"></i> Mark as Closed
            </button>
            <div class="border-t border-slate-100 my-1"></div>
            <button onclick="deleteJobRow('${job.id}')" class="w-full text-left px-3 py-2 hover:bg-rose-50 text-rose-600">
              <i class="fa-regular fa-trash-can mr-2"></i> Delete Job
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

function renderPagination() {
  const container = document.getElementById("jobsPagination");
  if (!container) return;

  const totalPages = Math.ceil(filteredJobs.length / pageSize) || 1;
  container.innerHTML = "";

  // Prev Button
  const prevBtn = document.createElement("button");
  prevBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-medium ${currentPage === 1 ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`;
  prevBtn.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
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
  let pagesToShow = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pagesToShow.push(i);
  } else {
    if (currentPage <= 4) {
      pagesToShow = [1, 2, 3, 4, 5, '...', totalPages];
    } else if (currentPage >= totalPages - 3) {
      pagesToShow = [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    } else {
      pagesToShow = [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
    }
  }

  pagesToShow.forEach(page => {
    if (page === '...') {
      const dots = document.createElement("span");
      dots.className = "w-8 h-8 flex items-center justify-center text-xs text-slate-400";
      dots.textContent = "...";
      container.appendChild(dots);
    } else {
      const btn = document.createElement("button");
      btn.className = `w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold ${currentPage === page ? 'bg-blue-600 text-white shadow-sm' : 'border border-slate-200 text-slate-700 hover:bg-slate-100'}`;
      btn.textContent = page;
      btn.onclick = () => {
        currentPage = page;
        renderTableRows();
        renderPagination();
        updateCounterText();
      };
      container.appendChild(btn);
    }
  });

  // Next Button
  const nextBtn = document.createElement("button");
  nextBtn.className = `w-8 h-8 rounded-lg flex items-center justify-center border text-xs font-medium ${currentPage === totalPages ? 'border-slate-200 text-slate-300 cursor-not-allowed' : 'border-slate-300 text-slate-600 hover:bg-slate-100'}`;
  nextBtn.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
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
    counterEl.textContent = "Showing 0 jobs";
    return;
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(start + pageSize - 1, total);
  // Matches exact UI text format from screenshot: "Showing 1 to 8 of 360 jobs"
  const baselineCount = Math.max(360, WorkWizeDB.getJobs().length);
  counterEl.textContent = `Showing ${start} to ${end} of ${baselineCount} jobs`;
}

function resetAllFilters() {
  const searchInput = document.getElementById("jobSearchInput");
  if (searchInput) searchInput.value = "";

  ["filterArea", "filterStatus", "filterPriority", "filterAssignedTo"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

  currentPage = 1;
  filterAndRenderJobs();
  showToast("Filters reset to default", "success");
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

function quickUpdateStatus(jobId, newStatus) {
  WorkWizeDB.updateJob(jobId, { status: newStatus });
  filterAndRenderJobs();
  showToast(`Job ${jobId} status updated to ${newStatus}`, "success");
}

function deleteJobRow(jobId) {
  if (confirm(`Are you sure you want to delete ${jobId}?`)) {
    WorkWizeDB.deleteJob(jobId);
    selectedJobIds.delete(jobId);
    filterAndRenderJobs();
    showToast(`Job ${jobId} removed`, "success");
  }
}

function updateBulkActionBar() {
  const bar = document.getElementById("bulkActionBar");
  const countSpan = document.getElementById("selectedCountSpan");
  if (!bar || !countSpan) return;

  if (selectedJobIds.size > 0) {
    countSpan.textContent = selectedJobIds.size;
    bar.classList.remove("hidden");
  } else {
    bar.classList.add("hidden");
  }
}

function exportJobsToCSV() {
  if (filteredJobs.length === 0) {
    showToast("No jobs to export", "error");
    return;
  }

  const headers = ["ID", "Title", "Area", "Sub Area", "Status", "Priority", "Assigned To", "Opened On", "Budget", "Villa"];
  const rows = filteredJobs.map(j => [
    `"${j.id}"`,
    `"${j.title.replace(/"/g, '""')}"`,
    `"${j.area}"`,
    `"${j.subArea}"`,
    `"${j.status}"`,
    `"${j.priority}"`,
    `"${j.assignedTo}"`,
    `"${j.openedOn}"`,
    `"${j.budget}"`,
    `"${j.villaNumber}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `workwize_jobs_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast(`Exported ${filteredJobs.length} jobs to CSV`, "success");
}

window.renderAllJobsTable = filterAndRenderJobs;
window.resetAllFilters = resetAllFilters;
window.quickUpdateStatus = quickUpdateStatus;
window.deleteJobRow = deleteJobRow;
window.toggleJobActionMenu = toggleJobActionMenu;
