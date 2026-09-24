import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../api';
import StatusBadge from '../components/StatusBadge';
import GeoVisitMap from '../components/GeoVisitMap';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip
} from 'recharts';

const STATUS_CONFIG = {
  SUBMITTED: { label: 'Submitted', color: '#f59e0b', gradient: ['#f59e0b', '#d97706'], bg: 'bg-amber-500', text: 'text-amber-700', border: 'border-amber-200', icon: 'send' },
  UNDER_REVIEW: { label: 'Under Review', color: '#0284c7', gradient: ['#0284c7', '#0369a1'], bg: 'bg-sky-500', text: 'text-sky-700', border: 'border-sky-200', icon: 'rate_review' },
  ASSIGNED: { label: 'Assigned / Scheduled', color: '#8b5cf6', gradient: ['#8b5cf6', '#6d28d9'], bg: 'bg-purple-500', text: 'text-purple-700', border: 'border-purple-200', icon: 'event' },
  IN_VERIFICATION: { label: 'In Progress', color: '#6366f1', gradient: ['#6366f1', '#4338ca'], bg: 'bg-indigo-500', text: 'text-indigo-700', border: 'border-indigo-200', icon: 'schedule' },
  REPORT_SUBMITTED: { label: 'Report Submitted', color: '#0d9488', gradient: ['#0d9488', '#0f766e'], bg: 'bg-teal-500', text: 'text-teal-700', border: 'border-teal-200', icon: 'description' },
  APPROVED: { label: 'Approved', color: '#10b981', gradient: ['#10b981', '#047857'], bg: 'bg-emerald-500', text: 'text-emerald-700', border: 'border-emerald-200', icon: 'check_circle' },
  CERTIFICATE_ISSUED: { label: 'Certified', color: '#059669', gradient: ['#059669', '#065f46'], bg: 'bg-emerald-600', text: 'text-emerald-800', border: 'border-emerald-300', icon: 'verified' },
  RETURNED: { label: 'Returned', color: '#d97706', gradient: ['#d97706', '#b45309'], bg: 'bg-amber-600', text: 'text-amber-800', border: 'border-amber-300', icon: 'reply' },
  REJECTED: { label: 'Rejected', color: '#f43f5e', gradient: ['#f43f5e', '#be123c'], bg: 'bg-rose-500', text: 'text-rose-700', border: 'border-rose-200', icon: 'cancel' }
};

const CERT_COLORS = ['#10b981', '#06b6d4', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1'];

function CustomTrendTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#001733]/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/60 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-1.5 text-slate-300 text-[11px] mb-1 font-medium">
          <span className="material-symbols-outlined text-[13px] text-amber-400">calendar_today</span>
          <span>{data.fullDate || label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <span className="text-slate-300">Filing Volume:</span>
          <span className="text-sm font-extrabold text-cyan-300 font-mono">{payload[0].value}</span>
          <span className="text-[10px] text-slate-400">file(s)</span>
        </div>
      </div>
    );
  }
  return null;
}

function CustomStatusTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#001733]/95 backdrop-blur-md text-white px-3.5 py-2 rounded-xl shadow-xl border border-slate-700/60 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: data.color }} />
          <span className="font-bold text-white">{data.label}</span>
        </div>
        <div className="text-[11px] text-slate-300 mt-1 font-mono flex items-center justify-between gap-3">
          <span>Count: <strong className="text-amber-300">{data.count}</strong></span>
          <span className="text-slate-400">({data.pct}%)</span>
        </div>
      </div>
    );
  }
  return null;
}

function CustomCertTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#001733]/95 backdrop-blur-md text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-700/60 text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center gap-1.5 text-slate-300 text-[11px] mb-1 font-medium">
          <span className="material-symbols-outlined text-[13px] text-emerald-400">verified</span>
          <span>{data.fullDate || data.date}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <span className="text-slate-300">Issued:</span>
          <span className="text-sm font-extrabold text-emerald-300 font-mono">{data.count}</span>
          <span className="text-[10px] text-slate-400">credential(s)</span>
        </div>
      </div>
    );
  }
  return null;
}

export default function AdminDashboard({ currentUser, onViewAuditLogs, onNavigateTab }) {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [masterData, setMasterData] = useState({ categories: [], rulesets: [] });
  const [auditLogs, setAuditLogs] = useState([]);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [timeRange, setTimeRange] = useState('7d');

  // GeoVisit Administration state
  const [geoVisits, setGeoVisits] = useState([]);
  const [selectedGeoVisitMap, setSelectedGeoVisitMap] = useState(null);
  const [overrideModalCase, setOverrideModalCase] = useState(null);
  const [adminOverrideReason, setAdminOverrideReason] = useState('');
  const [submittingAdminOverride, setSubmittingAdminOverride] = useState(false);

  // Chart view toggle: 'line' | 'bar'
  const [chartViewApps, setChartViewApps] = useState('line');
  // Chart view toggle: 'pie' | 'bar'
  const [chartViewCerts, setChartViewCerts] = useState('pie');
  // Chart view toggle for Status: 'donut' | 'bars'
  const [chartViewStatus, setChartViewStatus] = useState('donut');
  // Hovered status for interactive donut & list
  const [hoveredStatus, setHoveredStatus] = useState(null);
  // Hovered slice for certificates donut
  const [hoveredCertSlice, setHoveredCertSlice] = useState(null);

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
      const [uList, oList, mData, logs, analytics, gvList] = await Promise.all([
        api.getAdminUsers().catch(() => []),
        api.getAdminOrganizations().catch(() => []),
        api.getAdminMasterData().catch(() => ({ categories: [], rulesets: [] })),
        api.getAuditLogs().catch(() => []),
        api.getAdminAnalytics(timeRange).catch(() => null),
        api.getGeoVisitAdminOverview().catch(() => [])
      ]);

      setUsers(Array.isArray(uList) ? uList : []);
      setOrganizations(Array.isArray(oList) ? oList : []);
      setMasterData(mData || { categories: [], rulesets: [] });
      setAuditLogs(Array.isArray(logs) ? logs : []);
      setAnalyticsData(analytics);
      setGeoVisits(Array.isArray(gvList) ? gvList : []);
    } catch (err) {
      console.error('Failed to load admin dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [timeRange]);

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
      await loadData();
    } catch (err) {
      alert('Override failed: ' + err.message);
    } finally {
      setSubmittingAdminOverride(false);
    }
  };

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
  const statusItems = useMemo(() => {
    const keys = ['SUBMITTED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_VERIFICATION', 'REPORT_SUBMITTED', 'APPROVED', 'CERTIFICATE_ISSUED', 'RETURNED', 'REJECTED'];
    return keys.map((k) => {
      const cfg = STATUS_CONFIG[k] || { label: k, color: '#64748b', gradient: ['#64748b', '#475569'], bg: 'bg-slate-500', text: 'text-slate-700', border: 'border-slate-200', icon: 'info' };
      const count = appStatusRaw[k] || 0;
      return {
        key: k,
        label: cfg.label,
        count,
        color: cfg.color,
        gradient: cfg.gradient,
        bg: cfg.bg,
        text: cfg.text,
        border: cfg.border,
        icon: cfg.icon
      };
    });
  }, [appStatusRaw]);

  const totalStatusApps = useMemo(() => statusItems.reduce((acc, s) => acc + s.count, 0), [statusItems]);

  const activeStatusItems = useMemo(() => {
    const filtered = statusItems.filter((s) => s.count > 0);
    return filtered.map((s) => ({
      ...s,
      pct: totalStatusApps > 0 ? Math.round((s.count / totalStatusApps) * 100) : 0
    }));
  }, [statusItems, totalStatusApps]);

  // Real Applications Over Time
  const appsTimeline = useMemo(() => Array.isArray(analyticsData?.applicationsOverTime) ? analyticsData.applicationsOverTime : [], [analyticsData]);
  const maxAppsInTimeline = useMemo(() => Math.max(...appsTimeline.map(d => d.count), 1), [appsTimeline]);

  const formattedAppsTimeline = useMemo(() => {
    return appsTimeline.map((item) => {
      let label = item.date;
      try {
        const parts = item.date.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
      } catch {
        label = item.date.slice(5);
      }
      return {
        ...item,
        label,
        fullDate: item.date
      };
    });
  }, [appsTimeline]);

  // Real Verification Results
  const verifOutcomes = analyticsData?.verificationOutcomes || { PASS: 0, FAIL: 0, PENDING: 0, total: 0 };
  const totalVerifs = verifOutcomes.total || (verifOutcomes.PASS + verifOutcomes.FAIL + verifOutcomes.PENDING);
  const passRate = totalVerifs > 0 ? Math.round((verifOutcomes.PASS / totalVerifs) * 100) : 0;
  const failRate = totalVerifs > 0 ? Math.round((verifOutcomes.FAIL / totalVerifs) * 100) : 0;

  // Real Certificates Over Time
  const certsTimeline = useMemo(() => Array.isArray(analyticsData?.certificatesOverTime) ? analyticsData.certificatesOverTime : [], [analyticsData]);
  const maxCertsInTimeline = useMemo(() => Math.max(...certsTimeline.map(d => d.count), 1), [certsTimeline]);

  const formattedCertsTimeline = useMemo(() => {
    const total = certsTimeline.reduce((acc, d) => acc + d.count, 0) || totalCertificatesCount || 1;
    return certsTimeline.map((item, idx) => {
      let label = item.date;
      try {
        const parts = item.date.split('-');
        if (parts.length === 3) {
          const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        }
      } catch {
        label = item.date.slice(5);
      }
      return {
        ...item,
        label,
        fullDate: item.date,
        pct: Math.round((item.count / total) * 100),
        color: CERT_COLORS[idx % CERT_COLORS.length]
      };
    });
  }, [certsTimeline, totalCertificatesCount]);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
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
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs">
                  {totalApplicationsCount} Total Files
                </span>
                {/* Chart type toggle */}
                <div className="flex rounded-full border border-slate-200 overflow-hidden text-[10px] font-bold p-0.5 bg-slate-50">
                  <button
                    onClick={() => setChartViewApps('line')}
                    title="Smooth Area Curve"
                    className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                      chartViewApps === 'line' ? 'bg-[#002046] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">show_chart</span>
                    <span>Curve</span>
                  </button>
                  <button
                    onClick={() => setChartViewApps('bar')}
                    title="Vertical Bar Chart"
                    className={`px-2.5 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                      chartViewApps === 'bar' ? 'bg-[#002046] text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">bar_chart</span>
                    <span>Bar</span>
                  </button>
                </div>
              </div>
            </div>

            {formattedAppsTimeline.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">timeline</span>
                <span>No application trend records for this range.</span>
              </div>
            ) : chartViewApps === 'line' ? (
              <div className="h-52 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={formattedAppsTimeline} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="appsTrendGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284c7" stopOpacity={0.45} />
                        <stop offset="60%" stopColor="#002046" stopOpacity={0.12} />
                        <stop offset="100%" stopColor="#002046" stopOpacity={0.0} />
                      </linearGradient>
                      <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0284c7" floodOpacity={0.35} />
                      </filter>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      domain={[0, (dataMax) => Math.max(dataMax + 1, 3)]}
                    />
                    <RechartsTooltip content={<CustomTrendTooltip />} cursor={{ stroke: '#0284c7', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
                    <Area
                      type="monotone"
                      dataKey="count"
                      stroke="#002046"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#appsTrendGradient)"
                      activeDot={{
                        r: 6,
                        fill: '#0284c7',
                        stroke: '#ffffff',
                        strokeWidth: 3,
                        className: 'filter drop-shadow-md'
                      }}
                      isAnimationActive={true}
                      animationDuration={1300}
                      animationEasing="ease-in-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-52 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedAppsTimeline} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="appsBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284c7" />
                        <stop offset="100%" stopColor="#002046" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, (dataMax) => Math.max(dataMax + 1, 3)]} />
                    <RechartsTooltip content={<CustomTrendTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
                    <Bar
                      dataKey="count"
                      fill="url(#appsBarGrad)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                      isAnimationActive={true}
                      animationDuration={1100}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live telemetry feed from MongoDB
            </span>
            <button onClick={() => navigateTo('applications')} className="font-semibold text-primary hover:underline flex items-center gap-0.5">
              <span>View Registry</span>
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Graph 2: Application Status Breakdown */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-amber-500 text-base">donut_large</span>
                  Application Status Distribution
                </h3>
                <p className="text-[11px] text-slate-500">Live operational lifecycle state distribution</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs">
                  {totalStatusApps} Active Cases
                </span>
                <div className="flex rounded-full border border-slate-200 overflow-hidden text-[10px] font-bold p-0.5 bg-slate-50">
                  <button
                    onClick={() => setChartViewStatus('donut')}
                    title="Donut Distribution"
                    className={`px-2 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                      chartViewStatus === 'donut' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">pie_chart</span>
                    <span>Donut</span>
                  </button>
                  <button
                    onClick={() => setChartViewStatus('bars')}
                    title="Progress Trackers"
                    className={`px-2 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                      chartViewStatus === 'bars' ? 'bg-amber-600 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">view_stream</span>
                    <span>Bars</span>
                  </button>
                </div>
              </div>
            </div>

            {totalStatusApps === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">donut_large</span>
                <span>No active verification applications filed yet.</span>
              </div>
            ) : chartViewStatus === 'donut' ? (
              <div className="h-52 flex items-center gap-3 py-1">
                {/* Donut Chart with Interactive Center */}
                <div className="w-44 h-48 shrink-0 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={activeStatusItems}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={hoveredStatus ? 68 : 64}
                        paddingAngle={3}
                        cornerRadius={4}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                        onMouseEnter={(_, index) => setHoveredStatus(activeStatusItems[index])}
                        onMouseLeave={() => setHoveredStatus(null)}
                      >
                        {activeStatusItems.map((entry) => (
                          <Cell
                            key={entry.key}
                            fill={entry.color}
                            stroke="#ffffff"
                            strokeWidth={hoveredStatus?.key === entry.key ? 3 : 1.5}
                            className="transition-all duration-300 cursor-pointer hover:opacity-90"
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomStatusTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Interactive Dynamic Center Display */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-200 px-1">
                    {hoveredStatus ? (
                      <div className="animate-in fade-in zoom-in-90 duration-150">
                        <span className="text-lg font-black block leading-none" style={{ color: hoveredStatus.color }}>
                          {hoveredStatus.count}
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 block uppercase truncate max-w-[70px] mt-0.5">
                          {hoveredStatus.label}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 block font-semibold">
                          {hoveredStatus.pct}%
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xl font-black text-[#002046] block leading-none">
                          {totalStatusApps}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mt-0.5">
                          Active Cases
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Interactive Status List */}
                <div className="flex-1 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {activeStatusItems.map((s) => {
                    const isHovered = hoveredStatus?.key === s.key;
                    return (
                      <div
                        key={s.key}
                        onMouseEnter={() => setHoveredStatus(s)}
                        onMouseLeave={() => setHoveredStatus(null)}
                        className={`p-1.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${
                          isHovered ? 'bg-slate-50 border-slate-300 shadow-2xs scale-[1.02]' : 'border-slate-100 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: s.color }} />
                            <span className="font-bold text-slate-800 text-[11px] truncate">{s.label}</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[11px] shrink-0">
                            <strong className={s.text}>{s.count}</strong>
                            <span className="text-slate-400 text-[10px]">({s.pct}%)</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            style={{
                              width: `${s.pct}%`,
                              backgroundColor: s.color
                            }}
                            className="h-full rounded-full transition-all duration-700"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 py-1.5 max-h-52 overflow-y-auto pr-1">
                {activeStatusItems.map((s) => (
                  <div key={s.key} className="space-y-1 group">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm text-slate-500">{s.icon}</span>
                        <span className="font-semibold text-slate-800">{s.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <strong className={s.text}>{s.count}</strong>
                        <span className="text-slate-400">({s.pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${s.pct}%`, backgroundColor: s.color }}
                        className="h-full rounded-full transition-all duration-700 group-hover:brightness-110"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Direct state transition metrics</span>
            <button onClick={() => navigateTo('applications')} className="font-semibold text-primary hover:underline flex items-center gap-0.5">
              <span>Inspect Case Files</span>
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. REAL OPERATIONAL GRAPHS (Row 2: Verification Outcomes & Certificate Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Graph 3: Verification Outcomes */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-indigo-600 text-base">fact_check</span>
                  Statutory Verification Results
                </h3>
                <p className="text-[11px] text-slate-500">Compliance outcomes against Schedule IV MPE limits</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200 shadow-2xs">
                {totalVerifs} Inspections
              </span>
            </div>

            {totalVerifs === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">verified_user</span>
                <span>No verification inspection records completed yet.</span>
              </div>
            ) : (
              <div className="space-y-4 py-1">
                {/* Hero Compliance Dial + Score Header */}
                <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-blue-50 border border-emerald-200/80 shadow-2xs">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[9.5px] font-extrabold uppercase tracking-wide shadow-2xs">
                      <span className="material-symbols-outlined text-xs">shield</span>
                      <span>Schedule IV Compliant</span>
                    </div>
                    <div className="text-sm font-extrabold text-slate-900 leading-tight">
                      Statutory Pass Rate: <span className="text-emerald-700 font-mono text-base">{passRate}%</span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-snug">
                      Verified within Legal Metrology maximum permissible error thresholds
                    </p>
                  </div>

                  {/* Circular Compliance Meter */}
                  <div className="w-16 h-16 shrink-0 relative flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <path
                        className="text-slate-200"
                        strokeWidth="3.5"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                      <path
                        className="text-emerald-500 transition-all duration-1000 ease-out"
                        strokeDasharray={`${passRate}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-xs font-black text-emerald-800 font-mono">{passRate}%</span>
                    </div>
                  </div>
                </div>

                {/* 3 Outcome Cards */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/90 shadow-2xs hover:shadow-xs hover:border-emerald-400 transition-all group">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-emerald-800 mb-0.5">
                      <span className="material-symbols-outlined text-xs group-hover:scale-110 transition-transform">check_circle</span>
                      <span>Pass</span>
                    </div>
                    <span className="text-2xl font-black text-emerald-700 font-mono block leading-none my-1">{verifOutcomes.PASS}</span>
                    <span className="text-[10px] text-emerald-700 font-semibold block">{passRate}% compliant</span>
                  </div>

                  <div className="p-3 rounded-xl bg-rose-50/70 border border-rose-200/90 shadow-2xs hover:shadow-xs hover:border-rose-400 transition-all group">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-rose-800 mb-0.5">
                      <span className="material-symbols-outlined text-xs group-hover:scale-110 transition-transform">error</span>
                      <span>Fail</span>
                    </div>
                    <span className="text-2xl font-black text-rose-700 font-mono block leading-none my-1">{verifOutcomes.FAIL}</span>
                    <span className="text-[10px] text-rose-700 font-semibold block">{failRate}% rejected</span>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/90 shadow-2xs hover:shadow-xs hover:border-blue-400 transition-all group">
                    <div className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase text-blue-800 mb-0.5">
                      <span className="material-symbols-outlined text-xs group-hover:scale-110 transition-transform">hourglass_top</span>
                      <span>Testing</span>
                    </div>
                    <span className="text-2xl font-black text-blue-700 font-mono block leading-none my-1">{verifOutcomes.PENDING}</span>
                    <span className="text-[10px] text-blue-700 font-semibold block">Under testing</span>
                  </div>
                </div>

                {/* Multi-segment MPE bar */}
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                  {verifOutcomes.PASS > 0 && (
                    <div
                      style={{ width: `${(verifOutcomes.PASS / totalVerifs) * 100}%` }}
                      className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full transition-all duration-700"
                      title={`Pass: ${verifOutcomes.PASS}`}
                    />
                  )}
                  {verifOutcomes.FAIL > 0 && (
                    <div
                      style={{ width: `${(verifOutcomes.FAIL / totalVerifs) * 100}%` }}
                      className="bg-gradient-to-r from-rose-500 to-red-600 h-full transition-all duration-700"
                      title={`Fail: ${verifOutcomes.FAIL}`}
                    />
                  )}
                  {verifOutcomes.PENDING > 0 && (
                    <div
                      style={{ width: `${(verifOutcomes.PENDING / totalVerifs) * 100}%` }}
                      className="bg-gradient-to-r from-blue-400 to-indigo-500 h-full transition-all duration-700"
                      title={`Pending: ${verifOutcomes.PENDING}`}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Evaluated according to Legal Metrology General Rules, 2011</span>
          </div>
        </div>

        {/* Graph 4: Certificates Issued Timeline */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
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
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                  {totalCertificatesCount} Issued
                </span>
                {/* Chart type toggle */}
                <div className="flex rounded-full border border-slate-200 overflow-hidden text-[10px] font-bold p-0.5 bg-slate-50">
                  <button
                    onClick={() => setChartViewCerts('pie')}
                    title="Donut Distribution"
                    className={`px-2 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                      chartViewCerts === 'pie' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">pie_chart</span>
                    <span>Donut</span>
                  </button>
                  <button
                    onClick={() => setChartViewCerts('bar')}
                    title="Issuance Velocity"
                    className={`px-2 py-1 rounded-full flex items-center gap-1 transition-all cursor-pointer ${
                      chartViewCerts === 'bar' ? 'bg-emerald-700 text-white shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">bar_chart</span>
                    <span>Velocity</span>
                  </button>
                </div>
              </div>
            </div>

            {formattedCertsTimeline.length === 0 ? (
              <div className="h-52 flex flex-col items-center justify-center text-slate-400 text-xs">
                <span className="material-symbols-outlined text-3xl mb-1 text-slate-300">workspace_premium</span>
                <span>No compliance certificates issued yet.</span>
              </div>
            ) : chartViewCerts === 'pie' ? (
              <div className="h-52 flex items-center gap-3 py-1">
                {/* Donut Chart with Recharts */}
                <div className="w-44 h-48 shrink-0 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formattedCertsTimeline}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={46}
                        outerRadius={hoveredCertSlice ? 68 : 64}
                        paddingAngle={4}
                        cornerRadius={4}
                        isAnimationActive={true}
                        animationDuration={1200}
                        animationEasing="ease-out"
                        onMouseEnter={(_, index) => setHoveredCertSlice(formattedCertsTimeline[index])}
                        onMouseLeave={() => setHoveredCertSlice(null)}
                      >
                        {formattedCertsTimeline.map((entry) => (
                          <Cell
                            key={entry.date}
                            fill={entry.color}
                            stroke="#ffffff"
                            strokeWidth={hoveredCertSlice?.date === entry.date ? 3 : 1.5}
                            className="transition-all duration-300 cursor-pointer hover:opacity-90"
                          />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomCertTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Interactive Center Readout */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none transition-all duration-200 px-1">
                    {hoveredCertSlice ? (
                      <div className="animate-in fade-in zoom-in-90 duration-150">
                        <span className="text-lg font-black block leading-none" style={{ color: hoveredCertSlice.color }}>
                          {hoveredCertSlice.count}
                        </span>
                        <span className="text-[9px] font-bold text-slate-600 block uppercase truncate max-w-[70px] mt-0.5">
                          {hoveredCertSlice.label}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 block font-semibold">
                          {hoveredCertSlice.pct}%
                        </span>
                      </div>
                    ) : (
                      <div>
                        <span className="text-xl font-black text-[#002046] block leading-none">
                          {totalCertificatesCount}
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mt-0.5">
                          Issued
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Date Breakdown */}
                <div className="flex-1 space-y-2 max-h-48 overflow-y-auto pr-1">
                  {formattedCertsTimeline.map((slice) => {
                    const isHovered = hoveredCertSlice?.date === slice.date;
                    return (
                      <div
                        key={slice.date}
                        onMouseEnter={() => setHoveredCertSlice(slice)}
                        onMouseLeave={() => setHoveredCertSlice(null)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between text-xs ${
                          isHovered
                            ? 'bg-emerald-50 border-emerald-300 shadow-2xs scale-[1.02]'
                            : 'border-slate-100 hover:bg-emerald-50/40'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: slice.color }} />
                          <span className="font-mono text-[11px] text-slate-700 truncate font-semibold">{slice.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-[11px] shrink-0">
                          <strong className="text-emerald-800">{slice.count}</strong>
                          <span className="text-slate-400 text-[10px]">({slice.pct}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="h-52 w-full pt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedCertsTimeline} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                    <defs>
                      <linearGradient id="certBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" />
                        <stop offset="100%" stopColor="#059669" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, (dataMax) => Math.max(dataMax + 1, 3)]} />
                    <RechartsTooltip content={<CustomCertTooltip />} cursor={{ fill: 'rgba(241, 245, 249, 0.6)' }} />
                    <Bar
                      dataKey="count"
                      fill="url(#certBarGrad)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={36}
                      isAnimationActive={true}
                      animationDuration={1100}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px] text-emerald-600">verified</span>
              Cryptographic verification active
            </span>
            <button onClick={() => navigateTo('certificates')} className="font-semibold text-emerald-700 hover:underline flex items-center gap-0.5">
              <span>View Issued Registry</span>
              <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
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

            {/* 8. GeoVisit Field Verification Telemetry & Evidence Ledger */}
      <div id="geovisit-ledger-section" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
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
              onClick={loadData}
              className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
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
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                            title="Inspect Geofence Map"
                          >
                            <span className="material-symbols-outlined text-[15px] text-primary">map</span>
                            Map
                          </button>
                          {!isVerified && (
                            <button
                              onClick={() => setOverrideModalCase(gv)}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-semibold text-[11px] transition-colors cursor-pointer"
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
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
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
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close Map
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Statutory Override Modal */}
      {overrideModalCase && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-purple-700 text-xl">shield</span>
                <h3 className="font-bold text-slate-900 text-sm">
                  Statutory GeoVisit Admin Override
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModalCase(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed flex items-start gap-2">
              <span className="material-symbols-outlined text-base text-amber-600 shrink-0 mt-0.5">warning</span>
              <span>
                Administrative override marks this inspection as physically verified. This statutory action is permanently logged to the immutable governance audit ledger.
              </span>
            </div>

            <div className="text-xs text-slate-700 space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div><strong>Application:</strong> {overrideModalCase.application_no}</div>
              <div><strong>Trader:</strong> {overrideModalCase.trader_name}</div>
              <div><strong>Premises:</strong> {overrideModalCase.registered_address || overrideModalCase.location}</div>
            </div>

            <form onSubmit={handleAdminOverride} className="space-y-3">
              <div>
                <label className="font-bold text-slate-700 block text-xs mb-1">
                  Statutory Override Justification *
                </label>
                <textarea
                  required
                  rows={3}
                  value={adminOverrideReason}
                  onChange={(e) => setAdminOverrideReason(e.target.value)}
                  placeholder="e.g. Remote rural facility with no cellular GPS triangulation; physical attendance verified via landline and supervisor sign-off..."
                  className="w-full p-2.5 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500/20 focus:border-purple-600 outline-none"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setOverrideModalCase(null)}
                  className="px-3.5 py-2 border border-slate-300 rounded-xl text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdminOverride || !adminOverrideReason.trim()}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">check_circle</span>
                  <span>{submittingAdminOverride ? 'Applying...' : 'Authorize Override'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
