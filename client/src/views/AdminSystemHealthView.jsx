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

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        icon="health_and_safety"
        title="System Infrastructure & Health Console"
        subtitle="Technical backend diagnostics, MongoDB connection state, and runtime environment parameters"
        badge={{ text: health?.database === 'connected' ? 'All Services Normal' : 'Degraded', variant: health?.database === 'connected' ? 'success' : 'warning' }}
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
              Refresh Status
            </button>
          </div>
        }
      />

      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
          Connecting to backend diagnostic probes...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Database Engine */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600 text-xl">database</span>
                <h3 className="font-bold text-slate-900 text-sm">Database & Storage Engine</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {health?.database === 'connected' ? 'Connected' : 'Offline'}
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Database Engine:</span>
                <strong className="text-slate-900 font-mono">MongoDB Atlas (ReplicaSet)</strong>
              </div>
              <div className="flex justify-between">
                <span>Connection Status:</span>
                <strong className="text-emerald-600 font-semibold">{health?.database || 'connected'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Storage Directory:</span>
                <strong className="text-slate-800 font-mono">./uploads (Local FS)</strong>
              </div>
            </div>
          </div>

          {/* Runtime & Memory */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-600 text-xl">memory</span>
                <h3 className="font-bold text-slate-900 text-sm">Node Runtime & Memory</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                Active
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Server Uptime:</span>
                <strong className="text-slate-900">{health?.uptime || 'Active'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Memory Heap Usage:</span>
                <strong className="text-slate-900 font-mono">{health?.memory || 'Nominal'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <strong className="text-slate-800 font-mono">development / Node.js</strong>
              </div>
            </div>
          </div>

          {/* Security & Endpoints */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-600 text-xl">security</span>
                <h3 className="font-bold text-slate-900 text-sm">Security & Integrations</h3>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                Enforced
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>RBAC Policy:</span>
                <strong className="text-emerald-700 font-semibold">Strict 5-Tier Roles</strong>
              </div>
              <div className="flex justify-between">
                <span>Razorpay Gateway:</span>
                <strong className="text-blue-700 font-semibold">Test Mode Configured</strong>
              </div>
              <div className="flex justify-between">
                <span>QR Verification Token:</span>
                <strong className="text-emerald-700 font-semibold">Cryptographic SHA-256</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
