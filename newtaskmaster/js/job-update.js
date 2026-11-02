
function toggleAssigneeDropdown(event, menuId) {
  if (event && event.stopPropagation) {
    event.stopPropagation();
  }
  const id = (typeof event === "string" && !menuId) ? event : (menuId || "editAssignedToMenu");
  const menu = document.getElementById(id);
  if (!menu) return;
  menu.classList.toggle("hidden");
}

// Close dropdown on outside click
document.addEventListener("click", function(e) {
  const dropdown = document.getElementById("editAssignedToDropdown");
  const menu = document.getElementById("editAssignedToMenu");
  if (dropdown && menu && !dropdown.contains(e.target)) {
    menu.classList.add("hidden");
  }
});

// Prevent dropdown clicks from bubbling and closing unexpectedly
document.addEventListener("DOMContentLoaded", function() {
  const menu = document.getElementById("editAssignedToMenu");
  if (menu) {
    menu.addEventListener("click", function(e) {
      e.stopPropagation();
    });
  }
});

function updateEditAssigneeButtonText() {
  const textEl = document.getElementById("editAssignedToText");
  const cbs = document.querySelectorAll("#editAssignedToMenu .edit-assignee-cb:checked");

  if (!textEl) return;
  if (cbs.length === 0) {
    textEl.textContent = "Select Assignee";
    textEl.className = "text-slate-500 truncate";
  } else if (cbs.length === 1) {
    textEl.textContent = cbs[0].dataset.name || cbs[0].value;
    textEl.className = "text-slate-800 font-semibold truncate";
  } else {
    const names = Array.from(cbs).map(cb => cb.dataset.name || cb.value);
    textEl.textContent = `${names.length} selected (${names.join(", ")})`;
    textEl.className = "text-slate-800 font-semibold truncate";
  }
}

function getSelectedEditAssignees() {
  const cbs = document.querySelectorAll("#editAssignedToMenu .edit-assignee-cb:checked");
  return Array.from(cbs).map(cb => ({
    id: cb.value,
    name: cb.dataset.name || cb.value
  }));
}
/**
 * WorkWize Job Update Logic
 * Dedicated editor for job properties, assignment, schedule, and notes
 * Interacts with WorkWizeAPI.updateJob and WorkWizeAPI.updateJobFields
 */

let currentJobId = "";
let currentJobData = null;

document.addEventListener("DOMContentLoaded", async function () {
  // Extract job ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  currentJobId = urlParams.get("id") || urlParams.get("jobid");

  // Check login
  if (typeof WorkWizeAPI !== "undefined" && !WorkWizeAPI.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  // Immediately read cached job data from details page or previous session
  let cachedJob = null;
  try {
    const rawCache = sessionStorage.getItem("workwize_current_job_data") || localStorage.getItem("workwize_last_job_data");
    if (rawCache) {
      cachedJob = JSON.parse(rawCache);
    }
  } catch (e) {}

  if (!currentJobId) {
    currentJobId = (cachedJob && (cachedJob.orgjobId || cachedJob.jobId || cachedJob.id)) || localStorage.getItem("workwize_last_job_id") || "";
  }
  if (currentJobId) {
    localStorage.setItem("workwize_last_job_id", currentJobId);
  }

  // Set navigation links immediately
  if (currentJobId) {
    setupNavigationLinks(currentJobId);
  }

  // If we have cached job data from details page, PRE-POPULATE IMMEDIATELY (no loading wait!)
  if (cachedJob) {
    currentJobData = cachedJob;
    populateEditForm(cachedJob);
  }

  // Attach submit listener
  const form = document.getElementById("jobUpdateForm");
  if (form) {
    form.addEventListener("submit", handleJobUpdateSubmit);
  }

  // Villa number toggle on area change
  const areaSelect = document.getElementById("editAreaName");
  if (areaSelect) {
    areaSelect.addEventListener("change", function () {
      toggleVillaField(this.value);
    });
  }

  // Load / refresh existing job details into form in background
  await loadJobForEditing(currentJobId);
});

function setupNavigationLinks(jobId) {
  const detailsUrl = `job-details.html?id=${encodeURIComponent(jobId)}`;
  
  const viewLink = document.getElementById("viewJobDetailsLink");
  const breadcrumbLink = document.getElementById("breadcrumbViewJobLink");
  const backBtn = document.getElementById("backToJobDetailsBtn");
  const cancelBtn = document.getElementById("cancelUpdateBtn");

  if (viewLink) viewLink.href = detailsUrl;
  if (breadcrumbLink) breadcrumbLink.href = detailsUrl;
  if (backBtn) backBtn.href = detailsUrl;
  if (cancelBtn) cancelBtn.href = detailsUrl;
}

function toggleVillaField(areaVal) {
  const villaInput = document.getElementById("editVillaNumber");
  if (!villaInput) return;
  const isGuestVilla = String(areaVal || "").toUpperCase().includes("VILLA");
  if (isGuestVilla) {
    villaInput.placeholder = "Villa Number required (e.g. 104)";
    villaInput.parentElement.classList.remove("opacity-50");
  } else {
    villaInput.placeholder = "Not required for general areas";
  }
}

async function loadJobForEditing(jobId) {
  let loaded = !!currentJobData;

  // 1. Fetch from live API
  if (typeof WorkWizeAPI !== "undefined" && jobId) {
    try {
      const res = await WorkWizeAPI.getJobById(jobId);
      if (res && res.success && res.jobdata) {
        currentJobData = res.jobdata;
        populateEditForm(res.jobdata);
        loaded = true;
      }
    } catch (err) {
      console.warn("API getJobById error in edit page:", err);
    }

    // 1b. Fallback: Search in property jobs
    if (!loaded) {
      try {
        const propId = WorkWizeAPI.getCurrentProperty();
        const propJobsRes = await WorkWizeAPI.getPropertyJobs(propId);
        if (propJobsRes && Array.isArray(propJobsRes.jobs)) {
          const matched = propJobsRes.jobs.find(j => 
            (j.jobId && j.jobId.toLowerCase() === (jobId || "").toLowerCase()) || 
            (j.orgjobId && j.orgjobId.toLowerCase() === (jobId || "").toLowerCase())
          );
          if (matched) {
            currentJobData = matched;
            populateEditForm(matched);
            loaded = true;
          }
        }
      } catch (e) {
        console.warn("Property jobs lookup in edit page failed:", e);
      }
    }
  }

  // 2. Fallback to local DB
  if (!loaded && typeof WorkWizeDB !== "undefined") {
    const allLocal = WorkWizeDB.getJobs();
    const localJob = allLocal.find(j => 
      (j.id && j.id.toLowerCase() === (jobId || "").toLowerCase()) || 
      (j.refNo && j.refNo.toLowerCase() === (jobId || "").toLowerCase())
    ) || (allLocal.length > 0 ? allLocal[0] : null);

    if (localJob) {
      currentJobData = {
        jobId: localJob.id,
        orgjobId: localJob.id,
        propId: WorkWizeAPI ? WorkWizeAPI.getCurrentProperty() : "PROP-001",
        propName: WorkWizeAPI ? WorkWizeAPI.getCurrentPropertyName() : "Main Facility",
        areaName: localJob.area || "Development/Project",
        villaNumber: localJob.villaNumber || "",
        jobLocation: localJob.location || "",
        priority: (localJob.priority || "MEDIUM").toUpperCase(),
        jobStatus: (localJob.status || "IN_PROGRESS").toUpperCase().replace(/\s+/g, '_'),
        jobCreatedOn: localJob.openedOn || new Date().toISOString().split("T")[0],
        expectedCompletion: localJob.expectedDate || "",
        refNum: localJob.refNo || "",
        budget: localJob.budget || 0,
        finalExp: 0,
        jobDetail: localJob.details || localJob.description || "",
        remarks: localJob.remarks || "",
        teams: localJob.assignedTo ? [localJob.assignedTo] : ["Facilities Team"]
      };
      populateEditForm(currentJobData);
      loaded = true;
    }
  }

  if (!loaded && !currentJobData) {
    const displayId = document.getElementById("updateJobDisplayId");
    if (displayId) displayId.textContent = "Job Not Found";
    showToast("Could not retrieve job data to edit.", "error");
  }
}

function extractJobAssignees(data) {
  const result = [];
  if (Array.isArray(data?._detailAssignees) && data._detailAssignees.length > 0) {
    data._detailAssignees.forEach(a => { if (a) result.push(String(a).trim()); });
  }
  if (Array.isArray(data?.teams) && data.teams.length > 0) {
    data.teams.forEach(t => {
      const name = (typeof t === "object" ? (t.teamName || t.name || "") : t).toString().trim();
      if (name && !result.includes(name)) result.push(name);
      if (t.teamID && !result.includes(t.teamID)) result.push(t.teamID);
      if (t.teamId && !result.includes(t.teamId)) result.push(t.teamId);
    });
  }
  if (Array.isArray(data?.data1) && data.data1.length > 0) {
    data.data1.forEach(t => {
      const name = (typeof t === "object" ? (t.teamName || t.name || "") : t).toString().trim();
      if (name && !result.includes(name)) result.push(name);
      if (t.teamID && !result.includes(t.teamID)) result.push(t.teamID);
    });
  }
  if (data?.assignedTo) {
    data.assignedTo.split(",").forEach(s => {
      const trimmed = s.trim();
      if (trimmed && !result.includes(trimmed)) result.push(trimmed);
    });
  }
  return result;
}

function populateEditAssignees(data) {
  const listEl = document.getElementById("editAssignedToMenu");
  if (!listEl) return;

  const assignedNames = extractJobAssignees(data);
  const currentlyAssignedSet = new Set(assignedNames.map(a => a.toUpperCase()));

  // Base options (EXACT SAME AS ADD NEW JOB POPUP)
  const baseOptions = [
    { val: "Facilities Team", label: "Facilities Team" },
    { val: "Engineering Team", label: "Engineering Team" },
    { val: "IT Admin", label: "Testing - IT Admin" },
    { val: "Safety Team", label: "Safety Team" }
  ];

  let empList = [];
  if (Array.isArray(data?.propEmp) && data.propEmp.length > 0) {
    empList = data.propEmp;
  }

  let finalOptions = [];
  if (empList.length > 0) {
    finalOptions = empList.map(emp => {
      const val = emp.teamId || emp.teamName;
      let label = emp.teamName;
      if (emp.manager && (emp.manager.firstName || emp.manager.desg)) {
        const desg = (emp.manager.desg || "").trim();
        const name = `${emp.manager.firstName || ""} ${emp.manager.lastName || ""}`.trim();
        label = desg ? `${desg} [${emp.teamName}]` : (name ? `${name} [${emp.teamName}]` : emp.teamName);
      }
      return { val, label };
    });
  } else {
    finalOptions = [...baseOptions];
  }

  // Ensure any assignee showing in job-detail is present in the options list!
  assignedNames.forEach(rawName => {
    const norm = rawName.toUpperCase();
    const alreadyExists = finalOptions.some(opt => 
      opt.val.toUpperCase() === norm || 
      opt.label.toUpperCase() === norm ||
      (opt.val === "IT Admin" && norm === "TESTING - IT ADMIN") ||
      (opt.label === "Testing - IT Admin" && norm === "IT ADMIN")
    );
    if (!alreadyExists) {
      finalOptions.push({ val: rawName, label: rawName });
    }
  });

  // Render options with pre-checked state matching details page
  listEl.innerHTML = finalOptions.map(item => {
    const isChecked = (
      currentlyAssignedSet.has(item.val.toUpperCase()) || 
      currentlyAssignedSet.has(item.label.toUpperCase()) ||
      (item.val === "IT Admin" && currentlyAssignedSet.has("TESTING - IT ADMIN")) ||
      (item.label === "Testing - IT Admin" && currentlyAssignedSet.has("IT ADMIN")) ||
      (item.val.includes("IT") && currentlyAssignedSet.has("IT ADMIN")) ||
      (item.label.includes("IT Admin") && currentlyAssignedSet.has("IT ADMIN"))
    ) ? "checked" : "";

    return `
      <label class="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 rounded-md cursor-pointer text-xs text-slate-700 select-none">
        <input type="checkbox" value="${escapeHtml(item.val)}" data-name="${escapeHtml(item.label)}" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 edit-assignee-cb" ${isChecked} onchange="updateEditAssigneeButtonText()">
        <span class="truncate">${escapeHtml(item.label)}</span>
      </label>
    `;
  }).join("");

  // Update button text immediately so it reflects the pre-checked assignee
  updateEditAssigneeButtonText();
}

function populateEditForm(data) {
  if (!data) return;

  const displayId = data.orgjobId || data.jobId || data.id || currentJobId;

  // Header reference fields
  const displayIdEl = document.getElementById("updateJobDisplayId");
  const propNameEl = document.getElementById("updateJobPropName");
  const createdDateEl = document.getElementById("updateJobCreatedDate");
  const statusBadge = document.getElementById("updateCurrentStatusBadge");
  const priorityBadge = document.getElementById("updateCurrentPriorityBadge");

  if (displayIdEl) displayIdEl.textContent = displayId;
  if (propNameEl) propNameEl.textContent = data.propName || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentPropertyName() : "Main Facility");
  if (createdDateEl) {
    const rawDate = data.jobCreatedOn || data.createdOn || data.openedOn || data.jobDate;
    createdDateEl.textContent = rawDate ? `Created ${formatDate(rawDate)}` : "Created Recently";
  }

  // Header badges
  const normStatus = normalizeStatusString(data.jobStatus || data.status || "IN_PROGRESS");
  const normPriority = normalizePriorityString(data.priority || "MEDIUM");
  if (statusBadge) {
    statusBadge.textContent = normStatus;
    statusBadge.className = `badge-status badge-${normStatus.toLowerCase().replace(/\s+/g, '-')} text-xs font-bold px-3 py-0.5 rounded-full`;
  }
  if (priorityBadge) {
    priorityBadge.textContent = normPriority;
    priorityBadge.className = `badge-priority badge-priority-${normPriority.toLowerCase().replace(/\s+/g, '-')} text-xs font-bold px-3 py-0.5 rounded-full`;
  }

  // Form Fields
  setSelectValue("editJobStatus", mapToStatusValue(data.jobStatus || data.status));
  setSelectValue("editJobPriority", mapToPriorityValue(data.priority));

  // Populate Assign To dropdown immediately
  try {
    populateEditAssignees(data);
  } catch (err) {
    console.warn("Assignee populate error:", err);
  }

  // Populate dynamic areas if available
  const areaSelect = document.getElementById("editAreaName");
  if (areaSelect && Array.isArray(data.allareas) && data.allareas.length > 0) {
    const curArea = data.areaName || data.area || data.areaID || areaSelect.value;
    areaSelect.innerHTML = `<option value="">Select Area</option>`;
    data.allareas.forEach(a => {
      const opt = document.createElement("option");
      opt.value = a.areaid || a.areaId || a.areaName;
      opt.textContent = a.areaName;
      areaSelect.appendChild(opt);
    });
    setSelectValue("editAreaName", curArea);
  } else {
    setSelectValue("editAreaName", data.areaName || data.area || "Development/Project");
  }

  // Populate Owner Comment
  setInputValue("editOwnerComment", data.owner_comment || "");

  // Dates & strings
  setInputValue("editExpectedCompletion", formatDateForInput(data.expectedCompletion || data.expectedDate));
  setInputValue("editRefNum", data.refNum || "");
  setInputValue("editJobLocation", data.jobLocation || data.location || "");
  setInputValue("editVillaNumber", data.villaNumber && data.villaNumber !== "-" ? data.villaNumber : "");
  setInputValue("editJobDetail", data.jobDetail || data.details || data.description || "");
  setInputValue("editRemarks", data.remarks && data.remarks !== "null" ? data.remarks : "");
  setInputValue("editBudget", data.budget || 0);
  setInputValue("editCostCenter", data.ccf || "POMEC");
  setInputValue("editFinalExp", data.finalExp || data.expense || 0);

  toggleVillaField(data.areaName || data.area);
}

async function handleJobUpdateSubmit(e) {
  e.preventDefault();

  const saveBtn = document.getElementById("saveJobUpdateBtn");
  const saveBtnText = document.getElementById("saveBtnText");
  if (saveBtn) saveBtn.disabled = true;
  if (saveBtnText) saveBtnText.textContent = "Saving Changes...";

  try {
    const rawJobId = (currentJobData && currentJobData.jobId) ? currentJobData.jobId : currentJobId;
    const propId = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentProperty() : "PROP-001";

    const jobStatus = document.getElementById("editJobStatus").value;
    const priority = document.getElementById("editJobPriority").value;
    const selectedAssignees = getSelectedEditAssignees();
    if (selectedAssignees.length === 0) {
      showToast("Please select at least one Assignee", "error");
      if (saveBtn) saveBtn.disabled = false;
      if (saveBtnText) saveBtnText.textContent = "Save Changes";
      return;
    }
    const assignedText = selectedAssignees.map(a => a.name).join(", ");
    const expectedCompletion = document.getElementById("editExpectedCompletion").value;
    const refNum = document.getElementById("editRefNum").value;
    const areaName = document.getElementById("editAreaName").value;
    const jobLocation = document.getElementById("editJobLocation").value;
    const villaNumber = document.getElementById("editVillaNumber").value;
    const jobDetail = document.getElementById("editJobDetail").value;
    const remarks = document.getElementById("editRemarks").value;
    const budget = document.getElementById("editBudget").value;
    const finalExp = document.getElementById("editFinalExp").value;
    const newComment = document.getElementById("editNewComment").value;
    const photoFileInput = document.getElementById("editPhotoFile");

    const isClosed = (jobStatus === "COMPLETED" || jobStatus === "CLOSED");

    // Prepare FormData for api/jobtracker/updatejob
    const formData = new FormData();
    formData.append("propID", propId);
    formData.append("jobID", rawJobId);
    formData.append("areaID", areaName);
    formData.append("villaNumber", villaNumber || "-");
    formData.append("priority", priority);
    formData.append("jobLocation", jobLocation || "-");
    formData.append("jobStatus", jobStatus);
    formData.append("jobDate", (currentJobData && currentJobData.jobCreatedOn) ? currentJobData.jobCreatedOn : new Date().toISOString().split("T")[0]);
    formData.append("refNum", refNum || "");
    formData.append("jobDetail", jobDetail);
    formData.append("budget", budget || "0");
    formData.append("expense", finalExp || "0");
    formData.append("jobActive", isClosed ? "0" : "1");
    selectedAssignees.forEach(a => {
      formData.append("assignedTo", a.id);
    });

    let apiSucceeded = false;

    // 1. Send update to API
    if (typeof WorkWizeAPI !== "undefined") {
      try {
        await WorkWizeAPI.updateJob(formData);
        apiSucceeded = true;
      } catch (err) {
        console.warn("api/jobtracker/updatejob attempt error:", err.message);
        // Fallback: try updateJobFields for primary fields
        try {
          const statusForm = new FormData();
          statusForm.append("jobId", rawJobId);
          statusForm.append("jobStatus", jobStatus);
          if (isClosed) statusForm.append("isActive", "false");
          await WorkWizeAPI.updateJobFields(statusForm);
          apiSucceeded = true;
        } catch (e2) {
          console.warn("updateJobFields fallback also failed:", e2.message);
        }
      }

      // 1c. If user modified Owner's Comment, save via JB-OWNERCOMMENT
    const ownerCommentVal = document.getElementById("editOwnerComment")?.value.trim() || "";
    if (ownerCommentVal !== (currentJobData?.owner_comment || "")) {
      try {
        const ownerForm = new FormData();
        ownerForm.append("propID", propId);
        ownerForm.append("jobID", rawJobId);
        ownerForm.append("areaID", areaName || "");
        ownerForm.append("field", "JB-OWNERCOMMENT");
        ownerForm.append("data", ownerCommentVal);
        await WorkWizeAPI.updateJobFields(ownerForm);
      } catch (ownerErr) {
        console.warn("Error updating owner comment:", ownerErr);
      }
    }

    // 1d. Also update assignees via JB-TEAMS in updateJobFields
    try {
      const teamsForm = new FormData();
      teamsForm.append("propID", propId);
      teamsForm.append("jobID", rawJobId);
      teamsForm.append("field", "JB-TEAMS");
      selectedAssignees.forEach(a => {
        teamsForm.append("data", a.id);
      });
      await WorkWizeAPI.updateJobFields(teamsForm);
    } catch (teamsErr) {
      console.warn("Error updating teams via fields:", teamsErr);
    }

    // 2. If user entered a progress note or attached a file, send comment API
      if (newComment.trim() || (photoFileInput && photoFileInput.files && photoFileInput.files.length > 0)) {
        try {
          const fileToUpload = (photoFileInput && photoFileInput.files.length > 0) ? photoFileInput.files[0] : null;
          await WorkWizeAPI.addComment(rawJobId, newComment, fileToUpload);
        } catch (commentErr) {
          console.warn("addComment error:", commentErr);
        }
      }
    }

    // 3. Update local database cache
    if (typeof WorkWizeDB !== "undefined") {
      WorkWizeDB.updateJob(rawJobId, {
        status: normalizeStatusString(jobStatus),
        priority: normalizePriorityString(priority),
        assignedTo: assignedText,
        teams: selectedAssignees.map(a => ({ teamID: a.id, teamName: a.name })),
        owner_comment: ownerCommentVal,
        expectedDate: expectedCompletion,
        refNo: refNum,
        area: areaName,
        location: jobLocation,
        villaNumber: villaNumber,
        details: jobDetail,
        remarks: remarks,
        budget: Number(budget || 0)
      });
    }

    showToast("Job order updated successfully!", "success");

    // Redirect back to clean read-only details page
    setTimeout(() => {
      window.location.href = `job-details.html?id=${encodeURIComponent(rawJobId)}`;
    }, 900);

  } catch (error) {
    console.error("Error saving job updates:", error);
    showToast("Failed to save changes. Please try again.", "error");
    if (saveBtn) saveBtn.disabled = false;
    if (saveBtnText) saveBtnText.textContent = "Save Changes";
  }
}

// ==========================================
// Helpers
// ==========================================
function setSelectValue(id, val) {
  const el = document.getElementById(id);
  if (!el || !val) return;
  for (let i = 0; i < el.options.length; i++) {
    if (el.options[i].value.toUpperCase() === String(val).toUpperCase()) {
      el.selectedIndex = i;
      return;
    }
  }
  // Try text match if value didn't match
  for (let i = 0; i < el.options.length; i++) {
    if (el.options[i].text.toUpperCase() === String(val).toUpperCase()) {
      el.selectedIndex = i;
      return;
    }
  }
}

function setInputValue(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val !== undefined && val !== null ? val : "";
}

function mapToStatusValue(st) {
  if (!st) return "IN_PROGRESS";
  const s = String(st).toUpperCase();
  if (s.includes("YET") || s.includes("COMMENCE")) return "YET_TO_COMMENCE";
  if (s.includes("PROGRESS")) return "IN_PROGRESS";
  if (s.includes("DISCUSSION")) return "UNDER_DISCUSSION";
  if (s.includes("SPARES") || s.includes("ORDER")) return "SPARES_ON_ORDER";
  if (s.includes("FIX")) return "FIXED";
  if (s.includes("CLOSE") || s.includes("COMPLET")) return "COMPLETED";
  return "IN_PROGRESS";
}

function mapToPriorityValue(p) {
  if (!p) return "MEDIUM";
  const s = String(p).toUpperCase();
  if (s.includes("HIGH")) return "HIGH";
  if (s.includes("LOW")) return "LOW";
  if (s.includes("SAFETY")) return "SAFETY";
  return "MEDIUM";
}

function formatDateForInput(d) {
  if (!d || d === "-" || d === "null") return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return "";
    return dt.toISOString().split("T")[0];
  } catch (e) {
    return "";
  }
}

function formatDate(d) {
  if (!d || d === "-" || d === "null") return "-";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch (e) {
    return d;
  }
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
