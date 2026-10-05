import React, { useEffect, useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import ListToolbar from '../components/ListToolbar';
import Pagination from '../components/Pagination';
import { api } from '../api';

const ROLES_OPTIONS = [
  { value: 'ALL', label: 'All Roles' },
  { value: 'TRADER', label: 'Trader / Commercial Owner' },
  { value: 'AUTHORITY', label: 'Legal Metrology Officer (Authority)' },
  { value: 'VERIFIER', label: 'Field Verification Officer' },
  { value: 'GATC', label: 'GATC Testing Laboratory' },
  { value: 'PLATFORM_ADMIN', label: 'Portal Administrator' }
];

export default function AdminUsersView({ currentUser, onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Create User Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    role: 'TRADER',
    full_name: '',
    phone: '',
    organization_id: ''
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const counts = useMemo(() => {
    const total = users.length;
    const officers = users.filter(u => u.role === 'AUTHORITY' || u.role === 'VERIFIER').length;
    const gatc = users.filter(u => u.role === 'GATC').length;
    const traders = users.filter(u => u.role === 'TRADER').length;
    const active = users.filter(u => u.status === 'ACTIVE' || u.active !== false).length;
    return { total, officers, gatc, traders, active };
  }, [users]);

  const handleToggleStatus = async (user) => {
    const isCurrentlyActive = user.status === 'ACTIVE' || user.active !== false;
    const newStatus = !isCurrentlyActive;
    if (!window.confirm(`Are you sure you want to ${newStatus ? 'activate' : 'deactivate'} account for ${user.full_name}?`)) {
      return;
    }
    setUpdatingId(user.id);
    try {
      await api.updateUserStatus(user.id, newStatus);
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, active: newStatus, status: newStatus ? 'ACTIVE' : 'INACTIVE' } : u))
      );
    } catch (err) {
      alert('Failed to update user status: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      await api.createAdminUser(newUser);
      setShowCreateModal(false);
      setNewUser({
        email: '',
        password: '',
        role: 'TRADER',
        full_name: '',
        phone: '',
        organization_id: ''
      });
      await loadUsers();
    } catch (err) {
      setCreateError(err.message || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.id?.toLowerCase().includes(q) ||
        u.organization_name?.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;

      const isActive = u.status === 'ACTIVE' || u.active !== false;
      let matchesStatus = true;
      if (statusFilter === 'ACTIVE') matchesStatus = isActive;
      if (statusFilter === 'INACTIVE') matchesStatus = !isActive;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize) || 1;
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredUsers.slice(startIndex, startIndex + pageSize);
  }, [filteredUsers, currentPage, pageSize]);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'PLATFORM_ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-rose-50 text-rose-700 border border-rose-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
            System Admin
          </span>
        );
      case 'AUTHORITY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
            Authority Officer
          </span>
        );
      case 'VERIFIER':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
            Field Verifier
          </span>
        );
      case 'GATC':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
            GATC Lab Personnel
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
            Commercial Trader
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        icon="group"
        title="Users & Access Governance"
        subtitle="Manage statutory officer profiles, trade accounts, laboratory personnel, and authentication status"
        badge={{ text: `${users.length} Total Users`, variant: 'primary' }}
        actions={
          <div className="flex items-center gap-2">
            {onBack && (
              <button onClick={onBack} className="btn btn-secondary btn-sm">
                <span className="material-symbols-outlined text-[15px]">arrow_back</span>
                Dashboard
              </button>
            )}
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn btn-primary btn-sm"
            >
              <span className="material-symbols-outlined text-[15px]">person_add</span>
              Create User
            </button>
          </div>
        }
      />

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Accounts</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 font-mono">{counts.total}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <span className="material-symbols-outlined text-xl">group</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-blue-100 bg-gradient-to-br from-white to-blue-50/30 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Legal Metrology Officers</div>
            <div className="text-xl sm:text-2xl font-black text-blue-900 mt-0.5 font-mono">{counts.officers}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">badge</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-100 bg-gradient-to-br from-white to-amber-50/30 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">GATC Technicians</div>
            <div className="text-xl sm:text-2xl font-black text-amber-950 mt-0.5 font-mono">{counts.gatc}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">biotech</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Traders & Owners</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-0.5 font-mono">{counts.traders}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">store</span>
          </div>
        </div>
      </div>

      {/* List Toolbar */}
      <ListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, email, phone, organization..."
        filters={[
          {
            id: 'role',
            label: 'Role',
            value: roleFilter,
            onChange: setRoleFilter,
            options: ROLES_OPTIONS
          },
          {
            id: 'status',
            label: 'Account Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { value: 'ALL', label: 'All Statuses' },
              { value: 'ACTIVE', label: 'Active Only' },
              { value: 'INACTIVE', label: 'Deactivated Only' }
            ]
          }
        ]}
        onReset={() => {
          setSearchTerm('');
          setRoleFilter('ALL');
          setStatusFilter('ALL');
        }}
      />

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[960px]">
            <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-5 py-4 w-[28%] min-w-[260px]">User Particulars</th>
                <th className="px-5 py-4 w-[16%] min-w-[180px] whitespace-nowrap">Role</th>
                <th className="px-5 py-4 w-[20%] min-w-[190px]">Organization</th>
                <th className="px-5 py-4 w-[18%] min-w-[190px]">Contact Details</th>
                <th className="px-5 py-4 w-[10%] min-w-[120px] whitespace-nowrap">Status</th>
                <th className="px-5 py-4 w-[8%] min-w-[110px] text-right whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
                    Loading user directory...
                  </td>
                </tr>
              ) : paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-300">
                      <span className="material-symbols-outlined text-3xl">group_off</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">No Accounts Found</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No user accounts match current search and role filters.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u) => {
                  const isActive = u.status === 'ACTIVE' || u.active !== false;
                  const initial = u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. User Particulars */}
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-800 shrink-0 shadow-2xs">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block text-xs leading-snug truncate max-w-xs" title={u.full_name}>
                              {u.full_name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400 block mt-0.5">
                              ID: {u.id}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 2. Role Badge (Guaranteed No Awkward Wrap) */}
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        {getRoleBadge(u.role)}
                      </td>

                      {/* 3. Organization */}
                      <td className="px-5 py-4 align-middle text-slate-600">
                        {u.organization_name ? (
                          <div className="flex items-center gap-1.5 truncate max-w-xs" title={u.organization_name}>
                            <span className="material-symbols-outlined text-[14px] text-slate-400 shrink-0">apartment</span>
                            <span className="font-medium text-slate-800 text-xs truncate">{u.organization_name}</span>
                          </div>
                        ) : u.organization_id ? (
                          <span className="font-mono text-[11px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {u.organization_id}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">— None assigned —</span>
                        )}
                      </td>

                      {/* 4. Contact Details */}
                      <td className="px-5 py-4 align-middle">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium truncate max-w-xs" title={u.email}>
                            <span className="material-symbols-outlined text-[13px] text-slate-400 shrink-0">mail</span>
                            <span className="truncate">{u.email}</span>
                          </div>
                          {u.phone ? (
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                              <span className="material-symbols-outlined text-[13px] text-slate-400 shrink-0">call</span>
                              <span>{u.phone}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 italic block pl-4">No phone listed</span>
                          )}
                        </div>
                      </td>

                      {/* 5. Account Status */}
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border shadow-2xs ${
                          isActive 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      {/* 6. Actions */}
                      <td className="px-5 py-4 align-middle text-right whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={updatingId === u.id || u.id === currentUser?.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            isActive
                              ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          } disabled:opacity-40 disabled:cursor-not-allowed`}
                          title={u.id === currentUser?.id ? 'Cannot deactivate your own account' : ''}
                        >
                          {updatingId === u.id ? 'Saving...' : isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Responsive Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredUsers.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
          itemName="users"
        />
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">person_add</span>
                <h3 className="text-base font-bold text-slate-900">Create Platform Account</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
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

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inspector Ramesh Kulkarni"
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Statutory Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] outline-none bg-white font-medium cursor-pointer"
                  >
                    <option value="TRADER">Trader / Owner</option>
                    <option value="AUTHORITY">Authority (LMO)</option>
                    <option value="VERIFIER">Field Verifier</option>
                    <option value="GATC">GATC Testing Lab</option>
                    <option value="PLATFORM_ADMIN">Platform Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 bg-[#002046] hover:bg-[#001733] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">person_add</span>
                  <span>{creating ? 'Creating Account...' : 'Confirm Account Creation'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
