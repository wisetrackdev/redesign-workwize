/**
 * WorkWize Jobs by Area Logic
 */

document.addEventListener("DOMContentLoaded", function () {
  renderJobsByAreaTable();
  initAreaSearch();
});

function renderJobsByAreaTable(filterQuery = "") {
  const tbody = document.getElementById("jobsByAreaTableBody");
  if (!tbody) return;

  const areas = WorkWizeDB.getAreasSummary();
  tbody.innerHTML = "";

  const filtered = areas.filter(a => 
    a.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  filtered.forEach((area, index) => {
    const tr = document.createElement("tr");

    // Calculate progress percentages
    const closed = Math.max(0, area.total - area.open);
    const closedPct = area.total > 0 ? (closed / area.total) * 100 : 0;
    const openPct = area.total > 0 ? (area.open / area.total) * 100 : 100;

    tr.innerHTML = `
      <td class="text-slate-400 font-medium">${index + 1}</td>
      <td class="font-medium text-slate-800">
        <div class="flex items-center gap-2.5">
          <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
            <i class="fa-solid ${area.icon}"></i>
          </span>
          <a href="all-jobs.html?area=${encodeURIComponent(area.name)}" class="hover:text-blue-600 transition-colors">
            ${area.name}
          </a>
        </div>
      </td>
      <td class="font-semibold text-slate-800">${area.total}</td>
      <td class="font-semibold text-slate-800">${area.open}</td>
      <td class="font-semibold text-slate-800">${area.safety}</td>
      <td style="width: 240px;">
        <div class="flex items-center gap-3">
          <div class="progress-dual flex-1">
            <div class="progress-segment-closed" style="width: ${closedPct}%" title="Closed: ${closed}"></div>
            <div class="progress-segment-open" style="width: ${openPct}%" title="Open: ${area.open}"></div>
          </div>
          <div class="text-[11px] font-bold text-slate-500 w-10 text-right leading-none">
            <div class="text-purple-600">${area.total}</div>
            <div class="text-emerald-600">${area.safety}</div>
          </div>
        </div>
      </td>
      <td class="text-right">
        <div class="relative inline-block text-left dropdown-group">
          <button class="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors" onclick="toggleRowMenu(this)">
            <i class="fa-solid fa-ellipsis"></i>
          </button>
          <div class="hidden absolute right-0 mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20 text-xs text-slate-700 dropdown-menu">
            <a href="all-jobs.html?area=${encodeURIComponent(area.name)}" class="block px-3 py-2 hover:bg-slate-50">
              <i class="fa-regular fa-folder-open mr-2 text-blue-500"></i> View Jobs
            </a>
            <a href="#" class="block px-3 py-2 hover:bg-slate-50 btn-open-job-modal">
              <i class="fa-solid fa-plus mr-2 text-emerald-500"></i> Add Job Here
            </a>
          </div>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function initAreaSearch() {
  const searchInput = document.getElementById("areaSearchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", function (e) {
    renderJobsByAreaTable(e.target.value.trim());
  });
}

function toggleRowMenu(btn) {
  const menu = btn.nextElementSibling;
  document.querySelectorAll(".dropdown-menu").forEach(m => {
    if (m !== menu) m.classList.add("hidden");
  });
  if (menu) {
    menu.classList.toggle("hidden");
  }
}

document.addEventListener("click", function(e) {
  if (!e.target.closest(".dropdown-group")) {
    document.querySelectorAll(".dropdown-menu").forEach(m => m.classList.add("hidden"));
  }
});
