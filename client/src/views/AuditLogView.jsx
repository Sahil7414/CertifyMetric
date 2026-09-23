import React, { useEffect, useState, useMemo } from 'react';
import ListToolbar from '../components/ListToolbar';
import PageHeader from '../components/PageHeader';
import { api } from '../api';

export default function AuditLogView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState('NEWEST');
  const [selectedLog, setSelectedLog] = useState(null);

  const loadLogs = () => {
    setLoading(true);
    api.getAuditLogs()
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const safeLogs = Array.isArray(logs) ? logs : [];

  const uniqueActions = useMemo(() => {
    const actions = Array.from(new Set(safeLogs.map(l => l.action).filter(Boolean)));
    return [
      { label: 'All Actions', value: 'ALL' },
      ...actions.map(a => ({ label: a, value: a }))
    ];
  }, [safeLogs]);

  const filteredLogs = useMemo(() => {
    return safeLogs.filter((log) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        log.action?.toLowerCase().includes(q) ||
        log.actor_id?.toLowerCase().includes(q) ||
        log.actor_role?.toLowerCase().includes(q) ||
        log.entity_name?.toLowerCase().includes(q) ||
        log.entity_id?.toLowerCase().includes(q) ||
        log.details_json?.toLowerCase().includes(q);

      let matchesAction = true;
      if (actionFilter !== 'ALL') {
        matchesAction = log.action === actionFilter;
      }

      let matchesRole = true;
      if (roleFilter !== 'ALL') {
        matchesRole = log.actor_role === roleFilter;
      }

      return matchesSearch && matchesAction && matchesRole;
    }).sort((a, b) => {
      if (sortOption === 'NEWEST') {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      }
      if (sortOption === 'OLDEST') {
        return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      }
      if (sortOption === 'ACTION') {
        return (a.action || '').localeCompare(b.action || '');
      }
      return 0;
    });
  }, [safeLogs, searchTerm, actionFilter, roleFilter, sortOption]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setActionFilter('ALL');
    setRoleFilter('ALL');
    setSortOption('NEWEST');
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        icon="manage_search"
        title="Statutory Audit Trail & Governance Log"
        subtitle="Immutable chronological record of administrative actions, overrides, and certifications"
        badge={{ text: `${safeLogs.length} Records`, variant: 'primary' }}
        actions={
          <button
            onClick={loadLogs}
            className="btn btn-secondary btn-sm"
          >
            <span className="material-symbols-outlined text-[15px]">sync</span>
            Refresh
          </button>
        }
      />

      {/* List Toolbar */}
      <ListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search audit events by Actor, Action, Entity ID, or Payload..."
        filters={[
          {
            id: 'action',
            label: 'Action',
            value: actionFilter,
            onChange: setActionFilter,
            options: uniqueActions
          },
          {
            id: 'role',
            label: 'Role',
            value: roleFilter,
            onChange: setRoleFilter,
            options: [
              { label: 'All Roles', value: 'ALL' },
              { label: 'Trader', value: 'TRADER' },
              { label: 'Authority', value: 'AUTHORITY' },
              { label: 'Verifier', value: 'VERIFIER' },
              { label: 'GATC Lab', value: 'GATC' },
              { label: 'Platform Admin', value: 'PLATFORM_ADMIN' }
            ]
          }
        ]}
        sortOptions={[
          { label: 'Newest First', value: 'NEWEST' },
          { label: 'Oldest First', value: 'OLDEST' },
          { label: 'Action Type (A-Z)', value: 'ACTION' }
        ]}
        sortValue={sortOption}
        onSortChange={setSortOption}
        onReset={handleResetFilters}
        totalCount={safeLogs.length}
        filteredCount={filteredLogs.length}
      />

      {/* Audit Log Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="space-y-2 p-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton h-12 rounded-lg"></div>)}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <span className="material-symbols-outlined text-3xl text-slate-400">manage_search</span>
            </div>
            <p className="text-sm font-semibold text-slate-600 mb-1">No Audit Events Found</p>
            <p className="text-xs text-slate-400">No audit events match your search/filter parameters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table min-w-[750px]">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Actor Particulars</th>
                  <th>Audit Payload</th>
                  <th className="text-right">Inspect</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  let detailsStr = '';
                  if (log.details && typeof log.details === 'object') {
                    detailsStr = JSON.stringify(log.details);
                  } else if (log.details_json) {
                    detailsStr = log.details_json;
                  } else if (log.details) {
                    detailsStr = String(log.details);
                  }

                  const isOverride = log.action === 'ASSIGNMENT_OVERRIDE';
                  const isCertificate = log.action === 'ISSUE_CERTIFICATE' || log.action === 'APPROVE_APPLICATION';

                  return (
                    <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${isOverride ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        <div>{new Date(log.created_at).toLocaleDateString()}</div>
                        <div className="text-[10px] text-slate-400">{new Date(log.created_at).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          isOverride
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : isCertificate
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                            : 'bg-slate-100 text-slate-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-semibold text-slate-900 block">{log.entity_name}</span>
                        <span className="block font-mono text-[10px] text-slate-400 truncate max-w-[140px]" title={log.entity_id}>
                          {log.entity_id}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="font-bold text-slate-800 block">{log.actor_id}</span>
                        <span className="inline-block text-[10px] uppercase font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                          {log.actor_role}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-[11px] text-slate-600 max-w-xs truncate" title={detailsStr}>
                        {detailsStr || '—'}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2.5 py-1 text-slate-700 hover:text-primary bg-slate-100 hover:bg-slate-200 rounded font-semibold text-xs transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Audit Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">history_edu</span>
                <h3 className="font-bold text-slate-900 text-base">Audit Entry Particulars</h3>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Action</span>
                  <span className="font-mono font-bold text-slate-900">{selectedLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Timestamp</span>
                  <span className="font-mono text-slate-700">{new Date(selectedLog.created_at).toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Actor</span>
                  <span className="font-bold text-slate-900">{selectedLog.actor_id} ({selectedLog.actor_role})</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Entity</span>
                  <span className="font-mono text-slate-700">{selectedLog.entity_name} : {selectedLog.entity_id}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Raw Details Payload (JSON)</span>
                <pre className="p-3 bg-slate-900 text-emerald-400 rounded-xl font-mono text-[11px] overflow-x-auto">
                  {(() => {
                    if (selectedLog.details && typeof selectedLog.details === 'object') {
                      return JSON.stringify(selectedLog.details, null, 2);
                    }
                    if (selectedLog.details_json) {
                      try {
                        return JSON.stringify(JSON.parse(selectedLog.details_json), null, 2);
                      } catch (e) {
                        return selectedLog.details_json;
                      }
                    }
                    return selectedLog.details ? String(selectedLog.details) : '—';
                  })()}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 cursor-pointer"
              >
                Close Particulars
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
