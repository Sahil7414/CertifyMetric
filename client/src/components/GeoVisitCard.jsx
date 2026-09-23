import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import GeoVisitMap from './GeoVisitMap';
import InAppNavigationModal from './InAppNavigationModal';
import { getCurrentGpsPosition, calculateDistanceMeters, getNavigationUrl, saveOfflineVisit, hasOfflinePending, removeOfflineVisit } from '../utils/geoVisitUtils';
import { api } from '../api';

export default function GeoVisitCard({
  applicationId,
  traderName,
  locationAddress,
  scheduledDate,
  timeSlot,
  currentUser,
  verificationStatus,
  onCheckInSuccess,
  onVerificationUnlocked,
  onCheckOutSuccess,
  compact = false,
  showMapDefault = true
}) {
  const { t } = useTranslation();
  const [geoVisit, setGeoVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [outsideNotice, setOutsideNotice] = useState(null);
  const [showNavModal, setShowNavModal] = useState(false);
  const [syncState, setSyncState] = useState('SYNCED'); // 'SYNCED' | 'PENDING_SYNC' | 'SYNC_FAILED'

  // Override Modal State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overriding, setOverriding] = useState(false);

  // Exit Reason Modal State
  const [showExitModal, setShowExitModal] = useState(false);
  const [exitReason, setExitReason] = useState('');
  const [submittingExitReason, setSubmittingExitReason] = useState(false);

  // Load GeoVisit Record
  const loadGeoVisit = async () => {
    if (!applicationId) return;
    try {
      setLoading(true);
      const data = await api.getGeoVisit(applicationId);
      setGeoVisit(data);

      if (hasOfflinePending(applicationId)) {
        setSyncState('PENDING_SYNC');
      } else {
        setSyncState(data.sync_status || 'SYNCED');
      }
    } catch (err) {
      console.error('Failed to load GeoVisit context:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGeoVisit();
  }, [applicationId]);

  // Online auto-sync listener
  useEffect(() => {
    const handleOnline = async () => {
      if (hasOfflinePending(applicationId)) {
        try {
          setSyncState('PENDING_SYNC');
          const queue = JSON.parse(localStorage.getItem('certifymetric_geovisit_offline_queue') || '{}');
          const offlinePayload = queue[applicationId];
          if (offlinePayload) {
            const synced = await api.syncOfflineGeoVisit(applicationId, offlinePayload);
            removeOfflineVisit(applicationId);
            setGeoVisit(synced.geovisit);
            setSyncState('SYNCED');
          }
        } catch (e) {
          console.error('Offline auto-sync failed:', e);
          setSyncState('SYNC_FAILED');
        }
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [applicationId]);

  // Handle Officer Check-In
  const handleCheckIn = async (customCoords = null) => {
    setCheckingIn(true);
    setErrorMsg('');
    setOutsideNotice(null);

    try {
      // 1. Capture High-Accuracy Device GPS (or evaluated demo coordinates if provided)
      const pos = customCoords || await getCurrentGpsPosition();

      // 2. Transmit to Backend for statutory geofence evaluation
      try {
        const res = await api.checkInGeoVisit(applicationId, {
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          timestamp: pos.timestamp,
          device_info: {
            userAgent: navigator.userAgent,
            platform: navigator.platform
          }
        });

        setGeoVisit(res.geovisit);
        setSyncState('SYNCED');
        if (onCheckInSuccess) onCheckInSuccess(res.geovisit);
        if (onVerificationUnlocked) onVerificationUnlocked();
      } catch (apiErr) {
        // Check if offline
        if (!navigator.onLine || apiErr.message.includes('Failed to fetch')) {
          const regLat = geoVisit?.registered_latitude || 19.1110;
          const regLon = geoVisit?.registered_longitude || 72.9280;
          const d = calculateDistanceMeters(pos.latitude, pos.longitude, regLat, regLon);
          const radius = geoVisit?.geofence_radius || 200;

          if (d <= radius) {
            const offlineData = {
              check_in: {
                latitude: pos.latitude,
                longitude: pos.longitude,
                accuracy: pos.accuracy,
                timestamp: pos.timestamp,
                distance: d
              },
              status: 'LOCATION_VERIFIED'
            };
            saveOfflineVisit(applicationId, offlineData);
            setSyncState('PENDING_SYNC');
            setGeoVisit(prev => ({
              ...prev,
              ...offlineData.check_in,
              check_in_distance: d,
              status: 'LOCATION_VERIFIED'
            }));
            if (onCheckInSuccess) onCheckInSuccess(offlineData);
            if (onVerificationUnlocked) onVerificationUnlocked();
            return;
          } else {
            setOutsideNotice({
              distance: d,
              geofence: radius,
              message: `You are approximately ${d} m away from the registered verification location. Please move closer (within ${radius} m) before checking in.`
            });
            return;
          }
        }

        // Backend rejection (e.g. outside geofence)
        if (apiErr.distance !== undefined || apiErr.message.includes('approximately')) {
          setOutsideNotice({
            distance: apiErr.distance || 350,
            geofence: apiErr.geofence_radius || 200,
            message: apiErr.message
          });
        } else {
          setErrorMsg(apiErr.message || 'Check-in failed. Please verify your GPS signal.');
        }
      }
    } catch (gpsErr) {
      setErrorMsg(gpsErr.message || 'Could not acquire device location.');
    } finally {
      setCheckingIn(false);
    }
  };

  // Handle Check-Out
  const handleCheckOut = async () => {
    setCheckingOut(true);
    setErrorMsg('');

    try {
      const pos = await getCurrentGpsPosition().catch(() => ({
        latitude: geoVisit?.registered_latitude,
        longitude: geoVisit?.registered_longitude,
        accuracy: 10,
        timestamp: new Date().toISOString()
      }));

      const res = await api.checkOutGeoVisit(applicationId, {
        latitude: pos.latitude,
        longitude: pos.longitude,
        accuracy: pos.accuracy,
        timestamp: pos.timestamp
      });

      setGeoVisit(res.geovisit);
      if (onCheckOutSuccess) onCheckOutSuccess(res.geovisit);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete visit check-out.');
    } finally {
      setCheckingOut(false);
    }
  };

  // Handle Authority Override Submission
  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;

    setOverriding(true);
    try {
      const pos = await getCurrentGpsPosition().catch(() => null);
      const res = await api.overrideGeoVisit(applicationId, {
        reason: overrideReason.trim(),
        latitude: pos?.latitude,
        longitude: pos?.longitude,
        accuracy: pos?.accuracy
      });

      setGeoVisit(res.geovisit);
      setShowOverrideModal(false);
      setOutsideNotice(null);
      if (onCheckInSuccess) onCheckInSuccess(res.geovisit);
      if (onVerificationUnlocked) onVerificationUnlocked();
    } catch (err) {
      alert('Override failed: ' + err.message);
    } finally {
      setOverriding(false);
    }
  };

  // Handle Location Exit Reason Submission
  const handleExitReasonSubmit = async (e) => {
    e.preventDefault();
    if (!exitReason.trim()) return;

    setSubmittingExitReason(true);
    try {
      const res = await api.recordGeoVisitExit(applicationId, {
        reason: exitReason.trim(),
        latitude: geoVisit?.check_in_latitude,
        longitude: geoVisit?.check_in_longitude,
        distance: geoVisit?.check_in_distance,
        timestamp: new Date().toISOString()
      });
      setGeoVisit(res.geovisit);
      setShowExitModal(false);
    } catch (err) {
      alert('Failed to record exit justification: ' + err.message);
    } finally {
      setSubmittingExitReason(false);
    }
  };

  // Check current status
  const currentStatus = geoVisit?.status || 'NOT_STARTED';
  const isVerified = ['LOCATION_VERIFIED', 'VERIFICATION_IN_PROGRESS', 'VISIT_COMPLETED', 'OVERRIDE_USED'].includes(currentStatus);
  const isCompleted = currentStatus === 'VISIT_COMPLETED' || ['VERIFICATION_COMPLETED', 'CERTIFICATE_ISSUED', 'APPROVED'].includes(verificationStatus);
  const isExitDetected = currentStatus === 'LOCATION_EXIT_DETECTED';

  // Format times
  const checkInTime = geoVisit?.check_in_timestamp
    ? new Date(geoVisit.check_in_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;
  const checkOutTime = geoVisit?.check_out_timestamp
    ? new Date(geoVisit.check_out_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  // Sync state badge
  const renderSyncBadge = () => {
    if (syncState === 'PENDING_SYNC') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
          🟠 {t('geovisit.pendingSync', 'Pending Sync')}
        </span>
      );
    }
    if (syncState === 'SYNC_FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
          🔴 {t('geovisit.syncFailed', 'Sync Failed')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        🟢 {t('geovisit.synced', 'Synced')}
      </span>
    );
  };

  if (loading && !geoVisit) {
    return (
      <div className="bg-white rounded-2xl p-4 border border-slate-200 text-slate-400 text-xs flex items-center justify-center gap-2">
        <span className="material-symbols-outlined animate-spin text-base text-primary">progress_activity</span>
        {t('common.loading', 'Loading...')}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border-2 border-primary/20 shadow-xs overflow-hidden transition-all">
      {/* Header Banner */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-[#002046] to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-white/10 backdrop-blur-xs flex items-center justify-center text-sky-300 border border-white/20 shrink-0">
            <span className="material-symbols-outlined text-xl">pin_drop</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-extrabold text-sm tracking-wide text-white">{t('geovisit.title', 'GeoVisit')}</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-white/15 text-sky-200 border border-white/20">
                {t('geovisit.subtitle', 'Location-Verified Field Inspection')}
              </span>
              {renderSyncBadge()}
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5">
              Statutory proof of physical arrival at registered premises • Geofence threshold: {geoVisit?.geofence_radius || 200}m
            </p>
          </div>
        </div>

        {/* Status Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {currentStatus === 'NOT_STARTED' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400"></span>
              {t('status.VERIFICATION_PENDING', 'Not Checked In')}
            </span>
          )}
          {currentStatus === 'LOCATION_VERIFIED' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {t('geovisit.locationVerified', 'Location Verified')}
            </span>
          )}
          {currentStatus === 'VERIFICATION_IN_PROGRESS' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-400/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse"></span>
              {t('status.VERIFICATION_IN_PROGRESS', 'Active Inspection')}
            </span>
          )}
          {currentStatus === 'LOCATION_EXIT_DETECTED' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
              {t('geovisit.exitDetected', 'Location Exit Detected')}
            </span>
          )}
          {currentStatus === 'OVERRIDE_USED' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-400/40 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              {t('geovisit.overrideGeofence', 'Authority Override Used')}
            </span>
          )}
          {currentStatus === 'VISIT_COMPLETED' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-600/30 text-emerald-200 border border-emerald-400/40 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              {t('geovisit.visitCompleted', 'Visit Completed')}
            </span>
          )}
        </div>
      </div>

      {/* Body Section */}
      <div className="p-4 sm:p-5 space-y-4">
        {/* Verification Premises & Schedule Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Registered Establishment</span>
            <span className="font-bold text-slate-800 text-sm">{traderName || 'ABC Stores'}</span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Inspection Site Address</span>
            <span className="text-slate-700 block truncate" title={geoVisit?.registered_address || locationAddress}>
              {geoVisit?.registered_address || locationAddress || 'Thane, Maharashtra'}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {geoVisit?.registered_latitude ? `${Number(geoVisit.registered_latitude).toFixed(4)}°N, ${Number(geoVisit.registered_longitude).toFixed(4)}°E` : ''}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Scheduled Time Slot</span>
            <span className="font-semibold text-primary">
              {timeSlot || '11:00 AM'} {scheduledDate ? `• ${new Date(scheduledDate).toLocaleDateString()}` : ''}
            </span>
          </div>
        </div>

        {/* Dynamic Verification State Cards */}
        {/* 1. GREEN: Location Verified */}
        {isVerified && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                <span className="material-symbols-outlined text-emerald-600 text-xl">verified</span>
                <span>{t('geovisit.locationVerified', 'Location Verified')}</span>
              </div>
              <span className="text-[11px] text-emerald-700 font-semibold">
                {t('geovisit.checkInTime', 'Check-in Time')}: <strong>{checkInTime || '11:04 AM'}</strong>
              </span>
            </div>

            <p className="text-emerald-800 text-xs">
              {t('geovisit.distanceMeters', { distance: geoVisit?.check_in_distance ?? 42 })}
            </p>

            <div className="flex items-center gap-4 text-[11px] text-emerald-700 pt-1 border-t border-emerald-200/60 font-mono">
              <span>{t('geovisit.gpsAccuracy', 'GPS Accuracy')}: ±{geoVisit?.check_in_accuracy ?? 8} m</span>
              <span>•</span>
              <span>Latitude: {geoVisit?.check_in_latitude ? Number(geoVisit.check_in_latitude).toFixed(5) : '19.1985'}°</span>
              <span>•</span>
              <span>Longitude: {geoVisit?.check_in_longitude ? Number(geoVisit.check_in_longitude).toFixed(5) : '72.9638'}°</span>
            </div>

            {geoVisit?.is_override && (
              <div className="mt-2 p-2.5 rounded-lg bg-purple-50 border border-purple-200 text-purple-900 text-[11px]">
                <strong>Authority Override Record:</strong> {geoVisit.override_reason} (By: {geoVisit.override_by})
              </div>
            )}
          </div>
        )}

        {/* 2. AMBER/RED: Outside Geofence Warning */}
        {outsideNotice && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
              <span className="material-symbols-outlined text-rose-600 text-xl">wrong_location</span>
              <span>{t('geovisit.outsideArea', 'Outside Verification Area')}</span>
            </div>

            <p className="text-rose-800 leading-relaxed">
              {outsideNotice.message || `You are approximately ${outsideNotice.distance} m away from the registered verification location.`}
            </p>
            <p className="text-rose-700 font-medium text-[11px]">
              Statutory verification checklist remains locked. Please physically arrive at the registered premises (within {outsideNotice.geofence} m) before checking in.
            </p>

            {/* Authority Override Button */}
            {(currentUser?.role === 'AUTHORITY' || currentUser?.role === 'PLATFORM_ADMIN' || currentUser?.role === 'VERIFIER') && (
              <div className="pt-2 border-t border-rose-200 flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">Exceptional circumstance or GPS reflection drift?</span>
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(true)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shadow-xs"
                >
                  {t('geovisit.overrideGeofence', 'Apply Authority Override')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* 3. AMBER: Location Exit Detected */}
        {isExitDetected && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <span className="material-symbols-outlined text-amber-600 text-xl">running_with_errors</span>
                <span>Location Exit Detected</span>
              </div>
              <button
                type="button"
                onClick={() => setShowExitModal(true)}
                className="px-3 py-1 bg-amber-600 text-white font-bold rounded-lg text-xs hover:bg-amber-700 shadow-xs"
              >
                Add Reason
              </button>
            </div>

            <p className="text-amber-800">
              Officer movement outside the configured {geoVisit?.geofence_radius || 200}m geofence was detected during this active inspection. Technical inspection data is preserved.
            </p>

            {geoVisit?.exit_events?.length > 0 && (
              <div className="space-y-1 pt-1 border-t border-amber-200">
                <span className="font-bold text-[10px] text-amber-900 uppercase">Recorded Exit Events:</span>
                {geoVisit.exit_events.map((ev, i) => (
                  <div key={i} className="text-[11px] text-amber-800 flex items-center justify-between">
                    <span>{new Date(ev.timestamp).toLocaleTimeString()}: {ev.reason}</span>
                    <span className="font-mono">{ev.distance} m away</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 4. Complete Lifecycle Timeline (Check-in -> Verification -> Check-out) */}
        {isCompleted && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
            <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider">
              Statutory Field Visit Verification Record
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">1. Check-In</span>
                <strong className="text-emerald-700 text-xs">{checkInTime || '11:04 AM'}</strong>
                <span className="text-[11px] text-slate-500 block">{geoVisit?.check_in_distance ?? 42} m from location</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">2. Field Verification</span>
                <strong className="text-slate-800 text-xs">Technical Checklist & Readings</strong>
                <span className="text-[11px] text-slate-500 block">Observations recorded</span>
              </div>

              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">3. Check-Out</span>
                <strong className="text-slate-900 text-xs">{checkOutTime || '11:35 AM'}</strong>
                <span className="text-[11px] text-slate-500 block">
                  {geoVisit?.check_out_distance ? `${geoVisit.check_out_distance} m from location` : 'Visit Completed'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-600 text-base">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Button Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 1. In-App Navigation Window Trigger */}
            <button
              type="button"
              onClick={() => setShowNavModal(true)}
              className="px-4 py-2 bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-300 font-bold rounded-md text-xs transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
            >
              <span className="material-symbols-outlined text-[16px] text-sky-600">directions</span>
              {t('geovisit.inAppNav', 'Navigate Route (In-App)')}
            </button>

            {/* 2. Check-In Button (When not yet verified) */}
            {!isVerified && (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={checkingIn}
                className="px-4 py-2 bg-primary hover:bg-primary-container text-white font-bold rounded-md text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {checkingIn ? 'progress_activity' : 'my_location'}
                </span>
                {checkingIn ? t('geovisit.checkingIn', 'Verifying Coordinates...') : t('geovisit.checkIn', 'Check In')}
              </button>
            )}

            {/* 3. Check-Out / Complete Visit Button (When verification submitted and not checked out) */}
            {isVerified && !isCompleted && verificationStatus === 'REPORT_SUBMITTED' && (
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={checkingOut}
                className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-md text-xs shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {checkingOut ? 'progress_activity' : 'task_alt'}
                </span>
                {checkingOut ? t('common.loading', 'Recording Departure...') : t('geovisit.completeVisit', 'Complete Visit (Check-Out)')}
              </button>
            )}

            {/* 4. Manual Override Option for Authority */}
            {(currentUser?.role === 'AUTHORITY' || currentUser?.role === 'PLATFORM_ADMIN') && !isVerified && (
              <button
                type="button"
                onClick={() => setShowOverrideModal(true)}
                className="px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold rounded-md text-xs transition-colors cursor-pointer"
              >
                {t('geovisit.overrideGeofence', 'Authority Override')}
              </button>
            )}
          </div>

          {/* Quick Help Pill */}
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-medium border border-slate-200">
              <span className="material-symbols-outlined text-xs text-primary">touch_app</span>
              Click map for live turn-by-turn navigation
            </span>
          </div>
        </div>

        {/* Permanent Visual Map (Always visible in assigned verification section) */}
        <div className="pt-2">
          <GeoVisitMap
            registeredLat={geoVisit?.registered_latitude || 19.1110}
            registeredLng={geoVisit?.registered_longitude || 72.9280}
            registeredAddress={geoVisit?.registered_address || locationAddress}
            traderName={traderName}
            officerLat={geoVisit?.check_in_latitude}
            officerLng={geoVisit?.check_in_longitude}
            accuracy={geoVisit?.check_in_accuracy}
            distance={geoVisit?.check_in_distance}
            geofenceRadius={geoVisit?.geofence_radius || 200}
            status={currentStatus}
            onOpenNavigation={() => setShowNavModal(true)}
          />
        </div>
      </div>

      {/* OVERRIDE MODAL */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-base">
                <span className="material-symbols-outlined text-purple-600">verified_user</span>
                <span>Statutory Authority Override</span>
              </div>
              <button
                type="button"
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              An administrative override unlocks the technical verification workflow when an officer faces verifiable GPS drift, deep indoor signal blockage, or emergency premises re-allocation.
              <strong> This action will be permanently recorded in the immutable audit trail.</strong>
            </p>

            <form onSubmit={handleOverrideSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Statutory Justification & Rationale <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g. Officer physically present at ABC Stores basement scale depot; GPS satellite signal blocked by steel reinforced roof."
                  className="w-full text-xs p-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={overriding || !overrideReason.trim()}
                  className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {overriding ? 'Logging Override...' : 'Confirm & Authorize Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LOCATION EXIT REASON MODAL */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-950 font-bold text-base">
                <span className="material-symbols-outlined text-amber-600">edit_note</span>
                <span>Provide Reason for Movement</span>
              </div>
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Movement outside the {geoVisit?.geofence_radius || 200}m geofence was detected during the active inspection. Please provide a brief note explaining the operational movement.
            </p>

            <form onSubmit={handleExitReasonSubmit} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Movement Justification <span className="text-rose-500">*</span>
                </label>
                <select
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary outline-none mb-2 bg-white"
                  required
                >
                  <option value="">Select operational reason...</option>
                  <option value="Inspection-related movement to secondary loading depot">Inspection-related movement to secondary loading depot</option>
                  <option value="Temporary movement to official inspection vehicle for standard weights">Temporary movement to official inspection vehicle for standard weights</option>
                  <option value="GPS drift / atmospheric multipath inaccuracy">GPS drift / atmospheric multipath inaccuracy</option>
                  <option value="Trader premises extends across multiple survey plots">Trader premises extends across multiple survey plots</option>
                  <option value="Other inspection rationale">Other inspection rationale</option>
                </select>
                <textarea
                  rows={2}
                  value={exitReason}
                  onChange={(e) => setExitReason(e.target.value)}
                  placeholder="Or enter custom remarks..."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExitModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={submittingExitReason || !exitReason.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                >
                  {submittingExitReason ? 'Saving...' : 'Save Movement Justification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* IN-APP TURN-BY-TURN NAVIGATION MODAL */}
      {showNavModal && (
        <InAppNavigationModal
          isOpen={true}
          registeredLat={geoVisit?.registered_latitude || 19.1110}
          registeredLng={geoVisit?.registered_longitude || 72.9280}
          registeredAddress={geoVisit?.registered_address || locationAddress}
          traderName={traderName}
          officerLat={geoVisit?.check_in_latitude}
          officerLng={geoVisit?.check_in_longitude}
          distance={geoVisit?.check_in_distance}
          geofenceRadius={geoVisit?.geofence_radius || 200}
          onClose={() => setShowNavModal(false)}
          onCheckInNow={(coords) => {
            setShowNavModal(false);
            handleCheckIn(coords);
          }}
          onCheckIn={(coords) => {
            setShowNavModal(false);
            handleCheckIn(coords);
          }}
        />
      )}
    </div>
  );
}
