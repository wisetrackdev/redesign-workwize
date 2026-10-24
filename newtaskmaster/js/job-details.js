/**
 * WorkWize Job Details View Logic
 * Backend API connected with local fallback
 */

let currentJobId = "";
let currentJobData = null;

document.addEventListener("DOMContentLoaded", function () {
  const urlParams = new URLSearchParams(window.location.search);
  currentJobId = urlParams.get("id") || urlParams.get("jobid") || "Tes-313026-10738";

  loadJobDetails(currentJobId);
  initCommentBox();
});

async function loadJobDetails(jobId) {
  let loadedFromAPI = false;

  if (typeof WorkWizeAPI !== "undefined" && jobId) {
    try {
      const res = await WorkWizeAPI.getJobById(jobId);
      if (res && res.success && res.jobdata) {
        currentJobData = res.jobdata;
        renderJobDataFromAPI(res.jobdata, res.role);
        loadedFromAPI = true;
      }
    } catch (err) {
      console.warn("Could not fetch job from API, using local fallback:", err);
    }
  }

  if (!loadedFromAPI) {
    const job = (typeof WorkWizeDB !== "undefined") 
      ? (WorkWizeDB.getJobById(jobId) || WorkWizeDB.getJobs()[0]) 
      : null;
    if (job) {
      renderJobDataFromLocal(job);
    }
  }

  initActionButtons(jobId);
}

function renderJobDataFromAPI(data, role) {
  const displayId = data.orgjobId || data.jobId || currentJobId;
  const isClosed = data.isActive === false || Boolean(data.jobCloseOn);

  // Status mapping
  let statusText = "In Progress";
  let statusCls = "badge-in-progress";

  if (isClosed) {
    statusText = "Closed";
    statusCls = "badge-closed";
  } else {
    const s = (data.jobStatus || "").toUpperCase().trim();
    if (s === "YET_TO_COMMENCE" || s.includes("YET")) {
      statusText = "Yet to Commence";
      statusCls = "badge-yet-to-commence";
    } else if (s === "UNDER_DISCUSSION" || s.includes("DISCUSSION")) {
      statusText = "Under Discussion";
      statusCls = "badge-under-discussion";
    } else if (s === "SAFETY_ISSUE" || s.includes("SAFETY")) {
      statusText = "Safety Issue";
      statusCls = "badge-closed";
    } else if (s === "SPARES_ON_ORDER") {
      statusText = "Spares on Order";
      statusCls = "badge-under-discussion";
    }
  }

  // Priority mapping
  const p = (data.priority || "MEDIUM").toUpperCase().trim();
  let priorityText = "Medium";
  let priorityCls = "badge-priority-medium";
  if (p === "HIGH") {
    priorityText = "High";
    priorityCls = "badge-priority-high";
  } else if (p === "LOW") {
    priorityText = "Low";
    priorityCls = "badge-priority-low";
  } else if (p === "SAFETY") {
    priorityText = "Safety";
    priorityCls = "badge-priority-high";
  }

  // Assigned text
  let assignedText = "Unassigned";
  if (Array.isArray(data.teams) && data.teams.length > 0) {
    assignedText = data.teams.join(", ");
  }

  // Populate dynamic header and text fields
  document.querySelectorAll(".dyn-job-id").forEach(el => el.textContent = displayId);
  document.querySelectorAll(".dyn-job-title").forEach(el => el.textContent = `${data.areaName || "Operational"} - ${data.jobDetail ? data.jobDetail.slice(0, 45) : "Work Order"}`);
  document.querySelectorAll(".dyn-job-area").forEach(el => el.textContent = data.areaName || "General Area");
  document.querySelectorAll(".dyn-job-subarea").forEach(el => el.textContent = data.propName ? `[${data.propName}]` : "Operational Section");
  document.querySelectorAll(".dyn-job-location").forEach(el => el.textContent = data.jobLocation || "N/A");
  document.querySelectorAll(".dyn-job-villa").forEach(el => el.textContent = data.villaNumber || "N/A");
  document.querySelectorAll(".dyn-job-opened").forEach(el => el.textContent = data.jobCreatedOn || "N/A");
  document.querySelectorAll(".dyn-job-expected").forEach(el => el.textContent = data.expectedCompletion || "TBD");
  document.querySelectorAll(".dyn-job-budget").forEach(el => el.textContent = data.budget ? `$${Number(data.budget).toLocaleString()}` : "$0");
  document.querySelectorAll(".dyn-job-costcenter").forEach(el => el.textContent = data.ccf || "CC-01");
  document.querySelectorAll(".dyn-job-assigned").forEach(el => el.textContent = assignedText);
  document.querySelectorAll(".dyn-job-details").forEach(el => el.textContent = data.jobDetail || "No extra details provided.");
  document.querySelectorAll(".dyn-job-remarks").forEach(el => el.textContent = data.remarks || "No remarks noted.");

  // Badges
  const statusEl = document.getElementById("dynJobStatus");
  if (statusEl) {
    statusEl.className = `badge-status ${statusCls}`;
    statusEl.textContent = statusText;
  }

  const priorityEl = document.getElementById("dynJobPriority");
  if (priorityEl) {
    priorityEl.className = `badge-priority ${priorityCls}`;
    priorityEl.textContent = priorityText;
  }

  // Render Attachments / Photos
  renderAttachments(data.uploads, data.propImg);

  // Render Comments
  renderCommentsList(data.comments, data.admin_comment, data.owner_comment, data.jobCloseOn, data.jobCloseBy);

  // If closed, disable action buttons
  if (isClosed) {
    const markClosedBtn = document.getElementById("detailMarkClosedBtn");
    const markProgressBtn = document.getElementById("detailMarkProgressBtn");
    if (markClosedBtn) {
      markClosedBtn.disabled = true;
      markClosedBtn.classList.add("opacity-50", "cursor-not-allowed");
      markClosedBtn.innerHTML = '<i class="fa-solid fa-lock text-xs mr-1"></i> Job Closed';
    }
    if (markProgressBtn) {
      markProgressBtn.disabled = true;
      markProgressBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
  }
}

function renderJobDataFromLocal(job) {
  document.querySelectorAll(".dyn-job-id").forEach(el => el.textContent = job.id);
  document.querySelectorAll(".dyn-job-title").forEach(el => el.textContent = job.title);
  document.querySelectorAll(".dyn-job-area").forEach(el => el.textContent = job.area);
  document.querySelectorAll(".dyn-job-subarea").forEach(el => el.textContent = job.subArea);
  document.querySelectorAll(".dyn-job-location").forEach(el => el.textContent = job.location || "N/A");
  document.querySelectorAll(".dyn-job-villa").forEach(el => el.textContent = job.villaNumber || "N/A");
  document.querySelectorAll(".dyn-job-opened").forEach(el => el.textContent = job.openedOn);
  document.querySelectorAll(".dyn-job-expected").forEach(el => el.textContent = job.expectedDate || "TBD");
  document.querySelectorAll(".dyn-job-budget").forEach(el => el.textContent = `$${Number(job.budget || 0).toLocaleString()}`);
  document.querySelectorAll(".dyn-job-costcenter").forEach(el => el.textContent = job.costCenter || "CC-01");
  document.querySelectorAll(".dyn-job-assigned").forEach(el => el.textContent = job.assignedTo);
  document.querySelectorAll(".dyn-job-details").forEach(el => el.textContent = job.details || "No extra details provided.");
  document.querySelectorAll(".dyn-job-remarks").forEach(el => el.textContent = job.remarks || "No remarks noted.");

  // Badges
  const statusEl = document.getElementById("dynJobStatus");
  if (statusEl) {
    let cls = "badge-in-progress";
    if (job.status === "Yet to Commence") cls = "badge-yet-to-commence";
    else if (job.status === "Under Discussion") cls = "badge-under-discussion";
    else if (job.status === "Closed") cls = "badge-closed";
    statusEl.className = `badge-status ${cls}`;
    statusEl.textContent = job.status;
  }

  const priorityEl = document.getElementById("dynJobPriority");
  if (priorityEl) {
    let pCls = "badge-priority-low";
    if (job.priority.toLowerCase() === "high") pCls = "badge-priority-high";
    else if (job.priority.toLowerCase() === "medium") pCls = "badge-priority-medium";
    priorityEl.className = `badge-priority ${pCls}`;
    priorityEl.textContent = job.priority;
  }
}

function renderAttachments(uploads, propImg) {
  const container = document.getElementById("dynJobUploads");
  if (!container) return;

  const allImages = [];
  if (Array.isArray(propImg)) allImages.push(...propImg);
  if (Array.isArray(uploads)) allImages.push(...uploads);

  if (allImages.length === 0) {
    container.innerHTML = `
      <div class="col-span-3 text-center py-4 text-xs text-slate-400">
        <i class="fa-regular fa-image text-slate-300 text-2xl block mb-1"></i>
        No attachment files uploaded for this job.
      </div>
    `;
    return;
  }

  container.innerHTML = allImages.map((imgUrl, i) => {
    const fileName = imgUrl.split("/").pop() || `Attachment_${i + 1}.jpg`;
    return `
      <a href="${imgUrl}" target="_blank" class="border border-slate-200 rounded-xl p-3 flex items-center gap-3 bg-slate-50 hover:bg-blue-50/50 hover:border-blue-300 transition-colors">
        <i class="fa-regular fa-image text-2xl text-blue-500 shrink-0"></i>
        <div class="truncate text-xs">
          <span class="font-semibold text-slate-800 block truncate">${fileName}</span>
          <span class="text-[10px] text-slate-400">View file</span>
        </div>
      </a>
    `;
  }).join("");
}

function renderCommentsList(comments, adminComment, ownerComment, closeOn, closeBy) {
  const container = document.getElementById("dynJobComments");
  const countEl = document.getElementById("dynCommentsCount");
  if (!container) return;

  const list = [];

  // Admin closing comment
  if (adminComment) {
    list.push({
      firstName: "ADMIN SIGN-OFF",
      lastName: closeBy ? `[${closeBy}]` : "",
      commentDate: closeOn || "N/A",
      commentDetail: adminComment,
      isAdmin: true
    });
  }

  // Owner comment
  if (ownerComment) {
    list.push({
      firstName: "OWNER COMMENT",
      lastName: "",
      commentDate: "N/A",
      commentDetail: ownerComment,
      isOwner: true
    });
  }

  // Regular comments
  if (Array.isArray(comments)) {
    comments.forEach(c => list.push(c));
  }

  if (countEl) {
    countEl.textContent = `${list.length} ${list.length === 1 ? "Comment" : "Comments"}`;
  }

  if (list.length === 0) {
    container.innerHTML = `
      <p class="text-xs text-slate-400 italic text-center py-4">No comments or activity log yet.</p>
    `;
    return;
  }

  container.innerHTML = list.map(c => {
    const author = `${c.firstName || "Technician"} ${c.lastName || ""}`.trim();
    const dateStr = c.commentDate || "Recently";
    const detail = c.commentDetail || "";
    const badgeColor = c.isAdmin ? "bg-rose-100 text-rose-700" : (c.isOwner ? "bg-purple-100 text-purple-700" : "bg-slate-100 text-slate-700");

    return `
      <div class="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-bold ${badgeColor}">${author}</span>
          </div>
          <span class="text-[10px] text-slate-400">${dateStr}</span>
        </div>
        <p class="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">${detail}</p>
      </div>
    `;
  }).join("");
}

function initActionButtons(jobId) {
  const markClosedBtn = document.getElementById("detailMarkClosedBtn");
  const markProgressBtn = document.getElementById("detailMarkProgressBtn");

  if (markClosedBtn) {
    markClosedBtn.addEventListener("click", async () => {
      if (!confirm("Are you sure you want to mark this job as Completed/Closed?")) return;

      if (typeof WorkWizeAPI !== "undefined") {
        try {
          const form = new FormData();
          form.append("jobId", jobId);
          form.append("jobStatus", "COMPLETED");
          form.append("isActive", "false");
          await WorkWizeAPI.updateJobFields(form);
        } catch (e) {
          console.warn("API error updating status, fallback to local:", e);
        }
      }

      if (typeof WorkWizeDB !== "undefined") {
        WorkWizeDB.updateJob(jobId, { status: "Closed" });
      }

      showToast(`Job ${jobId} marked as Closed!`, "success");
      setTimeout(() => window.location.reload(), 700);
    });
  }

  if (markProgressBtn) {
    markProgressBtn.addEventListener("click", async () => {
      if (typeof WorkWizeAPI !== "undefined") {
        try {
          const form = new FormData();
          form.append("jobId", jobId);
          form.append("jobStatus", "IN_PROGRESS");
          await WorkWizeAPI.updateJobFields(form);
        } catch (e) {
          console.warn("API error updating status, fallback to local:", e);
        }
      }

      if (typeof WorkWizeDB !== "undefined") {
        WorkWizeDB.updateJob(jobId, { status: "In Progress" });
      }

      showToast(`Job ${jobId} moved to In Progress!`, "success");
      setTimeout(() => window.location.reload(), 700);
    });
  }
}

function initCommentBox() {
  const submitBtn = document.getElementById("submitCommentBtn");
  const commentInput = document.getElementById("newCommentInput");
  const fileInput = document.getElementById("commentFileInput");
  const fileLabel = document.getElementById("commentFileLabel");

  if (!submitBtn || !commentInput) return;

  if (fileInput && fileLabel) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        fileLabel.textContent = fileInput.files[0].name.slice(0, 15) + "...";
      } else {
        fileLabel.textContent = "Attach Image";
      }
    });
  }

  submitBtn.addEventListener("click", async () => {
    const text = commentInput.value.trim();
    if (!text) {
      showToast("Please write a comment first", "error");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Posting...';

    let success = false;

    if (typeof WorkWizeAPI !== "undefined" && currentJobId) {
      try {
        const formData = new FormData();
        formData.append("jobId", currentJobId);
        formData.append("comment", text);
        if (fileInput && fileInput.files.length > 0) {
          formData.append("commentImages", fileInput.files[0]);
        }

        const res = await WorkWizeAPI.addComment(formData);
        if (res) {
          success = true;
        }
      } catch (err) {
        console.warn("API addComment error:", err);
      }
    }

    commentInput.value = "";
    if (fileInput) fileInput.value = "";
    if (fileLabel) fileLabel.textContent = "Attach Image";

    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane mr-1 text-[10px]"></i> Send Comment';

    showToast("Comment added successfully!", "success");

    // Reload job details to show fresh comment
    loadJobDetails(currentJobId);
  });
}
