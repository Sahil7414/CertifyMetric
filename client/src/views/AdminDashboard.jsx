import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api';

export default function AdminDashboard({ currentUser, onViewAuditLogs, onNavigateTab }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [masterData, setMasterData] = useState({ categories: [], rulesets: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');

  // Chart view toggle: 'line' | 'bar'
  const [chartViewApps, setChartViewApps] = useState('line');
  // Chart view toggle: 'pie' | 'bar'
  const [chartViewCerts, setChartViewCerts] = useState('pie');

  // Quick Add User Modal state
  const [showQuickAddUser, setShowQuickAddUser] = useState(false);
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [uList, oList, mData, logs, analytics] = await Promise.all([
        api.getAdminUsers().catch(() => []),
        api.getAdminOrganizations().catch(() => []),
        api.getAdminMasterData().catch(() => ({ categories: [], rulesets: [] })),
        api.getAuditLogs().catch(() => []),
        api.getAdminAnalytics(timeRange).catch(() => null)
      ]);

      setUsers(Array.isArray(uList) ? uList : []);
      setOrganizations(Array.isArray(oList) ? oList : []);
      setMasterData(mData || { categories: [], rulesets: [] });
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setAnalyticsData(analytics);
    } catch (err) {
      console.error('Failed to load admin dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

  const handleQuickCreateUser = async (e) => {
    e.preventDefault();
    setCreatingUser(true);
    setCreateError('');
    try {
      await api.createAdminUser(newUser);
      setShowQuickAddUser(false);
      setNewUser({
        email: '',
        password: '',
        role: 'TRADER',
        full_name: '',
        phone: '',
        organization_id: ''
      });
      await loadData();
    } catch (err) {
      setCreateError(err.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const navigateTo = (tab) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    }
  };

  // Real MongoDB Counts
  const safeUsers = Array.isArray(users) ? users : [];
  const safeOrgs = Array.isArray(organizations) ? organizations : [];
  const safeLogs = Array.isArray(auditLogs) ? auditLogs : [];
  const recentLogs = safeLogs.slice(0, 5);

  const totalUsersCount = analyticsData?.summary?.totalUsers ?? safeUsers.length;
  const activeUsersCount = analyticsData?.summary?.activeUsers ?? safeUsers.filter((u) => u.status === 'ACTIVE' || u.active !== false).length;
  const totalOrgsCount = analyticsData?.summary?.totalOrgs ?? safeOrgs.length;
  const totalInstrumentsCount = analyticsData?.summary?.totalInstruments ?? 0;
  const totalApplicationsCount = analyticsData?.summary?.totalApplications ?? analyticsData?.total_applications ?? 0;
  const totalCertificatesCount = analyticsData?.summary?.totalCertificates ?? analyticsData?.certificateStats?.issued ?? 0;
  const totalOfficesLabsCount = analyticsData?.summary?.totalOfficesLabs ?? safeOrgs.filter(o => ['OFFICE', 'LAB', 'AUTHORITY', 'GATC', 'STATUTORY_AUTHORITY', 'TEST_CENTRE'].includes(o.type)).length;
  const totalCategoriesCount = analyticsData?.summary?.totalCategories ?? (masterData?.categories || []).length;

  // Real Application Status Distribution
  const appStatusRaw = analyticsData?.applicationsByStatus || {};
  const statusItems = useMemo(() => [
    { key: 'SUBMITTED', label: 'Submitted', count: appStatusRaw.SUBMITTED || 0, color: 'bg-amber-500', text: 'text-amber-700' },
    { key: 'UNDER_REVIEW', label: 'Under Review', count: appStatusRaw.UNDER_REVIEW || 0, color: 'bg-blue-500', text: 'text-blue-700' },
    { key: 'ASSIGNED', label: 'Assigned / Scheduled', count: appStatusRaw.ASSIGNED || 0, color: 'bg-purple-500', text: 'text-purple-700' },
    { key: 'IN_VERIFICATION', label: 'In Progress', count: appStatusRaw.IN_VERIFICATION || 0, color: 'bg-indigo-500', text: 'text-indigo-700' },
    { key: 'REPORT_SUBMITTED', label: 'Report Submitted', count: appStatusRaw.REPORT_SUBMITTED || 0, color: 'bg-teal-500', text: 'text-teal-700' },
    { key: 'APPROVED', label: 'Approved', count: appStatusRaw.APPROVED || 0, color: 'bg-emerald-500', text: 'text-emerald-700' },
    { key: 'CERTIFICATE_ISSUED', label: 'Certified', count: appStatusRaw.CERTIFICATE_ISSUED || 0, color: 'bg-emerald-600', text: 'text-emerald-800' },
    { key: 'RETURNED', label: 'Returned', count: appStatusRaw.RETURNED || 0, color: 'bg-amber-600', text: 'text-amber-800' },
    { key: 'REJECTED', label: 'Rejected', count: appStatusRaw.REJECTED || 0, color: 'bg-rose-500', text: 'text-rose-700' }
  ], [appStatusRaw]);

  const totalStatusApps = useMemo(() => statusItems.reduce((acc, s) => acc + s.count, 0), [statusItems]);

  // Real Applications Over Time
  const appsTimeline = useMemo(() => Array.isArray(analyticsData?.applicationsOverTime) ? analyticsData.applicationsOverTime : [], [analyticsData]);
  const maxAppsInTimeline = useMemo(() => Math.max(...appsTimeline.map(d => d.count), 1), [appsTimeline]);

  // Real Verification Results
  const verifOutcomes = analyticsData?.verificationOutcomes || { PASS: 0, FAIL: 0, PENDING: 0, total: 0 };
  const totalVerifs = verifOutcomes.total || (verifOutcomes.PASS + verifOutcomes.FAIL + verifOutcomes.PENDING);
  const passRate = totalVerifs > 0 ? Math.round((verifOutcomes.PASS / totalVerifs) * 100) : 0;
  const failRate = totalVerifs > 0 ? Math.round((verifOutcomes.FAIL / totalVerifs) * 100) : 0;

  // Real Certificates Over Time
  const certsTimeline = useMemo(() => Array.isArray(analyticsData?.certificatesOverTime) ? analyticsData.certificatesOverTime : [], [analyticsData]);
  const maxCertsInTimeline = useMemo(() => Math.max(...certsTimeline.map(d => d.count), 1), [certsTimeline]);

  if (loading && !analyticsData) {
    return (
      <div className="space-y-4 w-full min-w-0 animate-pulse">
        <div className="h-32 skeleton rounded-2xl"></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-24 skeleton rounded-2xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 skeleton rounded-2xl"></div>
          <div className="h-64 skeleton rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full min-w-0 animate-in fade-in duration-300">
      
      {/* 1. Platform Administration Header */}
      <div className="bg-gradient-to-r from-[#001733] via-[#002046] to-[#1b365d] rounded-2xl p-5 sm:p-6 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-300">
              National Legal Metrology Portal Administration
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Platform Administration Console</h1>
          <p className="text-xs text-slate-300 mt-1">
            Administrator: <strong className="text-white">{currentUser?.full_name}</strong> · Statutory Governance & Operations Control
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-center shrink-0">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-full border border-white/20 outline-none cursor-pointer transition-all shadow-2xs"
          >
            <option value="7d" className="text-slate-900">Last 7 Days</option>
            <option value="30d" className="text-slate-900">Last 30 Days</option>
            <option value="6m" className="text-slate-900">Last 6 Months</option>
          </select>

          <button
            onClick={loadData}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-full border border-white/20 flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            title="Refresh Realtime Stats"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 2. Admin Operational KPI Summary (Real MongoDB Data) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5 sm:gap-3">
        {/* KPI 1: Users */}
        <div
          onClick={() => navigateTo('admin-users')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs hover:border-[#002046] hover:shadow-xs transition-all cursor-pointer group"
          title="Click to Manage Users"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Users</span>
            <span className="material-symbols-outlined text-sm group-hover:text-primary transition-colors">group</span>
          </div>
          <div className="text-xl font-extrabold text-[#002046]">{totalUsersCount}</div>
          <p className="text-[10px] text-blue-700 font-semibold mt-0.5 group-hover:underline flex items-center gap-0.5">
            <span>Manage</span>
            <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
          </p>
        </div>

        {/* KPI 2: Active Users */}
        <div
          onClick={() => navigateTo('admin-users')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group"
          title="Click to View Active Accounts"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Active</span>
            <span className="material-symbols-outlined text-sm text-emerald-600">how_to_reg</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-600">{activeUsersCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">Authenticated</p>
        </div>

        {/* KPI 3: Organizations */}
        <div
          onClick={() => navigateTo('admin-orgs')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs hover:border-blue-500 hover:shadow-xs transition-all cursor-pointer group"
          title="Click to View Organizations"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Orgs</span>
            <span className="material-symbols-outlined text-sm group-hover:text-blue-600 transition-colors">domain</span>
          </div>
          <div className="text-xl font-extrabold text-blue-600">{totalOrgsCount}</div>
          <p className="text-[10px] text-blue-700 font-semibold mt-0.5 group-hover:underline flex items-center gap-0.5">
            <span>View All</span>
            <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
          </p>
        </div>

        {/* KPI 4: Offices & Labs */}
        <div
          onClick={() => navigateTo('admin-orgs')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs hover:border-purple-500 hover:shadow-xs transition-all cursor-pointer group"
          title="Click to View Authority Offices & GATC Labs"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Offices/Labs</span>
            <span className="material-symbols-outlined text-sm group-hover:text-purple-600 transition-colors">apartment</span>
          </div>
          <div className="text-xl font-extrabold text-purple-600">{totalOfficesLabsCount}</div>
          <p className="text-[10px] text-slate-400 mt-0.5 font-medium truncate">Legal & GATC</p>
        </div>

        {/* KPI 5: Instruments */}
        <div
          onClick={() => navigateTo('instruments')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs hover:border-[#002046] hover:shadow-xs transition-all cursor-pointer group"
          title="Click to View Instruments Registry"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Instruments</span>
            <span className="material-symbols-outlined text-sm group-hover:text-primary transition-colors">scale</span>
          </div>
          <div className="text-xl font-extrabold text-slate-900">{totalInstrumentsCount}</div>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5 group-hover:underline flex items-center gap-0.5">
            <span>Registry</span>
            <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
          </p>
        </div>

        {/* KPI 6: Applications */}
        <div
          onClick={() => navigateTo('applications')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs hover:border-amber-500 hover:shadow-xs transition-all cursor-pointer group"
          title="Click to View Applications Queue"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Applications</span>
            <span className="material-symbols-outlined text-sm text-amber-500">receipt_long</span>
          </div>
          <div className="text-xl font-extrabold text-amber-600">{totalApplicationsCount}</div>
          <p className="text-[10px] text-amber-700 font-semibold mt-0.5 group-hover:underline flex items-center gap-0.5">
            <span>View Queue</span>
            <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
          </p>
        </div>

        {/* KPI 7: Certificates */}
        <div
          onClick={() => navigateTo('certificates')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs hover:border-emerald-600 hover:shadow-xs transition-all cursor-pointer group"
          title="Click to View Statutory Certificates"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Certificates</span>
            <span className="material-symbols-outlined text-sm text-emerald-600">workspace_premium</span>
          </div>
          <div className="text-xl font-extrabold text-emerald-600">{totalCertificatesCount}</div>
          <p className="text-[10px] text-emerald-700 font-semibold mt-0.5 group-hover:underline flex items-center gap-0.5">
            <span>Issued</span>
            <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
          </p>
        </div>

        {/* KPI 8: Categories */}
        <div
          onClick={() => navigateTo('admin-master')}
          className="bg-white rounded-xl p-3 sm:p-3.5 border border-slate-200 shadow-2xs hover:border-indigo-500 hover:shadow-xs transition-all cursor-pointer group"
          title="Click to View Master Categories & Rulesets"
        >
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Categories</span>
            <span className="material-symbols-outlined text-sm group-hover:text-indigo-600 transition-colors">tune</span>
          </div>
          <div className="text-xl font-extrabold text-indigo-700">{totalCategoriesCount}</div>
          <p className="text-[10px] text-indigo-700 font-semibold mt-0.5 group-hover:underline flex items-center gap-0.5">
            <span>Rulesets</span>
            <span className="material-symbols-outlined text-[10px]">arrow_forward</span>
          </p>
        </div>
      </div>

      {/* 3. Administrative Control Center (Direct Links to Dedicated Management Pages) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-base">admin_panel_settings</span>
            Administrative Controls
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">Click any module to open its dedicated management console</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Control 1: Users & Roles */}
          <div
            onClick={() => navigateTo('admin-users')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-[#002046] hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-lg">group</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors">Users & Roles</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">Manage user credentials, role assignments, and account deactivation.</p>
            </div>
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-blue-700">
              <span>{safeUsers.length} Users</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </div>
          </div>

          {/* Control 2: Offices & Labs */}
          <div
            onClick={() => navigateTo('admin-orgs')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-purple-500 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-lg">apartment</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-purple-700 transition-colors">Offices & Labs</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">Statutory authority offices, GATC testing centers, and district jurisdictions.</p>
            </div>
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-purple-700">
              <span>{safeOrgs.length} Establishments</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </div>
          </div>

          {/* Control 3: Categories & Rulesets */}
          <div
            onClick={() => navigateTo('admin-master')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-amber-500 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-800 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-lg">tune</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-amber-800 transition-colors">Categories & Rulesets</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">Schedule IV rules, Maximum Permissible Error (MPE) thresholds, and base fees.</p>
            </div>
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-amber-800">
              <span>{(masterData?.categories || []).length} Categories</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </div>
          </div>

          {/* Control 4: Audit & Governance */}
          <div
            onClick={onViewAuditLogs || (() => navigateTo('audit-logs'))}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-lg">history_edu</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">Audit & Governance</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">Immutable statutory trail of officer decisions, allocation overrides, and changes.</p>
            </div>
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-emerald-800">
              <span>{safeLogs.length} Events</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </div>
          </div>

          {/* Control 5: System Operations & Health */}
          <div
            onClick={() => navigateTo('system-health')}
            className="p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
          >
            <div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center mb-2.5 group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-lg">health_and_safety</span>
              </div>
              <h3 className="text-xs font-bold text-slate-900 group-hover:text-slate-900 transition-colors">System Health</h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">Database probes, memory diagnostics, and background service health.</p>
            </div>
            <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-slate-700">
              <span>Inspect Health</span>
              <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. REAL OPERATIONAL GRAPHS (Row 1: Application Trends & Status Breakdown) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Graph 1: Application Filing Trend */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">trending_up</span>
                  Application Filing Trend
                </h3>
                <p className="text-[11px] text-slate-500">Real statutory filing volume timeline from MongoDB</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                  {totalApplicationsCount} Total Files
                </span>
                {/* Chart type toggle */}
                <div className="flex rounded-full border border-slate-200 overflow-hidden text-[10px] font-bold p-0.5 bg-slate-50">
                  <button
                    onClick={() => setChartViewApps('line')}
                    title="Line Graph"
                    className={`px-2.5 py-1 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer ${
                      chartViewApps === 'line' ? 'bg-[#002046] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">show_chart</span>
                  </button>
                  <button
                    onClick={() => setChartViewApps('bar')}
                    title="Vertical Bar Chart"
                    className={`px-2.5 py-1 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer ${
                      chartViewApps === 'bar' ? 'bg-[#002046] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">bar_chart</span>
                  </button>
                </div>
              </div>
            </div>

            {appsTimeline.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">timeline</span>
                <span>No application trend records for this range.</span>
              </div>
            ) : chartViewApps === 'line' ? (
              // SVG Line Graph
              (() => {
                const width = 500;
                const height = 160;
                const padding = { top: 25, bottom: 30, left: 40, right: 25 };
                const graphWidth = width - padding.left - padding.right;
                const graphHeight = height - padding.top - padding.bottom;

                const points = appsTimeline.map((item, idx) => {
                  const x = appsTimeline.length === 1 
                    ? padding.left + graphWidth / 2 
                    : padding.left + (idx / (appsTimeline.length - 1)) * graphWidth;
                  const yRatio = maxAppsInTimeline > 0 ? item.count / maxAppsInTimeline : 0;
                  const y = padding.top + graphHeight - (yRatio * graphHeight);
                  return { x, y, date: item.date, count: item.count };
                });

                const lineD = points.length === 1
                  ? `M ${padding.left},${points[0].y} L ${width - padding.right},${points[0].y}`
                  : `M ${points.map(p => `${p.x},${p.y}`).join(' L ')}`;

                const areaD = points.length === 1
                  ? `M ${padding.left},${height - padding.bottom} L ${padding.left},${points[0].y} L ${width - padding.right},${points[0].y} L ${width - padding.right},${height - padding.bottom} Z`
                  : `M ${points[0].x},${height - padding.bottom} L ${points.map(p => `${p.x},${p.y}`).join(' L ')} L ${points[points.length - 1].x},${height - padding.bottom} Z`;

                return (
                  <div className="h-44 w-full relative pt-1">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="appsLineGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#002046" stopOpacity="0.05" />
                        </linearGradient>
                      </defs>

                      {/* Grid lines */}
                      {[0, 0.5, 1].map((ratio, i) => {
                        const y = padding.top + graphHeight * (1 - ratio);
                        const val = Math.round(maxAppsInTimeline * ratio);
                        return (
                          <g key={i}>
                            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="#e2e8f0" strokeDasharray="3 3" />
                            <text x={padding.left - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontFamily="monospace">
                              {val}
                            </text>
                          </g>
                        );
                      })}

                      {/* Area Fill */}
                      <path d={areaD} fill="url(#appsLineGradient)" />

                      {/* Line */}
                      <path d={lineD} fill="none" stroke="#002046" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

                      {/* Data Dots */}
                      {points.map((p, i) => (
                        <g key={i} className="group cursor-pointer">
                          <circle cx={p.x} cy={p.y} r="5" fill="#002046" stroke="#ffffff" strokeWidth="2.5" className="transition-all group-hover:r-7" />
                          <text x={p.x} y={p.y - 9} textAnchor="middle" fontSize="10" fontWeight="bold" fill="#002046" fontFamily="monospace">
                            {p.count}
                          </text>
                          <text x={p.x} y={height - 8} textAnchor="middle" fontSize="9" fill="#64748b" fontFamily="monospace">
                            {p.date.slice(5)}
                          </text>
                        </g>
                      ))}
                    </svg>
                  </div>
                );
              })()
            ) : chartViewApps === 'bar' ? (
              // Vertical bar chart
              <div className="h-44 flex items-end gap-2 pt-6 pb-2 px-1">
                {appsTimeline.map((item) => {
                  const pct = Math.max(12, Math.round((item.count / maxAppsInTimeline) * 100));
                  return (
                    <div key={item.date} className="h-full flex-1 flex flex-col justify-end items-center gap-1.5 group min-w-0">
                      <div className="text-[10px] font-mono font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.count}
                      </div>
                      <div
                        style={{ height: `${pct}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-[#002046] to-blue-500 rounded-t-md transition-all group-hover:brightness-110"
                        title={`${item.date}: ${item.count} application(s)`}
                      />
                      <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                        {item.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Horizontal bar chart
              <div className="space-y-1.5 py-1 max-h-44 overflow-y-auto pr-1">
                {appsTimeline.map((item) => {
                  const pct = Math.max(4, Math.round((item.count / maxAppsInTimeline) * 100));
                  return (
                    <div key={item.date} className="flex items-center gap-2 group">
                      <span className="text-[9px] font-mono text-slate-500 w-10 shrink-0 text-right">{item.date.slice(5)}</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-[#002046] to-blue-500 rounded transition-all duration-500 group-hover:brightness-110"
                          title={`${item.date}: ${item.count} application(s)`}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-700 w-5 shrink-0">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Aggregated by submission date</span>
            <button onClick={() => navigateTo('applications')} className="font-semibold text-primary hover:underline">
              View Applications Registry →
            </button>
          </div>
        </div>

        {/* Graph 2: Application Status Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-500 text-base">pie_chart</span>
                  Application Status Distribution
                </h3>
                <p className="text-[11px] text-slate-500">Live operational lifecycle state distribution</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300">
                {totalStatusApps} Active Cases
              </span>
            </div>

            {totalStatusApps === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">donut_large</span>
                <span>No active verification applications filed yet.</span>
              </div>
            ) : (
              <div className="space-y-2 py-1 max-h-44 overflow-y-auto pr-1">
                {statusItems.filter(s => s.count > 0).map((s) => {
                  const pct = Math.round((s.count / totalStatusApps) * 100);
                  return (
                    <div key={s.key} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-800">{s.label}</span>
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <strong className={s.text}>{s.count}</strong>
                          <span className="text-slate-400">({pct}%)</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className={`h-full ${s.color} rounded-full transition-all duration-500`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Direct state transition metrics</span>
            <button onClick={() => navigateTo('applications')} className="font-semibold text-primary hover:underline">
              Inspect Case Files →
            </button>
          </div>
        </div>
      </div>

      {/* 5. REAL OPERATIONAL GRAPHS (Row 2: Verification Outcomes & Certificate Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Graph 3: Verification Outcomes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-indigo-600 text-base">fact_check</span>
                  Statutory Verification Results
                </h3>
                <p className="text-[11px] text-slate-500">Compliance outcomes against Schedule IV MPE limits</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                {totalVerifs} Inspections
              </span>
            </div>

            {totalVerifs === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">verified_user</span>
                <span>No verification inspection records completed yet.</span>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-[10px] font-bold uppercase text-emerald-800 block">Pass (Compliant)</span>
                    <span className="text-xl font-extrabold text-emerald-700">{verifOutcomes.PASS}</span>
                    <span className="text-[10px] text-emerald-600 block mt-0.5">{passRate}% pass rate</span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-[10px] font-bold uppercase text-rose-800 block">Fail (Deficient)</span>
                    <span className="text-xl font-extrabold text-rose-700">{verifOutcomes.FAIL}</span>
                    <span className="text-[10px] text-rose-600 block mt-0.5">{failRate}% rejection</span>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                    <span className="text-[10px] font-bold uppercase text-blue-800 block">In Progress</span>
                    <span className="text-xl font-extrabold text-blue-700">{verifOutcomes.PENDING}</span>
                    <span className="text-[10px] text-blue-600 block mt-0.5">Under testing</span>
                  </div>
                </div>

                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
                  {verifOutcomes.PASS > 0 && (
                    <div style={{ width: `${(verifOutcomes.PASS / totalVerifs) * 100}%` }} className="bg-emerald-500 h-full" title={`Pass: ${verifOutcomes.PASS}`} />
                  )}
                  {verifOutcomes.FAIL > 0 && (
                    <div style={{ width: `${(verifOutcomes.FAIL / totalVerifs) * 100}%` }} className="bg-rose-500 h-full" title={`Fail: ${verifOutcomes.FAIL}`} />
                  )}
                  {verifOutcomes.PENDING > 0 && (
                    <div style={{ width: `${(verifOutcomes.PENDING / totalVerifs) * 100}%` }} className="bg-blue-400 h-full" title={`Pending: ${verifOutcomes.PENDING}`} />
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Evaluated according to Legal Metrology General Rules, 2011</span>
          </div>
        </div>

        {/* Graph 4: Certificates Issued Timeline */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-600 text-base">workspace_premium</span>
                  Certificates Issued Over Time
                </h3>
                <p className="text-[11px] text-slate-500">Statutory credentials with unique QR verification tokens</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {totalCertificatesCount} Issued
                </span>
                {/* Chart type toggle */}
                <div className="flex rounded-full border border-slate-200 overflow-hidden text-[10px] font-bold p-0.5 bg-slate-50">
                  <button
                    onClick={() => setChartViewCerts('pie')}
                    title="Pie / Donut Chart"
                    className={`px-2.5 py-1 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer ${
                      chartViewCerts === 'pie' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">pie_chart</span>
                  </button>
                  <button
                    onClick={() => setChartViewCerts('bar')}
                    title="Vertical Bar Chart"
                    className={`px-2.5 py-1 rounded-full flex items-center gap-0.5 transition-colors cursor-pointer ${
                      chartViewCerts === 'bar' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">bar_chart</span>
                  </button>
                </div>
              </div>
            </div>

            {certsTimeline.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">workspace_premium</span>
                <span>No compliance certificates issued yet.</span>
              </div>
            ) : chartViewCerts === 'pie' ? (
              // Pie / Donut Chart
              (() => {
                const COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6'];
                const total = certsTimeline.reduce((acc, d) => acc + d.count, 0) || totalCertificatesCount || 1;

                let cumulativeAngle = 0;
                const slices = certsTimeline.map((item, idx) => {
                  const angle = (item.count / total) * 360;
                  const startAngle = cumulativeAngle;
                  const endAngle = cumulativeAngle + angle;
                  cumulativeAngle += angle;

                  const cx = 90, cy = 90, r = 70, innerR = 40;
                  const startRad = (startAngle - 90) * (Math.PI / 180);
                  const endRad = (endAngle - 90) * (Math.PI / 180);

                  const x1 = cx + r * Math.cos(startRad);
                  const y1 = cy + r * Math.sin(startRad);
                  const x2 = cx + r * Math.cos(endRad);
                  const y2 = cy + r * Math.sin(endRad);

                  const ix1 = cx + innerR * Math.cos(endRad);
                  const iy1 = cy + innerR * Math.sin(endRad);
                  const ix2 = cx + innerR * Math.cos(startRad);
                  const iy2 = cy + innerR * Math.sin(startRad);

                  const largeArcFlag = angle > 180 ? 1 : 0;

                  let pathD = '';
                  if (angle >= 359.9) {
                    pathD = `M ${cx},${cy - r} A ${r},${r} 0 1,1 ${cx - 0.01},${cy - r} L ${cx - 0.01},${cy - innerR} A ${innerR},${innerR} 0 1,0 ${cx},${cy - innerR} Z`;
                  } else {
                    pathD = `M ${x1},${y1} A ${r},${r} 0 ${largeArcFlag},1 ${x2},${y2} L ${ix1},${iy1} A ${innerR},${innerR} 0 ${largeArcFlag},0 ${ix2},${iy2} Z`;
                  }

                  return {
                    date: item.date,
                    count: item.count,
                    pct: Math.round((item.count / total) * 100),
                    color: COLORS[idx % COLORS.length],
                    pathD
                  };
                });

                return (
                  <div className="h-40 flex items-center gap-4 py-1 px-2">
                    <div className="w-36 h-36 shrink-0 relative flex items-center justify-center">
                      <svg viewBox="0 0 180 180" className="w-full h-full transform -rotate-90">
                        {slices.map((slice, i) => (
                          <path
                            key={i}
                            d={slice.pathD}
                            fill={slice.color}
                            className="transition-all hover:opacity-85 cursor-pointer stroke-white stroke-2"
                            title={`${slice.date}: ${slice.count} certificate(s) (${slice.pct}%)`}
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-xl font-extrabold text-slate-900">{total}</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Issued</span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {slices.map((slice, i) => (
                        <div key={i} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-emerald-50/50 border border-emerald-100 hover:bg-emerald-50 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: slice.color }} />
                            <span className="font-mono text-[11px] text-slate-700 truncate">{slice.date}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono text-[11px]">
                            <strong className="text-emerald-800">{slice.count}</strong>
                            <span className="text-slate-400">({slice.pct}%)</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : chartViewCerts === 'bar' ? (
              // Vertical bar chart
              <div className="h-40 flex items-end gap-2 pt-6 pb-2 px-1">
                {certsTimeline.map((item) => {
                  const pct = Math.max(15, Math.round((item.count / maxCertsInTimeline) * 100));
                  return (
                    <div key={item.date} className="h-full flex-1 flex flex-col justify-end items-center gap-1.5 group min-w-0">
                      <div className="text-[10px] font-mono font-bold text-emerald-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        {item.count}
                      </div>
                      <div
                        style={{ height: `${pct}%` }}
                        className="w-full max-w-[28px] bg-gradient-to-t from-emerald-700 to-emerald-400 rounded-t-md transition-all group-hover:brightness-110"
                        title={`${item.date}: ${item.count} certificate(s)`}
                      />
                      <span className="text-[9px] font-mono text-slate-400 truncate w-full text-center">
                        {item.date.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              // Horizontal bar chart
              <div className="space-y-1.5 py-1 max-h-40 overflow-y-auto pr-1">
                {certsTimeline.map((item) => {
                  const pct = Math.max(4, Math.round((item.count / maxCertsInTimeline) * 100));
                  return (
                    <div key={item.date} className="flex items-center gap-2 group">
                      <span className="text-[9px] font-mono text-slate-500 w-10 shrink-0 text-right">{item.date.slice(5)}</span>
                      <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                        <div
                          style={{ width: `${pct}%` }}
                          className="h-full bg-gradient-to-r from-emerald-700 to-emerald-400 rounded transition-all duration-500 group-hover:brightness-110"
                          title={`${item.date}: ${item.count} certificate(s)`}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-emerald-700 w-5 shrink-0">{item.count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Cryptographic verification active</span>
            <button onClick={() => navigateTo('certificates')} className="font-semibold text-emerald-700 hover:underline">
              View Issued Registry →
            </button>
          </div>
        </div>
      </div>

      {/* 6. Quick Administrative Actions */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5">
        <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-sm text-[#002046]">bolt</span>
          Administrative Quick Actions
        </h3>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowQuickAddUser(true)}
            className="px-3.5 py-2 bg-primary hover:bg-[#001733] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            <span>+ Add New User</span>
          </button>

          <button
            onClick={() => navigateTo('admin-users')}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-blue-600">manage_accounts</span>
            <span>Manage Users</span>
          </button>

          <button
            onClick={() => navigateTo('admin-orgs')}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-purple-600">apartment</span>
            <span>Manage Offices / Labs</span>
          </button>

          <button
            onClick={() => navigateTo('admin-master')}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-amber-600">tune</span>
            <span>Manage Rulesets</span>
          </button>

          <button
            onClick={onViewAuditLogs || (() => navigateTo('audit-logs'))}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-emerald-600">history_edu</span>
            <span>View Governance Audit Log</span>
          </button>

          <button
            onClick={() => navigateTo('system-health')}
            className="px-3.5 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-slate-600">health_and_safety</span>
            <span>System Diagnostics</span>
          </button>
        </div>
      </div>

      {/* 7. Recent Platform Activity (Compact 5-row Governance Table) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/50">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Recent Platform Activity</h2>
            <p className="text-xs text-slate-500 mt-0.5">Latest administrative actions and statutory determinations</p>
          </div>
          <button
            onClick={onViewAuditLogs || (() => navigateTo('audit-logs'))}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Audit Log ({safeLogs.length})</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[640px]">
            <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Timestamp</th>
                <th className="px-5 py-3">Actor & Role</th>
                <th className="px-5 py-3">Action</th>
                <th className="px-5 py-3">Target Entity</th>
                <th className="px-5 py-3">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    <span className="material-symbols-outlined text-2xl mb-1 text-slate-300 block">history_edu</span>
                    No administrative events logged yet.
                  </td>
                </tr>
              ) : (
                recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-500">
                      {log.created_at ? new Date(log.created_at).toLocaleString() : 'Just now'}
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-bold text-slate-900 block">{log.actor_name || log.actor_id}</span>
                      <span className="font-mono text-[10px] text-slate-500 uppercase">{log.actor_role}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-semibold text-primary">{log.action}</span>
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {log.entity_name || log.entity_id || 'System'}
                    </td>
                    <td className="px-5 py-3 font-mono text-[11px] text-slate-500 max-w-xs truncate" title={typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details_json || log.details || '')}>
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : (log.details_json || log.details || '—')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Add User Modal */}
      {showQuickAddUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">person_add</span>
                <h3 className="text-base font-bold text-slate-900">Add Platform User</h3>
              </div>
              <button
                onClick={() => setShowQuickAddUser(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {createError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                {createError}
              </div>
            )}

            <form onSubmit={handleQuickCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kulkarni"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="user@certifymetric.gov.in"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Initial Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Statutory Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] outline-none bg-white font-medium"
                  >
                    <option value="TRADER">Trader / Owner</option>
                    <option value="AUTHORITY">Authority (LMO)</option>
                    <option value="VERIFIER">Field Verifier</option>
                    <option value="GATC">GATC Testing Lab</option>
                    <option value="PLATFORM_ADMIN">Platform Admin</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowQuickAddUser(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 bg-primary hover:bg-[#001733] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span>{creatingUser ? 'Creating...' : 'Create Account'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
