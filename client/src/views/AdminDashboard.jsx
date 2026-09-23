import React, { useEffect, useState } from 'react';
import StatusBadge from '../components/StatusBadge';
import GeoVisitMap from '../components/GeoVisitMap';
import { api } from '../api';

export default function AdminDashboard({
  currentUser,
  onNavigateTab
}) {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [masterData, setMasterData] = useState({ categories: [] });
  const [systemHealth, setSystemHealth] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [geoVisits, setGeoVisits] = useState([]);
  const [loading, setLoading] = useState(true);

  // New user modal/form state
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'TRADER',
    full_name: '',
    phone: '',
    organization_id: ''
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState('');
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);

  // GeoVisit Administration state
  const [selectedGeoVisitMap, setSelectedGeoVisitMap] = useState(null);
  const [overrideModalCase, setOverrideModalCase] = useState(null);
  const [adminOverrideReason, setAdminOverrideReason] = useState('');
  const [submittingAdminOverride, setSubmittingAdminOverride] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [uList, oList, mData, health, logs, gvList] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminOrganizations(),
        api.getAdminMasterData(),
        api.getSystemHealth(),
        api.getAuditLogs(),
        api.getGeoVisitAdminOverview().catch(() => [])
      ]);
      setUsers(Array.isArray(uList) ? uList : []);
      setOrganizations(Array.isArray(oList) ? oList : []);
      setMasterData(mData || { categories: [] });
      setSystemHealth(health);
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setGeoVisits(Array.isArray(gvList) ? gvList : []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUserStatus = async (userId, currentActive) => {
    try {
      await api.updateUserStatus(userId, !currentActive);
      setUsers(users.map(u => u.id === userId ? { ...u, active: !currentActive } : u));
    } catch (err) {
      alert('Failed to update user status: ' + err.message);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    setCreateError('');
    try {
      await api.createAdminUser(newUser);
      setShowCreateUser(false);
      setNewUser({
        email: '',
        password: '',
        role: 'TRADER',
        full_name: '',
        phone: '',
        organization_id: ''
      });
      await loadAdminData();
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreatingUser(false);
    }
  };

  const handleAdminOverride = async (e) => {
    e.preventDefault();
    if (!overrideModalCase || !adminOverrideReason.trim()) return;
    setSubmittingAdminOverride(true);
    try {
      await api.overrideGeoVisit(overrideModalCase.application_id, {
        reason: adminOverrideReason.trim()
      });
      setOverrideModalCase(null);
      setAdminOverrideReason('');
      await loadAdminData();
    } catch (err) {
      alert('Override failed: ' + err.message);
    } finally {
      setSubmittingAdminOverride(false);
    }
  };

  const roleColorMap = {
    TRADER: 'bg-blue-100 text-blue-800 border-blue-200',
    AUTHORITY: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    VERIFIER: 'bg-amber-100 text-amber-800 border-amber-200',
    GATC: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    PLATFORM_ADMIN: 'bg-purple-100 text-purple-800 border-purple-200'
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 text-xs">
        <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
        Loading Portal Administration Console...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-300 pb-16">
      {/* 1. Header & Security Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300 border border-white/20 shrink-0">
            <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-white tracking-tight">Portal Administration & Systems Governance</h1>
              <span className="text-[10px] uppercase font-mono font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                Platform Administrator
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Central metrology user directory, RBAC controls, master data registers, and MongoDB telemetry.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end md:self-center">
          <button
            onClick={loadAdminData}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl text-xs border border-white/20 transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">sync</span>
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* 2. Statutory Boundary Guard Alert */}
      <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-3">
        <span className="material-symbols-outlined text-purple-600 text-lg shrink-0 mt-0.5">verified_user</span>
        <div className="space-y-0.5">
          <strong className="font-bold text-purple-950">Statutory Architecture Notice — Separation of Administration vs Legal Authority:</strong>
          <p className="text-purple-800 leading-relaxed">
            Portal Admins manage user accounts, RBAC permissions, office registrations, and master technical categories. Portal Admins <strong>cannot</strong> make statutory legal verification determinations, verify physical instruments, or issue legal certificates. Statutory approvals remain exclusively with authorized Legal Metrology Officers.
          </p>
        </div>
      </div>

      {/* 3. High-Level Platform KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Total Users</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{users.length}</div>
          <span className="text-[10px] text-slate-400">Across 5 statutory roles</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Offices & Labs</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{organizations.length}</div>
          <span className="text-[10px] text-slate-400">Jurisdictional nodes</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Categories</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{masterData.categories?.length || 0}</div>
          <span className="text-[10px] text-slate-400">Schedule V definitions</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Audit Events</span>
          <div className="text-2xl font-extrabold text-slate-900 font-mono mt-1">{auditLogs.length}</div>
          <span className="text-[10px] text-slate-400">Tamper-evident logs</span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">System State</span>
          <div className="text-sm font-extrabold text-emerald-600 flex items-center gap-1 mt-2">
            <span className="material-symbols-outlined text-base">check_circle</span>
            {systemHealth?.status || 'ONLINE'}
          </div>
          <span className="text-[10px] text-slate-400">MongoDB Atlas Cluster</span>
        </div>
      </div>

      {/* 4. Tab Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-1.5 flex items-center gap-2 overflow-x-auto shadow-xs text-xs font-semibold">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'users' ? 'bg-primary text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">group</span>
          User & RBAC Management ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('offices')}
          className={`py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'offices' ? 'bg-primary text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">corporate_fare</span>
          Offices & Labs Directory ({organizations.length})
        </button>
        <button
          onClick={() => setActiveTab('master-data')}
          className={`py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'master-data' ? 'bg-primary text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">category</span>
          Instrument Master Categories
        </button>
        <button
          onClick={() => setActiveTab('telemetry')}
          className={`py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'telemetry' ? 'bg-primary text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">database</span>
          System Health & Telemetry
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'audit' ? 'bg-primary text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">history_edu</span>
          Audit Ledger ({auditLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('geovisit')}
          className={`py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shrink-0 ${
            activeTab === 'geovisit' ? 'bg-primary text-white shadow-xs font-bold' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <span className="material-symbols-outlined text-[17px]">pin_drop</span>
          GeoVisit Field Inspections ({geoVisits.length})
        </button>
      </div>

      {/* 5. Tab Content Panes */}

      {/* TAB 1: USERS & RBAC */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Platform Users Directory</h3>
              <p className="text-xs text-slate-500">Manage metrology platform accounts and role permissions</p>
            </div>
            <button
              onClick={() => setShowCreateUser(true)}
              className="px-4 py-2 bg-primary text-white font-bold rounded-xl text-xs hover:bg-primary-container shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              Provision User Account
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">User Particulars</th>
                  <th className="py-3 px-4">Role Assignment</th>
                  <th className="py-3 px-4">Organization / Office</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{u.full_name}</div>
                      <div className="font-mono text-[11px] text-slate-500">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${roleColorMap[u.role] || 'bg-slate-100 text-slate-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {u.organization_name || 'Independent Commercial Trader'}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono">
                      {u.phone || '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        u.active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {u.active !== false ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, u.active !== false)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                          u.active !== false
                            ? 'border-rose-200 text-rose-700 hover:bg-rose-50'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {u.active !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: OFFICES & LABS */}
      {activeTab === 'offices' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {organizations.map(org => (
            <div key={org.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                    org.type === 'GATC' ? 'bg-cyan-100 text-cyan-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {org.type === 'GATC' ? 'Approved Testing Laboratory' : 'Legal Metrology Office'}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm mt-1">{org.name}</h4>
                  <p className="text-xs text-slate-500">Jurisdiction: <strong>{(org.jurisdictions || []).join(', ') || '—'}</strong></p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                  <span className="material-symbols-outlined text-xl">
                    {org.type === 'GATC' ? 'science' : 'gavel'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-slate-100">
                <span>Node ID: <strong className="font-mono text-slate-700">{org.id}</strong></span>
                <span>Active Staff: <strong className="text-primary font-bold">{org.staff_count} Officers</strong></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: MASTER DATA */}
      {activeTab === 'master-data' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm">Statutory Instrument Categories & RuleSets</h3>
            <p className="text-xs text-slate-500">Official definitions under Legal Metrology General Rules, 2011</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {masterData.categories?.map(cat => (
              <div key={cat.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">{cat.code}</span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Active Specification</span>
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{cat.name}</h4>
                  <p className="text-slate-600 mt-1">{cat.description}</p>
                </div>
                {cat.ruleset && (
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Validity Period:</span>
                      <strong className="text-slate-800">{cat.ruleset.validity_period_months} Months</strong>
                    </div>
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Checklist Checkpoints:</span>
                      <strong className="text-slate-800">{cat.ruleset.checklist_schema?.length || 0} Mandated Items</strong>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: SYSTEM HEALTH */}
      {activeTab === 'telemetry' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Database & System Telemetry</h3>
              <p className="text-xs text-slate-500">Live operational telemetry from MongoDB Atlas and Node.js runtime</p>
            </div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {systemHealth?.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-[11px] uppercase">Database Connectivity</span>
              <div className="flex justify-between"><span className="text-slate-500">Provider:</span> <strong className="text-slate-800">{systemHealth?.database?.provider}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Status:</span> <strong className="text-emerald-700 font-bold">{systemHealth?.database?.status}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Connected:</span> <strong className="text-slate-800">{systemHealth?.database?.connected ? 'Yes' : 'No'}</strong></div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-[11px] uppercase">Node.js Runtime</span>
              <div className="flex justify-between"><span className="text-slate-500">Uptime:</span> <strong className="text-slate-800">{systemHealth?.system?.uptime_seconds} seconds</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Node Version:</span> <strong className="text-slate-800 font-mono">{systemHealth?.system?.node_version}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Platform:</span> <strong className="text-slate-800 capitalize">{systemHealth?.system?.platform}</strong></div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="font-bold text-slate-900 block text-[11px] uppercase">Memory Footprint</span>
              <div className="flex justify-between"><span className="text-slate-500">RSS Memory:</span> <strong className="text-slate-800 font-mono">{systemHealth?.system?.memory?.rss_mb} MB</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Heap Used:</span> <strong className="text-slate-800 font-mono">{systemHealth?.system?.memory?.heap_used_mb} MB</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Heap Total:</span> <strong className="text-slate-800 font-mono">{systemHealth?.system?.memory?.heap_total_mb} MB</strong></div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <span className="font-bold text-slate-900 block text-[11px] uppercase">MongoDB Documents Count</span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Users</span><strong>{systemHealth?.counts?.users}</strong></div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Instruments</span><strong>{systemHealth?.counts?.instruments}</strong></div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Applications</span><strong>{systemHealth?.counts?.applications}</strong></div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Certificates</span><strong>{systemHealth?.counts?.certificates}</strong></div>
              <div className="bg-white p-2.5 rounded-lg border border-slate-200"><span className="text-slate-400 block text-[10px]">Audit Logs</span><strong>{systemHealth?.counts?.audit_logs}</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">System Audit Ledger</h3>
              <p className="text-xs text-slate-500">Immutable ledger of all administrative and statutory actions</p>
            </div>
            <span className="text-xs font-mono text-slate-400">Total: {auditLogs.length} events</span>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="py-2.5 px-4">Timestamp</th>
                  <th className="py-2.5 px-4">Action</th>
                  <th className="py-2.5 px-4">Entity</th>
                  <th className="py-2.5 px-4">Actor</th>
                  <th className="py-2.5 px-4">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="font-mono font-bold text-primary">{log.action}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-700">
                      {log.entity_name} ({log.entity_id?.slice(0, 12)}...)
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-800">
                        {log.actor_role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        onClick={() => setSelectedAuditLog(log)}
                        className="text-primary hover:underline text-[11px] font-semibold"
                      >
                        Inspect Payload
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: GEOVISIT FIELD INSPECTIONS */}
      {activeTab === 'geovisit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="font-bold text-slate-900 text-sm">GeoVisit Field Verification Telemetry & Evidence Ledger</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory proof of physical arrival for LMO/GATC field visits before technical testing • Geofence threshold: 200m
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={loadAdminData}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">sync</span>
                Refresh Ledger
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[950px]">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Officer (Inspector)</th>
                  <th className="py-3 px-4">Trader & Application</th>
                  <th className="py-3 px-4">Registered Premises</th>
                  <th className="py-3 px-4">Scheduled</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Check-Out</th>
                  <th className="py-3 px-4">Distance & Accuracy</th>
                  <th className="py-3 px-4">GeoVisit Status</th>
                  <th className="py-3 px-4">Verification</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {geoVisits.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-12 text-center text-slate-400">
                      No field inspection GeoVisit records found.
                    </td>
                  </tr>
                ) : (
                  geoVisits.map((gv) => {
                    const isVerified = ['LOCATION_VERIFIED', 'VERIFICATION_IN_PROGRESS', 'LOCATION_EXIT_DETECTED', 'VISIT_COMPLETED', 'OVERRIDE_USED'].includes(gv.geovisit_status);
                    return (
                      <tr key={gv.application_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{gv.officer_name || 'Unassigned'}</div>
                          <span className="font-mono text-[10px] text-slate-400 block">{gv.officer_id || '—'}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{gv.trader_name}</div>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[160px]">{gv.instrument_type}</span>
                          <span className="font-mono text-[10px] text-primary">{gv.application_no}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-slate-700 truncate max-w-[180px]" title={gv.registered_address || gv.location}>
                            {gv.registered_address || gv.location}
                          </div>
                          <span className="font-mono text-[10px] text-slate-400 block">
                            {gv.registered_latitude ? `${Number(gv.registered_latitude).toFixed(4)}°N, ${Number(gv.registered_longitude).toFixed(4)}°E` : 'Coords missing'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-700 block">
                            {gv.scheduled_date ? new Date(gv.scheduled_date).toLocaleDateString() : 'Pending'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {gv.time_slot ? gv.time_slot.replace('_', ' ') : '11:00 AM'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {gv.check_in_time ? (
                            <div>
                              <span className="font-bold text-emerald-700 block">
                                {new Date(gv.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(gv.check_in_time).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {gv.check_out_time ? (
                            <div>
                              <span className="font-bold text-slate-900 block">
                                {new Date(gv.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {new Date(gv.check_out_time).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {gv.check_in_distance !== null && gv.check_in_distance !== undefined ? (
                            <div>
                              <span className="font-mono font-bold text-slate-900 block">
                                {gv.check_in_distance} m
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                Acc: ±{gv.check_in_accuracy ?? 8} m
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Awaiting Check-in</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {gv.geovisit_status === 'NOT_STARTED' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              NOT STARTED
                            </span>
                          )}
                          {gv.geovisit_status === 'CHECK_IN_PENDING' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                              CHECK-IN PENDING
                            </span>
                          )}
                          {gv.geovisit_status === 'LOCATION_VERIFIED' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                              LOCATION VERIFIED
                            </span>
                          )}
                          {gv.geovisit_status === 'VERIFICATION_IN_PROGRESS' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse"></span>
                              IN PROGRESS
                            </span>
                          )}
                          {gv.geovisit_status === 'LOCATION_EXIT_DETECTED' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 w-fit">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                              EXIT DETECTED
                            </span>
                          )}
                          {gv.geovisit_status === 'VISIT_COMPLETED' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                              VISIT COMPLETED
                            </span>
                          )}
                          {gv.geovisit_status === 'OVERRIDE_USED' && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                              OVERRIDE USED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={gv.verification_status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setSelectedGeoVisitMap(gv)}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors flex items-center gap-1"
                              title="Inspect Geofence Map"
                            >
                              <span className="material-symbols-outlined text-[15px] text-primary">map</span>
                              Map
                            </button>
                            {!isVerified && (
                              <button
                                onClick={() => setOverrideModalCase(gv)}
                                className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-semibold text-[11px] transition-colors"
                                title="Apply Statutory Authority Override"
                              >
                                Override
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* GeoVisit Map View Modal */}
      {selectedGeoVisitMap && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">map</span>
                <h3 className="font-bold text-slate-900 text-sm">
                  GeoVisit Physical Arrival Inspection Map — {selectedGeoVisitMap.application_no}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGeoVisitMap(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="text-xs text-slate-600 flex justify-between items-center">
              <div>
                <strong>Officer:</strong> {selectedGeoVisitMap.officer_name || 'LMO Officer'} •{' '}
                <strong>Trader:</strong> {selectedGeoVisitMap.trader_name}
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                Geofence: {selectedGeoVisitMap.geofence_radius || 200}m
              </span>
            </div>

            <GeoVisitMap
              registeredLat={selectedGeoVisitMap.registered_latitude || 19.1110}
              registeredLng={selectedGeoVisitMap.registered_longitude || 72.9280}
              registeredAddress={selectedGeoVisitMap.registered_address || selectedGeoVisitMap.location}
              officerLat={selectedGeoVisitMap.check_in_latitude}
              officerLng={selectedGeoVisitMap.check_in_longitude}
              distance={selectedGeoVisitMap.check_in_distance}
              accuracy={selectedGeoVisitMap.check_in_accuracy}
              geofenceRadius={selectedGeoVisitMap.geofence_radius || 200}
              status={selectedGeoVisitMap.geovisit_status}
            />

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedGeoVisitMap(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Authority Override Modal */}
      {overrideModalCase && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-base">
                <span className="material-symbols-outlined text-purple-600">verified_user</span>
                <span>Statutory Authority Override</span>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModalCase(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1">
              <div><strong>Application:</strong> {overrideModalCase.application_no}</div>
              <div><strong>Trader:</strong> {overrideModalCase.trader_name}</div>
              <div><strong>Officer:</strong> {overrideModalCase.officer_name}</div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Applying an override authorizes the officer to start technical verification even if physical GPS check-in was outside the geofence or obstructed. <strong>This override is permanently recorded in the immutable audit trail with your identity and justification.</strong>
            </p>

            <form onSubmit={handleAdminOverride} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Statutory Justification & Rationale <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  value={adminOverrideReason}
                  onChange={(e) => setAdminOverrideReason(e.target.value)}
                  placeholder="e.g. Inspector arrived at basement cold-storage site where GPS signal is attenuated. Verified via physical phone call and trader confirmation."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalCase(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdminOverride || !adminOverrideReason.trim()}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs shadow-md transition-all disabled:opacity-50"
                >
                  {submittingAdminOverride ? 'Submitting Override...' : 'Confirm Authority Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inspect Audit Log Drawer */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer animate-backdrop-in"
            onClick={() => setSelectedAuditLog(null)}
          />
          <div
            className="fixed inset-y-0 right-0 z-50 flex flex-col h-full w-full sm:w-[85vw] md:w-1/2 lg:w-1/2 bg-white shadow-2xl border-l border-slate-200 animate-slide-in-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-slate-200 bg-white/95 backdrop-blur shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-2xl">receipt_long</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Audit Record Details</h3>
                  <p className="text-xs text-slate-500">Immutable governance ledger entry</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 text-xs">
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
                <div className="flex justify-between"><span className="text-slate-500">Action:</span> <strong className="font-mono text-primary">{selectedAuditLog.action}</strong></div>
                <div className="flex justify-between"><span className="text-slate-500">Entity:</span> <span>{selectedAuditLog.entity_name} ({selectedAuditLog.entity_id})</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Actor:</span> <span>{selectedAuditLog.actor_id} ({selectedAuditLog.actor_role})</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Timestamp:</span> <span>{selectedAuditLog.created_at}</span></div>
              </div>
              <div>
                <span className="text-slate-700 font-bold block mb-1">Audit Ledger Payload:</span>
                <pre className="p-4 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-96">
                  {JSON.stringify(selectedAuditLog.details, null, 2)}
                </pre>
              </div>
            </div>
            <div className="px-6 py-4 md:px-8 bg-slate-50/95 backdrop-blur border-t border-slate-200 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedAuditLog(null)}
                className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision User Drawer */}
      {showCreateUser && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm cursor-pointer animate-backdrop-in"
            onClick={() => setShowCreateUser(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-50 flex flex-col h-full w-full sm:w-[85vw] md:w-1/2 lg:w-1/2 bg-white shadow-2xl border-l border-slate-200 animate-slide-in-right cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 md:px-8 border-b border-slate-200 bg-white/95 backdrop-blur shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                  <span className="material-symbols-outlined text-2xl">person_add</span>
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Provision New User Account</h3>
                  <p className="text-xs text-slate-500">Assign statutory role and system credentials</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUser(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                title="Close"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form id="create-user-form" onSubmit={handleCreateUser} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-4 text-xs">
              {createError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                  {createError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.full_name}
                    onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                    placeholder="e.g. Dr. Rajesh Kumar"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="e.g. rajesh.kumar@certifymetric.local"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Statutory Role Assignment *</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white font-medium"
                  >
                    <option value="TRADER">TRADER (Commercial Applicant / Owner)</option>
                    <option value="AUTHORITY">AUTHORITY (Legal Metrology Officer / Approver)</option>
                    <option value="VERIFIER">VERIFIER (Field Inspector)</option>
                    <option value="GATC">GATC (Laboratory Testing Centre)</option>
                    <option value="PLATFORM_ADMIN">PLATFORM_ADMIN (System Administration)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Organization / Office</label>
                  <select
                    value={newUser.organization_id}
                    onChange={e => setNewUser({ ...newUser, organization_id: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white font-medium"
                  >
                    <option value="">Independent / None</option>
                    {organizations.map(o => (
                      <option key={o.id} value={o.id}>{o.name} ({o.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number (Optional)</label>
                  <input
                    type="text"
                    value={newUser.phone}
                    onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                  />
                </div>
              </div>
            </form>

            <div className="px-6 py-4 md:px-8 bg-slate-50/95 backdrop-blur border-t border-slate-200 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateUser(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="create-user-form"
                disabled={creatingUser}
                className="px-5 py-2 bg-primary hover:bg-primary-container text-white rounded-lg text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
              >
                {creatingUser ? 'Provisioning...' : 'Provision User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
