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
    <div className="space-y-6 w-full animate-in fade-in duration-300">
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
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'CATEGORIES'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base">category</span>
          <span>Instrument Categories ({categories.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('RULESETS')}
          className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'RULESETS'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <span className="material-symbols-outlined text-base">rule</span>
          <span>Schedule IV Rulesets ({rulesets.length})</span>
        </button>
      </div>

      {/* Content Section */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <span className="material-symbols-outlined text-3xl animate-spin block mb-2 text-primary">progress_activity</span>
          Loading metrology specifications...
        </div>
      ) : activeTab === 'CATEGORIES' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-[35%] min-w-[180px]">Category Name</th>
                  <th className="px-5 py-3.5 w-[15%] min-w-[100px]">Code</th>
                  <th className="px-5 py-3.5 w-[18%] min-w-[120px]">Accuracy Class</th>
                  <th className="px-5 py-3.5 w-[16%] min-w-[110px]">Validity Period</th>
                  <th className="px-5 py-3.5 text-right min-w-[110px]">Statutory Base Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedCategories.map((c) => (
                  <tr key={c.id || c.code} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-bold text-slate-900">
                      {c.name}
                      <span className="block text-[11px] font-normal text-slate-500">{c.description || 'Legal metrology weighing instrument'}</span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[#002046] font-bold">
                      {c.code || c.id}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {c.accuracy_class || 'Class III (Medium)'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {c.validity_period_years ? `${c.validity_period_years} Year(s)` : '12 Months (Annual)'}
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-bold text-slate-900">
                      ₹{c.base_fee || c.default_fee || 300}
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5 w-[20%] min-w-[130px]">Ruleset ID</th>
                  <th className="px-5 py-3.5 w-[18%] min-w-[120px]">Accuracy Class</th>
                  <th className="px-5 py-3.5 w-[22%] min-w-[140px]">Test Interval (m)</th>
                  <th className="px-5 py-3.5 w-[22%] min-w-[140px]">MPE Formula</th>
                  <th className="px-5 py-3.5 text-right min-w-[130px]">Statutory Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedRulesets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400">
                      Schedule IV rulesets actively maintained in statutory engine.
                    </td>
                  </tr>
                ) : (
                  paginatedRulesets.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-bold text-primary">
                        {r.id}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          {r.class_name || r.accuracy_class}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-slate-600">
                        {r.verification_scale_interval || '0 ≤ m ≤ 500e: ±0.5e'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-slate-800 font-semibold">
                        {r.formula || '±1.0e (500e < m ≤ 2000e)'}
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-500 font-mono text-[11px]">
                        {r.statutory_rule || 'LM (General) Rules, 2011'}
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
