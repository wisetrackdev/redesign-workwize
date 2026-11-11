/**
 * WorkWize TaskMaster - Bulk Job Import Controller
 * Allows maintenance teams to download sample CSV template, preview & validate rows,
 * and bulk import maintenance jobs with complete metadata & property association.
 */

(function () {
  let parsedRows = [];
  let validRows = [];
  let invalidRows = [];
  let isImporting = false;
  let activeFilter = "all"; // "all" | "valid" | "error"
  let cachedPropAreas = [];

  document.addEventListener("DOMContentLoaded", function () {
    initPropertyHeader();
    initDownloadSample();
    initFileUpload();
    initFilterTabs();
    initImportAction();
    ensurePropertyAreas();
  });

  // Ensure property areas are preloaded and cached
  async function ensurePropertyAreas() {
    if (cachedPropAreas && cachedPropAreas.length > 0) return cachedPropAreas;
    const propId = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentProperty() : "PROP001";
    try {
      if (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getPropertyInfo === "function") {
        const propInfo = await WorkWizeAPI.getPropertyInfo(propId);
        const list = propInfo?.propArea || propInfo?.propAreas || propInfo?.PropArea || propInfo?.PropAreas || [];
        if (Array.isArray(list) && list.length > 0) {
          cachedPropAreas = list;
          return cachedPropAreas;
        }
      }
    } catch (err) {
      console.warn("Could not preload property areas:", err);
    }
    return cachedPropAreas;
  }

  // 1. Property Header Display
  function initPropertyHeader() {
    const propNameEl = document.getElementById("bulkImportPropName");
    const propIdEl = document.getElementById("bulkImportPropId");

    async function updatePropDisplay() {
      cachedPropAreas = []; // Reset on property switch
      const propId = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentProperty() : "PROP001";
      const propName = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentPropertyName() : "Main Facility";
      if (propNameEl) propNameEl.textContent = propName;
      if (propIdEl) propIdEl.textContent = propId;
      await ensurePropertyAreas();
      if (typeof window.populateModalDropdowns === "function") {
        try {
          await window.populateModalDropdowns();
        } catch (e) {}
      }
    }

    updatePropDisplay();
    window.addEventListener("workwize:propertyChanged", updatePropDisplay);
  }

  // 2. Sample Template Generation & Download with Dynamic Excel Dropdowns
  function initDownloadSample() {
    const btn = document.getElementById("btnDownloadSampleCsv");

    if (btn) {
      btn.addEventListener("click", async function () {
        await generateAndDownloadExcelTemplate();
      });
    }
  }

  async function getDynamicDropdownOptions() {
    const propId = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentProperty() : "PROP-001";
    const propName = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentPropertyName() : "Main Facility";

    const defaultAreas = [
      "Guest Villa",
      "Public Area",
      "Utility",
      "Statutory Compliance",
      "Development/Project",
      "Fire Safety",
      "Back of the House",
      "CAPEX",
      "SOP & Checklist",
      "Energy Management",
      "Waste Management",
      "Landscaping"
    ];

    let areas = [];
    try {
      await ensurePropertyAreas();
      if (Array.isArray(cachedPropAreas) && cachedPropAreas.length > 0) {
        areas = cachedPropAreas
          .filter(a => a && a.isactive !== false && a.isactive !== 0 && a.isactive !== "0" && a.status !== false && a.status !== 0)
          .map(a => (a.areaName || a.AreaName || "").trim())
          .filter(Boolean);
      }
    } catch (e) {
      console.warn("Could not fetch property areas for template:", e);
    }

    if (!areas || areas.length === 0) {
      areas = defaultAreas;
    }

    // Deduplicate areas
    areas = Array.from(new Set(areas));

    const priorities = ["High", "Medium", "Low", "Safety"];

    const statuses = [
      "Yet to Commence",
      "In Progress",
      "Spares on Order",
      "Under Discussion",
      "Fixed",
      "Completed",
      "Closed"
    ];

    const costCenters = [
      "POMEC",
      "CAPEX",
      "Department Operational Budget"
    ];

    // Extract Assignees matching Create Job dropdown EXACTLY
    let assignees = [];

    // Ensure Create Job modal dropdowns are populated if possible
    if (typeof window.populateModalDropdowns === "function") {
      try {
        await window.populateModalDropdowns();
      } catch (e) {}
    }

    // 1. Read directly from the Create Job modal dropdown options (#modalAssignedToMenu)
    const menuEl = document.getElementById("modalAssignedToMenu");
    if (menuEl) {
      const cbs = menuEl.querySelectorAll("input.modal-assignee-cb");
      if (cbs && cbs.length > 0) {
        cbs.forEach(cb => {
          const name = (cb.dataset.name || cb.getAttribute("data-name") || cb.nextElementSibling?.textContent || cb.value || "").trim();
          if (name && !assignees.includes(name)) {
            assignees.push(name);
          }
        });
      }
    }

    // 2. If not yet populated in DOM, reproduce identical Create Job logic from propEmp
    if (assignees.length === 0) {
      try {
        if (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getPropertyInfo === "function") {
          const propInfo = await WorkWizeAPI.getPropertyInfo(propId);
          if (propInfo && Array.isArray(propInfo.propEmp)) {
            const empList = propInfo.propEmp.map(e => ({ ...e }));

            // Ensure OproAdmin is present in propEmp exactly like Create Job in main.js
            const hasOproInEmp = empList.some(emp => {
              const roleStr = String(emp.role || emp.userRole || emp.desg || "").toUpperCase();
              const mgrRoleStr = String(emp.manager?.role || emp.manager?.desg || "").toUpperCase();
              return roleStr.includes("OPRO") || mgrRoleStr.includes("OPRO") || String(emp.email || "").toLowerCase().includes("oproadmin");
            });

            if (!hasOproInEmp) {
              const curU = (typeof UserSession !== "undefined" && typeof UserSession.getUser === "function") ? UserSession.getUser() : null;
              const curName = (typeof UserSession !== "undefined" && typeof UserSession.getUserFullName === "function")
                ? UserSession.getUserFullName()
                : "Testing Test";
              empList.unshift({
                teamId: (curU && (curU.id || curU.email)) || "OproAdmin",
                teamName: "OproAdmin",
                firstName: curName ? curName.split(" ")[0] : "Testing",
                lastName: curName ? curName.split(" ").slice(1).join(" ") : "Test",
                desg: "OproAdmin",
                role: "OPROADMIN",
                email: (curU && curU.email) || "testing@test.com"
              });
            }

            empList.forEach(emp => {
              if (!emp) return;
              let label = emp.teamName;

              const isEmpOpro = (
                String(emp.role || "").toUpperCase().includes("OPROADMIN") ||
                String(emp.userRole || "").toUpperCase().includes("OPROADMIN") ||
                String(emp.desg || "").toUpperCase().replace(/\s+/g, "").includes("OPROADMIN") ||
                String(emp.manager?.desg || "").toUpperCase().replace(/\s+/g, "").includes("OPROADMIN") ||
                String(emp.manager?.role || "").toUpperCase().replace(/\s+/g, "").includes("OPROADMIN") ||
                String(emp.email || "").toLowerCase().includes("oproadmin") ||
                String(emp.teamName || "").toUpperCase().replace(/\s+/g, "").includes("OPROADMIN")
              );

              if (isEmpOpro) {
                let name = (typeof UserSession !== "undefined" && typeof UserSession.getNameFromUserOrEmail === "function")
                  ? UserSession.getNameFromUserOrEmail(emp)
                  : `${emp.firstName || ""} ${emp.lastName || ""}`.trim();
                if (!name) name = "Testing Test";
                label = `${name} [OproAdmin]`;
              } else if (emp.manager && (emp.manager.firstName || emp.manager.desg)) {
                const desg = (emp.manager.desg || "").trim();
                const name = `${emp.manager.firstName || ""} ${emp.manager.lastName || ""}`.trim();
                label = desg ? `${desg} [${emp.teamName}]` : (name ? `${name} [${emp.teamName}]` : emp.teamName);
              }

              if (label && !assignees.includes(label)) {
                assignees.push(label);
              }
            });
          }
        }
      } catch (err) {
        console.warn("Could not fetch property assignees for template:", err);
      }
    }

    if (assignees.length === 0) {
      const curName = (typeof UserSession !== "undefined" && typeof UserSession.getUserFullName === "function")
        ? UserSession.getUserFullName()
        : "Testing Test";
      assignees = [`${curName} [OproAdmin]`];
    }

    assignees = Array.from(new Set(assignees.filter(Boolean)));

    return { propId, propName, areas, priorities, statuses, costCenters, assignees };
  }

  async function generateAndDownloadExcelTemplate() {
    const { propId, propName, areas, priorities, statuses, costCenters, assignees } = await getDynamicDropdownOptions();

    // Check if ExcelJS is loaded
    if (typeof ExcelJS === "undefined") {
      console.warn("ExcelJS not available, falling back to CSV download.");
      downloadPlainCsv();
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "WorkWize TaskMaster";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Jobs Import Template");

    worksheet.columns = [
      { header: "Property Name", key: "propName", width: 26 },
      { header: "Property ID", key: "propId", width: 16 },
      { header: "Area", key: "area", width: 24 },
      { header: "Villa Number", key: "villa", width: 16 },
      { header: "Location", key: "location", width: 25 },
      { header: "Priority", key: "priority", width: 14 },
      { header: "Status", key: "status", width: 18 },
      { header: "Job Date", key: "jobDate", width: 14 },
      { header: "Expected Completion Date", key: "expDate", width: 25 },
      { header: "Reference Number", key: "refNum", width: 18 },
      { header: "Budget", key: "budget", width: 12 },
      { header: "Cost Center", key: "ccf", width: 30 },
      { header: "CCF Department", key: "ccfdept", width: 22 },
      { header: "Assigned To", key: "assigned", width: 24 },
      { header: "Job Details", key: "details", width: 45 },
      { header: "Remarks", key: "remarks", width: 35 }
    ];

    // Style Header Row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 10 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1E3A8A" }
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 28;

    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const sampleArea1 = areas.find(a => a.toLowerCase().includes("villa")) || areas[0] || "Guest Villa";
    const sampleArea2 = areas.find(a => a.toLowerCase().includes("public")) || areas[1] || "Public Area";
    const sampleArea3 = areas.find(a => a.toLowerCase().includes("util") || a.toLowerCase().includes("plant")) || areas[2] || "Utility";
    const sampleVilla1 = sampleArea1.toLowerCase().includes("villa") ? "Villa 101" : "";

    // Add 3 sample rows
    worksheet.addRow({
      propName: propName,
      propId: propId,
      area: sampleArea1,
      villa: sampleVilla1,
      location: "Master Bedroom AC Unit",
      priority: "High",
      status: "Yet to Commence",
      jobDate: today,
      expDate: nextWeek,
      refNum: "REF-GV-101",
      budget: 0,
      ccf: "POMEC",
      ccfdept: "Engineering",
      assigned: assignees[0] || "OproAdmin",
      details: "AC cooling efficiency low in master bedroom. Needs filter cleaning and refrigerant level check.",
      remarks: "Guest reported low cooling during afternoon. High priority."
    });

    worksheet.addRow({
      propName: propName,
      propId: propId,
      area: sampleArea2,
      villa: "",
      location: "Main Pool Deck Pathway",
      priority: "Medium",
      status: "Yet to Commence",
      jobDate: today,
      expDate: nextWeek,
      refNum: "REF-PA-202",
      budget: 150,
      ccf: "CAPEX",
      ccfdept: "Maintenance",
      assigned: assignees[1] || assignees[0] || "OproAdmin",
      details: "Path light fixture #4 flickering near main pool bar. Replace LED ballast and check water sealing.",
      remarks: "Scheduled maintenance check."
    });

    worksheet.addRow({
      propName: propName,
      propId: propId,
      area: sampleArea3,
      villa: "",
      location: "Desalination Plant Pump B",
      priority: "Safety",
      status: "In Progress",
      jobDate: today,
      expDate: nextWeek,
      refNum: "REF-UT-303",
      budget: 300,
      ccf: "Department Operational Budget",
      ccfdept: "Plant Operations",
      assigned: assignees[2] || assignees[0] || "OproAdmin",
      details: "High pressure valve vibration observed during morning shift inspection. Fasten mounting bracket and verify seal.",
      remarks: "Safety precaution required before full pressure load."
    });

    // Hidden lookup sheet for dropdown lists (Excel Best Practice)
    const lookupSheet = workbook.addWorksheet("DropdownLists", { state: "hidden" });
    areas.forEach((val, idx) => { lookupSheet.getCell(`A${idx + 1}`).value = val; });
    priorities.forEach((val, idx) => { lookupSheet.getCell(`B${idx + 1}`).value = val; });
    statuses.forEach((val, idx) => { lookupSheet.getCell(`C${idx + 1}`).value = val; });
    costCenters.forEach((val, idx) => { lookupSheet.getCell(`D${idx + 1}`).value = val; });
    assignees.forEach((val, idx) => { lookupSheet.getCell(`E${idx + 1}`).value = val; });

    // Apply Data Validation dropdowns to rows 2 to 500
    for (let r = 2; r <= 500; r++) {
      // Area (Col C)
      worksheet.getCell(`C${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`DropdownLists!$A$1:$A$${areas.length}`]
      };

      // Priority (Col F)
      worksheet.getCell(`F${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`DropdownLists!$B$1:$B$${priorities.length}`]
      };

      // Status (Col G)
      worksheet.getCell(`G${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`DropdownLists!$C$1:$C$${statuses.length}`]
      };

      // Cost Center (Col L)
      worksheet.getCell(`L${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`DropdownLists!$D$1:$D${costCenters.length}`]
      };

      // Assigned To (Col N)
      worksheet.getCell(`N${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`DropdownLists!$E$1:$E${assignees.length}`]
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safePropName = propName.replace(/[^a-zA-Z0-9]/g, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `Sample_Job_Bulk_Import_${safePropName}.xlsx`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof showToast === "function") {
      showToast("Template downloaded with Excel dropdowns for Area, Priority, Status, and Cost Center!", "success");
    }
  }

  function downloadPlainCsv() {
    const propName = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentPropertyName() : "Main Facility";
    const propId = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentProperty() : "PROP-001";
    const today = new Date().toISOString().split("T")[0];
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const headers = [
      "Property Name", "Property ID", "Area", "Villa Number", "Location", "Priority", "Status",
      "Job Date", "Expected Completion Date", "Reference Number", "Budget", "Cost Center",
      "CCF Department", "Assigned To", "Job Details", "Remarks"
    ];

    const sampleRow1 = [
      `"${propName}"`, `"${propId}"`, `"Guest Villa"`, `"Villa 101"`, `"Master Bedroom AC Unit"`,
      `"High"`, `"Yet to Commence"`, `"${today}"`, `"${nextWeek}"`, `"REF-GV-101"`, `"0"`,
      `"POMEC"`, `"Engineering"`, `"Engineering, HVAC"`,
      `"AC cooling efficiency low in master bedroom. Needs filter cleaning and refrigerant level check."`,
      `"Guest reported low cooling during afternoon. High priority."`
    ];

    const sampleRow2 = [
      `"${propName}"`, `"${propId}"`, `"Public Area"`, `""`, `"Main Pool Deck Pathway"`,
      `"Medium"`, `"Yet to Commence"`, `"${today}"`, `"${nextWeek}"`, `"REF-PA-202"`, `"150"`,
      `"CAPEX"`, `"Maintenance"`, `"Facilities Team"`,
      `"Path light fixture #4 flickering near main pool bar. Replace LED ballast and check water sealing."`,
      `"Scheduled maintenance check."`
    ];

    const sampleRow3 = [
      `"${propName}"`, `"${propId}"`, `"Utility"`, `""`, `"Desalination Plant Pump B"`,
      `"Safety"`, `"In Progress"`, `"${today}"`, `"${nextWeek}"`, `"REF-UT-303"`, `"300"`,
      `"Department Operational Budget"`, `"Plant Operations"`, `"Plumbing, Engineering"`,
      `"High pressure valve vibration observed during morning shift inspection. Fasten mounting bracket and verify seal."`,
      `"Safety precaution required before full pressure load."`
    ];

    const csvContent = "\uFEFF" + [headers.join(","), sampleRow1.join(","), sampleRow2.join(","), sampleRow3.join(",")].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const safePropName = propName.replace(/[^a-zA-Z0-9]/g, "_");
    link.setAttribute("href", url);
    link.setAttribute("download", `Sample_Job_Bulk_Import_${safePropName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    if (typeof showToast === "function") {
      showToast("Sample CSV template downloaded successfully!", "success");
    }
  }

  // 3. File Upload & Drag-and-Drop Handling
  function initFileUpload() {
    const dropZone = document.getElementById("csvDropZone");
    const fileInput = document.getElementById("csvFileInput");
    const btnBrowse = document.getElementById("btnBrowseFile");
    const fileInfoCard = document.getElementById("selectedFileInfo");
    const fileNameEl = document.getElementById("selectedFileName");
    const fileSizeEl = document.getElementById("selectedFileSize");
    const btnRemoveFile = document.getElementById("btnRemoveFile");

    if (!dropZone || !fileInput) return;

    if (btnBrowse) {
      btnBrowse.addEventListener("click", () => fileInput.click());
    }

    dropZone.addEventListener("click", function (e) {
      if (e.target.closest("button") || e.target.closest("#selectedFileInfo")) return;
      fileInput.click();
    });

    ["dragenter", "dragover"].forEach(eventName => {
      dropZone.addEventListener(eventName, function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add("border-blue-500", "bg-blue-50/50");
      });
    });

    ["dragleave", "drop"].forEach(eventName => {
      dropZone.addEventListener(eventName, function (e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove("border-blue-500", "bg-blue-50/50");
      });
    });

    dropZone.addEventListener("drop", function (e) {
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        processSelectedFile(files[0]);
      }
    });

    fileInput.addEventListener("change", function () {
      if (fileInput.files && fileInput.files.length > 0) {
        processSelectedFile(fileInput.files[0]);
      }
    });

    if (btnRemoveFile) {
      btnRemoveFile.addEventListener("click", function (e) {
        e.stopPropagation();
        resetFileUpload();
      });
    }

    async function processSelectedFile(file) {
      const isXlsx = file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls");
      const isCsv = file.name.toLowerCase().endsWith(".csv");

      if (!isXlsx && !isCsv) {
        alert("Please select a valid .xlsx or .csv file.");
        return;
      }

      if (fileNameEl) fileNameEl.textContent = file.name;
      if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);
      if (fileInfoCard) fileInfoCard.classList.remove("hidden");
      dropZone.classList.add("hidden");

      await ensurePropertyAreas();

      if (isXlsx && typeof ExcelJS !== "undefined") {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const wb = new ExcelJS.Workbook();
          await wb.xlsx.load(arrayBuffer);
          const sheet = wb.worksheets.find(s => s.state !== "hidden") || wb.worksheets[0];
          const rawRows = [];
          sheet.eachRow({ includeEmpty: false }, (row) => {
            const rowValues = [];
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              rowValues[colNumber - 1] = cell.text || (cell.value !== null && cell.value !== undefined ? String(cell.value) : "");
            });
            rawRows.push(rowValues);
          });
          parseAndValidateRows(rawRows, file.name);
        } catch (err) {
          alert("Failed to parse Excel file: " + err.message);
          resetFileUpload();
        }
      } else {
        const reader = new FileReader();
        reader.onload = async function (e) {
          const text = e.target.result;
          await ensurePropertyAreas();
          parseAndValidateCSV(text, file.name);
        };
        reader.onerror = function () {
          alert("Failed to read the file.");
        };
        reader.readAsText(file, "UTF-8");
      }
    }

    function resetFileUpload() {
      fileInput.value = "";
      parsedRows = [];
      validRows = [];
      invalidRows = [];
      if (fileInfoCard) fileInfoCard.classList.add("hidden");
      dropZone.classList.remove("hidden");
      document.getElementById("previewCard")?.classList.add("hidden");
      document.getElementById("importSummaryBanner")?.classList.add("hidden");
      updateCounters();
    }

    window.resetBulkUpload = resetFileUpload;
  }

  function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  }

  // 4. CSV & Excel Parser & Row Validator
  function parseAndValidateCSV(csvText, fileName) {
    const rawRows = parseCSV(csvText);
    parseAndValidateRows(rawRows, fileName);
  }

  function parseAndValidateRows(rawRows, fileName) {
    if (!rawRows || rawRows.length <= 1) {
      alert("The selected file is empty or missing headers.");
      return;
    }

    const headers = rawRows[0].map(h => String(h || "").trim());
    const headerMap = {};
    headers.forEach((h, idx) => {
      const clean = h.toLowerCase().replace(/[^a-z0-9]/g, "");
      headerMap[clean] = idx;
    });

    function getCol(row, ...aliases) {
      for (const a of aliases) {
        const clean = a.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (headerMap[clean] !== undefined && row[headerMap[clean]] !== undefined) {
          return String(row[headerMap[clean]] || "").trim();
        }
      }
      return "";
    }

    const currentPropName = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentPropertyName() : "Main Facility";
    const currentPropId = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentProperty() : "PROP001";

    parsedRows = [];
    validRows = [];
    invalidRows = [];

    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      // Skip empty rows
      if (row.length === 0 || row.every(c => !String(c || "").trim())) continue;

      const propNameVal = getCol(row, "Property Name", "Property", "propName", "prop") || currentPropName;
      const propIdVal = getCol(row, "Property ID", "propId") || currentPropId;
      const areaValRaw = getCol(row, "Area", "areaName", "Operational Area", "areaID", "areaId");
      const areaVal = areaValRaw ? areaValRaw.trim() : "";
      const villaVal = getCol(row, "Villa Number", "Villa", "villaNumber", "villa");
      const locationVal = getCol(row, "Location", "jobLocation");
      const priorityVal = normalizePriority(getCol(row, "Priority"));
      const statusVal = normalizeStatus(getCol(row, "Status", "jobStatus"));
      const jobDateVal = getCol(row, "Job Date", "Create Date", "jobDate", "Date") || new Date().toISOString().split("T")[0];
      const completeDateVal = getCol(row, "Expected Completion Date", "Complete Date", "expectedCompletion");
      const refNumVal = getCol(row, "Reference Number", "Ref No", "refNum");
      const budgetVal = parseFloat(getCol(row, "Budget")) || 0;
      const ccfVal = getCol(row, "Cost Center", "CCF");
      const ccfDeptVal = getCol(row, "CCF Department", "ccfdept", "Department");
      const assignedVal = getCol(row, "Assigned To", "Assignee", "Team", "assignedTo");
      const detailsVal = getCol(row, "Job Details", "Details", "jobDetail", "Description");
      const remarksVal = getCol(row, "Remarks", "remark", "Job Remarks");

      // Match area against cached property areas to ensure exact dropdown selection is preserved
      let matchedArea = null;
      if (areaVal && Array.isArray(cachedPropAreas) && cachedPropAreas.length > 0) {
        const cleanVal = areaVal.toLowerCase();
        matchedArea = cachedPropAreas.find(a => {
          const aName = (a.areaName || a.AreaName || "").trim().toLowerCase();
          const aId = (a.areaid || a.areaId || a.AreaId || a.AreaID || "").trim().toLowerCase();
          return aName === cleanVal || aId === cleanVal;
        });
        if (!matchedArea) {
          matchedArea = cachedPropAreas.find(a => {
            const aName = (a.areaName || a.AreaName || "").trim().toLowerCase();
            return aName && cleanVal && (aName.includes(cleanVal) || cleanVal.includes(aName));
          });
        }
      }

      const resolvedAreaName = matchedArea ? (matchedArea.areaName || matchedArea.AreaName || areaVal) : areaVal;
      const resolvedAreaId = matchedArea ? (matchedArea.areaid || matchedArea.areaId || matchedArea.AreaId || matchedArea.AreaID || areaVal) : areaVal;

      // Validation Checks
      const errors = [];

      // Check 1: Job Details or Remarks required
      if (!detailsVal && !remarksVal) {
        errors.push("Job Details is required.");
      }

      // Check 2: Area is required
      if (!areaVal) {
        errors.push("Area is required.");
      }

      // Check 3: Villa Number required if area is Guest Villa
      const isGuestVilla = resolvedAreaName.toLowerCase().includes("villa") || (matchedArea && (matchedArea.isvilla === true || matchedArea.isvilla === 1 || matchedArea.isvilla === "1"));
      if (isGuestVilla && !villaVal) {
        errors.push("Villa Number is required for Guest Villa area.");
      }

      // Check 4: Assigned To required
      if (!assignedVal || !assignedVal.trim()) {
        errors.push("Assigned To is required.");
      }

      const parsedItem = {
        rowNum: i,
        propName: propNameVal,
        propId: propIdVal,
        area: resolvedAreaName,
        areaName: resolvedAreaName,
        areaId: resolvedAreaId,
        areaID: resolvedAreaId,
        villaNumber: villaVal,
        location: locationVal,
        priority: priorityVal,
        status: statusVal,
        jobDate: jobDateVal,
        completeDate: completeDateVal,
        refNum: refNumVal,
        budget: budgetVal,
        ccf: ccfVal,
        ccfdept: ccfDeptVal,
        assignedTo: assignedVal,
        details: detailsVal || remarksVal,
        remarks: remarksVal,
        isValid: errors.length === 0,
        errors: errors
      };

      parsedRows.push(parsedItem);
      if (parsedItem.isValid) {
        validRows.push(parsedItem);
      } else {
        invalidRows.push(parsedItem);
      }
    }

    renderPreviewTable();
    updateCounters();
    document.getElementById("previewCard")?.classList.remove("hidden");
  }

  // RFC-4180 CSV Parser (Handles multiline, quotes, commas)
  function parseCSV(text) {
    const lines = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push("");
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') i++;
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  }

  function normalizePriority(val) {
    const s = String(val || "").toLowerCase();
    if (s.includes("high")) return "High";
    if (s.includes("low")) return "Low";
    if (s.includes("safe")) return "Safety";
    return "Medium";
  }

  function normalizeStatus(val) {
    const s = String(val || "").toLowerCase();
    if (s.includes("progress")) return "In Progress";
    if (s.includes("spares")) return "Spares on Order";
    if (s.includes("discussion")) return "Under Discussion";
    if (s.includes("fixed")) return "Fixed";
    if (s.includes("closed")) return "Closed";
    if (s.includes("completed")) return "Completed";
    return "Yet to Commence";
  }

  // 5. Preview Table Rendering
  function renderPreviewTable() {
    const tbody = document.getElementById("previewTableBody");
    if (!tbody) return;

    let rowsToDisplay = parsedRows;
    if (activeFilter === "valid") rowsToDisplay = validRows;
    if (activeFilter === "error") rowsToDisplay = invalidRows;

    if (rowsToDisplay.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" class="py-10 text-center text-slate-400 text-xs">
            <i class="fa-solid fa-list-check text-2xl text-slate-300 mb-2 block"></i>
            No rows match the selected filter (${activeFilter}).
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = rowsToDisplay.map(item => {
      const rowClass = item.isValid
        ? "hover:bg-slate-50 transition-colors"
        : "bg-rose-50/50 hover:bg-rose-50 transition-colors";

      const statusBadge = item.isValid
        ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200"><i class="fa-solid fa-check text-[9px]"></i> Valid</span>`
        : `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200" title="${item.errors.join('; ')}"><i class="fa-solid fa-circle-exclamation text-[9px]"></i> Error</span>`;

      let priorityClass = "bg-amber-100 text-amber-800";
      if (item.priority === "High") priorityClass = "bg-rose-100 text-rose-800";
      else if (item.priority === "Low") priorityClass = "bg-slate-100 text-slate-700";
      else if (item.priority === "Safety") priorityClass = "bg-purple-100 text-purple-800";

      return `
        <tr class="${rowClass}">
          <td class="font-bold text-slate-500 text-center">${item.rowNum}</td>
          <td>${statusBadge}</td>
          <td class="font-semibold text-slate-800 truncate max-w-[140px]" title="${escapeHtml(item.propName)}">${escapeHtml(item.propName)}</td>
          <td class="text-slate-700 font-medium">${escapeHtml(item.area)}</td>
          <td class="font-semibold ${item.villaNumber ? 'text-blue-700' : 'text-slate-300'}">${escapeHtml(item.villaNumber || '-')}</td>
          <td class="text-slate-600 truncate max-w-[130px]">${escapeHtml(item.location || '-')}</td>
          <td><span class="px-2 py-0.5 rounded text-[10px] font-bold ${priorityClass}">${item.priority}</span></td>
          <td class="text-slate-600 truncate max-w-[120px]">${escapeHtml(item.assignedTo || '-')}</td>
          <td class="text-slate-700 truncate max-w-[240px]" title="${escapeHtml(item.details)}">
            ${escapeHtml(item.details)}
          </td>
          <td>
            ${item.isValid ? '<span class="text-emerald-600 text-[11px] font-medium">Ready</span>' : `<span class="text-rose-600 font-medium text-[11px]">${escapeHtml(item.errors[0])}</span>`}
          </td>
        </tr>
      `;
    }).join("");
  }

  function updateCounters() {
    const totalCount = parsedRows.length;
    const validCount = validRows.length;
    const invalidCount = invalidRows.length;

    const totalEl = document.getElementById("statTotalRows");
    const validEl = document.getElementById("statValidRows");
    const errorEl = document.getElementById("statErrorRows");
    const btnImport = document.getElementById("btnImportValidJobs");

    if (totalEl) totalEl.textContent = totalCount;
    if (validEl) validEl.textContent = validCount;
    if (errorEl) errorEl.textContent = invalidCount;

    if (btnImport) {
      btnImport.disabled = validCount === 0 || isImporting;
      btnImport.innerHTML = isImporting
        ? `<i class="fa-solid fa-circle-notch fa-spin mr-2"></i> Importing Jobs...`
        : `<i class="fa-solid fa-cloud-arrow-up mr-2"></i> Import ${validCount} Valid Jobs`;
    }
  }

  // 6. Filter Tabs
  function initFilterTabs() {
    const tabs = document.querySelectorAll(".preview-filter-tab");
    tabs.forEach(tab => {
      tab.addEventListener("click", function () {
        tabs.forEach(t => t.classList.remove("active", "bg-white", "shadow-xs", "text-blue-600", "font-bold"));
        tab.classList.add("active", "bg-white", "shadow-xs", "text-blue-600", "font-bold");
        activeFilter = tab.getAttribute("data-filter") || "all";
        renderPreviewTable();
      });
    });
  }

  // 7. Bulk Import Execution
  function initImportAction() {
    const btn = document.getElementById("btnImportValidJobs");
    if (!btn) return;

    btn.addEventListener("click", async function () {
      if (validRows.length === 0 || isImporting) return;

      const confirmMsg = `Are you sure you want to import ${validRows.length} jobs into ${validRows[0].propName}?`;
      if (!confirm(confirmMsg)) return;

      isImporting = true;
      updateCounters();

      const progressCard = document.getElementById("importProgressCard");
      const progressBar = document.getElementById("importProgressBar");
      const progressText = document.getElementById("importProgressText");
      const progressPercent = document.getElementById("importProgressPercent");
      const summaryBanner = document.getElementById("importSummaryBanner");

      if (progressCard) progressCard.classList.remove("hidden");
      if (summaryBanner) summaryBanner.classList.add("hidden");

      let successCount = 0;
      let failedCount = 0;
      const createdJobIds = [];
      const errorLog = [];

      // Step A: Attempt Backend Bulk Import Endpoint
      let usedBackendBulk = false;
      if (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.bulkImportJobs === "function") {
        try {
          if (progressText) progressText.textContent = "Sending batch payload to server...";
          if (progressBar) progressBar.style.width = "40%";
          if (progressPercent) progressPercent.textContent = "40%";

          const payload = {
            propId: validRows[0].propId,
            propName: validRows[0].propName,
            jobs: validRows.map(r => ({
              propId: r.propId,
              propName: r.propName,
              areaName: r.areaName || r.area,
              areaID: r.areaId || r.areaID || r.area,
              villaNumber: r.villaNumber || "",
              jobLocation: r.location || "",
              priority: r.priority,
              jobStatus: r.status,
              jobDate: r.jobDate,
              completeDate: r.completeDate || "",
              refNum: r.refNum || "",
              budget: String(r.budget || 0),
              ccf: r.ccf || "No",
              ccfdept: r.ccfdept || "",
              assignedTo: (() => {
                let aVal = r.assignedTo || "";
                const modalMenuCbs = document.querySelectorAll("#modalAssignedToMenu input.modal-assignee-cb");
                if (modalMenuCbs && modalMenuCbs.length > 0) {
                  const m = Array.from(modalMenuCbs).find(cb => {
                    const n = (cb.dataset.name || cb.getAttribute("data-name") || cb.nextElementSibling?.textContent || "").trim();
                    return n.toLowerCase() === aVal.toLowerCase() || cb.value.toLowerCase() === aVal.toLowerCase();
                  });
                  if (m && m.value) aVal = m.value;
                }
                return aVal;
              })(),
              jobDetail: r.details,
              remarks: r.remarks || ""
            }))
          };

          const res = await WorkWizeAPI.bulkImportJobs(payload);
          if (res && res.success) {
            usedBackendBulk = true;
            successCount = res.successJobs || validRows.length;
            failedCount = res.failedJobs || 0;
            if (Array.isArray(res.importedJobIds)) {
              createdJobIds.push(...res.importedJobIds);
            }
            if (Array.isArray(res.errors)) {
              errorLog.push(...res.errors);
            }
            // Clean up any stale single-job session cache so imported jobs aren't duplicated
            sessionStorage.removeItem("workwize_newly_created_job");
          }
        } catch (err) {
          console.warn("Backend bulk import API unavailable, falling back to batch client import:", err);
        }
      }

      // Step B: Fallback client-side batching through addNewJob
      if (!usedBackendBulk) {
        for (let i = 0; i < validRows.length; i++) {
          const item = validRows[i];
          const pct = Math.round(((i + 1) / validRows.length) * 100);

          if (progressText) progressText.textContent = `Importing job ${i + 1} of ${validRows.length} (${item.area})...`;
          if (progressBar) progressBar.style.width = `${pct}%`;
          if (progressPercent) progressPercent.textContent = `${pct}%`;

          try {
            const formData = new FormData();
            formData.append("propId", item.propId);
            formData.append("areaID", item.areaId || item.areaID || item.area);
            formData.append("areaName", item.areaName || item.area);
            formData.append("villaNumber", item.villaNumber || "");
            formData.append("jobLocation", item.location || "");
            formData.append("priority", item.priority);
            formData.append("jobStatus", item.status);
            formData.append("jobDate", item.jobDate);
            if (item.completeDate) formData.append("completeDate", item.completeDate);
            formData.append("refNum", item.refNum || "");
            formData.append("jobDetail", item.details);
            formData.append("budget", String(item.budget || 0));
            formData.append("ccf", item.ccf || "No");
            formData.append("ccfdept", item.ccfdept || "");
            formData.append("jobremark", item.remarks || "");

            // Resolve assignedTo matching Create Job modal options if matched
            let finalAssigned = item.assignedTo || "";
            const modalMenuCbs = document.querySelectorAll("#modalAssignedToMenu input.modal-assignee-cb");
            if (modalMenuCbs && modalMenuCbs.length > 0) {
              const matchedCb = Array.from(modalMenuCbs).find(cb => {
                const n = (cb.dataset.name || cb.getAttribute("data-name") || cb.nextElementSibling?.textContent || "").trim();
                return n.toLowerCase() === finalAssigned.toLowerCase() || cb.value.toLowerCase() === finalAssigned.toLowerCase();
              });
              if (matchedCb && matchedCb.value) {
                finalAssigned = matchedCb.value;
              }
            }
            formData.append("assignedTo", finalAssigned);

            let createdId = null;
            if (typeof WorkWizeAPI !== "undefined" && WorkWizeAPI.addNewJob) {
              const res = await WorkWizeAPI.addNewJob(formData);
              if (res && (res.jobId || res.jobid)) {
                createdId = res.jobId || res.jobid;
              }
            }

            if (!createdId) {
              // Local fallback ID
              const rand5 = Math.floor(10000 + Math.random() * 90000);
              createdId = `WRK-${new Date().toISOString().slice(2, 10).replace(/-/g, '')}-${rand5}`;
            }

            createdJobIds.push(createdId);
            successCount++;

            // Inject into session storage for instant top-of-list display
            if (i === 0) {
              sessionStorage.setItem("workwize_newly_created_job_id", createdId);
              localStorage.setItem("workwize_newly_created_job_id", createdId);
              // Clean up any stale single-job session cache so imported jobs aren't duplicated
              sessionStorage.removeItem("workwize_newly_created_job");
            }
          } catch (jobErr) {
            failedCount++;
            errorLog.push(`Row ${item.rowNum}: ${jobErr.message || "Failed to create"}`);
          }

          // Small delay to keep UI responsive
          await new Promise(r => setTimeout(r, 60));
        }
      }

      // Mark first created ID in session/local storage
      if (createdJobIds.length > 0) {
        sessionStorage.setItem("workwize_newly_created_job_id", createdJobIds[0]);
        localStorage.setItem("workwize_newly_created_job_id", createdJobIds[0]);
      }

      isImporting = false;
      updateCounters();
      if (progressCard) progressCard.classList.add("hidden");

      // Show Summary Banner
      if (summaryBanner) {
        summaryBanner.classList.remove("hidden");
        const successCountEl = document.getElementById("importSuccessCount");
        const failedCountEl = document.getElementById("importFailedCount");
        const jobIdsEl = document.getElementById("importCreatedJobIds");

        if (successCountEl) successCountEl.textContent = successCount;
        if (failedCountEl) failedCountEl.textContent = failedCount;
        if (jobIdsEl) {
          jobIdsEl.innerHTML = createdJobIds.map(id => `<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">${id}</span>`).join(" ");
        }
      }

      if (typeof showToast === "function") {
        showToast(`Bulk Import complete: ${successCount} jobs created!`, "success");
      }
    });
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
})();
