import React, { useEffect, useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import ListToolbar from '../components/ListToolbar';
import { api } from '../api';

const ORG_TYPES = [
  { value: 'ALL', label: 'All Entity Types' },
  { value: 'AUTHORITY', label: 'Legal Metrology Authority / Department' },
  { value: 'GATC', label: 'GATC Metrology Testing Center' },
  { value: 'TRADER', label: 'Commercial Trader / Manufacturer' }
];

export default function AdminOrgsView({ currentUser, onBack }) {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const loadOrgs = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminOrganizations();
      setOrganizations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrgs();
  }, []);

  const filteredOrgs = useMemo(() => {
    return organizations.filter((org) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        org.name?.toLowerCase().includes(q) ||
        org.code?.toLowerCase().includes(q) ||
        org.state?.toLowerCase().includes(q) ||
        org.address?.toLowerCase().includes(q) ||
        (org.jurisdictions || []).some((j) => j.toLowerCase().includes(q));

      const matchesType =
        typeFilter === 'ALL' ||
        org.type === typeFilter ||
        (typeFilter === 'AUTHORITY' && (org.type === 'STATUTORY_AUTHORITY' || org.type === 'AUTHORITY')) ||
        (typeFilter === 'GATC' && (org.type === 'TEST_CENTRE' || org.type === 'GATC')) ||
        (typeFilter === 'TRADER' && (org.type === 'TRADER_ORG' || org.type === 'TRADER'));
      return matchesSearch && matchesType;
    });
  }, [organizations, searchTerm, typeFilter]);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'STATUTORY_AUTHORITY':
      case 'AUTHORITY':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">Authority Department</span>;
      case 'TEST_CENTRE':
      case 'GATC':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">GATC Testing Center</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">Commercial Trader</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        icon="apartment"
        title="Statutory Offices & Metrology Testing Labs"
        subtitle="Jurisdictions, Government Approved Test Centres (GATC), and registered trading establishments"
        badge={{ text: `${organizations.length} Registered`, variant: 'primary' }}
        actions={
          onBack && (
            <button onClick={onBack} className="btn btn-secondary btn-sm">
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              Dashboard
            </button>
          )
        }
      />

      {/* List Toolbar */}
      <ListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by office name, district, code, state..."
        filters={[
          {
            id: 'type',
            label: 'Entity Type',
            value: typeFilter,
            onChange: setTypeFilter,
            options: ORG_TYPES
          }
        ]}
        onReset={() => {
          setSearchTerm('');
          setTypeFilter('ALL');
        }}
      />

      {/* Organizations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="px-5 py-3.5">Establishment / Office</th>
                <th className="px-5 py-3.5">Classification</th>
                <th className="px-5 py-3.5">Jurisdiction Coverage</th>
                <th className="px-5 py-3.5">Contact Information</th>
                <th className="px-5 py-3.5 text-right">Equipment Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
                    Loading establishment registry...
                  </td>
                </tr>
              ) : filteredOrgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl mb-1 text-slate-300 block">domain_disabled</span>
                    No offices or labs match the search criteria.
                  </td>
                </tr>
              ) : (
                filteredOrgs.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-[#002046] shrink-0">
                          <span className="material-symbols-outlined text-lg">
                            {org.type === 'GATC' ? 'science' : org.type === 'AUTHORITY' ? 'gavel' : 'store'}
                          </span>
                        </div>
                        <div>
                          <span className="font-bold text-slate-900 block">{org.name}</span>
                          <span className="font-mono text-[10px] text-slate-400">{org.id || org.code}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      {getTypeBadge(org.type)}
                    </td>
                    <td className="px-5 py-3.5">
                      {Array.isArray(org.jurisdictions) && org.jurisdictions.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {org.jurisdictions.map((j) => (
                            <span key={j} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {j}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Universal State Jurisdiction</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <span className="block font-medium text-slate-900">{org.email || org.contact_email || '—'}</span>
                      <span className="text-[10px] text-slate-400 block">{org.address || `${org.city || ''}, ${org.state || ''}`}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">
                      {org.instrument_count || 0} units
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
