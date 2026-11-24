import React, { useMemo, useState } from 'react';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  X,
} from 'lucide-react';
import EmptyState from './EmptyState';
import { buttonSecondary, focusRing } from '../../utils/uiStyles';

function extractSearchText(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(extractSearchText).join(' ');
  }
  if (typeof value === 'object') {
    return Object.values(value).map(extractSearchText).join(' ');
  }
  return '';
}

function escapeCsvCell(value) {
  const str = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function getPageNumbers(currentPage, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = [1];
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);

  if (start > 2) pages.push('ellipsis-start');
  for (let p = start; p <= end; p += 1) {
    pages.push(p);
  }
  if (end < totalPages - 1) pages.push('ellipsis-end');
  pages.push(totalPages);

  return pages;
}

const DataTable = ({
  columns = [],
  data = [],
  searchPlaceholder = 'Search records...',
  pageSize = 10,
  emptyTitle,
  emptyDescription,
  exportFilename,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  rowKey = 'id',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const resolveRowKey = (row, idx) => {
    if (typeof rowKey === 'function') return rowKey(row, idx);
    return row?.[rowKey] ?? idx;
  };

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const query = searchTerm.trim().toLowerCase();
    return data.filter((item) => extractSearchText(item).toLowerCase().includes(query));
  }, [data, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredData;
    const targetCol = columns.find((col, idx) => (col.accessor || col.header || String(idx)) === sortConfig.key);
    if (!targetCol) return filteredData;

    const copy = [...filteredData];
    copy.sort((a, b) => {
      const valA = targetCol.sortValue
        ? targetCol.sortValue(a)
        : targetCol.accessor
          ? a?.[targetCol.accessor]
          : '';
      const valB = targetCol.sortValue
        ? targetCol.sortValue(b)
        : targetCol.accessor
          ? b?.[targetCol.accessor]
          : '';

      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
      }

      const cmp = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      return sortConfig.direction === 'asc' ? cmp : -cmp;
    });
    return copy;
  }, [filteredData, sortConfig, columns]);

  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedData = sortedData.slice(startIndex, startIndex + pageSize);
  const pageNumbers = getPageNumbers(safePage, totalPages);

  const handleSort = (col, idx) => {
    if (!col.sortable) return;
    const colKey = col.accessor || col.header || String(idx);
    setSortConfig((prev) => {
      if (prev.key !== colKey) return { key: colKey, direction: 'asc' };
      if (prev.direction === 'asc') return { key: colKey, direction: 'desc' };
      return { key: null, direction: null };
    });
    setCurrentPage(1);
  };

  const handleExportCsv = () => {
    if (!exportFilename || sortedData.length === 0) return;
    const exportCols = columns.filter(
      (col) => col.exportable !== false && (col.accessor || typeof col.exportValue === 'function')
    );
    if (exportCols.length === 0) return;

    const headerRow = exportCols.map((col) => escapeCsvCell(col.header)).join(',');
    const bodyRows = sortedData.map((row) =>
      exportCols
        .map((col) => {
          const val = typeof col.exportValue === 'function' ? col.exportValue(row) : row?.[col.accessor];
          return escapeCsvCell(val);
        })
        .join(',')
    );

    const csv = [headerRow, ...bodyRows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFilename.endsWith('.csv') ? exportFilename : `${exportFilename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const selectedSet = new Set(selectedIds);
  const filteredKeys = sortedData.map((row, idx) => resolveRowKey(row, idx));
  const allFilteredSelected =
    selectable && filteredKeys.length > 0 && filteredKeys.every((key) => selectedSet.has(key));
  const someFilteredSelected =
    selectable && !allFilteredSelected && filteredKeys.some((key) => selectedSet.has(key));

  const toggleAllRows = () => {
    if (!onSelectionChange) return;
    if (allFilteredSelected) {
      const remaining = selectedIds.filter((id) => !filteredKeys.includes(id));
      onSelectionChange(remaining);
    } else {
      const merged = Array.from(new Set([...selectedIds, ...filteredKeys]));
      onSelectionChange(merged);
    }
  };

  const toggleSingleRow = (key) => {
    if (!onSelectionChange) return;
    if (selectedSet.has(key)) {
      onSelectionChange(selectedIds.filter((id) => id !== key));
    } else {
      onSelectionChange([...selectedIds, key]);
    }
  };

  return (
    <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
      {/* Table Top Controls */}
      <div className="flex flex-col justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className={`w-full rounded-md border border-slate-300 bg-white py-2 pl-10 pr-9 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-orange-700 focus:ring-2 focus:ring-orange-700 ${focusRing}`}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
              aria-label="Clear search"
              className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 ${focusRing}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {selectable && selectedIds.length > 0 && (
            <span className="rounded-md border border-orange-200 bg-orange-50 px-2.5 py-1.5 text-xs font-semibold text-orange-800">
              {selectedIds.length} selected
            </span>
          )}
          <div className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
            {sortedData.length > 0 ? startIndex + 1 : 0} - {Math.min(startIndex + pageSize, sortedData.length)} of{' '}
            {sortedData.length} entries
          </div>
          {exportFilename && (
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={sortedData.length === 0}
              className={`${buttonSecondary} py-1.5 px-3 text-xs`}
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </button>
          )}
        </div>
      </div>

      {/* Table Data View */}
      <div className="overflow-x-auto">
        {paginatedData.length > 0 ? (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                {selectable && (
                  <th className="w-10 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someFilteredSelected;
                      }}
                      onChange={toggleAllRows}
                      aria-label="Select all visible rows"
                      className={`h-4 w-4 rounded border-slate-300 text-orange-700 ${focusRing}`}
                    />
                  </th>
                )}
                {columns.map((col, idx) => {
                  const colKey = col.accessor || col.header || String(idx);
                  const isSorted = sortConfig.key === colKey;
                  const ariaSort = isSorted
                    ? sortConfig.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : col.sortable
                      ? 'none'
                      : undefined;

                  return (
                    <th key={colKey} aria-sort={ariaSort} className={`px-5 py-3.5 ${col.className || ''}`}>
                      {col.sortable ? (
                        <button
                          type="button"
                          onClick={() => handleSort(col, idx)}
                          className={`inline-flex items-center gap-1.5 rounded-md text-left uppercase tracking-widest hover:text-orange-700 ${focusRing}`}
                        >
                          <span>{col.header}</span>
                          {isSorted && sortConfig.direction === 'asc' && (
                            <ArrowUp className="h-3 w-3 text-orange-700" aria-hidden="true" />
                          )}
                          {isSorted && sortConfig.direction === 'desc' && (
                            <ArrowDown className="h-3 w-3 text-orange-700" aria-hidden="true" />
                          )}
                          {!isSorted && <ArrowUpDown className="h-3 w-3 text-slate-400" aria-hidden="true" />}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {paginatedData.map((row, rowIdx) => {
                const key = resolveRowKey(row, startIndex + rowIdx);
                const isSelected = selectable && selectedSet.has(key);
                return (
                  <tr
                    key={key}
                    className={isSelected ? 'bg-orange-50/60 hover:bg-orange-50' : 'hover:bg-slate-50'}
                  >
                    {selectable && (
                      <td className="w-10 px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSingleRow(key)}
                          aria-label={`Select row ${startIndex + rowIdx + 1}`}
                          className={`h-4 w-4 rounded border-slate-300 text-orange-700 ${focusRing}`}
                        />
                      </td>
                    )}
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className={`px-5 py-3.5 ${col.className || ''}`}>
                        {col.render ? col.render(row, rowIdx) : row[col.accessor]}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="p-8">
            <EmptyState
              title={emptyTitle || 'No matching data'}
              description={emptyDescription || 'Try refining your search filter.'}
            />
          </div>
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 p-4 sm:flex-row">
          <span className="text-xs font-semibold text-slate-600">
            Page {safePage} of {totalPages}
          </span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
              className={`rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers.map((item) =>
              typeof item === 'string' ? (
                <span key={item} className="px-1.5 text-xs font-bold text-slate-500">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                  aria-current={safePage === item ? 'page' : undefined}
                  className={`h-8 min-w-8 rounded-md px-2 text-xs font-bold ${focusRing} ${
                    safePage === item
                      ? 'bg-orange-700 text-white'
                      : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {item}
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={safePage === totalPages}
              aria-label="Next page"
              className={`rounded-md border border-slate-300 bg-white p-1.5 text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 ${focusRing}`}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
