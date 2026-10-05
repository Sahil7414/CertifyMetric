import React, { useEffect, useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import ListToolbar from '../components/ListToolbar';
import Pagination from '../components/Pagination';
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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const counts = useMemo(() => {
    const total = organizations.length;
    const authorities = organizations.filter(o => o.type === 'AUTHORITY' || o.type === 'STATUTORY_AUTHORITY').length;
    const gatc = organizations.filter(o => o.type === 'GATC' || o.type === 'TEST_CENTRE').length;
    const traders = organizations.filter(o => o.type === 'TRADER' || o.type === 'TRADER_ORG' || (!o.type || (o.type !== 'AUTHORITY' && o.type !== 'STATUTORY_AUTHORITY' && o.type !== 'GATC' && o.type !== 'TEST_CENTRE'))).length;
    const totalEquipment = organizations.reduce((acc, o) => acc + (Number(o.instrument_count) || 0), 0);
    return { total, authorities, gatc, traders, totalEquipment };
  }, [organizations]);

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

  // Reset to page 1 on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, typeFilter]);

  const totalPages = Math.ceil(filteredOrgs.length / pageSize) || 1;
  const paginatedOrgs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredOrgs.slice(startIndex, startIndex + pageSize);
  }, [filteredOrgs, currentPage, pageSize]);

  const getTypeBadge = (type) => {
    switch (type) {
      case 'STATUTORY_AUTHORITY':
      case 'AUTHORITY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
            Authority Department
          </span>
        );
      case 'TEST_CENTRE':
      case 'GATC':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0"></span>
            GATC Testing Center
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

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Entities</div>
            <div className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 font-mono">{counts.total}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <span className="material-symbols-outlined text-xl">domain</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-blue-100 bg-gradient-to-br from-white to-blue-50/30 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Authority Depts</div>
            <div className="text-xl sm:text-2xl font-black text-blue-900 mt-0.5 font-mono">{counts.authorities}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">account_balance</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-amber-100 bg-gradient-to-br from-white to-amber-50/30 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider">GATC Labs</div>
            <div className="text-xl sm:text-2xl font-black text-amber-950 mt-0.5 font-mono">{counts.gatc}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-800 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">science</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">Traders & Makers</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-950 mt-0.5 font-mono">{counts.traders}</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">storefront</span>
          </div>
        </div>
      </div>

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
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left text-xs min-w-[960px]">
            <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-5 py-4 w-[32%] min-w-[280px]">Establishment / Office</th>
                <th className="px-5 py-4 w-[18%] min-w-[190px] whitespace-nowrap">Classification</th>
                <th className="px-5 py-4 w-[24%] min-w-[230px]">Jurisdiction Coverage</th>
                <th className="px-5 py-4 w-[16%] min-w-[200px]">Contact Information</th>
                <th className="px-5 py-4 w-[10%] min-w-[130px] text-right whitespace-nowrap">Equipment Volume</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
                    Loading establishment registry...
                  </td>
                </tr>
              ) : paginatedOrgs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center text-slate-400">
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-300">
                      <span className="material-symbols-outlined text-3xl">domain_disabled</span>
                    </div>
                    <p className="text-sm font-semibold text-slate-600 mb-1">No Establishments Found</p>
                    <p className="text-xs text-slate-400 max-w-sm mx-auto">
                      No statutory offices, laboratories, or trading establishments match your search criteria.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedOrgs.map((org) => {
                  const isAuth = org.type === 'AUTHORITY' || org.type === 'STATUTORY_AUTHORITY';
                  const isGatc = org.type === 'GATC' || org.type === 'TEST_CENTRE';

                  const email = org.email || org.contact_email;
                  const locationParts = [org.address, org.city, org.state].filter(Boolean);
                  const locationText = locationParts.length > 0 
                    ? (org.address || `${org.city || ''}${org.city && org.state ? ', ' : ''}${org.state || ''}`)
                    : null;

                  return (
                    <tr key={org.id || org.code} className="hover:bg-slate-50/80 transition-colors">
                      {/* 1. Establishment / Office */}
                      <td className="px-5 py-4 align-middle">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                            isGatc 
                              ? 'bg-amber-50 text-amber-700 border-amber-200' 
                              : isAuth 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            <span className="material-symbols-outlined text-xl select-none">
                              {isGatc ? 'science' : isAuth ? 'account_balance' : 'storefront'}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 block text-xs leading-snug truncate max-w-md" title={org.name}>
                              {org.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 font-medium">
                                {org.id || org.code || 'ID-N/A'}
                              </span>
                              {org.state && (
                                <span className="text-[11px] text-slate-400 font-medium">
                                  • {org.state}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Classification Badge (Guaranteed No Awkward Wrap) */}
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        {getTypeBadge(org.type)}
                      </td>

                      {/* 3. Jurisdiction Coverage */}
                      <td className="px-5 py-4 align-middle">
                        {Array.isArray(org.jurisdictions) && org.jurisdictions.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {org.jurisdictions.map((j) => (
                              <span 
                                key={j} 
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200/90 whitespace-nowrap shadow-2xs"
                              >
                                {j}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-slate-400 italic text-xs">
                            <span className="material-symbols-outlined text-[15px] text-slate-300">public</span>
                            Universal State Jurisdiction
                          </span>
                        )}
                      </td>

                      {/* 4. Contact Information */}
                      <td className="px-5 py-4 align-middle text-slate-600">
                        {!email && !locationText ? (
                          <span className="text-slate-400 text-xs italic">— Not configured —</span>
                        ) : (
                          <div className="space-y-1">
                            {email ? (
                              <div className="flex items-center gap-1.5 text-xs text-slate-800 font-medium truncate max-w-xs" title={email}>
                                <span className="material-symbols-outlined text-[14px] text-slate-400 shrink-0">mail</span>
                                <span className="truncate">{email}</span>
                              </div>
                            ) : null}
                            {locationText ? (
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate max-w-xs" title={locationText}>
                                <span className="material-symbols-outlined text-[14px] text-slate-400 shrink-0">location_on</span>
                                <span className="truncate">{locationText}</span>
                              </div>
                            ) : null}
                          </div>
                        )}
                      </td>

                      {/* 5. Equipment Volume */}
                      <td className="px-5 py-4 align-middle text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-mono font-bold bg-slate-50 text-slate-800 border border-slate-200 shadow-2xs">
                          <span className="material-symbols-outlined text-[14px] text-slate-400">scale</span>
                          {org.instrument_count || 0} units
                        </span>
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
          totalItems={filteredOrgs.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
          itemName="establishments"
        />
      </div>
    </div>
  );
}
