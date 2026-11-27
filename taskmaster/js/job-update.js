

function isImageAttachment(url) {

  if (!url || typeof url !== "string") return false;

  const clean = url.split("?")[0].split("#")[0].toLowerCase();

  if (clean.startsWith("data:image/")) return true;

  return /\.(jpg|jpeg|png|webp|gif|svg|avif|bmp)$/i.test(clean) || (!/\.(pdf|doc|docx|xls|xlsx|zip|rar|txt|csv)$/i.test(clean));

}





function toggleAssigneeDropdown(eventOrId, optionalMenuId) {

  if (eventOrId && typeof eventOrId.stopPropagation === "function") {

    eventOrId.stopPropagation();

  }

  const id = (typeof eventOrId === "string" && !optionalMenuId) ? eventOrId : (optionalMenuId || "editAssignedToMenu");

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

    populateEditAssignees(cachedJob);

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

      const optText = this.options[this.selectedIndex]?.text || "";

      toggleVillaField(`${this.value} ${optText}`, false);

    });

  }



  // Load / refresh existing job details into form in background

  initImagePreviewModal();

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



function toggleVillaField(areaVal, preserveValue = false) {

  const villaInput = document.getElementById("editVillaNumber");

  if (!villaInput) return;

  const areaSelect = document.getElementById("editAreaName");

  const selectedText = (areaSelect && areaSelect.selectedIndex >= 0 && areaSelect.options[areaSelect.selectedIndex]) 

    ? areaSelect.options[areaSelect.selectedIndex].text 

    : "";

  const combined = `${areaVal || ""} ${selectedText}`.toUpperCase();

  const isGuestVilla = combined.includes("VILLA");



  if (isGuestVilla) {

    villaInput.disabled = false;

    villaInput.placeholder = "e.g. 104";

    villaInput.classList.remove("opacity-60", "cursor-not-allowed", "bg-slate-100");

  } else {

    villaInput.disabled = true;

    if (!preserveValue) villaInput.value = "";

    villaInput.placeholder = "Disabled (Select Villa Area)";

    villaInput.classList.add("opacity-60", "cursor-not-allowed", "bg-slate-100");

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

        await populateEditAssignees(res.jobdata);

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

        teams: localJob.assignedTo ? [localJob.assignedTo] : ["Facilities Team"],

        createdBy: localJob.createdBy || localJob.userId || localJob.creator || localJob.firstname || "-",

        userId: localJob.userId || localJob.createdBy || "",

        firstname: localJob.firstname || "",

        lastname: localJob.lastname || ""

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



function extractLatestOwnerComment(data) {
  if (!data) return "";

  // 1. Check owner_comments_history if available
  if (Array.isArray(data.owner_comments_history) && data.owner_comments_history.length > 0) {
    const sorted = [...data.owner_comments_history].sort((a, b) => {
      const timeA = a.commentDate ? new Date(a.commentDate).getTime() : 0;
      const timeB = b.commentDate ? new Date(b.commentDate).getTime() : 0;
      return timeB - timeA;
    });
    const latestFromHistory = (sorted[0].commentDetail || sorted[0].commentText || sorted[0].comment || "").trim();
    if (latestFromHistory) return cleanOwnerTxt(latestFromHistory);
  }

  // 2. Check comments array for owner directive
  if (Array.isArray(data.comments) && data.comments.length > 0) {
    const ownerComments = data.comments.filter(c => isOwnerDirectiveComment(c));
    if (ownerComments.length > 0) {
      ownerComments.sort((a, b) => {
        const timeA = a.commentDate ? new Date(a.commentDate).getTime() : 0;
        const timeB = b.commentDate ? new Date(b.commentDate).getTime() : 0;
        return timeB - timeA;
      });
      const latestFromComments = (ownerComments[0].commentDetail || ownerComments[0].commentText || ownerComments[0].comment || "").trim();
      if (latestFromComments) return cleanOwnerTxt(latestFromComments);
    }
  }

  // 3. Direct owner_comment property
  if (data.owner_comment && typeof data.owner_comment === "string") {
    return cleanOwnerTxt(data.owner_comment.trim());
  }

  return "";
}

async function populateEditAssignees(data) {

  const listEl = document.getElementById("editAssignedToMenu");

  if (!listEl) return;



  const assignedNames = extractJobAssignees(data);

  const currentlyAssignedSet = new Set(assignedNames.map(a => a.toUpperCase()));



  // Fetch dynamic property employee/assignee info from WorkWizeAPI (identical to Add New Job popup)

  let empList = [];

  if (typeof WorkWizeAPI !== "undefined") {

    try {

      const propId = data?.propId || WorkWizeAPI.getCurrentProperty();

      const propInfo = await WorkWizeAPI.getPropertyInfo(propId);

      if (propInfo && Array.isArray(propInfo.propEmp) && propInfo.propEmp.length > 0) {

        empList = propInfo.propEmp;

      }

    } catch (err) {

      console.warn("Could not load dynamic property info for edit assignees:", err);

    }

  }



  if (empList.length === 0 && Array.isArray(data?.propEmp) && data.propEmp.length > 0) {

    empList = data.propEmp;

  }



  let finalOptions = [];

  if (empList.length > 0) {

    finalOptions = empList.map(emp => {

      const val = emp.teamId || emp.teamName || emp.userName || emp.id;

      let label = emp.teamName;

      // Special condition ONLY for OproAdmin: show firstName and lastName
      const isOpro = (
        String(emp.role || "").toUpperCase().includes("OPROADMIN") ||
        String(emp.userRole || "").toUpperCase().includes("OPROADMIN") ||
        String(emp.desg || "").toUpperCase().replace(/\s+/g, "").includes("OPROADMIN") ||
        String(emp.manager?.desg || "").toUpperCase().replace(/\s+/g, "").includes("OPROADMIN") ||
        String(emp.manager?.role || "").toUpperCase().replace(/\s+/g, "").includes("OPROADMIN") ||
        String(emp.email || "").toLowerCase().includes("oproadmin") ||
        String(emp.teamName || "").toUpperCase().replace(/\s+/g, "").includes("OPROADMIN")
      );

      if (isOpro) {
        let name = (typeof UserSession !== "undefined" && typeof UserSession.getNameFromUserOrEmail === "function")
          ? UserSession.getNameFromUserOrEmail(emp)
          : `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
        if (!name) name = "Testing Test";
        label = `${name} [OproAdmin]`;
      } else if (emp.manager && (emp.manager.firstName || emp.manager.desg)) {
        const desg = (emp.manager.desg || "").trim();
        const name = `${emp.manager.firstName || ""} ${emp.manager.lastName || ""}`.trim();
        label = desg ? `${desg} [${emp.teamName}]` : (name ? `${name} [${emp.teamName}]` : emp.teamName);
      } else if (emp.firstName || emp.desg) {
        const desg = (emp.desg || "").trim();
        const name = `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
        label = desg ? (emp.teamName ? `${desg} [${emp.teamName}]` : desg) : (name ? (emp.teamName ? `${name} [${emp.teamName}]` : name) : (emp.teamName || emp.userName));
      }

      return { val, label };

    });

  } else {

    // Exact fallback as Add New Job modal

    finalOptions = [

      { val: "Facilities Team", label: "Facilities Team" },

      { val: "Engineering Team", label: "Engineering Team" },

      { val: "IT Admin", label: "Testing - IT Admin" },

      { val: "Safety Team", label: "Safety Team" }

    ];

  }



  // Pre-check any assignee matching this job - do NOT add raw team names

  // Always ensure OproAdmin is present in Assign To dropdown
  const curU = (typeof UserSession !== "undefined" && typeof UserSession.getUser === "function") ? UserSession.getUser() : null;
  const curName = (typeof UserSession !== "undefined" && typeof UserSession.getUserFullName === "function")
    ? UserSession.getUserFullName()
    : ((curU && (curU.firstName || curU.lastName)) ? `${curU.firstName || ""} ${curU.lastName || ""}`.trim() : "Testing Test");
  const oproVal = (curU && (curU.id || curU.userId || curU.userName || curU.email)) || "OproAdmin";
  const oproLabel = `${curName || "Testing Test"} [OproAdmin]`;

  const hasOproOption = finalOptions.some(o => 
    String(o.val || "").toUpperCase().includes("OPRO") ||
    String(o.label || "").toUpperCase().includes("OPRO")
  );

  if (!hasOproOption) {
    finalOptions.unshift({
      val: oproVal,
      label: oproLabel
    });
  } else {
    // If user is OproAdmin or has name, ensure their name is reflected on the OproAdmin option
    const oproOpt = finalOptions.find(o => 
      String(o.val || "").toUpperCase().includes("OPRO") ||
      String(o.label || "").toUpperCase().includes("OPRO")
    );
    if (oproOpt) {
      oproOpt.label = oproLabel;
    }
  }

  listEl.innerHTML = finalOptions.map(item => {

    const valUpper = (item.val || "").toUpperCase();

    const labelUpper = (item.label || "").toUpperCase();



    const isChecked = (

      currentlyAssignedSet.has(valUpper) ||

      currentlyAssignedSet.has(labelUpper) ||

      (item.val === "IT Admin" && currentlyAssignedSet.has("TESTING - IT ADMIN")) ||

      (item.label === "Testing - IT Admin" && currentlyAssignedSet.has("IT ADMIN")) ||

      (valUpper.includes("IT") && currentlyAssignedSet.has("IT ADMIN")) ||
      (labelUpper.includes("OPRO") && Array.from(currentlyAssignedSet).some(a => a.includes("OPRO"))) ||
      (valUpper.includes("OPRO") && Array.from(currentlyAssignedSet).some(a => a.includes("OPRO"))) ||

      (labelUpper.includes("IT ADMIN") && currentlyAssignedSet.has("IT ADMIN")) ||

      Array.from(currentlyAssignedSet).some(assigned => {

        if (!assigned) return false;

        return valUpper === assigned || labelUpper === assigned || labelUpper.includes(assigned) || assigned.includes(valUpper);

      })

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





// Strip HTML tags and format cleanly for textarea (no <div>, <br>, or <p> tags)

function stripHtmlToPlainText(str) {

  if (str === null || str === undefined) return "";

  let s = String(str);

  s = s.replace(/<br\s*[\/]?>/gi, "\n")

       .replace(/<\/p>/gi, "\n")

       .replace(/<\/div>/gi, "\n")

       .replace(/<div\b[^>]*>/gi, "")

       .replace(/<p\b[^>]*>/gi, "");

  s = s.replace(/<[^>]+>/g, "");

  const txt = document.createElement("textarea");

  txt.innerHTML = s;

  return txt.value.trim();

}



// Maldives Standard Time (UTC+5) Formatter

function formatMaldivesDateTime(d) {

  if (!d || d === "-" || d === "null" || d === "undefined") return "-";

  try {

    let s = String(d).trim();

    if (!s || s.startsWith("0001-01-01") || s.startsWith("0001")) return "-";

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {

      const parts = s.split("-");

      const dt = new Date(parts[0], parts[1] - 1, parts[2]);

      return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

    }

    let utcMs = null;

    if (d instanceof Date) {

      utcMs = isNaN(d.getTime()) ? null : d.getTime();

    } else if (s.includes("Z") || /[+-]\d{2}:?\d{2}$/.test(s)) {

      const dZ = new Date(s);

      utcMs = isNaN(dZ.getTime()) ? null : dZ.getTime();

    } else {

      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);

      if (isoMatch) {

        const sec = isoMatch[6] || "00";

        const utcIso = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T${isoMatch[4]}:${isoMatch[5]}:${sec}Z`;

        const dIso = new Date(utcIso);

        utcMs = isNaN(dIso.getTime()) ? null : dIso.getTime();

      } else {

        const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:,?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);

        if (dmyMatch) {

          const y = dmyMatch[3];

          const m = String(dmyMatch[2]).padStart(2, "0");

          const dd = String(dmyMatch[1]).padStart(2, "0");

          const hr = String(dmyMatch[4] || 0).padStart(2, "0");

          const min = String(dmyMatch[5] || 0).padStart(2, "0");

          const sc = String(dmyMatch[6] || 0).padStart(2, "0");

          const dDmy = new Date(`${y}-${m}-${dd}T${hr}:${min}:${sc}Z`);

          utcMs = isNaN(dDmy.getTime()) ? null : dDmy.getTime();

        } else {

          const fb = new Date(s);

          utcMs = isNaN(fb.getTime()) ? null : fb.getTime();

        }

      }

    }

    if (utcMs === null || isNaN(utcMs)) return s;

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



// Cost Center Dropdown Condition Handler

function handleEditCcfChange() {

  const ccfSelect = document.getElementById("editCostCenter");

  const deptContainer = document.getElementById("editCcfDeptContainer");

  const deptInput = document.getElementById("editCcfDept");

  if (!ccfSelect || !deptContainer) return;

  if (ccfSelect.value === "Department Operational Budget") {

    deptContainer.classList.remove("hidden");

  } else {

    deptContainer.classList.add("hidden");

    if (deptInput) deptInput.value = "";

  }

}

window.handleEditCcfChange = handleEditCcfChange;



// Helper to extract all image/attachment URLs from comment objects

function extractAllAttachmentsFromComment(c) {

  if (!c) return [];

  const list = [];

  const normalize = (item) => {

    if (!item) return null;

    if (typeof item === "string") {

      let u = item.trim();

      if (!u) return null;

      if (u.startsWith("http://") || u.startsWith("https://") || u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("assets/")) return u;

      const base = (typeof WorkWizeAPI !== "undefined" && WorkWizeAPI.getBaseUrl) ? WorkWizeAPI.getBaseUrl().replace(/\/+$/, "") : "";

      if (u.toLowerCase().includes("tempdata/") || u.toLowerCase().includes("uploads/")) {

        return `${base}/${u.replace(/^\/+/, "")}`;

      }

      return `${base}/tempdata/uploads/${u.replace(/^\/+/, "")}`;

    }

    const val = item.url || item.path || item.fileName || item.mediaPath || item.src || "";

    return val ? normalize(val) : null;

  };



  const cleanBase = (u) => {
    if (!u) return "";
    let base = String(u).split("/").pop().split("\\").pop().split("?")[0].split("#")[0].toLowerCase();
    return base.replace(/^[0-9a-f]{8,}[-_]/i, "").replace(/^\d+[-_]/, "");
  };

  const checkArray = (arr) => {
    if (!arr) return;
    const items = Array.isArray(arr) ? arr : [arr];
    items.forEach(x => {
      const u = normalize(x);
      if (!u) return;
      const itemBase = cleanBase(u);
      const isDup = list.some(existing => {
        if (existing === u) return true;
        const exBase = cleanBase(existing);
        if (itemBase && exBase && itemBase === exBase) return true;
        return false;
      });
      if (!isDup) list.push(u);
    });
  };



  checkArray(c.uploads);

  checkArray(c.imageUploads);

  checkArray(c.commentMedia);

  checkArray(c.data1);

  checkArray(c.attachments);

  checkArray(c.medias);

  if (c.photo) checkArray(c.photo);

  if (c.attachment) checkArray(c.attachment);

  return list;

}



function isOwnerDirectiveComment(c) {
  if (!c) return false;
  if (c.isOwnerComment === true || c.isOwnerComment === 1 || c.isOwnerComment === "1") return true;
  const cId = String(c.commentId || c.commentID || c.fileId || c.fileID || "");
  if (cId === "OWNERCOMMENT" || cId.startsWith("OWNERCOMMENT")) return true;
  const txt = String(c.commentDetail || c.commentText || c.comment || c.text || "").trim();
  if (txt.startsWith("[Owner Directive]") || txt.startsWith("Owner Directive:") || txt.startsWith("[Owner Comment]")) return true;
  return false;
}
window.isOwnerDirectiveComment = isOwnerDirectiveComment;

function cleanOwnerTxt(text) {
  if (!text) return "";
  let clean = String(text).trim();
  if (clean.startsWith("[Owner Directive]")) {
    clean = clean.substring("[Owner Directive]".length).trim();
  } else if (clean.startsWith("Owner Directive:")) {
    clean = clean.substring("Owner Directive:".length).trim();
  } else if (clean.startsWith("[Owner Comment]")) {
    clean = clean.substring("[Owner Comment]".length).trim();
  }
  return clean;
}
window.cleanOwnerTxt = cleanOwnerTxt;

function extractAttachmentFromComment(c) {

  const all = extractAllAttachmentsFromComment(c);

  return all.length > 0 ? all[0] : null;

}



// Render Owner Comments History in job-update page

function renderOwnerCommentsHistory(data) {
  const container = document.getElementById("ownerCommentHistorySection");
  const listEl = document.getElementById("ownerCommentHistoryList");
  const badge = document.getElementById("ownerHistoryCountBadge");
  if (!container || !listEl) return;

  const allOwner = [];

  const addOrMerge = (rawItem, fallbackAuthor = "Owner") => {
    if (!rawItem) return;
    const rawText = (rawItem.commentDetail || rawItem.commentText || rawItem.comment || rawItem.text || (typeof rawItem === "string" ? rawItem : "")).trim();
    if (!rawText) return;
    const cleanText = cleanOwnerTxt(rawText);
    const date = rawItem.commentDate || rawItem.date || rawItem.jobDate || rawItem.jobCreatedOn || "";
    const author = rawItem.firstName ? `${rawItem.firstName} ${rawItem.lastName || ""}`.trim() : (rawItem.createdBy || rawItem.author || fallbackAuthor);
    const atts = extractAllAttachmentsFromComment(rawItem);

    const existing = allOwner.find(x => {
      if (!x) return false;
      if (x.cleanText === cleanText || x.text === rawText) return true;
      if (x.cleanText && cleanText && x.cleanText.trim().toLowerCase() === cleanText.trim().toLowerCase()) return true;
      return false;
    });
    if (existing) {
      if (atts && atts.length > 0) {
        atts.forEach(u => {
          if (!existing.attachments.includes(u)) existing.attachments.push(u);
        });
      }
      if (date && (!existing.date || (data.jobDate && existing.date === data.jobDate && date !== data.jobDate))) {
        existing.date = date;
      }
      if ((!existing.author || existing.author === "Owner") && author && author !== "Owner") existing.author = author;
    } else {
      allOwner.push({
        text: rawText,
        cleanText: cleanText,
        date: date,
        author: author,
        attachments: atts || []
      });
    }
  };

  if (Array.isArray(data.owner_comments_history)) {
    data.owner_comments_history.forEach(h => addOrMerge(h, "Owner"));
  }

  if (Array.isArray(data.comments)) {
    data.comments.forEach(c => {
      if (isOwnerDirectiveComment(c)) {
        addOrMerge(c, "Owner");
      }
    });
  }

  // Only fallback to direct owner_comment if comment history is completely empty
  const direct = (data.owner_comment || "").trim();
  if (direct && allOwner.length === 0) {
    addOrMerge({
      commentDetail: direct,
      commentDate: data.jobDate || data.jobCreatedOn || "",
      uploads: data.owner_comment_uploads || data.ownerUploads || []
    }, "Owner");
  }

  // Sort newest first
  allOwner.sort((a, b) => {
    const tA = a.date ? new Date(a.date).getTime() : 0;
    const tB = b.date ? new Date(b.date).getTime() : 0;
    return tB - tA;
  });

  if (badge) badge.textContent = allOwner.length;

  if (allOwner.length === 0) {
    container.classList.add("hidden");
    listEl.innerHTML = "";
    return;
  }

  container.classList.remove("hidden");
  listEl.innerHTML = allOwner.map((c, idx) => `
    <div class="p-3 rounded-xl bg-white border border-purple-200/80 text-xs shadow-2xs">
      <div class="flex items-center justify-between text-[10px] text-purple-700 font-semibold mb-1 pb-1 border-b border-purple-100">
        <span class="flex items-center gap-1.5">
          <i class="fa-solid fa-user-pen text-purple-600"></i>
          <span class="font-bold text-purple-900">${escapeHtml(c.author)}</span>
          ${idx === 0 ? '<span class="px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 text-[9px] font-bold">Latest</span>' : ''}
        </span>
        <span class="text-slate-500 font-semibold flex items-center gap-1"><i class="fa-regular fa-clock text-[9px] text-purple-400"></i>${formatMaldivesDateTime(c.date)}</span>
      </div>
      <div class="whitespace-pre-wrap text-slate-800 leading-relaxed pt-0.5">${escapeHtml(c.cleanText || cleanOwnerTxt(c.text))}</div>
      ${(c.attachments && c.attachments.length > 0) ? `
        <div class="mt-2.5 pt-2 border-t border-purple-100/70">
          <div class="flex items-center gap-2 flex-wrap">
            ${c.attachments.map((attUrl, aIdx) => isImageAttachment(attUrl) ? `
              <div class="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-purple-200 bg-slate-900 shadow-2xs cursor-pointer comment-photo-trigger hover:border-purple-500 hover:shadow-md transition-all shrink-0"
                   data-url="${escapeHtml(attUrl)}"
                   data-title="Owner Directive Photo ${aIdx + 1}">
                <img src="${escapeHtml(attUrl)}" alt="Owner directive photo" class="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'flex flex-col items-center justify-center text-slate-400 h-full p-1 text-center\\'><i class=\\'fa-regular fa-image text-xs text-slate-400 mb-0.5\\'></i><span class=\\'text-[8px] text-slate-400 font-semibold truncate w-full\\'>Photo</span></div>';">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <i class="fa-solid fa-magnifying-glass text-white text-xs"></i>
                </div>
              </div>
            ` : `
              <a href="${escapeHtml(attUrl)}" target="_blank" download class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-[10px] font-bold hover:bg-purple-100 transition-all">
                <i class="fa-solid fa-paperclip text-purple-500"></i>
                <span>Attachment ${aIdx + 1}</span>
                <i class="fa-solid fa-download text-[9px] text-purple-400"></i>
              </a>
            `).join("")}
          </div>
        </div>
      ` : ''}
    </div>
  `).join("");

  // Bind lightbox photo click triggers in ownerCommentHistoryList
  listEl.querySelectorAll(".comment-photo-trigger").forEach(el => {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      const url = this.getAttribute("data-url");
      const title = this.getAttribute("data-title") || "Owner Directive Photo";
      if (typeof openImagePreview === "function") {
        openImagePreview(url, title);
      }
    });
  });
}

function renderProgressNotesHistory(data) {
  const container = document.getElementById("progressNotesHistorySection");
  const listEl = document.getElementById("progressNotesHistoryList");
  const badge = document.getElementById("progressHistoryCountBadge");
  if (!container || !listEl) return;

  const notes = [];
  if (Array.isArray(data.comments)) {
    data.comments.forEach(c => {
      // Strictly exclude Owner Directive & Owner Comments from progress notes
      if (isOwnerDirectiveComment(c)) return;

      const text = (c.commentDetail || c.commentText || c.comment || c.text || "").trim();
      const att = extractAttachmentFromComment(c);
      if (text || att) {
        const author = `${c.firstName || c.firstname || "User"} ${c.lastName || c.lastname || ""}`.trim();
        const attachments = extractAllAttachmentsFromComment(c);
        notes.push({
          text: text || "Attachment uploaded",
          date: c.commentDate || c.createdOn || "",
          author: author || "Team Member",
          att,
          attachments
        });
      }
    });
  }

  // Sort newest first
  notes.sort((a, b) => {
    const tA = a.date ? new Date(a.date).getTime() : 0;
    const tB = b.date ? new Date(b.date).getTime() : 0;
    return tB - tA;
  });

  if (badge) badge.textContent = `${notes.length} ${notes.length === 1 ? 'Note' : 'Notes'}`;

  if (notes.length === 0) {
    container.classList.add("hidden");
    listEl.innerHTML = "";
    return;
  }

  container.classList.remove("hidden");
  listEl.innerHTML = notes.map(n => `
    <div class="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
      <div class="flex items-center justify-between text-[10px] text-slate-600 font-semibold mb-1 pb-1 border-b border-slate-100 flex-wrap gap-1">
        <span class="flex items-center gap-1.5">
          <i class="fa-solid fa-circle-user text-blue-600 text-xs"></i>
          <span class="font-bold text-slate-900">${escapeHtml(n.author)}</span>
        </span>
        <span class="text-slate-500 font-semibold flex items-center gap-1"><i class="fa-regular fa-clock text-[9px] text-slate-400"></i>${formatMaldivesDateTime(n.date)}</span>
      </div>
      <p class="text-slate-700 leading-relaxed pt-0.5 whitespace-pre-wrap">${escapeHtml(n.text)}</p>
      ${(n.attachments && n.attachments.length > 0) ? `
        <div class="mt-2.5 pt-2 border-t border-slate-200/80">
          <div class="flex items-center gap-2 flex-wrap">
            ${n.attachments.map((attUrl, aIdx) => isImageAttachment(attUrl) ? `
              <div class="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs cursor-pointer comment-photo-trigger hover:border-blue-500 hover:shadow-md transition-all shrink-0"
                   data-url="${escapeHtml(attUrl)}"
                   data-title="Progress Photo ${aIdx + 1}">
                <img src="${escapeHtml(attUrl)}" alt="Comment photo" class="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'flex flex-col items-center justify-center text-slate-400 h-full p-1 text-center\\'><i class=\\'fa-regular fa-image text-xs text-slate-400 mb-0.5\\'></i><span class=\\'text-[8px] text-slate-400 font-semibold truncate w-full\\'>Photo</span></div>';">
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                  <i class="fa-solid fa-magnifying-glass text-white text-xs"></i>
                </div>
              </div>
            ` : `
              <a href="${escapeHtml(attUrl)}" target="_blank" class="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-600 border border-slate-200 rounded-lg text-[10px] font-bold shadow-2xs transition-all">
                <i class="fa-solid fa-paperclip text-slate-400"></i>
                <span>Attachment ${aIdx + 1}</span>
              </a>
            `).join("")}
          </div>
        </div>
      ` : (n.att ? (isImageAttachment(n.att) ? `
        <div class="mt-2.5 pt-2 border-t border-slate-200/80">
          <div class="flex items-center gap-2 flex-wrap">
            <div class="group relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-900 shadow-2xs cursor-pointer comment-photo-trigger hover:border-blue-500 hover:shadow-md transition-all shrink-0"
                 data-url="${escapeHtml(n.att)}"
                 data-title="Progress Attachment">
              <img src="${escapeHtml(n.att)}" alt="Attachment" class="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'flex flex-col items-center justify-center text-slate-400 h-full p-1 text-center\\'><i class=\\'fa-regular fa-image text-xs text-slate-400 mb-0.5\\'></i><span class=\\'text-[8px] text-slate-400 font-semibold truncate w-full\\'>Photo</span></div>';">
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                <i class="fa-solid fa-magnifying-glass text-white text-xs"></i>
              </div>
            </div>
          </div>
        </div>
      ` : `
        <div class="mt-2 pt-1.5 border-t border-slate-200/80">
          <a href="${escapeHtml(n.att)}" target="_blank" class="inline-flex items-center gap-1.5 px-2 py-1 bg-white text-blue-600 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-blue-50 transition-all">
            <i class="fa-solid fa-paperclip text-slate-400"></i>
            <span>View Attachment</span>
          </a>
        </div>
      `) : '')}
    </div>
  `).join("");

  // Bind lightbox photo click triggers in progressNotesHistoryList
  listEl.querySelectorAll(".comment-photo-trigger").forEach(el => {
    el.addEventListener("click", function (e) {
      e.preventDefault();
      const url = this.getAttribute("data-url");
      const title = this.getAttribute("data-title") || "Progress Photo";
      if (typeof openImagePreview === "function") {
        openImagePreview(url, title);
      }
    });
  });
}

function setPermBadge(badgeId, isWritable, tooltip) {

  const el = document.getElementById(badgeId);

  if (!el) return;

  if (isWritable) {

    el.innerHTML = `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200/80 shadow-2xs" title="${tooltip || 'Editable (Read & Write Permission)'}"><i class="fa-solid fa-pen-to-square text-[9px]"></i> Edit</span>`;

  } else {

    el.innerHTML = `<span class="inline-flex items-center justify-center p-1 rounded-md text-blue-600 hover:text-blue-700 bg-blue-50/70 border border-blue-200/70 shadow-2xs" title="${tooltip || 'View Permission Only'}"><i class="fa-solid fa-eye text-xs font-bold text-blue-600"></i></span>`;

  }

}



function setElementWritable(elementId, isWritable) {

  const el = document.getElementById(elementId);

  if (!el) return;

  if (isWritable) {

    el.removeAttribute("disabled");

    el.removeAttribute("readonly");

    el.classList.remove("bg-slate-100", "cursor-not-allowed", "opacity-80");

  } else {

    if (el.tagName === "SELECT") {

      el.setAttribute("disabled", "disabled");

    } else {

      el.setAttribute("readonly", "readonly");

      el.setAttribute("disabled", "disabled");

    }

    el.classList.add("bg-slate-100", "cursor-not-allowed", "opacity-80");

  }

}



function applyFieldPermissions(data) {

  if (!data) return;

  const isJobActive = (data.isActive !== false);



  // 1. Core Fields: Area, Location, Villa, Expected Date, Reference Number, Job Detail

  // In OPRO-FRONTEND: only Admin, SuperAdmin, OproAdmin can edit core job fields

  const canWriteCore = (typeof UserSession !== "undefined") ? UserSession.isFieldWritable("CORE", data) : true;

  setPermBadge("permBadge_Area", canWriteCore);

  setElementWritable("editAreaName", canWriteCore);



  setPermBadge("permBadge_Location", canWriteCore);

  setElementWritable("editJobLocation", canWriteCore);



  setPermBadge("permBadge_Villa", canWriteCore);

  const villaInput = document.getElementById("editVillaNumber");

  if (villaInput && !canWriteCore) {

    villaInput.setAttribute("disabled", "disabled");

    villaInput.classList.add("bg-slate-100", "cursor-not-allowed", "opacity-80");

  }



  setPermBadge("permBadge_ExpectedDate", canWriteCore);

  setElementWritable("editExpectedCompletion", canWriteCore);



  setPermBadge("permBadge_RefNum", canWriteCore);

  setElementWritable("editRefNum", canWriteCore);



  setPermBadge("permBadge_JobDetail", canWriteCore);

  setElementWritable("editJobDetail", canWriteCore);



  // 2. Remarks (REMARKS):

  const canWriteRemarks = (typeof UserSession !== "undefined") ? UserSession.isFieldWritable("REMARKS", data) : true;

  setPermBadge("permBadge_Remarks", canWriteRemarks);

  setElementWritable("editRemarks", canWriteRemarks);



  // 3. Status (F04):

  const canReadStatus = (typeof UserSession !== "undefined") ? UserSession.isFieldReadable("F04", data) : true;

  const canWriteStatus = (typeof UserSession !== "undefined") ? UserSession.isFieldWritable("F04", data) : true;

  const statusGroup = document.getElementById("editStatusGroup");

  if (!canReadStatus) {

    if (statusGroup) statusGroup.classList.add("hidden");

  } else {

    if (statusGroup) statusGroup.classList.remove("hidden");

    setPermBadge("permBadge_Status", canWriteStatus);

    setElementWritable("editJobStatus", canWriteStatus);

  }



  // 4. Priority (F06):

  const canReadPriority = (typeof UserSession !== "undefined") ? UserSession.isFieldReadable("F06", data) : true;

  const canWritePriority = (typeof UserSession !== "undefined") ? UserSession.isFieldWritable("F06", data) : false;

  const priorityGroup = document.getElementById("editPriorityGroup");

  if (!canReadPriority) {

    if (priorityGroup) priorityGroup.classList.add("hidden");

  } else {

    if (priorityGroup) priorityGroup.classList.remove("hidden");

    setPermBadge("permBadge_Priority", canWritePriority);

    setElementWritable("editJobPriority", canWritePriority);

  }



  // 5. Assigned To (F05):

  const canReadAssigned = (typeof UserSession !== "undefined") ? UserSession.isFieldReadable("F05", data) : true;

  const canWriteAssigned = (typeof UserSession !== "undefined") ? UserSession.isFieldWritable("F05", data) : false;

  const assignedGroup = document.getElementById("editAssignedGroup");

  const assignedBtn = document.getElementById("editAssignedToBtn");

  if (!canReadAssigned) {

    if (assignedGroup) assignedGroup.classList.add("hidden");

  } else {

    if (assignedGroup) assignedGroup.classList.remove("hidden");

    setPermBadge("permBadge_Assigned", canWriteAssigned);

    if (assignedBtn) {

      if (canWriteAssigned) {

        assignedBtn.removeAttribute("disabled");

        assignedBtn.classList.remove("bg-slate-100", "cursor-not-allowed", "pointer-events-none", "opacity-80");

      } else {

        assignedBtn.setAttribute("disabled", "disabled");

        assignedBtn.classList.add("bg-slate-100", "cursor-not-allowed", "pointer-events-none", "opacity-80");

      }

    }

  }



  // 6. Budget & Cost Center (F03):

  const canReadBudget = (typeof UserSession !== "undefined") ? UserSession.isFieldReadable("F03", data) : true;

  const canWriteBudget = (typeof UserSession !== "undefined") ? UserSession.isFieldWritable("F03", data) : false;

  const budgetGroup = document.getElementById("editBudgetGroup");

  const costCenterGroup = document.getElementById("editCostCenterGroup");

  if (!canReadBudget) {

    if (budgetGroup) budgetGroup.classList.add("hidden");

    if (costCenterGroup) costCenterGroup.classList.add("hidden");

    document.getElementById("editCcfDeptContainer")?.classList.add("hidden");

  } else {

    if (budgetGroup) budgetGroup.classList.remove("hidden");

    if (costCenterGroup) costCenterGroup.classList.remove("hidden");

    setPermBadge("permBadge_Budget", canWriteBudget);

    setElementWritable("editBudget", canWriteBudget);

    setPermBadge("permBadge_CostCenter", canWriteBudget);

    setElementWritable("editCostCenter", canWriteBudget);

    setElementWritable("editCcfDept", canWriteBudget);

  }



  // 7. Final Expense (F07):

  const canReadFinalExp = (typeof UserSession !== "undefined") ? UserSession.isFieldReadable("F07", data) : true;

  const canWriteFinalExp = (typeof UserSession !== "undefined") ? UserSession.isFieldWritable("F07", data) : false;

  const finalExpGroup = document.getElementById("editFinalExpGroup");

  if (!canReadFinalExp) {

    if (finalExpGroup) finalExpGroup.classList.add("hidden");

  } else {

    if (finalExpGroup) finalExpGroup.classList.remove("hidden");

    setPermBadge("permBadge_FinalExp", canWriteFinalExp);

    setElementWritable("editFinalExp", canWriteFinalExp);

  }



  // Hide Financial Card if both Budget and Final Expense are not readable

  const financialCard = document.getElementById("editFinancialCard");

  if (financialCard) {

    if (!canReadBudget && !canReadFinalExp) financialCard.classList.add("hidden");

    else financialCard.classList.remove("hidden");

  }



  // 8. Owner Comment (F02):

  // User condition: owner commewnt only oproadmin and superadmin kr sakta admin kr sakta hai

  const canReadOwner = (typeof UserSession !== "undefined") ? UserSession.isFieldReadable("F02", data) : true;

  const canWriteOwner = (typeof UserSession !== "undefined") ? UserSession.canEditOwnerComment(data) : false;

  const ownerCard = document.getElementById("editOwnerCard");

  const ownerInput = document.getElementById("editOwnerComment");

  if (!canReadOwner) {

    if (ownerCard) ownerCard.classList.add("hidden");

  } else {

    if (ownerCard) ownerCard.classList.remove("hidden");

    setPermBadge("permBadge_OwnerComment", canWriteOwner, canWriteOwner ? "Owner Directives (Editable by Admin/SuperAdmin/OproAdmin)" : "Restricted to Admin / SuperAdmin / OproAdmin (View Only)");

    setElementWritable("editOwnerComment", canWriteOwner);

    if (!canWriteOwner && ownerInput) {

      ownerInput.placeholder = "Owner comments are restricted to Admin, SuperAdmin & OproAdmin.";

    }

  }



  // If Job is closed (isActive === false)
  if (!isJobActive) {
    const isOproAdmin = (typeof UserSession !== "undefined" && typeof UserSession.isOproAdmin === "function" && UserSession.isOproAdmin());
    const saveBtn = document.getElementById("saveJobUpdateBtn");
    const saveBtnText = document.getElementById("saveBtnText");
    if (isOproAdmin) {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.classList.remove("opacity-60", "cursor-not-allowed");
      }
      if (saveBtnText) {
        saveBtnText.textContent = "Save Changes (OproAdmin)";
      }
      // Status and Assign To are editable by OproAdmin even when closed
      setPermBadge("permBadge_Status", true);
      setElementWritable("editJobStatus", true);
      setPermBadge("permBadge_Assigned", true);
      const assignedBtn = document.getElementById("editAssignedToBtn");
      if (assignedBtn) {
        assignedBtn.removeAttribute("disabled");
        assignedBtn.classList.remove("bg-slate-100", "cursor-not-allowed", "pointer-events-none", "opacity-80");
      }
    } else {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.classList.add("opacity-60", "cursor-not-allowed");
      }
      if (saveBtnText) {
        saveBtnText.textContent = "Job Closed (Read Only)";
      }
    }
  }

}



function populateEditForm(data) {

  if (!data) return;



  const displayId = data.orgjobId || data.jobId || data.id || currentJobId;



  // Header reference fields

  const displayIdEl = document.getElementById("updateJobDisplayId");

  const propNameEl = document.getElementById("updateJobPropName");

  const createdDateEl = document.getElementById("updateJobCreatedDate");

  const createdByEl = document.getElementById("updateJobCreatedBy");

  const statusBadge = document.getElementById("updateCurrentStatusBadge");

  const priorityBadge = document.getElementById("updateCurrentPriorityBadge");



  if (displayIdEl) displayIdEl.textContent = displayId;

  if (propNameEl) propNameEl.textContent = data.propName || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentPropertyName() : "Main Facility");

  if (createdDateEl) {

    const rawDate = data.jobCreatedOn || data.createdOn || data.openedOn || data.jobDate;

    createdDateEl.textContent = rawDate ? formatDate(rawDate) : "-";

  }

  if (createdByEl) {

    let creator = "";

    if (data.createdBy && data.createdBy !== "-" && data.createdBy !== "null" && data.createdBy !== "undefined") {

      creator = data.createdBy;

    } else if (data.firstname || data.lastname || data.Firstname || data.Lastname) {

      creator = `${data.firstname || data.Firstname || ""} ${data.lastname || data.Lastname || ""}`.trim();

    } else if (data.userId && data.userId !== "null" && data.userId !== "-" && data.userId !== "undefined") {

      creator = data.userId;

    } else if (data.creator || data.created_by) {

      creator = data.creator || data.created_by;

    }

    createdByEl.textContent = creator || "Admin";

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



  // Populate dynamic areas (Only active areas shown, preserving current job area)

  const areaSelect = document.getElementById("editAreaName");

  if (areaSelect && Array.isArray(data.allareas) && data.allareas.length > 0) {

    const curArea = data.areaName || data.area || data.areaID || areaSelect.value;

    areaSelect.innerHTML = `<option value="">Select Area</option>`;

    data.allareas.forEach(a => {

      const isCur = (a.areaid === data.areaID || a.areaName === data.areaName || a.areaName === curArea);

      const isActive = (a.isactive !== false && a.isactive !== 0 && a.isActive !== false && a.isActive !== 0 && a.status !== false && a.status !== 0);

      if (isActive || isCur) {

        const opt = document.createElement("option");

        opt.value = a.areaid || a.areaId || a.areaName;

        opt.textContent = a.areaName + (!isActive ? " (Inactive)" : "");

        areaSelect.appendChild(opt);

      }

    });

    setSelectValue("editAreaName", curArea);

  } else {

    setSelectValue("editAreaName", data.areaName || data.area || "Development/Project");

  }



  // Owner Comment textarea remains BLANK ready for a new comment

  setInputValue("editOwnerComment", "");

  renderOwnerCommentsHistory(data);



  // Render Progress Notes History

  renderProgressNotesHistory(data);

  renderJobUpdateDocumentationPhotos(data);



  // Expected Completion Date: only populate if a real date exists, otherwise clear

  const rawExpected = (data.expectedCompletion || data.expectedDate || "").trim();

  const isAutoOrInvalid = !rawExpected || rawExpected === "TBD" || rawExpected === "-" || rawExpected === "null" || rawExpected.startsWith("0001-01-01");

  setInputValue("editExpectedCompletion", isAutoOrInvalid ? "" : formatDateForInput(rawExpected));



  setInputValue("editRefNum", data.refNum || "");

  setInputValue("editJobLocation", data.jobLocation || data.location || "");



  // Villa Number & Area Toggle

  const hasVillaNumber = data.villaNumber && data.villaNumber !== "-" && data.villaNumber !== "null" && data.villaNumber !== "N/A";

  setInputValue("editVillaNumber", hasVillaNumber ? data.villaNumber : "");

  if (hasVillaNumber) {

    const villaInput = document.getElementById("editVillaNumber");

    if (villaInput) {

      villaInput.disabled = false;

      villaInput.classList.remove("opacity-60", "cursor-not-allowed", "bg-slate-100");

    }

  } else {

    toggleVillaField(data.areaName || data.area || (areaSelect ? areaSelect.value : ""), true);

  }



  // Clean Job Detail & Remarks from raw HTML tags like <div>, <p>, <br>

  setInputValue("editJobDetail", stripHtmlToPlainText(data.jobDetail || data.details || data.description || ""));

  setInputValue("editRemarks", stripHtmlToPlainText(data.remarks && data.remarks !== "null" ? data.remarks : ""));

  setInputValue("editBudget", data.budget || 0);



  // Cost Center & Department Dropdown

  const ccfVal = (data.ccf || data.costCenter || "").trim();

  const ccfDeptVal = (data.ccf_dept || data.ccfdept || data.department || data.dept || "").trim();

  

  let targetCcf = "";

  const upperCcf = ccfVal.toUpperCase();

  if (upperCcf.includes("POMEC")) targetCcf = "POMEC";

  else if (upperCcf.includes("CAPEX")) targetCcf = "CAPEX";

  else if (upperCcf.includes("DEPT") || upperCcf.includes("OPERATIONAL") || upperCcf.includes("BUDGET")) targetCcf = "Department Operational Budget";

  else targetCcf = ccfVal;



  const costCenterSelect = document.getElementById("editCostCenter");

  if (costCenterSelect) {

    if (targetCcf) {

      setSelectValue("editCostCenter", targetCcf);

    } else {

      costCenterSelect.value = "";

    }

  }

  handleEditCcfChange();

  if (ccfDeptVal) {

    setInputValue("editCcfDept", ccfDeptVal);

  }

  if (targetCcf === "Department Operational Budget" && ccfDeptVal) {

    const editDeptInput = document.getElementById("editCcfDept");

    if (editDeptInput) editDeptInput.value = ccfDeptVal;

  }



  setInputValue("editFinalExp", data.finalExp || data.expense || 0);



  // Apply Read & Write field permissions and edit/view icon badges

  applyFieldPermissions(data);

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

    const selectedCostCenter = document.getElementById("editCostCenter")?.value || "";

    const selectedCcfDept = document.getElementById("editCcfDept")?.value?.trim() || "";

    // If user selected a Cost Center, use it. If left unchanged/blank, preserve existing Cost Center from currentJobData.

    const costCenter = selectedCostCenter || (currentJobData ? (currentJobData.ccf || currentJobData.costCenter || "") : "");

    const ccfDept = selectedCcfDept || (currentJobData ? (currentJobData.ccf_dept || currentJobData.ccfdept || "") : "");

    const ownerCommentVal = document.getElementById("editOwnerComment")?.value.trim() || "";

    const newComment = document.getElementById("editNewComment").value;

    const photoFileInput = document.getElementById("editPhotoFile");



    const isClosed = (jobStatus === "CLOSED");



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

    formData.append("ccf", costCenter);

    formData.append("ccfdept", ccfDept);

    formData.append("remarks", remarks);

    formData.append("jobremark", remarks);

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



      // 1b. Update expectedCompletion if provided

      if (expectedCompletion) {

        try {

          const expForm = new FormData();

          expForm.append("propID", propId);

          expForm.append("jobID", rawJobId);

          expForm.append("field", "JB-EXPCOMPDATE");

          expForm.append("data", expectedCompletion);

          await WorkWizeAPI.updateJobFields(expForm);

        } catch (expErr) {

          console.warn("Error updating expected completion:", expErr);

        }

      }



      // 1c. If user modified Owner's Comment or attached owner files, save via JB-OWNERCOMMENT

      if ((ownerCommentVal && ownerCommentVal !== (currentJobData?.owner_comment || "")) || selectedEditOwnerFiles.length > 0) {

        try {

          const ownerForm = new FormData();

          ownerForm.append("propID", propId);

          ownerForm.append("jobID", rawJobId);

          ownerForm.append("areaID", areaName || "");

          ownerForm.append("field", "JB-OWNERCOMMENT");

          ownerForm.append("data", ownerCommentVal || (currentJobData?.owner_comment || ""));



          if (selectedEditOwnerFiles.length > 0) {
            selectedEditOwnerFiles.forEach(f => {
              ownerForm.append("commentMedia", f);
            });
          }

          // Save owner comment and attachments in a single call (prevents duplicate comment entries)
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

      if (newComment.trim() || selectedEditCommentFiles.length > 0) {

        try {

          await WorkWizeAPI.addComment(rawJobId, newComment, selectedEditCommentFiles);

        } catch (commentErr) {

          console.warn("addComment error:", commentErr);

        }

      }

    }



    // Update sessionStorage / localStorage cache for fast display on details page

    try {

      if (currentJobData) {

        currentJobData.jobStatus = jobStatus;

        currentJobData.status = (jobStatus === "COMPLETED") ? "Completed" : jobStatus;

        currentJobData.isActive = (jobStatus !== "CLOSED");

        currentJobData.priority = priority;

        currentJobData.areaName = areaName;

        currentJobData.area = areaName;

        currentJobData.villaNumber = villaNumber;

        currentJobData.jobLocation = jobLocation;

        currentJobData.location = jobLocation;

        currentJobData.refNum = refNum;

        currentJobData.refNo = refNum;

        currentJobData.jobDetail = jobDetail;

        currentJobData.details = jobDetail;

        currentJobData.remarks = remarks;

        currentJobData.budget = Number(budget || 0);

        currentJobData.finalExp = Number(finalExp || 0);

        currentJobData.owner_comment = ownerCommentVal;

        currentJobData.ccf = costCenter;

        currentJobData.costCenter = costCenter;

        currentJobData.ccf_dept = ccfDept;

        currentJobData.ccfdept = ccfDept;

        currentJobData.expectedCompletion = expectedCompletion;

        currentJobData.expectedDate = expectedCompletion;

        currentJobData.teams = selectedAssignees.map(a => ({ teamID: a.id, teamName: a.name }));
        currentJobData.assignedTo = assignedText;
        currentJobData._detailAssignees = selectedAssignees.map(a => a.name);
        sessionStorage.setItem("workwize_current_job_data", JSON.stringify(currentJobData));
        localStorage.setItem("workwize_last_job_data", JSON.stringify(currentJobData));

      }

    } catch (eCache) {

      console.warn("Error updating session cache:", eCache);

    }



    // 3. Update local database cache safely

    try {

      if (typeof WorkWizeDB !== "undefined") {

        WorkWizeDB.updateJob(rawJobId, {

          status: normalizeStatusString(jobStatus),

          priority: normalizePriorityString(priority),

          assignedTo: assignedText,

          teams: selectedAssignees.map(a => ({ teamID: a.id, teamName: a.name })),

          owner_comment: ownerCommentVal,

          ccf: costCenter,

          costCenter: costCenter,

          ccf_dept: ccfDept,

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

    } catch (eDb) {

      console.warn("Error updating local DB:", eDb);

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

  if (s.includes("CLOSE")) return "Closed";

  if (s.includes("COMPLET")) return "Completed";

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





// ==========================================

// Image Preview Lightbox Logic

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

    if (captionEl) captionEl.textContent = "Unable to load image preview. Click 'Open in new tab' to view.";

  };

  imgEl.onload = function() {

    this.style.display = "block";

  };



  if (titleEl) titleEl.textContent = title || "Comment Photo Preview";

  if (captionEl) captionEl.textContent = title || "Comment Attachment";

  if (downloadBtn) downloadBtn.href = url;



  modal.classList.add("open", "active");

  document.body.style.overflow = "hidden";

}



function closeImagePreview() {

  const modal = document.getElementById("imagePreviewModal");

  if (!modal) return;

  modal.classList.remove("open", "active");

  document.body.style.overflow = "";

}



function initImagePreviewModal() {

  const modal = document.getElementById("imagePreviewModal");

  if (!modal) return;



  modal.addEventListener("click", function(e) {

    if (e.target === modal) {

      closeImagePreview();

    }

  });



  document.addEventListener("keydown", function(e) {

    if (e.key === "Escape" && modal.classList.contains("open")) {

      closeImagePreview();

    }

  });



  document.addEventListener("click", function(e) {

    const trigger = e.target.closest(".comment-photo-trigger");

    if (trigger) {

      const url = trigger.getAttribute("data-url");

      const title = trigger.getAttribute("data-title") || "Photo Preview";

      if (url) openImagePreview(url, title);

    }

  });

}



window.openImagePreview = openImagePreview;

window.closeImagePreview = closeImagePreview;





// ==========================================

// Job Documentation & Photos Gallery with Delete

// ==========================================

function collectAllJobUpdatePhotos(data) {

  if (!data) return [];

  const list = [];

  const seenUrls = new Set();



  function pushItems(arr, tag) {

    if (!arr) return;

    const items = Array.isArray(arr) ? arr : [arr];

    items.forEach(item => {

      if (!item) return;

      let url = "";

      let name = "";

      if (typeof item === "string") {

        url = item;

        name = item.split("/").pop();

      } else if (typeof item === "object") {

        url = item.fileurl || item.url || item.path || item.fileName || item.filename || item.image || "";

        name = item.fileName || item.filename || item.name || (url ? url.split("/").pop() : "Photo");

      }

      if (url && typeof url === "string" && !seenUrls.has(url)) {

        seenUrls.add(url);

        list.push({ url, name, tag });

      }

    });

  }



  pushItems(data.uploads, "Job Photo");

  pushItems(data.imageUploads, "Job Photo");

  pushItems(data.attachments, "Attachment");

  pushItems(data.medias, "Media");

  pushItems(data.images, "Photo");

  pushItems(data.jobImages, "Job Photo");

  pushItems(data.open_uploads, "Inspection Photo");

  pushItems(data.close_uploads, "Completion Photo");



  return list;

}



function renderJobUpdateDocumentationPhotos(data) {

  const container = document.getElementById("updateJobUploads");

  const countBadge = document.getElementById("updateUploadsCount");

  if (!container) return;



  const photos = collectAllJobUpdatePhotos(data || currentJobData);

  if (countBadge) {

    countBadge.textContent = `${photos.length} ${photos.length === 1 ? 'File' : 'Files'}`;

  }



  if (photos.length === 0) {

    container.innerHTML = `

      <div class="col-span-2 sm:col-span-3 md:col-span-4 text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">

        <i class="fa-regular fa-image text-slate-300 text-3xl block mb-2"></i>

        <span>No attachment photos uploaded for this job order.</span>

      </div>

    `;

    return;

  }



  container.innerHTML = photos.map((item, idx) => {

    const rawFileName = item.name || "Job_Photo.jpg";

    const cleanFileName = rawFileName.length > 20 ? rawFileName.slice(0, 17) + "..." : rawFileName;

    const isImg = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(rawFileName) ||

                  (item.url && (item.url.startsWith("data:image") || /\.(jpg|jpeg|png|gif|webp|bmp|svg)/i.test(item.url)));

    const isPdf = /\.pdf$/i.test(rawFileName) || (item.url && /\.pdf/i.test(item.url));



    return `

      <div class="group relative rounded-xl overflow-hidden border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all">

        <div 

          class="h-28 w-full overflow-hidden bg-slate-900 flex items-center justify-center relative cursor-pointer comment-photo-trigger"

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

            <button type="button" class="text-[10px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 mt-0.5 comment-photo-trigger" data-url="${escapeHtml(item.url)}" data-title="${escapeHtml(rawFileName)}">

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

}



function removeImageFromClientState(cleanFileName, fileUrl) {

  if (!currentJobData) return;

  const filterArr = arr => {

    if (!Array.isArray(arr)) return arr;

    return arr.filter(item => {

      if (!item) return false;

      const u = typeof item === "string" ? item : (item.fileurl || item.url || item.path || "");

      const n = typeof item === "string" ? item.split("/").pop() : (item.fileName || item.filename || item.name || "");

      if (fileUrl && u === fileUrl) return false;

      if (cleanFileName && n === cleanFileName) return false;

      return true;

    });

  };



  currentJobData.uploads = filterArr(currentJobData.uploads);

  currentJobData.imageUploads = filterArr(currentJobData.imageUploads);

  currentJobData.attachments = filterArr(currentJobData.attachments);

  currentJobData.images = filterArr(currentJobData.images);

  currentJobData.jobImages = filterArr(currentJobData.jobImages);

  currentJobData.medias = filterArr(currentJobData.medias);

  currentJobData.open_uploads = filterArr(currentJobData.open_uploads);

  currentJobData.close_uploads = filterArr(currentJobData.close_uploads);



  try {

    sessionStorage.setItem("workwize_current_job_data", JSON.stringify(currentJobData));

  } catch (_) {}

  renderJobUpdateDocumentationPhotos(currentJobData);

}



async function deleteJobAttachment(fileName, fileUrl) {

  const displayName = fileName || (fileUrl ? fileUrl.split("/").pop() : "this image");

  if (!confirm(`Are you sure you want to permanently delete "${displayName}"? This action cannot be undone.`)) return;



  const propId = currentJobData?.propId || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentProperty() : "");

  const cleanFileName = fileName || (fileUrl ? fileUrl.split("/").pop().split("?")[0] : "");



  if (fileUrl && fileUrl.startsWith("data:")) {

    removeImageFromClientState(cleanFileName, fileUrl);

    showToast("Image removed successfully!", "success");

    return;

  }



  try {

    const rawJobId = currentJobData?.jobId || currentJobData?.orgjobId || currentJobId;

    const formData = new FormData();

    formData.append("fileId", rawJobId);

    formData.append("jobId", rawJobId);

    formData.append("fileName", cleanFileName);

    formData.append("propId", propId);



    await WorkWizeAPI.request("api/jobtracker/deleteupload", {

      method: "POST",

      body: formData

    });



    removeImageFromClientState(cleanFileName, fileUrl);

    showToast("Image deleted successfully!", "success");

  } catch (err) {

    console.warn("Delete image API warning:", err.message);

    removeImageFromClientState(cleanFileName, fileUrl);

    showToast("Image removed from display", "success");

  }

}

window.deleteJobAttachment = deleteJobAttachment;



// ==========================================

// Normal & Owner Comment Attachments with Cross (x) icon

// ==========================================

let selectedEditCommentFiles = [];

let selectedEditOwnerFiles = [];



function handleEditCommentFilesChange(input) {

  const previewList = document.getElementById("editCommentFilesPreviewList");

  if (!previewList) return;

  if (!input.files || input.files.length === 0) {

    selectedEditCommentFiles = [];

    previewList.innerHTML = "";

    return;

  }

  selectedEditCommentFiles = Array.from(input.files);

  renderEditCommentFilesPreview();

}



function removeEditCommentFile(index) {

  selectedEditCommentFiles.splice(index, 1);

  const input = document.getElementById("editPhotoFile");

  if (input && selectedEditCommentFiles.length === 0) input.value = "";

  renderEditCommentFilesPreview();

}



function renderEditCommentFilesPreview() {

  const previewList = document.getElementById("editCommentFilesPreviewList");

  if (!previewList) return;

  if (!selectedEditCommentFiles || selectedEditCommentFiles.length === 0) {

    previewList.innerHTML = "";

    return;

  }

  previewList.innerHTML = selectedEditCommentFiles.map((f, i) => {

    const isImg = f.type.startsWith("image/");

    let thumbHtml = "";

    try {

      if (isImg) thumbHtml = `<img src="${URL.createObjectURL(f)}" class="w-5 h-5 rounded object-cover border border-blue-200" alt="">`;

    } catch (_) {}

    const sizeStr = (f.size / 1024 < 1024) ? `${(f.size / 1024).toFixed(0)}KB` : `${(f.size / (1024 * 1024)).toFixed(1)}MB`;

    return `

      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs font-semibold shadow-2xs">

        ${thumbHtml || `<i class="fa-solid fa-image text-blue-600 text-[10px]"></i>`}

        <span class="max-w-[120px] truncate" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>

        <span class="text-[10px] text-blue-500">(${sizeStr})</span>

        <button type="button" onclick="removeEditCommentFile(${i})" class="w-5 h-5 rounded hover:bg-rose-100 text-rose-500 hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer" title="Delete image">

          <i class="fa-solid fa-trash-can text-[11px]"></i>

        </button>

      </span>

    `;

  }).join("");

}



function handleEditOwnerFilesChange(input) {

  const previewList = document.getElementById("editOwnerFilesPreviewList");

  if (!previewList) return;

  if (!input.files || input.files.length === 0) {

    selectedEditOwnerFiles = [];

    previewList.innerHTML = "";

    return;

  }

  selectedEditOwnerFiles = Array.from(input.files);

  renderEditOwnerFilesPreview();

}



function removeEditOwnerFile(index) {

  selectedEditOwnerFiles.splice(index, 1);

  const input = document.getElementById("editOwnerPhotoFile");

  if (input && selectedEditOwnerFiles.length === 0) input.value = "";

  renderEditOwnerFilesPreview();

}



function renderEditOwnerFilesPreview() {

  const previewList = document.getElementById("editOwnerFilesPreviewList");

  if (!previewList) return;

  if (!selectedEditOwnerFiles || selectedEditOwnerFiles.length === 0) {

    previewList.innerHTML = "";

    return;

  }

  previewList.innerHTML = selectedEditOwnerFiles.map((f, i) => {

    const isImg = f.type.startsWith("image/");

    let thumbHtml = "";

    try {

      if (isImg) thumbHtml = `<img src="${URL.createObjectURL(f)}" class="w-5 h-5 rounded object-cover border border-purple-200" alt="">`;

    } catch (_) {}

    const sizeStr = (f.size / 1024 < 1024) ? `${(f.size / 1024).toFixed(0)}KB` : `${(f.size / (1024 * 1024)).toFixed(1)}MB`;

    return `

      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-100 border border-purple-200 text-purple-900 text-xs font-semibold shadow-2xs">

        ${thumbHtml || `<i class="fa-solid fa-paperclip text-purple-600 text-[10px]"></i>`}

        <span class="max-w-[120px] truncate" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>

        <span class="text-[10px] text-purple-500">(${sizeStr})</span>

        <button type="button" onclick="removeEditOwnerFile(${i})" class="w-5 h-5 rounded hover:bg-rose-100 text-rose-500 hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer" title="Delete file">

          <i class="fa-solid fa-trash-can text-[11px]"></i>

        </button>

      </span>

    `;

  }).join("");

}



window.handleEditCommentFilesChange = handleEditCommentFilesChange;

window.removeEditCommentFile = removeEditCommentFile;

window.handleEditOwnerFilesChange = handleEditOwnerFilesChange;

window.removeEditOwnerFile = removeEditOwnerFile;

