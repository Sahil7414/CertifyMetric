import React, { useState, useMemo, useEffect } from 'react';
import StatusBadge from '../components/StatusBadge';
import ListToolbar from '../components/ListToolbar';
import PageHeader from '../components/PageHeader';
import Pagination from '../components/Pagination';

export default function CertificatesList({
  certificates = [],
  onSelectCertificate,
  onOpenQR
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOption, setSortOption] = useState('NEWEST');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const safeCertificates = Array.isArray(certificates) ? certificates : [];

  const filteredCertificates = useMemo(() => {
    return safeCertificates.filter((cert) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        cert.certificate_no?.toLowerCase().includes(q) ||
        cert.public_token?.toLowerCase().includes(q) ||
        cert.manufacturer?.toLowerCase().includes(q) ||
        cert.model?.toLowerCase().includes(q) ||
        cert.serial_number?.toLowerCase().includes(q);

      let matchesStatus = true;
      if (statusFilter !== 'ALL') {
        matchesStatus = cert.status === statusFilter;
      }

      return matchesSearch && matchesStatus;
    }).sort((a, b) => {
      if (sortOption === 'NEWEST') {
        return new Date(b.issue_date || 0) - new Date(a.issue_date || 0);
      }
      if (sortOption === 'EXPIRY') {
        return new Date(a.valid_until || 0) - new Date(b.valid_until || 0);
      }
      if (sortOption === 'CERT_NO') {
        return (a.certificate_no || '').localeCompare(b.certificate_no || '');
      }
      return 0;
    });
  }, [safeCertificates, searchTerm, statusFilter, sortOption]);

  // Reset to page 1 on search / filter / sort change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, sortOption]);

  const totalPages = Math.ceil(filteredCertificates.length / pageSize) || 1;
  const paginatedCertificates = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredCertificates.slice(startIndex, startIndex + pageSize);
  }, [filteredCertificates, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setSortOption('NEWEST');
    setCurrentPage(1);
  };

  const validCount = safeCertificates.filter(c => c.status === 'VALID').length;
  const expiringCount = safeCertificates.filter(c => c.status === 'EXPIRING').length;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Page Header */}
      <PageHeader
        icon="workspace_premium"
        title="Statutory Verification Certificates"
        subtitle="Official compliance credentials issued under the Legal Metrology Act, 2009"
        badge={{ text: `${safeCertificates.length} Total Issued`, variant: 'primary' }}
      />

      {/* Summary pills */}
      {safeCertificates.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
            <span className="material-symbols-outlined text-[14px]">verified</span>
            {validCount} Valid
          </span>
          {expiringCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
              <span className="material-symbols-outlined text-[14px]">warning</span>
              {expiringCount} Expiring Soon
            </span>
          )}
        </div>
      )}

      {/* List Toolbar */}
      <ListToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by Certificate No, Token, Manufacturer, Model, Serial No..."
        filters={[
          {
            id: 'status',
            label: 'Status',
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: 'All Certificates', value: 'ALL' },
              { label: 'Valid / In Force', value: 'VALID' },
              { label: 'Expiring Soon', value: 'EXPIRING' },
              { label: 'Expired', value: 'EXPIRED' },
              { label: 'Suspended / Revoked', value: 'REVOKED' }
            ]
          }
        ]}
        sortOptions={[
          { label: 'Newest Issue Date', value: 'NEWEST' },
          { label: 'Expiry Date (Soonest)', value: 'EXPIRY' },
          { label: 'Certificate No', value: 'CERT_NO' }
        ]}
        sortValue={sortOption}
        onSortChange={setSortOption}
        onReset={handleResetFilters}
        totalCount={safeCertificates.length}
        filteredCount={filteredCertificates.length}
      />

      {/* Certificates Table */}
      <div className="card overflow-hidden w-full">
        <div className="w-full overflow-x-auto">
          <table className="data-table w-full min-w-[700px]">
            <thead>
              <tr>
                <th className="w-[20%] min-w-[140px]">Certificate No</th>
                <th className="w-[26%] min-w-[170px]">Verified Instrument</th>
                <th className="w-[16%] min-w-[110px]">Issue Date</th>
                <th className="w-[16%] min-w-[110px]">Valid Until</th>
                <th className="w-[12%] min-w-[100px]">Status</th>
                <th className="text-right min-w-[110px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginatedCertificates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-0">
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <span className="material-symbols-outlined text-3xl text-slate-400">workspace_premium</span>
                      </div>
                      <p className="text-sm font-semibold text-slate-600 mb-1">No Certificates Found</p>
                      <p className="text-xs text-slate-400 max-w-xs">
                        {searchTerm || statusFilter !== 'ALL'
                          ? 'No certificates match the current search and filter criteria.'
                          : 'Certificates will appear here once verification applications are approved.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedCertificates.map((cert) => {
                  const isExpiringSoon = cert.status === 'EXPIRING';
                  const isExpired = cert.status === 'EXPIRED';
                  return (
                    <tr key={cert.id}>
                      <td>
                        <div className="font-mono font-bold text-[#002046] text-[11px]">{cert.certificate_no}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5 truncate max-w-[140px]">{cert.public_token}</div>
                      </td>
                      <td>
                        <span className="font-bold text-slate-900">{cert.manufacturer} {cert.model}</span>
                        <span className="block text-[11px] text-slate-500 font-mono">SN: {cert.serial_number}</span>
                      </td>
                      <td className="text-slate-700 font-medium">
                        {new Date(cert.issue_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                      <td>
                        <span className={`font-semibold ${isExpired ? 'text-rose-700' : isExpiringSoon ? 'text-amber-700' : 'text-slate-800'}`}>
                          {new Date(cert.valid_until).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        {isExpiringSoon && <span className="block text-[10px] text-amber-600 font-semibold">Expiring Soon</span>}
                        {isExpired && <span className="block text-[10px] text-rose-600 font-semibold">Expired</span>}
                      </td>
                      <td>
                        <StatusBadge status={cert.status} />
                      </td>
                      <td className="text-right">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => onSelectCertificate(cert.id)}
                            className="btn btn-primary btn-sm text-[11px]"
                            title="View Full Statutory Certificate"
                          >
                            <span className="material-symbols-outlined text-[13px]">visibility</span>
                            View
                          </button>

                          {onOpenQR && (
                            <button
                              onClick={() => onOpenQR({
                                certificate_no: cert.certificate_no,
                                public_token: cert.public_token,
                                status: cert.status
                              })}
                              className="btn btn-ghost btn-sm text-[11px]"
                              title="Display QR Code"
                            >
                              <span className="material-symbols-outlined text-[15px] text-[#002046]">qr_code_2</span>
                              QR
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

        {/* Responsive Pagination Component */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredCertificates.length}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setPageSize}
          pageSizeOptions={[10, 20, 50]}
          itemName="certificates"
        />
      </div>
    </div>
  );
}
