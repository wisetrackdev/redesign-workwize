/**
 * WorkWize Calendar View Logic
 */

document.addEventListener("DOMContentLoaded", function () {
  initCalendar();
});

let currentCalMonth = 9; // October (0-indexed: 9 = October)
let currentCalYear = 2026;

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function initCalendar() {
  renderCalendar();

  const prevMonthBtn = document.getElementById("prevMonthBtn");
  const nextMonthBtn = document.getElementById("nextMonthBtn");
  const todayBtn = document.getElementById("todayCalBtn");

  if (prevMonthBtn) {
    prevMonthBtn.addEventListener("click", () => {
      currentCalMonth--;
      if (currentCalMonth < 0) {
        currentCalMonth = 11;
        currentCalYear--;
      }
      renderCalendar();
    });
  }

  if (nextMonthBtn) {
    nextMonthBtn.addEventListener("click", () => {
      currentCalMonth++;
      if (currentCalMonth > 11) {
        currentCalMonth = 0;
        currentCalYear++;
      }
      renderCalendar();
    });
  }

  if (todayBtn) {
    todayBtn.addEventListener("click", () => {
      currentCalMonth = 9; // October 2026
      currentCalYear = 2026;
      renderCalendar();
    });
  }
}

function renderCalendar() {
  const monthTitle = document.getElementById("calMonthTitle");
  const gridContainer = document.getElementById("calendarGrid");
  if (!gridContainer) return;

  if (monthTitle) {
    monthTitle.textContent = `${monthNames[currentCalMonth]} ${currentCalYear}`;
  }

  gridContainer.innerHTML = "";

  const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
  const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(currentCalYear, currentCalMonth, 0).getDate();

  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const cell = document.createElement("div");
    cell.className = "min-h-[110px] p-2 bg-slate-50/50 border border-slate-100 text-slate-300 font-medium text-xs";
    cell.innerHTML = `<span>${day}</span>`;
    gridContainer.appendChild(cell);
  }

  // Current month days
  const jobs = WorkWizeDB.getJobs();

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement("div");
    const isToday = d === 23 && currentCalMonth === 9 && currentCalYear === 2026;
    cell.className = `min-h-[110px] p-2 bg-white border border-slate-100 text-slate-700 text-xs flex flex-col justify-between hover:bg-slate-50/80 transition-colors group relative ${
      isToday ? 'ring-2 ring-blue-500 ring-inset bg-blue-50/20' : ''
    }`;

    // Header date
    let headerHtml = `<div class="flex items-center justify-between mb-1">
      <span class="font-bold text-xs ${isToday ? 'w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center -ml-1 -mt-1' : 'text-slate-600'}">${d}</span>
      ${isToday ? '<span class="text-[10px] font-semibold text-blue-600">Today</span>' : ''}
    </div>`;

    // Dummy events distribution for rich calendar experience
    let eventsHtml = `<div class="space-y-1 overflow-hidden">`;
    if (d === 10 || d === 12 || d === 15 || d === 22 || d === 28) {
      eventsHtml += `
        <div class="px-2 py-1 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold truncate border border-blue-100 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Tes-313026 Inspection
        </div>
      `;
    }
    if (d === 14 || d === 23 || d === 30) {
      eventsHtml += `
        <div class="px-2 py-1 rounded bg-amber-50 text-amber-700 text-[10px] font-semibold truncate border border-amber-100 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Fire Safety Routine
        </div>
      `;
    }
    if (d === 6 || d === 18) {
      eventsHtml += `
        <div class="px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-semibold truncate border border-emerald-100 flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> CAPEX Signoff
        </div>
      `;
    }
    eventsHtml += `</div>`;

    cell.innerHTML = headerHtml + eventsHtml;
    gridContainer.appendChild(cell);
  }

  // Next month leading days to complete grid
  const totalRendered = firstDay + daysInMonth;
  const remaining = (7 - (totalRendered % 7)) % 7;
  for (let n = 1; n <= remaining; n++) {
    const cell = document.createElement("div");
    cell.className = "min-h-[110px] p-2 bg-slate-50/50 border border-slate-100 text-slate-300 font-medium text-xs";
    cell.innerHTML = `<span>${n}</span>`;
    gridContainer.appendChild(cell);
  }
}
