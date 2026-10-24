/**
 * WorkWize TaskMaster API Service
 * Mirrors endpoints from OPRO-FRONTEND/taskmaster & backend controllers
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

  function getCurrentProperty() {
    const fromStorage = localStorage.getItem("workwize_current_property");
    if (fromStorage) return fromStorage;

    const userData = getStoredUserData();
    if (userData && userData.prop) return userData.prop;

    return "PROP-001"; // Fallback default
  }

  function setCurrentProperty(propId, propName) {
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
        desg: claims.Designation || "Admin",
        access: access
      };

      localStorage.setItem("oproUserData", JSON.stringify(updatedUserData));

      if (updatedUserData.prop) {
        setCurrentProperty(updatedUserData.prop);
      }

      return { success: true, user: updatedUserData };
    }

    throw new Error("Invalid response from login server");
  }

  // 2. Properties (api/jobtracker/getallproperty)
  async function getAllProperties() {
    return await request("api/jobtracker/getallproperty", { method: "GET" });
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
  async function addComment(jobId, commentDetail) {
    const form = new FormData();
    form.append("jobId", jobId);
    form.append("commentDetail", commentDetail);

    return await request("api/jobtracker/addcomment", {
      method: "POST",
      body: form
    });
  }

  // 12. Update Job Fields (api/jobtracker/updatejobfields)
  async function updateJobFields(formData) {
    return await request("api/jobtracker/updatejobfields", {
      method: "POST",
      body: formData
    });
  }

  return {
    getBaseUrl,
    setBaseUrl,
    getStoredUserData,
    getStoredJwt,
    getCurrentProperty,
    setCurrentProperty,
    getCurrentPropertyName,
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
    updateJobFields
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
  getUserName: function () {
    const u = this.getUser();
    if (u && u.name) return u.name;
    const email = this.getUserEmail();
    const prefix = email.split("@")[0] || "Admin";
    return prefix.charAt(0).toUpperCase() + prefix.slice(1);
  }
};

window.UserSession = UserSession;
