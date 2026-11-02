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
  initHeaderNavAndBadges();
});

// Safe HTML escaping helper
function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
window.escapeHtml = escapeHtml;

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

  // Sync user info from session - defaults to IT [App admin] & it@workwise.in
  let userEmail = "it@workwise.in";
  let userRole = "App admin";
  let userName = "IT";

  if (typeof UserSession !== "undefined") {
    userEmail = UserSession.getUserEmail() || userEmail;
    userRole = UserSession.getUserRole() || userRole;
    userName = UserSession.getUserName() || userName;
  } else if (typeof WorkWizeAPI !== "undefined" && WorkWizeAPI.getStoredUserData()) {
    const u = WorkWizeAPI.getStoredUserData();
    userEmail = u.email || u.username || userEmail;
    userRole = u.desg || (Array.isArray(u.role) ? u.role[0] : u.role) || userRole;
    userName = u.name || userEmail.split("@")[0];
  }

  const displayTitle = (userName === "IT" && userRole === "App admin") ? "IT [App admin]" : `${userName} [${userRole}]`;

  // Update outer header profile display
  if (userBtn) {
    const nameSpan = userBtn.querySelector(".header-user-display-name") || userBtn.querySelector("span.text-xs.font-bold");
    const roleSpan = userBtn.querySelector(".header-user-display-role") || userBtn.querySelector("span.text-\\[10px\\]");

    if (nameSpan) {
      nameSpan.textContent = displayTitle;
      nameSpan.title = displayTitle;
      nameSpan.classList.add("truncate", "max-w-[140px]");
    }
    if (roleSpan) {
      roleSpan.textContent = userEmail;
    }
  }

  // Update dropdown menu items
  if (userMenu) {
    const menuName = userMenu.querySelector(".header-menu-user-name") || userMenu.querySelector("p.font-semibold");
    const menuEmail = userMenu.querySelector(".header-menu-user-email") || userMenu.querySelector("p.text-\\[11px\\]");

    if (menuName) menuName.textContent = displayTitle;
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

  // Ensure button toggle and outside-click listeners are bound only ONCE
  if (!btn.dataset.initialized) {
    btn.dataset.initialized = "true";

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      menu.classList.toggle("hidden");
    });

    document.addEventListener("click", function (e) {
      if (!menu.contains(e.target) && !btn.contains(e.target)) {
        menu.classList.add("hidden");
      }
    });
  }

  if (typeof WorkWizeAPI !== "undefined") {
    try {
      const properties = await WorkWizeAPI.getAllProperties();
      if (Array.isArray(properties) && properties.length > 0) {
        let currentPropId = WorkWizeAPI.getCurrentProperty();
        let currentProp = properties.find(p => String(p.propId) === String(currentPropId)) || properties[0];

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
            const isSelected = String(p.propId) === String(currentPropId);
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


// Rich Text Formatting & Editor Utilities
function initRichEditors() {
  ["modalJobDetails", "modalRemarks"].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.tagName.toLowerCase() !== "textarea") {
      try {
        if (!Object.getOwnPropertyDescriptor(el, "value")) {
          Object.defineProperty(el, "value", {
            get: function () {
              const t = this.innerText ? this.innerText.trim() : "";
              if (!t) return "";
              return this.innerHTML.trim();
            },
            set: function (val) {
              this.innerHTML = val || "";
            },
            configurable: true
          });
        }
      } catch (_) {}
    }
  });
}

function formatRichText(targetId, command, val = null) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.focus();
  document.execCommand(command, false, val);
}

function formatRichTextColor(targetId, color) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.focus();
  try {
    document.execCommand("styleWithCSS", false, true);
  } catch (_) {}
  document.execCommand("foreColor", false, color);
}

function getRichEditorValue(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  if (el.tagName.toLowerCase() === "textarea" || el.tagName.toLowerCase() === "input") {
    return el.value.trim();
  }
  const text = el.innerText.trim();
  const html = el.innerHTML.trim();
  if (!text) return "";
  return html;
}

function setRichEditorValue(id, val) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.tagName.toLowerCase() === "textarea" || el.tagName.toLowerCase() === "input") {
    el.value = val || "";
  } else {
    el.innerHTML = val || "";
  }
}

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

  // Prevent default form submit on Enter and route through validation
  const addJobForm = document.getElementById("addJobForm");
  if (addJobForm) {
    addJobForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (validateJobForm()) {
        submitJobForm();
      }
    });
  }

  // Submit Job when Create Job button clicked (Unified Single View)
  if (nextBtn) {
    nextBtn.addEventListener("click", function (e) {
      e.preventDefault();
      if (validateJobForm()) {
        submitJobForm();
      }
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener("click", function () {
      // Step backwards not needed in unified view
    });
  }

  // Initialize rich editors
  initRichEditors();

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

  const isVilla = selectedText.includes("GUEST VILLA") || selectedVal.includes("GUEST VILLA") || selectedText.includes("VILLA");

  if (isVilla) {
    villaInput.disabled = false;
    villaInput.placeholder = "e.g. V-104";
    villaInput.classList.remove("disabled:opacity-60", "disabled:cursor-not-allowed");
    if (villaRequired) villaRequired.classList.remove("hidden");
  } else {
    villaInput.disabled = true;
    villaInput.value = "";
    villaInput.placeholder = "Disabled (Select Villa Area)";
    villaInput.classList.add("disabled:opacity-60", "disabled:cursor-not-allowed");
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

function toggleAssigneeDropdown(eventOrId, optionalMenuId) {
  if (eventOrId && typeof eventOrId.stopPropagation === "function") {
    eventOrId.stopPropagation();
  }
  const targetId = (typeof eventOrId === "string" && !optionalMenuId) ? eventOrId : (optionalMenuId || "modalAssignedToMenu");
  const menu = document.getElementById(targetId);
  if (!menu) return;
  menu.classList.toggle("hidden");
}

function updateModalAssigneeButtonText() {
  const textEl = document.getElementById("modalAssignedToText");
  if (!textEl) return;
  const cbs = document.querySelectorAll(".modal-assignee-cb:checked");
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

function getSelectedModalAssignees() {
  const cbs = document.querySelectorAll(".modal-assignee-cb:checked");
  return Array.from(cbs).map(cb => ({
    id: cb.value,
    name: cb.dataset.name || cb.value
  }));
}

function clearModalAssignees() {
  const cbs = document.querySelectorAll(".modal-assignee-cb");
  cbs.forEach(cb => cb.checked = false);
  updateModalAssigneeButtonText();
}

// Global click outside to close dropdowns
document.addEventListener("click", function(e) {
  const modalMenu = document.getElementById("modalAssignedToMenu");
  const modalBtn = document.getElementById("modalAssignedToBtn");
  if (modalMenu && !modalMenu.classList.contains("hidden")) {
    if (!modalMenu.contains(e.target) && !modalBtn?.contains(e.target)) {
      modalMenu.classList.add("hidden");
    }
  }

  const editMenu = document.getElementById("editAssignedToMenu");
  const editBtn = document.getElementById("editAssignedToBtn");
  if (editMenu && !editMenu.classList.contains("hidden")) {
    if (!editMenu.contains(e.target) && !editBtn?.contains(e.target)) {
      editMenu.classList.add("hidden");
    }
  }
});

// Populate Area & Assignee dropdowns dynamically from API (getpropinfo)
async function populateModalDropdowns() {
  const areaSelect = document.getElementById("modalArea");
  const menuEl = document.getElementById("modalAssignedToMenu");
  const editMenuEl = document.getElementById("editAssignedToMenu");
  if (!areaSelect && !menuEl && !editMenuEl) return;

  if (typeof WorkWizeAPI !== "undefined") {
    const propId = WorkWizeAPI.getCurrentProperty();
    try {
      const data = await WorkWizeAPI.getPropertyInfo(propId);
      if (data) {
        // Populate Area
        if (areaSelect && Array.isArray(data.propArea) && data.propArea.length > 0) {
          const currentVal = areaSelect.value;
          areaSelect.innerHTML = `<option value="">Select Area</option>`;
          data.propArea.forEach(item => {
            const opt = document.createElement("option");
            opt.value = item.areaid || item.areaId || item.areaName;
            opt.textContent = item.areaName;
            areaSelect.appendChild(opt);
          });
          if (currentVal) areaSelect.value = currentVal;
        }

        // Populate Assignee with checkboxes
        if (menuEl && Array.isArray(data.propEmp) && data.propEmp.length > 0) {
          const selectedSet = new Set(getSelectedModalAssignees().map(a => a.id));
          menuEl.innerHTML = data.propEmp.map(emp => {
            const val = emp.teamId || emp.teamName;
            let label = emp.teamName;
            if (emp.manager && (emp.manager.firstName || emp.manager.desg)) {
              const desg = (emp.manager.desg || "").trim();
              const name = `${emp.manager.firstName || ""} ${emp.manager.lastName || ""}`.trim();
              label = desg ? `${desg} [${emp.teamName}]` : (name ? `${name} [${emp.teamName}]` : emp.teamName);
            }
            const isChecked = selectedSet.has(val) ? "checked" : "";
            return `
              <label class="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 rounded-md cursor-pointer text-xs text-slate-700 select-none">
                <input type="checkbox" value="${escapeHtml(val)}" data-name="${escapeHtml(label)}" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 modal-assignee-cb" ${isChecked} onchange="updateModalAssigneeButtonText()">
                <span class="truncate">${escapeHtml(label)}</span>
              </label>
            `;
          }).join("");
          updateModalAssigneeButtonText();
        }

        // Also populate editAssignedToMenu with identical condition if present on update page
        const editMenuEl = document.getElementById("editAssignedToMenu");
        if (editMenuEl && Array.isArray(data.propEmp) && data.propEmp.length > 0) {
          const selectedSet = new Set(Array.from(document.querySelectorAll("#editAssignedToMenu .edit-assignee-cb:checked")).map(cb => cb.value));
          editMenuEl.innerHTML = data.propEmp.map(emp => {
            const val = emp.teamId || emp.teamName;
            let label = emp.teamName;
            if (emp.manager && (emp.manager.firstName || emp.manager.desg)) {
              const desg = (emp.manager.desg || "").trim();
              const name = `${emp.manager.firstName || ""} ${emp.manager.lastName || ""}`.trim();
              label = desg ? `${desg} [${emp.teamName}]` : (name ? `${name} [${emp.teamName}]` : emp.teamName);
            }
            const isChecked = selectedSet.has(val) ? "checked" : "";
            return `
              <label class="flex items-center gap-2 px-2.5 py-1.5 hover:bg-slate-50 rounded-md cursor-pointer text-xs text-slate-700 select-none">
                <input type="checkbox" value="${escapeHtml(val)}" data-name="${escapeHtml(label)}" class="rounded border-slate-300 text-blue-600 focus:ring-blue-500 edit-assignee-cb" ${isChecked} onchange="updateEditAssigneeButtonText()">
                <span class="truncate">${escapeHtml(label)}</span>
              </label>
            `;
          }).join("");
          if (typeof updateEditAssigneeButtonText === "function") {
            updateEditAssigneeButtonText();
          }
        }
      }
    } catch (err) {
      console.warn("Could not load dynamic property info for modal:", err);
    }
  }
}

function openModal() {
  clearModalAssignees();
  const modal = document.getElementById("addJobModal");
  if (!modal) return;
  modal.classList.add("open");

  // Pre-fill Created By from logged-in session user
  const createdByInput = document.getElementById("modalCreatedBy");
  if (createdByInput) {
    let userName = "IT";
    let userRole = "App admin";
    if (typeof UserSession !== "undefined") {
      userName = UserSession.getUserName() || userName;
      userRole = UserSession.getUserRole() || userRole;
    } else if (typeof WorkWizeAPI !== "undefined" && WorkWizeAPI.getStoredUserData()) {
      const u = WorkWizeAPI.getStoredUserData();
      userName = u.name || (u.email ? u.email.split("@")[0] : userName);
      userRole = u.desg || (Array.isArray(u.role) ? u.role[0] : u.role) || userRole;
    }
    const displayTitle = (userName === "IT" && userRole === "App admin") ? "IT [App admin]" : `${userName} [${userRole}]`;
    createdByInput.value = displayTitle;
  }

  // Ensure all 3 sections are visible in unified single view
  for (let i = 1; i <= 3; i++) {
    const content = document.getElementById(`stepContent${i}`);
    if (content) content.classList.remove("hidden");
  }

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
  currentStep = stepNum || 1;
  for (let i = 1; i <= 3; i++) {
    const content = document.getElementById(`stepContent${i}`);
    if (content) content.classList.remove("hidden");
  }
}

function validateJobForm() {
  const areaSelect = document.getElementById("modalArea");
  const priority = document.getElementById("modalPriority")?.value;
  const status = document.getElementById("modalStatus")?.value;
  const location = document.getElementById("modalLocation")?.value?.trim() || "";
  const creationDate = document.getElementById("modalJobCreationDate")?.value;
  let createdBy = document.getElementById("modalCreatedBy")?.value?.trim();
  const selectedAssignees = getSelectedModalAssignees();
  const costCenter = document.getElementById("modalCostCenter")?.value;
  const ccfDept = document.getElementById("modalCcfDept")?.value?.trim();
  const details = getRichEditorValue("modalJobDetails");

  if (!areaSelect || !areaSelect.value) {
    showToast("Please select Area", "error");
    return false;
  }

  // Villa Number condition: Required ONLY if Guest Villa / Villa area is selected
  const selectedAreaText = (areaSelect.options[areaSelect.selectedIndex]?.text || "").toUpperCase().trim();
  const selectedAreaVal = (areaSelect.value || "").toUpperCase().trim();
  const isVillaArea = selectedAreaText.includes("GUEST VILLA") || selectedAreaVal.includes("GUEST VILLA") || selectedAreaText.includes("VILLA");
  const villa = document.getElementById("modalVillaNumber")?.value?.trim() || "";

  if (isVillaArea && !villa) {
    showToast("Please enter Villa Number for Villa Area", "error");
    return false;
  }

  if (!priority) {
    showToast("Please select Priority", "error");
    return false;
  }

  if (!status) {
    showToast("Please select Status", "error");
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

  if (!createdBy) {
    const createdByEl = document.getElementById("modalCreatedBy");
    if (createdByEl) {
      let userName = "IT";
      let userRole = "App admin";
      if (typeof UserSession !== "undefined") {
        userName = UserSession.getUserName() || userName;
        userRole = UserSession.getUserRole() || userRole;
      }
      createdByEl.value = (userName === "IT" && userRole === "App admin") ? "IT [App admin]" : `${userName} [${userRole}]`;
      createdBy = createdByEl.value;
    }
  }

  if (selectedAssignees.length === 0) {
    showToast("Please select at least one Assignee", "error");
    return false;
  }

  if (costCenter === "Department Operational Budget" && !ccfDept) {
    showToast("Department name is required for Department Operational Budget", "error");
    return false;
  }

  if (!details) {
    showToast("Please enter Job Details description", "error");
    return false;
  }

  return true;
}

function validateStep(step) {
  return validateJobForm();
}

async function submitJobForm() {
  const submitBtn = document.getElementById("nextJobModalBtn");
  const originalBtnHtml = submitBtn ? submitBtn.innerHTML : "";
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1.5"></i> Submitting...';
  }

  try {
    const areaSelect = document.getElementById("modalArea");
    const areaId = areaSelect?.value || "";
    const areaName = areaSelect?.options[areaSelect.selectedIndex]?.text || "General";
    const villa = document.getElementById("modalVillaNumber")?.value?.trim() || "";
    const priority = document.getElementById("modalPriority")?.value || "MEDIUM";
    const status = document.getElementById("modalStatus")?.value || "YET_TO_COMMENCE";
    const location = document.getElementById("modalLocation")?.value?.trim() || "";
    const creationDate = document.getElementById("modalJobCreationDate")?.value || new Date().toISOString().split("T")[0];
    const completionDate = document.getElementById("modalExpectedDate")?.value || "";
    const refNo = document.getElementById("modalReferenceNo")?.value?.trim() || `REF-${Math.floor(10000 + Math.random() * 90000)}`;

    const createdBy = document.getElementById("modalCreatedBy")?.value?.trim() ||
      (typeof UserSession !== "undefined" && UserSession.getUserName ? UserSession.getUserName() : "") ||
      (typeof WorkWizeAPI !== "undefined" && WorkWizeAPI.getStoredUserData() ? (WorkWizeAPI.getStoredUserData().name || WorkWizeAPI.getStoredUserData().email) : "") ||
      "IT [App admin]";

    const selectedAssignees = getSelectedModalAssignees();
    const assignedText = selectedAssignees.length > 0 ? selectedAssignees.map(a => a.name).join(", ") : "Assigned Team";

    const budget = parseFloat(document.getElementById("modalBudget")?.value) || 0;
    const costCenter = document.getElementById("modalCostCenter")?.value || "";
    const ccfDept = document.getElementById("modalCcfDept")?.value?.trim() || "";
    const details = getRichEditorValue("modalJobDetails");
    const remarks = getRichEditorValue("modalRemarks");

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
    formData.append("createdBy", createdBy);
    formData.append("userId", createdBy);
    selectedAssignees.forEach(a => {
      formData.append("assignedTo", a.id);
    });

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
        } else if (res && (res.jobId || res.jobid)) {
          createdId = res.jobId || res.jobid;
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

      const plainDetails = details.replace(/<[^>]*>/g, "").trim() || "New Job";

      const uploadedFilePreviews = (modalUploadFiles || []).map(f => {
        let objectUrl = "";
        try {
          objectUrl = URL.createObjectURL(f);
        } catch (_) {}
        return {
          name: f.name,
          fileName: f.name,
          url: objectUrl,
          size: f.size,
          type: f.type
        };
      });

      const newJobObj = {
        id: createdId,
        rawId: createdId,
        orgjobId: createdId,
        jobId: createdId,
        title: `${areaName} - ${plainDetails.slice(0, 30)}...`,
        area: areaName,
        subArea: areaName.split("/")[0] || areaName,
        status: normStatus,
        priority: normPriority,
        assignedTo: assignedText,
        openedOn: creationDate,
        createdOn: creationDate,
        jobCreatedOn: creationDate,
        expectedDate: completionDate || "TBD",
        expectedCompletion: completionDate || "TBD",
        villaNumber: villa || "N/A",
        location: location,
        jobLocation: location,
        refNum: refNo,
        budget: budget,
        costCenter: costCenter || "CC-01",
        safetyIssues: priority === "SAFETY" ? 1 : 0,
        details: details,
        jobDetail: details,
        remarks: remarks,
        jobremark: remarks,
        uploads: uploadedFilePreviews,
        imageUploads: uploadedFilePreviews
      };
      WorkWizeDB.addJob(newJobObj);
    }

    closeModal();
    showToast(`New Job ${createdId} created successfully!`, "success");

    // Reset form & uploads & rich editors
    const form = document.getElementById("addJobForm");
    if (form && typeof form.reset === "function") form.reset();
    setRichEditorValue("modalJobDetails", "");
    setRichEditorValue("modalRemarks", "");
    clearModalAssignees();
    modalUploadFiles = [];
    const fileList = document.getElementById("uploadedFileList");
    if (fileList) fileList.innerHTML = "";

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
  } catch (err) {
    console.error("Error in submitJobForm:", err);
    showToast(err.message || "Failed to submit job", "error");
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
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
      // Point 6: Support All File Attachments (Images, PDFs, Word, Excel, ZIP, etc.) up to 25MB
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      if (f.size > 25 * 1024 * 1024) {
        showToast(`"${f.name}" exceeds maximum size of 25MB.`, "error");
        return;
      }
      if (modalUploadFiles.length >= 20) {
        showToast("Maximum 20 attachments allowed.", "error");
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
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      let iconClass = "fa-file text-blue-500";
      if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) {
        iconClass = "fa-file-image text-emerald-500";
      } else if (["pdf"].includes(ext)) {
        iconClass = "fa-file-pdf text-rose-500";
      } else if (["doc", "docx"].includes(ext)) {
        iconClass = "fa-file-word text-blue-600";
      } else if (["xls", "xlsx", "csv"].includes(ext)) {
        iconClass = "fa-file-excel text-teal-600";
      } else if (["zip", "rar", "7z"].includes(ext)) {
        iconClass = "fa-file-zipper text-amber-500";
      }

      const sizeStr = (f.size / 1024 < 1024) 
        ? `${(f.size / 1024).toFixed(1)} KB` 
        : `${(f.size / (1024 * 1024)).toFixed(1)} MB`;

      const item = document.createElement("div");
      item.className = "flex items-center justify-between p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-xs mt-2";
      item.innerHTML = `
        <span class="flex items-center gap-2 font-medium text-slate-700 truncate">
          <i class="fa-solid ${iconClass}"></i>
          <span class="truncate">${escapeHtml(f.name)}</span>
          <span class="text-[10px] text-slate-400 shrink-0">(${sizeStr})</span>
        </span>
        <button type="button" class="text-slate-400 hover:text-rose-500 ml-2 shrink-0" data-idx="${idx}">
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
window.formatRichText = formatRichText;
window.formatRichTextColor = formatRichTextColor;
window.getRichEditorValue = getRichEditorValue;
window.setRichEditorValue = setRichEditorValue;
window.initRichEditors = initRichEditors;

window.updateHeaderBadges = updateHeaderBadges;
window.initHeaderNavAndBadges = initHeaderNavAndBadges;

// Header Segmented Navigation & Live Badge Counts
async function updateHeaderBadges(openCount, closedCount) {
  const openBadge = document.getElementById("headerOpenBadge");
  const closedBadge = document.getElementById("headerClosedBadge");

  if (openCount !== undefined && closedCount !== undefined) {
    if (openBadge) openBadge.textContent = openCount;
    if (closedBadge) closedBadge.textContent = closedCount;
    try {
      localStorage.setItem("workwize_open_count", String(openCount));
      localStorage.setItem("workwize_closed_count", String(closedCount));
    } catch (_) {}
    return;
  }

  // Restore cached values for instant rendering
  try {
    const cachedOpen = localStorage.getItem("workwize_open_count");
    const cachedClosed = localStorage.getItem("workwize_closed_count");
    if (cachedOpen !== null && openBadge) openBadge.textContent = cachedOpen;
    if (cachedClosed !== null && closedBadge) closedBadge.textContent = cachedClosed;
  } catch (_) {}

  // Check DOM statistics if present on page
  const domOpen = document.getElementById("statOpenJobs");
  const domClosed = document.getElementById("statClosedJobs");
  if (domOpen && domClosed && domOpen.textContent && domClosed.textContent && domOpen.textContent !== "-") {
    if (openBadge) openBadge.textContent = domOpen.textContent;
    if (closedBadge) closedBadge.textContent = domClosed.textContent;
    return;
  }

  // Fetch from API
  if (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getCurrentProperty === "function") {
    try {
      const propId = WorkWizeAPI.getCurrentProperty();
      if (propId && typeof WorkWizeAPI.getJobOverview === "function") {
        const overview = await WorkWizeAPI.getJobOverview(propId);
        if (Array.isArray(overview)) {
          const tot = overview.reduce((s, a) => s + (Number(a.totalJobs || a.total || a.total_jobs) || 0), 0);
          const opn = overview.reduce((s, a) => s + (Number(a.openJobs || a.open || a.open_jobs) || 0), 0);
          const cls = Math.max(0, tot - opn);
          if (openBadge) openBadge.textContent = opn;
          if (closedBadge) closedBadge.textContent = cls;
          try {
            localStorage.setItem("workwize_open_count", String(opn));
            localStorage.setItem("workwize_closed_count", String(cls));
          } catch (_) {}
        }
      }
    } catch (err) {
      console.debug("Badge overview fetch fallback:", err);
    }
  }
}

function initHeaderNavAndBadges() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";
  const urlParams = new URLSearchParams(window.location.search);
  const statusParam = urlParams.get("status");

  const dashboardTab = document.getElementById("headerNavDashboard");
  const jobByAreaTab = document.getElementById("headerNavJobByArea");
  const allJobsTab = document.getElementById("headerNavAllJobs");
  const closedJobsTab = document.getElementById("headerNavClosedJobs");

  const tabs = [dashboardTab, jobByAreaTab, allJobsTab, closedJobsTab].filter(Boolean);
  tabs.forEach(t => t.classList.remove("on"));

  // Highlight active tab according to current page & URL filter
  if (currentPath === "dashboard.html" || currentPath === "index.html") {
    if (dashboardTab) dashboardTab.classList.add("on");
  } else if (currentPath === "job-by-area.html" || currentPath === "jobs.html") {
    if (jobByAreaTab) jobByAreaTab.classList.add("on");
  } else if (currentPath === "all-jobs.html") {
    if (statusParam === "Closed") {
      if (closedJobsTab) closedJobsTab.classList.add("on");
    } else {
      if (allJobsTab) allJobsTab.classList.add("on");
    }
  }

  // When already on all-jobs.html, allow instant in-page tab switching between All Jobs and Closed Jobs
  if (currentPath === "all-jobs.html") {
    if (allJobsTab) {
      allJobsTab.addEventListener("click", function (e) {
        const statusSelect = document.getElementById("filterStatus");
        if (statusSelect) {
          e.preventDefault();
          statusSelect.value = "";
          if (typeof filterAndRenderJobs === "function") filterAndRenderJobs();
          tabs.forEach(t => t.classList.remove("on"));
          allJobsTab.classList.add("on");
          history.pushState(null, "", "all-jobs.html");
        }
      });
    }

    if (closedJobsTab) {
      closedJobsTab.addEventListener("click", function (e) {
        const statusSelect = document.getElementById("filterStatus");
        if (statusSelect) {
          e.preventDefault();
          statusSelect.value = "Closed";
          if (typeof filterAndRenderJobs === "function") filterAndRenderJobs();
          tabs.forEach(t => t.classList.remove("on"));
          closedJobsTab.classList.add("on");
          history.pushState(null, "", "all-jobs.html?status=Closed");
        }
      });
    }
  }

  // Initial badge update
  updateHeaderBadges();

  // Listen for property switch event
  window.addEventListener("workwize:propertyChanged", function () {
    updateHeaderBadges();
  });
}
