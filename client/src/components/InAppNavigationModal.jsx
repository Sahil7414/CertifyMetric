import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getCurrentGpsPosition, calculateDistanceMeters, getNavigationUrl, formatDistance, formatEta } from '../utils/geoVisitUtils';

export default function InAppNavigationModal({
  isOpen = true,
  onClose,
  registeredLat,
  registeredLng,
  registeredAddress = 'Registered Inspection Premises',
  traderName = 'Commercial Trader',
  officerLat,
  officerLng,
  distance,
  geofenceRadius = 200,
  onCheckInNow,
  onCheckIn
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const routeLayerRef = useRef(null);

  const [currentLat, setCurrentLat] = useState(officerLat);
  const [currentLng, setCurrentLng] = useState(officerLng);
  const [liveDistance, setLiveDistance] = useState(distance);
  const [routeSteps, setRouteSteps] = useState([]);
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(true);
  const [refreshingGps, setRefreshingGps] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);

  // Turn-by-Turn Panel State (Desktop & Mobile)
  const [showDirectionsPanel, setShowDirectionsPanel] = useState(true);

  // Mobile Navigation States
  const [mobileTab, setMobileTab] = useState('map'); // 'map' | 'steps'
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [showGpsTooltip, setShowGpsTooltip] = useState(false);

  const rLat = Number(registeredLat) || 19.1110;
  const rLng = Number(registeredLng) || 72.9280;

  // Initialize and update live coordinates
  useEffect(() => {
    if (officerLat && officerLng) {
      setCurrentLat(officerLat);
      setCurrentLng(officerLng);
    } else {
      // Auto-fetch live GPS so navigation begins immediately
      getCurrentGpsPosition()
        .then(pos => {
          setCurrentLat(pos.latitude);
          setCurrentLng(pos.longitude);
        })
        .catch(() => {
          // Fallback realistic location ~42m away if permission denied
          setCurrentLat(rLat + 0.00028);
          setCurrentLng(rLng + 0.00024);
          setIsSimulated(true);
        });
    }
  }, [officerLat, officerLng, rLat, rLng]);

  // Calculate live distance and initial sensible ETA
  useEffect(() => {
    if (currentLat && currentLng && registeredLat && registeredLng) {
      const d = calculateDistanceMeters(currentLat, currentLng, registeredLat, registeredLng);
      setLiveDistance(d);
      // If distance > 2000m, driving speed ~50km/h (833 m/min); else walking ~80m/min
      const speed = d > 2000 ? 833 : 80;
      setEtaMinutes(Math.max(1, Math.round(d / speed)));
    }
  }, [currentLat, currentLng, registeredLat, registeredLng]);

  // Fetch real-world route from OSRM
  const fetchRoute = async (startLat, startLng, endLat, endLng) => {
    setLoadingRoute(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const coordinates = route.geometry.coordinates.map(coord => [coord[1], coord[0]]); // GeoJSON is [lng, lat], Leaflet is [lat, lng]

        // Extract turn-by-turn maneuvers
        const steps = [];
        if (route.legs && route.legs[0] && route.legs[0].steps) {
          route.legs[0].steps.forEach((step) => {
            if (step.maneuver && step.maneuver.type !== 'arrive') {
              steps.push({
                instruction: step.maneuver.modifier
                  ? `${step.maneuver.type} ${step.maneuver.modifier} onto ${step.name || 'road'}`
                  : `${step.maneuver.type} on ${step.name || 'road'}`,
                distanceMeters: Math.round(step.distance),
                type: step.maneuver.type,
                modifier: step.maneuver.modifier
              });
            }
          });
          steps.push({
            instruction: `Arrive at ${traderName} (${registeredAddress})`,
            distanceMeters: 0,
            type: 'arrive',
            modifier: ''
          });
        }

        setRouteSteps(steps.length > 0 ? steps : [
          { instruction: `Proceed toward ${registeredAddress}`, distanceMeters: liveDistance || 0, type: 'straight', modifier: '' },
          { instruction: `Arrive inside ${geofenceRadius}m geofence at ${traderName}`, distanceMeters: 0, type: 'arrive', modifier: '' }
        ]);

        if (route.duration) {
          setEtaMinutes(Math.max(1, Math.round(route.duration / 60)));
        }

        return coordinates;
      }
    } catch (err) {
      console.warn('OSRM Route fetch failed, falling back to direct trajectory:', err);
    } finally {
      setLoadingRoute(false);
    }

    // Fallback: direct line coordinates
    setRouteSteps([
      { instruction: `Head directly toward ${traderName}`, distanceMeters: liveDistance || 0, type: 'straight', modifier: '' },
      { instruction: `Arrive at verification site: ${registeredAddress}`, distanceMeters: 0, type: 'arrive', modifier: '' }
    ]);
    return [[startLat, startLng], [endLat, endLng]];
  };

  // Helper for clean maneuver icons
  const getManeuverIcon = (step) => {
    if (!step) return 'navigation';
    if (step.distanceMeters === 0 || step.type === 'arrive') return 'flag';
    const mod = (step.modifier || '').toLowerCase();
    if (mod.includes('left')) return 'turn_left';
    if (mod.includes('right')) return 'turn_right';
    if (mod.includes('u-turn') || mod.includes('uturn')) return 'u_turn_left';
    if (mod.includes('straight')) return 'straight';
    return 'navigation';
  };

  // Render Leaflet Map
  useEffect(() => {
    if (isOpen === false || !mapContainerRef.current) return;

    const rLat = Number(registeredLat) || 19.1110;
    const rLng = Number(registeredLng) || 72.9280;
    const oLat = currentLat ? Number(currentLat) : rLat + 0.0003;
    const oLng = currentLng ? Number(currentLng) : rLng + 0.0003;

    // Clean up existing map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false
    });
    mapInstanceRef.current = map;

    // Zoom control on desktop only to preserve mobile screen real-estate
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      L.control.zoom({ position: 'bottomright' }).addTo(map);
    }

    // OpenStreetMap clean tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // Calculate exact distance synchronously so markers and KPIs never get out of sync
    const activeDistance = calculateDistanceMeters(oLat, oLng, rLat, rLng);
    setLiveDistance(activeDistance);
    const speed = activeDistance > 2000 ? 833 : 80;
    setEtaMinutes(Math.max(1, Math.round(activeDistance / speed)));

    // 1. Registered Trader Site Marker (Clean professional vector badge)
    const traderIcon = L.divIcon({
      className: 'custom-trader-marker',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
          <div style="background:#0f172a; color:#f8fafc; font-size:11px; font-weight:700; padding:4px 9px; border-radius:6px; border:1px solid #334155; box-shadow:0 6px 16px rgba(0,0,0,0.35); white-space:nowrap; display:flex; align-items:center; gap:6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-3"/><rect x="9" y="9" width="2" height="2"/><rect x="9" y="13" width="2" height="2"/><rect x="9" y="17" width="2" height="2"/></svg>
            <span style="font-family:'Inter',sans-serif;">${traderName}</span>
            <span style="font-size:9px; background:#e11d48; color:white; padding:1px 5px; border-radius:3px; font-family:'JetBrains Mono',monospace; font-weight:700;">PREMISES</span>
          </div>
          <div style="background:#1e293b; color:#fb7185; font-family:'JetBrains Mono',monospace; font-size:9px; font-weight:700; padding:2px 6px; border-radius:3px; border:1px solid #e11d48; margin-top:2px; white-space:nowrap; box-shadow:0 2px 5px rgba(0,0,0,0.35); display:flex; align-items:center; gap:4px;">
            <span style="color:#f43f5e;">📍</span>
            <span>${rLat.toFixed(4)}°N, ${rLng.toFixed(4)}°E</span>
          </div>
          <svg width="14" height="8" viewBox="0 0 14 8" style="margin-top:-1px;"><polygon points="0,0 14,0 7,8" fill="#1e293b"/></svg>
          <div style="width:7px; height:7px; background:#e11d48; border-radius:50%; border:1.5px solid white; margin-top:-3px; box-shadow:0 0 8px rgba(225,29,72,0.9);"></div>
        </div>
      `,
      iconSize: [0, 0]
    });

    const targetMarker = L.marker([rLat, rLng], { icon: traderIcon }).addTo(map);
    targetMarker.bindPopup(`
      <div style="font-family:'Inter',sans-serif; padding:4px;">
        <div style="display:flex; align-items:center; gap:6px;">
          <strong style="font-size:13px; color:#0f172a;">${traderName}</strong>
          <span style="font-size:9px; background:#e11d48; color:white; padding:1px 4px; border-radius:2px; font-family:'JetBrains Mono',monospace; font-weight:700;">PREMISES</span>
        </div>
        <div style="font-size:11px; color:#475569; margin-top:3px;">${registeredAddress}</div>
        <div style="margin-top:6px; padding:4px 8px; background:#fff1f2; border:1px solid #fecdd3; border-radius:4px; font-family:'JetBrains Mono',monospace; font-size:11px; font-weight:700; color:#be123c;">
          📍 Statutory Inspection Point<br/>
          Lat: ${rLat.toFixed(6)}° N • Lng: ${rLng.toFixed(6)}° E
        </div>
      </div>
    `);

    // 2. Geofence Perimeter Circle (200m true circular metric perimeter)
    const isInside = activeDistance <= geofenceRadius;
    L.circle([rLat, rLng], {
      radius: Number(geofenceRadius) || 200,
      color: isInside ? '#059669' : '#0284c7',
      fillColor: isInside ? '#10b981' : '#38bdf8',
      fillOpacity: isInside ? 0.16 : 0.08,
      weight: 2,
      dashArray: '5, 5'
    }).addTo(map);

    // 3. Officer Check-In Position Marker (Engineered GPS beacon with synchronous exact distance)
    const officerIcon = L.divIcon({
      className: 'custom-officer-marker',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -50%);">
          <div style="position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center;">
            <div style="position:absolute; inset:0; border-radius:50%; background:#0284c7; opacity:0.35; animation:ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position:relative; width:20px; height:20px; border-radius:50%; background:#0284c7; border:2.5px solid white; box-shadow:0 3px 10px rgba(2,132,199,0.6); display:flex; align-items:center; justify-content:center;">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="12,2 19,21 12,17 5,21"/></svg>
            </div>
          </div>
          <div style="background:#0b1329; color:#38bdf8; font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:700; padding:2px 7px; border-radius:4px; border:1px solid #0284c7; margin-top:2px; white-space:nowrap; box-shadow:0 3px 8px rgba(0,0,0,0.4);">
            OFFICER • ${formatDistance(activeDistance)}
          </div>
        </div>
      `,
      iconSize: [0, 0]
    });

    L.marker([oLat, oLng], { icon: officerIcon }).addTo(map);

    // 4. Fetch and draw Route Polyline
    fetchRoute(oLat, oLng, rLat, rLng).then(coords => {
      if (!mapInstanceRef.current) return;
      if (routeLayerRef.current) {
        mapInstanceRef.current.removeLayer(routeLayerRef.current);
      }

      // Outer route glow
      const routeGlow = L.polyline(coords, {
        color: '#38bdf8',
        weight: 6,
        opacity: 0.4
      });

      // Core crisp direction line
      const routeCore = L.polyline(coords, {
        color: '#0284c7',
        weight: 3.5,
        opacity: 0.95,
        dashArray: '8, 6'
      });

      const routeGroup = L.featureGroup([routeGlow, routeCore]).addTo(mapInstanceRef.current);
      routeLayerRef.current = routeGroup;

      // Safe bounding box for geofence circle
      const latDelta = (Number(geofenceRadius) || 200) / 111320;
      const lngDelta = (Number(geofenceRadius) || 200) / (111320 * Math.cos(rLat * (Math.PI / 180)));
      const circleBounds = L.latLngBounds(
        [rLat - latDelta * 1.5, rLng - lngDelta * 1.5],
        [rLat + latDelta * 1.5, rLng + lngDelta * 1.5]
      );

      // Fit map view to encompass both officer, destination, and geofence
      const bounds = L.latLngBounds([
        [oLat, oLng],
        [rLat, rLng]
      ]);
      bounds.extend(circleBounds);
      mapInstanceRef.current.fitBounds(bounds, { padding: [55, 55], maxZoom: 18 });
    });

    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 200);

    return () => {
      clearTimeout(resizeTimer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen, currentLat, currentLng, registeredLat, registeredLng, geofenceRadius]);

  // Invalidate map size on panel, tab, or screen layout transitions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 120);
    return () => clearTimeout(timer);
  }, [showDirectionsPanel, mobileTab, isSheetExpanded]);

  // Handle window resizing smoothly across mobile, tablet, and desktop
  useEffect(() => {
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Recenter Actions
  const handleCenterOfficer = () => {
    if (!mapInstanceRef.current || !currentLat || !currentLng) return;
    mapInstanceRef.current.flyTo([Number(currentLat), Number(currentLng)], 17, { duration: 0.8 });
  };

  const handleCenterDestination = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([rLat, rLng], 17, { duration: 0.8 });
  };

  const handleFitRouteBounds = () => {
    if (!mapInstanceRef.current) return;
    const oLat = currentLat ? Number(currentLat) : rLat + 0.0003;
    const oLng = currentLng ? Number(currentLng) : rLng + 0.0003;
    const bounds = L.latLngBounds([[oLat, oLng], [rLat, rLng]]);
    mapInstanceRef.current.fitBounds(bounds, { padding: [60, 60], maxZoom: 18 });
  };

  // Refresh Officer GPS position from device
  const handleRefreshGps = async () => {
    setRefreshingGps(true);
    setIsSimulated(false);
    try {
      const pos = await getCurrentGpsPosition();
      setCurrentLat(pos.latitude);
      setCurrentLng(pos.longitude);
    } catch (err) {
      alert('Could not refresh GPS: ' + err.message);
    } finally {
      setRefreshingGps(false);
    }
  };

  // Simulate arrival 42m away from the shop (for testing check-in workflow anywhere)
  const handleSimulateArrival = () => {
    const simLat = rLat + 0.00028;
    const simLng = rLng + 0.00024;
    setCurrentLat(simLat);
    setCurrentLng(simLng);
    setIsSimulated(true);
  };

  // Check-In Execution
  const handleCheckInAction = () => {
    onClose();
    const simulatedCoords = isSimulated ? {
      latitude: currentLat,
      longitude: currentLng,
      accuracy: 5,
      timestamp: new Date().toISOString()
    } : null;
    if (onCheckInNow) onCheckInNow(simulatedCoords);
    else if (onCheckIn) onCheckIn(simulatedCoords);
  };

  if (isOpen === false) return null;

  const isInside = liveDistance !== undefined && liveDistance !== null && liveDistance <= geofenceRadius;
  const nextStep = routeSteps.length > 0 ? routeSteps[0] : null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-0 md:p-4 lg:p-6 animate-in fade-in">
      {/* Outer Modal Container: 100% Full Screen on Mobile, Adaptive Pro Modal on Desktop */}
      <div className={`bg-slate-900 text-slate-100 w-full h-full md:h-[90vh] md:max-h-[860px] md:rounded-2xl flex flex-col shadow-2xl border-0 md:border md:border-slate-800 overflow-hidden relative transition-all duration-300 ${
        showDirectionsPanel ? 'md:max-w-5xl lg:max-w-6xl' : 'md:max-w-6xl lg:max-w-7xl'
      }`}>

        {/* ========================================================================= */}
        {/* DESKTOP HEADER (Hidden on mobile < 768px) */}
        {/* ========================================================================= */}
        <div className="hidden md:flex px-5 py-3.5 bg-gradient-to-r from-slate-950 via-[#002046] to-slate-950 text-white items-center justify-between gap-3 shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-sky-400 border border-white/15 shrink-0 shadow-inner">
              <span className="material-symbols-outlined text-xl">explore</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-extrabold text-sm tracking-wide text-white">Legal Metrology Field Navigation & Route Guidance</h3>
                <span className={`text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full border font-['JetBrains_Mono'] flex items-center gap-1.5 ${
                  isInside ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-xs shadow-emerald-500/20' : 'bg-amber-950/90 text-amber-300 border-amber-500/60'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isInside ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  {isInside ? 'INSIDE GEOFENCE' : 'EN ROUTE'}
                </span>
                {isSimulated && (
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-950/90 text-sky-300 border border-sky-500/50 font-['JetBrains_Mono']">
                    SIMULATION MODE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5 truncate max-w-xl">
                Target: <strong className="text-white font-semibold">{traderName}</strong> • {registeredAddress}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle button to reopen/hide Turn-by-Turn panel on desktop */}
            <button
              type="button"
              onClick={() => setShowDirectionsPanel(!showDirectionsPanel)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                showDirectionsPanel
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-xs'
                  : 'bg-white/10 hover:bg-white/20 text-slate-200 border-white/15 shadow-sm'
              }`}
              title={showDirectionsPanel ? 'Hide Directions Panel (Full Map View)' : 'Show Turn-by-Turn Directions Panel'}
            >
              <span className="material-symbols-outlined text-[16px]">directions</span>
              <span>{showDirectionsPanel ? 'Directions Open' : 'Show Directions'}</span>
            </button>

            {/* Modal Close Window Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-slate-200 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer border border-white/10 shadow-xs"
              title="Close Navigation Window"
              aria-label="Close navigation window"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* DESKTOP TELEMETRY STRIP (4-KPI Grid, Hidden on mobile) */}
        {/* ========================================================================= */}
        <div className="hidden md:grid grid-cols-4 bg-slate-900/90 border-b border-slate-800 divide-x divide-slate-800 shrink-0">
          {/* 1. Distance */}
          <div className="px-4 py-2.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              Remaining Distance
            </span>
            <div className="font-['JetBrains_Mono'] text-2xl font-bold text-white tracking-tight mt-0.5 tabular-nums">
              {formatDistance(liveDistance)}
            </div>
            <span className="text-[10px] text-slate-400 truncate">
              {liveDistance > 2000 ? 'Highway / road transit' : 'Direct line to premises'}
            </span>
          </div>

          {/* 2. Estimated Travel Time */}
          <div className="px-4 py-2.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
              Estimated Travel Time
            </span>
            <div className="font-['JetBrains_Mono'] text-2xl font-bold text-sky-400 tracking-tight mt-0.5 tabular-nums">
              {formatEta(etaMinutes)}
            </div>
            <span className="text-[10px] text-slate-400 truncate">
              {liveDistance > 2000 ? 'Driving / transit duration' : 'Walking pace (~80 m/min)'}
            </span>
          </div>

          {/* 3. Statutory Geofence */}
          <div className="px-4 py-2.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Statutory Geofence
            </span>
            <div className="font-['JetBrains_Mono'] text-2xl font-bold text-emerald-400 tracking-tight mt-0.5 tabular-nums">
              {geofenceRadius} <span className="text-xs font-semibold text-emerald-300 font-sans">m</span>
            </div>
            <span className="text-[10px] text-slate-400 truncate">Statutory verification radius</span>
          </div>

          {/* 4. Officer Check-In Status */}
          <div className="px-4 py-2.5 flex flex-col justify-between">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${isInside ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
              Officer Status
            </span>
            <div className={`font-['JetBrains_Mono'] text-base font-bold flex items-center gap-1.5 mt-0.5 ${isInside ? 'text-emerald-400' : 'text-amber-400'}`}>
              <span className="material-symbols-outlined text-[18px]">
                {isInside ? 'verified' : 'location_searching'}
              </span>
              <span>{isInside ? 'Inside Geofence' : 'En Route'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-['JetBrains_Mono'] truncate">
              {currentLat ? `${Number(currentLat).toFixed(4)}°, ${Number(currentLng).toFixed(4)}°` : 'Acquiring GPS...'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* MAIN STAGE (Adaptive: Full Screen Map on Mobile with HUD, Split on Desktop) */}
        {/* ========================================================================= */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 relative w-full h-full overflow-hidden">

          {/* ----------------------------------------------------------------------- */}
          {/* MAP CANVAS (Expands to 100% when directions closed, or split on Desktop) */}
          {/* ----------------------------------------------------------------------- */}
          <div className="flex-1 relative w-full h-full bg-slate-950 overflow-hidden">
            <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

            {/* =================================================================== */}
            {/* MOBILE FLOATING TOP BAR & TELEMETRY ISLAND (< md screens: 360-767px) */}
            {/* =================================================================== */}
            <div className="md:hidden absolute top-0 left-0 right-0 z-20 p-2 sm:p-2.5 pointer-events-none space-y-1.5">
              {/* Glass Top Bar */}
              <div className="pointer-events-auto bg-slate-950/90 backdrop-blur-md text-white rounded-2xl border border-slate-700/60 shadow-2xl p-2 sm:p-2.5 flex items-center justify-between gap-1.5">
                {/* Back / Close Navigation Button */}
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all cursor-pointer border border-white/10 shrink-0"
                  title="Close Navigation"
                  aria-label="Back to visit view"
                >
                  <span className="material-symbols-outlined text-lg sm:text-xl">arrow_back</span>
                </button>

                <div className="flex-1 min-w-0 px-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-extrabold text-xs text-white truncate">
                      {traderName}
                    </span>
                    <span className={`shrink-0 text-[8.5px] sm:text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded-full border font-['JetBrains_Mono'] flex items-center gap-1 ${
                      isInside
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/60 shadow-xs'
                        : 'bg-amber-950 text-amber-300 border-amber-500/60'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${isInside ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                      {isInside ? 'GEOFENCE' : 'EN ROUTE'}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-300 truncate mt-0.5">
                    {registeredAddress}
                  </p>
                </div>

                {/* Mobile View Toggle: Map vs Steps */}
                <div className="flex items-center bg-white/10 rounded-xl p-0.5 border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setMobileTab('map');
                      setIsSheetExpanded(false);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      mobileTab === 'map' && !isSheetExpanded
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    aria-label="Show Map"
                  >
                    <span className="material-symbols-outlined text-[13px]">map</span>
                    <span>Map</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileTab('steps');
                      setIsSheetExpanded(true);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                      mobileTab === 'steps' || isSheetExpanded
                        ? 'bg-sky-500 text-white shadow-xs'
                        : 'text-slate-300 hover:text-white'
                    }`}
                    aria-label="Show Steps"
                  >
                    <span className="material-symbols-outlined text-[13px]">format_list_bulleted</span>
                    <span>Steps</span>
                  </button>
                </div>
              </div>

              {/* Floating Compact Telemetry Strip (Mobile Dynamic Island - 360px Safe Grid) */}
              <div className="pointer-events-auto bg-slate-950/85 backdrop-blur-md rounded-xl border border-slate-700/60 shadow-lg px-2 py-1.5 grid grid-cols-3 divide-x divide-slate-700/60 text-center">
                {/* Distance */}
                <div className="flex flex-col items-center justify-center px-0.5">
                  <span className="text-[8.5px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span>
                    DISTANCE
                  </span>
                  <span className="font-['JetBrains_Mono'] text-xs font-bold text-white leading-tight truncate max-w-full">
                    {formatDistance(liveDistance)}
                  </span>
                </div>

                {/* ETA */}
                <div className="flex flex-col items-center justify-center px-0.5">
                  <span className="text-[8.5px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    ETA
                  </span>
                  <span className="font-['JetBrains_Mono'] text-xs font-bold text-amber-300 leading-tight truncate max-w-full">
                    {formatEta(etaMinutes)}
                  </span>
                </div>

                {/* Geofence */}
                <div className="flex flex-col items-center justify-center px-0.5">
                  <span className="text-[8.5px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                    <span className={`w-1.5 h-1.5 rounded-full ${isInside ? 'bg-emerald-400' : 'bg-emerald-500'}`}></span>
                    GEOFENCE
                  </span>
                  <span className="font-['JetBrains_Mono'] text-xs font-bold text-emerald-400 leading-tight truncate max-w-full">
                    {geofenceRadius}m
                  </span>
                </div>
              </div>
            </div>

            {/* =================================================================== */}
            {/* FLOATING ACTION BUTTON TO REOPEN DIRECTIONS (Desktop Full Map View) */}
            {/* =================================================================== */}
            {!showDirectionsPanel && (
              <div className="hidden md:flex absolute top-3.5 right-16 z-20 animate-in fade-in">
                <button
                  type="button"
                  onClick={() => setShowDirectionsPanel(true)}
                  className="px-3.5 py-2 bg-slate-900/95 hover:bg-slate-800 active:scale-95 text-sky-400 hover:text-sky-300 rounded-xl border border-sky-500/40 shadow-xl backdrop-blur-md font-bold text-xs flex items-center gap-2 cursor-pointer transition-all"
                  title="Open Turn-by-Turn Directions Panel"
                >
                  <span className="material-symbols-outlined text-base">directions</span>
                  <span>Route Directions ({routeSteps.length})</span>
                </button>
              </div>
            )}

            {/* Floating External Google Maps Pill on Desktop when Directions Panel is closed */}
            {!showDirectionsPanel && (
              <div className="hidden md:flex absolute bottom-4 left-4 z-20 animate-in fade-in">
                <a
                  href={getNavigationUrl(registeredLat, registeredLng, registeredAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 bg-slate-900/95 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold rounded-xl text-xs transition-all flex items-center gap-1.5 border border-slate-700/80 shadow-lg backdrop-blur-md"
                >
                  <span className="material-symbols-outlined text-[15px] text-sky-400">open_in_new</span>
                  <span>Open External Google Maps App</span>
                </a>
              </div>
            )}

            {/* =================================================================== */}
            {/* FLOATING QUICK-ACTION CONTROLS ON MAP (Both Mobile and Desktop) */}
            {/* =================================================================== */}
            {/* Left: GPS & Simulation Mode Switcher */}
            <div className="absolute top-[108px] md:top-3 left-2.5 sm:left-3 z-10 flex flex-col items-start gap-1.5 max-w-[280px] sm:max-w-sm pointer-events-auto">
              <div className="flex items-center bg-slate-900/90 backdrop-blur-md p-0.5 sm:p-1 rounded-xl shadow-lg border border-slate-700/80 gap-1">
                <button
                  type="button"
                  onClick={handleRefreshGps}
                  disabled={refreshingGps}
                  className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    !isSimulated
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Detect real device GPS"
                >
                  <span className={`material-symbols-outlined text-[14px] sm:text-[15px] ${refreshingGps ? 'animate-spin' : ''}`}>
                    my_location
                  </span>
                  <span className="hidden sm:inline">{refreshingGps ? 'Locating...' : 'Device GPS'}</span>
                  <span className="sm:hidden">{refreshingGps ? '...' : 'GPS'}</span>
                </button>

                <button
                  type="button"
                  onClick={isSimulated ? handleRefreshGps : handleSimulateArrival}
                  className={`px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSimulated
                      ? 'bg-emerald-600 text-white shadow-xs font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                  title="Simulate arrival inside 200m geofence"
                >
                  <span className="material-symbols-outlined text-[14px] sm:text-[15px]">
                    {isSimulated ? 'verified' : 'pin_drop'}
                  </span>
                  <span>{isSimulated ? '✓ At Shop' : 'Demo: Arrive'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowGpsTooltip(!showGpsTooltip)}
                  className="w-6 h-6 rounded-md text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                  title="GPS Information"
                  aria-label="GPS Information"
                >
                  <span className="material-symbols-outlined text-[14px]">help</span>
                </button>
              </div>

              {/* Explanatory Collapsible Tooltip */}
              {showGpsTooltip && (
                <div className="px-3 py-2 bg-slate-900/95 text-slate-200 border border-slate-700 rounded-xl text-[11px] backdrop-blur-md shadow-xl animate-in fade-in">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <strong className="text-sky-300 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">info</span>
                      GPS Mode Guidance
                    </strong>
                    <button onClick={() => setShowGpsTooltip(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
                  </div>
                  <p className="leading-relaxed text-slate-300">
                    Click <strong>Demo: Arrive</strong> to simulate officer location at the shop within 200m to test the statutory check-in flow.
                  </p>
                </div>
              )}
            </div>

            {/* Right: Map Centering & Viewport Controls */}
            <div className="absolute top-[108px] md:top-3 right-2.5 sm:right-3 z-10 flex flex-col gap-1.5 sm:gap-2 pointer-events-auto">
              {/* Recenter on Officer */}
              <button
                type="button"
                onClick={handleCenterOfficer}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-sky-400 hover:text-sky-300 flex items-center justify-center shadow-lg border border-slate-700/80 backdrop-blur-md transition-all cursor-pointer"
                title="Center on My Location (Officer)"
                aria-label="Center on officer location"
              >
                <span className="material-symbols-outlined text-base sm:text-lg">my_location</span>
              </button>

              {/* Recenter on Target Premises */}
              <button
                type="button"
                onClick={handleCenterDestination}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-rose-400 hover:text-rose-300 flex items-center justify-center shadow-lg border border-slate-700/80 backdrop-blur-md transition-all cursor-pointer"
                title="Center on Registered Premises"
                aria-label="Center on registered premises"
              >
                <span className="material-symbols-outlined text-base sm:text-lg">store</span>
              </button>

              {/* Fit Entire Route Bounds */}
              <button
                type="button"
                onClick={handleFitRouteBounds}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center shadow-lg border border-slate-700/80 backdrop-blur-md transition-all cursor-pointer"
                title="Fit Entire Route"
                aria-label="Fit entire route bounds"
              >
                <span className="material-symbols-outlined text-base sm:text-lg">fit_screen</span>
              </button>
            </div>

            {/* Loading Route Badge */}
            {loadingRoute && (
              <div className="absolute bottom-28 md:bottom-4 left-3 z-10 px-3 py-1.5 bg-slate-950/90 text-white rounded-xl text-[11px] font-semibold flex items-center gap-2 backdrop-blur-md shadow-lg border border-slate-800">
                <span className="material-symbols-outlined text-[15px] animate-spin text-sky-400">progress_activity</span>
                <span>Calculating road trajectory...</span>
              </div>
            )}

            {/* =================================================================== */}
            {/* MOBILE INTERACTIVE BOTTOM SHEET / DRAWER (< md screen) */}
            {/* =================================================================== */}
            <div className="md:hidden absolute bottom-0 left-0 right-0 z-30 pointer-events-auto">
              <div className={`bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 rounded-t-3xl shadow-2xl transition-all duration-300 flex flex-col ${
                isSheetExpanded || mobileTab === 'steps' ? 'h-[68vh] max-h-[520px]' : 'h-auto'
              }`}>
                {/* Drag Handle & Drawer Header */}
                <div
                  onClick={() => {
                    const next = !isSheetExpanded;
                    setIsSheetExpanded(next);
                    setMobileTab(next ? 'steps' : 'map');
                  }}
                  className="pt-2.5 pb-2 px-4 cursor-pointer flex flex-col items-center select-none"
                >
                  <div className="w-12 h-1 bg-slate-700 rounded-full mb-1"></div>
                  <div className="w-full flex items-center justify-between text-xs text-slate-400">
                    <span className="font-extrabold uppercase tracking-wider text-[10px] text-slate-300 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-sky-400">directions</span>
                      Route Directions ({routeSteps.length})
                    </span>

                    {/* Responsive Close / Minimize toggle button */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-sky-400 flex items-center gap-0.5">
                        {isSheetExpanded || mobileTab === 'steps' ? 'Close to Map' : 'View Full Steps'}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsSheetExpanded(false);
                          setMobileTab('map');
                        }}
                        className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                          isSheetExpanded || mobileTab === 'steps'
                            ? 'bg-slate-800 text-slate-200 hover:text-white'
                            : 'text-slate-400'
                        }`}
                        title={isSheetExpanded || mobileTab === 'steps' ? 'Close Directions to Full Map' : 'Expand Steps'}
                        aria-label="Toggle navigation drawer"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isSheetExpanded || mobileTab === 'steps' ? 'close' : 'expand_less'}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsed Next Step Preview (Shown when collapsed in map mode) */}
                {(!isSheetExpanded && mobileTab !== 'steps') && nextStep && (
                  <div className="px-3 pb-2.5">
                    <div
                      onClick={() => {
                        setIsSheetExpanded(true);
                        setMobileTab('steps');
                      }}
                      className="p-2 sm:p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2.5 cursor-pointer hover:border-slate-700 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                        <span className="material-symbols-outlined text-base">
                          {getManeuverIcon(nextStep)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block">Next Maneuver</span>
                        <p className="text-xs font-bold text-white truncate capitalize">
                          {nextStep.instruction}
                        </p>
                      </div>
                      {nextStep.distanceMeters > 0 && (
                        <div className="text-right shrink-0">
                          <span className="text-xs font-['JetBrains_Mono'] font-bold text-sky-400">
                            {formatDistance(nextStep.distanceMeters)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Expanded Turn-by-Turn Maneuvers List (Shown when drawer expanded) */}
                {(isSheetExpanded || mobileTab === 'steps') && (
                  <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2 text-xs divide-y divide-slate-800/60 overscroll-contain">
                    {routeSteps.map((step, idx) => {
                      const isFinal = idx === routeSteps.length - 1;
                      return (
                        <div key={idx} className="pt-2 first:pt-0 flex items-start gap-3">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isFinal ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-sky-400 border border-slate-700'
                          }`}>
                            <span className="material-symbols-outlined text-[15px]">
                              {isFinal ? 'flag' : getManeuverIcon(step)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`capitalize ${isFinal ? 'font-bold text-emerald-400' : 'text-slate-200 font-medium'}`}>
                              {step.instruction}
                            </p>
                            {step.distanceMeters > 0 && (
                              <span className="text-[10px] text-slate-400 font-['JetBrains_Mono'] block mt-0.5">
                                {formatDistance(step.distanceMeters)}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Mobile Bottom Actions (Always accessible at bottom) */}
                <div className="p-2.5 sm:p-3 bg-slate-950 border-t border-slate-800 space-y-2 shrink-0">
                  {/* Glowing Check-In Action Button (When inside geofence) */}
                  {isInside && (onCheckInNow || onCheckIn) ? (
                    <button
                      type="button"
                      onClick={handleCheckInAction}
                      className="w-full py-2.5 sm:py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/40"
                    >
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      <span>You Are Within 200m Geofence • Check In Now</span>
                    </button>
                  ) : null}

                  {/* Secondary Row: External Maps + Close Button */}
                  <div className="flex items-center gap-2">
                    <a
                      href={getNavigationUrl(registeredLat, registeredLng, registeredAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-200 hover:text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 border border-slate-700 shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[15px] text-sky-400">open_in_new</span>
                      <span>Google Maps App</span>
                    </a>

                    <button
                      type="button"
                      onClick={onClose}
                      className="py-2 px-4 bg-slate-900 hover:bg-slate-800 active:scale-95 text-slate-300 hover:text-white font-semibold rounded-xl text-xs transition-all border border-slate-700 shadow-sm cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* DESKTOP SIDE DRAWER: Turn-by-Turn Maneuvers (Visible on desktop when open) */}
          {/* ----------------------------------------------------------------------- */}
          {showDirectionsPanel && (
            <div className="hidden md:flex w-80 lg:w-96 bg-slate-950 border-l border-slate-800 flex-col shrink-0 transition-all duration-300">
              {/* Turn-by-Turn Header with Close (X) button */}
              <div className="p-3.5 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs shrink-0">
                <span className="font-extrabold text-white uppercase tracking-wider text-[11px] flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-400 text-base">directions</span>
                  Route Directions ({routeSteps.length})
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-['JetBrains_Mono']">OSRM ENGINE</span>
                  {/* Close button: Hides directions panel and expands map to full width */}
                  <button
                    type="button"
                    onClick={() => setShowDirectionsPanel(false)}
                    className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer border border-slate-700/80 shadow-xs"
                    title="Close Directions Panel (Full Map View)"
                    aria-label="Close directions panel to full map"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </div>

              {/* Maneuvers List */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs">
                {routeSteps.map((step, idx) => {
                  const isFinal = idx === routeSteps.length - 1;
                  return (
                    <div key={idx} className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-900 transition-colors flex items-start gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isFinal ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-sky-400 border border-slate-700'
                      }`}>
                        <span className="material-symbols-outlined text-[15px]">
                          {isFinal ? 'flag' : getManeuverIcon(step)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`capitalize ${isFinal ? 'font-bold text-emerald-400' : 'text-slate-200 font-medium'}`}>
                          {step.instruction}
                        </p>
                        {step.distanceMeters > 0 && (
                          <span className="text-[10px] text-slate-400 font-['JetBrains_Mono'] block mt-0.5">
                            {formatDistance(step.distanceMeters)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bottom Actions inside desktop drawer */}
              <div className="p-3.5 bg-slate-900/90 border-t border-slate-800 space-y-2 shrink-0">
                {isInside && (onCheckInNow || onCheckIn) && (
                  <button
                    type="button"
                    onClick={handleCheckInAction}
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white font-extrabold rounded-xl text-xs shadow-lg shadow-emerald-950 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-emerald-400/40"
                  >
                    <span className="material-symbols-outlined text-[16px]">verified</span>
                    You Are Here • Check In Now
                  </button>
                )}

                <a
                  href={getNavigationUrl(registeredLat, registeredLng, registeredAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 border border-slate-700 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[16px] text-sky-400">open_in_new</span>
                  Open External Google Maps App
                </a>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
