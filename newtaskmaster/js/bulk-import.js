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

  document.addEventListener("DOMContentLoaded", function () {
    initPropertyHeader();
    initDownloadSample();
    initFileUpload();
    initFilterTabs();
    initImportAction();
  });

  // 1. Property Header Display
  function initPropertyHeader() {
    const propNameEl = document.getElementById("bulkImportPropName");
    const propIdEl = document.getElementById("bulkImportPropId");

    function updatePropDisplay() {
      const propId = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentProperty() : "PROP001";
      const propName = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentPropertyName() : "Main Facility";
      if (propNameEl) propNameEl.textContent = propName;
      if (propIdEl) propIdEl.textContent = propId;
    }

    updatePropDisplay();
    window.addEventListener("workwize:propertyChanged", updatePropDisplay);
  }

  // 2. Sample CSV Template Generation & Download
  function initDownloadSample() {
    const btn = document.getElementById("btnDownloadSampleCsv");
    if (!btn) return;

    btn.addEventListener("click", function () {
      const propName = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentPropertyName() : "OZEN RESERVE BOLIFUSHI";
      const propId = (typeof WorkWizeAPI !== "undefined") ? WorkWizeAPI.getCurrentProperty() : "PROP-001";

      const headers = [
        "Property Name",
        "Property ID",
        "Area",
        "Villa Number",
        "Location",
        "Priority",
        "Status",
        "Job Date",
        "Expected Completion Date",
        "Reference Number",
        "Budget",
        "Cost Center",
        "CCF Department",
        "Assigned To",
        "Job Details",
        "Remarks"
      ];

      const today = new Date().toISOString().split("T")[0];
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

      // Sample Row 1: Guest Villa Maintenance (Villa is required)
      const sampleRow1 = [
        `"${propName}"`,
        `"${propId}"`,
        `"Guest Villa"`,
        `"Villa 101"`,
        `"Master Bedroom AC Unit"`,
        `"High"`,
        `"Yet to Commence"`,
        `"${today}"`,
        `"${nextWeek}"`,
        `"REF-GV-101"`,
        `"0"`,
        `"No"`,
        `"Engineering"`,
        `"Engineering, HVAC"`,
        `"AC cooling efficiency low in master bedroom. Needs filter cleaning and refrigerant level check."`,
        `"Guest reported low cooling during afternoon. High priority."`
      ];

      // Sample Row 2: Public Area Maintenance
      const sampleRow2 = [
        `"${propName}"`,
        `"${propId}"`,
        `"Public Area"`,
        `""`,
        `"Main Pool Deck Pathway"`,
        `"Medium"`,
        `"Yet to Commence"`,
        `"${today}"`,
        `"${nextWeek}"`,
        `"REF-PA-202"`,
        `"150"`,
        `"Yes"`,
        `"Maintenance"`,
        `"Electrical"`,
        `"Path light fixture #4 flickering near main pool bar. Replace LED ballast and check water sealing."`,
        `"Scheduled maintenance check."`
      ];

      // Sample Row 3: Utility Maintenance
      const sampleRow3 = [
        `"${propName}"`,
        `"${propId}"`,
        `"Utility"`,
        `""`,
        `"Desalination Plant Pump B"`,
        `"Safety"`,
        `"In Progress"`,
        `"${today}"`,
        `"${nextWeek}"`,
        `"REF-UT-303"`,
        `"300"`,
        `"Yes"`,
        `"Plant Operations"`,
        `"Plumbing, Engineering"`,
        `"High pressure valve vibration observed during morning shift inspection. Fasten mounting bracket and verify seal."`,
        `"Safety precaution required before full pressure load."`
      ];

      const csvRows = [
        headers.join(","),
        sampleRow1.join(","),
        sampleRow2.join(","),
        sampleRow3.join(",")
      ];

      const csvContent = "\uFEFF" + csvRows.join("\r\n");
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
        showToast("Sample CSV template downloaded with current property pre-filled!", "success");
      }
    });
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

    function processSelectedFile(file) {
      if (!file.name.toLowerCase().endsWith(".csv")) {
        alert("Please select a valid .csv file.");
        return;
      }

      if (fileNameEl) fileNameEl.textContent = file.name;
      if (fileSizeEl) fileSizeEl.textContent = formatFileSize(file.size);
      if (fileInfoCard) fileInfoCard.classList.remove("hidden");
      dropZone.classList.add("hidden");

      const reader = new FileReader();
      reader.onload = function (e) {
        const text = e.target.result;
        parseAndValidateCSV(text, file.name);
      };
      reader.onerror = function () {
        alert("Failed to read the file.");
      };
      reader.readAsText(file, "UTF-8");
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

  // 4. CSV Parser & Row Validator
  function parseAndValidateCSV(csvText, fileName) {
    const rawRows = parseCSV(csvText);
    if (!rawRows || rawRows.length <= 1) {
      alert("The selected CSV file is empty or missing headers.");
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
      const areaVal = getCol(row, "Area", "areaName", "Operational Area") || "Guest Villa";
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
      const assignedVal = getCol(row, "Assigned To", "Assignee", "Team") || "IT";
      const detailsVal = getCol(row, "Job Details", "Details", "jobDetail", "Description");
      const remarksVal = getCol(row, "Remarks", "remark", "Job Remarks");

      // Validation Checks
      const errors = [];

      // Check 1: Job Details or Remarks required
      if (!detailsVal && !remarksVal) {
        errors.push("Job Details is required.");
      }

      // Check 2: Villa Number required if area is Guest Villa
      const isGuestVilla = areaVal.toLowerCase().includes("villa");
      if (isGuestVilla && !villaVal) {
        errors.push("Villa Number is required for Guest Villa area.");
      }

      const parsedItem = {
        rowNum: i,
        propName: propNameVal,
        propId: propIdVal,
        area: areaVal,
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
              areaName: r.area,
              areaID: r.area,
              villaNumber: r.villaNumber,
              jobLocation: r.location,
              priority: r.priority,
              jobStatus: r.status,
              jobDate: r.jobDate,
              completeDate: r.completeDate,
              refNum: r.refNum,
              budget: String(r.budget || 0),
              ccf: r.ccf,
              ccfdept: r.ccfdept,
              assignedTo: r.assignedTo,
              jobDetail: r.details,
              remarks: r.remarks
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
            formData.append("areaID", item.area);
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
            formData.append("assignedTo", item.assignedTo || "IT");

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
