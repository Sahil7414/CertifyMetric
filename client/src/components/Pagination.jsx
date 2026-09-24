import React from 'react';

/**
 * Universal, accessible, mobile-responsive Pagination component for CertifyMetric.
 *
 * Props:
 * - currentPage (number, 1-indexed)
 * - totalPages (number)
 * - totalItems (number)
 * - itemsPerPage (number)
 * - onPageChange (function: (newPage: number) => void)
 * - onItemsPerPageChange (optional function: (newSize: number) => void)
 * - pageSizeOptions (optional array of numbers, default: [10, 20, 50])
 * - itemName (optional string, default: "items")
 */
export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  itemsPerPage = 10,
  onPageChange,
  onItemsPerPageChange,
  pageSizeOptions = [10, 20, 50],
  itemName = 'records'
}) {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate visible page numbers with smart ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs text-slate-600 rounded-b-2xl">
      {/* 1. Item range and total count */}
      <div className="flex items-center gap-2 text-slate-500 order-2 sm:order-1">
        <span>
          Showing <strong className="font-semibold text-slate-900">{startItem}</strong>–
          <strong className="font-semibold text-slate-900">{endItem}</strong> of{' '}
          <strong className="font-semibold text-slate-900">{totalItems}</strong> {itemName}
        </span>

        {/* Page size dropdown */}
        {onItemsPerPageChange && (
          <div className="hidden md:flex items-center gap-1.5 ml-3 pl-3 border-l border-slate-200">
            <label htmlFor="per-page-select" className="text-slate-400 text-[11px]">
              Per page:
            </label>
            <select
              id="per-page-select"
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none focus:border-[#002046] transition-colors cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 2. Navigation Controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Previous Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-1 cursor-pointer"
          title="Previous page"
          aria-label="Previous page"
        >
          <span className="material-symbols-outlined text-[16px]">chevron_left</span>
          <span className="hidden xs:inline">Prev</span>
        </button>

        {/* Page numbers (Desktop / Tablet) */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 py-1 text-slate-400 font-mono">
                  …
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className={`min-w-[2rem] h-8 px-2 rounded-lg font-semibold text-xs transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#002046] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Compact Page Indicator for Mobile */}
        <div className="sm:hidden px-2.5 py-1 bg-slate-100 rounded-lg font-mono text-[11px] font-semibold text-slate-700">
          {currentPage} / {totalPages}
        </div>

        {/* Next Button */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-1 cursor-pointer"
          title="Next page"
          aria-label="Next page"
        >
          <span className="hidden xs:inline">Next</span>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}
