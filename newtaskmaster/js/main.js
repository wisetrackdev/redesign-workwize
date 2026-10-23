/**
 * WorkWize Main App Navigation, Modal & Global Controls
 */

document.addEventListener("DOMContentLoaded", function () {
  initActiveSidebarLink();
  initTopHeaderSearch();
  initAddJobModal();
  initUserDropdown();
});

// Highlight active sidebar item according to URL
function initActiveSidebarLink() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".sidebar-nav-item");

  navLinks.forEach(link => {
    const href = link.getAttribute("href");
    if (href === currentPath || (currentPath === "index.html" && href === "dashboard.html")) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

// User Profile dropdown
function initUserDropdown() {
  const userBtn = document.getElementById("userProfileBtn");
  const userMenu = document.getElementById("userProfileMenu");

  if (userBtn && userMenu) {
    userBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      userMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", function () {
      userMenu.classList.add("hidden");
    });
  }
}

// Global top-header search
function initTopHeaderSearch() {
  const headerSearchInput = document.getElementById("globalSearchInput");
  if (!headerSearchInput) return;

  headerSearchInput.addEventListener("keyup", function (e) {
    const term = e.target.value.trim();
    if (e.key === "Enter") {
      // If we are not on all-jobs.html, navigate there with search query
      const currentPath = window.location.pathname.split("/").pop() || "index.html";
      if (!currentPath.includes("all-jobs.html")) {
        window.location.href = `all-jobs.html?search=${encodeURIComponent(term)}`;
      }
    }
  });
}

// Global Modal Controls & Multi-Step Logic
let currentStep = 1;

function initAddJobModal() {
  const openModalBtns = document.querySelectorAll(".btn-open-job-modal");
  const modal = document.getElementById("addJobModal");
  const closeBtn = document.getElementById("closeJobModalBtn");
  const cancelBtn = document.getElementById("cancelJobModalBtn");
  const nextBtn = document.getElementById("nextJobModalBtn");
  const prevBtn = document.getElementById("prevJobModalBtn");
  const jobForm = document.getElementById("addJobForm");

  if (!modal) return;

  // Open modal triggers
  openModalBtns.forEach(btn => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      openModal();
    });
  });

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  // Close on outside click
  modal.addEventListener("click", function (e) {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Step Navigation
  if (nextBtn) {
    nextBtn.addEventListener("click", function () {
      if (currentStep < 3) {
        if (validateStep(currentStep)) {
          setStep(currentStep + 1);
        }
      } else {
        // Submit Job
        submitJobForm();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      if (currentStep > 1) {
        setStep(currentStep - 1);
      }
    });
  }

  // File upload drag & drop preview
  initFileUpload();
}

function openModal() {
  const modal = document.getElementById("addJobModal");
  if (!modal) return;
  modal.classList.add("open");
  setStep(1);
  // Auto set today's date
  const today = new Date().toISOString().split("T")[0];
  const creationDateInput = document.getElementById("modalJobCreationDate");
  if (creationDateInput && !creationDateInput.value) {
    creationDateInput.value = today;
  }
}

function closeModal() {
  const modal = document.getElementById("addJobModal");
  if (!modal) return;
  modal.classList.remove("open");
}

function setStep(stepNum) {
  currentStep = stepNum;

  // Update step indicators
  for (let i = 1; i <= 3; i++) {
    const circle = document.getElementById(`stepCircle${i}`);
    const content = document.getElementById(`stepContent${i}`);
    const textLabel = document.getElementById(`stepLabel${i}`);

    if (circle && content) {
      if (i === currentStep) {
        circle.className = "stepper-circle active";
        content.classList.remove("hidden");
        if (textLabel) textLabel.className = "text-sm font-semibold text-blue-600";
      } else if (i < currentStep) {
        circle.className = "stepper-circle completed";
        circle.innerHTML = '<i class="fa-solid fa-check text-xs"></i>';
        content.classList.add("hidden");
        if (textLabel) textLabel.className = "text-sm font-medium text-slate-700";
      } else {
        circle.className = "stepper-circle inactive";
        circle.textContent = i;
        content.classList.add("hidden");
        if (textLabel) textLabel.className = "text-sm font-medium text-slate-400";
      }
    }
  }

  // Buttons update
  const prevBtn = document.getElementById("prevJobModalBtn");
  const nextBtn = document.getElementById("nextJobModalBtn");

  if (prevBtn) {
    if (currentStep === 1) {
      prevBtn.classList.add("hidden");
    } else {
      prevBtn.classList.remove("hidden");
    }
  }

  if (nextBtn) {
    if (currentStep === 3) {
      nextBtn.innerHTML = '<i class="fa-solid fa-check mr-1.5"></i> Create Job';
      nextBtn.classList.remove("btn-primary");
      nextBtn.classList.add("bg-emerald-600", "hover:bg-emerald-700", "text-white");
    } else {
      nextBtn.innerHTML = 'Next <i class="fa-solid fa-arrow-right ml-1.5 text-xs"></i>';
      nextBtn.classList.add("btn-primary");
      nextBtn.classList.remove("bg-emerald-600", "hover:bg-emerald-700");
    }
  }
}

function validateStep(step) {
  if (step === 1) {
    const area = document.getElementById("modalArea")?.value;
    const villa = document.getElementById("modalVillaNumber")?.value;
    const priority = document.getElementById("modalPriority")?.value;
    const location = document.getElementById("modalLocation")?.value;

    if (!area) {
      showToast("Please select an Area", "error");
      return false;
    }
    if (!villa) {
      showToast("Please enter Villa Number", "error");
      return false;
    }
    if (!location) {
      showToast("Please enter Job Location", "error");
      return false;
    }
  }
  return true;
}

function submitJobForm() {
  const area = document.getElementById("modalArea")?.value || "Statutory Compliance";
  const villa = document.getElementById("modalVillaNumber")?.value || "V-101";
  const priority = document.getElementById("modalPriority")?.value || "Medium";
  const location = document.getElementById("modalLocation")?.value || "Main Building";
  const creationDate = document.getElementById("modalJobCreationDate")?.value || new Date().toISOString().split("T")[0];
  const completionDate = document.getElementById("modalExpectedDate")?.value || "2026-11-15";
  const status = document.getElementById("modalStatus")?.value || "Yet to Commence";
  const refNo = document.getElementById("modalReferenceNo")?.value || `REF-${Math.floor(10000 + Math.random() * 90000)}`;

  const assignedTo = document.getElementById("modalAssignedTo")?.value || "IT Admin";
  const budget = parseFloat(document.getElementById("modalBudget")?.value) || 500;
  const costCenter = document.getElementById("modalCostCenter")?.value || "CC-01";
  const details = document.getElementById("modalJobDetails")?.value || "Routine maintenance and review";
  const remarks = document.getElementById("modalRemarks")?.value || "Assigned via quick portal.";

  // Generate ID matching pattern: Tes-DDMMYY-XXXXX
  const now = new Date();
  const dayStr = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0') + String(now.getFullYear()).slice(-2);
  const randFive = Math.floor(10000 + Math.random() * 90000);
  const newId = `Tes-${dayStr}-${randFive}`;

  const newJob = {
    id: newId,
    title: `${area} - ${details.slice(0, 30)}...`,
    area: area,
    subArea: area.split("/")[0] || area,
    status: status,
    priority: priority,
    assignedTo: assignedTo,
    openedOn: creationDate,
    expectedDate: completionDate,
    villaNumber: villa,
    location: location,
    budget: budget,
    costCenter: costCenter,
    safetyIssues: 0,
    details: details,
    remarks: remarks
  };

  WorkWizeDB.addJob(newJob);
  closeModal();
  showToast(`New Job ${newId} created successfully!`, "success");

  // Reload or trigger dynamic update if on jobs or all-jobs page
  if (typeof renderAllJobsTable === "function") {
    renderAllJobsTable();
  } else if (typeof renderJobsByAreaTable === "function") {
    renderJobsByAreaTable();
  } else if (typeof updateDashboardStats === "function") {
    updateDashboardStats();
  } else {
    setTimeout(() => {
      window.location.reload();
    }, 900);
  }
}

// File upload drag & drop
function initFileUpload() {
  const dropZone = document.getElementById("fileDropZone");
  const fileInput = document.getElementById("fileUploadInput");
  const fileList = document.getElementById("uploadedFileList");

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener("click", () => fileInput.click());

  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("border-blue-500", "bg-blue-50");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("border-blue-500", "bg-blue-50");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("border-blue-500", "bg-blue-50");
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  });

  function handleFiles(files) {
    if (!fileList) return;
    fileList.innerHTML = "";
    Array.from(files).forEach(f => {
      const item = document.createElement("div");
      item.className = "flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mt-2";
      item.innerHTML = `
        <span class="flex items-center gap-2 font-medium text-slate-700 truncate">
          <i class="fa-regular fa-file-image text-blue-600"></i> ${f.name} (${(f.size / 1024).toFixed(1)} KB)
        </span>
        <i class="fa-solid fa-circle-check text-emerald-500"></i>
      `;
      fileList.appendChild(item);
    });
  }
}

// Global Toast Banner
function showToast(message, type = "success") {
  let toast = document.getElementById("globalToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "globalToast";
    toast.className = "toast-notice";
    document.body.appendChild(toast);
  }

  const icon = type === "success" 
    ? '<i class="fa-solid fa-circle-check text-emerald-400 text-lg"></i>' 
    : '<i class="fa-solid fa-circle-exclamation text-rose-400 text-lg"></i>';

  toast.innerHTML = `${icon} <span class="font-medium text-sm">${message}</span>`;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3500);
}

window.showToast = showToast;
window.openModal = openModal;
window.closeModal = closeModal;
