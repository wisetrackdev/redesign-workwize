import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_CONFIG = {
  BASE_URL: 'https://api.workwize.in/',
  LOCAL_URL: 'https://localhost:7151/',
  STORAGE_KEY: 'oproUserData',
  APP_CODE: 'quickfix',
};

/**
 * Decode JWT token without external libraries
 */
export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.warn('Failed to parse JWT payload:', e);
    return null;
  }
}

/**
 * Retrieve stored user object from AsyncStorage
 */
export async function getStoredUserData() {
  try {
    const raw = await AsyncStorage.getItem(API_CONFIG.STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
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
export async function getStoredJwt() {
  const userData = await getStoredUserData();
  if (!userData) return '';
  return userData.jwt || userData.token || '';
}

/**
 * Store user data in AsyncStorage
 */
export async function setStoredUserData(userData) {
  if (!userData) {
    await AsyncStorage.removeItem(API_CONFIG.STORAGE_KEY);
    return;
  }
  try {
    await AsyncStorage.setItem(API_CONFIG.STORAGE_KEY, JSON.stringify(userData));
  } catch (e) {
    console.error('Error saving user data:', e);
  }
}

/**
 * Remove user data from AsyncStorage
 */
export async function clearStoredUserData() {
  try {
    await AsyncStorage.removeItem(API_CONFIG.STORAGE_KEY);
  } catch (e) {}
}

/**
 * Format date as DD/MM/YYYY, HH:MM AM/PM in Maldives Time (UTC+5)
 */
export function formatApiDate(dateStr) {
  if (!dateStr || dateStr === 'NA' || dateStr === 'na' || String(dateStr).startsWith('0001')) return 'NA';
  let d = null;
  if (dateStr instanceof Date) {
    if (!isNaN(dateStr.getTime())) d = dateStr;
  } else {
    const s = String(dateStr).trim();
    if (!s || s.startsWith('0001-01-01') || s.startsWith('0001')) return 'NA';
    if (/Z|[+-]\d{2}(:?\d{2})?$/i.test(s)) {
      const dZ = new Date(s);
      if (!isNaN(dZ.getTime())) d = dZ;
    } else {
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
      if (isoMatch) {
        const sec = isoMatch[6] || '00';
        const utcIso = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}T${isoMatch[4]}:${isoMatch[5]}:${sec}Z`;
        const dIso = new Date(utcIso);
        if (!isNaN(dIso.getTime())) d = dIso;
      } else {
        const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:,?\s*(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?/);
        if (dmyMatch) {
          const y = dmyMatch[3];
          const m = String(dmyMatch[2]).padStart(2, '0');
          const dd = String(dmyMatch[1]).padStart(2, '0');
          const hr = String(dmyMatch[4] || 0).padStart(2, '0');
          const min = String(dmyMatch[5] || 0).padStart(2, '0');
          const sc = String(dmyMatch[6] || 0).padStart(2, '0');
          const utcDmy = `${y}-${m}-${dd}T${hr}:${min}:${sc}Z`;
          const dDmy = new Date(utcDmy);
          if (!isNaN(dDmy.getTime())) d = dDmy;
        }
      }
    }
    if (!d) {
      const fb = new Date(s);
      if (!isNaN(fb.getTime())) d = fb;
    }
  }

  if (!d) return String(dateStr);

  // Maldives Time: UTC+5
  const mvt = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  const day = String(mvt.getUTCDate()).padStart(2, '0');
  const month = String(mvt.getUTCMonth() + 1).padStart(2, '0');
  const year = mvt.getUTCFullYear();
  let hours = mvt.getUTCHours();
  const minutes = String(mvt.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
}
