/**
 * WorkWize TaskMaster API Service
 * Mirrors endpoints from OPRO-FRONTEND/taskmaster & backend controllerss
 */

const WorkWizeAPI = (function () {
  // Primary API domain (from webessential/domain.js)
  const DEFAULT_DOMAIN = "https://oprofase2.workarya.com/";
  const LOCAL_DOMAIN = "https://localhost:7151/";

  function getBaseUrl() {
    return localStorage.getItem("workwize_api_domain") || DEFAULT_DOMAIN;
  }

  function setBaseUrl(url) {
    localStorage.setItem("workwize_api_domain", url);
  }

  // Auth & Token management
  function getStoredUserData() {
    try {
      const stored = localStorage.getItem("oproUserData");
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  function getStoredJwt() {
    const data = getStoredUserData();
    return data && data.jwt ? data.jwt : "";
  }

  function isMultiPropertyUser(userData) {
    const u = userData || getStoredUserData();
    if (!u) return false;
    let roles = u.role || [];
    if (!Array.isArray(roles)) roles = [roles];
    const upperRoles = roles.map(r => String(r).toUpperCase().replace(/\s+/g, "").trim());
    const desg = String(u.desg || "").toUpperCase().replace(/\s+/g, "").trim();
    const dept = String(u.department || "").toUpperCase().replace(/\s+/g, "").trim();
    const adminKeywords = ["SUPERADMIN", "ADMIN", "OPROADMIN"];
    return upperRoles.some(r => adminKeywords.includes(r)) || adminKeywords.includes(desg) || adminKeywords.includes(dept);
  }

  function getCurrentProperty() {
    const userData = getStoredUserData();
    const isMulti = isMultiPropertyUser(userData);

    // If regular user (non-admin), strictly lock property to user's assigned prop
    if (!isMulti && userData && userData.prop) {
      return userData.prop;
    }

    const fromStorage = localStorage.getItem("workwize_current_property");
    if (fromStorage) return fromStorage;

    if (userData && userData.prop) return userData.prop;

    return "PROP-001"; // Fallback default
  }

  function setCurrentProperty(propId, propName) {
    const userData = getStoredUserData();
    const isMulti = isMultiPropertyUser(userData);

    // If regular user (non-admin), do not allow switching away from assigned property
    if (!isMulti && userData && userData.prop && String(propId).toLowerCase() !== String(userData.prop).toLowerCase()) {
      console.warn("User is restricted to assigned property:", userData.prop);
      return;
    }

    localStorage.setItem("workwize_current_property", propId);
    if (propName) {
      localStorage.setItem("workwize_current_property_name", propName);
    }
    window.dispatchEvent(new CustomEvent("workwize:propertyChanged", { detail: { propId, propName } }));
  }

  function getCurrentPropertyName() {
    return localStorage.getItem("workwize_current_property_name") || "Main Facility";
  }

  function parseJwt(token) {
    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split("")
          .map(c => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.warn("Could not parse JWT token:", e);
      return {};
    }
  }

  function isLoggedIn() {
    const token = getStoredJwt();
    return !!token && token.length > 10;
  }

  function logout() {
    localStorage.removeItem("oproUserData");
    localStorage.removeItem("workwize_authenticated_user");
    window.location.href = "login.html";
  }

  // Base HTTP Request Wrapper
  async function request(endpoint, options = {}) {
    const baseUrl = getBaseUrl();
    const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${endpoint.replace(/^\//, "")}`;

    const headers = options.headers || {};
    const jwt = getStoredJwt();

    if (jwt && !headers["Authorization"]) {
      headers["Authorization"] = `Bearer ${jwt}`;
    }

    const config = {
      method: options.method || "GET",
      headers: headers,
      ...options
    };

    // If body is FormData, don't set Content-Type header (browser sets boundary)
    if (config.body instanceof FormData) {
      delete headers["Content-Type"];
    } else if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);

      if (response.status === 401) {
        console.warn("Session expired or Unauthorized (401)");
        // Trigger unauthorized event without force-killing if on demo
        window.dispatchEvent(new CustomEvent("workwize:unauthorized"));
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP Error ${response.status}`);
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }
      return await response.text();
    } catch (error) {
      console.error(`API Request to ${url} failed:`, error.message);
      throw error;
    }
  }

  // ==========================================
  // Public API Endpoints
  // ==========================================

  // 1. Authentication (api/login)
  async function login(email, password, app = "taskmaster") {
    const payload = {
      Email: email,
      Password: password,
      App: app
    };

    const res = await request("api/login", {
      method: "POST",
      body: payload
    });

    if (res && res.token) {
      const token = res.token;
      const claims = parseJwt(token);

      const name = claims.name || claims.FirstName || (claims["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"]) || email.split("@")[0];
      const userEmail = claims.email || claims.UserEmail || email;
      let roles = claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"] || claims.role || ["STAFF"];
      if (!Array.isArray(roles)) roles = [roles];

      let access = {};
      try {
        if (claims.Access) access = JSON.parse(claims.Access);
      } catch (e) {}

      const updatedUserData = {
        username: email,
        jwt: token,
        name: name,
        email: userEmail,
        role: roles,
        prop: claims.PrimaryProp || "",
        desg: (claims.Designation && claims.Designation !== "NA") ? claims.Designation : "",
        access: access
      };

      localStorage.setItem("oproUserData", JSON.stringify(updatedUserData));

      // Reset stored property on login so new user's assigned property is used
      if (updatedUserData.prop) {
        setCurrentProperty(updatedUserData.prop);
      } else {
        localStorage.removeItem("workwize_current_property");
        localStorage.removeItem("workwize_current_property_name");
      }

      return { success: true, user: updatedUserData };
    }

    throw new Error("Invalid response from login server");
  }

  // 2. Properties (api/jobtracker/getallproperty)
  // Mirrors OPRO-FRONTEND role condition:
  // - SUPERADMIN, ADMIN, OPROADMIN can see and switch to all properties
  // - Regular users can only see their assigned property (userData.prop)
  async function getAllProperties(ignoreRole = false) {
    const allProps = await request("api/jobtracker/getallproperty", { method: "GET" });
    if (!Array.isArray(allProps)) return [];

    if (ignoreRole) return allProps;

    const userData = getStoredUserData();
    if (isMultiPropertyUser(userData)) {
      return allProps;
    }

    // Regular non-admin user: filter to only their assigned property from login (userData.prop)
    const userPropId = userData ? (userData.prop || "").trim() : "";
    if (!userPropId) return allProps;

    const matched = allProps.filter(p => String(p.propId).toLowerCase() === userPropId.toLowerCase());
    if (matched.length > 0) {
      localStorage.setItem("workwize_current_property", matched[0].propId);
      localStorage.setItem("workwize_current_property_name", matched[0].propName);
      return matched;
    }

    // Fallback if property ID was not in returned array
    const storedName = getCurrentPropertyName() || userPropId;
    return [{ propId: userPropId, propName: storedName }];
  }

  // 3. Job Overview by Property (api/jobtracker/getjoboverview)
  async function getJobOverview(propId) {
    const pId = propId || getCurrentProperty();
    const form = new FormData();
    form.append("propId", pId);

    return await request("api/jobtracker/getjoboverview", {
      method: "POST",
      body: form
    });
  }

  // 4. Property Info & Dropdown Data (api/jobtracker/getpropinfo)
  async function getPropertyInfo(propId) {
    const pId = propId || getCurrentProperty();
    const form = new FormData();
    form.append("propId", pId);

    return await request("api/jobtracker/getpropinfo", {
      method: "POST",
      body: form
    });
  }

  // 5. All Jobs for Property (api/jobtracker/getpropertyjobs)
  async function getPropertyJobs(propId) {
    const pId = propId || getCurrentProperty();
    const form = new FormData();
    form.append("propId", pId);

    return await request("api/jobtracker/getpropertyjobs", {
      method: "POST",
      body: form
    });
  }

  // 6. Area-Specific Jobs (api/jobtracker/getareajobs)
  async function getAreaJobs(areaId, propId) {
    const pId = propId || getCurrentProperty();
    const form = new FormData();
    form.append("propId", pId);
    form.append("areaID", areaId);

    return await request("api/jobtracker/getareajobs", {
      method: "POST",
      body: form
    });
  }

  // 7. Area Jobs Filtered by Date (api/jobtracker/getareajobsbydate)
  async function getAreaJobsByDate(areaId, dateSpan, propId) {
    const pId = propId || getCurrentProperty();
    const form = new FormData();
    form.append("propID", pId);
    form.append("areaID", areaId);
    form.append("dateID", dateSpan); // 'd30', 'd60', 'd90'

    return await request("api/jobtracker/getareajobsbydate", {
      method: "POST",
      body: form
    });
  }

  // 8. Closed Jobs (api/jobtracker/getclosedjobs)
  async function getClosedJobs(propId) {
    const pId = propId || getCurrentProperty();
    const form = new FormData();
    form.append("propID", pId);

    return await request("api/jobtracker/getclosedjobs", {
      method: "POST",
      body: form
    });
  }

  // 9. Single Job by ID (api/jobtracker/getjobbyid)
  async function getJobById(jobId) {
    const form = new FormData();
    form.append("jobId", jobId);

    return await request("api/jobtracker/getjobbyid", {
      method: "POST",
      body: form
    });
  }

  // 10. Create New Job (api/jobtracker/addnewjob)
  async function addNewJob(formData) {
    // Ensure propId is present
    if (!formData.get("propId")) {
      formData.append("propId", getCurrentProperty());
    }

    return await request("api/jobtracker/addnewjob", {
      method: "POST",
      body: formData
    });
  }

  // 11. Add Comment to Job (api/jobtracker/addcomment)
  async function addComment(jobIdOrFormData, commentDetail, files) {
    let form;
    if (jobIdOrFormData instanceof FormData) {
      form = jobIdOrFormData;
    } else {
      form = new FormData();
      form.append("jobId", jobIdOrFormData);
      form.append("commentDetail", commentDetail || "");
      if (files) {
        if (Array.isArray(files) || files instanceof FileList) {
          for (let i = 0; i < files.length; i++) {
            form.append("commentMedia", files[i]);
          }
        } else {
          form.append("commentMedia", files);
        }
      }
    }

    return await request("api/jobtracker/addcomment", {
      method: "POST",
      body: form
    });
  }

  // 12. Update Job Fields (api/jobtracker/updatejobfields)
  async function updateJobFields(formDataOrObj) {
    let form;
    if (formDataOrObj instanceof FormData) {
      form = formDataOrObj;
    } else {
      form = new FormData();
      const propId = formDataOrObj.propID || formDataOrObj.propId || getCurrentProperty();
      const jobId = formDataOrObj.jobID || formDataOrObj.jobId;
      if (propId) form.append("propID", propId);
      if (jobId) form.append("jobID", jobId);
      if (formDataOrObj.field) form.append("field", formDataOrObj.field);
      if (formDataOrObj.data !== undefined) form.append("data", formDataOrObj.data);
      if (formDataOrObj.villaNumber) form.append("villaNumber", formDataOrObj.villaNumber);
      if (formDataOrObj.ccf_dept) form.append("ccf_dept", formDataOrObj.ccf_dept);
    }

    return await request("api/jobtracker/updatejobfields", {
      method: "POST",
      body: form
    });
  }

  // 13. Update Job Full (api/jobtracker/updatejob)
  async function updateJob(formData) {
    return await request("api/jobtracker/updatejob", {
      method: "POST",
      body: formData
    });
  }

  // 14. Bulk Import Jobs (api/jobtracker/bulkimportjobs)
  async function bulkImportJobs(formDataOrPayload) {
    if (formDataOrPayload instanceof FormData) {
      return await request("api/jobtracker/bulkimportjobs", {
        method: "POST",
        body: formDataOrPayload
      });
    } else {
      const fd = new FormData();
      if (formDataOrPayload.propId) fd.append("propId", formDataOrPayload.propId);
      if (formDataOrPayload.propName) fd.append("propName", formDataOrPayload.propName);
      if (formDataOrPayload.jobs) fd.append("jobs", typeof formDataOrPayload.jobs === "string" ? formDataOrPayload.jobs : JSON.stringify(formDataOrPayload.jobs));
      if (formDataOrPayload.csvContent) fd.append("csvContent", formDataOrPayload.csvContent);
      return await request("api/jobtracker/bulkimportjobs", {
        method: "POST",
        body: fd
      });
    }
  }

  return {
    getBaseUrl,
    setBaseUrl,
    getStoredUserData,
    getStoredJwt,
    getCurrentProperty,
    setCurrentProperty,
    getCurrentPropertyName,
    isMultiPropertyUser,
    parseJwt,
    isLoggedIn,
    logout,
    request,
    login,
    getAllProperties,
    getJobOverview,
    getPropertyInfo,
    getPropertyJobs,
    getAreaJobs,
    getAreaJobsByDate,
    getClosedJobs,
    getJobById,
    addNewJob,
    addComment,
    updateJobFields,
    updateJob,
    bulkImportJobs
  };
})();

// Export globally for browser scripts
window.WorkWizeAPI = WorkWizeAPI;

// Central User Session Manager
const UserSession = {
  getUser: function () {
    return WorkWizeAPI.getStoredUserData();
  },
  isLoggedIn: function () {
    return !!this.getUser();
  },
  isMultiPropertyUser: function () {
    return WorkWizeAPI.isMultiPropertyUser(this.getUser());
  },
  getUserEmail: function () {
    const u = this.getUser();
    if (u && (u.email || u.username)) return u.email || u.username;
    return "admin@workwize.io";
  },
  getUserRole: function () {
    const u = this.getUser();
    if (u && u.desg) return u.desg;
    if (u && u.role) return Array.isArray(u.role) ? u.role[0] : u.role;
    const email = this.getUserEmail().toLowerCase();
    if (email.includes("admin")) return "Admin";
    if (email.includes("test")) return "Test";
    if (email.includes("manager")) return "Manager";
    return "Staff";
  },
  getUserRoles: function () {
    const u = this.getUser();
    if (!u) return ["STAFF"];
    let roles = u.role || [];
    if (!Array.isArray(roles)) roles = [roles];
    return roles.map(r => String(r).toUpperCase().trim());
  },
  isSuperAdminOrAdmin: function () {
    const roles = this.getUserRoles();
    const desg = (this.getUser()?.desg || "").toUpperCase();
    const email = this.getUserEmail().toLowerCase();
    const adminKeywords = ["SUPERADMIN", "SUPER ADMIN", "ADMIN", "OPROADMIN", "OPRO ADMIN", "SYSTEM ADMIN"];
    return roles.some(r => adminKeywords.includes(r.replace(/\s+/g, ""))) ||
           adminKeywords.some(k => desg.includes(k)) ||
           email.includes("admin") || email.includes("oproadmin");
  },
  getUserAccess: function () {
    const u = this.getUser();
    return (u && u.access && typeof u.access === "object") ? u.access : {};
  },
  canEditOwnerComment: function (jobData) {
    if (jobData && jobData.isActive === false) return false;
    // OPRO condition: Owner comments restricted strictly to OproAdmin, SuperAdmin, Admin
    if (!this.isSuperAdminOrAdmin()) return false;
    const access = this.getUserAccess();
    if (access && access["F02"] && access["F02"].write === false) return false;
    return true;
  },
  isFieldReadable: function (fieldCode, jobData) {
    const access = this.getUserAccess();
    if (access && fieldCode in access) {
      return access[fieldCode].read !== false;
    }
    return true;
  },
  isFieldWritable: function (fieldCode, jobData) {
    if (jobData && jobData.isActive === false) return false;
    const isAtmosphere = (this.getUserRole() || "").toUpperCase().includes("ATMOSPHERE");
    if (isAtmosphere) return false;

    // F02: Owner Comment
    if (fieldCode === "F02") {
      return this.canEditOwnerComment(jobData);
    }

    const access = this.getUserAccess();
    const isAdmin = this.isSuperAdminOrAdmin();

    // Check specific field code in UserAccess dictionary
    if (access && fieldCode in access) {
      if (access[fieldCode].write === true && access[fieldCode].read !== false) {
        return true;
      }
      return false;
    }

    // Default permissions when field code not in access dictionary:
    if (isAdmin) return true;

    if (fieldCode === "F04") {
      // Status: non-admin can edit if assigned to job
      if (!jobData) return false;
      const user = this.getUser();
      const userEmail = (user?.email || user?.userName || "").toLowerCase();
      if (Array.isArray(jobData.data1) && jobData.data1.some(m => (m.userid || m.userId || m.email || "").toLowerCase() === userEmail)) return true;
      if (Array.isArray(jobData.teams) && jobData.teams.some(m => (m.userid || m.userId || m.email || "").toLowerCase() === userEmail)) return true;
      return false;
    }

    // F03 Budget/CCF, F05 Assigned To, F06 Priority, F07 Final Expense: restricted to Admin unless granted
    if (["F03", "F05", "F06", "F07"].includes(fieldCode)) {
      return false;
    }

    // Core fields: location, area, villa, refNum, expectedDate, jobDetail
    if (fieldCode === "CORE") {
      return isAdmin;
    }

    if (fieldCode === "REMARKS") {
      return (jobData && jobData.isActive !== false);
    }

    return isAdmin;
  },
  getUserName: function () {
    const u = this.getUser();
    if (u && u.name) return u.name;
    const email = this.getUserEmail();
    const prefix = email.split("@")[0] || "Admin";
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
};

window.UserSession = UserSession;
