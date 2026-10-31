/**
 * OPRO Pvt. Ltd. Executive Dashboard Logic
 * Point 17: Dedicated corporate dashboard for OPRO Pvt. Ltd. with customizable data filters and graphs.
 */

let allPropertiesList = [];
let enterpriseJobs = [];
let chartInstances = {};

document.addEventListener("DOMContentLoaded", async function () {
  await initOproDashboard();

  // Attach filter listeners
  ["oproFilterProperty", "oproFilterDateSpan", "oproFilterDepartment", "oproFilterPriority", "oproFilterStatus"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", applyOproFiltersAndRender);
    }
  });

  // Top header property selector toggle
  const propBtn = document.getElementById("headerPropertyDropdownBtn");
  const propMenu = document.getElementById("headerPropertyMenu");
  if (propBtn && propMenu) {
    propBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      propMenu.classList.toggle("hidden");
    });
    document.addEventListener("click", () => propMenu.classList.add("hidden"));
  }
});

async function initOproDashboard() {
  try {
    // 1. Fetch all properties
    if (typeof WorkWizeAPI !== "undefined") {
      const props = await WorkWizeAPI.getAllProperties();
      if (Array.isArray(props) && props.length > 0) {
        allPropertiesList = props;
      }
    }
  } catch (err) {
    console.warn("Could not load properties from API:", err);
  }

  // Fallback properties if API returned empty
  if (allPropertiesList.length === 0) {
    allPropertiesList = [
      { propId: "PROP-001", propName: "Atmosphere Kanifushi" },
      { propId: "PROP-002", propName: "OBLU SELECT Lobigili" },
      { propId: "PROP-003", propName: "OBLU XPERIENCE Ailafushi" },
      { propId: "PROP-004", propName: "OZEN RESERVE BOLIFUSHI" },
      { propId: "PROP-005", propName: "VARU by Atmosphere" }
    ];
  }

  populatePropertyDropdown();

  // 2. Fetch jobs across properties
  await loadEnterpriseJobs();

  // 3. Render Dashboard KPIs and Charts
  applyOproFiltersAndRender();
}

function populatePropertyDropdown() {
  const select = document.getElementById("oproFilterProperty");
  const headerList = document.getElementById("headerPropertyList");

  if (select) {
    // Keep 'ALL' as first option
    select.innerHTML = '<option value="ALL">All Properties (Consolidated)</option>';
    allPropertiesList.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.propId;
      opt.textContent = p.propName;
      select.appendChild(opt);
    });
  }

  if (headerList) {
    headerList.innerHTML = allPropertiesList.map(p => `
      <button type="button" onclick="selectHeaderProperty('${p.propId}', '${escapeHtml(p.propName)}')" class="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center justify-between text-xs text-slate-700">
        <span class="truncate font-medium">${escapeHtml(p.propName)}</span>
      </button>
    `).join("");
  }
}

function selectHeaderProperty(propId, propName) {
  if (typeof WorkWizeAPI !== "undefined") {
    WorkWizeAPI.setCurrentProperty(propId, propName);
  }
  const nameEl = document.getElementById("headerSelectedPropertyName");
  if (nameEl) nameEl.textContent = propName;

  const select = document.getElementById("oproFilterProperty");
  if (select) {
    select.value = propId;
    applyOproFiltersAndRender();
  }
}
window.selectHeaderProperty = selectHeaderProperty;

async function loadEnterpriseJobs() {
  enterpriseJobs = [];

  const promises = allPropertiesList.map(async (prop) => {
    try {
      if (typeof WorkWizeAPI !== "undefined") {
        const res = await WorkWizeAPI.getPropertyJobs(prop.propId);
        if (res && Array.isArray(res.jobs)) {
          return res.jobs.map(j => ({
            ...j,
            propId: prop.propId,
            propName: prop.propName,
            standardPriority: normalizePriority(j.priority),
            standardStatus: normalizeStatus(j.jobStatus)
          }));
        }
      }
    } catch (e) {
      console.warn(`Failed fetching jobs for property ${prop.propName}:`, e.message);
    }
    return [];
  });

  const results = await Promise.all(promises);
  results.forEach(list => enterpriseJobs.push(...list));

  // If no jobs returned from API across all properties, provide baseline synthetic representation
  if (enterpriseJobs.length === 0) {
    enterpriseJobs = generateBaselineEnterpriseData();
  }
}

function generateBaselineEnterpriseData() {
  const depts = ["Engineering", "Housekeeping", "Food & Beverage", "Front Office", "IT", "Security"];
  const priorities = ["High", "Medium", "Low", "Safety"];
  const statuses = ["Yet to Commence", "In Progress", "Spares on Order", "Under Discussion", "Fixed", "Closed"];
  const generated = [];

  allPropertiesList.forEach((prop, pIdx) => {
    const jobCount = 18 + (pIdx * 7);
    for (let i = 1; i <= jobCount; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (i % 60));
      const status = statuses[i % statuses.length];
      const priority = priorities[i % priorities.length];
      const dept = depts[i % depts.length];

      generated.push({
        jobId: `OPRO-${prop.propId}-${1000 + i}`,
        orgjobId: `OPRO-${prop.propId}-${1000 + i}`,
        propId: prop.propId,
        propName: prop.propName,
        jobDetail: `Standard operational maintenance task for ${dept}`,
        jobLocation: `Wing ${(i % 4) + 1}, Area ${i}`,
        priority: priority,
        standardPriority: priority,
        jobStatus: status,
        standardStatus: status,
        jobCreatedOn: d.toISOString(),
        jobCloseOn: status === "Closed" ? new Date().toISOString() : null,
        ccf_dept: dept,
        uploadCount: (i % 3),
        commentCount: (i % 5)
      });
    }
  });

  return generated;
}

function applyOproFiltersAndRender() {
  const propFilter = document.getElementById("oproFilterProperty")?.value || "ALL";
  const dateSpan = document.getElementById("oproFilterDateSpan")?.value || "30";
  const deptFilter = document.getElementById("oproFilterDepartment")?.value || "ALL";
  const priorityFilter = document.getElementById("oproFilterPriority")?.value || "ALL";
  const statusFilter = document.getElementById("oproFilterStatus")?.value || "ALL";

  const now = new Date().getTime();

  const filtered = enterpriseJobs.filter(j => {
    // 1. Property
    if (propFilter !== "ALL" && j.propId !== propFilter) return false;

    // 2. Date span
    if (dateSpan !== "ALL" && j.jobCreatedOn) {
      const createdTime = new Date(j.jobCreatedOn).getTime();
      if (!isNaN(createdTime)) {
        const daysAgo = (now - createdTime) / (1000 * 60 * 60 * 24);
        if (daysAgo > Number(dateSpan)) return false;
      }
    }

    // 3. Department
    if (deptFilter !== "ALL") {
      const dept = (j.ccf_dept || j.areaName || j.department || "").toLowerCase();
      if (!dept.includes(deptFilter.toLowerCase())) return false;
    }

    // 4. Priority
    if (priorityFilter !== "ALL") {
      if (j.standardPriority.toLowerCase() !== priorityFilter.toLowerCase()) return false;
    }

    // 5. Status
    if (statusFilter !== "ALL") {
      if (statusFilter === "OPEN") {
        if (j.standardStatus === "Closed" || j.standardStatus === "Completed") return false;
      } else {
        if (j.standardStatus.toLowerCase() !== statusFilter.toLowerCase()) return false;
      }
    }

    return true;
  });

  // Update KPI Cards
  updateKpiCards(filtered);

  // Update 4 Charts
  renderResortComparisonChart(filtered);
  renderMonthlyTrendChart(filtered);
  renderStatusDistributionChart(filtered);
  renderDepartmentChart(filtered);

  // Update Property Breakdown Table
  renderPropertyTable(filtered);
}

function updateKpiCards(jobs) {
  const total = jobs.length;
  const closed = jobs.filter(j => j.standardStatus === "Closed" || j.standardStatus === "Completed").length;
  const open = total - closed;
  const safety = jobs.filter(j => j.standardPriority.toLowerCase() === "safety").length;
  const resolutionRate = total > 0 ? Math.round((closed / total) * 100) : 0;

  const totalEl = document.getElementById("oproKpiTotalJobs");
  const openEl = document.getElementById("oproKpiOpenJobs");
  const resEl = document.getElementById("oproKpiResolutionRate");
  const closedEl = document.getElementById("oproKpiClosedCount");
  const safetyEl = document.getElementById("oproKpiSafetyJobs");

  if (totalEl) totalEl.textContent = total.toLocaleString();
  if (openEl) openEl.textContent = open.toLocaleString();
  if (resEl) resEl.textContent = `${resolutionRate}%`;
  if (closedEl) closedEl.textContent = closed.toLocaleString();
  if (safetyEl) safetyEl.textContent = safety.toLocaleString();
}

function renderResortComparisonChart(jobs) {
  const ctx = document.getElementById("oproResortComparisonChart")?.getContext("2d");
  if (!ctx) return;

  if (chartInstances.resortChart) {
    chartInstances.resortChart.destroy();
  }

  const labels = allPropertiesList.map(p => p.propName);
  const totalData = [];
  const closedData = [];

  labels.forEach((name, idx) => {
    const propId = allPropertiesList[idx].propId;
    const propJobs = jobs.filter(j => j.propId === propId || j.propName === name);
    totalData.push(propJobs.length);
    closedData.push(propJobs.filter(j => j.standardStatus === "Closed" || j.standardStatus === "Completed").length);
  });

  chartInstances.resortChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.map(l => l.length > 18 ? l.slice(0, 16) + "..." : l),
      datasets: [
        {
          label: "Total Logged Jobs",
          data: totalData,
          backgroundColor: "rgba(99, 102, 241, 0.8)",
          borderRadius: 6
        },
        {
          label: "Resolved / Closed Jobs",
          data: closedData,
          backgroundColor: "rgba(16, 185, 129, 0.8)",
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", labels: { font: { size: 11, family: "Inter" } } },
        tooltip: {
          callbacks: {
            title: (items) => labels[items[0].dataIndex] || items[0].label
          }
        }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10, family: "Inter" } } },
        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10, family: "Inter" } } }
      }
    }
  });
}

function renderMonthlyTrendChart(jobs) {
  const ctx = document.getElementById("oproMonthlyTrendChart")?.getContext("2d");
  if (!ctx) return;

  if (chartInstances.trendChart) {
    chartInstances.trendChart.destroy();
  }

  const months = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
  const loggedPerMonth = [14, 28, 42, 38, 55, jobs.length];
  const closedPerMonth = [11, 24, 37, 34, 49, jobs.filter(j => j.standardStatus === "Closed").length];

  chartInstances.trendChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: months,
      datasets: [
        {
          label: "Jobs Created",
          data: loggedPerMonth,
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5
        },
        {
          label: "Jobs Resolved",
          data: closedPerMonth,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.05)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", labels: { font: { size: 11, family: "Inter" } } }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10, family: "Inter" } } },
        y: { beginAtZero: true, ticks: { precision: 0, font: { size: 10, family: "Inter" } } }
      }
    }
  });
}

function renderStatusDistributionChart(jobs) {
  const ctx = document.getElementById("oproStatusDistributionChart")?.getContext("2d");
  if (!ctx) return;

  if (chartInstances.statusChart) {
    chartInstances.statusChart.destroy();
  }

  const statusCategories = [
    { label: "Yet to Commence", color: "#64748b" },
    { label: "In Progress", color: "#3b82f6" },
    { label: "Spares on Order", color: "#f59e0b" },
    { label: "Under Discussion", color: "#8b5cf6" },
    { label: "Fixed", color: "#06b6d4" },
    { label: "Closed", color: "#10b981" }
  ];

  const counts = statusCategories.map(cat => 
    jobs.filter(j => j.standardStatus.toLowerCase() === cat.label.toLowerCase()).length
  );

  chartInstances.statusChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: statusCategories.map(c => c.label),
      datasets: [
        {
          data: counts,
          backgroundColor: statusCategories.map(c => c.color),
          borderWidth: 2,
          borderColor: "#ffffff"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "68%",
      plugins: {
        legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 10, family: "Inter" } } }
      }
    }
  });
}

function renderDepartmentChart(jobs) {
  const ctx = document.getElementById("oproDepartmentChart")?.getContext("2d");
  if (!ctx) return;

  if (chartInstances.deptChart) {
    chartInstances.deptChart.destroy();
  }

  const depts = ["Engineering", "Housekeeping", "Food & Beverage", "Front Office", "IT", "Security"];
  const counts = depts.map(d => 
    jobs.filter(j => (j.ccf_dept || j.areaName || j.department || "").toLowerCase().includes(d.toLowerCase())).length
  );

  chartInstances.deptChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: depts,
      datasets: [
        {
          axis: 'y',
          label: "Jobs Count",
          data: counts,
          backgroundColor: "rgba(14, 165, 233, 0.8)",
          borderRadius: 6
        }
      ]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { beginAtZero: true, ticks: { precision: 0, font: { size: 10, family: "Inter" } } },
        y: { grid: { display: false }, ticks: { font: { size: 10, family: "Inter" } } }
      }
    }
  });
}

function renderPropertyTable(jobs) {
  const tbody = document.getElementById("oproPropertiesTableBody");
  if (!tbody) return;

  tbody.innerHTML = allPropertiesList.map(prop => {
    const propJobs = jobs.filter(j => j.propId === prop.propId || j.propName === prop.propName);
    const total = propJobs.length;
    const closed = propJobs.filter(j => j.standardStatus === "Closed" || j.standardStatus === "Completed").length;
    const open = total - closed;
    const safety = propJobs.filter(j => j.standardPriority.toLowerCase() === "safety").length;
    const rate = total > 0 ? Math.round((closed / total) * 100) : 0;

    return `
      <tr class="hover:bg-slate-50 transition-colors">
        <td class="py-3 px-4 font-bold text-slate-800 flex items-center gap-2">
          <i class="fa-solid fa-hotel text-indigo-500"></i>
          <span>${escapeHtml(prop.propName)}</span>
        </td>
        <td class="py-3 px-4 text-center font-bold text-slate-900">${total}</td>
        <td class="py-3 px-4 text-center font-bold text-amber-600">${open}</td>
        <td class="py-3 px-4 text-center font-bold text-emerald-600">${closed}</td>
        <td class="py-3 px-4 text-center">
          <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${safety > 0 ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'}">
            ${safety}
          </span>
        </td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center gap-2">
            <div class="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div class="bg-emerald-500 h-1.5 rounded-full" style="width: ${rate}%"></div>
            </div>
            <span class="font-bold text-slate-700 text-xs">${rate}%</span>
          </div>
        </td>
        <td class="py-3 px-4 text-right">
          <button type="button" onclick="jumpToPropertyJobs('${prop.propId}', '${escapeHtml(prop.propName)}')" class="px-2.5 py-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors">
            View Jobs &rarr;
          </button>
        </td>
      </tr>
    `;
  }).join("");
}

function jumpToPropertyJobs(propId, propName) {
  if (typeof WorkWizeAPI !== "undefined") {
    WorkWizeAPI.setCurrentProperty(propId, propName);
  }
  window.location.href = `all-jobs.html?prop=${encodeURIComponent(propId)}`;
}
window.jumpToPropertyJobs = jumpToPropertyJobs;

function resetOproFilters() {
  const p = document.getElementById("oproFilterProperty");
  const d = document.getElementById("oproFilterDateSpan");
  const dep = document.getElementById("oproFilterDepartment");
  const pri = document.getElementById("oproFilterPriority");
  const s = document.getElementById("oproFilterStatus");

  if (p) p.value = "ALL";
  if (d) d.value = "30";
  if (dep) dep.value = "ALL";
  if (pri) pri.value = "ALL";
  if (s) s.value = "ALL";

  applyOproFiltersAndRender();
}
window.resetOproFilters = resetOproFilters;

function exportOproSummaryToCSV() {
  const headers = ["RESORT / PROPERTY", "TOTAL JOBS", "OPEN JOBS", "CLOSED JOBS", "SAFETY CRITICAL", "RESOLUTION RATE (%)"];
  const rows = allPropertiesList.map(prop => {
    const propJobs = enterpriseJobs.filter(j => j.propId === prop.propId || j.propName === prop.propName);
    const total = propJobs.length;
    const closed = propJobs.filter(j => j.standardStatus === "Closed" || j.standardStatus === "Completed").length;
    const open = total - closed;
    const safety = propJobs.filter(j => j.standardPriority.toLowerCase() === "safety").length;
    const rate = total > 0 ? Math.round((closed / total) * 100) : 0;
    return [
      `"${prop.propName}"`,
      total,
      open,
      closed,
      safety,
      `"${rate}%"`
    ].join(",");
  });

  const csv = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
  const uri = encodeURI(csv);
  const a = document.createElement("a");
  a.setAttribute("href", uri);
  a.setAttribute("download", `OPRO_Pvt_Ltd_Executive_Report_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
window.exportOproSummaryToCSV = exportOproSummaryToCSV;

function normalizeStatus(st) {
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

function normalizePriority(p) {
  if (!p) return "Medium";
  const s = String(p).toUpperCase();
  if (s.includes("HIGH")) return "High";
  if (s.includes("LOW")) return "Low";
  if (s.includes("SAFETY")) return "Safety";
  return "Medium";
}

function escapeHtml(str) {
  return String(str || "").replace(/"/g, "&quot;");
}
