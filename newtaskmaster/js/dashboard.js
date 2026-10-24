/**
 * WorkWize Dashboard & Charts Logic
 * Dynamically loads Area Overview and Jobs by Property
 */

let areaBarChart = null;
let statusDonutChart = null;
let dashboardStats = { total: 0, open: 0, closed: 0, safety: 0 };

document.addEventListener("DOMContentLoaded", function () {
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

  try {
    if (typeof WorkWizeAPI !== "undefined" && typeof WorkWizeAPI.getJobOverview === "function") {
      const overview = await WorkWizeAPI.getJobOverview(currentPropId);

      if (Array.isArray(overview) && overview.length > 0) {
        renderDashboardWithAreas(overview, currentPropName);
        return;
      }
    }
  } catch (err) {
    console.warn("Failed to load overview from API for prop:", currentPropId, err);
  }

  // Fallback if no areas returned or API fails
  renderDashboardFallback(currentPropName);
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
  let stats = { total: 0, open: 0, closed: 0, safety: 0 };
  if (typeof WorkWizeDB !== "undefined" && typeof WorkWizeDB.getStats === "function") {
    stats = WorkWizeDB.getStats();
  }
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
