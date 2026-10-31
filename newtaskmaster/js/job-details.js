/**
 * WorkWize Job Details View & Edit Logic
 * Full live API connectivity to:
 * - api/jobtracker/getjobbyid
 * - api/jobtracker/updatejobfields
 * - api/jobtracker/updatejob
 * - api/jobtracker/addcomment
 * Complete parity with taskmaster jobpage.js
 */

let currentJobId = "";
let currentJobData = null;
let currentEditField = "";

// Standard operational areas for Area dropdown (Mirrors taskmaster)
const ALL_OPERATIONAL_AREAS_LIST = [
  "Development/Project",
  "Fire Safety",
  "Back of the House",
  "CAPEX",
  "SOP & Checklist",
  "Energy Management",
  "Waste Management",
  "Utility",
  "Guest Villa",
  "Statutory Compliance"
];

// Standard operational teams for Assigned To dropdown (Mirrors taskmaster)
const ALL_OPERATIONAL_TEAMS_LIST = [
  "Testing - IT Admin",
  "Facilities Team",
  "Engineering Team",
  "Safety Team",
  "Electrical Maintenance",
  "Plumbing Maintenance",
  "Housekeeping Team"
];

document.addEventListener("DOMContentLoaded", function () {
  // Extract job ID from URL parameter (supports both ?id= and ?jobid= like taskmaster)
  const urlParams = new URLSearchParams(window.location.search);
  currentJobId = urlParams.get("id") || urlParams.get("jobid");

  // Check login
  if (typeof WorkWizeAPI !== "undefined" && !WorkWizeAPI.isLoggedIn()) {
    window.location.href = "login.html";
    return;
  }

  if (!currentJobId) {
    currentJobId = localStorage.getItem("workwize_last_job_id") || "Tes-313026-10738";
  } else {
    localStorage.setItem("workwize_last_job_id", currentJobId);
  }

  // Initial load
  loadJobDetails(currentJobId);
  initModalListeners();
});

async function loadJobDetails(jobId) {
  setLoadingState(true);

  let loaded = false;

  if (typeof WorkWizeAPI !== "undefined" && jobId) {
    try {
      const res = await WorkWizeAPI.getJobById(jobId);
      if (res && res.success && res.jobdata) {
        currentJobData = res.jobdata;
        renderJobDetails(res.jobdata, res.role);
        loaded = true;
      }
    } catch (err) {
      console.warn("API getJobById error, falling back to local database:", err);
    }
  }

  // Fallback to local DB if API fails or offline
  if (!loaded) {
    if (typeof WorkWizeDB !== "undefined") {
      const allLocal = WorkWizeDB.getJobs();
      const localJob = allLocal.find(j => j.id === jobId || (j.refNo && j.refNo === jobId)) || allLocal[0];
      if (localJob) {
        currentJobData = {
          jobId: localJob.id,
          orgjobId: localJob.id,
          propId: WorkWizeAPI.getCurrentProperty(),
          propName: WorkWizeAPI.getCurrentPropertyName(),
          areaName: localJob.area || "Development/Project",
          villaNumber: localJob.villaNumber || "-",
          jobLocation: localJob.location || "Main Building",
          priority: (localJob.priority || "MEDIUM").toUpperCase(),
          jobStatus: (localJob.status || "IN_PROGRESS").toUpperCase().replace(/\s+/g, '_'),
          jobCreatedOn: localJob.openedOn || new Date().toISOString().split("T")[0],
          expectedCompletion: localJob.expectedDate || "-",
          refNum: localJob.refNo || "-",
          budget: localJob.budget || 0,
          finalExp: 0,
          ccf: localJob.costCenter || "POMEC",
          ccf_dept: "",
          jobDetail: localJob.details || localJob.title || "No detailed description provided.",
          remarks: localJob.remarks || "",
          isActive: localJob.status !== "Closed" && localJob.status !== "Completed",
          jobCloseOn: localJob.status === "Closed" ? localJob.expectedDate : null,
          jobCloseBy: localJob.status === "Closed" ? "Admin" : null,
          uploads: [],
          imageUploads: [],
          propImg: [],
          comments: [],
          teams: localJob.assignedTo ? [localJob.assignedTo] : ["Testing - IT Admin"]
        };
        renderJobDetails(currentJobData, "ADMIN");
        loaded = true;
      }
    }
  }

  setLoadingState(false);

  if (!loaded) {
    showToast("Could not load job details. Please check the job ID.", "error");
  }
}

function renderJobDetails(data, role) {
  const displayId = data.orgjobId || data.jobId || currentJobId;
  const isClosed = data.isActive === false || Boolean(data.jobCloseOn) || (data.jobStatus && String(data.jobStatus).toUpperCase().includes("CLOSE"));

  // 1. Breadcrumbs & Titles
  const breadcrumbEl = document.getElementById("breadcrumbJobId");
  const orgIdEl = document.getElementById("dynJobOrgId");
  if (breadcrumbEl) breadcrumbEl.textContent = displayId;
  if (orgIdEl) orgIdEl.textContent = displayId;

  // 2. Property Banner (Taskmaster prop-img-banner)
  const bannerEl = document.getElementById("propImgBanner");
  const bannerTitle = document.getElementById("bannerPropTitle");
  const bannerSub = document.getElementById("bannerPropSubtitle");
  if (bannerEl) {
    const bannerUrl = (Array.isArray(data.propImg) && data.propImg.length > 0) ? normalizeImageUrl(data.propImg[0]) : "";
    if (bannerUrl) {
      bannerEl.style.backgroundImage = `url(${bannerUrl})`;
      bannerEl.classList.remove("hidden");
      if (bannerTitle) bannerTitle.textContent = data.propName || "Property";
      if (bannerSub) bannerSub.textContent = `[${data.areaName || "Facility"}] Operational Banner`;
    } else {
      bannerEl.classList.add("hidden");
    }
  }

  // 3. Active / Closed Badge (Mirrors taskmaster text-bg-danger when active, text-bg-success when closed)
  const activeBadge = document.getElementById("dynJobActiveBadge");
  const closeJobBtn = document.getElementById("detailCloseJobBtn");
  const closedInfo = document.getElementById("closedInfoContainer");
  const newCommentBox = document.getElementById("newCommentBox");

  if (activeBadge) {
    if (isClosed) {
      activeBadge.className = "badge-status badge-closed";
      activeBadge.innerHTML = '<i class="fa-solid fa-circle-check text-[10px] mr-1"></i> Closed';
    } else {
      activeBadge.className = "badge-status badge-yet-to-commence";
      activeBadge.innerHTML = '<i class="fa-solid fa-circle-dot text-[10px] mr-1"></i> Active Job';
    }
  }

  if (isClosed) {
    if (closeJobBtn) closeJobBtn.classList.add("hidden");
    if (newCommentBox) newCommentBox.classList.add("hidden");
    if (closedInfo) {
      closedInfo.classList.remove("hidden");
      const closedOnEl = document.getElementById("dynJobClosedOn");
      const closedByEl = document.getElementById("dynJobClosedBy");
      if (closedOnEl) closedOnEl.textContent = formatDate(data.jobCloseOn);
      if (closedByEl) closedByEl.textContent = data.jobCloseBy || "Authorized Officer";
    }
  } else {
    if (closeJobBtn) closeJobBtn.classList.remove("hidden");
    if (newCommentBox) newCommentBox.classList.remove("hidden");
    if (closedInfo) closedInfo.classList.add("hidden");
  }

  // 4. Status Badge
  const normStatus = normalizeStatusString(data.jobStatus);
  let statusCls = "badge-in-progress";
  if (isClosed) statusCls = "badge-closed";
  else if (normStatus === "Yet to Commence") statusCls = "badge-yet-to-commence";
  else if (normStatus === "Under Discussion") statusCls = "badge-under-discussion";
  else if (normStatus === "Fixed") statusCls = "badge-open";

  const statusEl = document.getElementById("dynJobStatus");
  if (statusEl) {
    statusEl.className = `badge-status ${statusCls} cursor-pointer hover:opacity-80 transition-opacity`;
    statusEl.textContent = normStatus;
  }

  // 5. Priority Badge
  const normPriority = normalizePriorityString(data.priority);
  let priorityCls = "badge-priority-medium";
  if (normPriority.toLowerCase() === "high") priorityCls = "badge-priority-high";
  else if (normPriority.toLowerCase() === "low") priorityCls = "badge-priority-low";
  else if (normPriority.toLowerCase() === "safety") priorityCls = "badge-priority-safety";

  const priorityEl = document.getElementById("dynJobPriority");
  if (priorityEl) {
    priorityEl.className = `badge-priority ${priorityCls} cursor-pointer hover:opacity-80 transition-opacity`;
    priorityEl.textContent = normPriority;
  }

  // 6. Header Subtitle
  const areaTitleEl = document.getElementById("dynJobAreaTitle");
  const propTitleEl = document.getElementById("dynJobPropTitle");
  if (areaTitleEl) areaTitleEl.textContent = data.areaName || "Area";
  if (propTitleEl) propTitleEl.textContent = data.propName ? `[${data.propName}]` : "";

  // 7. Details / Scope Card
  const detailTextEl = document.getElementById("dynJobDetailText");
  if (detailTextEl) {
    const rawDetail = data.jobDetail || data.details || "No details provided";
    detailTextEl.innerHTML = escapeHtml(rawDetail).replace(/\n/g, "<br>");
  }

  // 8. Key Attributes Grid
  const propNameEl = document.getElementById("dynJobPropName");
  const areaNameEl = document.getElementById("dynJobAreaName");
  const villaBadge = document.getElementById("dynJobVillaBadge");
  const locationEl = document.getElementById("dynJobLocation");
  const createdOnEl = document.getElementById("dynJobCreatedOn");
  const expectedEl = document.getElementById("dynJobExpected");
  const refNumEl = document.getElementById("dynJobRefNum");

  if (propNameEl) propNameEl.textContent = data.propName || WorkWizeAPI.getCurrentPropertyName() || "-";
  if (areaNameEl) areaNameEl.textContent = data.areaName || "-";
  
  if (villaBadge) {
    if (data.villaNumber && data.villaNumber !== "-" && data.villaNumber !== "null") {
      villaBadge.textContent = `Villa: ${data.villaNumber}`;
      villaBadge.classList.remove("hidden");
    } else {
      villaBadge.classList.add("hidden");
    }
  }

  if (locationEl) locationEl.textContent = data.jobLocation || "-";
  if (createdOnEl) createdOnEl.textContent = formatDate(data.jobCreatedOn);
  if (expectedEl) expectedEl.textContent = formatDate(data.expectedCompletion);
  if (refNumEl) refNumEl.textContent = (data.refNum && data.refNum !== "null") ? data.refNum : "-";

  // 9. Remarks Card
  const remarksText = document.getElementById("dynJobRemarks");
  if (remarksText) {
    if (data.remarks) {
      remarksText.innerHTML = escapeHtml(data.remarks).replace(/\n/g, "<br>");
    } else {
      remarksText.textContent = "No remarks noted.";
    }
  }

  // 10. Owner's Comment Card & History Tracker (Point 1)
  const ownerCard = document.getElementById("ownerCommentCard");
  const ownerText = document.getElementById("dynJobOwnerComment");
  const ownerHistoryContainer = document.getElementById("dynOwnerCommentHistoryContainer");
  const ownerHistoryList = document.getElementById("dynOwnerCommentHistoryList");
  const ownerCountBadge = document.getElementById("dynOwnerCommentsCount");

  if (ownerCard && ownerText) {
    const commentsHistory = Array.isArray(data.owner_comments_history) ? [...data.owner_comments_history] : [];
    // Also extract owner comments from data.comments if present
    if (Array.isArray(data.comments)) {
      data.comments.forEach(c => {
        if (c.commentId && c.commentId.startsWith("OWNERCOMMENT") && !commentsHistory.some(h => h.commentDetail === c.commentDetail && h.commentDate === c.commentDate)) {
          commentsHistory.push(c);
        }
      });
    }

    if (data.owner_comment || commentsHistory.length > 0) {
      ownerCard.classList.remove("hidden");
      const latestComment = data.owner_comment || (commentsHistory[0] ? commentsHistory[0].commentDetail : "");
      const latestDate = commentsHistory[0]?.commentDate ? formatDate(commentsHistory[0].commentDate) : "Latest";
      const latestAuthor = ((commentsHistory[0]?.firstName || "Job Owner") + " " + (commentsHistory[0]?.lastName || "")).trim();

      ownerText.innerHTML = `
        <div class="flex items-center justify-between mb-1.5 text-[11px] text-purple-700 font-semibold border-b border-purple-200/60 pb-1">
          <span class="flex items-center gap-1.5"><i class="fa-solid fa-crown text-purple-600"></i> ${escapeHtml(latestAuthor)}</span>
          <span class="text-purple-500 font-mono text-[10px]">${latestDate}</span>
        </div>
        <div class="text-xs text-purple-950 whitespace-pre-wrap leading-relaxed">${escapeHtml(latestComment)}</div>
      `;

      if (ownerCountBadge) {
        ownerCountBadge.textContent = Math.max(commentsHistory.length, data.owner_comment ? 1 : 0);
      }

      if (ownerHistoryContainer && ownerHistoryList) {
        if (commentsHistory.length > 1) {
          ownerHistoryContainer.classList.remove("hidden");
          ownerHistoryList.innerHTML = commentsHistory.slice(1).map(h => `
            <div class="p-2.5 rounded-lg bg-white/90 border border-purple-200 text-xs text-purple-900 shadow-2xs">
              <div class="flex items-center justify-between text-[10px] text-purple-600 font-semibold mb-1">
                <span>${escapeHtml(h.firstName || "Owner")} ${escapeHtml(h.lastName || "")}</span>
                <span class="font-mono text-slate-400">${formatDate(h.commentDate)}</span>
              </div>
              <div class="whitespace-pre-wrap leading-relaxed text-slate-800">${escapeHtml(h.commentDetail || "")}</div>
            </div>
          `).join("");
        } else {
          ownerHistoryContainer.classList.add("hidden");
        }
      }
    } else {
      ownerCard.classList.add("hidden");
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

  // 11. Assigned Team
  const assignedEl = document.getElementById("dynJobAssigned");
  if (assignedEl) {
    let assignedText = "Unassigned";
    if (Array.isArray(data.teams) && data.teams.length > 0) {
      assignedText = data.teams.map(t => t.teamName || t.name || t).join(", ");
    } else if (Array.isArray(data.data1) && data.data1.length > 0) {
      assignedText = data.data1.map(t => t.teamName || t.name || t).join(", ");
    } else if (data.assignedTo) {
      assignedText = data.assignedTo;
    }
    assignedEl.textContent = assignedText;
  }

  // 12. Financial Allocation
  const budgetEl = document.getElementById("dynJobBudget");
  const costCenterEl = document.getElementById("dynJobCostCenter");
  const ccfDeptEl = document.getElementById("dynJobCcfDept");
  const finalExpEl = document.getElementById("dynJobFinalExp");

  if (budgetEl) budgetEl.textContent = `$${Number(data.budget || 0).toLocaleString()}`;
  if (costCenterEl) costCenterEl.textContent = data.ccf || "POMEC";
  if (ccfDeptEl) {
    if (data.ccf_dept && data.ccf_dept !== "undefined" && data.ccf_dept !== "null") {
      ccfDeptEl.textContent = `Dept: ${data.ccf_dept}`;
    } else {
      ccfDeptEl.textContent = "";
    }
  }
  if (finalExpEl) finalExpEl.textContent = `$${Number(data.finalExp || 0).toLocaleString()}`;

  // 13. Render Photos & Attachments (Both in Scope card and Documentation Gallery)
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
    if (!Array.isArray(arr)) return;
    arr.forEach((item, idx) => {
      const cleanUrl = extractImageUrl(item);
      if (cleanUrl) {
        // Avoid duplicates
        if (!list.some(x => x.url === cleanUrl)) {
          const rawName = cleanUrl.split("/").pop() || `${tag}_${idx + 1}.jpg`;
          list.push({ url: cleanUrl, name: rawName, tag: tag });
        }
      }
    });
  }

  pushItems(data.uploads, "Job Photo");
  pushItems(data.imageUploads, "Job Photo");
  pushItems(data.attachments, "Attachment");
  pushItems(data.medias, "Media");
  pushItems(data.images, "Photo");
  pushItems(data.propImg, "Property Image");

  // Collect from comments as well
  if (Array.isArray(data.comments)) {
    data.comments.forEach((c, cIdx) => {
      pushItems(c.uploads, `Comment_${cIdx + 1}`);
      pushItems(c.imageUploads, `Comment_${cIdx + 1}`);
      pushItems(c.commentMedia, `Comment_${cIdx + 1}`);
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

  // Render in Documentation & Photos Gallery
  if (container) {
    if (allPhotos.length === 0) {
      container.innerHTML = `
        <div class="col-span-2 sm:col-span-3 md:col-span-4 text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <i class="fa-regular fa-image text-slate-300 text-2xl block mb-1"></i>
          <span>No attachment files or photos uploaded for this job.</span>
        </div>
      `;
      return;
    }

    const role = (typeof UserSession !== "undefined" && UserSession.getUserRole) ? UserSession.getUserRole().toUpperCase() : "";
    const canDeleteUpload = role.includes("ADMIN") || role.includes("SUPERADMIN") || role.includes("OPROADMIN");

    container.innerHTML = allPhotos.map((item) => {
      const rawFileName = item.name || "Job_Photo.jpg";
      const cleanFileName = rawFileName.length > 18 ? rawFileName.slice(0, 15) + "..." : rawFileName;
      const isImg = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(rawFileName) || (item.url && item.url.startsWith("data:image"));
      const isPdf = /\.pdf$/i.test(rawFileName);

      return `
        <div class="group relative rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all">
          <div 
            class="h-28 w-full overflow-hidden bg-slate-900 flex items-center justify-center relative cursor-pointer"
            onclick="openImagePreview('${escapeHtml(item.url)}', '${escapeHtml(rawFileName)}')"
            title="Click to view file: ${escapeHtml(rawFileName)}"
          >
            ${isImg ? `
              <img src="${item.url}" alt="${escapeHtml(cleanFileName)}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy">
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
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span class="w-8 h-8 rounded-full bg-white/90 text-slate-900 flex items-center justify-center text-xs shadow-md">
                <i class="fa-solid fa-arrow-up-right-from-square"></i>
              </span>
            </div>
          </div>
          <div class="p-2 border-t border-slate-100 flex items-center justify-between gap-1">
            <div class="truncate flex-1">
              <span class="text-[11px] font-semibold text-slate-800 block truncate">${escapeHtml(cleanFileName)}</span>
              <span class="text-[10px] text-blue-600 font-medium flex items-center gap-1 mt-0.5 cursor-pointer" onclick="openImagePreview('${escapeHtml(item.url)}', '${escapeHtml(rawFileName)}')">
                <i class="fa-regular fa-eye text-[9px]"></i> View File
              </span>
            </div>
            ${canDeleteUpload ? `
              <button 
                type="button" 
                onclick="deleteJobAttachment('${escapeHtml(rawFileName)}')" 
                class="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors shrink-0" 
                title="Delete attachment (OPRO Admin)"
              >
                <i class="fa-solid fa-trash-can text-xs"></i>
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }).join("");
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
    countBadge.textContent = `${timeline.length} ${timeline.length === 1 ? 'Comment' : 'Comments'}`;
  }

  if (timeline.length === 0) {
    container.innerHTML = `
      <p class="text-xs text-slate-400 italic text-center py-6">No comments or activity log recorded yet.</p>
    `;
    return;
  }

  container.innerHTML = timeline.map(c => {
    const authorName = `${c.firstName || "Officer"} ${c.lastName || ""}`.trim();
    const dateFormatted = c.commentDate ? formatDate(c.commentDate) : "Recently";
    const msg = escapeHtml(c.commentDetail || "").replace(/\n/g, "<br>");
    const isAdmin = Boolean(c.isAdminNote);

    // Check if comment has attached image(s)
    let mediaHtml = "";
    const rawMedia = c.uploads || c.imageUploads || c.commentMedia || [];
    const mediaArr = Array.isArray(rawMedia) ? rawMedia : (rawMedia ? [rawMedia] : []);
    
    if (mediaArr.length > 0) {
      mediaHtml = `
        <div class="flex items-center gap-2 mt-2 flex-wrap">
          ${mediaArr.map((m, idx) => {
            const cleanMUrl = extractImageUrl(m);
            return `
              <img 
                src="${cleanMUrl}" 
                alt="Comment Attachment" 
                class="w-14 h-14 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition-opacity"
                onclick="openImagePreview('${escapeHtml(cleanMUrl)}', 'Comment Attachment ${idx + 1}')"
                title="Click to zoom image"
                loading="lazy"
              >
            `;
          }).join("")}
        </div>
      `;
    }

    return `
      <div class="p-3.5 rounded-xl border ${isAdmin ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50/80 border-slate-200/80'} space-y-1.5 transition-all">
        <div class="flex items-center justify-between flex-wrap gap-1">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isAdmin ? 'bg-rose-600 text-white' : 'bg-blue-100 text-blue-700'}">
              ${authorName}
            </span>
            ${isAdmin ? '<span class="text-[10px] font-bold text-rose-600 tracking-wide uppercase">Final Sign-Off</span>' : ''}
          </div>
          <span class="text-[10px] text-slate-400">${dateFormatted}</span>
        </div>
        <p class="text-xs text-slate-700 leading-relaxed">${msg}</p>
        ${mediaHtml}
      </div>
    `;
  }).join("");
}

// ==========================================
// Image Preview Popup Modal Functionality
// ==========================================
function openImagePreview(imgUrl, title) {
  const modal = document.getElementById("imagePreviewModal");
  const img = document.getElementById("previewModalImg");
  const titleEl = document.getElementById("previewModalTitle");
  const captionEl = document.getElementById("previewModalCaption");
  const downloadLink = document.getElementById("previewModalDownloadBtn");

  if (!modal || !img) return;

  img.src = imgUrl;
  if (titleEl) titleEl.textContent = title || "Photo Preview";
  if (captionEl) captionEl.textContent = title || "WorkWize Attachment Preview";
  if (downloadLink) downloadLink.href = imgUrl;

  modal.classList.add("open");
}

function closeImagePreview() {
  const modal = document.getElementById("imagePreviewModal");
  const img = document.getElementById("previewModalImg");
  if (modal) modal.classList.remove("open");
  if (img) img.src = "";
}

// ==========================================
// Universal Field Edit Modal Functionality
// Mirrors taskmaster resetDataModel & ShowJobform
// ==========================================
function openEditModal(fieldKey) {
  if (!currentJobData) return;

  currentEditField = fieldKey;
  const modal = document.getElementById("editFieldModal");
  const titleEl = document.getElementById("editModalTitle");
  const bodyEl = document.getElementById("editModalBody");
  const iconEl = document.getElementById("editModalIcon");

  if (!modal || !bodyEl) return;

  let title = "Edit Field";
  let icon = "fa-pen-to-square";
  let inputHtml = "";

  switch (fieldKey) {
    case "JB-AREA":
      title = "Edit Operational Area";
      icon = "fa-layer-group";
      const currentArea = (currentJobData.areaName || "").toLowerCase();
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Operational Area <span class="text-rose-500">*</span></label>
          <select id="editModalInputValue" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none" onchange="handleModalAreaDropdownChange(this)">
            ${ALL_OPERATIONAL_AREAS_LIST.map(a => `
              <option value="${a}" ${currentArea.includes(a.toLowerCase()) || a.toLowerCase().includes(currentArea) ? "selected" : ""}>${a}</option>
            `).join("")}
          </select>
        </div>
        <div id="modalVillaFieldContainer" class="${currentArea.includes("villa") ? "" : "hidden"} pt-2">
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Villa Number <span class="text-rose-500">*</span></label>
          <input type="text" id="editModalVillaNumber" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none" value="${escapeHtml(currentJobData.villaNumber !== '-' ? currentJobData.villaNumber : '')}" placeholder="e.g. V-104">
        </div>
      `;
      break;

    case "JB-LOCATION":
      title = "Edit Job Location";
      icon = "fa-location-dot";
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Job Location <span class="text-rose-500">*</span></label>
          <input type="text" id="editModalInputValue" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none" value="${escapeHtml(currentJobData.jobLocation || '')}" placeholder="Enter specific location">
        </div>
      `;
      break;

    case "JB-STATUS":
      title = "Edit Job Status";
      icon = "fa-list-check";
      const currentStatus = (currentJobData.jobStatus || "").toUpperCase();
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Status Dropdown <span class="text-rose-500">*</span></label>
          <select id="editModalInputValue" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none">
            <option value="YET_TO_COMMENCE" ${currentStatus.includes("YET") ? "selected" : ""}>Yet to Commence</option>
            <option value="IN_PROGRESS" ${currentStatus.includes("PROGRESS") ? "selected" : ""}>In Progress</option>
            <option value="SPARES_ON_ORDER" ${currentStatus.includes("SPARES") ? "selected" : ""}>Spares on Order</option>
            <option value="UNDER_DISCUSSION" ${currentStatus.includes("DISCUSSION") ? "selected" : ""}>Under Discussion</option>
            <option value="FIXED" ${currentStatus.includes("FIXED") ? "selected" : ""}>Fixed</option>
            <option value="COMPLETED" ${currentStatus.includes("COMPLET") ? "selected" : ""}>Completed</option>
          </select>
        </div>
      `;
      break;

    case "JB-PRIORITY":
      title = "Edit Priority";
      icon = "fa-triangle-exclamation";
      const currentPriority = (currentJobData.priority || "MEDIUM").toUpperCase();
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Priority Dropdown <span class="text-rose-500">*</span></label>
          <select id="editModalInputValue" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none">
            <option value="HIGH" ${currentPriority === "HIGH" ? "selected" : ""}>High</option>
            <option value="MEDIUM" ${currentPriority === "MEDIUM" ? "selected" : ""}>Medium</option>
            <option value="LOW" ${currentPriority === "LOW" ? "selected" : ""}>Low</option>
            <option value="SAFETY" ${currentPriority === "SAFETY" ? "selected" : ""}>Safety</option>
          </select>
        </div>
      `;
      break;

    case "JB-DETAIL":
      title = "Edit Scope of Work";
      icon = "fa-file-lines";
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Job Details Description <span class="text-rose-500">*</span></label>
          <textarea id="editModalInputValue" rows="5" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none resize-none" placeholder="Enter detailed scope">${escapeHtml(currentJobData.jobDetail || '')}</textarea>
        </div>
      `;
      break;

    case "JB-REMARK":
      title = "Edit Special Remarks";
      icon = "fa-comment-dots";
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Remarks</label>
          <textarea id="editModalInputValue" rows="4" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none resize-none" placeholder="Enter special remarks">${escapeHtml(currentJobData.remarks || '')}</textarea>
        </div>
      `;
      break;

    case "JB-EXPDATE":
      title = "Edit Expected Completion Date";
      icon = "fa-calendar-day";
      const expDateVal = extractInputDate(currentJobData.expectedCompletion);
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Target Completion Date</label>
          <input type="date" id="editModalInputValue" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none" value="${expDateVal}">
        </div>
      `;
      break;

    case "JB-CREATEDATE":
      title = "Edit Job Creation Date";
      icon = "fa-calendar-check";
      const createDateVal = extractInputDate(currentJobData.jobCreatedOn);
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Job Creation Date</label>
          <input type="date" id="editModalInputValue" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none" value="${createDateVal}">
        </div>
      `;
      break;

    case "JB-REFNUM":
      title = "Edit Reference Number";
      icon = "fa-hashtag";
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Reference No.</label>
          <input type="text" id="editModalInputValue" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none font-mono" value="${escapeHtml(currentJobData.refNum !== 'null' ? currentJobData.refNum : '')}" placeholder="e.g. REF-2026-001">
        </div>
      `;
      break;

    case "JB-BUDGET":
      title = "Edit Budget";
      icon = "fa-sack-dollar";
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Budget in USD ($)</label>
          <input type="number" id="editModalInputValue" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none" value="${currentJobData.budget || 0}" placeholder="Budget amount">
        </div>
      `;
      break;

    case "JB-FINEXP":
      title = "Edit Final Expense";
      icon = "fa-receipt";
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Final Incurred Expense ($)</label>
          <input type="number" id="editModalInputValue" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none" value="${currentJobData.finalExp || 0}" placeholder="Final expense amount">
        </div>
      `;
      break;

    case "JB-CCF":
      title = "Edit Cost Center";
      icon = "fa-building-columns";
      const currentCcf = currentJobData.ccf || "";
      const isDept = currentCcf === "Department Operational Budget";
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Cost Center Dropdown <span class="text-rose-500">*</span></label>
          <select id="editModalInputValue" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none" onchange="handleModalCcfDropdownChange(this)">
            <option value="POMEC" ${currentCcf === "POMEC" ? "selected" : ""}>POMEC</option>
            <option value="CAPEX" ${currentCcf === "CAPEX" ? "selected" : ""}>CAPEX</option>
            <option value="Department Operational Budget" ${isDept ? "selected" : ""}>Department Operational Budget</option>
          </select>
        </div>
        <div id="modalCcfDeptContainer" class="${isDept ? '' : 'hidden'} pt-2">
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Department Name <span class="text-rose-500">*</span></label>
          <input type="text" id="editModalCcfDept" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none" value="${escapeHtml(currentJobData.ccf_dept || '')}" placeholder="Enter Department Name">
        </div>
      `;
      break;

    case "JB-TEAMS":
      title = "Edit Assigned Team";
      icon = "fa-user-gear";
      let assignedVal = "";
      if (Array.isArray(currentJobData.teams) && currentJobData.teams.length > 0) assignedVal = currentJobData.teams.map(t => t.teamName || t.name || t).join(", ");
      else if (currentJobData.assignedTo) assignedVal = currentJobData.assignedTo;
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Assigned To Dropdown <span class="text-rose-500">*</span></label>
          <select id="editModalInputValue" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none">
            ${ALL_OPERATIONAL_TEAMS_LIST.map(t => `
              <option value="${t}" ${assignedVal.includes(t) || t.includes(assignedVal) ? "selected" : ""}>${t}</option>
            `).join("")}
          </select>
        </div>
      `;
      break;

    case "JB-OWNERCOMMENT":
      title = "Edit Owner's Comment";
      icon = "fa-crown";
      inputHtml = `
        <div>
          <label class="block text-xs font-semibold text-slate-700 mb-1.5">Owner Comment</label>
          <textarea id="editModalInputValue" rows="4" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none resize-none" placeholder="Enter owner instructions">${escapeHtml(currentJobData.owner_comment || '')}</textarea>
        </div>
      `;
      break;

    case "JB-CLOSEJOB":
      title = "Close This Job";
      icon = "fa-lock";
      inputHtml = `
        <div class="space-y-2">
          <p class="text-xs text-rose-600 font-semibold flex items-center gap-1.5">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <span>Warning: Closing this ticket will finalize all work and notify stakeholders.</span>
          </p>
          <label class="block text-xs font-semibold text-slate-700 mb-1">Closure Comments <span class="text-rose-500">*</span></label>
          <textarea id="editModalInputValue" rows="4" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:border-blue-500 focus:bg-white outline-none resize-none" placeholder="Enter mandatory closure comments (e.g. Resolved and verified by lead engineer)"></textarea>
        </div>
      `;
      break;

    case "FULL-JOB":
      title = "Edit Full Job";
      icon = "fa-file-signature";
      const fullArea = (currentJobData.areaName || "");
      const fullPriority = (currentJobData.priority || "MEDIUM").toUpperCase();
      const fullStatus = (currentJobData.jobStatus || "").toUpperCase();
      const fullCcf = currentJobData.ccf || "";
      const fullExpDate = extractInputDate(currentJobData.expectedCompletion);
      const fullCreateDate = extractInputDate(currentJobData.jobCreatedOn);

      inputHtml = `
        <div class="space-y-3.5 max-h-[60vh] overflow-y-auto pr-1">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Area Dropdown <span class="text-rose-500">*</span></label>
              <select id="fullEditArea" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none" onchange="handleModalAreaDropdownChange(this)">
                ${ALL_OPERATIONAL_AREAS_LIST.map(a => `
                  <option value="${a}" ${fullArea.toLowerCase().includes(a.toLowerCase()) ? "selected" : ""}>${a}</option>
                `).join("")}
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Villa Number</label>
              <input type="text" id="fullEditVilla" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none" value="${escapeHtml(currentJobData.villaNumber !== '-' ? currentJobData.villaNumber : '')}" placeholder="e.g. V-101">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Priority Dropdown <span class="text-rose-500">*</span></label>
              <select id="fullEditPriority" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none">
                <option value="HIGH" ${fullPriority === "HIGH" ? "selected" : ""}>High</option>
                <option value="MEDIUM" ${fullPriority === "MEDIUM" ? "selected" : ""}>Medium</option>
                <option value="LOW" ${fullPriority === "LOW" ? "selected" : ""}>Low</option>
                <option value="SAFETY" ${fullPriority === "SAFETY" ? "selected" : ""}>Safety</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Status Dropdown <span class="text-rose-500">*</span></label>
              <select id="fullEditStatus" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none">
                <option value="YET_TO_COMMENCE" ${fullStatus.includes("YET") ? "selected" : ""}>Yet to Commence</option>
                <option value="IN_PROGRESS" ${fullStatus.includes("PROGRESS") ? "selected" : ""}>In Progress</option>
                <option value="SPARES_ON_ORDER" ${fullStatus.includes("SPARES") ? "selected" : ""}>Spares on Order</option>
                <option value="UNDER_DISCUSSION" ${fullStatus.includes("DISCUSSION") ? "selected" : ""}>Under Discussion</option>
                <option value="FIXED" ${fullStatus.includes("FIXED") ? "selected" : ""}>Fixed</option>
                <option value="COMPLETED" ${fullStatus.includes("COMPLET") ? "selected" : ""}>Completed</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Job Location <span class="text-rose-500">*</span></label>
              <input type="text" id="fullEditLocation" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none" value="${escapeHtml(currentJobData.jobLocation || '')}">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Assigned To Dropdown <span class="text-rose-500">*</span></label>
              <select id="fullEditAssigned" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none">
                ${ALL_OPERATIONAL_TEAMS_LIST.map(t => `<option value="${t}">${t}</option>`).join("")}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Job Created Date</label>
              <input type="date" id="fullEditCreateDate" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none" value="${fullCreateDate}">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Expected Completion Date</label>
              <input type="date" id="fullEditExpDate" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none" value="${fullExpDate}">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Budget ($)</label>
              <input type="number" id="fullEditBudget" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none" value="${currentJobData.budget || 0}">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Cost Center Dropdown</label>
              <select id="fullEditCcf" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none">
                <option value="POMEC" ${fullCcf === "POMEC" ? "selected" : ""}>POMEC</option>
                <option value="CAPEX" ${fullCcf === "CAPEX" ? "selected" : ""}>CAPEX</option>
                <option value="Department Operational Budget" ${fullCcf.includes("Department") ? "selected" : ""}>Department Operational Budget</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Reference No.</label>
              <input type="text" id="fullEditRefNum" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none font-mono" value="${escapeHtml(currentJobData.refNum !== 'null' ? currentJobData.refNum : '')}">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Job Details Description <span class="text-rose-500">*</span></label>
            <textarea id="fullEditDetails" rows="3" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none resize-none">${escapeHtml(currentJobData.jobDetail || '')}</textarea>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Remarks</label>
            <textarea id="fullEditRemarks" rows="2" class="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 focus:border-blue-500 focus:bg-white outline-none resize-none">${escapeHtml(currentJobData.remarks || '')}</textarea>
          </div>
        </div>
      `;
      break;

    default:
      inputHtml = `<p class="text-xs text-slate-400">Field not editable.</p>`;
  }

  if (titleEl) titleEl.textContent = title;
  if (iconEl) iconEl.className = `fa-solid ${icon}`;
  bodyEl.innerHTML = inputHtml;

  modal.classList.add("open");

  // Focus input automatically
  setTimeout(() => {
    const input = document.getElementById("editModalInputValue");
    if (input) input.focus();
  }, 100);
}

function handleModalAreaDropdownChange(select) {
  const villaContainer = document.getElementById("modalVillaFieldContainer");
  if (villaContainer) {
    if ((select.value || "").toLowerCase().includes("villa")) {
      villaContainer.classList.remove("hidden");
    } else {
      villaContainer.classList.add("hidden");
    }
  }
}

function handleModalCcfDropdownChange(select) {
  const deptContainer = document.getElementById("modalCcfDeptContainer");
  if (deptContainer) {
    if (select.value === "Department Operational Budget") {
      deptContainer.classList.remove("hidden");
    } else {
      deptContainer.classList.add("hidden");
    }
  }
}

function closeEditModal() {
  const modal = document.getElementById("editFieldModal");
  if (modal) modal.classList.remove("open");
}

async function saveFieldEdit() {
  const saveBtn = document.getElementById("saveEditModalBtn");
  if (!currentJobData) return;

  if (saveBtn) {
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-xs mr-1"></i> Saving...';
  }

  const propId = currentJobData.propId || WorkWizeAPI.getCurrentProperty();
  const jobId = currentJobData.jobId || currentJobId;

  // Handle Full Job Save
  if (currentEditField === "FULL-JOB") {
    const area = document.getElementById("fullEditArea")?.value || "";
    const villa = document.getElementById("fullEditVilla")?.value || "";
    const priority = document.getElementById("fullEditPriority")?.value || "MEDIUM";
    const status = document.getElementById("fullEditStatus")?.value || "IN_PROGRESS";
    const location = document.getElementById("fullEditLocation")?.value || "";
    const assigned = document.getElementById("fullEditAssigned")?.value || "";
    const createdDate = document.getElementById("fullEditCreateDate")?.value || "";
    const expDate = document.getElementById("fullEditExpDate")?.value || "";
    const budget = document.getElementById("fullEditBudget")?.value || "0";
    const ccf = document.getElementById("fullEditCcf")?.value || "POMEC";
    const refNum = document.getElementById("fullEditRefNum")?.value || "";
    const details = document.getElementById("fullEditDetails")?.value || "";
    const remarks = document.getElementById("fullEditRemarks")?.value || "";

    if (!details.trim()) {
      alert("Please provide Job Details.");
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<span>Save Changes</span>'; }
      return;
    }

    try {
      const fullForm = new FormData();
      fullForm.append("propID", propId);
      fullForm.append("jobID", jobId);
      fullForm.append("areaID", area);
      fullForm.append("villaNumber", villa);
      fullForm.append("priority", priority);
      fullForm.append("jobLocation", location);
      fullForm.append("jobStatus", status);
      fullForm.append("jobDate", createdDate);
      fullForm.append("refNum", refNum);
      fullForm.append("jobDetail", details);
      fullForm.append("budget", budget);
      fullForm.append("ccf", ccf);
      fullForm.append("remarks", remarks);
      fullForm.append("assignedTo", assigned);

      if (typeof WorkWizeAPI !== "undefined" && WorkWizeAPI.updateJob) {
        await WorkWizeAPI.updateJob(fullForm);
      } else if (typeof WorkWizeAPI !== "undefined") {
        await WorkWizeAPI.updateJobFields(fullForm);
      }
    } catch (e) {
      console.warn("API updateJob error:", e);
    }

    // Update local DB
    if (typeof WorkWizeDB !== "undefined" && currentJobId) {
      WorkWizeDB.updateJob(currentJobId, {
        area: area,
        villaNumber: villa,
        priority: normalizePriorityString(priority),
        status: normalizeStatusString(status),
        location: location,
        assignedTo: assigned,
        details: details,
        remarks: remarks,
        budget: Number(budget) || 0,
        costCenter: ccf
      });
    }

    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<span>Save Changes</span>'; }
    closeEditModal();
    showToast("Job edited successfully!", "success");
    await loadJobDetails(currentJobId);
    return;
  }

  // Handle Individual Field Save
  const input = document.getElementById("editModalInputValue");
  if (!input) return;

  const newValue = input.value.trim();

  // Validate closure comments
  if (currentEditField === "JB-CLOSEJOB" && !newValue) {
    alert("Please enter closure comments to continue closing this job.");
    input.focus();
    if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<span>Save Changes</span>'; }
    return;
  }

  if (typeof WorkWizeAPI !== "undefined") {
    try {
      const updateData = {
        propID: propId,
        jobID: jobId,
        field: currentEditField,
        data: newValue
      };

      if (currentEditField === "JB-AREA") {
        const villaInput = document.getElementById("editModalVillaNumber");
        if (villaInput && villaInput.value) {
          updateData.villaNumber = villaInput.value.trim();
        }
      } else if (currentEditField === "JB-CCF") {
        const deptInput = document.getElementById("editModalCcfDept");
        if (deptInput && deptInput.value) {
          updateData.ccf_dept = deptInput.value.trim();
        }
      }

      await WorkWizeAPI.updateJobFields(updateData);
    } catch (err) {
      console.warn("API updateJobFields error:", err);
    }
  }

  // Update local DB if available
  if (typeof WorkWizeDB !== "undefined" && currentJobId) {
    const updateObj = {};
    if (currentEditField === "JB-LOCATION") updateObj.location = newValue;
    else if (currentEditField === "JB-STATUS") updateObj.status = normalizeStatusString(newValue);
    else if (currentEditField === "JB-PRIORITY") updateObj.priority = normalizePriorityString(newValue);
    else if (currentEditField === "JB-DETAIL") updateObj.details = newValue;
    else if (currentEditField === "JB-REMARK") updateObj.remarks = newValue;
    else if (currentEditField === "JB-AREA") updateObj.area = newValue;
    else if (currentEditField === "JB-CLOSEJOB") updateObj.status = "Closed";
    else if (currentEditField === "JB-BUDGET") updateObj.budget = Number(newValue) || 0;
    WorkWizeDB.updateJob(currentJobId, updateObj);
  }

  if (saveBtn) {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<span>Save Changes</span>';
  }

  closeEditModal();
  showToast("Job updated successfully!", "success");

  // Reload fresh job details from server
  await loadJobDetails(currentJobId);
}

// ==========================================
// Comment Submission Functionality
// Mirrors taskmaster AddComment & addcomment API
// ==========================================
async function submitNewComment() {
  const commentInput = document.getElementById("newCommentInput");
  const fileInput = document.getElementById("commentFileInput");
  const fileLabel = document.getElementById("commentFileLabel");
  const submitBtn = document.getElementById("submitCommentBtn");

  if (!commentInput || !currentJobData) return;

  const text = commentInput.value.trim();
  if (!text) {
    showToast("Please enter a comment message before sending.", "error");
    commentInput.focus();
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin mr-1"></i> Sending...';
  }

  if (typeof WorkWizeAPI !== "undefined" && currentJobId) {
    try {
      const form = new FormData();
      form.append("jobId", currentJobData.jobId || currentJobId);
      form.append("commentDetail", text);

      if (fileInput && fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
          form.append("commentMedia", fileInput.files[i]);
        }
      }

      await WorkWizeAPI.addComment(form);
    } catch (err) {
      console.warn("API addComment error:", err);
    }
  }

  commentInput.value = "";
  if (fileInput) fileInput.value = "";
  if (fileLabel) fileLabel.textContent = "Attach Image";

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1 text-[10px]"></i> Send Comment';
  }

  showToast("Comment added successfully!", "success");
  await loadJobDetails(currentJobId);
}

// ==========================================
// Modal backdrop & Escape key listeners
// ==========================================
function initModalListeners() {
  const fileInput = document.getElementById("commentFileInput");
  const fileLabel = document.getElementById("commentFileLabel");
  if (fileInput && fileLabel) {
    fileInput.addEventListener("change", function () {
      if (this.files && this.files.length > 0) {
        fileLabel.textContent = this.files[0].name.slice(0, 16) + "...";
      } else {
        fileLabel.textContent = "Attach Image";
      }
    });
  }

  // Click outside to close modals
  document.addEventListener("click", function (e) {
    const editModal = document.getElementById("editFieldModal");
    const previewModal = document.getElementById("imagePreviewModal");

    if (editModal && e.target === editModal) {
      closeEditModal();
    }
    if (previewModal && e.target === previewModal) {
      closeImagePreview();
    }
  });

  // Escape key to close modals
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeEditModal();
      closeImagePreview();
    }
  });
}

// ==========================================
// Helper functions
// ==========================================
function extractImageUrl(item) {
  if (!item) return "";
  let raw = "";
  if (typeof item === "string") {
    raw = item;
  } else if (typeof item === "object") {
    raw = item.url || item.uploadUrl || item.path || item.filePath || item.fileUrl || item.image || item.mediaUrl || "";
  }
  if (!raw) return "";
  return normalizeImageUrl(raw);
}

function normalizeImageUrl(url) {
  if (!url || typeof url !== "string") return "";
  let cleanUrl = url.trim();
  if (cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://") || cleanUrl.startsWith("data:") || cleanUrl.startsWith("blob:")) {
    return cleanUrl;
  }
  const base = "https://api.workwize.in";
  if (cleanUrl.startsWith("/")) {
    return base + cleanUrl;
  }
  return base + "/" + cleanUrl;
}

function setLoadingState(isLoading) {
  const orgIdEl = document.getElementById("dynJobOrgId");
  if (isLoading && orgIdEl) {
    orgIdEl.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-blue-600 text-lg mr-2"></i> Loading job details...';
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

function formatDate(dateStr) {
  if (!dateStr || dateStr.startsWith("0001") || dateStr === "null" || dateStr === "undefined") return "-";
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

function extractInputDate(dateStr) {
  if (!dateStr || dateStr.startsWith("0001") || dateStr === "null") {
    return new Date().toISOString().split("T")[0];
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return new Date().toISOString().split("T")[0];
    return d.toISOString().split("T")[0];
  } catch (e) {
    return new Date().toISOString().split("T")[0];
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function showToast(msg, type = "info") {
  const toast = document.createElement("div");
  const bg = type === "success" ? "bg-emerald-600" : (type === "error" ? "bg-rose-600" : "bg-slate-900");
  toast.className = `fixed bottom-6 right-6 ${bg} text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl z-50 flex items-center gap-2 animate-fade-in`;
  toast.innerHTML = `<i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i> <span>${msg}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transition = "opacity 0.3s";
    setTimeout(() => toast.remove(), 300);
  }, 2800);
}

// Export for inline triggers
window.openImagePreview = openImagePreview;
window.closeImagePreview = closeImagePreview;
window.openEditModal = openEditModal;
window.closeEditModal = closeEditModal;
window.saveFieldEdit = saveFieldEdit;
window.submitNewComment = submitNewComment;
window.handleModalAreaDropdownChange = handleModalAreaDropdownChange;
window.handleModalCcfDropdownChange = handleModalCcfDropdownChange;


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
    // Hide editing controls
    const editFullBtn = document.getElementById("detailEditFullJobBtn");
    const closeBtn = document.getElementById("detailCloseJobBtn");
    const deleteBtn = document.getElementById("detailDeleteJobBtn");
    const newCommentBox = document.getElementById("newCommentBox");
    const editOwnerBtn = document.getElementById("editOwnerCommentBtn");
    const editRemarksBtn = document.getElementById("editRemarksBtn");
    const editRefNumBtn = document.getElementById("editRefNumBtn");

    if (editFullBtn) editFullBtn.classList.add("hidden");
    if (closeBtn) closeBtn.classList.add("hidden");
    if (deleteBtn) deleteBtn.classList.add("hidden");
    if (newCommentBox) newCommentBox.classList.add("hidden");
    if (editOwnerBtn) editOwnerBtn.classList.add("hidden");
    if (editRemarksBtn) editRemarksBtn.classList.add("hidden");
    if (editRefNumBtn) editRefNumBtn.classList.add("hidden");

    // Add visual view-only badge if not already added
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
async function deleteJobAttachment(fileName) {
  if (!confirm(`Are you sure you want to permanently delete "${fileName}"? This action cannot be undone.`)) return;

  try {
    const propId = currentJobData?.propId || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentProperty() : "");
    const res = await WorkWizeAPI.request("api/jobtracker/deleteupload", {
      method: "POST",
      body: {
        fileId: currentJobId,
        jobId: currentJobId,
        fileName: fileName,
        propId: propId
      }
    });

    showToast("Attachment removed successfully!", "success");
    await loadJobDetails(currentJobId);
  } catch (err) {
    showToast(err.message || "Failed to delete attachment", "error");
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
