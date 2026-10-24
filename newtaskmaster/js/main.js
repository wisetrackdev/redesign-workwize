/**
 * WorkWize Main App Navigation, Modal & Global Controls
 */

document.addEventListener("DOMContentLoaded", function () {
  initActiveSidebarLink();
  initSidebarToggle();
  initTopHeaderSearch();
  initPropertyDropdown();
  initAddJobModal();
  initUserDropdown();
});

// Highlight active sidebar item according to URL & on click set active blue
function initActiveSidebarLink() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const navLinks = document.querySelectorAll(".sidebar-nav-item");

  navLinks.forEach(link => {
    const href = link.getAttribute("href");
    const isJobByArea = (currentPath === "job-by-area.html" || currentPath === "jobs.html") && (href === "job-by-area.html" || href === "jobs.html");
    const isDashboard = (currentPath === "index.html" || currentPath === "dashboard.html") && href === "dashboard.html";

    if (href === currentPath || isJobByArea || isDashboard) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }

    // Click handler to immediately set active state and blue background
    link.addEventListener("click", function () {
      navLinks.forEach(item => item.classList.remove("active"));
      this.classList.add("active");
    });
  });
}

// Sidebar collapse & expand functionality
function initSidebarToggle() {
  const sidebar = document.querySelector(".workwize-sidebar");
  const toggleBtns = document.querySelectorAll(".sidebar-toggle-btn");

  if (!sidebar || !toggleBtns.length) return;

  // Restore state from localStorage
  const isCollapsed = localStorage.getItem("workwize_sidebar_collapsed") === "true";
  if (isCollapsed) {
    sidebar.classList.add("collapsed");
    toggleBtns.forEach(btn => {
      const icon = btn.querySelector("i");
      if (icon) {
        icon.className = "fa-solid fa-chevron-right";
      }
    });
  }

  toggleBtns.forEach(btn => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      const collapsed = sidebar.classList.toggle("collapsed");
      localStorage.setItem("workwize_sidebar_collapsed", collapsed ? "true" : "false");

      toggleBtns.forEach(b => {
        const icon = b.querySelector("i");
        if (icon) {
          icon.className = collapsed ? "fa-solid fa-chevron-right" : "fa-solid fa-chevron-left";
        }
      });
    });
  });
}

// User Profile dropdown & dynamic session display
function initUserDropdown() {
  const userBtn = document.getElementById("userProfileBtn");
  const userMenu = document.getElementById("userProfileMenu");

  // Sync user info from session
  let userEmail = "admin@workwize.io";
  let userRole = "Admin";
  let userName = "Admin";

  if (typeof UserSession !== "undefined") {
    userEmail = UserSession.getUserEmail();
    userRole = UserSession.getUserRole();
    userName = UserSession.getUserName();
  } else if (typeof WorkWizeAPI !== "undefined" && WorkWizeAPI.getStoredUserData()) {
    const u = WorkWizeAPI.getStoredUserData();
    userEmail = u.email || u.username || userEmail;
    userRole = u.desg || (Array.isArray(u.role) ? u.role[0] : u.role) || userRole;
    userName = u.name || userEmail.split("@")[0];
  }

  // Update outer header profile display
  if (userBtn) {
    const nameSpan = userBtn.querySelector(".header-user-display-name") || userBtn.querySelector("span.text-xs.font-bold");
    const roleSpan = userBtn.querySelector(".header-user-display-role") || userBtn.querySelector("span.text-\\[10px\\]");

    if (nameSpan) {
      nameSpan.textContent = userEmail;
      nameSpan.title = userEmail;
      nameSpan.classList.add("truncate", "max-w-[140px]");
    }
    if (roleSpan) {
      roleSpan.textContent = userRole;
    }
  }

  // Update dropdown menu items
  if (userMenu) {
    const menuName = userMenu.querySelector(".header-menu-user-name") || userMenu.querySelector("p.font-semibold");
    const menuEmail = userMenu.querySelector(".header-menu-user-email") || userMenu.querySelector("p.text-\\[11px\\]");

    if (menuName) menuName.textContent = `${userName} [${userRole}]`;
    if (menuEmail) menuEmail.textContent = userEmail;
  }

  if (userBtn && userMenu) {
    userBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      userMenu.classList.toggle("hidden");
    });

    document.addEventListener("click", function () {
      userMenu.classList.add("hidden");
    });

    const logoutBtn = userMenu.querySelector('a[href="login.html"]');
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function (e) {
        if (typeof WorkWizeAPI !== "undefined") {
          WorkWizeAPI.logout();
        }
      });
    }
  }
}

// Global Top-Header Property Selector (Mirrors taskmaster #nav-bar-prp-selector)
async function initPropertyDropdown() {
  const btn = document.getElementById("headerPropertyDropdownBtn");
  const menu = document.getElementById("headerPropertyMenu");
  const nameSpan = document.getElementById("headerCurrentPropertyName");
  const listContainer = document.getElementById("headerPropertyList");

  if (!btn || !menu) return;

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    menu.classList.toggle("hidden");
  });

  document.addEventListener("click", function () {
    menu.classList.add("hidden");
  });

  if (typeof WorkWizeAPI !== "undefined") {
    try {
      const properties = await WorkWizeAPI.getAllProperties();
      if (Array.isArray(properties) && properties.length > 0) {
        let currentPropId = WorkWizeAPI.getCurrentProperty();
        let currentProp = properties.find(p => p.propId === currentPropId) || properties[0];

        if (!currentPropId && currentProp) {
          WorkWizeAPI.setCurrentProperty(currentProp.propId, currentProp.propName);
          currentPropId = currentProp.propId;
        }

        if (nameSpan && currentProp) {
          nameSpan.textContent = currentProp.propName;
        }

        if (listContainer) {
          listContainer.innerHTML = "";
          properties.forEach(p => {
            const isSelected = p.propId === currentPropId;
            const item = document.createElement("button");
            item.type = "button";
            item.className = `w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-xs transition-colors ${
              isSelected ? "bg-blue-50 font-bold text-blue-600" : "hover:bg-slate-50 text-slate-700"
            }`;
            item.innerHTML = `
              <span class="truncate flex items-center gap-2">
                <i class="fa-solid fa-hotel ${isSelected ? 'text-blue-600' : 'text-slate-400'} text-xs"></i>
                <span class="truncate">${p.propName}</span>
              </span>
              ${isSelected ? '<i class="fa-solid fa-circle-check text-blue-600 text-xs"></i>' : ''}
            `;

            item.addEventListener("click", function (e) {
              e.stopPropagation();
              WorkWizeAPI.setCurrentProperty(p.propId, p.propName);
              if (nameSpan) nameSpan.textContent = p.propName;
              menu.classList.add("hidden");

              // Refresh list rendering with new active state
              initPropertyDropdown();

              // Notify all pages and modules of property switch
              window.dispatchEvent(new CustomEvent("workwize:propertyChanged", {
                detail: { propId: p.propId, propName: p.propName }
              }));
            });

            listContainer.appendChild(item);
          });
        }
      } else {
        if (nameSpan) nameSpan.textContent = WorkWizeAPI.getCurrentPropertyName() || "Main Facility";
      }
    } catch (e) {
      console.warn("Could not load properties for header dropdown:", e);
      if (nameSpan) nameSpan.textContent = WorkWizeAPI.getCurrentPropertyName() || "Main Facility";
    }
  }
}

window.initPropertyDropdown = initPropertyDropdown;

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
let modalUploadFiles = [];

function initAddJobModal() {
  const openModalBtns = document.querySelectorAll(".btn-open-job-modal");
  const modal = document.getElementById("addJobModal");
  const closeBtn = document.getElementById("closeJobModalBtn");
  const cancelBtn = document.getElementById("cancelJobModalBtn");
  const nextBtn = document.getElementById("nextJobModalBtn");
  const prevBtn = document.getElementById("prevJobModalBtn");

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

  // Attach Area & CCF change listeners
  const areaSelect = document.getElementById("modalArea");
  if (areaSelect) {
    areaSelect.addEventListener("change", handleModalAreaChange);
  }
  const ccfSelect = document.getElementById("modalCostCenter");
  if (ccfSelect) {
    ccfSelect.addEventListener("change", handleModalCcfChange);
  }
}

// Handle Guest Villa condition
function handleModalAreaChange() {
  const areaSelect = document.getElementById("modalArea");
  const villaInput = document.getElementById("modalVillaNumber");
  const villaRequired = document.getElementById("villaRequiredMark");
  if (!areaSelect || !villaInput) return;

  const selectedText = (areaSelect.options[areaSelect.selectedIndex]?.text || "").toUpperCase().trim();
  const selectedVal = (areaSelect.value || "").toUpperCase().trim();

  if (selectedText.includes("GUEST VILLA") || selectedVal.includes("GUEST VILLA")) {
    villaInput.disabled = false;
    villaInput.classList.remove("disabled:opacity-60", "disabled:cursor-not-allowed");
    if (villaRequired) villaRequired.classList.remove("hidden");
  } else {
    villaInput.disabled = true;
    villaInput.value = "";
    if (villaRequired) villaRequired.classList.add("hidden");
  }
}

// Handle CCF Department condition
function handleModalCcfChange() {
  const ccfSelect = document.getElementById("modalCostCenter");
  const deptContainer = document.getElementById("modalCcfDeptContainer");
  const deptInput = document.getElementById("modalCcfDept");
  if (!ccfSelect || !deptContainer) return;

  if (ccfSelect.value === "Department Operational Budget") {
    deptContainer.classList.remove("hidden");
  } else {
    deptContainer.classList.add("hidden");
    if (deptInput) deptInput.value = "";
  }
}

// Populate Area & Assignee dropdowns dynamically from API (getpropinfo)
async function populateModalDropdowns() {
  const areaSelect = document.getElementById("modalArea");
  const assignedSelect = document.getElementById("modalAssignedTo");
  if (!areaSelect && !assignedSelect) return;

  if (typeof WorkWizeAPI !== "undefined") {
    const propId = WorkWizeAPI.getCurrentProperty();
    try {
      const data = await WorkWizeAPI.getPropertyInfo(propId);
      if (data) {
        // Populate Area
        if (areaSelect && Array.isArray(data.propArea) && data.propArea.length > 0) {
          const currentVal = areaSelect.value;
          areaSelect.innerHTML = `<option value="">Select Area...</option>`;
          data.propArea.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.areaid || item.areaId || item.areaName;
            opt.textContent = item.areaName;
            areaSelect.appendChild(opt);
          });
          if (currentVal) areaSelect.value = currentVal;
        }

        // Populate Assignee
        if (assignedSelect && Array.isArray(data.propEmp) && data.propEmp.length > 0) {
          const currentAssigned = assignedSelect.value;
          assignedSelect.innerHTML = `<option value="">Select Team/Assignee...</option>`;
          data.propEmp.forEach(emp => {
            const opt = document.createElement("option");
            opt.value = emp.teamId || emp.teamName;
            let label = emp.teamName;
            if (emp.manager && (emp.manager.firstName || emp.manager.desg)) {
              const desg = (emp.manager.desg || "").trim();
              const name = `${emp.manager.firstName || ""} ${emp.manager.lastName || ""}`.trim();
              label = desg ? `${desg} [${emp.teamName}]` : (name ? `${name} [${emp.teamName}]` : emp.teamName);
            }
            opt.textContent = label;
            assignedSelect.appendChild(opt);
          });
          if (currentAssigned) assignedSelect.value = currentAssigned;
        }
      }
    } catch (err) {
      console.warn("Could not load dynamic property info for modal:", err);
    }
  }
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

  // Populate live dropdowns
  populateModalDropdowns();
  handleModalAreaChange();
  handleModalCcfChange();
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
    const areaSelect = document.getElementById("modalArea");
    const villa = document.getElementById("modalVillaNumber")?.value.trim();
    const priority = document.getElementById("modalPriority")?.value;
    const location = document.getElementById("modalLocation")?.value.trim();
    const creationDate = document.getElementById("modalJobCreationDate")?.value;

    if (!areaSelect || !areaSelect.value) {
      showToast("Please select an Area", "error");
      return false;
    }

    const selectedText = (areaSelect.options[areaSelect.selectedIndex]?.text || "").toUpperCase().trim();
    if (selectedText.includes("GUEST VILLA") && !villa) {
      showToast("Villa number is required for Guest Villa area.", "error");
      return false;
    }

    if (!priority) {
      showToast("Please select Priority", "error");
      return false;
    }

    if (!location) {
      showToast("Please enter Job Location", "error");
      return false;
    }

    if (!creationDate) {
      showToast("Please select Job Creation Date", "error");
      return false;
    }
  } else if (step === 2) {
    const assignedTo = document.getElementById("modalAssignedTo")?.value;
    const costCenter = document.getElementById("modalCostCenter")?.value;
    const ccfDept = document.getElementById("modalCcfDept")?.value.trim();
    const details = document.getElementById("modalJobDetails")?.value.trim();

    if (!assignedTo) {
      showToast("Please assign the job to a team or technician", "error");
      return false;
    }

    if (costCenter === "Department Operational Budget" && !ccfDept) {
      showToast("Department name is required for Department Operational Budget.", "error");
      return false;
    }

    if (!details) {
      showToast("Please enter Job Details description", "error");
      return false;
    }
  }
  return true;
}

async function submitJobForm() {
  const submitBtn = document.getElementById("nextJobModalBtn");
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Creating Job...';
  }

  const areaSelect = document.getElementById("modalArea");
  const areaId = areaSelect?.value || "";
  const areaName = areaSelect?.options[areaSelect.selectedIndex]?.text || "General";
  const villa = document.getElementById("modalVillaNumber")?.value.trim() || "";
  const priority = document.getElementById("modalPriority")?.value || "MEDIUM";
  const status = document.getElementById("modalStatus")?.value || "YET_TO_COMMENCE";
  const location = document.getElementById("modalLocation")?.value.trim() || "";
  const creationDate = document.getElementById("modalJobCreationDate")?.value || new Date().toISOString().split("T")[0];
  const completionDate = document.getElementById("modalExpectedDate")?.value || "";
  const refNo = document.getElementById("modalReferenceNo")?.value.trim() || `REF-${Math.floor(10000 + Math.random() * 90000)}`;

  const assignedSelect = document.getElementById("modalAssignedTo");
  const assignedTo = assignedSelect?.value || "";
  const assignedText = assignedSelect?.options[assignedSelect.selectedIndex]?.text || "Assigned Team";

  const budget = parseFloat(document.getElementById("modalBudget")?.value) || 0;
  const costCenter = document.getElementById("modalCostCenter")?.value || "";
  const ccfDept = document.getElementById("modalCcfDept")?.value.trim() || "";
  const details = document.getElementById("modalJobDetails")?.value.trim() || "";
  const remarks = document.getElementById("modalRemarks")?.value.trim() || "";

  const propId = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentProperty() : "PROP001";

  // Build FormData matching backend JobTrackerController.AddNewJob
  const formData = new FormData();
  formData.append("propId", propId);
  formData.append("areaID", areaId);
  formData.append("villaNumber", villa);
  formData.append("priority", priority);
  formData.append("jobLocation", location);
  formData.append("jobStatus", status);
  formData.append("jobDate", creationDate);
  formData.append("completeDate", completionDate);
  formData.append("refNum", refNo);
  formData.append("jobDetail", details);
  formData.append("budget", budget.toString());
  formData.append("ccf", costCenter);
  formData.append("ccfdept", ccfDept);
  formData.append("jobremark", remarks);
  if (assignedTo) {
    formData.append("assignedTo", assignedTo);
  }

  // Append uploaded files
  if (modalUploadFiles && modalUploadFiles.length > 0) {
    modalUploadFiles.forEach(file => {
      formData.append("propImages", file);
    });
  }

  let createdId = null;

  if (typeof WorkWizeAPI !== "undefined") {
    try {
      const res = await WorkWizeAPI.addNewJob(formData);
      if (res && res.success) {
        createdId = res.jobid;
      }
    } catch (err) {
      console.warn("API addNewJob error, falling back to local store:", err);
    }
  }

  // Fallback ID if offline
  if (!createdId) {
    const now = new Date();
    const dayStr = String(now.getDate()).padStart(2, '0') + String(now.getMonth() + 1).padStart(2, '0') + String(now.getFullYear()).slice(-2);
    const randFive = Math.floor(10000 + Math.random() * 90000);
    createdId = `Tes-${dayStr}-${randFive}`;
  }

  // Sync to WorkWizeDB for immediate UI reactivity
  if (typeof WorkWizeDB !== "undefined") {
    let normStatus = "Yet to Commence";
    if (status === "IN_PROGRESS") normStatus = "In Progress";
    else if (status === "UNDER_DISCUSSION") normStatus = "Under Discussion";
    else if (status === "FIXED" || status === "COMPLETED") normStatus = "Closed";

    let normPriority = "Medium";
    if (priority === "HIGH") normPriority = "High";
    else if (priority === "LOW") normPriority = "Low";
    else if (priority === "SAFETY") normPriority = "Safety";

    const newJobObj = {
      id: createdId,
      title: `${areaName} - ${details.slice(0, 30)}...`,
      area: areaName,
      subArea: areaName.split("/")[0] || areaName,
      status: normStatus,
      priority: normPriority,
      assignedTo: assignedText,
      openedOn: creationDate,
      expectedDate: completionDate || "TBD",
      villaNumber: villa || "N/A",
      location: location,
      budget: budget,
      costCenter: costCenter || "CC-01",
      safetyIssues: priority === "SAFETY" ? 1 : 0,
      details: details,
      remarks: remarks
    };
    WorkWizeDB.addJob(newJobObj);
  }

  closeModal();
  showToast(`New Job ${createdId} created successfully!`, "success");

  // Reset form & uploads
  const form = document.getElementById("addJobForm");
  if (form) form.reset();
  modalUploadFiles = [];
  const fileList = document.getElementById("uploadedFileList");
  if (fileList) fileList.innerHTML = "";

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalBtnHtml;
  }

  // Refresh view
  if (typeof loadAllJobsFromAPI === "function") {
    loadAllJobsFromAPI();
  } else if (typeof renderAllJobsTable === "function") {
    renderAllJobsTable();
  } else if (typeof initJobsByArea === "function") {
    initJobsByArea();
  } else if (typeof renderJobsByAreaTable === "function") {
    renderJobsByAreaTable();
  } else if (typeof updateDashboardStats === "function") {
    updateDashboardStats();
  } else {
    setTimeout(() => {
      window.location.reload();
    }, 800);
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
    
    Array.from(files).forEach(f => {
      // Validate file type & size (5MB)
      const allowedExts = ["jpg", "jpeg", "png"];
      const ext = f.name.split(".").pop().toLowerCase();
      if (!allowedExts.includes(ext)) {
        showToast(`"${f.name}" is not a valid image (Only JPG, PNG).`, "error");
        return;
      }
      if (f.size > 5 * 1024 * 1024) {
        showToast(`"${f.name}" exceeds maximum size of 5MB.`, "error");
        return;
      }
      if (modalUploadFiles.length >= 10) {
        showToast("Maximum 10 images allowed.", "error");
        return;
      }
      modalUploadFiles.push(f);
    });

    renderFileList();
  }

  function renderFileList() {
    if (!fileList) return;
    fileList.innerHTML = "";
    modalUploadFiles.forEach((f, idx) => {
      const item = document.createElement("div");
      item.className = "flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs mt-2";
      item.innerHTML = `
        <span class="flex items-center gap-2 font-medium text-slate-700 truncate">
          <i class="fa-regular fa-file-image text-blue-600"></i> ${f.name} (${(f.size / 1024).toFixed(1)} KB)
        </span>
        <button type="button" class="text-slate-400 hover:text-rose-500 ml-2" data-idx="${idx}">
          <i class="fa-solid fa-xmark"></i>
        </button>
      `;
      item.querySelector("button").addEventListener("click", (e) => {
        e.stopPropagation();
        modalUploadFiles.splice(idx, 1);
        renderFileList();
      });
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
window.handleModalAreaChange = handleModalAreaChange;
window.handleModalCcfChange = handleModalCcfChange;
window.populateModalDropdowns = populateModalDropdowns;
window.submitJobForm = submitJobForm;
