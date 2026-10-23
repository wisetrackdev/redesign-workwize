/**
 * WorkWize Job Details View Logic
 */

document.addEventListener("DOMContentLoaded", function () {
  loadJobDetails();
});

function loadJobDetails() {
  const urlParams = new URLSearchParams(window.location.search);
  const jobId = urlParams.get("id") || "Tes-313026-10738";

  const job = WorkWizeDB.getJobById(jobId) || WorkWizeDB.getJobs()[0];
  if (!job) return;

  // Populate Header & Titles
  document.querySelectorAll(".dyn-job-id").forEach(el => el.textContent = job.id);
  document.querySelectorAll(".dyn-job-title").forEach(el => el.textContent = job.title);
  document.querySelectorAll(".dyn-job-area").forEach(el => el.textContent = job.area);
  document.querySelectorAll(".dyn-job-subarea").forEach(el => el.textContent = job.subArea);
  document.querySelectorAll(".dyn-job-location").forEach(el => el.textContent = job.location || "N/A");
  document.querySelectorAll(".dyn-job-villa").forEach(el => el.textContent = job.villaNumber || "N/A");
  document.querySelectorAll(".dyn-job-opened").forEach(el => el.textContent = job.openedOn);
  document.querySelectorAll(".dyn-job-expected").forEach(el => el.textContent = job.expectedDate || "TBD");
  document.querySelectorAll(".dyn-job-budget").forEach(el => el.textContent = `$${job.budget.toLocaleString()}`);
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

  // Action Buttons
  const markClosedBtn = document.getElementById("detailMarkClosedBtn");
  if (markClosedBtn) {
    markClosedBtn.addEventListener("click", () => {
      WorkWizeDB.updateJob(job.id, { status: "Closed" });
      showToast(`Job ${job.id} marked as Closed!`, "success");
      setTimeout(() => window.location.reload(), 700);
    });
  }

  const markProgressBtn = document.getElementById("detailMarkProgressBtn");
  if (markProgressBtn) {
    markProgressBtn.addEventListener("click", () => {
      WorkWizeDB.updateJob(job.id, { status: "In Progress" });
      showToast(`Job ${job.id} moved to In Progress!`, "success");
      setTimeout(() => window.location.reload(), 700);
    });
  }
}
