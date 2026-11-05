/**







 * WorkWize Jobs by Area Logic







 * Connected to live API: api/jobtracker/getjoboverview & api/jobtracker/getpropertyjobs







 */







let areaOverviewData = [];







let allPropertiesMap = {};







let propertyJobsCache = [];







let currentAreaModalJobs = [];







let currentAreaModalName = "";







let currentAreaModalSortOrder = "desc";







// Operational areas are strictly loaded per property from backend API (no static mock areas)







document.addEventListener("DOMContentLoaded", function () {







  initJobsByArea();







  initAreaSearch();







  // Listen for property changes from header







  window.addEventListener("workwize:propertyChanged", function (e) {







    propertyJobsCache = [];







    initJobsByArea();







  });







});







/**







 * Universal job object normalizer to guarantee field availability







 * regardless of whether API returns camelCase or PascalCase.







 */







function normalizeJobObject(raw) {







  if (!raw) return {};







  const rawId = raw.jobId || raw.JobId || raw.rawId || raw.id || raw.Id || "";







  const orgId = raw.orgjobId || raw.OrgjobId || raw.orgJobId || raw.OrgJobId || raw.id || raw.Id || rawId || "JOB-001";







  const detail = raw.jobDetail || raw.JobDetail || raw.jobDetails || raw.JobDetails || raw.details || raw.Details || raw.title || raw.Title || "";







  const villa = raw.villaNumber || raw.VillaNumber || raw.villa || raw.Villa || "";







  const createdOn = raw.jobCreatedOn || raw.JobCreatedOn || raw.createdOn || raw.CreatedOn || raw.openedOn || raw.OpenedOn || "";







  const location = raw.jobLocation || raw.JobLocation || raw.location || raw.Location || "";







  const priority = raw.priority || raw.Priority || "Medium";







  const status = raw.jobStatus || raw.JobStatus || raw.status || raw.Status || "Yet to Commence";







  const refNum = raw.refNum || raw.RefNum || raw.refNo || raw.RefNo || "";







  const expectedCompletion = raw.expectedCompletion || raw.ExpectedCompletion || raw.expectedDate || raw.ExpectedDate || "";







  const closeDate = raw.jobCloseOn || raw.JobCloseOn || raw.closeDate || raw.CloseDate || raw.closedOn || raw.ClosedOn || "";







  const uploadCount = raw.uploadCount !== undefined ? raw.uploadCount : (raw.UploadCount !== undefined ? raw.UploadCount : (Array.isArray(raw.imageUploads) ? raw.imageUploads.length : 0));







  const commentCount = raw.commentCount !== undefined ? raw.commentCount : (raw.CommentCount !== undefined ? raw.CommentCount : (Array.isArray(raw.comments) ? raw.comments.length : 0));







  const firstname = raw.firstname || raw.Firstname || raw.firstName || raw.FirstName || "";







  const lastname = raw.lastname || raw.Lastname || raw.lastName || raw.LastName || "";







  const propName = raw.propName || raw.PropName || raw.propertyName || "";







  const data1 = raw.data1 || raw.Data1 || [];







  const assignedTo = raw.assignedTo || raw.AssignedTo || "";







  const areaName = raw.areaName || raw.AreaName || raw.area || raw.Area || "";







  const areaId = raw.areaId || raw.AreaId || raw.areaID || raw.AreaID || "";







  return {







    ...raw,







    jobId: rawId,







    orgjobId: orgId,







    jobDetail: detail,







    villaNumber: villa,







    jobCreatedOn: createdOn,







    jobLocation: location,







    priority: priority,







    jobStatus: status,







    refNum: refNum,







    expectedCompletion: expectedCompletion,







    jobCloseOn: closeDate,







    uploadCount: uploadCount,







    commentCount: commentCount,







    firstname: firstname,







    lastname: lastname,







    createdBy: (raw.createdBy && raw.createdBy !== "-" && raw.createdBy !== "null" && raw.createdBy !== "undefined")







      ? raw.createdBy







      : ((firstname || lastname) ? `${firstname} ${lastname}`.trim() : (raw.userId || raw.creator || raw.created_by || "-")),







    userId: raw.userId || raw.createdBy || "",







    propName: propName,







    data1: data1,







    assignedTo: assignedTo,







    areaName: areaName,







    areaId: areaId







  };







}







/**







 * Loads and caches all jobs for current property







 */







async function loadPropertyJobsCache(propId) {







  try {







    const pId = propId || WorkWizeAPI.getCurrentProperty();







    const res = await WorkWizeAPI.getPropertyJobs(pId);







    let jobs = [];







    if (res && Array.isArray(res.jobs)) jobs = res.jobs;







    else if (res && Array.isArray(res.Jobs)) jobs = res.Jobs;







    else if (res && Array.isArray(res.data)) jobs = res.data;







    else if (res && Array.isArray(res.result)) jobs = res.result;







    else if (Array.isArray(res)) jobs = res;







    propertyJobsCache = (jobs || []).map(normalizeJobObject);







    return propertyJobsCache;







  } catch (err) {







    console.warn("Could not load property jobs cache:", err.message);







    return propertyJobsCache || [];







  }







}







/**







 * Area matching helper







 */







function jobMatchesArea(j, areaId, areaName) {







  if (!j) return false;







  const cleanAreaName = (areaName || "").toLowerCase().trim();







  const cleanAreaId = (areaId || "").toLowerCase().trim();







  const jAreaId = String(j.areaId || j.areaID || "").toLowerCase().trim();







  const jAreaName = String(j.areaName || j.area || "").toLowerCase().trim();







  if (cleanAreaId && jAreaId && cleanAreaId === jAreaId) return true;







  if (cleanAreaName && jAreaName && cleanAreaName === jAreaName) return true;







  if (cleanAreaName && jAreaName && (jAreaName.includes(cleanAreaName) || cleanAreaName.includes(jAreaName))) return true;







  const normClean = cleanAreaName.replace(/[^a-z0-9]/g, "");







  const normJ = jAreaName.replace(/[^a-z0-9]/g, "");







  if (normClean && normJ && (normJ.includes(normClean) || normClean.includes(normJ))) return true;







  return false;







}







function isClosedStatus(j) {







  if (!j) return false;







  if (typeof j === "object") {







    if (j.isActive === false || j.isActive === 0) return true;







    if (j.jobCloseOn && !String(j.jobCloseOn).startsWith("0001") && String(j.jobCloseOn) !== "1970-01-01T00:00:00") return true;







    const s = String(j.jobStatus || j.status || "").toLowerCase();







    return s.includes("close") || s.includes("complet");







  }







  const s = String(j).toLowerCase();







  return s.includes("close") || s.includes("complet");







}







async function initJobsByArea() {

  const tbody = document.getElementById("jobsByAreaTableBody");

  if (tbody) {

    tbody.innerHTML = `

      <tr>

        <td colspan="6" class="text-center py-10 text-slate-400">

          <i class="fa-solid fa-circle-notch fa-spin text-xl text-blue-600 mb-2"></i>

          <p class="text-xs">Loading operational areas from server...</p>

        </td>

      </tr>

    `;

  }



  try {

    // 1. Fetch properties if possible

    try {

      const props = await WorkWizeAPI.getAllProperties();

      if (Array.isArray(props) && props.length > 0) {

        props.forEach(p => {

          allPropertiesMap[p.propId] = p.propName;

        });



        const storedProp = localStorage.getItem("workwize_current_property");

        if (!storedProp || storedProp === "PROP-001" || !props.some(p => p.propId === storedProp)) {

          WorkWizeAPI.setCurrentProperty(props[0].propId, props[0].propName);

        }

      }

    } catch (e) {

      console.warn("Could not load properties from API:", e.message);

    }



    const currentPropId = WorkWizeAPI.getCurrentProperty();

    const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();



    const subtitleEl = document.getElementById("jobsPropertySubtitle");

    if (subtitleEl) {

      subtitleEl.textContent = `Property: ${currentPropName} - Track and manage jobs across areas`;

    }



    // Prefetch property jobs cache in background

    loadPropertyJobsCache(currentPropId);



    // 2. Fetch Job Overview by Area AND Property Info in parallel (Strictly active areas from admin)
    const [overviewResponse, propInfo] = await Promise.all([
      WorkWizeAPI.getJobOverview(currentPropId).catch(err => {
        console.warn("API Overview failed:", err.message);
        return [];
      }),
      WorkWizeAPI.getPropertyInfo(currentPropId).catch(err => {
        console.warn("API PropertyInfo failed:", err.message);
        return null;
      })
    ]);

    // Extract property areas configured in Admin
    const propAreasList = (propInfo && (propInfo.propArea || propInfo.propAreas || propInfo.PropArea || propInfo.PropAreas)) || [];

    // Filter strictly for ACTIVE areas in Admin for this property
    const activeAdminAreas = Array.isArray(propAreasList)
      ? propAreasList.filter(item => {
          if (!item) return false;
          // Exclude any area explicitly marked inactive
          if (item.isactive === false || item.isactive === 0 || item.isactive === "0" || item.isactive === "false" ||
              item.isActive === false || item.isActive === 0 || item.isActive === "0" || item.isActive === "false" ||
              item.status === false || item.status === 0 || item.status === "0" || item.status === "false") {
            return false;
          }
          return true;
        })
      : [];

    let apiAreas = [];

    if (activeAdminAreas.length > 0) {
      // Strictly render active operational areas configured in Admin for this property
      apiAreas = activeAdminAreas.map(item => {
        const rawAreaId = item.areaid || item.areaId || item.AreaId || item.AreaID || "";
        const aName = item.areaName || item.AreaName || item.name || "Operational Area";
        const cleanId = String(rawAreaId).trim().toLowerCase();
        const cleanName = String(aName).trim().toLowerCase();

        // Match with overview statistics
        const ov = Array.isArray(overviewResponse) ? overviewResponse.find(o => {
          if (!o) return false;
          const oId = String(o.areaID || o.areaId || o.AreaID || o.AreaId || o.id || o.Id || "").trim().toLowerCase();
          const oName = String(o.areaName || o.name || o.AreaName || o.Name || "").trim().toLowerCase();
          if (cleanId && oId && cleanId === oId) return true;
          if (cleanName && oName && cleanName === oName) return true;
          if (cleanName && oName && (cleanName.includes(oName) || oName.includes(cleanName))) return true;
          return false;
        }) : null;

        const total = ov ? ((ov.total_jobs !== undefined && ov.total_jobs !== null && !isNaN(ov.total_jobs))
          ? Number(ov.total_jobs)
          : ((ov.total !== undefined && ov.total !== null && !isNaN(ov.total)) ? Number(ov.total) : 0)) : 0;

        const open = ov ? ((ov.open_jobs !== undefined && ov.open_jobs !== null && !isNaN(ov.open_jobs))
          ? Number(ov.open_jobs)
          : ((ov.open !== undefined && ov.open !== null && !isNaN(ov.open)) ? Number(ov.open) : 0)) : 0;

        const safety = ov ? ((ov.safety_jobs !== undefined && ov.safety_jobs !== null && !isNaN(ov.safety_jobs))
          ? Number(ov.safety_jobs)
          : ((ov.safety !== undefined && ov.safety !== null && !isNaN(ov.safety)) ? Number(ov.safety) : 0)) : 0;

        const jobsObj = (ov && (ov.jobs || ov.Jobs)) || {};
        const day30 = (jobsObj.day30 !== undefined && jobsObj.day30 !== null && !isNaN(jobsObj.day30)) ? Number(jobsObj.day30) : 0;
        const day60 = (jobsObj.day60 !== undefined && jobsObj.day60 !== null && !isNaN(jobsObj.day60)) ? Number(jobsObj.day60) : 0;
        const day90 = (jobsObj.day90 !== undefined && jobsObj.day90 !== null && !isNaN(jobsObj.day90)) ? Number(jobsObj.day90) : 0;

        return {
          id: rawAreaId || (aName ? aName.toLowerCase().replace(/\s+/g, "-") : "area"),
          name: aName,
          total: total,
          open: open,
          safety: safety,
          day30: day30,
          day60: day60,
          day90: day90,
          icon: getAreaIcon(aName)
        };
      });
    } else if (Array.isArray(overviewResponse) && overviewResponse.length > 0) {
      // Fallback if property info could not be fetched: filter overview response directly
      apiAreas = overviewResponse
        .filter(item => {
          if (!item) return false;
          if (item.isactive === false || item.isactive === 0 || item.isactive === "0" || item.isactive === "false" ||
              item.isActive === false || item.isActive === 0 || item.isActive === "0" || item.isActive === "false" ||
              item.status === false || item.status === 0 || item.status === "0" || item.status === "false") {
            return false;
          }
          return true;
        })
        .map(item => {
          const total = (item.total_jobs !== undefined && item.total_jobs !== null && !isNaN(item.total_jobs))
            ? Number(item.total_jobs)
            : ((item.total !== undefined && item.total !== null && !isNaN(item.total)) ? Number(item.total) : 0);

          const open = (item.open_jobs !== undefined && item.open_jobs !== null && !isNaN(item.open_jobs))
            ? Number(item.open_jobs)
            : ((item.open !== undefined && item.open !== null && !isNaN(item.open)) ? Number(item.open) : 0);

          const safety = (item.safety_jobs !== undefined && item.safety_jobs !== null && !isNaN(item.safety_jobs))
            ? Number(item.safety_jobs)
            : ((item.safety !== undefined && item.safety !== null && !isNaN(item.safety)) ? Number(item.safety) : 0);

          const jobsObj = item.jobs || item.Jobs || {};
          const day30 = (jobsObj.day30 !== undefined && jobsObj.day30 !== null && !isNaN(jobsObj.day30)) ? Number(jobsObj.day30) : 0;
          const day60 = (jobsObj.day60 !== undefined && jobsObj.day60 !== null && !isNaN(jobsObj.day60)) ? Number(jobsObj.day60) : 0;
          const day90 = (jobsObj.day90 !== undefined && jobsObj.day90 !== null && !isNaN(jobsObj.day90)) ? Number(jobsObj.day90) : 0;

          const rawAreaId = item.areaID || item.areaId || item.AreaID || item.AreaId || item.id || item.Id || "";
          const aName = item.areaName || item.name || item.AreaName || item.Name || "Operational Area";

          return {
            id: rawAreaId || (aName ? aName.toLowerCase().replace(/\s+/g, "-") : "area"),
            name: aName,
            total: total,
            open: open,
            safety: safety,
            day30: day30,
            day60: day60,
            day90: day90,
            icon: getAreaIcon(aName)
          };
        });
    }

    areaOverviewData = apiAreas;
    updateAreaStats(areaOverviewData);
    renderJobsByAreaTable();
    restoreLastAreaModal();
    return;
  } catch (error) {
    console.warn("API Overview failed:", error.message);
  }

  // If API failed or returned non-array, render empty state for this property (no mock data)

  areaOverviewData = [];

  updateAreaStats(areaOverviewData);

  renderJobsByAreaTable();

  restoreLastAreaModal();

}

function restoreLastAreaModal() {







  const lastModalStr = sessionStorage.getItem("ww_last_area_modal");







  if (lastModalStr) {







    try {







      const lm = JSON.parse(lastModalStr);







      if (lm.type === "area" && lm.areaId) {







        showAreaJobsModal(lm.areaId, lm.areaName);







      } else if (lm.type === "open" && lm.areaId) {







        showAreaOpenJobsModal(lm.areaId, lm.areaName);







      } else if (lm.type === "date" && lm.areaId) {







        showAreaJobsByDateModal(lm.areaId, lm.areaName, lm.dateSpan);







      } else if (lm.type === "safety" && lm.areaId) {







        showAreaSafetyJobsModal(lm.areaId, lm.areaName);







      } else if (lm.type === "propAll") {







        showPropertyAllJobsModal();







      } else if (lm.type === "propOpen") {







        showPropertyOpenJobsModal();







      } else if (lm.type === "propClosed") {







        showPropertyClosedJobsModal();







      } else if (lm.type === "propSafety") {







        showPropertySafetyJobsModal();







      }







    } catch (e) {}







  }







}







function updateAreaStats(areas) {







  const total = areas.reduce((sum, a) => sum + (Number(a.total) || 0), 0);







  const open = areas.reduce((sum, a) => sum + (Number(a.open) || 0), 0);







  const safety = areas.reduce((sum, a) => sum + (Number(a.safety) || 0), 0);







  const closed = Math.max(0, total - open);







  const totalEl = document.getElementById("statTotalJobs");







  const openEl = document.getElementById("statOpenJobs");







  const closedEl = document.getElementById("statClosedJobs");







  const safetyEl = document.getElementById("statSafetyJobs");







  if (totalEl) totalEl.textContent = total;







  if (openEl) openEl.textContent = open;







  if (closedEl) closedEl.textContent = closed;







  if (safetyEl) safetyEl.textContent = safety;







  if (typeof updateHeaderBadges === "function") {







    updateHeaderBadges(open, closed);







  }







}







function renderJobsByAreaTable(filterQuery = "") {







  const tbody = document.getElementById("jobsByAreaTableBody");







  if (!tbody) return;







  tbody.innerHTML = "";







  const filtered = areaOverviewData.filter(a =>







    a.name.toLowerCase().includes(filterQuery.toLowerCase())







  );







  const counterEl = document.getElementById("areaTotalCounter");







  if (counterEl) {







    counterEl.textContent = `Total ${filtered.length} Operational Areas`;







  }







  if (filtered.length === 0) {







    const emptyMsg = filterQuery.trim()







      ? `No operational areas matched "${escapeHtml(filterQuery)}".`







      : `No active operational areas found for this property.`;







    tbody.innerHTML = `







      <tr>







        <td colspan="6" class="text-center py-8 text-slate-400 text-xs">







          ${emptyMsg}







        </td>







      </tr>







    `;







    return;







  }







  const maxJobsInList = Math.max(1, ...areaOverviewData.map(a => Number(a.total) || 0));







  filtered.forEach((area, index) => {







    const tr = document.createElement("tr");







    tr.className = "hover:bg-blue-50/20 transition-colors cursor-pointer";







    tr.setAttribute("data-area-id", area.id);







    tr.setAttribute("data-area-name", area.name);







    const totalNum = Number(area.total) || 0;







    const openNum = Number(area.open) || 0;







    const safetyNum = Number(area.safety) || 0;







    // Segment widths representing Total (Green), Open (Blue), and Safety (Red)







    const weightSum = (totalNum + openNum + safetyNum) || 1;







    let greenWidth = totalNum > 0 ? Math.round((totalNum / weightSum) * 100) : 0;







    let blueWidth = openNum > 0 ? Math.round((openNum / weightSum) * 100) : 0;







    let redWidth = safetyNum > 0 ? Math.round((safetyNum / weightSum) * 100) : 0;







    if (totalNum > 0 || openNum > 0 || safetyNum > 0) {







      const activeTotal = greenWidth + blueWidth + redWidth;







      if (activeTotal > 0) {







        greenWidth = Math.round((greenWidth / activeTotal) * 100);







        blueWidth = Math.round((blueWidth / activeTotal) * 100);







        redWidth = Math.max(0, 100 - greenWidth - blueWidth);







      }







    }







    const isLastRows = index >= (filtered.length - 3);







    tr.innerHTML = `







      <td class="text-slate-400 font-medium">${index + 1}</td>







      <td class="font-medium text-slate-800">







        <div class="flex items-center gap-2">







          <span class="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs shrink-0 shadow-xs">







            <i class="fa-solid ${area.icon}"></i>







          </span>







          <div>







            <a href="javascript:void(0);" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" class="hover:text-blue-600 font-bold text-slate-900 transition-colors cursor-pointer text-xs" title="Click to view all jobs in ${area.name}">







              ${area.name}







            </a>







          </div>







        </div>







      </td>







      <td>







        <a href="javascript:void(0);" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" class="font-extrabold text-slate-900 hover:text-blue-600 transition-colors inline-flex items-center gap-1.5 text-xs" title="View all ${area.total} jobs in ${area.name}">







          <span>${area.total}</span>







          <i class="fa-solid fa-arrow-up-right-from-square text-[9px] text-blue-600 font-bold hover:text-blue-700"></i>







        </a>







      </td>







      <td>







        <!-- Open Count with Interactive Split Button & Age Dropdown -->







        <div class="relative inline-block text-left dropdown-group">







          <div class="inline-flex items-center rounded-lg bg-blue-50 border border-blue-200/80 shadow-xs">







            <button type="button" class="px-2 py-0.5 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors cursor-pointer" onclick="showAreaOpenJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" title="Click to view all ${area.open} open jobs in ${area.name}">







              <span>${area.open}</span>







            </button>







            <button type="button" class="px-1.5 py-0.5 hover:bg-blue-100 text-blue-500 transition-colors border-l border-blue-200/60 cursor-pointer" onclick="toggleRowMenu(this)" title="View open jobs breakdown by age">







              <i class="fa-solid fa-chevron-down text-[9px]"></i>







            </button>







          </div>







          <!-- Dropdown Menu -->







          <div class="hidden absolute left-0 ${isLastRows ? 'bottom-full mb-1.5' : 'top-full mt-1.5'} w-60 bg-white border border-slate-200 rounded-xl shadow-2xl py-2 z-40 text-xs text-slate-700 dropdown-menu animate-fade-in">







            <div class="px-3.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 flex items-center justify-between">







              <span>Open Jobs by Age</span>







              <i class="fa-regular fa-clock text-blue-500"></i>







            </div>







            <a href="javascript:void(0);" onclick="showAreaJobsByDateModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}', 'd30')" class="flex items-center justify-between px-3.5 py-2 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors">







              <span class="flex items-center gap-2 font-medium">







                <span class="w-2 h-2 rounded-full bg-emerald-500"></span> Within 30 Days







              </span>







              <span class="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">${area.day30}</span>







            </a>







            <a href="javascript:void(0);" onclick="showAreaJobsByDateModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}', 'd60')" class="flex items-center justify-between px-3.5 py-2 hover:bg-amber-50 text-slate-700 hover:text-amber-700 transition-colors">







              <span class="flex items-center gap-2 font-medium">







                <span class="w-2 h-2 rounded-full bg-amber-500"></span> 31 to 89 Days







              </span>







              <span class="font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-[11px]">${area.day60}</span>







            </a>







            <a href="javascript:void(0);" onclick="showAreaJobsByDateModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}', 'd90')" class="flex items-center justify-between px-3.5 py-2 hover:bg-rose-50 text-slate-700 hover:text-rose-700 transition-colors">







              <span class="flex items-center gap-2 font-medium">







                <span class="w-2 h-2 rounded-full bg-rose-500"></span> 90+ Days Ago







              </span>







              <span class="font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded text-[11px]">${area.day90}</span>







            </a>







            <div class="border-t border-slate-100 my-1"></div>







            <a href="javascript:void(0);" onclick="showAreaOpenJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')" class="block px-3.5 py-1.5 text-center text-blue-600 hover:bg-blue-50 font-semibold text-[11px]">







              View All Open Jobs (${area.open})







            </a>







          </div>







        </div>







      </td>







      <td>







        <a href="javascript:void(0);" onclick="${area.safety > 0 ? `showAreaSafetyJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')` : 'void(0)'}" class="px-2 py-0.5 rounded-full text-xs font-bold transition-all ${area.safety > 0 ? 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 cursor-pointer' : 'text-slate-400 bg-slate-50 cursor-default'}">







          ${area.safety}







        </a>







      </td>







      <td style="min-width: 250px;">







        <!-- Compact Progress Bar with Total (Green), Open (Blue), and Safety (Red) -->







        <div class="flex items-center gap-2">







          <div class="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden flex shadow-2xs">







            ${totalNum > 0 ? `







              <div class="bg-emerald-500 h-full transition-all duration-300 hover:brightness-110 cursor-pointer" style="width: ${greenWidth}%" title="Total Jobs: ${totalNum}" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')"></div>







              ${blueWidth > 0 ? `<div class="bg-blue-600 h-full transition-all duration-300 hover:brightness-110 cursor-pointer" style="width: ${blueWidth}%" title="Open Jobs: ${openNum}" onclick="showAreaOpenJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')"></div>` : ''}







              ${redWidth > 0 ? `<div class="bg-rose-500 h-full transition-all duration-300 hover:brightness-110 cursor-pointer" style="width: ${redWidth}%" title="Safety Issues: ${safetyNum}" onclick="${safetyNum > 0 ? `showAreaSafetyJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')` : 'void(0)'}"></div>` : ''}







            ` : `







              <div class="bg-slate-200 h-full w-full" title="Total Jobs: 0"></div>







            `}







          </div>







          <!-- Category count pills showing numbers and category on hover (Percentage removed) -->







          <div class="flex items-center gap-1.5 shrink-0">







            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/80 font-bold text-xs transition-colors cursor-pointer" title="Total Jobs: ${totalNum}" onclick="showAreaJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')">







              <span class="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>







              <span>${totalNum}</span>







            </span>







            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 font-bold text-xs transition-colors cursor-pointer" title="Open Jobs: ${openNum}" onclick="showAreaOpenJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')">







              <span class="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>







              <span>${openNum}</span>







            </span>







            <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md ${safetyNum > 0 ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/80' : 'bg-slate-50 text-slate-400 border border-slate-200'} font-bold text-xs transition-colors cursor-pointer" title="Safety Issues: ${safetyNum}" onclick="${safetyNum > 0 ? `showAreaSafetyJobsModal('${escapeHtml(area.id)}', '${escapeHtml(area.name)}')` : 'void(0)'}">







              <span class="w-2 h-2 rounded-full ${safetyNum > 0 ? 'bg-rose-500' : 'bg-slate-300'} shrink-0"></span>







              <span>${safetyNum}</span>







            </span>







          </div>







        </div>







      </td>







    `;







    tbody.appendChild(tr);







  });







  if (typeof restoreTableRowHighlight === "function") {







    restoreTableRowHighlight(tbody);







  }







}







function openCreateJobForArea(areaName, areaId) {







  if (typeof openModal === "function") {







    openModal();







    const areaSelect = document.getElementById("modalArea");







    if (areaSelect) {







      for (let i = 0; i < areaSelect.options.length; i++) {







        if (areaSelect.options[i].text.toLowerCase() === areaName.toLowerCase() || areaSelect.options[i].value === areaId) {







          areaSelect.selectedIndex = i;







          if (typeof handleModalAreaChange === "function") {







            handleModalAreaChange();







          }







          break;







        }







      }







    }







  }







}







function getAreaIcon(name) {







  const n = (name || "").toLowerCase();







  if (n.includes("compliance") || n.includes("legal")) return "fa-scale-balanced";







  if (n.includes("project") || n.includes("develop")) return "fa-cubes";







  if (n.includes("fire") || n.includes("safety")) return "fa-fire-extinguisher";







  if (n.includes("house") || n.includes("back")) return "fa-door-open";







  if (n.includes("capex")) return "fa-sack-dollar";







  if (n.includes("sop") || n.includes("checklist")) return "fa-list-check";







  if (n.includes("energy")) return "fa-bolt-lightning";







  if (n.includes("waste")) return "fa-recycle";







  if (n.includes("utility")) return "fa-faucet-drip";







  if (n.includes("villa") || n.includes("room")) return "fa-hotel";







  return "fa-layer-group";







}








function getFirstLinePreview(val, maxChars = 38) {
  if (val === null || val === undefined) return '<span class="text-slate-400">No description</span>';
  let s = String(val);
  s = s.replace(/<br\s*[\/]?>/gi, "\n")
       .replace(/<\/p>/gi, "\n")
       .replace(/<p[^>]*>/gi, "")
       .replace(/<\/div>/gi, "\n")
       .replace(/<div[^>]*>/gi, "")
       .replace(/<li[^>]*>/gi, "")
       .replace(/<\/li>/gi, "\n")
       .replace(/<[^>]+>/g, "");
  s = s.replace(/&nbsp;/gi, " ")
       .replace(/&amp;/gi, "&")
       .replace(/&lt;/gi, "<")
       .replace(/&gt;/gi, ">")
       .replace(/&quot;/gi, '"')
       .replace(/&#39;/gi, "'");
  
  const lines = s.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  if (lines.length === 0) return '<span class="text-slate-400">No description</span>';

  let firstLine = lines[0];
  let hasMore = lines.length > 1;
  if (firstLine.length > maxChars) {
    firstLine = firstLine.substring(0, maxChars).trim();
    hasMore = true;
  }
  return escapeHtml(firstLine) + (hasMore ? "..." : "");
}

function stripHtmlToPlain(val) {
  if (val === null || val === undefined) return "";
  let s = String(val)
    .replace(/<br\s*[\/]?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<p[^>]*>/gi, "")
    .replace(/<\/div>/gi, " ")
    .replace(/<div[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
  return s.replace(/\s+/g, " ").trim();
}

function renderRichText(str) {







  if (str === null || str === undefined) return "";







  const s = String(str);







  if (/<[a-z][\s\S]*>/i.test(s)) {







    return s.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")







            .replace(/on\w+="[^"]*"/gi, "")







            .replace(/javascript:/gi, "");







  }







  return escapeHtml(s).replace(/\n/g, "<br>");







}







function escapeHtml(str) {







  return String(str || "").replace(/'/g, "\\'").replace(/"/g, "&quot;");







}







function initAreaSearch() {







  const searchInput = document.getElementById("areaSearchInput");







  if (!searchInput) return;







  searchInput.addEventListener("input", function (e) {







    renderJobsByAreaTable(e.target.value.trim());







  });







}







function toggleRowMenu(btn) {







  const menu = btn.closest(".dropdown-group")?.querySelector(".dropdown-menu");







  document.querySelectorAll(".dropdown-menu").forEach(m => {







    if (m !== menu) m.classList.add("hidden");







  });







  if (menu) {







    menu.classList.toggle("hidden");







  }







}







document.addEventListener("click", function (e) {







  if (!e.target.closest(".dropdown-group")) {







    document.querySelectorAll(".dropdown-menu").forEach(m => m.classList.add("hidden"));







  }







});







// ============================================================







// Area & Property Jobs Modal Management







// ============================================================







/**







 * 1. Total Jobs for Specific Area (Clicked from table row)







 */







async function showAreaJobsModal(areaId, areaName) {







  currentAreaModalName = areaName;







  sessionStorage.setItem("ww_selected_area_id", areaId);







  sessionStorage.setItem("ww_last_area_modal", JSON.stringify({ type: "area", areaId, areaName }));







  const mainTbody = document.getElementById("jobsByAreaTableBody");







  if (mainTbody) {







    mainTbody.querySelectorAll("tr").forEach(r => r.classList.remove("table-row-selected"));







    const match = mainTbody.querySelector(`tr[data-area-id="${areaId}"]`);







    if (match) match.classList.add("table-row-selected");







  }







  const modal = document.getElementById("areaJobsModal");







  const titleArea = document.getElementById("areaModalAreaName");







  const titleProp = document.getElementById("areaModalPropName");







  const countSpan = document.getElementById("areaModalJobCount");







  const footerCount = document.getElementById("areaModalFooterCount");







  const searchInput = document.getElementById("areaModalSearchInput");







  const tbody = document.getElementById("areaModalTableBody");







  if (!modal || !tbody) return;







  const currentPropId = WorkWizeAPI.getCurrentProperty();







  const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();







  if (titleArea) titleArea.textContent = areaName;







  if (titleProp) titleProp.textContent = `[${currentPropName}]`;







  if (searchInput) searchInput.value = "";







  tbody.innerHTML = `







    <tr>







      <td colspan="15" class="py-12 text-center text-slate-400">







        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>







        <p class="text-xs">Loading jobs for ${escapeHtml(areaName)}...</p>







      </td>







    </tr>







  `;







  modal.classList.add("open");







  initAreaModalCloseListeners();







  let jobs = [];







  // Step A: Attempt live getAreaJobs API







  if (typeof WorkWizeAPI !== "undefined") {







    try {







      const res = await WorkWizeAPI.getAreaJobs(areaId);







      if (res && Array.isArray(res.jobs)) jobs = res.jobs;







      else if (res && Array.isArray(res.Jobs)) jobs = res.Jobs;







      else if (res && Array.isArray(res.data)) jobs = res.data;







      else if (res && Array.isArray(res.result)) jobs = res.result;







      else if (Array.isArray(res)) jobs = res;







    } catch (err) {







      console.warn("API getAreaJobs error:", err);







    }







  }







  // Step B: Fall back to propertyJobsCache if no jobs returned







  if (!jobs || jobs.length === 0) {







    if (!propertyJobsCache || propertyJobsCache.length === 0) {







      await loadPropertyJobsCache(currentPropId);







    }







    jobs = propertyJobsCache.filter(j => jobMatchesArea(j, areaId, areaName));







  }







  // Step C: Include any locally stored jobs from WorkWizeDB matching this area







  if (typeof WorkWizeDB !== "undefined" && WorkWizeDB.getJobs) {







    const localJobs = WorkWizeDB.getJobs();







    if (Array.isArray(localJobs)) {







      const localMatches = localJobs.filter(j => jobMatchesArea(j, areaId, areaName));







      localMatches.forEach(lj => {







        const norm = normalizeJobObject(lj);







        if (!jobs.some(j => (j.jobId || j.orgjobId) === (norm.jobId || norm.orgjobId))) {







          jobs.push(norm);







        }







      });







    }







  }







  jobs = (jobs || []).map(normalizeJobObject);







  currentAreaModalJobs = jobs;







  renderAreaModalRows(jobs);







  if (countSpan) countSpan.textContent = jobs.length;







  if (footerCount) footerCount.textContent = `Total ${jobs.length} jobs in ${areaName}`;







  attachModalSearchListener();







}







/**







 * 2. Open Jobs for Specific Area (Clicked from table row Open Jobs number or View All Open Jobs)







 */







async function showAreaOpenJobsModal(areaId, areaName) {







  currentAreaModalName = `${areaName} Open`;







  sessionStorage.setItem("ww_selected_area_id", areaId);







  sessionStorage.setItem("ww_last_area_modal", JSON.stringify({ type: "open", areaId, areaName }));







  const mainTbody = document.getElementById("jobsByAreaTableBody");







  if (mainTbody) {







    mainTbody.querySelectorAll("tr").forEach(r => r.classList.remove("table-row-selected"));







    const match = mainTbody.querySelector(`tr[data-area-id="${areaId}"]`);







    if (match) match.classList.add("table-row-selected");







  }







  const modal = document.getElementById("areaJobsModal");







  const titleArea = document.getElementById("areaModalAreaName");







  const titleProp = document.getElementById("areaModalPropName");







  const countSpan = document.getElementById("areaModalJobCount");







  const footerCount = document.getElementById("areaModalFooterCount");







  const searchInput = document.getElementById("areaModalSearchInput");







  const tbody = document.getElementById("areaModalTableBody");







  if (!modal || !tbody) return;







  const currentPropId = WorkWizeAPI.getCurrentProperty();







  const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();







  if (titleArea) titleArea.textContent = `${areaName} (Open Jobs)`;







  if (titleProp) titleProp.textContent = `[${currentPropName}]`;







  if (searchInput) searchInput.value = "";







  tbody.innerHTML = `







    <tr>







      <td colspan="15" class="py-12 text-center text-slate-400">







        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>







        <p class="text-xs">Loading open jobs for ${escapeHtml(areaName)}...</p>







      </td>







    </tr>







  `;







  modal.classList.add("open");







  initAreaModalCloseListeners();







  let jobs = [];







  // Step A: Attempt getAreaJobs API and filter open







  if (typeof WorkWizeAPI !== "undefined") {







    try {







      const res = await WorkWizeAPI.getAreaJobs(areaId);







      let allAreaJobs = [];







      if (res && Array.isArray(res.jobs)) allAreaJobs = res.jobs;







      else if (res && Array.isArray(res.Jobs)) allAreaJobs = res.Jobs;







      else if (res && Array.isArray(res.data)) allAreaJobs = res.data;







      else if (Array.isArray(res)) allAreaJobs = res;







      jobs = allAreaJobs.filter(j => !isClosedStatus(j.jobStatus || j.JobStatus || j.status));







    } catch (err) {







      console.warn("API getAreaJobs error:", err);







    }







  }







  // Step B: Fall back to propertyJobsCache







  if (!jobs || jobs.length === 0) {







    if (!propertyJobsCache || propertyJobsCache.length === 0) {







      await loadPropertyJobsCache(currentPropId);







    }







    jobs = propertyJobsCache.filter(j => jobMatchesArea(j, areaId, areaName) && !isClosedStatus(j));







  }







  // Step C: Include local DB open jobs







  if (typeof WorkWizeDB !== "undefined" && WorkWizeDB.getJobs) {







    const localJobs = WorkWizeDB.getJobs();







    if (Array.isArray(localJobs)) {







      const localMatches = localJobs.filter(j => jobMatchesArea(j, areaId, areaName) && !isClosedStatus(j.status));







      localMatches.forEach(lj => {







        const norm = normalizeJobObject(lj);







        if (!jobs.some(j => (j.jobId || j.orgjobId) === (norm.jobId || norm.orgjobId))) {







          jobs.push(norm);







        }







      });







    }







  }







  jobs = (jobs || []).map(normalizeJobObject);







  currentAreaModalJobs = jobs;







  renderAreaModalRows(jobs);







  if (countSpan) countSpan.textContent = jobs.length;







  if (footerCount) footerCount.textContent = `Total ${jobs.length} open jobs in ${areaName}`;







  attachModalSearchListener();







}







/**







 * 3. Area Jobs Filtered by Age Date Span (Within 30 Days, 31 to 89 Days, 90+ Days)







 */







async function showAreaJobsByDateModal(areaId, areaName, dateSpan) {







  let dateLabel = "Within 30 Days";







  if (dateSpan === "d60") dateLabel = "31 to 89 Days";







  else if (dateSpan === "d90") dateLabel = "90+ Days Ago";







  currentAreaModalName = `${areaName} (${dateLabel})`;







  sessionStorage.setItem("ww_selected_area_id", areaId);







  sessionStorage.setItem("ww_last_area_modal", JSON.stringify({ type: "date", areaId, areaName, dateSpan }));







  const mainTbody = document.getElementById("jobsByAreaTableBody");







  if (mainTbody) {







    mainTbody.querySelectorAll("tr").forEach(r => r.classList.remove("table-row-selected"));







    const match = mainTbody.querySelector(`tr[data-area-id="${areaId}"]`);







    if (match) match.classList.add("table-row-selected");







  }







  const modal = document.getElementById("areaJobsModal");







  const titleArea = document.getElementById("areaModalAreaName");







  const titleProp = document.getElementById("areaModalPropName");







  const countSpan = document.getElementById("areaModalJobCount");







  const footerCount = document.getElementById("areaModalFooterCount");







  const searchInput = document.getElementById("areaModalSearchInput");







  const tbody = document.getElementById("areaModalTableBody");







  if (!modal || !tbody) return;







  const currentPropId = WorkWizeAPI.getCurrentProperty();







  const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();







  if (titleArea) titleArea.textContent = `${areaName} (${dateLabel})`;







  if (titleProp) titleProp.textContent = `[${currentPropName}]`;







  if (searchInput) searchInput.value = "";







  tbody.innerHTML = `







    <tr>







      <td colspan="15" class="py-12 text-center text-slate-400">







        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>







        <p class="text-xs">Loading ${dateLabel} jobs for ${escapeHtml(areaName)}...</p>







      </td>







    </tr>







  `;







  modal.classList.add("open");







  initAreaModalCloseListeners();







  let jobs = [];







  // Step A: Attempt getAreaJobsByDate API







  try {







    const res = await WorkWizeAPI.getAreaJobsByDate(areaId, dateSpan);







    if (res && Array.isArray(res.jobs)) jobs = res.jobs;







    else if (res && Array.isArray(res.Jobs)) jobs = res.Jobs;







    else if (res && Array.isArray(res.data)) jobs = res.data;







    else if (Array.isArray(res)) jobs = res;







  } catch (e) {







    console.warn("API getAreaJobsByDate error:", e);







  }







  // Step B: Fall back to propertyJobsCache







  if (!jobs || jobs.length === 0) {







    if (!propertyJobsCache || propertyJobsCache.length === 0) {







      await loadPropertyJobsCache(currentPropId);







    }







    const now = new Date().getTime();







    jobs = propertyJobsCache.filter(j => {







      if (!jobMatchesArea(j, areaId, areaName)) return false;







      if (isClosedStatus(j)) return false;







      const createdTime = (j.jobCreatedOn || j.openedOn) ? new Date(j.jobCreatedOn || j.openedOn).getTime() : 0;







      if (!createdTime || isNaN(createdTime)) return dateSpan === "d30";







      const diffDays = (now - createdTime) / (1000 * 60 * 60 * 24);







      if (dateSpan === "d30") return diffDays <= 30;







      if (dateSpan === "d60") return diffDays > 30 && diffDays < 90;







      if (dateSpan === "d90") return diffDays >= 90;







      return true;







    });







  }







  jobs = (jobs || []).map(normalizeJobObject);







  currentAreaModalJobs = jobs;







  renderAreaModalRows(jobs);







  if (countSpan) countSpan.textContent = jobs.length;







  if (footerCount) footerCount.textContent = `Total ${jobs.length} jobs (${dateLabel})`;







  attachModalSearchListener();







}







/**







 * 4. Safety Issues for Area (Clicked from safety count badge)







 */







async function showAreaSafetyJobsModal(areaId, areaName) {







  currentAreaModalName = `${areaName} Safety`;







  sessionStorage.setItem("ww_selected_area_id", areaId);







  sessionStorage.setItem("ww_last_area_modal", JSON.stringify({ type: "safety", areaId, areaName }));







  const mainTbody = document.getElementById("jobsByAreaTableBody");







  if (mainTbody) {







    mainTbody.querySelectorAll("tr").forEach(r => r.classList.remove("table-row-selected"));







    const match = mainTbody.querySelector(`tr[data-area-id="${areaId}"]`);







    if (match) match.classList.add("table-row-selected");







  }







  const modal = document.getElementById("areaJobsModal");







  const titleArea = document.getElementById("areaModalAreaName");







  const titleProp = document.getElementById("areaModalPropName");







  const countSpan = document.getElementById("areaModalJobCount");







  const footerCount = document.getElementById("areaModalFooterCount");







  const searchInput = document.getElementById("areaModalSearchInput");







  const tbody = document.getElementById("areaModalTableBody");







  if (!modal || !tbody) return;







  const currentPropId = WorkWizeAPI.getCurrentProperty();







  const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();







  if (titleArea) titleArea.textContent = `${areaName} (Safety Issues)`;







  if (titleProp) titleProp.textContent = `[${currentPropName}]`;







  if (searchInput) searchInput.value = "";







  tbody.innerHTML = `







    <tr>







      <td colspan="15" class="py-12 text-center text-slate-400">







        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>







        <p class="text-xs">Loading safety issues for ${escapeHtml(areaName)}...</p>







      </td>







    </tr>







  `;







  modal.classList.add("open");







  initAreaModalCloseListeners();







  if (!propertyJobsCache || propertyJobsCache.length === 0) {







    await loadPropertyJobsCache(currentPropId);







  }







  let jobs = propertyJobsCache.filter(j => {







    return jobMatchesArea(j, areaId, areaName) && (j.priority || "").toLowerCase().includes("safety");







  });







  jobs = (jobs || []).map(normalizeJobObject);







  currentAreaModalJobs = jobs;







  renderAreaModalRows(jobs);







  if (countSpan) countSpan.textContent = jobs.length;







  if (footerCount) footerCount.textContent = `Total ${jobs.length} safety issue jobs in ${areaName}`;







  attachModalSearchListener();







}







/**







 * 5. Property-Wide Total Jobs (Clicked from top stat card #statTotalJobs)







 */







async function showPropertyAllJobsModal() {







  currentAreaModalName = "All Areas";







  const modal = document.getElementById("areaJobsModal");







  const titleArea = document.getElementById("areaModalAreaName");







  const titleProp = document.getElementById("areaModalPropName");







  const countSpan = document.getElementById("areaModalJobCount");







  const footerCount = document.getElementById("areaModalFooterCount");







  const searchInput = document.getElementById("areaModalSearchInput");







  const tbody = document.getElementById("areaModalTableBody");







  if (!modal || !tbody) return;







  const currentPropId = WorkWizeAPI.getCurrentProperty();







  const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();







  if (titleArea) titleArea.textContent = "All Areas (Total Jobs)";







  if (titleProp) titleProp.textContent = `[${currentPropName}]`;







  if (searchInput) searchInput.value = "";







  tbody.innerHTML = `







    <tr>







      <td colspan="15" class="py-12 text-center text-slate-400">







        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>







        <p class="text-xs">Loading all registered jobs for ${escapeHtml(currentPropName)}...</p>







      </td>







    </tr>







  `;







  modal.classList.add("open");







  initAreaModalCloseListeners();







  let jobs = propertyJobsCache;







  if (!jobs || jobs.length === 0) {







    jobs = await loadPropertyJobsCache(currentPropId);







  }







  jobs = (jobs || []).map(normalizeJobObject);







  currentAreaModalJobs = jobs;







  renderAreaModalRows(jobs);







  if (countSpan) countSpan.textContent = jobs.length;







  if (footerCount) footerCount.textContent = `Total ${jobs.length} registered jobs across all operational areas`;







  attachModalSearchListener();







}







/**







 * 6. Property-Wide Open Jobs (Clicked from top stat card #statOpenJobs)







 */







async function showPropertyOpenJobsModal() {







  currentAreaModalName = "All Areas Open";







  sessionStorage.setItem("ww_last_area_modal", JSON.stringify({ type: "propOpen" }));







  const modal = document.getElementById("areaJobsModal");







  const titleArea = document.getElementById("areaModalAreaName");







  const titleProp = document.getElementById("areaModalPropName");







  const countSpan = document.getElementById("areaModalJobCount");







  const footerCount = document.getElementById("areaModalFooterCount");







  const searchInput = document.getElementById("areaModalSearchInput");







  const tbody = document.getElementById("areaModalTableBody");







  if (!modal || !tbody) return;







  const currentPropId = WorkWizeAPI.getCurrentProperty();







  const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();







  if (titleArea) titleArea.textContent = "All Areas (Open Jobs)";







  if (titleProp) titleProp.textContent = `[${currentPropName}]`;







  if (searchInput) searchInput.value = "";







  tbody.innerHTML = `







    <tr>







      <td colspan="15" class="py-12 text-center text-slate-400">







        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>







        <p class="text-xs">Loading open jobs for ${escapeHtml(currentPropName)}...</p>







      </td>







    </tr>







  `;







  modal.classList.add("open");







  initAreaModalCloseListeners();







  let allJobs = propertyJobsCache;







  if (!allJobs || allJobs.length === 0) {







    allJobs = await loadPropertyJobsCache(currentPropId);







  }







  const openJobs = (allJobs || []).filter(j => !isClosedStatus(j)).map(normalizeJobObject);







  currentAreaModalJobs = openJobs;







  renderAreaModalRows(openJobs);







  if (countSpan) countSpan.textContent = openJobs.length;







  if (footerCount) footerCount.textContent = `Total ${openJobs.length} open jobs across all operational areas`;







  attachModalSearchListener();







}







/**







 * 7. Property-Wide Closed Jobs (Clicked from top stat card #statClosedJobs)







 */







async function showPropertyClosedJobsModal() {







  currentAreaModalName = "All Areas Closed";







  sessionStorage.setItem("ww_last_area_modal", JSON.stringify({ type: "propClosed" }));







  const modal = document.getElementById("areaJobsModal");







  const titleArea = document.getElementById("areaModalAreaName");







  const titleProp = document.getElementById("areaModalPropName");







  const countSpan = document.getElementById("areaModalJobCount");







  const footerCount = document.getElementById("areaModalFooterCount");







  const searchInput = document.getElementById("areaModalSearchInput");







  const tbody = document.getElementById("areaModalTableBody");







  if (!modal || !tbody) return;







  const currentPropId = WorkWizeAPI.getCurrentProperty();







  const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();







  if (titleArea) titleArea.textContent = "All Areas (Closed Jobs)";







  if (titleProp) titleProp.textContent = `[${currentPropName}]`;







  if (searchInput) searchInput.value = "";







  tbody.innerHTML = `







    <tr>







      <td colspan="15" class="py-12 text-center text-slate-400">







        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>







        <p class="text-xs">Loading closed jobs for ${escapeHtml(currentPropName)}...</p>







      </td>







    </tr>







  `;







  modal.classList.add("open");







  initAreaModalCloseListeners();







  let closedJobs = [];







  if (typeof WorkWizeAPI !== "undefined" && WorkWizeAPI.getClosedJobs) {







    try {







      const res = await WorkWizeAPI.getClosedJobs(currentPropId);







      if (res && Array.isArray(res.jobs)) closedJobs = res.jobs;







      else if (res && Array.isArray(res.Jobs)) closedJobs = res.Jobs;







      else if (res && Array.isArray(res.data)) closedJobs = res.data;







      else if (Array.isArray(res)) closedJobs = res;







    } catch (err) {







      console.warn("API getClosedJobs error:", err);







    }







  }







  if (!closedJobs || closedJobs.length === 0) {







    let allJobs = propertyJobsCache;







    if (!allJobs || allJobs.length === 0) {







      allJobs = await loadPropertyJobsCache(currentPropId);







    }







    closedJobs = (allJobs || []).filter(j => isClosedStatus(j));







  }







  closedJobs = (closedJobs || []).map(normalizeJobObject).map(j => ({ ...j, jobStatus: "Closed", status: "Closed" }));







  currentAreaModalJobs = closedJobs;







  renderAreaModalRows(closedJobs);







  if (countSpan) countSpan.textContent = closedJobs.length;







  if (footerCount) footerCount.textContent = `Total ${closedJobs.length} closed jobs in ${currentPropName}`;







  attachModalSearchListener();







}







/**







 * 8. Property-Wide Safety Issues (Clicked from top stat card #statSafetyJobs)







 */







async function showPropertySafetyJobsModal() {







  currentAreaModalName = "All Areas Safety";







  const modal = document.getElementById("areaJobsModal");







  const titleArea = document.getElementById("areaModalAreaName");







  const titleProp = document.getElementById("areaModalPropName");







  const countSpan = document.getElementById("areaModalJobCount");







  const footerCount = document.getElementById("areaModalFooterCount");







  const searchInput = document.getElementById("areaModalSearchInput");







  const tbody = document.getElementById("areaModalTableBody");







  if (!modal || !tbody) return;







  const currentPropId = WorkWizeAPI.getCurrentProperty();







  const currentPropName = allPropertiesMap[currentPropId] || WorkWizeAPI.getCurrentPropertyName();







  if (titleArea) titleArea.textContent = "All Areas (Safety Issues)";







  if (titleProp) titleProp.textContent = `[${currentPropName}]`;







  if (searchInput) searchInput.value = "";







  tbody.innerHTML = `







    <tr>







      <td colspan="15" class="py-12 text-center text-slate-400">







        <i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-600 mb-2"></i>







        <p class="text-xs">Loading safety issues for ${escapeHtml(currentPropName)}...</p>







      </td>







    </tr>







  `;







  modal.classList.add("open");







  initAreaModalCloseListeners();







  let allJobs = propertyJobsCache;







  if (!allJobs || allJobs.length === 0) {







    allJobs = await loadPropertyJobsCache(currentPropId);







  }







  const safetyJobs = (allJobs || []).filter(j => (j.priority || "").toLowerCase().includes("safety")).map(normalizeJobObject);







  currentAreaModalJobs = safetyJobs;







  renderAreaModalRows(safetyJobs);







  if (countSpan) countSpan.textContent = safetyJobs.length;







  if (footerCount) footerCount.textContent = `Total ${safetyJobs.length} safety issue jobs in ${currentPropName}`;







  attachModalSearchListener();







}







function attachModalSearchListener() {
  populateAreaModalFilterDropdowns(currentAreaModalJobs);
  const searchInput = document.getElementById("areaModalSearchInput");
  if (searchInput) {
    searchInput.oninput = function () {
      filterAreaModalJobs();
    };
  }

  ["areaFilterStatus", "areaFilterPriority", "areaFilterArea", "areaFilterCreatedBy", "areaFilterFromDate", "areaFilterToDate"].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.onchange = function () {
        filterAreaModalJobs();
      };
    }
  });
}

function filterAreaModalJobs() {
  const searchInput = document.getElementById("areaModalSearchInput");
  const q = (searchInput?.value || "").toLowerCase().trim();

  const statusVal = (document.getElementById("areaFilterStatus")?.value || "").toLowerCase().trim();
  const priorityVal = (document.getElementById("areaFilterPriority")?.value || "").toLowerCase().trim();
  const areaVal = (document.getElementById("areaFilterArea")?.value || "").toLowerCase().trim();
  const createdByVal = (document.getElementById("areaFilterCreatedBy")?.value || "").toLowerCase().trim();
  const fromDate = document.getElementById("areaFilterFromDate")?.value || "";
  const toDate = document.getElementById("areaFilterToDate")?.value || "";

  let activeCount = 0;
  if (statusVal) activeCount++;
  if (priorityVal) activeCount++;
  if (areaVal) activeCount++;
  if (createdByVal) activeCount++;
  if (fromDate || toDate) activeCount++;

  const badge = document.getElementById("areaActiveFilterBadge");
  if (badge) {
    badge.textContent = activeCount;
    if (activeCount > 0) badge.classList.remove("hidden");
    else badge.classList.add("hidden");
  }

  let filtered = (currentAreaModalJobs || []).filter(j => {
    // 1. Search Query
    if (q) {
      const id = String(j.orgjobId || j.jobId || "").toLowerCase();
      const detail = String(j.jobDetail || j.title || j.details || "").toLowerCase();
      const villa = String(j.villaNumber || "").toLowerCase();
      const loc = String(j.jobLocation || j.location || "").toLowerCase();
      const ref = String(j.refNum || "").toLowerCase();
      const stat = String(j.jobStatus || j.status || "").toLowerCase();
      const prio = String(j.priority || "").toLowerCase();
      const assigned = String(j.assignedTo || (Array.isArray(j.data1) ? j.data1.map(d => (typeof d === "object" ? d.name || d.teamName : d)).join(", ") : "") || j.firstname || "").toLowerCase();
      const matchSearch = id.includes(q) || detail.includes(q) || villa.includes(q) || loc.includes(q) || ref.includes(q) || stat.includes(q) || prio.includes(q) || assigned.includes(q);
      if (!matchSearch) return false;
    }

    // 2. Status
    if (statusVal) {
      const normSt = String(j.jobStatus || j.status || "").toLowerCase();
      if (!normSt.includes(statusVal)) return false;
    }

    // 3. Priority
    if (priorityVal) {
      const normPr = String(j.priority || "").toLowerCase();
      if (!normPr.includes(priorityVal)) return false;
    }

    // 4. Area
    if (areaVal) {
      const jobArea = String(j.areaName || j.AreaName || j.area || j.Area || j.jobLocation || j.location || "").toLowerCase();
      if (!jobArea.includes(areaVal)) return false;
    }

    // 5. Created By
    if (createdByVal) {
      const creator = String(j.createdBy || (j.firstname ? `${j.firstname} ${j.lastname || ''}`.trim() : "")).toLowerCase();
      if (!creator.includes(createdByVal)) return false;
    }

    // 6. Date Range
    const dateVal = j.jobCreatedOn || j.openedOn || j.createdOn;
    if (fromDate && dateVal) {
      if (new Date(dateVal) < new Date(fromDate + "T00:00:00")) return false;
    }
    if (toDate && dateVal) {
      if (new Date(dateVal) > new Date(toDate + "T23:59:59")) return false;
    }

    return true;
  });

  // Sort
  if (currentAreaModalSortOrder === "asc") {
    filtered.sort((a, b) => new Date(a.jobCreatedOn || a.openedOn || 0) - new Date(b.jobCreatedOn || b.openedOn || 0));
  } else {
    filtered.sort((a, b) => new Date(b.jobCreatedOn || b.openedOn || 0) - new Date(a.jobCreatedOn || a.openedOn || 0));
  }

  renderAreaModalRows(filtered);
}

function toggleAreaFilterSidebar(open) {
  const sidebar = document.getElementById("areaFilterSidebar");
  const backdrop = document.getElementById("areaFilterBackdrop");
  if (!sidebar || !backdrop) return;
  const isOpen = !sidebar.classList.contains("translate-x-full");
  const target = (open !== undefined) ? open : !isOpen;
  if (target) {
    sidebar.classList.remove("translate-x-full");
    backdrop.classList.remove("opacity-0", "pointer-events-none");
    backdrop.classList.add("opacity-100");
  } else {
    sidebar.classList.add("translate-x-full");
    backdrop.classList.remove("opacity-100");
    backdrop.classList.add("opacity-0", "pointer-events-none");
  }
}

function applyAreaModalFilters() {
  filterAreaModalJobs();
  toggleAreaFilterSidebar(false);
}

function resetAreaModalFilters() {
  ["areaFilterStatus", "areaFilterPriority", "areaFilterAssignedTo", "areaFilterCreatedBy", "areaFilterFromDate", "areaFilterToDate"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  filterAreaModalJobs();
  toggleAreaFilterSidebar(false);
}

function populateAreaModalFilterDropdowns(jobs) {
  const list = jobs || currentAreaModalJobs || [];
  const areaSelect = document.getElementById("areaFilterArea");
  if (areaSelect) {
    const curVal = areaSelect.value;
    const areas = [...new Set(list.map(j => j.areaName || j.AreaName || j.area || j.Area || j.jobLocation || j.location))].filter(Boolean).sort();
    areaSelect.innerHTML = '<option value="">Area: All</option>';
    areas.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      areaSelect.appendChild(opt);
    });
    if (curVal) areaSelect.value = curVal;
  }

  const createdBySelect = document.getElementById("areaFilterCreatedBy");
  if (createdBySelect) {
    const curVal = createdBySelect.value;
    const creators = [...new Set(list.map(j => j.createdBy || (j.firstname ? `${j.firstname} ${j.lastname || ''}`.trim() : "")))].filter(Boolean).sort();
    createdBySelect.innerHTML = '<option value="">Created By: All</option>';
    creators.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      createdBySelect.appendChild(opt);
    });
    if (curVal) createdBySelect.value = curVal;
  }
}

window.toggleAreaFilterSidebar = toggleAreaFilterSidebar;
window.applyAreaModalFilters = applyAreaModalFilters;
window.resetAreaModalFilters = resetAreaModalFilters;
window.filterAreaModalJobs = filterAreaModalJobs;
window.populateAreaModalFilterDropdowns = populateAreaModalFilterDropdowns;








function renderAreaModalRows(jobs) {







  const tbody = document.getElementById("areaModalTableBody");







  if (!tbody) return;







  const isGuestVillaArea = /villa/i.test(String(currentAreaModalName || "")) && !String(currentAreaModalName || "").toLowerCase().includes("all areas");
  const villaHeader = document.getElementById("areaModalVillaHeader");
  if (villaHeader) {
    if (isGuestVillaArea) {
      villaHeader.classList.remove("hidden");
    } else {
      villaHeader.classList.add("hidden");
    }
  }

  if (!jobs || jobs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="${isGuestVillaArea ? 12 : 11}" class="py-12 text-center text-slate-400 text-xs">
          <i class="fa-regular fa-folder-open text-2xl text-slate-300 mb-2 block"></i>
          <span>No jobs found for this selection.</span>
        </td>
      </tr>
    `;
    return;
  }

  const sortedJobs = [...jobs].sort((a, b) => {







    const timeA = (a.jobCreatedOn || a.openedOn) ? new Date(a.jobCreatedOn || a.openedOn).getTime() : 0;







    const timeB = (b.jobCreatedOn || b.openedOn) ? new Date(b.jobCreatedOn || b.openedOn).getTime() : 0;







    if (isNaN(timeA) && isNaN(timeB)) return 0;







    if (isNaN(timeA)) return 1;







    if (isNaN(timeB)) return -1;







    if (timeA !== timeB) {
      return currentAreaModalSortOrder === "asc" ? timeA - timeB : timeB - timeA;
    }
    const idA = String(a.jobId || a.rawId || a.id || a.orgjobId || "");
    const idB = String(b.jobId || b.rawId || b.id || b.orgjobId || "");
    return idB.localeCompare(idA, undefined, { numeric: true, sensitivity: 'base' });







  });







  tbody.innerHTML = sortedJobs.map(rawJob => {
    const j = normalizeJobObject(rawJob);
    const displayId = j.orgjobId || j.jobId;
    const rawId = j.jobId || j.orgjobId;
    const normStatus = normalizeStatusString(j.jobStatus || j.status);
    const normPriority = normalizePriorityString(j.priority);

    let statusCls = "badge-in-progress";
    if (normStatus === "Yet to Commence") statusCls = "badge-yet-to-commence";
    else if (normStatus === "Under Discussion") statusCls = "badge-under-discussion";
    else if (normStatus === "Closed") statusCls = "badge-closed";
    else if (normStatus === "Completed") statusCls = "badge-completed bg-emerald-100 text-emerald-800 border border-emerald-300";
    else if (normStatus === "Fixed") statusCls = "badge-open";

    let priorityCls = "badge-priority-medium";
    if (normPriority.toLowerCase() === "high") priorityCls = "badge-priority-high";
    else if (normPriority.toLowerCase() === "low") priorityCls = "badge-priority-low";
    else if (normPriority.toLowerCase() === "safety") priorityCls = "badge-priority-safety";

    let assignedText = "Unassigned";
    if (Array.isArray(j.data1) && j.data1.length > 0) {
      assignedText = j.data1.map(t => t.teamName || t.name || t).join(", ");
    } else if (j.assignedTo) {
      assignedText = j.assignedTo;
    }

    const attachmentsCount = j.uploadCount !== undefined ? j.uploadCount : (Array.isArray(j.imageUploads) ? j.imageUploads.length : 0);
    const commentsCount = j.commentCount !== undefined ? j.commentCount : (Array.isArray(j.comments) ? j.comments.length : 0);
    const detailText = j.jobDetail || j.details || j.title || "";
    const displayAreaName = j.areaName || j.area || (currentAreaModalName ? currentAreaModalName.replace(/\s*(Open|Safety|\(.*?\))\s*$/i, '').trim() : '-');

    return `
      <tr class="hover:bg-blue-50/40 transition-colors cursor-pointer" data-job-id="${escapeHtml(rawId)}" data-display-id="${escapeHtml(displayId)}" data-area-id="${escapeHtml(j.areaID || j.areaId || "")}">
        <!-- 1. Job ID -->
        <td>
          <a href="job-details.html?id=${encodeURIComponent(rawId)}" target="_blank" class="font-bold text-blue-600 hover:underline hover:text-blue-800" title="Open Job ${displayId}">
            ${displayId}
          </a>
        </td>

        <!-- 2. Job Details (Interactive Hover Preview Card) -->
        <td class="max-w-[260px] relative group text-slate-700 font-medium whitespace-nowrap">
          <div class="cursor-help flex items-center gap-1.5 overflow-hidden whitespace-nowrap min-w-0" title="${escapeHtml(stripHtmlToPlain(detailText))}">
            <span class="truncate block max-w-[210px] whitespace-nowrap overflow-hidden">${getFirstLinePreview(detailText, 38)}</span>
            <i class="fa-solid fa-circle-info text-[10px] text-slate-400 group-hover:text-blue-500 shrink-0"></i>
          </div>
          <!-- Hover Details Card -->
          <div class="hidden group-hover:block absolute left-4 top-full mt-1 w-80 sm:w-96 max-w-sm p-3.5 bg-slate-900/95 backdrop-blur text-white text-xs rounded-xl shadow-2xl z-50 pointer-events-none transition-all duration-200 border border-slate-700 whitespace-normal break-words overflow-hidden">
            <div class="flex items-center justify-between border-b border-slate-700/80 pb-1.5 mb-2">
              <span class="font-bold text-blue-400 flex items-center gap-1.5 text-[11px]"><i class="fa-solid fa-file-lines"></i> Job Details Preview</span>
              <span class="text-[10px] text-slate-400">${displayId}</span>
            </div>
            <p class="whitespace-pre-wrap break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:break-words [&_*]:[overflow-wrap:anywhere] leading-relaxed text-slate-200 text-xs">${renderRichText(detailText)}</p>
            <div class="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
              <span>Area: <b class="text-slate-200">${escapeHtml(displayAreaName)}</b></span>
              <span>Location: <b class="text-slate-200">${escapeHtml(j.jobLocation || j.location || 'N/A')}</b></span>
            </div>
          </div>
        </td>

        <!-- 3. Area -->
        <td class="text-slate-700 font-medium">
          ${escapeHtml(displayAreaName)}
        </td>

        <!-- 4. Location -->
        <td class="text-slate-600">${j.jobLocation || j.location || '<span class="text-slate-300">-</span>'}</td>

        <!-- 5. Priority -->
        <td>
          <span class="badge-priority ${priorityCls}">${normPriority}</span>
        </td>

        <!-- 6. Status -->
        <td>
          <span class="badge-status ${statusCls}">${normStatus}</span>
        </td>

        <!-- 7. Assigned To -->
        <td class="text-slate-700 whitespace-nowrap">
          <div class="flex items-center gap-1.5">
            <span class="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[9px] font-bold">
              ${(assignedText || "IT").slice(0, 2).toUpperCase()}
            </span>
            <span>${assignedText}</span>
          </div>
        </td>

        <!-- 8. Villa (Guest Villa only) -->
        ${isGuestVillaArea ? `
        <td class="font-semibold text-slate-800">
          ${(j.villaNumber && j.villaNumber !== '-' && j.villaNumber !== 'null') ? j.villaNumber : '<span class="text-slate-300">-</span>'}
        </td>
        ` : ''}

        <!-- 9. Created Date -->
        <td class="text-slate-500">${formatDateStr(j.jobCreatedOn || j.openedOn)}</td>

        <!-- 10. Attachment -->
        <td class="text-center font-semibold text-slate-600">
          <span class="inline-flex items-center gap-1"><i class="fa-regular fa-image text-blue-500"></i> ${attachmentsCount}</span>
        </td>

        <!-- 11. Comment -->
        <td class="text-center font-semibold text-slate-600">
          <span class="inline-flex items-center gap-1"><i class="fa-regular fa-comment text-slate-400"></i> ${commentsCount}</span>
        </td>

        <!-- 12. Action -->
        <td class="text-right">
          <div class="relative inline-block text-left dropdown-group">
            <button type="button" class="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer" onclick="toggleRowMenu(this)">
              <i class="fa-solid fa-ellipsis"></i>
            </button>
            <div class="hidden absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-40 text-xs text-slate-700 dropdown-menu">
              <a href="job-details.html?id=${encodeURIComponent(rawId)}" target="_blank" class="flex items-center px-3 py-2 hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium transition-colors">
                <i class="fa-regular fa-eye mr-2 text-blue-600"></i> View Details
              </a>
              <a href="job-update.html?id=${encodeURIComponent(rawId)}" target="_blank" class="flex items-center px-3 py-2 hover:bg-amber-50 text-slate-700 hover:text-amber-700 font-medium transition-colors">
                <i class="fa-solid fa-pen-to-square mr-2 text-amber-600"></i> Update Job
              </a>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join("");







  if (typeof restoreTableRowHighlight === "function") {







    restoreTableRowHighlight(tbody);







  }







}







function initAreaModalCloseListeners() {







  const modal = document.getElementById("areaJobsModal");







  const closeBtn = document.getElementById("closeAreaModalBtn");







  const closeBtnBottom = document.getElementById("closeAreaModalBtnBottom");







  function closeAreaModal() {







    if (modal) modal.classList.remove("open");







    sessionStorage.removeItem("ww_last_area_modal");







  }







  if (closeBtn) closeBtn.onclick = closeAreaModal;







  if (closeBtnBottom) closeBtnBottom.onclick = closeAreaModal;







  if (modal) {







    modal.onclick = function (e) {







      if (e.target === modal) closeAreaModal();







    };







  }







  document.addEventListener("keydown", function (e) {







    if (e.key === "Escape") closeAreaModal();







  });







}







function normalizeStatusString(st) {







  if (!st) return "Yet to Commence";







  const s = String(st).toUpperCase();







  if (s.includes("YET") || s.includes("COMMENCE")) return "Yet to Commence";







  if (s.includes("PROGRESS")) return "In Progress";







  if (s.includes("DISCUSSION")) return "Under Discussion";







  if (s.includes("SPARES") || s.includes("ORDER")) return "Spares on Order";







  if (s.includes("FIX")) return "Fixed";







  if (s.includes("CLOSE")) return "Closed";
  if (s.includes("COMPLET")) return "Completed";







  return st;







}







function normalizePriorityString(p) {







  if (!p) return "Medium";







  const s = String(p).toUpperCase();







  if (s.includes("HIGH")) return "High";







  if (s.includes("LOW")) return "Low";







  if (s.includes("SAFETY")) return "Safety";







  return "Medium";







}







function formatDateStr(dateStr) {







  if (!dateStr || dateStr.startsWith("0001")) return '<span class="text-slate-300">-</span>';







  try {







    const d = new Date(dateStr);







    if (isNaN(d.getTime())) return dateStr;







    const day = String(d.getDate()).padStart(2, '0');







    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];







    const month = months[d.getMonth()];







    const year = d.getFullYear();







    return `${day} ${month} ${year}`;







  } catch (e) {







    return dateStr;







  }







}







// Point 11: Toggle Date Sort in Area Modal







function toggleAreaModalDateSort() {
  currentAreaModalSortOrder = currentAreaModalSortOrder === "asc" ? "desc" : "asc";
  const icon = document.getElementById("areaModalSortIcon");
  if (icon) {
    icon.className = currentAreaModalSortOrder === "asc" 
      ? "fa-solid fa-arrow-up-short-wide ml-1 text-blue-600" 
      : "fa-solid fa-arrow-down-short-wide ml-1 text-blue-600";
  }
  filterAreaModalJobs();
}







window.toggleAreaModalDateSort = toggleAreaModalDateSort;







// Point 4: Export Area Jobs to CSV with Details







function formatDetailForExport(val) {







  if (val === null || val === undefined) return '""';







  let s = String(val);







  s = s.replace(/<br\s*[\/]?>/gi, "\n")







       .replace(/<\/p>/gi, "\n")







       .replace(/<p[^>]*>/gi, "")







       .replace(/<\/div>/gi, "\n")







       .replace(/<div[^>]*>/gi, "")







       .replace(/<li[^>]*>/gi, "• ")







       .replace(/<\/li>/gi, "\n")







       .replace(/<[^>]+>/g, "");







  s = s.replace(/&nbsp;/gi, " ")







       .replace(/&amp;/gi, "&")







       .replace(/&lt;/gi, "<")







       .replace(/&gt;/gi, ">")







       .replace(/&quot;/gi, '"')







       .replace(/&#39;/gi, "'");







  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");







  const lines = s.split("\n").map(l => l.trimEnd());







  s = lines.join("\r\n").trim();







  return `"${s.replace(/"/g, '""')}"`;







}







function exportAreaJobsToCSV() {
  if (!currentAreaModalJobs || currentAreaModalJobs.length === 0) {
    if (typeof showToast === "function") showToast("No jobs to export.", "error");
    else alert("No jobs to export.");
    return;
  }

  const isGuestVillaArea = /villa/i.test(String(currentAreaModalName || "")) && !String(currentAreaModalName || "").toLowerCase().includes("all areas");
  const headers = [
    "Job ID",
    "Job Details",
    "Area",
    "Location",
    "Priority",
    "Status",
    "Assigned To",
    ...(isGuestVillaArea ? ["Villa"] : []),
    "Create Date",
    "Attachments",
    "Comments",
    "Ref No",
    "Closed Date",
    "Created By",
    "Property",
    "Expected Completion Date"
  ];

  const rows = currentAreaModalJobs.map(rawJob => {
    const j = normalizeJobObject(rawJob);
    const displayId = j.orgjobId || j.jobId;
    const detailText = formatDetailForExport(j.jobDetail || j.details);
    const displayAreaName = j.areaName || j.area || (currentAreaModalName ? currentAreaModalName.replace(/\s*(Open|Safety|\(.*?\))\s*$/i, '').trim() : '-');

    let assigned = "Unassigned";
    if (Array.isArray(j.data1) && j.data1.length > 0) {
      assigned = j.data1.map(t => {
        if (typeof t === "string") return t;
        if (typeof t === "object" && t !== null) {
          return t.teamName || t.name || t.team_name || t.assignedTeam || t.team || t.title || "";
        }
        return String(t || "");
      }).filter(Boolean).join(", ") || "Unassigned";
    } else if (j.assignedTo) {
      assigned = j.assignedTo;
    }

    const createdBy = (j.createdBy && j.createdBy !== "-" && j.createdBy !== "null" && j.createdBy !== "undefined")
      ? j.createdBy
      : (`${j.firstname || ""} ${j.lastname || ""}`.trim() || j.userId || "-");

    const row = [
      `"${displayId}"`,
      detailText,
      `"${displayAreaName.replace(/"/g, '""')}"`,
      `"${(j.jobLocation || j.location || "-").replace(/"/g, '""')}"`,
      `"${j.priority || "MEDIUM"}"`,
      `"${j.jobStatus || j.status || "-"}"`,
      `"${assigned.replace(/"/g, '""')}"`
    ];

    if (isGuestVillaArea) {
      row.push(`"${j.villaNumber || "-"}"`);
    }

    row.push(
      `"${j.jobCreatedOn || j.openedOn || "-"}"`,
      `"${j.uploadCount !== undefined ? j.uploadCount : (Array.isArray(j.imageUploads) ? j.imageUploads.length : 0)}"`,
      `"${j.commentCount !== undefined ? j.commentCount : (Array.isArray(j.comments) ? j.comments.length : 0)}"`,
      `"${j.refNum || j.refNo || "-"}"`,
      `"${j.jobCloseOn || j.closeDate || "-"}"`,
      `"${createdBy.replace(/"/g, '""')}"`,
      `"${(j.propName || (typeof WorkWizeAPI !== "undefined" ? WorkWizeAPI.getCurrentPropertyName() : "") || "-").replace(/"/g, '""')}"`,
      `"${j.expectedCompletion || "-"}"`
    );

    return row;
  });

  const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });







  const url = URL.createObjectURL(blob);







  const link = document.createElement("a");







  link.setAttribute("href", url);







  const fileName = (currentAreaModalName ? currentAreaModalName.replace(/\s+/g, '_') : 'Area') + `_Jobs_${new Date().toISOString().split("T")[0]}.csv`;







  link.setAttribute("download", fileName);







  document.body.appendChild(link);







  link.click();







  document.body.removeChild(link);







  setTimeout(() => URL.revokeObjectURL(url), 1000);







  if (typeof showToast === "function") {







    showToast(`Exported ${currentAreaModalJobs.length} jobs to CSV.`, "success");







  }







}







window.exportAreaJobsToCSV = exportAreaJobsToCSV;







// Export all modal openers to window







window.showAreaJobsModal = showAreaJobsModal;







window.showAreaOpenJobsModal = showAreaOpenJobsModal;







window.showAreaJobsByDateModal = showAreaJobsByDateModal;







window.showAreaSafetyJobsModal = showAreaSafetyJobsModal;







window.showPropertyAllJobsModal = showPropertyAllJobsModal;







window.showPropertyOpenJobsModal = showPropertyOpenJobsModal;







window.showPropertyClosedJobsModal = showPropertyClosedJobsModal;







window.showPropertySafetyJobsModal = showPropertySafetyJobsModal;







window.toggleRowMenu = toggleRowMenu;







window.loadPropertyJobsCache = loadPropertyJobsCache;







window.initJobsByArea = initJobsByArea;







window.renderJobsByAreaTable = renderJobsByAreaTable;







