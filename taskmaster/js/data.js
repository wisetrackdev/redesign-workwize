/**
 * WorkWize Data Store & LocalStorage Manager
 */

const INITIAL_JOBS = [];

const INITIAL_AREAS = [];

const WorkWizeDB = {
  getJobs: function() {
    const data = localStorage.getItem("workwize_jobs");
    if (!data) return [];
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.some(j => j && (j.id === "Tes-313026-10738" || j.id === "Tes-221026-88828"))) {
        localStorage.removeItem("workwize_jobs");
        return [];
      }
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  },

  saveJobs: function(jobs) {
    localStorage.setItem("workwize_jobs", JSON.stringify(jobs));
  },

  addJob: function(job) {
    const jobs = this.getJobs();
    jobs.unshift(job);
    this.saveJobs(jobs);
    return job;
  },

  getJobById: function(id) {
    if (!id) return null;
    const jobs = this.getJobs();
    const strId = String(id).toLowerCase();
    return jobs.find(j => j && j.id && String(j.id).toLowerCase() === strId);
  },

  updateJob: function(id, updatedFields) {
    if (!id) return null;
    const jobs = this.getJobs();
    const strId = String(id).toLowerCase();
    const index = jobs.findIndex(j => j && j.id && String(j.id).toLowerCase() === strId);
    if (index !== -1) {
      jobs[index] = { ...jobs[index], ...updatedFields };
      this.saveJobs(jobs);
      return jobs[index];
    }
    return null;
  },

  deleteJob: function(id) {
    if (!id) return false;
    let jobs = this.getJobs();
    const strId = String(id).toLowerCase();
    jobs = jobs.filter(j => !(j && j.id && String(j.id).toLowerCase() === strId));
    this.saveJobs(jobs);
    return true;
  },

  getStats: function() {
    const jobs = this.getJobs();
    const totalJobs = jobs.length;
    const closedCount = jobs.filter(j => j.status === "Closed").length;
    const openCount = jobs.filter(j => j.status !== "Closed").length;
    const safetyCount = jobs.reduce((acc, curr) => acc + (curr.safetyIssues || 0), 0);

    return {
      total: totalJobs,
      open: openCount,
      closed: closedCount,
      safety: safetyCount,
      openPercentage: totalJobs ? Math.round((openCount / totalJobs) * 100) : 0,
      closedPercentage: totalJobs ? Math.round((closedCount / totalJobs) * 100) : 0,
      safetyPercentage: 0
    };
  },

  getAreasSummary: function() {
    return [];
  }
};

window.WorkWizeDB = WorkWizeDB;
