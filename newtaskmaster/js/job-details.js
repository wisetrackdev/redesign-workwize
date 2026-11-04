/**
 * WorkWize Job Details View Logic
 * Pure read-only presentation connected to WorkWizeAPI
 */

let currentJobId = "";
let currentJobData = null;

document.addEventListener("DOMContentLoaded", function () {
  // Extract job ID from URL parameter (supports both ?id= and ?jobid=)
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

  // Init Image Preview Backdrop listener
  initImagePreviewModal();

  // Initial load
  loadJobDetails(currentJobId);
});

async function loadJobDetails(jobId) {
  setLoadingState(true);

  let loaded = false;

  // 1. Try Live API (api/jobtracker/getjobbyid)
  if (typeof WorkWizeAPI !== "undefined" && jobId) {
    try {
      const res = await WorkWizeAPI.getJobById(jobId);
      if (res && res.success && res.jobdata) {
        currentJobData = res.jobdata;
        renderJobDetails(res.jobdata);
        loaded = true;
      }
    } catch (err) {
      console.warn("API getJobById error, will try property jobs search:", err);
    }

    // 1b. If single getJobById didn't find it, check in property jobs
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
            renderJobDetails(matched);
            loaded = true;
          }
        }
      } catch (e) {
        console.warn("Property jobs lookup failed:", e);
      }
    }
  }

  // 2. Fallback to local database if API not available or job not found on server
  if (!loaded) {
    if (typeof WorkWizeDB !== "undefined") {
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
          areaName: localJob.area || "General Area",
          villaNumber: localJob.villaNumber || "-",
          jobLocation: localJob.location || "Main Building",
          priority: (localJob.priority || "MEDIUM").toUpperCase(),
          jobStatus: (localJob.status || "IN_PROGRESS").toUpperCase().replace(/\s+/g, '_'),
          jobCreatedOn: localJob.openedOn || new Date().toISOString().split("T")[0],
          expectedCompletion: localJob.expectedDate || "-",
          refNum: localJob.refNo || "-",
          budget: localJob.budget || 0,
          finalExp: 0,
          jobDetail: localJob.details || localJob.description || "Operational job order",
          remarks: localJob.remarks || "",
          teams: localJob.assignedTo ? [localJob.assignedTo] : ["Facilities Team"],
          comments: Array.isArray(localJob.comments) ? localJob.comments : [],
          uploads: localJob.uploads || localJob.imageUploads || localJob.images || localJob.attachments || localJob.propImages || [],
          createdBy: localJob.createdBy || localJob.userId || localJob.creator || localJob.firstname || "-",
          userId: localJob.userId || localJob.createdBy || "",
          firstname: localJob.firstname || "",
          lastname: localJob.lastname || ""
        };
        renderJobDetails(currentJobData);
        loaded = true;
      }
    }
  }

  setLoadingState(false);

  if (!loaded) {
    const orgIdEl = document.getElementById("dynJobOrgId");
    if (orgIdEl) orgIdEl.textContent = "Job Not Found";
    const detailTextEl = document.getElementById("dynJobDetailText");
    if (detailTextEl) {
      detailTextEl.innerHTML = `<span class="text-rose-500 font-medium">Unable to locate job #${escapeHtml(jobId || 'Unknown')}. It may have been removed or you may have switched properties.</span>`;
    }
  }
}

function renderJobDetails(data) {
  const displayId = data.orgjobId || data.jobId || currentJobId || "Job Details";
  const rawJobId = data.jobId || data.orgjobId || currentJobId;
  const isClosed = data.isActive === false || 
                   Boolean(data.jobCloseOn) || 
                   (data.jobStatus && String(data.jobStatus).toUpperCase().includes("CLOSE")) ||
                   (data.status && String(data.status).toUpperCase().includes("CLOSE"));

  // 1. Breadcrumbs & Org ID
  const breadcrumbEl = document.getElementById("dynJobBreadcrumbId");
  const orgIdEl = document.getElementById("dynJobOrgId");
  const backToJobsBtn = document.getElementById("backToJobsBtn");
  if (breadcrumbEl) breadcrumbEl.textContent = displayId;
  if (orgIdEl) {
    orgIdEl.textContent = displayId;
    if (isClosed) {
      orgIdEl.className = "px-3.5 py-1 bg-emerald-600 text-white rounded-xl text-base sm:text-lg font-extrabold tracking-wide shadow-xs inline-flex items-center";
    } else {
      orgIdEl.className = "px-3.5 py-1 bg-blue-600 text-white rounded-xl text-base sm:text-lg font-extrabold tracking-wide shadow-xs inline-flex items-center";
    }
  }

  // 2. Set Up "Update Job" buttons and store job data for instant edit
  const updateUrl = `job-update.html?id=${encodeURIComponent(rawJobId)}`;
  const heroUpdateBtn = document.getElementById("heroUpdateJobBtn");
  const bottomUpdateBtn = document.getElementById("bottomUpdateJobBtn");

  // If job is closed, hide the "Update Job" buttons & update sidebar highlight
  if (isClosed) {
    if (heroUpdateBtn) heroUpdateBtn.classList.add("hidden");
    if (bottomUpdateBtn) bottomUpdateBtn.classList.add("hidden");
    if (backToJobsBtn) {
      backToJobsBtn.href = "closed-jobs.html";
      backToJobsBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Back to Closed Jobs';
    }
    const closedTab = document.getElementById("headerNavClosedJobs");
    const allJobsTab = document.getElementById("headerNavAllJobs");
    if (closedTab && allJobsTab) {
      allJobsTab.classList.remove("on", "active");
      closedTab.classList.add("on", "active");
    }
  } else {
    if (heroUpdateBtn) {
      heroUpdateBtn.classList.remove("hidden");
      heroUpdateBtn.href = updateUrl;
    }
    if (bottomUpdateBtn) {
      bottomUpdateBtn.classList.remove("hidden");
      bottomUpdateBtn.href = updateUrl;
    }
    const closedTab = document.getElementById("headerNavClosedJobs");
    const allJobsTab = document.getElementById("headerNavAllJobs");
    if (closedTab && allJobsTab && !(document.referrer && (document.referrer.includes("job-by-area.html") || document.referrer.includes("jobs.html")))) {
      closedTab.classList.remove("on", "active");
      allJobsTab.classList.add("on", "active");
    }
  }

  try {
    sessionStorage.setItem("workwize_current_job_data", JSON.stringify(data));
    localStorage.setItem("workwize_last_job_data", JSON.stringify(data));
    localStorage.setItem("workwize_last_job_id", rawJobId);
  } catch (e) {}

  const onUpdateClick = () => {
    try {
      sessionStorage.setItem("workwize_current_job_data", JSON.stringify(currentJobData || data));
      localStorage.setItem("workwize_last_job_data", JSON.stringify(currentJobData || data));
      localStorage.setItem("workwize_last_job_id", rawJobId);
    } catch (e) {}
  };
  if (heroUpdateBtn) heroUpdateBtn.onclick = onUpdateClick;
  if (bottomUpdateBtn) bottomUpdateBtn.onclick = onUpdateClick;

  // 3. Active / Closed Badge
  const activeBadge = document.getElementById("dynJobActiveBadge");
  const closedInfo = document.getElementById("closedInfoContainer");

  if (activeBadge) {
    if (isClosed) {
      activeBadge.className = "badge-status badge-closed text-xs font-bold px-3 py-1 rounded-full";
      activeBadge.innerHTML = '<i class="fa-solid fa-circle-check text-[10px] mr-1"></i> Closed';
    } else {
      activeBadge.className = "badge-status badge-yet-to-commence text-xs font-bold px-3 py-1 rounded-full";
      activeBadge.innerHTML = '<i class="fa-solid fa-circle-dot text-[10px] mr-1"></i> Active Job';
    }
  }

  if (isClosed) {
    if (closedInfo) {
      closedInfo.classList.remove("hidden");
      const closedOnEl = document.getElementById("dynJobClosedOn");
      const closedByEl = document.getElementById("dynJobClosedBy");
      if (closedOnEl) closedOnEl.textContent = formatDate(data.jobCloseOn || data.closeDate);
      if (closedByEl) closedByEl.textContent = data.jobCloseBy || data.closedBy || "Authorized Officer";
    }
  } else {
    if (closedInfo) closedInfo.classList.add("hidden");
  }

  // 4. Status Badge
  const normStatus = normalizeStatusString(data.jobStatus || data.status);
  let statusCls = "badge-in-progress";
  if (isClosed || normStatus === "Closed") statusCls = "badge-closed";
  else if (normStatus === "Yet to Commence") statusCls = "badge-yet-to-commence";
  else if (normStatus === "Under Discussion") statusCls = "badge-under-discussion";
  else if (normStatus === "Spares on Order") statusCls = "badge-spares-on-order";
  else if (normStatus === "Fixed") statusCls = "badge-open";

  const statusEl = document.getElementById("dynJobStatus");
  if (statusEl) {
    statusEl.className = `badge-status ${statusCls} text-xs font-bold px-3 py-1 rounded-full`;
    statusEl.textContent = normStatus;
  }

  const viewStatusText = document.getElementById("viewJobStatusText");
  const viewStatusBadge = document.getElementById("viewJobStatusBadge");
  if (viewStatusText) viewStatusText.textContent = normStatus;
  if (viewStatusBadge) {
    viewStatusBadge.className = `badge-status ${statusCls} text-xs font-bold px-3 py-0.5 rounded-full`;
    viewStatusBadge.textContent = normStatus;
  }

  // 5. Priority Badge
  const normPriority = normalizePriorityString(data.priority);
  let priorityCls = "badge-priority-medium";
  if (normPriority.toLowerCase() === "high") priorityCls = "badge-priority-high";
  else if (normPriority.toLowerCase() === "low") priorityCls = "badge-priority-low";
  else if (normPriority.toLowerCase() === "safety") priorityCls = "badge-priority-safety";

  const priorityEl = document.getElementById("dynJobPriority");
  if (priorityEl) {
    priorityEl.className = `badge-priority ${priorityCls} text-xs font-bold px-3 py-1 rounded-full`;
    priorityEl.textContent = normPriority;
  }

  const viewPriorityText = document.getElementById("viewJobPriorityText");
  const viewPriorityBadge = document.getElementById("viewJobPriorityBadge");
  if (viewPriorityText) viewPriorityText.textContent = `${normPriority} Priority`;
  if (viewPriorityBadge) {
    viewPriorityBadge.className = `badge-priority ${priorityCls} text-xs font-bold px-3 py-0.5 rounded-full`;
    viewPriorityBadge.textContent = normPriority;
  }

  // 6. Header Area & Property Pills
  const areaTitleEl = document.getElementById("dynJobAreaTitle");
  const propTitleEl = document.getElementById("dynJobPropTitle");
  if (areaTitleEl) {
    areaTitleEl.innerHTML = `<i class="fa-solid fa-layer-group text-blue-500"></i> ${escapeHtml(data.areaName || data.area || "Facility Area")}`;
  }
  if (propTitleEl) {
    const propNameStr = data.propName || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentPropertyName() : "Property");
    propTitleEl.innerHTML = `<i class="fa-solid fa-hotel text-slate-400"></i> ${escapeHtml(propNameStr)}`;
  }

  // 7. Details / Scope Card
  const detailTextEl = document.getElementById("dynJobDetailText");
  if (detailTextEl) {
    const rawDetail = data.jobDetail || data.details || data.description || "No specific details provided for this job order.";
    detailTextEl.innerHTML = renderRichText(rawDetail);
  }

  // 8. Key Attributes Grid
  const propNameEl = document.getElementById("dynJobPropName");
  const areaNameEl = document.getElementById("dynJobAreaName");
  const villaBadge = document.getElementById("dynJobVillaBadge");
  const locationEl = document.getElementById("dynJobLocation");
  const createdOnEl = document.getElementById("dynJobCreatedOn");
  const expectedEl = document.getElementById("dynJobExpected");
  const refNumEl = document.getElementById("dynJobRefNum");

  if (propNameEl) propNameEl.textContent = data.propName || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentPropertyName() : "-");
  if (areaNameEl) areaNameEl.textContent = data.areaName || data.area || "-";
  
  if (villaBadge) {
    if (data.villaNumber && data.villaNumber !== "-" && data.villaNumber !== "null") {
      villaBadge.textContent = `Villa: ${data.villaNumber}`;
      villaBadge.classList.remove("hidden");
    } else {
      villaBadge.classList.add("hidden");
    }
  }

  const villaDisplay = document.getElementById("dynJobVillaDisplay");
  if (villaDisplay) {
    if (data.villaNumber && data.villaNumber !== "-" && data.villaNumber !== "null" && data.villaNumber !== "N/A") {
      villaDisplay.innerHTML = `<span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">Villa ${escapeHtml(data.villaNumber)}</span>`;
    } else {
      villaDisplay.textContent = "-";
    }
  }

  if (locationEl) locationEl.textContent = data.jobLocation || data.location || "-";
  if (createdOnEl) createdOnEl.textContent = formatDate(data.jobCreatedOn || data.createdOn);
  if (expectedEl) {
    const rawExpected = (data.expectedCompletion || data.expectedDate || "").trim();
    const isInvalid = !rawExpected || rawExpected === "TBD" || rawExpected === "-" || rawExpected === "null" || rawExpected.startsWith("0001-01-01") || rawExpected.startsWith("1970-01-01");
    expectedEl.textContent = isInvalid ? "-" : formatDate(rawExpected);
  }
  if (refNumEl) { const r = (data.refNum || data.refNo || "").trim(); refNumEl.textContent = (r && r !== "null" && r !== "N/A" && r !== "-") ? r : "-"; }

  // Created By Reference (Ensure a valid creator name or Admin is always displayed)
  let creator = "";
  if (data.createdBy && data.createdBy !== "-" && data.createdBy !== "null" && data.createdBy !== "undefined") {
    creator = data.createdBy;
  } else if (data.firstname || data.lastname || data.Firstname || data.Lastname) {
    creator = `${data.firstname || data.Firstname || ""} ${data.lastname || data.Lastname || ""}`.trim();
  } else if (data.userId && data.userId !== "null" && data.userId !== "-" && data.userId !== "undefined") {
    creator = data.userId;
  } else if (data.creator && data.creator !== "-" && data.creator !== "null" && data.creator !== "undefined") {
    creator = data.creator;
  } else if (data.created_by && data.created_by !== "-" && data.created_by !== "null" && data.created_by !== "undefined") {
    creator = data.created_by;
  }

  // Fallback 1: Try cached job from sessionStorage or localStorage (only if matching current job)
  if (!creator || creator === "-") {
    try {
      const cached = JSON.parse(sessionStorage.getItem("workwize_current_job_data") || localStorage.getItem("workwize_last_job_data") || "null");
      if (cached && (cached.id === rawJobId || cached.jobId === rawJobId || cached.orgjobId === rawJobId || cached.rawId === rawJobId)) {
        if (cached.createdBy && cached.createdBy !== "-") creator = cached.createdBy;
        else if (cached.firstname || cached.lastname) creator = `${cached.firstname || ""} ${cached.lastname || ""}`.trim();
        else if (cached.userId) creator = cached.userId;
        else if (cached.creator) creator = cached.creator;
      }
    } catch (_) {}
  }

  // Fallback 2: Try comments timeline author
  if (!creator || creator === "-") {
    if (Array.isArray(data.comments) && data.comments.length > 0) {
      const c = data.comments[0];
      if (c && (c.firstName || c.lastName)) creator = `${c.firstName || ""} ${c.lastName || ""}`.trim();
    }
  }

  // Fallback 3: Default to "Admin" if no creator specified in job data (Never use current logged-in user)
  if (!creator || creator === "-") {
    creator = "Admin";
  }

  const createdByEl = document.getElementById("dynJobCreatedBy");
  if (createdByEl) createdByEl.textContent = creator;

  const closedByWrapper = document.getElementById("dynJobClosedByWrapper");
  const closedByHeader = document.getElementById("dynJobClosedByHeader");
  if (isClosed) {
    if (closedByWrapper) closedByWrapper.classList.remove("hidden");
    if (closedByHeader) closedByHeader.textContent = data.jobCloseBy || data.closedBy || "Authorized Officer";
  } else {
    if (closedByWrapper) closedByWrapper.classList.add("hidden");
  }

  // 9. Remarks Card
  const remarksCard = document.getElementById("remarksCard");
  const remarksText = document.getElementById("dynJobRemarks");
  if (remarksCard && remarksText) {
    if (data.remarks && String(data.remarks).trim().length > 0 && data.remarks !== "null") {
      remarksCard.classList.remove("hidden");
      remarksText.innerHTML = renderRichText(data.remarks);
    } else {
      remarksCard.classList.add("hidden");
    }
  }

  // 10. Owner's Comment Card & History Tracker
  const ownerCard = document.getElementById("ownerCommentCard");
  const ownerText = document.getElementById("dynJobOwnerComment");
  const ownerHistoryContainer = document.getElementById("dynOwnerCommentHistoryContainer");
  const ownerHistoryList = document.getElementById("dynOwnerCommentHistoryList");
  const ownerCountBadge = document.getElementById("dynOwnerCommentsCount");
  const btnEditOwnerCommentText = document.getElementById("btnEditOwnerCommentText");

  if (ownerCard && ownerText) {
    const allOwnerComments = [];

    if (Array.isArray(data.owner_comments_history)) {
      data.owner_comments_history.forEach(h => {
        const text = (h.commentDetail || h.commentText || h.comment || "").trim();
        if (text && !allOwnerComments.some(c => c.commentDetail === text && c.commentDate === h.commentDate)) {
          allOwnerComments.push({
            commentDetail: text,
            commentDate: h.commentDate || "",
            author: h.firstName ? `${h.firstName} ${h.lastName || ""}`.trim() : "Owner"
          });
        }
      });
    }

    if (Array.isArray(data.comments)) {
      data.comments.forEach(c => {
        if (c && c.commentId && String(c.commentId).startsWith("OWNERCOMMENT")) {
          const text = (c.commentDetail || c.commentText || c.comment || "").trim();
          if (text && !allOwnerComments.some(item => item.commentDetail === text && item.commentDate === c.commentDate)) {
            allOwnerComments.push({
              commentDetail: text,
              commentDate: c.commentDate || "",
              author: c.firstName ? `${c.firstName} ${c.lastName || ""}`.trim() : "Owner"
            });
          }
        }
      });
    }

    const directOwnerComment = (data.owner_comment || "").trim();
    if (directOwnerComment && !allOwnerComments.some(c => c.commentDetail === directOwnerComment)) {
      allOwnerComments.unshift({
        commentDetail: directOwnerComment,
        commentDate: data.jobDate || data.jobCreatedOn || new Date().toISOString(),
        author: "Owner"
      });
    }

    // Sort newest comments first
    allOwnerComments.sort((a, b) => {
      const timeA = a.commentDate ? new Date(a.commentDate).getTime() : 0;
      const timeB = b.commentDate ? new Date(b.commentDate).getTime() : 0;
      return timeB - timeA;
    });

    if (allOwnerComments.length === 0) {
      if (ownerCountBadge) ownerCountBadge.textContent = "0";
      ownerText.className = "w-full text-xs text-purple-950 bg-white/80 border border-purple-200/80 rounded-xl p-3.5 leading-relaxed";
      ownerText.innerHTML = `<span class="text-slate-400 italic">No owner comment recorded yet.</span>`;
      if (ownerHistoryContainer) ownerHistoryContainer.classList.add("hidden");
    } else {
      if (ownerCountBadge) ownerCountBadge.textContent = allOwnerComments.length;
      
      // Store latest comment on data for instant pre-fill in update page
      data.owner_comment = allOwnerComments[0].commentDetail;
      
      // Container with max-height for 5 comments, followed by scrollbar
      ownerText.className = "space-y-2 max-h-[350px] overflow-y-auto pr-1";
      ownerText.innerHTML = allOwnerComments.map((c, idx) => `
        <div class="p-3 rounded-xl bg-white border border-purple-200/80 text-xs text-purple-950 shadow-2xs">
          <div class="flex items-center justify-between text-[10px] text-purple-600 font-semibold mb-1 pb-1 border-b border-purple-100/80">
            <span class="flex items-center gap-1 font-medium text-purple-700">
              <i class="fa-solid fa-clock-rotate-left text-[9px]"></i>
              <span>Comment #${allOwnerComments.length - idx}</span><span class="text-slate-400 text-[10px] font-normal ml-1">by ${escapeHtml(c.author || 'Owner')}</span>
              ${idx === 0 ? '<span class="px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 text-[9px] font-bold ml-1">Latest</span>' : ''}
            </span>
            <span class="text-slate-500 font-semibold text-[10px] flex items-center gap-1"><i class="fa-regular fa-clock text-purple-500 text-[9px]"></i>${formatMaldivesDateTime(c.commentDate)}</span>
          </div>
          <div class="whitespace-pre-wrap leading-relaxed text-slate-800 pt-0.5">${escapeHtml(c.commentDetail)}</div>
        </div>
      `).join("");

      if (ownerHistoryContainer) ownerHistoryContainer.classList.add("hidden");
    }
  }

  // Point 14: Show Delete button for Super Admin
  const deleteBtn = document.getElementById("detailDeleteJobBtn");
  if (deleteBtn) {
    const role = (typeof UserSession !== "undefined" && UserSession.getUserRole) ? UserSession.getUserRole().toUpperCase() : "";
    if (role.includes("SUPERADMIN") || role.includes("SUPER ADMIN")) {
      deleteBtn.classList.remove("hidden");
    } else {
      deleteBtn.classList.add("hidden");
    }
  }

  // Point 8: Atmosphere Admin View-Only Mode Across Resorts
  applyAtmosphereAdminViewOnlyMode();

  // 11. Assigned Team / Assign To (Multiple badge support)
  const assignedListEl = document.getElementById("dynJobAssignedList");
  if (assignedListEl) {
    let teamList = [];
    if (Array.isArray(data.teams) && data.teams.length > 0) {
      teamList = data.teams.map(t => (typeof t === "object") ? (t.teamName || t.name) : t);
    } else if (Array.isArray(data.data1) && data.data1.length > 0) {
      teamList = data.data1.map(t => (typeof t === "object") ? (t.teamName || t.name) : t);
    } else if (data.assignedTo) {
      teamList = data.assignedTo.split(",").map(s => s.trim()).filter(Boolean);
    }

    // Attach exact displayed assignees to cached data so update page pre-selects identical assignees
    data._detailAssignees = teamList;
    try {
      sessionStorage.setItem("workwize_current_job_data", JSON.stringify(data));
      localStorage.setItem("workwize_last_job_data", JSON.stringify(data));
    } catch (e) {}

    if (teamList.length === 0) {
      assignedListEl.innerHTML = `
        <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold shrink-0">
          <i class="fa-solid fa-user-slash"></i>
        </span>
        <span class="text-slate-400 text-xs italic">Unassigned</span>
      `;
    } else {
      assignedListEl.innerHTML = teamList.map(tm => `
        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200/80 shadow-2xs">
          <i class="fa-solid fa-user-check text-[10px] text-blue-500"></i>
          <span>${escapeHtml(tm)}</span>
        </span>
      `).join("");
    }
  }

  // 12. Financial Allocation
  const budgetEl = document.getElementById("dynJobBudget");
  const costCenterEl = document.getElementById("dynJobCostCenter");
  const ccfDeptEl = document.getElementById("dynJobCcfDept");
  const finalExpEl = document.getElementById("dynJobFinalExp");

  if (budgetEl) budgetEl.textContent = `$${Number(data.budget || 0).toLocaleString()}`;
  const costCenterVal = data.ccf || data.costCenter || "POMEC";
  const deptVal = (data.ccf_dept || data.ccfdept || data.department || data.dept || "").trim();
  if (costCenterEl) {
    if (deptVal && deptVal !== "undefined" && deptVal !== "null" && deptVal !== "-") {
      costCenterEl.innerHTML = `<div class="font-extrabold text-slate-900">${escapeHtml(costCenterVal)}</div><div class="text-[11px] font-semibold text-blue-600 mt-0.5">Dept: ${escapeHtml(deptVal)}</div>`;
    } else {
      costCenterEl.textContent = costCenterVal;
    }
  }
  if (finalExpEl) finalExpEl.textContent = `$${Number(data.finalExp || data.expense || 0).toLocaleString()}`;

  // 13. Render Photos & Attachments
  const allImages = collectAllJobImages(data);
  renderDocumentationPhotos(allImages);

  // 14. Render Comments Timeline
  renderCommentsTimeline(data.comments, data.admin_comment, data.jobCloseOn, data.jobCloseBy);
}

// ==========================================
// Image Collection & Rendering Functions
// ==========================================
function collectAllJobImages(data) {
  const list = [];
  if (!data) return list;

  function pushItems(arr, tag) {
    if (!arr) return;
    let items = [];
    if (Array.isArray(arr)) {
      items = arr;
    } else if (typeof arr === "string") {
      try {
        const parsed = JSON.parse(arr);
        if (Array.isArray(parsed)) items = parsed;
        else items = [arr];
      } catch (_) {
        if (arr.includes(",")) items = arr.split(",").map(s => s.trim()).filter(Boolean);
        else items = [arr];
      }
    } else if (typeof arr === "object") {
      items = [arr];
    }

    items.forEach((item, idx) => {
      const cleanUrl = extractImageUrl(item);
      if (cleanUrl) {
        if (!list.some(x => x.url === cleanUrl)) {
          let rawName = "";
          if (typeof item === "object" && (item.fileName || item.name || item.filename || item.FileName)) {
            rawName = item.fileName || item.name || item.filename || item.FileName;
          } else {
            rawName = cleanUrl.split("/").pop() || `${tag}_${idx + 1}.jpg`;
          }
          rawName = rawName.split("?")[0].split("#")[0];
          list.push({ url: cleanUrl, name: rawName, tag: tag });
        }
      }
    });
  }

  // 1. Process job-level image collections
  pushItems(data.uploads, "Job Photo");
  pushItems(data.imageUploads, "Job Photo");
  pushItems(data.attachments, "Attachment");
  pushItems(data.medias, "Media");
  pushItems(data.images, "Photo");
  pushItems(data.jobImages, "Job Photo");
  pushItems(data.open_uploads, "Inspection Photo");
  pushItems(data.close_uploads, "Completion Photo");

  // 2. Process comment-level attachments
  if (Array.isArray(data.comments)) {
    data.comments.forEach((c, cIdx) => {
      pushItems(c.uploads, `Comment_${cIdx + 1}`);
      pushItems(c.imageUploads, `Comment_${cIdx + 1}`);
      pushItems(c.commentMedia, `Comment_${cIdx + 1}`);
      pushItems(c.data1, `Comment_${cIdx + 1}`);
    });
  }

  return list;
}

function renderDocumentationPhotos(allPhotos) {
  const container = document.getElementById("dynJobUploads");
  const countBadge = document.getElementById("dynUploadsCount");

  if (countBadge) {
    countBadge.textContent = `${allPhotos.length} ${allPhotos.length === 1 ? 'File' : 'Files'}`;
  }

  if (container) {
    if (allPhotos.length === 0) {
      container.innerHTML = `
        <div class="col-span-2 sm:col-span-3 md:col-span-4 text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <i class="fa-regular fa-image text-slate-300 text-3xl block mb-2"></i>
          <span>No attachment photos uploaded for this job order.</span>
        </div>
      `;
      return;
    }

    const role = (typeof UserSession !== "undefined" && UserSession.getUserRole) ? UserSession.getUserRole().toUpperCase() : "";
    const canDeleteUpload = role.includes("ADMIN") || role.includes("SUPERADMIN") || role.includes("OPROADMIN");

    container.innerHTML = allPhotos.map((item, idx) => {
      const rawFileName = item.name || "Job_Photo.jpg";
      const cleanFileName = rawFileName.length > 20 ? rawFileName.slice(0, 17) + "..." : rawFileName;
      const isImg = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(rawFileName) || 
                    (item.url && (item.url.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(item.url)));
      const isPdf = /\.pdf$/i.test(rawFileName) || (item.url && /\.pdf/i.test(item.url));

      return `
        <div class="group relative rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all">
          <div 
            class="h-28 w-full overflow-hidden bg-slate-900 flex items-center justify-center relative cursor-pointer photo-preview-trigger"
            data-url="${escapeHtml(item.url)}"
            data-title="${escapeHtml(rawFileName)}"
            title="Click to view file: ${escapeHtml(rawFileName)}"
          >
            ${isImg ? `
              <img src="${escapeHtml(item.url)}" alt="${escapeHtml(cleanFileName)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'flex flex-col items-center justify-center text-slate-400 h-full\\'><i class=\\'fa-regular fa-image text-3xl mb-1 text-slate-400\\'></i><span class=\\'text-[10px] text-slate-400\\'>Photo Unavailable</span></div>';">
            ` : isPdf ? `
              <div class="flex flex-col items-center justify-center text-rose-400">
                <i class="fa-solid fa-file-pdf text-3xl mb-1"></i>
                <span class="text-[10px] text-slate-300 uppercase font-semibold">PDF Document</span>
              </div>
            ` : `
              <div class="flex flex-col items-center justify-center text-blue-400">
                <i class="fa-solid fa-file text-3xl mb-1"></i>
                <span class="text-[10px] text-slate-300 uppercase font-semibold">Attachment</span>
              </div>
            `}
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
              <span class="w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center text-xs shadow-md">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </span>
            </div>
          </div>
          <div class="p-2 border-t border-slate-100 flex items-center justify-between gap-1">
            <div class="truncate flex-1">
              <span class="text-[11px] font-semibold text-slate-800 block truncate" title="${escapeHtml(rawFileName)}">${escapeHtml(cleanFileName)}</span>
              <button type="button" class="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-0.5 photo-view-btn" data-url="${escapeHtml(item.url)}" data-title="${escapeHtml(rawFileName)}">
                <i class="fa-regular fa-eye text-[9px]"></i> View File
              </button>
            </div>
            <button 
              type="button" 
              onclick="deleteJobAttachment('${escapeHtml(rawFileName)}', '${escapeHtml(item.url)}')" 
              class="w-7 h-7 rounded-lg text-rose-500 hover:text-white hover:bg-rose-600 flex items-center justify-center transition-colors shrink-0" 
              title="Delete this image"
            >
              <i class="fa-solid fa-trash-can text-xs"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");

    // Attach click events securely to triggers
    container.querySelectorAll(".photo-preview-trigger, .photo-view-btn").forEach(el => {
      el.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        const url = this.getAttribute("data-url");
        const title = this.getAttribute("data-title");
        openImagePreview(url, title);
      });
    });
  }
}

function renderCommentsTimeline(comments, adminComment, closeOn, closeBy) {
  const container = document.getElementById("dynJobComments");
  const countBadge = document.getElementById("dynCommentsCount");
  if (!container) return;

  const timeline = [];

  // Admin closure note
  if (adminComment) {
    timeline.push({
      firstName: "ADMIN CLOSURE",
      lastName: closeBy ? `[${closeBy}]` : "",
      commentDate: closeOn || "N/A",
      commentDetail: adminComment,
      isAdminNote: true
    });
  }

  // Regular comments
  if (Array.isArray(comments)) {
    comments.forEach(c => timeline.push(c));
  }

  if (countBadge) {
    countBadge.textContent = `${timeline.length} ${timeline.length === 1 ? 'Entry' : 'Entries'}`;
  }

  if (timeline.length === 0) {
    container.innerHTML = `
      <div class="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
        <i class="fa-regular fa-comments text-slate-300 text-3xl block mb-2"></i>
        <span>No comments or activity notes recorded yet.</span>
      </div>
    `;
    return;
  }

  container.innerHTML = timeline.map(c => {
    const author = `${c.firstName || c.firstname || "User"} ${c.lastName || c.lastname || ""}`.trim();
    const dateStr = formatMaldivesDateTime(c.commentDate || c.createdOn || new Date());
    const detail = c.commentDetail || c.comment || c.text || "-";
    const isAdmin = c.isAdminNote;

    return `
      <div class="p-3.5 rounded-xl border text-xs ${isAdmin ? 'bg-emerald-50/70 border-emerald-200' : 'bg-slate-50 border-slate-200/80'}">
        <div class="flex items-center justify-between mb-1.5 flex-wrap gap-1">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full ${isAdmin ? 'bg-emerald-600 text-white' : 'bg-blue-100 text-blue-700'} flex items-center justify-center text-[10px] font-bold">
              ${isAdmin ? '<i class="fa-solid fa-lock text-[9px]"></i>' : (author ? author.slice(0, 1).toUpperCase() : 'U')}
            </span>
            <span class="font-bold text-slate-800">${escapeHtml(author)}</span>
            ${isAdmin ? '<span class="text-[10px] px-1.5 py-0.2 rounded bg-emerald-200 text-emerald-800 font-bold uppercase">Closure</span>' : ''}
          </div>
          <span class="text-[11px] text-slate-400 font-medium">${dateStr}</span>
        </div>
        <p class="text-slate-700 leading-relaxed pl-8">${escapeHtml(detail)}</p>
      </div>
    `;
  }).join("");
}

// ==========================================
// Lightbox Photo Preview Controls
// ==========================================
function openImagePreview(url, title) {
  const modal = document.getElementById("imagePreviewModal");
  const imgEl = document.getElementById("previewModalImg");
  const titleEl = document.getElementById("previewModalTitle");
  const captionEl = document.getElementById("previewModalCaption");
  const downloadBtn = document.getElementById("previewModalDownloadBtn");

  if (!modal || !imgEl) return;

  imgEl.src = url;
  imgEl.onerror = function() {
    this.onerror = null;
    this.style.display = "none";
  };
  if (titleEl) titleEl.textContent = title || "Job Photo Preview";
  if (captionEl) captionEl.textContent = title || "WorkWize Attachment";
  if (downloadBtn) {
    downloadBtn.href = url;
    downloadBtn.download = title || "job_attachment";
  }

  // Open modal using .open class (required by style.css .modal-backdrop.open)
  modal.classList.add("open");
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeImagePreview() {
  const modal = document.getElementById("imagePreviewModal");
  if (!modal) return;
  modal.classList.remove("open");
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

function initImagePreviewModal() {
  const modal = document.getElementById("imagePreviewModal");
  if (!modal) return;

  // Backdrop click to close preview
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeImagePreview();
    }
  });
}

document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeImagePreview();
  }
});

// ==========================================
// Utilities
// ==========================================
function normalizeImageUrl(img) {
  if (!img) return "";
  if (typeof img !== "string") return "";
  img = img.trim();
  if (!img) return "";

  // Absolute URLs or data/blob URIs
  if (img.startsWith("http://") || img.startsWith("https://") || img.startsWith("data:") || img.startsWith("blob:")) {
    return img;
  }

  const base = typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getBaseUrl().replace(/\/$/, "") : "";

  // If path already contains tempdata or uploads
  if (img.toLowerCase().includes("tempdata/") || img.toLowerCase().includes("uploads/")) {
    return `${base}/${img.replace(/^\//, "")}`;
  }

  // If it's a standalone filename (e.g. "image_123.jpg")
  if (!img.includes("/") && !img.includes("\\")) {
    return `${base}/tempdata/uploads/${img}`;
  }

  return `${base}/${img.replace(/^\//, "")}`;
}

function extractImageUrl(item) {
  if (!item) return "";
  if (typeof item === "string") return normalizeImageUrl(item);
  if (typeof item === "object") {
    if (typeof File !== "undefined" && item instanceof File) {
      try {
        return URL.createObjectURL(item);
      } catch (_) {}
    }
    const val = item.url || item.fileurl || item.fileUrl || item.Fileurl ||
                item.fileName || item.filename || item.FileName ||
                item.filepath || item.filePath || item.FilePath ||
                item.mediaPath || item.image || item.src || item.preview || item.data || "";
    return normalizeImageUrl(val);
  }
  return "";
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

function formatMaldivesDateTime(d) {
  if (!d || d === "-" || d === "null" || d === "undefined") return "-";
  try {
    let s = String(d).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const parts = s.split("-");
      const dt = new Date(parts[0], parts[1] - 1, parts[2]);
      return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
    }
    let utcMs;
    if (d instanceof Date) {
      utcMs = d.getTime();
    } else if (s.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(s)) {
      utcMs = new Date(s).getTime();
    } else {
      const clean = s.replace(" ", "T");
      utcMs = new Date(clean + "+05:30").getTime();
    }
    if (isNaN(utcMs)) return s;
    const maldivesDate = new Date(utcMs + (5 * 60 * 60 * 1000));
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const month = months[maldivesDate.getUTCMonth()];
    const day = maldivesDate.getUTCDate();
    const year = maldivesDate.getUTCFullYear();
    let hours = maldivesDate.getUTCHours();
    const minutes = String(maldivesDate.getUTCMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = String(hours).padStart(2, "0");
    return `${month} ${day}, ${year}, ${hoursStr}:${minutes} ${ampm}`;
  } catch (e) {
    return String(d);
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
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function setLoadingState(isLoading) {
  const orgIdEl = document.getElementById("dynJobOrgId");
  if (isLoading && orgIdEl) {
    orgIdEl.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-blue-600 text-xl mr-2"></i> Loading Job...';
  }
}

// Export for inline triggers
window.openImagePreview = openImagePreview;
window.closeImagePreview = closeImagePreview;

// ==========================================
// Point 7: Job Status Permissions
// Only assigned team (or SuperAdmin/Admin) can change status
// ==========================================
function canUserChangeStatus(jobData) {
  if (!jobData) return true;
  const role = (typeof UserSession !== "undefined" && UserSession.getUserRole) ? UserSession.getUserRole().toUpperCase() : "";
  if (role.includes("SUPERADMIN") || role.includes("ADMIN") || role.includes("OPROADMIN")) {
    return true;
  }
  const user = (typeof UserSession !== "undefined" && UserSession.getUser) ? UserSession.getUser() : null;
  const userEmail = (user?.email || user?.userName || "").toLowerCase();

  if (Array.isArray(jobData.data1)) {
    if (jobData.data1.some(m => (m.userid || m.userId || m.email || "").toLowerCase() === userEmail)) {
      return true;
    }
  }
  if (Array.isArray(jobData.teams)) {
    if (jobData.teams.some(m => (m.userid || m.userId || m.email || "").toLowerCase() === userEmail)) {
      return true;
    }
  }
  return false;
}

// ==========================================
// Point 8: Atmosphere Admin View-Only Mode Across Resorts
// ==========================================
function applyAtmosphereAdminViewOnlyMode() {
  const role = (typeof UserSession !== "undefined" && UserSession.getUserRole) ? UserSession.getUserRole().toUpperCase() : "";
  const isAtmosphereAdmin = role.includes("ATMOSPHERE") || role === "ATMOSPHERE_ADMIN" || role === "ATMOSPHERE ADMIN";

  if (isAtmosphereAdmin) {
    const heroBtn = document.getElementById("heroUpdateJobBtn");
    const bottomBtn = document.getElementById("bottomUpdateJobBtn");
    const deleteBtn = document.getElementById("detailDeleteJobBtn");
    if (heroBtn) heroBtn.classList.add("hidden");
    if (bottomBtn) bottomBtn.classList.add("hidden");
    if (deleteBtn) deleteBtn.classList.add("hidden");

    if (!document.getElementById("atmosphereAdminBadge")) {
      const titleWrap = document.querySelector("#dynJobOrgId")?.parentElement;
      if (titleWrap) {
        const badge = document.createElement("span");
        badge.id = "atmosphereAdminBadge";
        badge.className = "px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1";
        badge.innerHTML = '<i class="fa-solid fa-eye text-xs"></i> Atmosphere Admin (View-Only Mode)';
        titleWrap.appendChild(badge);
      }
    }
  }
}

// ==========================================
// Point 13: Delete Uploaded Attachments
// ==========================================
// Helper to remove deleted image from local model and update UI immediately
function removeImageFromClientState(cleanFileName, fileUrl) {
  if (currentJobData) {
    if (Array.isArray(currentJobData.uploads)) {
      currentJobData.uploads = currentJobData.uploads.filter(u => u !== fileUrl && !String(u).includes(cleanFileName));
    }
    if (Array.isArray(currentJobData.imageUploads)) {
      currentJobData.imageUploads = currentJobData.imageUploads.filter(u => {
        const fn = (typeof u === "object") ? (u.fileName || u.name || u.url) : u;
        return fn !== fileUrl && !String(fn).includes(cleanFileName);
      });
    }
    if (Array.isArray(currentJobData.attachments)) {
      currentJobData.attachments = currentJobData.attachments.filter(u => u !== fileUrl && !String(u).includes(cleanFileName));
    }
    if (Array.isArray(currentJobData.comments)) {
      currentJobData.comments.forEach(c => {
        if (Array.isArray(c.uploads)) c.uploads = c.uploads.filter(u => u !== fileUrl && !String(u).includes(cleanFileName));
        if (Array.isArray(c.imageUploads)) c.imageUploads = c.imageUploads.filter(u => u !== fileUrl && !String(u).includes(cleanFileName));
      });
    }
    try {
      sessionStorage.setItem("workwize_current_job_data", JSON.stringify(currentJobData));
    } catch (_) {}
  }
  const remainingImages = collectAllJobImages(currentJobData).filter(img => img.url !== fileUrl && img.name !== cleanFileName);
  renderDocumentationPhotos(remainingImages);
}

async function deleteJobAttachment(fileName, fileUrl) {
  const displayName = fileName || (fileUrl ? fileUrl.split("/").pop() : "this image");
  if (!confirm(`Are you sure you want to permanently delete "${displayName}"? This action cannot be undone.`)) return;

  const propId = currentJobData?.propId || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentProperty() : "");
  const cleanFileName = fileName || (fileUrl ? fileUrl.split("/").pop().split("?")[0] : "");

  // 1. If it's a local demo / data URL photo
  if (fileUrl && fileUrl.startsWith("data:")) {
    removeImageFromClientState(cleanFileName, fileUrl);
    showToast("Image removed successfully!", "success");
    return;
  }

  // 2. Call backend delete API in oproface2 (api/jobtracker/deleteupload)
  try {
    const formData = new FormData();
    formData.append("fileId", currentJobId);
    formData.append("jobId", currentJobId);
    formData.append("fileName", cleanFileName);
    formData.append("propId", propId);

    await WorkWizeAPI.request("api/jobtracker/deleteupload", {
      method: "POST",
      body: formData
    });

    removeImageFromClientState(cleanFileName, fileUrl);
    showToast("Image deleted successfully!", "success");
    await loadJobDetails(currentJobId);
  } catch (err) {
    console.warn("Delete image API warning:", err.message);
    // If remote cloud server (https://oprofase2.workarya.com/) returns 404 because backend hasn't been re-deployed there yet
    if (err.message && (err.message.includes("404") || err.message.includes("Not Found"))) {
      removeImageFromClientState(cleanFileName, fileUrl);
      showToast("Image removed from display (Backend API updated; publish to remote server to sync permanently)", "success");
    } else {
      showToast(err.message || "Failed to delete image", "error");
    }
  }
}
window.deleteJobAttachment = deleteJobAttachment;

// ==========================================
// Point 14: Super Admin Job Deletion
// ==========================================
async function deleteCurrentJob() {
  const displayId = currentJobData?.orgjobId || currentJobId;
  if (!confirm(`Are you sure you want to permanently delete Job ${displayId}? All records and attachments will be deleted.`)) return;

  try {
    const propId = currentJobData?.propId || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentProperty() : "");
    await WorkWizeAPI.request("api/jobtracker/deletejob", {
      method: "POST",
      body: {
        jobId: currentJobId,
        propId: propId
      }
    });

    showToast(`Job ${displayId} deleted successfully.`, "success");
    setTimeout(() => {
      window.location.href = "all-jobs.html";
    }, 900);
  } catch (err) {
    showToast(err.message || "Failed to delete job", "error");
  }
}
window.deleteCurrentJob = deleteCurrentJob;



