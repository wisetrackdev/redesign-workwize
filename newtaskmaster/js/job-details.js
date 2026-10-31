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
          comments: [],
          uploads: []
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
  if (breadcrumbEl) breadcrumbEl.textContent = displayId;
  if (orgIdEl) orgIdEl.textContent = displayId;

  // 2. Set Up "Update Job" buttons
  const updateUrl = `job-update.html?id=${encodeURIComponent(rawJobId)}`;
  const heroUpdateBtn = document.getElementById("heroUpdateJobBtn");
  const bottomUpdateBtn = document.getElementById("bottomUpdateJobBtn");
  if (heroUpdateBtn) heroUpdateBtn.href = updateUrl;
  if (bottomUpdateBtn) bottomUpdateBtn.href = updateUrl;

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
    if (data.villaNumber && data.villaNumber !== "-" && data.villaNumber !== "null") {
      villaDisplay.innerHTML = `<span class="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200">Villa ${escapeHtml(data.villaNumber)}</span>`;
    } else {
      villaDisplay.textContent = "N/A (General Facility)";
    }
  }

  if (locationEl) locationEl.textContent = data.jobLocation || data.location || "-";
  if (createdOnEl) createdOnEl.textContent = formatDate(data.jobCreatedOn || data.createdOn);
  if (expectedEl) expectedEl.textContent = formatDate(data.expectedCompletion || data.expectedDate);
  if (refNumEl) refNumEl.textContent = (data.refNum && data.refNum !== "null") ? data.refNum : "-";

  // 9. Remarks Card
  const remarksCard = document.getElementById("remarksCard");
  const remarksText = document.getElementById("dynJobRemarks");
  if (remarksCard && remarksText) {
    if (data.remarks && String(data.remarks).trim().length > 0 && data.remarks !== "null") {
      remarksCard.classList.remove("hidden");
      remarksText.innerHTML = escapeHtml(data.remarks).replace(/\n/g, "<br>");
    } else {
      remarksCard.classList.add("hidden");
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
    if (!Array.isArray(arr)) return;
    arr.forEach((item, idx) => {
      const cleanUrl = extractImageUrl(item);
      if (cleanUrl) {
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
    const dateStr = formatDate(c.commentDate || c.createdOn || new Date());
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
  if (titleEl) titleEl.textContent = title || "Job Photo Preview";
  if (captionEl) captionEl.textContent = title || "WorkWize Attachment";
  if (downloadBtn) downloadBtn.href = url;

  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeImagePreview() {
  const modal = document.getElementById("imagePreviewModal");
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = "";
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
  if (typeof img === "string") {
    if (img.startsWith("http") || img.startsWith("data:")) return img;
    const base = typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getBaseUrl() : "";
    return `${base.replace(/\/$/, "")}/${img.replace(/^\//, "")}`;
  }
  if (img.url) return normalizeImageUrl(img.url);
  if (img.filepath) return normalizeImageUrl(img.filepath);
  if (img.filePath) return normalizeImageUrl(img.filePath);
  return "";
}

function extractImageUrl(item) {
  if (!item) return "";
  if (typeof item === "string") return normalizeImageUrl(item);
  if (typeof item === "object") {
    return normalizeImageUrl(item.url || item.filepath || item.filePath || item.mediaPath || item.image);
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
async function deleteJobAttachment(fileName) {
  if (!confirm(`Are you sure you want to permanently delete "${fileName}"? This action cannot be undone.`)) return;

  try {
    const propId = currentJobData?.propId || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentProperty() : "");
    await WorkWizeAPI.request("api/jobtracker/deleteupload", {
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

