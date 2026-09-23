import React, { useEffect, useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import ListToolbar from '../components/ListToolbar';
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

  const getRoleBadge = (role) => {
    switch (role) {
      case 'PLATFORM_ADMIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">Admin</span>;
      case 'AUTHORITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Authority</span>;
      case 'VERIFIER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">Field Verifier</span>;
      case 'GATC':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">GATC Lab</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Trader</span>;
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">User</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Organization</th>
                <th className="px-5 py-3.5">Contact Details</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
                    Loading user directory...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl mb-1 text-slate-300 block">group_off</span>
                    No user accounts match current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isActive = u.status === 'ACTIVE' || u.active !== false;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[#002046] shrink-0">
                            {u.full_name ? u.full_name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{u.full_name}</span>
                            <span className="font-mono text-[10px] text-slate-400">{u.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {getRoleBadge(u.role)}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {u.organization_name || u.organization_id || '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="block font-medium text-slate-900">{u.email}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{u.phone || 'No phone'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isActive ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                          {isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={updatingId === u.id || u.id === currentUser?.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#002046]/20 focus:border-[#002046] outline-none bg-white font-medium"
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
                  className="px-5 py-2 bg-primary hover:bg-[#001733] text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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
