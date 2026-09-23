import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { formatDistance } from '../utils/geoVisitUtils';

export default function GeoVisitMap({
  registeredLat,
  registeredLng,
  registeredAddress = 'Registered Verification Location',
  traderName = 'Commercial Trader',
  officerLat,
  officerLng,
  accuracy,
  distance,
  geofenceRadius = 200,
  status = 'NOT_STARTED',
  className = '',
  onOpenNavigation
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  const rLat = Number(registeredLat) || 19.1982;
  const rLng = Number(registeredLng) || 72.9636;
  const hasOfficer = officerLat !== undefined && officerLat !== null && officerLng !== undefined && officerLng !== null;
  const oLat = hasOfficer ? Number(officerLat) : null;
  const oLng = hasOfficer ? Number(officerLng) : null;

  const isVerified = ['LOCATION_VERIFIED', 'VERIFICATION_IN_PROGRESS', 'VISIT_COMPLETED', 'OVERRIDE_USED'].includes(status);
  const isInside = (distance !== undefined && distance !== null && distance <= geofenceRadius) || isVerified;

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Remove any previous map instance on re-render
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false // Keep parent page scroll smooth
    });
    mapInstanceRef.current = map;

    // Standard OpenStreetMap crisp tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // 1. Registered Trader Site Pin (Clean vector badge with applied coordinates)
    const traderIcon = L.divIcon({
      className: 'custom-trader-marker',
      html: `
        <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -100%);">
          <div style="background:#0f172a; color:#f8fafc; font-size:11px; font-weight:700; padding:4px 9px; border-radius:4px; border:1px solid #334155; box-shadow:0 4px 12px rgba(0,0,0,0.3); white-space:nowrap; display:flex; align-items:center; gap:6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-3"/><rect x="9" y="9" width="2" height="2"/><rect x="9" y="13" width="2" height="2"/><rect x="9" y="17" width="2" height="2"/></svg>
            <span style="font-family:'Inter',sans-serif;">${traderName}</span>
            <span style="font-size:9px; background:#e11d48; color:white; padding:1px 4px; border-radius:2px; font-family:'JetBrains Mono',monospace; font-weight:700;">PREMISES</span>
          </div>
          <div style="background:#1e293b; color:#fb7185; font-family:'JetBrains Mono',monospace; font-size:9.5px; font-weight:700; padding:2px 7px; border-radius:3px; border:1px solid #e11d48; margin-top:2px; white-space:nowrap; box-shadow:0 2px 5px rgba(0,0,0,0.35); display:flex; align-items:center; gap:4px;">
            <span style="color:#f43f5e;">📍</span>
            <span>${rLat.toFixed(5)}°N, ${rLng.toFixed(5)}°E</span>
          </div>
          <svg width="14" height="8" viewBox="0 0 14 8" style="margin-top:-1px;"><polygon points="0,0 14,0 7,8" fill="#1e293b"/></svg>
          <div style="width:6px; height:6px; background:#e11d48; border-radius:50%; border:1.5px solid white; margin-top:-3px; box-shadow:0 0 6px rgba(225,29,72,0.8);"></div>
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
          📍 Applied Coordinates:<br/>
          Lat: ${rLat.toFixed(6)}° N<br/>
          Lng: ${rLng.toFixed(6)}° E
        </div>
      </div>
    `);

    // 2. Geofence Circle (True circular metric perimeter)
    const geofenceCircle = L.circle([rLat, rLng], {
      radius: Number(geofenceRadius) || 200,
      color: isInside ? '#059669' : '#d97706',
      fillColor: isInside ? '#10b981' : '#f59e0b',
      fillOpacity: 0.1,
      weight: 1.5,
      dashArray: '6, 6'
    }).addTo(map);

    // Attach click triggers to open in-app navigation window
    if (onOpenNavigation) {
      map.on('click', () => onOpenNavigation());
      geofenceCircle.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onOpenNavigation();
      });
      targetMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onOpenNavigation();
      });
    }

    // Compute safe bounding box for geofence circle (failsafe against layerPointToLatLng)
    const latDelta = (Number(geofenceRadius) || 200) / 111320;
    const lngDelta = (Number(geofenceRadius) || 200) / (111320 * Math.cos(rLat * (Math.PI / 180)));
    const circleBounds = L.latLngBounds(
      [rLat - latDelta * 1.5, rLng - lngDelta * 1.5],
      [rLat + latDelta * 1.5, rLng + lngDelta * 1.5]
    );

    // 3. Officer Check-In Position (if coordinates present)
    if (hasOfficer && oLat !== null && oLng !== null) {
      const officerIcon = L.divIcon({
        className: 'custom-officer-marker',
        html: `
          <div style="display:flex; flex-direction:column; align-items:center; transform: translate(-50%, -50%);">
            <div style="position:relative; width:26px; height:26px; display:flex; align-items:center; justify-content:center;">
              <div style="position:absolute; inset:0; border-radius:50%; background:#0284c7; opacity:0.25; animation:ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="position:relative; width:18px; height:18px; border-radius:50%; background:#0284c7; border:2px solid white; box-shadow:0 2px 8px rgba(2,132,199,0.5); display:flex; align-items:center; justify-content:center;">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="white"><polygon points="12,2 19,21 12,17 5,21"/></svg>
              </div>
            </div>
            <div style="background:#0b1329; color:#38bdf8; font-family:'JetBrains Mono',monospace; font-size:10px; font-weight:700; padding:2px 6px; border-radius:3px; border:1px solid #0284c7; margin-top:3px; white-space:nowrap; box-shadow:0 2px 6px rgba(0,0,0,0.35);">
              OFFICER • ${formatDistance(distance ?? 0)}
            </div>
          </div>
        `,
        iconSize: [0, 0]
      });

      const officerMarker = L.marker([oLat, oLng], { icon: officerIcon }).addTo(map);
      if (onOpenNavigation) {
        officerMarker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          onOpenNavigation();
        });
      }

      // Trajectory dashed line between officer and target
      L.polyline([[oLat, oLng], [rLat, rLng]], {
        color: '#0284c7',
        weight: 3,
        dashArray: '6, 6',
        opacity: 0.8
      }).addTo(map);

      // Fit bounds to show both officer and premises
      const bounds = L.latLngBounds([[oLat, oLng], [rLat, rLng]]);
      bounds.extend(circleBounds);
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 18 });
    } else {
      // Fit to geofence circle bounds
      map.fitBounds(circleBounds, { padding: [25, 25], maxZoom: 17 });
    }

    // Force map to adapt to container layout after rendering
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
  }, [rLat, rLng, oLat, oLng, geofenceRadius, isInside, distance, traderName, registeredAddress]);

  return (
    <div className={`relative rounded-lg overflow-hidden border border-slate-300 shadow-xs bg-slate-50 flex flex-col group ${className}`}>
      {/* Top Map Header / Indicator */}
      <div className="px-4 py-2.5 bg-white border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-base">pin_drop</span>
          <span className="font-bold text-slate-800">Verification Premises & Geofence Map</span>
          <span className="text-[10px] px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 font-['JetBrains_Mono'] border border-slate-200">
            Radius: {geofenceRadius}m
          </span>
        </div>

        {onOpenNavigation && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenNavigation();
            }}
            className="px-3.5 py-1.5 bg-primary hover:bg-primary-container text-white font-bold rounded-md text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <span className="material-symbols-outlined text-[15px]">turn_sharp_right</span>
            Open Turn-by-Turn Navigation
          </button>
        )}
      </div>

      {/* Map Container (Clicking opens navigation) */}
      <div
        className="relative w-full h-64 sm:h-72 cursor-pointer"
        onClick={() => {
          if (onOpenNavigation) onOpenNavigation();
        }}
      >
        <div ref={mapContainerRef} className="w-full h-full" style={{ zIndex: 1 }} />

        {/* Hover Cue Banner */}
        {onOpenNavigation && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onOpenNavigation();
            }}
            className="absolute bottom-3 right-3 z-20 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-semibold rounded-md shadow-md border border-slate-700 backdrop-blur flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-[15px] text-sky-400">touch_app</span>
            Click map for live route directions
          </button>
        )}

        {/* Live Distance Pill on map */}
        {distance !== undefined && distance !== null && (
          <div className="absolute top-3 left-3 z-10">
            <div className={`px-3 py-1 rounded-md shadow-md border backdrop-blur text-xs font-bold flex items-center gap-1.5 ${
              isInside
                ? 'bg-emerald-600/95 text-white border-emerald-500'
                : 'bg-amber-600/95 text-white border-amber-500'
            }`}>
              <span className="material-symbols-outlined text-[15px]">
                {isInside ? 'verified' : 'near_me'}
              </span>
              <span className="font-['JetBrains_Mono']">{formatDistance(distance)} from premises</span>
              {accuracy && <span className="text-[10px] font-['JetBrains_Mono'] opacity-80">(±{accuracy}m)</span>}
            </div>
          </div>
        )}
      </div>

      {/* Map Legend Footer */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-[11px] text-slate-600 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span>
            Registered Premises
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600"></span>
            Officer GPS Position
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full border border-emerald-500 bg-emerald-100"></span>
            {geofenceRadius}m Geofence Perimeter
          </span>
        </div>
        <span className="text-[10px] text-slate-400 font-mono">OpenStreetMap Standard</span>
      </div>
    </div>
  );
}
