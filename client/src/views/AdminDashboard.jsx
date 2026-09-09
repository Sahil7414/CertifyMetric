import React, { useEffect, useState } from 'react';
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

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const [uList, oList, mData, health, logs] = await Promise.all([
        api.getAdminUsers(),
        api.getAdminOrganizations(),
        api.getAdminMasterData(),
        api.getSystemHealth(),
        api.getAuditLogs()
      ]);
      setUsers(Array.isArray(uList) ? uList : []);
      setOrganizations(Array.isArray(oList) ? oList : []);
      setMasterData(mData || { categories: [] });
      setSystemHealth(health);
      setAuditLogs(Array.isArray(logs) ? logs : []);
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
                  <p className="text-xs text-slate-500">Jurisdiction: <strong>{org.jurisdiction}</strong></p>
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

      {/* Inspect Audit Log Modal */}
      {selectedAuditLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">Audit Record Details</h3>
              <button onClick={() => setSelectedAuditLog(null)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span className="text-slate-500">Action:</span> <strong className="font-mono text-primary">{selectedAuditLog.action}</strong></div>
              <div className="flex justify-between"><span className="text-slate-500">Entity:</span> <span>{selectedAuditLog.entity_name} ({selectedAuditLog.entity_id})</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Actor:</span> <span>{selectedAuditLog.actor_id} ({selectedAuditLog.actor_role})</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Timestamp:</span> <span>{selectedAuditLog.created_at}</span></div>
              <div className="pt-2">
                <span className="text-slate-500 block mb-1">Payload:</span>
                <pre className="p-3 bg-slate-900 text-emerald-300 rounded-xl font-mono text-[11px] overflow-x-auto max-h-48">
                  {JSON.stringify(selectedAuditLog.details, null, 2)}
                </pre>
              </div>
            </div>
            <div className="text-right pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Provision User Modal */}
      {showCreateUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form onSubmit={handleCreateUser} className="bg-white rounded-2xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Provision New User Account</h3>
                <p className="text-xs text-slate-500">Assign statutory role and system credentials</p>
              </div>
              <button type="button" onClick={() => setShowCreateUser(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
                {createError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={e => setNewUser({ ...newUser, full_name: e.target.value })}
                  placeholder="e.g. Dr. Rajesh Kumar"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="e.g. rajesh.kumar@certifymetric.local"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Statutory Role Assignment</label>
                <select
                  value={newUser.role}
                  onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCreateUser(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingUser}
                className="px-5 py-2 bg-primary hover:bg-primary-container text-white rounded-xl text-xs font-bold shadow-xs"
              >
                {creatingUser ? 'Provisioning...' : 'Provision User'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
