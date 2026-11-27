/**
 * WorkWize Reports & Analytics Logic
 */

document.addEventListener("DOMContentLoaded", function () {
  initMonthlyTrendsChart();
  initPerformanceKPIs();
});

function initPerformanceKPIs() {
  const downloadBtn = document.getElementById("downloadReportBtn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", function () {
      showToast("Generating Monthly Executive Audit PDF...", "success");
      setTimeout(() => {
        showToast("Report ready! Downloading...", "success");
      }, 1200);
    });
  }
}

function initMonthlyTrendsChart() {
  const ctx = document.getElementById("monthlyTrendsChart");
  if (!ctx) return;

  new Chart(ctx, {
    type: "line",
    data: {
      labels: ["May", "Jun", "Jul", "Aug", "Sep", "Oct"],
      datasets: [
        {
          label: "Jobs Created",
          data: [210, 260, 310, 290, 340, 360],
          borderColor: "#1a68ff",
          backgroundColor: "rgba(26, 104, 255, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#1a68ff",
          pointRadius: 4
        },
        {
          label: "Jobs Resolved",
          data: [180, 220, 280, 270, 310, 330],
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.04)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointBackgroundColor: "#10b981",
          pointRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
          align: "end",
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            usePointStyle: true,
            pointStyle: "circle",
            color: "#64748b"
          }
        }
      },
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: false,
          min: 150,
          grid: { color: "#f1f5f9" }
        }
      }
    }
  });
}
