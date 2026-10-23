/**
 * WorkWize Dashboard & Charts Logic
 */

document.addEventListener("DOMContentLoaded", function () {
  initDashboardKPIs();
  initJobsByAreaChart();
  initStatusDistributionChart();
});

function initDashboardKPIs() {
  const stats = WorkWizeDB.getStats();

  const totalEl = document.getElementById("kpiTotalJobs");
  const openEl = document.getElementById("kpiOpenJobs");
  const closedEl = document.getElementById("kpiClosedJobs");
  const safetyEl = document.getElementById("kpiSafetyIssues");

  if (totalEl) totalEl.textContent = stats.total;
  if (openEl) openEl.textContent = stats.open;
  if (closedEl) closedEl.textContent = stats.closed;
  if (safetyEl) safetyEl.textContent = stats.safety;
}

let areaBarChart = null;
let statusDonutChart = null;

function initJobsByAreaChart() {
  const ctx = document.getElementById("jobsByAreaChart");
  if (!ctx) return;

  const labels = [
    "Dev/Project",
    "Fire Safety",
    "Back House",
    "CAPEX",
    "SOP",
    "Energy",
    "Utility",
    "Waste"
  ];

  const totalData = [7, 2, 2, 6, 5, 1, 3, 4];
  const openData = [6, 2, 2, 6, 5, 1, 1, 3];
  const closedData = [1, 0, 0, 0, 0, 0, 2, 1];

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
            font: { size: 11, family: "'Plus Jakarta Sans'" }
          }
        },
        y: {
          beginAtZero: true,
          max: 20,
          ticks: {
            stepSize: 5,
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

function initStatusDistributionChart() {
  const ctx = document.getElementById("statusDistributionChart");
  if (!ctx) return;

  const stats = WorkWizeDB.getStats();

  // Custom center text plugin for Donut Chart
  const centerTextPlugin = {
    id: "centerText",
    beforeDraw(chart) {
      const { width, height, ctx } = chart;
      ctx.restore();
      const fontSize = (height / 114).toFixed(2);
      ctx.font = `bold 28px 'Plus Jakarta Sans', sans-serif`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillStyle = "#0f172a";
      ctx.fillText(stats.total, width / 2, height / 2 - 8);

      ctx.font = `500 12px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = "#64748b";
      ctx.fillText("Total Jobs", width / 2, height / 2 + 16);
      ctx.save();
    }
  };

  statusDonutChart = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Open", "Closed", "Safety Issues"],
      datasets: [
        {
          data: [stats.open, stats.closed, stats.safety || 1], // small fraction for visually accurate rendering
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
          display: false // Using custom HTML legend matching imagenew.png
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const val = context.raw;
              const total = stats.total;
              const pct = Math.round((val / total) * 100);
              return ` ${context.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    },
    plugins: [centerTextPlugin]
  });
}

window.updateDashboardStats = function () {
  initDashboardKPIs();
  if (statusDonutChart) {
    statusDonutChart.update();
  }
};
