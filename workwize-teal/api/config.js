/**
 * WorkWize API Configuration & Storage Helpers
 * Matches quickfix architecture with https://api.workwize.in/
 */
(function (global) {
  'use strict';

  var API_CONFIG = {
    // Primary backend endpoint
    BASE_URL: 'https://api.workwize.in/',
    // Local / fallback endpoint if running locally
    LOCAL_URL: 'https://localhost:7151/',
    // Storage key used across all WorkWize / quickfix apps
    STORAGE_KEY: 'oproUserData',
    APP_CODE: 'quickfix'
  };

  /**
   * Helper to decode a JWT without external libraries
   */
  function decodeJwtPayload(token) {
    if (!token || typeof token !== 'string') return null;
    try {
      var parts = token.split('.');
      if (parts.length < 2) return null;
      var base64Url = parts[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      var jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (e) {
      console.warn('Failed to parse JWT payload:', e);
      return null;
    }
  }

  /**
   * Retrieve stored user object from localStorage
   */
  function getStoredUserData() {
    try {
      var raw = localStorage.getItem(API_CONFIG.STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (parsed && (parsed.jwt || parsed.token)) {
        return parsed;
      }
    } catch (e) {
      console.warn('Error reading stored user data:', e);
    }
    return null;
  }

  /**
   * Retrieve JWT string from storage
   */
  function getStoredJwt() {
    var userData = getStoredUserData();
    if (!userData) return '';
    return userData.jwt || userData.token || '';
  }

  /**
   * Store user data in localStorage
   */
  function setStoredUserData(userData) {
    if (!userData) {
      localStorage.removeItem(API_CONFIG.STORAGE_KEY);
      return;
    }
    try {
      localStorage.setItem(API_CONFIG.STORAGE_KEY, JSON.stringify(userData));
    } catch (e) {
      console.error('Error saving user data:', e);
    }
  }

  /**
   * Remove user data from localStorage
   */
  function clearStoredUserData() {
    try {
      localStorage.removeItem(API_CONFIG.STORAGE_KEY);
    } catch (e) {}
  }

  /**
   * Format date as DD/MM/YYYY, HH:MM AM/PM in Maldives Time (UTC+5, 30 min behind IST)
   */
  function formatApiDate(dateStr) {
    if (!dateStr || dateStr === 'NA' || dateStr === 'na' || String(dateStr).startsWith('0001')) return 'NA';
    var d = null;
    if (dateStr instanceof Date) {
      if (!isNaN(dateStr.getTime())) d = dateStr;
    } else {
      var s = String(dateStr).trim();
      if (!s || s.startsWith('0001-01-01') || s.startsWith('0001')) return 'NA';
      if (/Z|[+-]\d{2}(:?\d{2})?$/i.test(s)) {
        var dZ = new Date(s);
        if (!isNaN(dZ.getTime())) d = dZ;
      } else {
        var isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
        if (isoMatch) {
          var sec = isoMatch[6] || '00';
          var utcIso = isoMatch[1] + '-' + isoMatch[2] + '-' + isoMatch[3] + 'T' + isoMatch[4] + ':' + isoMatch[5] + ':' + sec + 'Z';
          var dIso = new Date(utcIso);
          if (!isNaN(dIso.getTime())) d = dIso;
        } else {
          var dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:,?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
          if (dmyMatch) {
            var y = dmyMatch[3];
            var m = String(dmyMatch[2]).padStart(2, '0');
            var dd = String(dmyMatch[1]).padStart(2, '0');
            var hr = String(dmyMatch[4] || 0).padStart(2, '0');
            var min = String(dmyMatch[5] || 0).padStart(2, '0');
            var sc = String(dmyMatch[6] || 0).padStart(2, '0');
            var utcDmy = y + '-' + m + '-' + dd + 'T' + hr + ':' + min + ':' + sc + 'Z';
            var dDmy = new Date(utcDmy);
            if (!isNaN(dDmy.getTime())) d = dDmy;
          }
        }
      }
      if (!d) {
        var fb = new Date(s);
        if (!isNaN(fb.getTime())) d = fb;
      }
    }

    if (!d) return String(dateStr);

    // Maldives Time: UTC+5
    var mvt = new Date(d.getTime() + (5 * 60 * 60 * 1000));
    var day = String(mvt.getUTCDate()).padStart(2, '0');
    var month = String(mvt.getUTCMonth() + 1).padStart(2, '0');
    var year = mvt.getUTCFullYear();
    var hours = mvt.getUTCHours();
    var minutes = String(mvt.getUTCMinutes()).padStart(2, '0');
    var ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return day + '/' + month + '/' + year + ', ' + hours + ':' + minutes + ' ' + ampm;
  }

  // Export to global scope
  global.WorkWizeConfig = {
    API_CONFIG: API_CONFIG,
    decodeJwtPayload: decodeJwtPayload,
    getStoredUserData: getStoredUserData,
    getStoredJwt: getStoredJwt,
    setStoredUserData: setStoredUserData,
    clearStoredUserData: clearStoredUserData,
    formatApiDate: formatApiDate
  };
})(window);
