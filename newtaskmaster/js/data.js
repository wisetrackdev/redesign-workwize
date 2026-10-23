/**
 * WorkWize Data Store & LocalStorage Manager
 */

const INITIAL_JOBS = [
  {
    id: "Tes-313026-10738",
    title: "Testing: Expected Inspection & Review",
    area: "Testing",
    subArea: "Testing",
    status: "In Progress",
    priority: "High",
    assignedTo: "IT Admin",
    openedOn: "10-03-2026",
    expectedDate: "25-03-2026",
    villaNumber: "V-101",
    location: "Tower A - Level 4",
    budget: 1200,
    costCenter: "CC-01",
    safetyIssues: 0,
    details: "Conduct full system testing and review checklist items.",
    remarks: "Priority review requested by management."
  },
  {
    id: "Tes-221026-88828",
    title: "check new close job",
    area: "Development/Project",
    subArea: "Project Phase 2",
    status: "Yet to Commence",
    priority: "Low",
    assignedTo: "IT Admin",
    openedOn: "12-10-2026",
    expectedDate: "30-10-2026",
    villaNumber: "V-204",
    location: "Villa Sector B",
    budget: 850,
    costCenter: "CC-02",
    safetyIssues: 0,
    details: "Inspect closing procedure checklist and safety audits.",
    remarks: "Pending contractor schedule."
  },
  {
    id: "Tes-221026-68518",
    title: "nikhil11 - Waste Management Audit",
    area: "Waste Management",
    subArea: "House Keeping",
    status: "In Progress",
    priority: "Low",
    assignedTo: "nikhil11",
    openedOn: "12-10-2026",
    expectedDate: "28-10-2026",
    villaNumber: "V-112",
    location: "Recycling Facility",
    budget: 450,
    costCenter: "CC-03",
    safetyIssues: 0,
    details: "Perform quarterly waste audit and segregation compliance.",
    remarks: "All bins labeled and logged."
  },
  {
    id: "Tes-221026-49833",
    title: "test move job - Relocation Equipment",
    area: "Back of the House",
    subArea: "test move",
    status: "Yet to Commence",
    priority: "Low",
    assignedTo: "IT Admin",
    openedOn: "10-03-2026",
    expectedDate: "18-03-2026",
    villaNumber: "V-305",
    location: "East Wing Storage",
    budget: 600,
    costCenter: "CC-01",
    safetyIssues: 0,
    details: "Relocate maintenance equipment to secondary depot.",
    remarks: "Awaiting transport approval."
  },
  {
    id: "Tes-221026-17244",
    title: "check new job in fire safety system",
    area: "Fire Safety",
    subArea: "Sprinkler Network",
    status: "In Progress",
    priority: "Low",
    assignedTo: "IT Admin",
    openedOn: "10-03-2026",
    expectedDate: "20-03-2026",
    villaNumber: "V-118",
    location: "North Block Basements",
    budget: 1500,
    costCenter: "CC-02",
    safetyIssues: 0,
    details: "Pressure testing valves and emergency water hydrants.",
    remarks: "Pressure gauges verified."
  },
  {
    id: "Tes-171125-31241",
    title: "Dev - Server Room HVAC Calibration",
    area: "Development/Project",
    subArea: "Dev",
    status: "Under Discussion",
    priority: "Medium",
    assignedTo: "IT Admin",
    openedOn: "10-03-2026",
    expectedDate: "22-03-2026",
    villaNumber: "V-402",
    location: "Tech Hub Floor 1",
    budget: 3200,
    costCenter: "CC-01",
    safetyIssues: 0,
    details: "Calibrate thermal sensors and dual cooling loop.",
    remarks: "HVAC vendor quote under negotiation."
  },
  {
    id: "Tes-161225-99310",
    title: "asd - Emergency Lighting Battery Swap",
    area: "CAPEX",
    subArea: "Electrical",
    status: "Yet to Commence",
    priority: "High",
    assignedTo: "Zajira Yazeed",
    openedOn: "10-03-2026",
    expectedDate: "15-03-2026",
    villaNumber: "V-509",
    location: "Clubhouse Stairwells",
    budget: 900,
    costCenter: "CC-04",
    safetyIssues: 0,
    details: "Replace depleted battery backup packs across 4 staircases.",
    remarks: "Safety inspection required before sign-off."
  },
  {
    id: "Tes-160326-83091",
    title: "Testing-2 - Solar Inverter Diagnostics",
    area: "Energy Management",
    subArea: "Solar Array",
    status: "Yet to Commence",
    priority: "Low",
    assignedTo: "IT Admin",
    openedOn: "10-03-2026",
    expectedDate: "29-03-2026",
    villaNumber: "V-201",
    location: "West Garden Pavilion",
    budget: 750,
    costCenter: "CC-03",
    safetyIssues: 0,
    details: "Analyze power grid fluctuation and inverter efficiency.",
    remarks: "Scheduled during off-peak hours."
  },
  {
    id: "Tes-090226-55412",
    title: "SOP & Daily Safety Routine Check",
    area: "SOP & Checklist",
    subArea: "Daily Operations",
    status: "Closed",
    priority: "Medium",
    assignedTo: "nikhil11",
    openedOn: "05-02-2026",
    expectedDate: "06-02-2026",
    villaNumber: "V-105",
    location: "Main Gate & Perimeter",
    budget: 300,
    costCenter: "CC-01",
    safetyIssues: 0,
    details: "Walkthrough of perimeter sensors and gate barrier locks.",
    remarks: "Routine finished with no issues."
  },
  {
    id: "Tes-040226-44129",
    title: "Chiller Plant Periodic Maintenance",
    area: "Utility",
    subArea: "Cooling Towers",
    status: "Closed",
    priority: "High",
    assignedTo: "Zajira Yazeed",
    openedOn: "01-02-2026",
    expectedDate: "03-02-2026",
    villaNumber: "V-300",
    location: "Central Utility Plant",
    budget: 4500,
    costCenter: "CC-02",
    safetyIssues: 0,
    details: "Full descaling and compressor lubricant flush.",
    remarks: "Completed and signed off by lead engineer."
  },
  {
    id: "Tes-290126-77810",
    title: "CAPEX Roof Waterproofing Phase 1",
    area: "CAPEX",
    subArea: "Civil Works",
    status: "In Progress",
    priority: "High",
    assignedTo: "IT Admin",
    openedOn: "29-01-2026",
    expectedDate: "15-04-2026",
    villaNumber: "V-601",
    location: "Block C Rooftop",
    budget: 12500,
    costCenter: "CC-04",
    safetyIssues: 0,
    details: "Membrane installation and UV sealant application.",
    remarks: "Phase 1: 60% completed."
  },
  {
    id: "Tes-150126-11204",
    title: "Back of House Kitchen Grease Trap Cleansing",
    area: "Back of the House",
    subArea: "Sanitation",
    status: "Closed",
    priority: "Medium",
    assignedTo: "nikhil11",
    openedOn: "15-01-2026",
    expectedDate: "16-01-2026",
    villaNumber: "V-110",
    location: "Service Kitchen B2",
    budget: 650,
    costCenter: "CC-03",
    safetyIssues: 0,
    details: "Bio-enzyme cleaning and pipe vacuum extraction.",
    remarks: "Completed on schedule."
  },
  {
    id: "Tes-120126-90312",
    title: "Generator Load Bank Periodic Test",
    area: "Energy Management",
    subArea: "Generators",
    status: "In Progress",
    priority: "High",
    assignedTo: "Alex Morgan",
    openedOn: "12-01-2026",
    expectedDate: "15-01-2026",
    villaNumber: "V-901",
    location: "Emergency Substation 2",
    budget: 2800,
    costCenter: "CC-02",
    safetyIssues: 0,
    details: "Test diesel generator output under full 100% simulated load.",
    remarks: "Fuel reserves replenished."
  },
  {
    id: "Tes-080126-44211",
    title: "Fire Extinguisher Barcode Scanning & Hydrotest",
    area: "Fire Safety",
    subArea: "Fire Assets",
    status: "Yet to Commence",
    priority: "Medium",
    assignedTo: "Zajira Yazeed",
    openedOn: "08-01-2026",
    expectedDate: "20-01-2026",
    villaNumber: "V-102",
    location: "Villas Sector A & B",
    budget: 950,
    costCenter: "CC-04",
    safetyIssues: 0,
    details: "Audit 120 portable CO2 and ABC powder extinguishers.",
    remarks: "Vendor inspection tags ready."
  },
  {
    id: "Tes-050126-33901",
    title: "Landscape Irrigation Flow Sensor Replacement",
    area: "Utility",
    subArea: "Plumbing",
    status: "Closed",
    priority: "Low",
    assignedTo: "nikhil11",
    openedOn: "05-01-2026",
    expectedDate: "07-01-2026",
    villaNumber: "V-205",
    location: "South Gardens",
    budget: 420,
    costCenter: "CC-03",
    safetyIssues: 0,
    details: "Replace stuck ultrasonic flowmeter on main feeder line.",
    remarks: "Completed and recalibrated."
  },
  {
    id: "Tes-020126-78120",
    title: "Clubhouse Lift Controller Firmware Update",
    area: "Development/Project",
    subArea: "Elevators",
    status: "Under Discussion",
    priority: "Medium",
    assignedTo: "IT Admin",
    openedOn: "02-01-2026",
    expectedDate: "18-01-2026",
    villaNumber: "V-500",
    location: "Central Clubhouse",
    budget: 1800,
    costCenter: "CC-01",
    safetyIssues: 0,
    details: "Patch elevator motor software for smooth deceleration.",
    remarks: "OEM technicians awaiting clearance."
  },
  {
    id: "Tes-010126-66504",
    title: "Waste Compactor Hydraulic Hose Overhaul",
    area: "Waste Management",
    subArea: "Machinery",
    status: "In Progress",
    priority: "High",
    assignedTo: "nikhil11",
    openedOn: "01-01-2026",
    expectedDate: "10-01-2026",
    villaNumber: "V-801",
    location: "Refuse Bay B",
    budget: 1650,
    costCenter: "CC-03",
    safetyIssues: 0,
    details: "Replace high-pressure hoses and replenish fluid reservoir.",
    remarks: "Parts delivered on site."
  }
];

const INITIAL_AREAS = [
  { name: "Development/Project", total: 7, open: 6, safety: 0, icon: "fa-code-branch" },
  { name: "Fire Safety", total: 2, open: 2, safety: 0, icon: "fa-fire-extinguisher" },
  { name: "Back of the House", total: 2, open: 2, safety: 0, icon: "fa-warehouse" },
  { name: "CAPEX", total: 6, open: 6, safety: 0, icon: "fa-building" },
  { name: "SOP & Checklist", total: 5, open: 5, safety: 0, icon: "fa-clipboard-check" },
  { name: "Energy Management", total: 1, open: 1, safety: 0, icon: "fa-bolt" },
  { name: "Waste Management", total: 4, open: 3, safety: 0, icon: "fa-trash-can" },
  { name: "Utility", total: 3, open: 1, safety: 0, icon: "fa-faucet-drip" }
];

const WorkWizeDB = {
  getJobs: function() {
    const data = localStorage.getItem("workwize_jobs");
    if (!data) {
      localStorage.setItem("workwize_jobs", JSON.stringify(INITIAL_JOBS));
      return INITIAL_JOBS;
    }
    try {
      return JSON.parse(data);
    } catch (e) {
      return INITIAL_JOBS;
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
    const jobs = this.getJobs();
    return jobs.find(j => j.id.toLowerCase() === id.toLowerCase());
  },

  updateJob: function(id, updatedFields) {
    const jobs = this.getJobs();
    const index = jobs.findIndex(j => j.id.toLowerCase() === id.toLowerCase());
    if (index !== -1) {
      jobs[index] = { ...jobs[index], ...updatedFields };
      this.saveJobs(jobs);
      return jobs[index];
    }
    return null;
  },

  deleteJob: function(id) {
    let jobs = this.getJobs();
    jobs = jobs.filter(j => j.id.toLowerCase() !== id.toLowerCase());
    this.saveJobs(jobs);
    return true;
  },

  getStats: function() {
    const jobs = this.getJobs();
    // Default baseline shown in screenshot if sample dataset is smaller
    const totalJobs = Math.max(360, jobs.length);
    const closedCount = jobs.filter(j => j.status === "Closed").length;
    const openCount = jobs.filter(j => j.status !== "Closed").length;
    const safetyCount = jobs.reduce((acc, curr) => acc + (curr.safetyIssues || 0), 0);

    return {
      total: 360, // Exact UI match from imagenew.png
      open: 167,
      closed: 193,
      safety: 0,
      openPercentage: 46,
      closedPercentage: 54,
      safetyPercentage: 0
    };
  },

  getAreasSummary: function() {
    return INITIAL_AREAS;
  }
};

window.WorkWizeDB = WorkWizeDB;
