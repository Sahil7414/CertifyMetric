import React, { useEffect, useState, useMemo } from 'react';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';
import { api } from '../api';

export default function AdminMasterDataView({ currentUser, onBack }) {
  const [masterData, setMasterData] = useState({ categories: [], rulesets: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('CATEGORIES'); // 'CATEGORIES' | 'RULESETS'

  // Pagination states
  const [catPage, setCatPage] = useState(1);
  const [catPageSize, setCatPageSize] = useState(10);
  const [rulePage, setRulePage] = useState(1);
  const [rulePageSize, setRulePageSize] = useState(10);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminMasterData();
      setMasterData(data || { categories: [], rulesets: [] });
    } catch (err) {
      console.error('Failed to load master data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = Array.isArray(masterData.categories) ? masterData.categories : [];
  const rulesets = Array.isArray(masterData.rulesets) ? masterData.rulesets : [];

  const totalCatPages = Math.ceil(categories.length / catPageSize) || 1;
  const paginatedCategories = useMemo(() => {
    const startIndex = (catPage - 1) * catPageSize;
    return categories.slice(startIndex, startIndex + catPageSize);
  }, [categories, catPage, catPageSize]);

  const totalRulePages = Math.ceil(rulesets.length / rulePageSize) || 1;
  const paginatedRulesets = useMemo(() => {
    const startIndex = (rulePage - 1) * rulePageSize;
    return rulesets.slice(startIndex, startIndex + rulePageSize);
  }, [rulesets, rulePage, rulePageSize]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        icon="tune"
        title="Statutory Master Data & Rulesets"
        subtitle="Schedule IV rules, Maximum Permissible Error (MPE) thresholds, accuracy classes, and verification intervals"
        badge={{ text: `${categories.length} Categories`, variant: 'primary' }}
        actions={
          onBack && (
            <button onClick={onBack} className="btn btn-secondary btn-sm">
              <span className="material-symbols-outlined text-[15px]">arrow_back</span>
              Dashboard
            </button>
          )
        }
      />

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('CATEGORIES')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'CATEGORIES'
              ? 'border-[#002046] text-[#002046]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base">category</span>
          <span>Instrument Categories</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'CATEGORIES' ? 'bg-[#002046] text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {categories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('RULESETS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'RULESETS'
              ? 'border-[#002046] text-[#002046]'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base">rule</span>
          <span>Schedule IV Rulesets</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'RULESETS' ? 'bg-[#002046] text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {rulesets.length}
          </span>
        </button>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="p-16 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
          <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
          Loading metrology specifications...
        </div>
      ) : activeTab === 'CATEGORIES' ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden w-full">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-4 w-[34%] min-w-[220px]">Category Name & Scope</th>
                  <th className="px-5 py-4 w-[16%] min-w-[120px] whitespace-nowrap">Code Identifier</th>
                  <th className="px-5 py-4 w-[20%] min-w-[170px] whitespace-nowrap">Accuracy Class</th>
                  <th className="px-5 py-4 w-[16%] min-w-[140px] whitespace-nowrap">Validity Period</th>
                  <th className="px-5 py-4 w-[14%] text-right min-w-[120px] whitespace-nowrap">Statutory Base Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedCategories.map((c) => (
                  <tr key={c.id || c.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 align-middle">
                      <span className="font-bold text-slate-900 block text-xs leading-snug">{c.name}</span>
                      <span className="text-[11px] text-slate-500 block mt-0.5">{c.description || 'Legal metrology weighing & measuring instrument'}</span>
                    </td>
                    <td className="px-5 py-4 align-middle whitespace-nowrap">
                      <span className="font-mono text-[#002046] font-bold text-xs bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                        {c.code || c.id}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                        {c.accuracy_class || 'Class III (Medium)'}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle text-slate-700 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-xs font-medium">
                        <span className="material-symbols-outlined text-[15px] text-slate-400">calendar_today</span>
                        {c.validity_period_years ? `${c.validity_period_years} Year(s)` : '12 Months (Annual)'}
                      </span>
                    </td>
                    <td className="px-5 py-4 align-middle text-right whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs">
                        ₹{Number(c.base_fee || c.default_fee || 300).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Responsive Pagination Component */}
          <Pagination
            currentPage={catPage}
            totalPages={totalCatPages}
            totalItems={categories.length}
            itemsPerPage={catPageSize}
            onPageChange={setCatPage}
            onItemsPerPageChange={setCatPageSize}
            pageSizeOptions={[10, 20, 50]}
            itemName="categories"
          />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden w-full">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[850px]">
              <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-4 w-[20%] min-w-[140px] whitespace-nowrap">Ruleset ID</th>
                  <th className="px-5 py-4 w-[18%] min-w-[160px] whitespace-nowrap">Accuracy Class</th>
                  <th className="px-5 py-4 w-[22%] min-w-[170px]">Scale Interval (m)</th>
                  <th className="px-5 py-4 w-[22%] min-w-[170px]">MPE Formula</th>
                  <th className="px-5 py-4 w-[18%] text-right min-w-[150px] whitespace-nowrap">Statutory Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedRulesets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      Schedule IV rulesets actively maintained in statutory engine.
                    </td>
                  </tr>
                ) : (
                  paginatedRulesets.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        <span className="font-mono font-bold text-primary text-xs bg-slate-100 px-2 py-1 rounded-md border border-slate-200">
                          {r.id}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-purple-50 text-purple-700 border border-purple-200/80 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0"></span>
                          {r.class_name || r.accuracy_class}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle font-mono text-slate-700 text-xs">
                        {r.verification_scale_interval || '0 ≤ m ≤ 500e: ±0.5e'}
                      </td>
                      <td className="px-5 py-4 align-middle font-mono text-xs text-slate-800 font-semibold">
                        {r.formula || '±1.0e (500e < m ≤ 2000e)'}
                      </td>
                      <td className="px-5 py-4 align-middle text-right text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        <span className="inline-block bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600">
                          {r.statutory_rule || 'LM (General) Rules, 2011'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Responsive Pagination Component */}
          <Pagination
            currentPage={rulePage}
            totalPages={totalRulePages}
            totalItems={rulesets.length}
            itemsPerPage={rulePageSize}
            onPageChange={setRulePage}
            onItemsPerPageChange={setRulePageSize}
            pageSizeOptions={[10, 20, 50]}
            itemName="rulesets"
          />
        </div>
      )}
    </div>
  );
}
