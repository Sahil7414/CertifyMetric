import React, { useState, useMemo, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import ListToolbar from '../components/ListToolbar';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';

export default function InstrumentsList({
  instruments = [],
  onOpenAddModal,
  onOpenApplyModal,
  onSelectInstrument,
  onRequestVerification,
  onOpenQR
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState('DEFAULT');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const safeInstruments = Array.isArray(instruments) ? instruments : [];

  // Extract unique categories for dynamic filter
  const categoryOptions = useMemo(() => {
    const categories = Array.from(new Set(safeInstruments.map(i => i.category_name).filter(Boolean)));
    return [
      { label: 'All Categories', value: 'ALL' },
      ...categories.map(c => ({ label: c, value: c }))
    ];
  }, [safeInstruments]);

  // Filter and sort instruments
  const filteredInstruments = useMemo(() => {
    return safeInstruments.filter((inst) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inst.serial_number?.toLowerCase().includes(q) ||
        inst.manufacturer?.toLowerCase().includes(q) ||
        inst.model?.toLowerCase().includes(q) ||
        inst.location?.toLowerCase().includes(q) ||
        inst.category_name?.toLowerCase().includes(q);

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        matchesStatus = inst.status === statusFilter;
      }

      let matchesCategory = true;
      if (categoryFilter !== 'ALL') {
        matchesCategory = inst.category_name === categoryFilter;
      }

      return matchesSearch && matchesStatus && matchesCategory;
    }).sort((a, b) => {
      if (sortOption === 'MANUFACTURER') {
        return (a.manufacturer || '').localeCompare(b.manufacturer || '');
      }
      if (sortOption === 'SERIAL') {
        return (a.serial_number || '').localeCompare(b.serial_number || '');
      }
      if (sortOption === 'STATUS') {
        return (a.status || '').localeCompare(b.status || '');
      }
      return 0;
    });
  }, [safeInstruments, searchTerm, statusFilter, categoryFilter, sortOption]);

  // Reset to page 1 on filter/sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, categoryFilter, sortOption]);

  const totalPages = Math.ceil(filteredInstruments.length / pageSize) || 1;
  const paginatedInstruments = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredInstruments.slice(startIndex, startIndex + pageSize);
  }, [filteredInstruments, currentPage, pageSize]);

  const handleApply = (id) => {
    if (onOpenApplyModal) onOpenApplyModal(id);
    else if (onRequestVerification) onRequestVerification(id);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setCategoryFilter('ALL');
    setSortOption('DEFAULT');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        icon="scale"
        title="Registered Instruments Registry"
        subtitle="Commercial instruments registered for statutory verification under the Legal Metrology Act"
        badge={{ text: `${safeInstruments.length} Total`, variant: 'primary' }}
        actions={
          <>
            {onOpenApplyModal && (
              <button
                onClick={() => handleApply(null)}
                className="btn btn-warning btn-sm"
              >
                <span className="material-symbols-outlined text-[15px]">post_add</span>
                Apply for Verification
              </button>
            )}
            <button
              onClick={onOpenAddModal}
              className="btn btn-primary btn-sm"
            >
              <span className="material-symbols-outlined text-[15px]">add_circle</span>
              Register Instrument
            </button>
          </>
        }
      />

      {/* Search and Filters Toolbar */}
      <ListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by Serial No, Manufacturer, Model, Location, Category..."
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Statuses', value: 'ALL' },
              { label: 'Registered', value: 'REGISTERED' },
              { label: 'Verified / Certified', value: 'VERIFIED' },
              { label: 'Expiring Soon', value: 'EXPIRING' },
              { label: 'Expired', value: 'EXPIRED' }
            ]
          },
          ...(categoryOptions.length > 2 ? [{
            id: 'category',
            label: 'Category',
            value: categoryFilter,
            onChange: setCategoryFilter,
            options: categoryOptions
          }] : [])
        ]}
        sortOptions={[
          { label: 'Default Order', value: 'DEFAULT' },
          { label: 'Manufacturer (A-Z)', value: 'MANUFACTURER' },
          { label: 'Serial Number', value: 'SERIAL' },
          { label: 'Status', value: 'STATUS' }
        ]}
        sortValue={sortOption}
        onSortChange={setSortOption}
        onReset={handleResetFilters}
        totalCount={safeInstruments.length}
        filteredCount={filteredInstruments.length}
      />

      {/* Instruments Table */}
      <div className="card overflow-hidden w-full">
        <div className="w-full overflow-x-auto">
          <table className="data-table w-full min-w-[720px]">
            <thead>
              <tr>
                <th className="w-[22%] min-w-[150px]">Device & Model</th>
                <th className="w-[16%] min-w-[120px]">Serial Number</th>
                <th className="w-[18%] min-w-[130px]">Category</th>
                <th className="w-[16%] min-w-[110px]">Capacity / Range</th>
                <th className="w-[14%] min-w-[110px]">Location</th>
                <th className="w-[14%] min-w-[100px]">Status</th>
                <th className="text-right min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedInstruments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-0">
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <span className="material-symbols-outlined text-3xl text-slate-400">inventory_2</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 mb-1">No Instruments Found</p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        {searchTerm || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                          ? 'No instruments match the current search and filter criteria. Try adjusting your filters.'
                          : 'No instruments registered yet. Click "Register Instrument" to get started.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedInstruments.map((inst) => (
                  <tr key={inst.id}>
                    <td>
                      <span className="font-bold text-slate-900 block">{inst.manufacturer}</span>
                      <span className="text-[11px] text-slate-500">{inst.model}</span>
                    </td>
                    <td>
                      <span className="font-mono font-semibold text-slate-800 text-[11px] bg-slate-100 px-2 py-0.5 rounded">
                        {inst.serial_number}
                      </span>
                    </td>
                    <td className="text-slate-600 max-w-[180px] truncate" title={inst.category_name}>
                      {inst.category_name}
                    </td>
                    <td>
                      <span className="font-semibold text-slate-800">{inst.max_capacity}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">e = {inst.verification_scale_interval_e}</span>
                    </td>
                    <td className="text-slate-600 max-w-[180px] truncate" title={inst.location}>
                      {inst.location}
                    </td>
                    <td>
                      <StatusBadge status={inst.status} />
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        <button
                          onClick={() => onSelectInstrument(inst.id)}
                          className="btn btn-ghost btn-sm text-[11px]"
                        >
                          <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                          Profile
                        </button>
                        {inst.status === 'REGISTERED' && (
                          <button
                            onClick={() => handleApply(inst.id)}
                            className="btn btn-primary btn-sm text-[11px]"
                          >
                            Apply
                          </button>
                        )}
                        {inst.status === 'EXPIRING' && (
                          <button
                            onClick={() => handleApply(inst.id)}
                            className="btn btn-warning btn-sm text-[11px]"
                          >
                            Re-verify
                          </button>
                        )}
                        {inst.certificate_no && (
                          <button
                            onClick={() => onOpenQR({
                              certificate_no: inst.certificate_no,
                              public_token: inst.public_token,
                              status: inst.cert_status || 'VALID'
                            })}
                            className="btn btn-ghost btn-sm"
                            title="Display QR Code"
                          >
                            <span className="material-symbols-outlined text-[18px] text-[#002046]">qr_code_2</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Responsive Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredInstruments.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
          itemName="instruments"
        />
      </div>
    </div>
  );
}
