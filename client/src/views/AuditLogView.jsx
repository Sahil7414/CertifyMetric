import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AuditLogView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getAuditLogs()
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Statutory Audit Trail & Governance Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">Immutable chronological record of administrative actions, overrides, and certifications</p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
          {logs.length} Log Entries
        </span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">Loading audit ledger...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No audit events recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Entity</th>
                  <th className="px-6 py-3.5">Actor</th>
                  <th className="px-6 py-3.5">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {logs.map((log) => {
                  let details = {};
                  try { details = JSON.parse(log.details_json); } catch (e) {}

                  const isOverride = log.action === 'ASSIGNMENT_OVERRIDE';

                  return (
                    <tr key={log.id} className={`hover:bg-slate-50 transition-colors ${isOverride ? 'bg-amber-50/50' : ''}`}>
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isOverride ? 'bg-amber-200 text-amber-900 border border-amber-300' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-slate-800">{log.entity_name}</span>
                        <span className="block font-mono text-[10px] text-slate-400">{log.entity_id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">{log.actor_id}</span>
                        <span className="block text-[10px] text-slate-400 uppercase font-semibold">{log.actor_role}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-[11px] text-slate-600 max-w-xs truncate" title={log.details_json}>
                        {JSON.stringify(details)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
