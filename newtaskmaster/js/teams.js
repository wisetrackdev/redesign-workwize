/**
 * WorkWize Teams & Staff Logic
 */

const TEAM_MEMBERS = [
  {
    name: "Testing - IT Admin",
    role: "System Administrator & Lead",
    email: "itadmin@workwize.io",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&q=80",
    activeJobs: 14,
    completedJobs: 82,
    department: "IT & Systems",
    status: "Online"
  },
  {
    name: "nikhil11",
    role: "Facility & Housekeeping Officer",
    email: "nikhil11@workwize.io",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=160&q=80",
    activeJobs: 8,
    completedJobs: 45,
    department: "Waste Management",
    status: "Online"
  },
  {
    name: "Zajira Yazeed",
    role: "Senior Safety & MEP Specialist",
    email: "zajira.y@workwize.io",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=160&q=80",
    activeJobs: 6,
    completedJobs: 54,
    department: "Fire & CAPEX Safety",
    status: "In Field"
  },
  {
    name: "Alex Morgan",
    role: "Energy & Utilities Supervisor",
    email: "a.morgan@workwize.io",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=160&q=80",
    activeJobs: 4,
    completedJobs: 38,
    department: "Energy Management",
    status: "Online"
  }
];

document.addEventListener("DOMContentLoaded", function () {
  renderTeamGrid();
});

function renderTeamGrid() {
  const container = document.getElementById("teamsGrid");
  if (!container) return;

  container.innerHTML = "";

  TEAM_MEMBERS.forEach(member => {
    const card = document.createElement("div");
    card.className = "ww-card flex flex-col justify-between";
    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between mb-4">
          <div class="flex items-center gap-3">
            <div class="relative">
              <img src="${member.avatar}" alt="${member.name}" class="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm">
              <span class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${member.status === 'Online' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
            </div>
            <div>
              <h3 class="font-bold text-slate-800 text-sm">${member.name}</h3>
              <p class="text-xs text-slate-500">${member.role}</p>
            </div>
          </div>
          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">${member.department}</span>
        </div>

        <div class="grid grid-cols-2 gap-2 my-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
          <div>
            <div class="text-lg font-bold text-blue-600">${member.activeJobs}</div>
            <div class="text-[11px] font-medium text-slate-500">Active Jobs</div>
          </div>
          <div>
            <div class="text-lg font-bold text-emerald-600">${member.completedJobs}</div>
            <div class="text-[11px] font-medium text-slate-500">Completed</div>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
        <a href="mailto:${member.email}" class="btn-outline text-xs flex-1 justify-center py-2">
          <i class="fa-regular fa-envelope"></i> Message
        </a>
        <a href="all-jobs.html?assignedTo=${encodeURIComponent(member.name)}" class="btn-secondary text-xs flex-1 justify-center py-2">
          View Tasks
        </a>
      </div>
    `;
    container.appendChild(card);
  });
}
