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
   * Format date as DD/MM/YYYY, HH:MM AM/PM
   */
  function formatApiDate(dateStr) {
    if (!dateStr || dateStr === 'NA' || dateStr === 'na') return 'NA';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return String(dateStr);
    }
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    var hours = d.getHours();
    var minutes = String(d.getMinutes()).padStart(2, '0');
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
