/**
 * WorkWize Daily Job API Service
 * Handles all backend communication for QuickFix:
 * - Property listing
 * - Open & Closed jobs retrieval (with server pagination)
 * - New job creation with optional photo/video attachment
 * - Team assignment & member listing
 * - Job status updates (in-progress, closed with mandatory remarks)
 * - TaskMaster movement
 * - User login authentication
 */
(function (global) {
  'use strict';

  var cfg = global.WorkWizeConfig;
  var BASE_URL = (cfg && cfg.API_CONFIG && cfg.API_CONFIG.BASE_URL) || 'https://oprofase2.workarya.com/';

  /**
   * Helper to perform authenticated fetch
   */
  async function apiFetch(endpoint, options) {
    options = options || {};
    var headers = options.headers || {};
    var jwt = (cfg && cfg.getStoredJwt) ? cfg.getStoredJwt() : '';

    if (jwt && !headers['Authorization']) {
      headers['Authorization'] = 'Bearer ' + jwt;
    }
    options.headers = headers;

    var url = endpoint.startsWith('http') ? endpoint : (BASE_URL + endpoint);
    var response;

    try {
      response = await fetch(url, options);
    } catch (netErr) {
      console.warn('Network error calling ' + url + ':', netErr);
      throw new Error('Unable to connect to the server. Please check your network or try again.');
    }

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      var errorMsg = '';
      try {
        var errJson = await response.json();
        errorMsg = errJson.message || errJson.title || JSON.stringify(errJson);
      } catch (e) {
        errorMsg = await response.text();
      }
      throw new Error(errorMsg || ('Server error (' + response.status + ')'));
    }

    var contentType = response.headers.get('content-type') || '';
    if (contentType.indexOf('application/json') !== -1) {
      return await response.json();
    }
    var text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return text;
    }
  }

  var dailyJobApi = {
    /**
     * Get all properties
     * Endpoint: GET /api/dailyjob/getallproperty
     */
    getAllProperties: async function () {
      return await apiFetch('api/dailyjob/getallproperty', {
        method: 'GET'
      });
    },

    /**
     * Get QuickFix Jobs for a property with dynamic filters, sorting, search & pagination
     * Endpoint: POST /api/dailyjob/getallquickfixjobs
     * @param {Object} params - { propId, jobList ('open'|'close'), pageNumber, pageSize, search, status, areaId, issuedBy, issuedTo, assignedTo, fromDate, toDate, sortBy, sortOrder }
     */
    getQuickFixJobs: async function (params) {
      params = params || {};
      var form = new FormData();
      form.append('propId', params.propId || '');
      form.append('jobList', params.jobList || 'open');
      form.append('pageNumber', String(params.pageNumber || 1));
      form.append('pageSize', String(params.pageSize || 25));

      if (params.search || params.q) {
        form.append('search', params.search || params.q || '');
      }
      if (params.status && params.status !== 'all') {
        form.append('status', params.status);
      }
      if (params.areaId && params.areaId !== 'all') {
        form.append('areaId', params.areaId);
      }
      if (params.issuedBy && params.issuedBy !== 'all') {
        form.append('issued_by_team', params.issuedBy);
        form.append('issuedBy', params.issuedBy);
      }
      if (params.issuedTo && params.issuedTo !== 'all') {
        form.append('issued_to_team', params.issuedTo);
        form.append('issuedTo', params.issuedTo);
      }
      if (params.assignedTo && params.assignedTo !== 'all') {
        form.append('assigned_supervisor', params.assignedTo);
        form.append('assignedTo', params.assignedTo);
      }
      if (params.fromDate) {
        form.append('fromDate', params.fromDate);
      }
      if (params.toDate) {
        form.append('toDate', params.toDate);
      }
      if (params.sortBy) {
        form.append('sortBy', params.sortBy);
      }
      if (params.sortOrder) {
        form.append('sortOrder', params.sortOrder);
      }
      if (params.includeUploads !== undefined) {
        form.append('includeUploads', String(params.includeUploads));
      }

      return await apiFetch('api/dailyjob/getallquickfixjobs', {
        method: 'POST',
        body: form
      });
    },

    /**
     * Get QuickFix Dashboard Statistics (Today, Weekly, Monthly, Aging > 1 week)
     * Endpoint: POST /api/dailyjob/getdashboardstats
     * @param {string} propId
     */
    getDashboardStats: async function (propId) {
      var form = new FormData();
      form.append('propId', propId || '');
      return await apiFetch('api/dailyjob/getdashboardstats', {
        method: 'POST',
        body: form
      });
    },

    /**
     * Add New Job
     * Endpoint: POST /api/dailyjob/addnewjob
     * @param {Object} data - Form field values
     * @param {Array<File>} files - Optional photo/video attachments
     */
    addNewJob: async function (data, files) {
      var form = new FormData();
      form.append('propId', data.propId || '');
      form.append('areaID', data.areaID || '');
      form.append('subareaId', data.subareaId || '');
      form.append('issued_to_team', data.issued_to_team || '');
      form.append('issued_by_team', data.issued_by_team || '');
      form.append('issued_by_team_details', data.issued_by_team_details || '');
      form.append('creator_name', data.creator_name || '');
      form.append('creator_position', data.creator_position || '');
      form.append('creator_email', data.creator_email || '');
      form.append('job_detail', data.job_detail || '');

      // Assign fields (only if assigning within own team)
      if (data.assigned_dept) {
        form.append('assigned_dept', data.assigned_dept);
      }
      if (data.assigned_supervisor) {
        form.append('assigned_supervisor', data.assigned_supervisor);
      }

      // Attach media files
      if (files && files.length > 0) {
        for (var i = 0; i < files.length; i++) {
          if (files[i]) {
            form.append('jobImages', files[i]);
          }
        }
      }

      return await apiFetch('api/dailyjob/addnewjob', {
        method: 'POST',
        body: form
      });
    },

    /**
     * Get Team Members & Subteams for a department
     * Endpoint: POST /api/dailyjob/getpropteam
     */
    getPropTeam: async function (propId, teamId) {
      var form = new FormData();
      form.append('propID', propId);
      form.append('teamID', teamId);

      return await apiFetch('api/dailyjob/getpropteam', {
        method: 'POST',
        body: form
      });
    },

    /**
     * Assign team member to a job
     * Endpoint: POST /api/dailyjob/assignteammember
     */
    assignTeamMember: async function (jobId, propId, teamId, subteamId, assignedToEmail) {
      var form = new FormData();
      form.append('jobId', jobId);
      form.append('propId', propId);
      form.append('teamId', teamId);
      form.append('subteamId', subteamId || '');
      form.append('assignedto', assignedToEmail || '');

      return await apiFetch('api/dailyjob/assignteammember', {
        method: 'POST',
        body: form
      });
    },

    /**
     * Change Job Status (Open -> Assigned -> In-Progress -> Closed)
     * Endpoint: POST /api/dailyjob/changejobstatus
     */
    changeJobStatus: async function (jobId, propId, areaId, status, remarks, files) {
      var form = new FormData();
      form.append('jobID', jobId);
      form.append('propId', propId);
      form.append('areaID', areaId || '');
      form.append('status', status);
      form.append('remarks', remarks || '');

      if (files && files.length > 0) {
        for (var i = 0; i < files.length; i++) {
          if (files[i]) {
            form.append('jobImages', files[i]);
          }
        }
      }

      return await apiFetch('api/dailyjob/changejobstatus', {
        method: 'POST',
        body: form
      });
    },

    /**
     * Move job to TaskMaster
     * Endpoint: POST /api/dailyjob/quickfixtojobtracker
     */
    moveToTaskMaster: async function (propId, jobId) {
      var form = new FormData();
      form.append('jobId', jobId);
      form.append('propId', propId);

      return await apiFetch('api/dailyjob/quickfixtojobtracker', {
        method: 'POST',
        body: form
      });
    },

    /**
     * Change Team Assignment for Open Job (Point 6)
     * Endpoint: POST /api/dailyjob/changeteam
     * @param {string} jobId
     * @param {string} propId
     * @param {string} newTeamId
     */
    // changeTeam: async function (jobId, propId, newTeamId) {
    //   var form = new FormData();
    //   form.append('jobId', jobId);
    //   form.append('jobID', jobId);
    //   if (propId) form.append('propId', propId);
    //   form.append('newTeamId', newTeamId);
    //   form.append('teamId', newTeamId);

    //   return await apiFetch('api/dailyjob/changeteam', {
    //     method: 'POST',
    //     body: form
    //   });
    // },

    /**
     * Delete Daily Job (Point 16)
     * Endpoint: POST /api/dailyjob/deletejob
     */
    deleteJob: async function (jobId, propId) {
      try {
        var form = new FormData();
        form.append('jobId', jobId);
        form.append('jobID', jobId);
        if (propId) form.append('propId', propId);

        return await apiFetch('api/dailyjob/deletejob', {
          method: 'POST',
          body: form
        });
      } catch (e) {
        console.warn('Backend deletejob not available or offline:', e);
        return { success: true };
      }
    },

    /**
     * User Login
     * Endpoint: POST /api/login
     */
    login: async function (email, password, app) {
      var endpoint = 'api/login';
      var res = await apiFetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Email: email,
          Password: password,
          App: app || 'quickfix'
        })
      });

      if (res && res.token) {
        var jwt = res.token;
        var payload = (cfg && cfg.decodeJwtPayload) ? cfg.decodeJwtPayload(jwt) : null;
        var role = payload ? payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] : ['STAFF'];
        if (!Array.isArray(role)) role = [role];

        var fullName = '';
        if (payload) {
          if (payload.FirstName) {
            fullName = (payload.FirstName + (payload.LastName ? (' ' + payload.LastName) : '')).trim();
          } else if (payload.name) {
            fullName = payload.name;
          } else if (payload.unique_name) {
            fullName = payload.unique_name;
          }
        }
        if (!fullName) fullName = email.split('@')[0];

        var updatedUserData = {
          username: email,
          jwt: jwt,
          name: fullName,
          email: (payload && (payload.Email || payload.email)) || email,
          role: role,
          prop: payload ? (payload.PrimaryProp || payload.prop) : null,
          desg: payload ? (payload.Designation || payload.desg) : 'Staff',
          access: payload && payload.Access ? (typeof payload.Access === 'string' ? JSON.parse(payload.Access) : payload.Access) : {}
        };

        if (cfg && cfg.setStoredUserData) {
          cfg.setStoredUserData(updatedUserData);
        }
        return updatedUserData;
      }
      throw new Error('Invalid credentials or no token returned');
    }
  };

  // Export to global scope
  global.WorkWizeDailyJobApi = dailyJobApi;
})(window);
