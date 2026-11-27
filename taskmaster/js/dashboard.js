/**
 * WorkWize Dashboard & Charts Logic
 * Dynamically loads Area Overview and Jobs by Property
 */

let areaBarChart = null;
let statusDonutChart = null;
let dashboardStats = { total: 0, open: 0, closed: 0, safety: 0 };
let allDashboardJobs = [];
let activeNewJobsRange = "week";
let selectedNewJobsArea = null;

document.addEventListener("DOMContentLoaded", function () {
  initNewJobsStatControls();
  initDashboard();

  // Listen for property selection change in header
  window.addEventListener("workwize:propertyChanged", function (e) {
    const propId = e.detail ? e.detail.propId : null;
    loadDashboardForProperty(propId);
  });
});

async function initDashboard() {
  // Ensure valid property is set from API properties list
  try {
    if (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getAllProperties === "function") {
      const props = await WorkWizeAPI.getAllProperties();
      if (Array.isArray(props) && props.length > 0) {
        const storedProp = localStorage.getItem("workwize_current_property");
        if (!storedProp || storedProp === "PROP-001" || !props.some(p => p.propId === storedProp)) {
          WorkWizeAPI.setCurrentProperty(props[0].propId, props[0].propName);
        }
      }
    }
  } catch (e) {
    console.warn("Could not fetch properties list:", e.message);
  }

  const currentPropId = (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getCurrentProperty === "function")
    ? WorkWizeAPI.getCurrentProperty()
    : localStorage.getItem("workwize_current_property");

  await loadDashboardForProperty(currentPropId);
}

async function loadDashboardForProperty(propId) {
  const currentPropId = propId || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentProperty() : null);
  const currentPropName = (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getCurrentPropertyName === "function")
    ? WorkWizeAPI.getCurrentPropertyName()
    : (localStorage.getItem("workwize_current_property_name") || "Current Property");

  const subtitleEl = document.getElementById("jobsByAreaSubtitle");
  if (subtitleEl) {
    subtitleEl.textContent = `Loading areas for ${currentPropName}...`;
  }

  let overviewLoaded = false;
  try {
    if (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getJobOverview === "function") {
      const [overviewRes, openJobsRes, closedJobsRes] = await Promise.allSettled([
        WorkWizeAPI.getJobOverview(currentPropId),
        typeof WorkWizeAPI.getPropertyJobs === "function" ? WorkWizeAPI.getPropertyJobs(currentPropId) : Promise.resolve(null),
        typeof WorkWizeAPI.getClosedJobs === "function" ? WorkWizeAPI.getClosedJobs(currentPropId) : Promise.resolve(null)
      ]);

      if (overviewRes.status === "fulfilled" && Array.isArray(overviewRes.value)) {
        renderDashboardWithAreas(overviewRes.value, currentPropName);
        overviewLoaded = true;
      }

      loadNewJobsStatFromResponses(
        openJobsRes.status === "fulfilled" ? openJobsRes.value : null,
        closedJobsRes.status === "fulfilled" ? closedJobsRes.value : null
      );
      if (overviewLoaded) return;
    }
  } catch (err) {
    console.warn("Failed to load overview from API for prop:", currentPropId, err);
  }

  // Fallback if no areas returned or API fails
  if (!overviewLoaded) {
    renderDashboardFallback(currentPropName);
    loadNewJobsStatFromResponses(null, null);
  }
}

function renderDashboardWithAreas(overview, propName) {
  const labels = [];
  const totalData = [];
  const openData = [];
  const closedData = [];

  let totalJobs = 0;
  let totalOpen = 0;
  let totalClosed = 0;
  let totalSafety = 0;

  overview.forEach(item => {
    const name = item.areaName || item.name || "Area";
    const total = (item.total_jobs !== undefined && item.total_jobs !== null && !isNaN(item.total_jobs))
      ? Number(item.total_jobs)
      : ((item.total !== undefined && item.total !== null && !isNaN(item.total)) ? Number(item.total) : 0);

    const open = (item.open_jobs !== undefined && item.open_jobs !== null && !isNaN(item.open_jobs))
      ? Number(item.open_jobs)
      : ((item.open !== undefined && item.open !== null && !isNaN(item.open)) ? Number(item.open) : 0);

    const safety = (item.safety_jobs !== undefined && item.safety_jobs !== null && !isNaN(item.safety_jobs))
      ? Number(item.safety_jobs)
      : ((item.safety !== undefined && item.safety !== null && !isNaN(item.safety)) ? Number(item.safety) : 0);

    const closed = Math.max(0, total - open);

    labels.push(name);
    totalData.push(total);
    openData.push(open);
    closedData.push(closed);

    totalJobs += total;
    totalOpen += open;
    totalClosed += closed;
    totalSafety += safety;
  });

  dashboardStats = {
    total: totalJobs,
    open: totalOpen,
    closed: totalClosed,
    safety: totalSafety
  };

  // 1. Update KPI Stat Cards
  updateKPIStatCards(dashboardStats);

  // 2. Update Subtitle
  const subtitleEl = document.getElementById("jobsByAreaSubtitle");
  if (subtitleEl) {
    subtitleEl.textContent = `Property: ${propName} (${overview.length} ${overview.length === 1 ? 'Area' : 'Areas'}) - Total, Open, and Closed jobs compared across departments`;
  }

  // 3. Render Jobs by Area Grouped Bar Chart
  renderJobsByAreaBarChart(labels, totalData, openData, closedData);

  // 4. Render Job Status Donut Chart & Legend
  renderStatusDonutChart(dashboardStats);
}

function updateKPIStatCards(stats) {
  const totalEl = document.getElementById("kpiTotalJobs");
  const openEl = document.getElementById("kpiOpenJobs");
  const closedEl = document.getElementById("kpiClosedJobs");
  const safetyEl = document.getElementById("kpiSafetyIssues");

  if (totalEl) totalEl.textContent = stats.total;
  if (openEl) openEl.textContent = stats.open;
  if (closedEl) closedEl.textContent = stats.closed;
  if (safetyEl) safetyEl.textContent = stats.safety;
}

function renderJobsByAreaBarChart(labels, totalData, openData, closedData) {
  const ctx = document.getElementById("jobsByAreaChart");
  if (!ctx) return;

  if (areaBarChart) {
    areaBarChart.destroy();
    areaBarChart = null;
  }

  const maxVal = totalData.length > 0 ? Math.max(...totalData) : 0;
  const suggestedMax = maxVal < 5 ? 5 : Math.ceil(maxVal * 1.15);

  areaBarChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Total Jobs",
          data: totalData,
          backgroundColor: "#1e3a8a", // Navy Blue
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.8
        },
        {
          label: "Open Jobs",
          data: openData,
          backgroundColor: "#06b6d4", // Cyan / Bright Teal
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.8
        },
        {
          label: "Closed Jobs",
          data: closedData,
          backgroundColor: "#8b5cf6", // Purple
          borderRadius: 4,
          barPercentage: 0.7,
          categoryPercentage: 0.8
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "top",
          align: "end",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: "circle",
            color: "#64748b",
            font: {
              family: "'Plus Jakarta Sans', sans-serif",
              size: 12,
              weight: '500'
            }
          }
        },
        tooltip: {
          backgroundColor: "#0f172a",
          titleFont: { family: "'Plus Jakarta Sans'", size: 13 },
          bodyFont: { family: "'Plus Jakarta Sans'", size: 12 },
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: "#64748b",
            font: { size: 11, family: "'Plus Jakarta Sans'" },
            maxRotation: 45,
            minRotation: labels.length > 5 ? 25 : 0
          }
        },
        y: {
          beginAtZero: true,
          suggestedMax: suggestedMax,
          ticks: {
            precision: 0,
            color: "#94a3b8",
            font: { size: 11 }
          },
          grid: {
            color: "#f1f5f9"
          }
        }
      }
    }
  });
}

function renderStatusDonutChart(stats) {
  const ctx = document.getElementById("statusDistributionChart");
  if (!ctx) return;

  if (statusDonutChart) {
    statusDonutChart.destroy();
    statusDonutChart = null;
  }

  // Update HTML Legend numbers and percentages
  const openCountEl = document.getElementById("donutOpenCount");
  const openPctEl = document.getElementById("donutOpenPct");
  const closedCountEl = document.getElementById("donutClosedCount");
  const closedPctEl = document.getElementById("donutClosedPct");
  const safetyCountEl = document.getElementById("donutSafetyCount");
  const safetyPctEl = document.getElementById("donutSafetyPct");

  const total = stats.total || 0;
  const openPct = total > 0 ? Math.round((stats.open / total) * 100) : 0;
  const closedPct = total > 0 ? Math.round((stats.closed / total) * 100) : 0;
  const safetyPct = total > 0 ? Math.round((stats.safety / total) * 100) : 0;

  if (openCountEl) openCountEl.textContent = stats.open;
  if (openPctEl) openPctEl.textContent = `(${openPct}%)`;
  if (closedCountEl) closedCountEl.textContent = stats.closed;
  if (closedPctEl) closedPctEl.textContent = `(${closedPct}%)`;
  if (safetyCountEl) safetyCountEl.textContent = stats.safety;
  if (safetyPctEl) safetyPctEl.textContent = `(${safetyPct}%)`;

  // Custom center text plugin for Donut Chart
  const centerTextPlugin = {
    id: "centerText",
    beforeDraw(chart) {
      const { width, height, ctx } = chart;
      ctx.restore();
      ctx.font = `bold 28px 'Plus Jakarta Sans', sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillStyle = "#0f172a";
      ctx.fillText(String(stats.total), width / 2, height / 2 - 8);

      ctx.font = `500 12px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = "#64748b";
      ctx.fillText("Total Jobs", width / 2, height / 2 + 16);
      ctx.save();
    }
  };

  const chartData = (stats.total === 0)
    ? [0, 0, 0]
    : [stats.open, stats.closed, stats.safety];

  statusDonutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Open", "Closed", "Safety Issues"],
      datasets: [
        {
          data: chartData,
          backgroundColor: [
            "#22c55e", // Open (Green)
            "#8b5cf6", // Closed (Purple)
            "#ef4444"  // Safety (Red)
          ],
          borderWidth: 0,
          hoverOffset: 4,
          cutout: "75%"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw;
              const pct = total > 0 ? Math.round((val / total) * 100) : 0;
              return ` ${context.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    },
    plugins: [centerTextPlugin]
  });
}

function renderDashboardFallback(propName) {
  const stats = { total: 0, open: 0, closed: 0, safety: 0 };
  updateKPIStatCards(stats);

  const subtitleEl = document.getElementById("jobsByAreaSubtitle");
  if (subtitleEl) {
    subtitleEl.textContent = `Property: ${propName} - Total, Open, and Closed jobs compared across departments`;
  }

  renderJobsByAreaBarChart([], [], [], []);
  renderStatusDonutChart(stats);
}

window.updateDashboardStats = function () {
  loadDashboardForProperty();
};

// ==========================================
// New Jobs Stat (This Week / This Month / Last 2 months / Last 6 months)
// ==========================================

function initNewJobsStatControls() {
  const tabsWrap = document.getElementById("newJobsRangeTabs");
  if (tabsWrap) {
    tabsWrap.querySelectorAll(".new-jobs-range-btn").forEach(btn => {
      btn.addEventListener("click", function () {
        const range = this.getAttribute("data-range") || "week";
        activeNewJobsRange = range;
        selectedNewJobsArea = null;
        updateNewJobsRangeButtonsUI();
        renderNewJobsStatSection();
      });
    });
  }

  const closePanelBtn = document.getElementById("closeNewJobsAreaPanelBtn");
  if (closePanelBtn) {
    closePanelBtn.addEventListener("click", function () {
      selectedNewJobsArea = null;
      const panel = document.getElementById("newJobsAreaJobsPanel");
      if (panel) panel.classList.add("hidden");
      document.querySelectorAll("#newJobsAreaButtons .new-jobs-area-btn").forEach(b => {
        b.classList.remove("active", "bg-blue-600", "text-white", "border-blue-600", "ring-2", "ring-blue-300");
        b.classList.add("bg-white", "text-slate-700", "border-blue-200/80");
      });
    });
  }
}

function updateNewJobsRangeButtonsUI() {
  document.querySelectorAll("#newJobsRangeTabs .new-jobs-range-btn").forEach(btn => {
    const r = btn.getAttribute("data-range");
    const countSpan = btn.querySelector("[data-range-count]");
    if (r === activeNewJobsRange) {
      btn.classList.add("bg-white", "text-blue-700", "font-bold", "shadow-xs");
      btn.classList.remove("text-slate-600", "font-semibold");
      if (countSpan) {
        countSpan.classList.add("bg-blue-100", "text-blue-700");
        countSpan.classList.remove("bg-slate-200/80", "text-slate-700");
      }
    } else {
      btn.classList.remove("bg-white", "text-blue-700", "font-bold", "shadow-xs");
      btn.classList.add("text-slate-600", "font-semibold");
      if (countSpan) {
        countSpan.classList.remove("bg-blue-100", "text-blue-700");
        countSpan.classList.add("bg-slate-200/80", "text-slate-700");
      }
    }
  });
}

function loadNewJobsStatFromResponses(openRes, closedRes) {
  const combinedMap = new Map();

  const extractList = (res) => {
    if (!res) return [];
    const raw = res.jobs || res.Jobs || res.data || (Array.isArray(res) ? res : []);
    return Array.isArray(raw) ? raw : [];
  };

  const addJobs = (list, forceClosed) => {
    list.forEach(item => {
      if (!item) return;
      const key = String(item.jobId || item.JobId || item.orgjobId || item.OrgjobId || item.id || "").trim();
      if (!key || combinedMap.has(key)) return;
      combinedMap.set(key, { ...item, _isClosedFallback: forceClosed });
    });
  };

  addJobs(extractList(openRes), false);
  addJobs(extractList(closedRes), true);

  if (typeof WorkWizeDB !== "undefined" && typeof WorkWizeDB.getJobs === "function") {
    WorkWizeDB.getJobs().forEach(lj => {
      const key = String(lj.rawId || lj.id || lj.jobId || "").trim();
      if (key && !combinedMap.has(key)) combinedMap.set(key, lj);
    });
  }

  allDashboardJobs = Array.from(combinedMap.values());
  renderNewJobsStatSection();
}

function parseDashboardJobDate(job) {
  const raw = job.jobCreatedOn || job.JobCreatedOn || job.createdOn || job.CreatedOn || job.openedOn || "";
  if (!raw || String(raw).startsWith("0001") || String(raw).startsWith("1970-01-01")) return null;

  const str = String(raw).trim();
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]), 0, 0, 0, 0);
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

function getNewJobsRangeStartDate(rangeKey) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);

  if (rangeKey === "week") {
    // Start of current week (Monday)
    const diffToMonday = (today.getDay() + 6) % 7;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - diffToMonday);
    return weekStart;
  }
  if (rangeKey === "month") {
    return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  }
  if (rangeKey === "2months") {
    return new Date(now.getFullYear(), now.getMonth() - 2, now.getDate(), 0, 0, 0, 0);
  }
  // 6months
  return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate(), 0, 0, 0, 0);
}

function getJobsForNewStatRange(rangeKey) {
  const start = getNewJobsRangeStartDate(rangeKey);
  const now = new Date();
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  return allDashboardJobs.filter(job => {
    const dt = parseDashboardJobDate(job);
    return dt && dt >= start && dt <= endOfToday;
  });
}

function escapeDashHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripDashHtml(html) {
  if (!html) return "";
  return String(html).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatDashJobDate(raw) {
  const d = parseDashboardJobDate({ createdOn: raw });
  if (!d) return "-";
  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${day} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDashJobAssignee(job) {
  if (Array.isArray(job.data1) && job.data1.length > 0) {
    const teamMap = new Map();
    const list = [];
    job.data1.forEach(t => {
      if (!t) return;
      const name = (typeof t === "string")
        ? t.trim()
        : (t.teamName || t.name || `${t.firstName || ""} ${t.lastName || ""}`.trim() || t.teamID || "");
      if (!name) return;
      const tid = (typeof t === "object") ? String(t.teamID || t.teamId || t.id || "").trim().toUpperCase() : "";
      if (tid) {
        if (teamMap.has(tid)) {
          list[teamMap.get(tid)] = name;
          return;
        }
        teamMap.set(tid, list.length);
      }
      list.push(name);
    });
    if (list.length > 0) return list.join(", ");
  }
  if (typeof job.assignedTo === "string" && job.assignedTo.trim()) return job.assignedTo.trim();
  return "Unassigned";
}

function renderNewJobsStatSection() {
  const rangeLabels = {
    week: "This Week",
    month: "This Month",
    "2months": "Last 2 months",
    "6months": "Last 6 months"
  };

  // Update count badges on all 4 timeframe tabs
  ["week", "month", "2months", "6months"].forEach(r => {
    const countEl = document.querySelector(`[data-range-count="${r}"]`);
    if (countEl) countEl.textContent = String(getJobsForNewStatRange(r).length);
  });

  const matchingJobs = getJobsForNewStatRange(activeNewJobsRange);

  const totalBadge = document.getElementById("newJobsTotalRangeBadge");
  if (totalBadge) {
    totalBadge.textContent = `${matchingJobs.length} ${matchingJobs.length === 1 ? "Job" : "Jobs"} Logged`;
  }

  // Group strictly by Area (ONLY areas with >= 1 logged job in this range)
  const areaMap = new Map();
  matchingJobs.forEach(job => {
    const areaName = String(job.areaName || job.AreaName || job.area || job.Area || "General Area").trim() || "General Area";
    if (!areaMap.has(areaName)) areaMap.set(areaName, []);
    areaMap.get(areaName).push(job);
  });

  const areasWithJobs = Array.from(areaMap.entries())
    .filter(([, jobs]) => jobs.length > 0)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const subtitleEl = document.getElementById("newJobsStatSubtitle");
  if (subtitleEl) {
    subtitleEl.textContent = `${rangeLabels[activeNewJobsRange] || "Selected period"}: ${areasWithJobs.length} ${areasWithJobs.length === 1 ? "area" : "areas"} with newly logged jobs — click an animated button below to view jobs`;
  }

  const buttonsContainer = document.getElementById("newJobsAreaButtons");
  const panelEl = document.getElementById("newJobsAreaJobsPanel");
  if (!buttonsContainer) return;

  if (areasWithJobs.length === 0) {
    buttonsContainer.innerHTML = `
      <div class="w-full py-5 px-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
        <i class="fa-regular fa-calendar-xmark text-slate-400 mr-1.5"></i>
        No new jobs logged in <b>${escapeDashHtml(rangeLabels[activeNewJobsRange] || "this period")}</b>.
      </div>
    `;
    if (panelEl) panelEl.classList.add("hidden");
    selectedNewJobsArea = null;
    return;
  }

  // Render animated buttons ONLY for areas that have logged jobs
  buttonsContainer.innerHTML = areasWithJobs.map(([areaName, jobs]) => {
    const isActive = selectedNewJobsArea === areaName;
    const btnStateCls = isActive
      ? "active bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300"
      : "bg-white hover:bg-blue-50/70 text-slate-700 border-blue-200/80";
    const badgeCls = isActive
      ? "bg-white/20 text-white"
      : "bg-blue-100 text-blue-700";
    const dotCls = isActive
      ? "bg-emerald-300"
      : "bg-blue-500";

    return `
      <button type="button" data-stat-area="${escapeDashHtml(areaName)}" class="new-jobs-area-btn inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition-all duration-200 cursor-pointer ${btnStateCls}">
        <span class="relative flex h-2 w-2 shrink-0">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${dotCls} opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 ${dotCls}"></span>
        </span>
        <span>${escapeDashHtml(areaName)}</span>
        <span class="px-2 py-0.5 rounded-full text-[11px] font-extrabold ${badgeCls}">${jobs.length}</span>
      </button>
    `;
  }).join("");

  buttonsContainer.querySelectorAll(".new-jobs-area-btn").forEach(btn => {
    btn.addEventListener("click", function () {
      const areaName = this.getAttribute("data-stat-area");
      selectedNewJobsArea = areaName;
      renderNewJobsStatSection();
      renderSelectedStatAreaJobs(areaName, areaMap.get(areaName) || []);
    });
  });

  if (selectedNewJobsArea && areaMap.has(selectedNewJobsArea)) {
    renderSelectedStatAreaJobs(selectedNewJobsArea, areaMap.get(selectedNewJobsArea));
  } else if (panelEl) {
    panelEl.classList.add("hidden");
  }
}

function renderSelectedStatAreaJobs(areaName, jobs) {
  const panelEl = document.getElementById("newJobsAreaJobsPanel");
  const areaTitleEl = document.getElementById("selectedStatAreaName");
  const countEl = document.getElementById("selectedStatAreaCount");
  const listEl = document.getElementById("newJobsAreaJobsList");
  if (!panelEl || !listEl) return;

  if (areaTitleEl) areaTitleEl.textContent = areaName;
  if (countEl) countEl.textContent = `${jobs.length} ${jobs.length === 1 ? "Job" : "Jobs"}`;

  const sortedJobs = [...jobs].sort((a, b) => {
    const dA = parseDashboardJobDate(a)?.getTime() || 0;
    const dB = parseDashboardJobDate(b)?.getTime() || 0;
    return dB - dA;
  });

  listEl.innerHTML = `
    <table class="w-full text-left border-collapse text-xs">
      <thead class="bg-slate-100/90 text-[11px] font-bold text-slate-600 uppercase tracking-wider sticky top-0 border-b border-slate-200">
        <tr>
          <th class="px-3.5 py-2.5">Job ID</th>
          <th class="px-3.5 py-2.5">Details</th>
          <th class="px-3.5 py-2.5">Location</th>
          <th class="px-3.5 py-2.5">Assigned To</th>
          <th class="px-3.5 py-2.5">Priority</th>
          <th class="px-3.5 py-2.5">Status</th>
          <th class="px-3.5 py-2.5">Logged On</th>
          <th class="px-3.5 py-2.5 text-right">Action</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 bg-white">
        ${sortedJobs.map(job => {
          const displayId = job.orgjobId || job.OrgjobId || job.jobId || job.JobId || job.id || "-";
          const rawId = job.jobId || job.JobId || job.rawId || job.id || displayId;
          const detailsPlain = stripDashHtml(job.jobDetail || job.JobDetail || job.details || job.Details || "No description");
          const location = job.jobLocation || job.JobLocation || job.location || "-";
          const assignee = formatDashJobAssignee(job);
          const priority = String(job.priority || job.Priority || "Medium");
          const statusRaw = job._isClosedFallback ? "Closed" : String(job.jobStatus || job.JobStatus || job.status || "Open");
          const createdDate = formatDashJobDate(job.jobCreatedOn || job.JobCreatedOn || job.createdOn || job.openedOn);

          return `
            <tr class="hover:bg-blue-50/40 transition-colors">
              <td class="px-3.5 py-2.5 font-bold whitespace-nowrap">
                <a href="job-details.html?id=${encodeURIComponent(rawId)}" class="text-blue-600 hover:underline">${escapeDashHtml(displayId)}</a>
              </td>
              <td class="px-3.5 py-2.5 text-slate-700 max-w-[260px] truncate" title="${escapeDashHtml(detailsPlain)}">${escapeDashHtml(detailsPlain)}</td>
              <td class="px-3.5 py-2.5 text-slate-600 whitespace-nowrap">${escapeDashHtml(location)}</td>
              <td class="px-3.5 py-2.5 text-slate-700 whitespace-nowrap">${escapeDashHtml(assignee)}</td>
              <td class="px-3.5 py-2.5 whitespace-nowrap">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">${escapeDashHtml(priority)}</span>
              </td>
              <td class="px-3.5 py-2.5 whitespace-nowrap">
                <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">${escapeDashHtml(statusRaw)}</span>
              </td>
              <td class="px-3.5 py-2.5 text-slate-500 whitespace-nowrap">${escapeDashHtml(createdDate)}</td>
              <td class="px-3.5 py-2.5 text-right whitespace-nowrap">
                <a href="job-details.html?id=${encodeURIComponent(rawId)}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white text-[11px] font-semibold transition-colors">
                  View <i class="fa-solid fa-arrow-right text-[9px]"></i>
                </a>
              </td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;

  panelEl.classList.remove("hidden");
  panelEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
