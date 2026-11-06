/**

 * WorkWize Main App Navigation, Modal & Global Controls

 */



document.addEventListener("DOMContentLoaded", function () {

  initMobileSidebar();

  initActiveSidebarLink();

  initSidebarToggle();

  initTableRowHighlight();

  initTopHeaderSearch();

  initPropertyDropdown();

  initAddJobModal();

  initUserDropdown();

  initHeaderNavAndBadges();

});



// Row click highlight for all tables across the application

function initTableRowHighlight() {

  document.addEventListener("click", function (e) {

    const row = e.target.closest("tbody tr");

    if (!row) return;



    // Highlight row across entire table row, even if an icon, link, or button is clicked

    const tbody = row.closest("tbody");

    if (tbody) {

      tbody.querySelectorAll("tr").forEach(r => r.classList.remove("table-row-selected"));

    }

    row.classList.add("table-row-selected");



    // Extract identifiers for persistence across page navigation / modal reopen

    const jobId = row.getAttribute("data-job-id") ||

                  row.querySelector("a[href*='job-details.html']")?.textContent?.trim() || "";

    const displayId = row.getAttribute("data-display-id") || "";

    const areaId = row.getAttribute("data-area-id") || "";

    const rowId = row.getAttribute("data-row-id") || row.id || "";

    const currentPage = window.location.pathname.split("/").pop() || "";



    if (jobId) {

      sessionStorage.setItem("ww_selected_job_id", jobId);

      localStorage.setItem("ww_selected_job_id", jobId);

      if (displayId) {

        sessionStorage.setItem("ww_selected_job_display_id", displayId);

      }

    }

    if (areaId) {

      sessionStorage.setItem("ww_selected_area_id", areaId);

      localStorage.setItem("ww_selected_area_id", areaId);

    }

    if (rowId) {

      sessionStorage.setItem("ww_selected_row_id", rowId);

    }

    if (currentPage && !currentPage.includes("job-details")) {

      sessionStorage.setItem("ww_selected_source_page", currentPage);

    }

  });



  // Restore on browser back/forward navigation (bfcache) and page show

  window.addEventListener("pageshow", function () {

    setTimeout(restoreTableRowHighlight, 120);

  });

}

window.initTableRowHighlight = initTableRowHighlight;



// Restore highlight on rows matching saved job / area / row IDs

function restoreTableRowHighlight(targetTbody) {

  const selectedJobId = sessionStorage.getItem("ww_selected_job_id") || localStorage.getItem("ww_selected_job_id");

  const selectedAreaId = sessionStorage.getItem("ww_selected_area_id") || localStorage.getItem("ww_selected_area_id");

  const selectedRowId = sessionStorage.getItem("ww_selected_row_id");



  if (!selectedJobId && !selectedAreaId && !selectedRowId) return;



  const bodies = targetTbody ? [targetTbody] : Array.from(document.querySelectorAll("tbody"));

  bodies.forEach(tbody => {

    const rows = tbody.querySelectorAll("tr");

    rows.forEach(tr => {

      const jId = tr.getAttribute("data-job-id");

      const dId = tr.getAttribute("data-display-id");

      const aId = tr.getAttribute("data-area-id");

      const rId = tr.getAttribute("data-row-id") || tr.id;

      const jobLink = tr.querySelector("a[href*='job-details.html']")?.textContent?.trim();



      let matches = false;

      if (selectedJobId && (jId === selectedJobId || dId === selectedJobId || jobLink === selectedJobId)) {

        matches = true;

      } else if (selectedAreaId && aId === selectedAreaId) {

        matches = true;

      } else if (selectedRowId && rId === selectedRowId) {

        matches = true;

      }



      if (matches) {

        tbody.querySelectorAll("tr").forEach(r => r.classList.remove("table-row-selected"));

        tr.classList.add("table-row-selected");

        try {

          tr.scrollIntoView({ block: "nearest", behavior: "smooth" });

        } catch (e) {}

      }

    });

  });

}

window.restoreTableRowHighlight = restoreTableRowHighlight;



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



// Mobile sidebar drawer open/close

function initMobileSidebar() {

  const sidebar = document.getElementById("appSidebar");

  const backdrop = document.getElementById("sidebarBackdrop");

  const openBtn = document.getElementById("openSidebarBtn");

  const closeBtn = document.getElementById("closeSidebarBtn");



  if (!sidebar) return;



  function openSidebar() {

    sidebar.classList.remove("-translate-x-full");

    if (backdrop) backdrop.classList.remove("hidden");

    document.body.classList.add("overflow-hidden", "lg:overflow-auto");

  }



  function closeSidebar() {

    sidebar.classList.add("-translate-x-full");

    if (backdrop) backdrop.classList.add("hidden");

    document.body.classList.remove("overflow-hidden", "lg:overflow-auto");

  }



  if (openBtn) openBtn.addEventListener("click", openSidebar);

  if (closeBtn) closeBtn.addEventListener("click", closeSidebar);

  if (backdrop) backdrop.addEventListener("click", closeSidebar);

}

window.initMobileSidebar = initMobileSidebar;



// Highlight active sidebar item according to URL & on click set active

function initActiveSidebarLink() {

  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  const navLinks = document.querySelectorAll(".sidebar-tab, .tab, .sidebar-nav-item");



  navLinks.forEach(link => {

    // Click handler to immediately set active state and highlight

    link.addEventListener("click", function () {

      navLinks.forEach(item => item.classList.remove("on", "active"));

      this.classList.add("on", "active");

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

      const currentU = (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getStoredUserData === "function")

        ? WorkWizeAPI.getStoredUserData()

        : null;

      const canSwitch = (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.isMultiPropertyUser === "function")

        ? WorkWizeAPI.isMultiPropertyUser(currentU)

        : false;

      if (!canSwitch) return; // Non-admin users cannot open dropdown

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

      const userData = WorkWizeAPI.getStoredUserData();

      const isMulti = WorkWizeAPI.isMultiPropertyUser(userData);

      const chevron = btn.querySelector(".fa-chevron-down");



      // UI permissions matching OPRO-FRONTEND:

      // Admins (SUPERADMIN, ADMIN, OPROADMIN) can view/switch all properties.

      // Regular staff only see their assigned property and cannot toggle/switch.

      if (!isMulti || !Array.isArray(properties) || properties.length <= 1) {

        if (chevron) chevron.style.display = "none";

        btn.classList.remove("hover:bg-slate-100", "cursor-pointer");

        btn.classList.add("cursor-default");

        btn.setAttribute("title", "Assigned property");

        menu.classList.add("hidden");

      } else {

        if (chevron) chevron.style.display = "";

        btn.classList.add("hover:bg-slate-100", "cursor-pointer");

        btn.classList.remove("cursor-default");

        btn.removeAttribute("title");

      }



      if (Array.isArray(properties) && properties.length > 0) {

        let currentPropId = WorkWizeAPI.getCurrentProperty();

        let currentProp = properties.find(p => String(p.propId) === String(currentPropId)) || properties[0];



        if (!currentPropId && currentProp) {

          WorkWizeAPI.setCurrentProperty(currentProp.propId, currentProp.propName);

          currentPropId = currentProp.propId;

        }



        const mobileNameSpan = document.getElementById("mobileHeaderPropertyName");

        if (nameSpan && currentProp) {

          nameSpan.textContent = currentProp.propName;

        }

        if (mobileNameSpan && currentProp) {

          mobileNameSpan.textContent = currentProp.propName;

        }



        if (listContainer) {

          listContainer.innerHTML = "";

          // Only render property selection list if user is multi-property admin

          if (isMulti && properties.length > 1) {

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

                  <span class="truncate">${escapeHtml(p.propName)}</span>

                </span>

                ${isSelected ? '<i class="fa-solid fa-circle-check text-blue-600 text-xs"></i>' : ''}

              `;



              item.addEventListener("click", function (e) {

                e.stopPropagation();

                WorkWizeAPI.setCurrentProperty(p.propId, p.propName);

                if (nameSpan) nameSpan.textContent = p.propName;

                if (mobileNameSpan) mobileNameSpan.textContent = p.propName;

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

        }

      } else {

        const fallbackName = WorkWizeAPI.getCurrentPropertyName() || "Main Facility";

        if (nameSpan) nameSpan.textContent = fallbackName;

        const mobileNameSpan = document.getElementById("mobileHeaderPropertyName");

        if (mobileNameSpan) mobileNameSpan.textContent = fallbackName;

      }

    } catch (e) {

      console.warn("Could not load properties for header dropdown:", e);

      const fallbackName = WorkWizeAPI.getCurrentPropertyName() || "Main Facility";

      if (nameSpan) nameSpan.textContent = fallbackName;

      const mobileNameSpan = document.getElementById("mobileHeaderPropertyName");

      if (mobileNameSpan) mobileNameSpan.textContent = fallbackName;

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
let modalOwnerUploadFiles = [];





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



  // Enforce F01 permissions (Add New Job) matching OPRO-FRONTEND

  if (typeof UserSession !== "undefined" && typeof UserSession.getUserAccess === "function") {

    const access = UserSession.getUserAccess();

    if (access && access["F01"]) {

      const f01 = access["F01"];

      if (f01.read === false && f01.write === false) {

        openModalBtns.forEach(btn => {

          btn.style.display = "none";

          const parentWrapper = btn.closest("#div-F01, .f01-container");

          if (parentWrapper) parentWrapper.style.display = "none";

        });

      } else if (f01.read === true && f01.write === false) {

        openModalBtns.forEach(btn => {

          btn.disabled = true;

          btn.classList.add("opacity-50", "cursor-not-allowed");

          btn.title = "You do not have permission to create jobs (Read Only)";

        });

      }

    }

  }





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

        // Populate Area (Only Active areas shown, matching selected property strictly)

        const propAreasList = data.propArea || data.propAreas || data.PropArea || data.PropAreas || [];

        if (areaSelect && Array.isArray(propAreasList) && propAreasList.length > 0) {

          const currentVal = areaSelect.value;

          areaSelect.innerHTML = `<option value="">Select Area</option>`;

          const activeAreas = propAreasList.filter(item =>

            item && item.isactive !== false && item.isactive !== 0 && item.isactive !== "0" && item.isactive !== "false" &&

            item.isActive !== false && item.isActive !== 0 && item.isActive !== "0" && item.isActive !== "false" &&

            item.status !== false && item.status !== 0 && item.status !== "0"

          );

          activeAreas.forEach(item => {

            const opt = document.createElement("option");

            opt.value = item.areaid || item.areaId || item.AreaId || item.AreaID || item.areaName;

            opt.textContent = item.areaName || item.AreaName || item.name;

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



  // Enforce F01 permissions (Add New Job) matching OPRO-FRONTEND

  if (typeof UserSession !== "undefined" && typeof UserSession.getUserAccess === "function") {

    const access = UserSession.getUserAccess();

    if (access && access["F01"]) {

      const f01 = access["F01"];

      if (f01.read === false && f01.write === false) {

        openModalBtns.forEach(btn => {

          btn.style.display = "none";

          const parentWrapper = btn.closest("#div-F01, .f01-container");

          if (parentWrapper) parentWrapper.style.display = "none";

        });

      } else if (f01.read === true && f01.write === false) {

        openModalBtns.forEach(btn => {

          btn.disabled = true;

          btn.classList.add("opacity-50", "cursor-not-allowed");

          btn.title = "You do not have permission to create jobs (Read Only)";

        });

      }

    }

  }



  modal.classList.add("open");



  // Ensure Reference No. and Expected Date are clean / empty unless entered

  const modalRefEl = document.getElementById("modalReferenceNo");

  if (modalRefEl) modalRefEl.value = "";

  const modalExpEl = document.getElementById("modalExpectedDate");

  if (modalExpEl) modalExpEl.value = "";



  // Highlight Create New Job button in blue while modal is open

  const createJobBtn = document.getElementById("headerNavCreateJob");

  if (createJobBtn) {

    document.querySelectorAll(".sidebar-tab, .tab, .sidebar-nav-item").forEach(item => item.classList.remove("on", "active"));

    createJobBtn.classList.add("on", "active");

  }



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



  // Enforce F01 permissions (Add New Job) matching OPRO-FRONTEND

  if (typeof UserSession !== "undefined" && typeof UserSession.getUserAccess === "function") {

    const access = UserSession.getUserAccess();

    if (access && access["F01"]) {

      const f01 = access["F01"];

      if (f01.read === false && f01.write === false) {

        openModalBtns.forEach(btn => {

          btn.style.display = "none";

          const parentWrapper = btn.closest("#div-F01, .f01-container");

          if (parentWrapper) parentWrapper.style.display = "none";

        });

      } else if (f01.read === true && f01.write === false) {

        openModalBtns.forEach(btn => {

          btn.disabled = true;

          btn.classList.add("opacity-50", "cursor-not-allowed");

          btn.title = "You do not have permission to create jobs (Read Only)";

        });

      }

    }

  }



  modal.classList.remove("open");



  // Remove highlight from Create New Job button and restore current page active tab

  const createJobBtn = document.getElementById("headerNavCreateJob");

  if (createJobBtn) {

    createJobBtn.classList.remove("on", "active");

  }

  if (typeof initHeaderNavAndBadges === "function") {

    initHeaderNavAndBadges();

  }

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

    const refNo = document.getElementById("modalReferenceNo")?.value?.trim() || "";



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



    // Owner Directive & Owner Attachments
    const ownerCommentInput = document.getElementById("modalOwnerComment");
    const ownerCommentVal = (ownerCommentInput?.value || "").trim();
    if (ownerCommentVal) {
      formData.append("ownerComment", ownerCommentVal);
      formData.append("owner_comment", ownerCommentVal);
    }
    if (modalOwnerUploadFiles && modalOwnerUploadFiles.length > 0) {
      modalOwnerUploadFiles.forEach(file => {
        formData.append("ownerMedia", file);
      });
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

      else if (status === "COMPLETED") normStatus = "Completed";
      else if (status === "FIXED") normStatus = "Fixed";



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

        expectedDate: completionDate || "",

        expectedCompletion: completionDate || "",

        villaNumber: villa || "N/A",

        location: location,

        jobLocation: location,

        refNum: refNo,

        budget: budget,

        ccf: costCenter,

        costCenter: costCenter,

        ccf_dept: ccfDept,

        ccfdept: ccfDept,

        safetyIssues: priority === "SAFETY" ? 1 : 0,

        details: details,

        jobDetail: details,

        remarks: remarks,

        jobremark: remarks,

        owner_comment: ownerCommentVal || "",

        owner_comments_history: ownerCommentVal ? [{
          commentDetail: ownerCommentVal,
          commentDate: creationDate,
          author: createdBy || "Owner",
          uploads: (modalOwnerUploadFiles || []).map(f => ({
            name: f.name,
            fileName: f.name,
            url: URL.createObjectURL(f),
            size: f.size,
            type: f.type
          }))
        }] : [],

        uploads: uploadedFilePreviews,

        imageUploads: uploadedFilePreviews,

        createdBy: createdBy,

        userId: createdBy,

        firstname: createdBy

      };

      WorkWizeDB.addJob(newJobObj);
    }

    try {
      sessionStorage.setItem("workwize_newly_created_job_id", createdId);
      sessionStorage.setItem("workwize_newly_created_job", JSON.stringify(newJobObj));
      localStorage.setItem("workwize_newly_created_job_id", createdId);
    } catch (_) {}

    closeModal();

    showToast(`New Job ${createdId} created successfully!`, "success");



    // Reset form & uploads & rich editors

    const form = document.getElementById("addJobForm");

    if (form && typeof form.reset === "function") form.reset();

    setRichEditorValue("modalJobDetails", "");

    setRichEditorValue("modalRemarks", "");

    clearModalAssignees();

    modalUploadFiles = [];
    modalOwnerUploadFiles = [];

    const fileList = document.getElementById("uploadedFileList");
    if (fileList) fileList.innerHTML = "";

    const ownerCommentField = document.getElementById("modalOwnerComment");
    if (ownerCommentField) ownerCommentField.value = "";
    const ownerFileList = document.getElementById("modalOwnerUploadedFileList");
    if (ownerFileList) ownerFileList.innerHTML = "";



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



      const isImg = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
      let thumbImgHtml = "";
      try {
        if (isImg) {
          const tUrl = URL.createObjectURL(f);
          thumbImgHtml = `<img src="${tUrl}" class="w-7 h-7 rounded-md object-cover border border-slate-200 shrink-0" alt="">`;
        }
      } catch (_) {}

      const item = document.createElement("div");

      item.className = "flex items-center justify-between p-2 bg-slate-50 border border-slate-200/80 rounded-lg text-xs mt-2 hover:bg-slate-100/70 transition-colors";

      item.innerHTML = `

        <span class="flex items-center gap-2 font-medium text-slate-700 truncate">

          ${thumbImgHtml || `<i class="fa-solid ${iconClass} text-sm"></i>`}

          <span class="truncate">${escapeHtml(f.name)}</span>

          <span class="text-[10px] text-slate-400 shrink-0">(${sizeStr})</span>

        </span>

        <button type="button" class="w-7 h-7 rounded-lg hover:bg-rose-100 text-rose-500 hover:text-rose-700 flex items-center justify-center transition-colors ml-2 shrink-0 cursor-pointer" data-idx="${idx}" title="Delete attachment">

          <i class="fa-solid fa-trash-can text-xs"></i>

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

  const teamsTab = document.getElementById("headerNavTeams");

  const oproTab = document.getElementById("headerNavOproDashboard");



  const createJobBtn = document.getElementById("headerNavCreateJob");

  const tabs = [dashboardTab, jobByAreaTab, allJobsTab, closedJobsTab, teamsTab, oproTab, createJobBtn].filter(Boolean);

  tabs.forEach(t => t.classList.remove("on", "active"));



  // Check if job is closed or comes from job-by-area (for job-details.html or job-update.html)

  let isClosedContext = false;

  let isAreaContext = false;

  if (currentPath === "job-details.html" || currentPath === "job-update.html") {

    try {

      const cachedJob = sessionStorage.getItem("workwize_current_job_data");

      if (cachedJob) {

        const j = JSON.parse(cachedJob);

        if (j.isActive === false || j.isActive === 0 || j.status === "Closed" || j.jobStatus === "Closed" || j.jobCloseOn) {

          isClosedContext = true;

        }

      }

    } catch (_) {}

    if (document.referrer && document.referrer.includes("closed-jobs.html")) {

      isClosedContext = true;

    } else if (document.referrer && (document.referrer.includes("job-by-area.html") || document.referrer.includes("jobs.html"))) {

      isAreaContext = true;

    }

  }



  // Highlight active tab according to current page

  if (currentPath === "dashboard.html" || currentPath === "index.html") {

    if (dashboardTab) dashboardTab.classList.add("on", "active");

  } else if (currentPath === "job-by-area.html" || currentPath === "jobs.html" || (isAreaContext && !isClosedContext)) {

    if (jobByAreaTab) jobByAreaTab.classList.add("on", "active");

  } else if (currentPath === "closed-jobs.html" || isClosedContext) {

    if (closedJobsTab) closedJobsTab.classList.add("on", "active");

  } else if (currentPath === "all-jobs.html" || currentPath === "job-details.html" || currentPath === "job-update.html") {

    if (allJobsTab) allJobsTab.classList.add("on", "active");

  } else if (currentPath === "opro-dashboard.html") {

    if (oproTab) oproTab.classList.add("on", "active");

  }



  // Click handler to immediately set active state and highlight

  tabs.forEach(tab => {

    tab.addEventListener("click", function () {

      tabs.forEach(t => t.classList.remove("on", "active"));

      this.classList.add("on", "active");

    });

  });



  // Initial badge update

  updateHeaderBadges();



  // Listen for property switch event

  window.addEventListener("workwize:propertyChanged", function () {

    updateHeaderBadges();

  });

}



// ===================================

// Reset Password Modal & Handlers
// ==========================================
function ensureResetPasswordModalInDOM() {
  if (document.getElementById("resetPasswordModal")) return;

  const modalHtml = `
  <div id="resetPasswordModal" class="modal-backdrop fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1100] flex items-center justify-center p-4 transition-all duration-200 opacity-0 pointer-events-none">
    <div class="modal-container bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden transform scale-95 transition-all duration-200">
      <!-- Modal Header -->
      <div class="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
            <i class="fa-solid fa-key"></i>
          </div>
          <div>
            <h3 class="font-bold text-slate-900 text-sm">Reset Password</h3>
            <p class="text-[11px] text-slate-400">Change your account password</p>
          </div>
        </div>
        <button type="button" onclick="closeResetPasswordModal()" class="w-7 h-7 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer">
          <i class="fa-solid fa-xmark text-sm"></i>
        </button>
      </div>

      <!-- Modal Body Form -->
      <form id="resetPasswordForm" class="p-5 space-y-4 text-xs" onsubmit="handleResetPasswordSubmit(event)">
        <div id="resetPasswordError" class="hidden p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 font-semibold text-center"></div>
        <div id="resetPasswordSuccess" class="hidden p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold text-center"></div>

        <!-- Account / Email -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1">User Account</label>
          <div class="relative flex items-center">
            <i class="fa-regular fa-envelope absolute left-3 text-slate-400 text-xs pointer-events-none"></i>
            <input type="text" id="resetPasswordUserEmail" readonly class="w-full bg-slate-100 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-slate-600 font-medium cursor-not-allowed select-none">
          </div>
        </div>

        <!-- Old Password -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Old Password <span class="text-rose-500">*</span></label>
          <div class="relative flex items-center">
            <i class="fa-solid fa-lock-open absolute left-3 text-slate-400 text-xs pointer-events-none"></i>
            <input type="password" id="resetOldPassword" required placeholder="Enter current / old password" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-9 py-2 text-slate-800 outline-none focus:border-blue-500 focus:bg-white font-medium">
            <button type="button" onclick="togglePasswordVisibility('resetOldPassword', this)" class="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer" title="Show/Hide">
              <i class="fa-regular fa-eye text-xs"></i>
            </button>
          </div>
        </div>

        <!-- New Password -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1">New Password <span class="text-rose-500">*</span></label>
          <div class="relative flex items-center">
            <i class="fa-solid fa-lock absolute left-3 text-slate-400 text-xs pointer-events-none"></i>
            <input type="password" id="resetNewPassword" required minlength="6" placeholder="Minimum 6 characters" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-9 py-2 text-slate-800 outline-none focus:border-blue-500 focus:bg-white font-medium">
            <button type="button" onclick="togglePasswordVisibility('resetNewPassword', this)" class="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer" title="Show/Hide">
              <i class="fa-regular fa-eye text-xs"></i>
            </button>
          </div>
        </div>

        <!-- Confirm Password -->
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Confirm Password <span class="text-rose-500">*</span></label>
          <div class="relative flex items-center">
            <i class="fa-solid fa-shield-halved absolute left-3 text-slate-400 text-xs pointer-events-none"></i>
            <input type="password" id="resetConfirmPassword" required minlength="6" placeholder="Re-enter new password" class="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-9 py-2 text-slate-800 outline-none focus:border-blue-500 focus:bg-white font-medium">
            <button type="button" onclick="togglePasswordVisibility('resetConfirmPassword', this)" class="absolute right-2.5 text-slate-400 hover:text-slate-600 p-1 cursor-pointer" title="Show/Hide">
              <i class="fa-regular fa-eye text-xs"></i>
            </button>
          </div>
        </div>

        <!-- Actions -->
        <div class="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <button type="button" onclick="closeResetPasswordModal()" class="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold cursor-pointer">Cancel</button>
          <button type="submit" id="resetPasswordSubmitBtn" class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer">
            <i class="fa-solid fa-check text-xs"></i>
            <span>Update Password</span>
          </button>
        </div>
      </form>
    </div>
  </div>`;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function openResetPasswordModal() {
  ensureResetPasswordModalInDOM();

  const userMenu = document.getElementById("userProfileMenu");
  if (userMenu) userMenu.classList.add("hidden");

  const modal = document.getElementById("resetPasswordModal");
  const emailInput = document.getElementById("resetPasswordUserEmail");
  const err = document.getElementById("resetPasswordError");
  const success = document.getElementById("resetPasswordSuccess");
  const form = document.getElementById("resetPasswordForm");

  if (form) form.reset();
  if (err) err.classList.add("hidden");
  if (success) success.classList.add("hidden");

  let uEmail = "it@workwise.in";
  if (typeof UserSession !== "undefined") {
    uEmail = UserSession.getUserEmail() || uEmail;
  } else if (typeof WorkWizeAPI !== "undefined" && WorkWizeAPI.getStoredUserData()) {
    const u = WorkWizeAPI.getStoredUserData();
    uEmail = u.email || u.username || uEmail;
  }

  if (emailInput) emailInput.value = uEmail;

  if (modal) {
    modal.classList.remove("opacity-0", "pointer-events-none");
    modal.classList.add("open");
    const container = modal.querySelector(".modal-container");
    if (container) {
      container.classList.remove("scale-95");
      container.classList.add("scale-100");
    }
  }
}

function closeResetPasswordModal() {
  const modal = document.getElementById("resetPasswordModal");
  if (modal) {
    modal.classList.add("opacity-0", "pointer-events-none");
    modal.classList.remove("open");
    const container = modal.querySelector(".modal-container");
    if (container) {
      container.classList.remove("scale-100");
      container.classList.add("scale-95");
    }
  }
}

async function handleResetPasswordSubmit(e) {
  e.preventDefault();
  const oldPass = document.getElementById("resetOldPassword")?.value.trim() || "";
  const newPass = document.getElementById("resetNewPassword")?.value.trim() || "";
  const confirmPass = document.getElementById("resetConfirmPassword")?.value.trim() || "";
  const err = document.getElementById("resetPasswordError");
  const success = document.getElementById("resetPasswordSuccess");
  const btn = document.getElementById("resetPasswordSubmitBtn");

  if (!oldPass) {
    if (err) {
      err.textContent = "Please enter your current / old password.";
      err.classList.remove("hidden");
    }
    return;
  }

  if (!newPass || !confirmPass) {
    if (err) {
      err.textContent = "Please enter and confirm your new password.";
      err.classList.remove("hidden");
    }
    return;
  }

  if (newPass.length < 6) {
    if (err) {
      err.textContent = "New password must be at least 6 characters long.";
      err.classList.remove("hidden");
    }
    return;
  }

  if (newPass === oldPass) {
    if (err) {
      err.textContent = "New password cannot be the same as your old password.";
      err.classList.remove("hidden");
    }
    return;
  }

  if (newPass !== confirmPass) {
    if (err) {
      err.textContent = "Passwords do not match. Please verify.";
      err.classList.remove("hidden");
    }
    return;
  }

  if (err) err.classList.add("hidden");
  if (success) success.classList.add("hidden");

  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin text-xs"></i> <span>Updating...</span>';
  }

  try {
    const res = await WorkWizeAPI.resetPasswordLoggedIn(newPass, oldPass);
    if (res && (res.status === true || res.success === true)) {
      if (success) {
        success.textContent = res.message || "Password has been reset successfully!";
        success.classList.remove("hidden");
      }
      if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-check text-xs"></i> <span>Success!</span>';
        btn.classList.remove("bg-blue-600", "hover:bg-blue-700");
        btn.classList.add("bg-emerald-600");
      }
      setTimeout(() => {
        closeResetPasswordModal();
        if (typeof showToast === "function") {
          showToast("Password updated successfully!", "success");
        }
      }, 1500);
    } else {
      throw new Error(res?.message || "Failed to update password. Please check your old password.");
    }
  } catch (apiErr) {
    console.error("Password reset error:", apiErr);
    if (err) {
      err.textContent = apiErr.message || "An error occurred while resetting your password. Please verify your old password.";
      err.classList.remove("hidden");
    }
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<i class="fa-solid fa-check text-xs"></i> <span>Update Password</span>';
      btn.classList.remove("bg-emerald-600");
      btn.classList.add("bg-blue-600", "hover:bg-blue-700");
    }
  }
}

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = btn?.querySelector("i");
  if (input.type === "password") {
    input.type = "text";
    if (icon) {
      icon.classList.remove("fa-eye");
      icon.classList.add("fa-eye-slash");
    }
  } else {
    input.type = "password";
    if (icon) {
      icon.classList.remove("fa-eye-slash");
      icon.classList.add("fa-eye");
    }
  }
}

window.openResetPasswordModal = openResetPasswordModal;
window.closeResetPasswordModal = closeResetPasswordModal;
window.handleResetPasswordSubmit = handleResetPasswordSubmit;
window.togglePasswordVisibility = togglePasswordVisibility;



// ==========================================
// Owner Comment Attachment Handlers (Add Job Modal)
// ==========================================
function handleModalOwnerUploadChange(input) {
  if (!input || !input.files || input.files.length === 0) return;
  Array.from(input.files).forEach(f => {
    if (modalOwnerUploadFiles.length >= 10) {
      showToast("Maximum 10 owner attachments allowed.", "error");
      return;
    }
    modalOwnerUploadFiles.push(f);
  });
  renderModalOwnerUploadFilesPreview();
}

function removeModalOwnerUploadFile(idx) {
  modalOwnerUploadFiles.splice(idx, 1);
  const input = document.getElementById("modalOwnerUploadInput");
  if (input && modalOwnerUploadFiles.length === 0) input.value = "";
  renderModalOwnerUploadFilesPreview();
}

function renderModalOwnerUploadFilesPreview() {
  const container = document.getElementById("modalOwnerUploadedFileList");
  if (!container) return;
  if (!modalOwnerUploadFiles || modalOwnerUploadFiles.length === 0) {
    container.innerHTML = "";
    return;
  }
  container.innerHTML = modalOwnerUploadFiles.map((f, idx) => {
    const ext = (f.name.split(".").pop() || "").toLowerCase();
    const isImg = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
    let thumbHtml = "";
    try {
      if (isImg) {
        const u = URL.createObjectURL(f);
        thumbHtml = `<img src="${u}" class="w-5 h-5 rounded object-cover border border-purple-200" alt="">`;
      }
    } catch (_) {}
    const sizeStr = (f.size / 1024 < 1024) ? `${(f.size / 1024).toFixed(0)}KB` : `${(f.size / (1024 * 1024)).toFixed(1)}MB`;
    return `
      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-100 border border-purple-200 text-purple-900 text-xs font-semibold shadow-2xs">
        ${thumbHtml || `<i class="fa-solid fa-paperclip text-purple-600 text-[10px]"></i>`}
        <span class="max-w-[120px] truncate" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
        <span class="text-[10px] text-purple-500">(${sizeStr})</span>
        <button type="button" onclick="removeModalOwnerUploadFile(${idx})" class="w-5 h-5 rounded hover:bg-rose-100 text-rose-500 hover:text-rose-700 flex items-center justify-center transition-colors cursor-pointer" title="Delete file">
          <i class="fa-solid fa-trash-can text-[11px]"></i>
        </button>
      </span>
    `;
  }).join("");
}

window.handleModalOwnerUploadChange = handleModalOwnerUploadChange;
window.removeModalOwnerUploadFile = removeModalOwnerUploadFile;
window.renderModalOwnerUploadFilesPreview = renderModalOwnerUploadFilesPreview;
