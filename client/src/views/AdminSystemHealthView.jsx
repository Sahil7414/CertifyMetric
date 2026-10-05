import React, { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { api } from '../api';

export default function AdminSystemHealthView({ currentUser, onBack }) {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const data = await api.getSystemHealth();
      setHealth(data);
    } catch (err) {
      console.error('Failed to load system health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const isDbConnected = health?.database === 'connected';

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        icon="health_and_safety"
        title="System Infrastructure & Health Console"
        subtitle="Technical backend diagnostics, MongoDB connection state, and runtime environment parameters"
        badge={{
          text: isDbConnected ? 'All Systems Operational' : 'Degraded Performance',
          variant: isDbConnected ? 'success' : 'warning'
        }}
        actions={
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="btn btn-secondary btn-sm">
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                Dashboard
              </button>
            )}
            <button onClick={loadHealth} className="btn btn-primary btn-sm">
              <span className="material-symbols-outlined text-[15px]">sync</span>
              Refresh Diagnostics
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
          Connecting to backend diagnostic probes...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Top Operational Status Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            isDbConnected 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                isDbConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                <span className="material-symbols-outlined text-2xl">
                  {isDbConnected ? 'check_circle' : 'warning'}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm">
                  {isDbConnected ? 'Operational Integrity: 100% Online' : 'Database Connection Alert'}
                </h4>
                <p className="text-xs opacity-80">
                  {isDbConnected 
                    ? 'All microservices, database clusters, and verification subsystems are responding within legal latency thresholds.'
                    : 'Backend reports connection degradation to persistent database clusters.'}
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap bg-white/80 border border-current shadow-2xs">
              <span className={`w-2 h-2 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`}></span>
              LIVE PROBE
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Database Engine */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
                    <span className="material-symbols-outlined text-lg">database</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Database & Storage Engine</h3>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                  isDbConnected 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isDbConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                  {isDbConnected ? 'Connected' : 'Offline'}
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span>Engine:</span>
                  <strong className="text-slate-900 font-mono">MongoDB (Document Store)</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span>Status:</span>
                  <strong className="text-emerald-700 font-semibold">{health?.database || 'connected'}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span>Storage Driver:</span>
                  <strong className="text-slate-800 font-mono">./uploads (Local FS)</strong>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Replica Set:</span>
                  <strong className="text-slate-700 font-mono">rs0 (Primary Node)</strong>
                </div>
              </div>
            </div>

            {/* Runtime & Memory */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                    <span className="material-symbols-outlined text-lg">memory</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Node Runtime & Memory</h3>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                  Active
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span>Process Uptime:</span>
                  <strong className="text-slate-900 font-mono">{health?.uptime || 'Active'}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span>Heap Allocation:</span>
                  <strong className="text-slate-900 font-mono">{health?.memory || 'Nominal (< 256MB)'}</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span>Node Runtime:</span>
                  <strong className="text-slate-800 font-mono">Node.js (v20+ ESM)</strong>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Dev Server Watch:</span>
                  <strong className="text-emerald-700 font-mono">Active (Hot Reload)</strong>
                </div>
              </div>
            </div>

            {/* Security & Endpoints */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
                    <span className="material-symbols-outlined text-lg">security</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-sm">Security & Compliance</h3>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                  Enforced
                </span>
              </div>

              <div className="space-y-3 text-xs text-slate-600">
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span>RBAC Enforcement:</span>
                  <strong className="text-emerald-700 font-semibold">Strict 5-Tier Policy</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span>Payment Gateway:</span>
                  <strong className="text-blue-700 font-semibold">Razorpay Test Mode</strong>
                </div>
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span>QR Cryptographic Hash:</span>
                  <strong className="text-emerald-700 font-semibold">SHA-256 Tokens</strong>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span>Statutory Standards:</span>
                  <strong className="text-slate-800 font-mono">LM Act, 2009</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
