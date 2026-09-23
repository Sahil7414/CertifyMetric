import React from 'react';

/**
 * Reusable ListToolbar Component for CertifyMetric List and Table views.
 * Clean, modern toolbar with inline search, multi-filter dropdowns, sorting, and reset button.
 */
export default function ListToolbar({
  searchTerm = '',
  onSearchChange,
  searchPlaceholder = 'Search anything (Name, Model, Serial Number, App No, Trader)...',
  filters = [],
  sortOptions = [],
  sortValue = '',
  onSortChange,
  onReset,
  totalCount,
  filteredCount,
  extraActions
}) {
  const isFiltered = Boolean(
    searchTerm.trim() ||
    filters.some(f => f.value && f.value !== 'ALL' && f.value !== '') ||
    (sortValue && sortValue !== 'NEWEST' && sortValue !== 'DEFAULT')
  );

  return (
    <div className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200 shadow-xs space-y-2.5">
      {/* Primary Unified Toolbar Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
        {/* Universal Search Input */}
        <div className="relative flex-1 min-w-0 sm:min-w-[220px]">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-lg pointer-events-none">
            search
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full pl-9 pr-9 py-2 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-xl outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all font-sans text-slate-800 placeholder:text-slate-400"
          />
          {searchTerm && (
            <button
              onClick={() => onSearchChange && onSearchChange('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
              title="Clear search"
            >
              <span className="material-symbols-outlined text-[16px] block">close</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns and Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((filter) => (
            <div key={filter.id} className="flex items-center">
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className={`text-xs px-3 py-2 rounded-xl border font-semibold outline-none transition-all cursor-pointer ${
                  filter.value && filter.value !== 'ALL' && filter.value !== ''
                    ? 'bg-primary/10 text-primary border-primary/50 font-bold'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-white focus:border-slate-400'
                }`}
              >
                {filter.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} {opt.badge !== undefined && opt.badge !== null ? `(${opt.badge})` : ''}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Sort Dropdown */}
          {sortOptions.length > 0 && onSortChange && (
            <select
              value={sortValue}
              onChange={(e) => onSortChange(e.target.value)}
              className="text-xs px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-white text-slate-700 font-semibold outline-none transition-all cursor-pointer"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Sort: {opt.label}
                </option>
              ))}
            </select>
          )}

          {/* Reset / Clear All Filters */}
          {isFiltered && onReset && (
            <button
              onClick={onReset}
              className="text-xs px-3 py-2 rounded-xl font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
              title="Reset all search queries and filters"
            >
              <span className="material-symbols-outlined text-[14px]">filter_alt_off</span>
              <span>Reset</span>
            </button>
          )}

          {/* Extra action buttons */}
          {extraActions}
        </div>
      </div>

      {/* Filter Status Summary & Active Badges */}
      {(totalCount !== undefined || isFiltered) && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-1.5 font-medium">
            <span>
              Showing <strong className="text-slate-800 font-bold">{filteredCount !== undefined ? filteredCount : totalCount}</strong>
              {totalCount !== undefined && filteredCount !== undefined && filteredCount !== totalCount && (
                <span> of <strong className="text-slate-800 font-bold">{totalCount}</strong></span>
              )} items
            </span>
          </div>

          {/* Active Filter Chips */}
          {isFiltered && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-bold text-slate-400">Filtering by:</span>
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono text-[10px]">
                  <span>"{searchTerm}"</span>
                  <button
                    onClick={() => onSearchChange && onSearchChange('')}
                    className="hover:text-rose-600 font-bold ml-0.5 cursor-pointer"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.map((f) => {
                if (!f.value || f.value === 'ALL' || f.value === '') return null;
                const opt = f.options.find(o => o.value === f.value);
                return (
                  <span
                    key={f.id}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold text-[10px]"
                  >
                    <span>{f.label}: {opt?.label || f.value}</span>
                    <button
                      onClick={() => f.onChange('ALL')}
                      className="hover:text-rose-600 ml-0.5 font-bold cursor-pointer"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
