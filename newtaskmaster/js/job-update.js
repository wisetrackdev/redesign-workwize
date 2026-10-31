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

  if (!currentJobId) {
    currentJobId = localStorage.getItem("workwize_last_job_id") || "";
  } else {
    localStorage.setItem("workwize_last_job_id", currentJobId);
  }

  if (!currentJobId) {
    alert("No Job ID specified to edit.");
    window.location.href = "all-jobs.html";
    return;
  }

  // Set navigation links
  setupNavigationLinks(currentJobId);

  // Load existing job details into form
  await loadJobForEditing(currentJobId);

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
  let loaded = false;

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
            (j.jobId && j.jobId.toLowerCase() === jobId.toLowerCase()) || 
            (j.orgjobId && j.orgjobId.toLowerCase() === jobId.toLowerCase())
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
      (j.id && j.id.toLowerCase() === jobId.toLowerCase()) || 
      (j.refNo && j.refNo.toLowerCase() === jobId.toLowerCase())
    );

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

  if (!loaded) {
    const displayId = document.getElementById("updateJobDisplayId");
    if (displayId) displayId.textContent = "Job Not Found";
    showToast("Could not retrieve job data to edit.", "error");
  }
}

function populateEditForm(data) {
  const displayId = data.orgjobId || data.jobId || currentJobId;

  // Header reference fields
  const displayIdEl = document.getElementById("updateJobDisplayId");
  const propNameEl = document.getElementById("updateJobPropName");
  const createdDateEl = document.getElementById("updateJobCreatedDate");
  const statusBadge = document.getElementById("updateCurrentStatusBadge");
  const priorityBadge = document.getElementById("updateCurrentPriorityBadge");

  if (displayIdEl) displayIdEl.textContent = displayId;
  if (propNameEl) propNameEl.textContent = data.propName || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentPropertyName() : "Facility");
  if (createdDateEl) createdDateEl.textContent = `Created ${formatDate(data.jobCreatedOn || data.createdOn)}`;

  // Header badges
  const normStatus = normalizeStatusString(data.jobStatus || data.status);
  const normPriority = normalizePriorityString(data.priority);
  if (statusBadge) statusBadge.textContent = normStatus;
  if (priorityBadge) priorityBadge.textContent = normPriority;

  // Form Fields
  setSelectValue("editJobStatus", mapToStatusValue(data.jobStatus || data.status));
  setSelectValue("editJobPriority", mapToPriorityValue(data.priority));
  
  // Assigned to
  let assignedValue = "Facilities Team";
  if (Array.isArray(data.teams) && data.teams.length > 0) {
    assignedValue = data.teams[0].teamName || data.teams[0].name || data.teams[0];
  } else if (data.assignedTo) {
    assignedValue = data.assignedTo;
  }
  setSelectValue("editAssignedTo", assignedValue);

  // Dates & strings
  setInputValue("editExpectedCompletion", formatDateForInput(data.expectedCompletion || data.expectedDate));
  setInputValue("editRefNum", data.refNum || "");
  setSelectValue("editAreaName", data.areaName || data.area || "Development/Project");
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
    const assignedTo = document.getElementById("editAssignedTo").value;
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
    formData.append("assignedTo", assignedTo);

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
        assignedTo: assignedTo,
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
