/**
 * GeoVisit Utilities — Location-Verified Field Inspection
 * Haversine calculation, browser Geolocation capture, exit monitoring, and offline queue.
 */

// Earth radius in metres
const EARTH_RADIUS_METRES = 6371000;

/**
 * Calculates great-circle distance between two GPS coordinates in metres.
 */
export function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined || lon1 === undefined ||
    lat2 === undefined || lon2 === undefined ||
    lat1 === null || lon1 === null ||
    lat2 === null || lon2 === null
  ) {
    return 0;
  }

  const φ1 = (Number(lat1) * Math.PI) / 180;
  const φ2 = (Number(lat2) * Math.PI) / 180;
  const Δφ = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const Δλ = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(EARTH_RADIUS_METRES * c);
}

/**
 * Formats a metric distance intelligently:
 * e.g. 45 m, 850 m, 1.2 km, 1,142.9 km
 */
export function formatDistance(meters) {
  if (meters === undefined || meters === null || isNaN(meters)) return 'Calculating...';
  const num = Number(meters);
  if (num < 1000) {
    return `${Math.round(num)} m`;
  }
  const km = (num / 1000).toFixed(1);
  return `${Number(km).toLocaleString()} km`;
}

/**
 * Formats duration in minutes into a human-readable string:
 * e.g. 4 min, 45 min, 1 hr 15 min, 15 hr 5 min
 */
export function formatEta(minutes) {
  if (!minutes || isNaN(minutes)) return '1 min';
  const totalMins = Math.round(Number(minutes));
  if (totalMins < 60) {
    return `${Math.max(1, totalMins)} min`;
  }
  const hours = Math.floor(totalMins / 60);
  const remainingMins = totalMins % 60;
  if (remainingMins === 0) {
    return `${hours} hr`;
  }
  return `${hours} hr ${remainingMins} min`;
}

/**
 * Request device/browser GPS coordinates with high accuracy.
 */
export function getCurrentGpsPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation is not supported by your browser/device.'));
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy || 0),
          timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
          altitude: pos.coords.altitude,
          heading: pos.coords.heading,
          speed: pos.coords.speed
        });
      },
      (err) => {
        let msg = 'Failed to acquire location.';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            msg = 'Location access permission was denied. Please allow location access in your browser settings.';
            break;
          case err.POSITION_UNAVAILABLE:
            msg = 'GPS signal unavailable. Please ensure location services are enabled on your device.';
            break;
          case err.TIMEOUT:
            msg = 'Location request timed out. Please try again with clear sky / GPS signal.';
            break;
        }
        reject(new Error(msg));
      },
      options
    );
  });
}

/**
 * Generate a turn-by-turn navigation URL for Google Maps / Apple Maps.
 */
export function getNavigationUrl(lat, lon, address = '') {
  if (lat && lon) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(lat)},${encodeURIComponent(lon)}`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  }
  return '#';
}

// -----------------------------------------------------------------------------
// Offline Queue & Storage Support
// -----------------------------------------------------------------------------
const OFFLINE_KEY = 'certifymetric_geovisit_offline_queue';

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(OFFLINE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

export function saveOfflineVisit(appId, data) {
  try {
    const queue = getOfflineQueue();
    queue[appId] = {
      ...queue[appId],
      ...data,
      lastSaved: new Date().toISOString()
    };
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
    return queue[appId];
  } catch (e) {
    console.error('Failed to save offline visit:', e);
    return data;
  }
}

export function removeOfflineVisit(appId) {
  try {
    const queue = getOfflineQueue();
    delete queue[appId];
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(queue));
  } catch (e) {}
}

export function hasOfflinePending(appId) {
  const queue = getOfflineQueue();
  return !!queue[appId];
}
