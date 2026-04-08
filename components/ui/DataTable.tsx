'use client';

import React, { useCallback } from 'react';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface PaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  pagination?: PaginationConfig;
  sortConfig?: SortConfig;
  onSort?: (key: string) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (ids: string[]) => void;
  stickyHeader?: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

function SortIcon({ direction, active }: { direction?: 'asc' | 'desc'; active: boolean }) {
  return (
    <span className="inline-flex flex-col ml-1.5 gap-[2px] align-middle">
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="none"
        className={`transition-colors ${
          active && direction === 'asc' ? 'text-[#3B82F6]' : 'text-gray-600'
        }`}
      >
        <path d="M4 0L7.46 4.5H0.54L4 0Z" fill="currentColor" />
      </svg>
      <svg
        width="8"
        height="5"
        viewBox="0 0 8 5"
        fill="none"
        className={`transition-colors ${
          active && direction === 'desc' ? 'text-[#3B82F6]' : 'text-gray-600'
        }`}
      >
        <path d="M4 5L0.54 0.5H7.46L4 5Z" fill="currentColor" />
      </svg>
    </span>
  );
}

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr className="border-b border-[#1F2937]">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-[#1F2937] rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

export function DataTable<T extends { id?: string | number }>(
  props: DataTableProps<T>
) {
  const {
    columns,
    data,
    loading = false,
    emptyMessage = 'Aucune donnée disponible',
    onRowClick,
    pagination,
    sortConfig,
    onSort,
    selectable = false,
    selectedIds = [],
    onSelect,
    stickyHeader = false,
  } = props;

  const totalColumns = selectable ? columns.length + 1 : columns.length;

  const getItemId = useCallback(
    (item: T): string => {
      const id = (item as Record<string, unknown>)['id'];
      return id !== undefined ? String(id) : JSON.stringify(item);
    },
    []
  );

  const isAllSelected =
    data.length > 0 && data.every((item) => selectedIds.includes(getItemId(item)));
  const isIndeterminate =
    !isAllSelected && data.some((item) => selectedIds.includes(getItemId(item)));

  const handleSelectAll = () => {
    if (!onSelect) return;
    if (isAllSelected) {
      const currentIds = data.map(getItemId);
      onSelect(selectedIds.filter((id) => !currentIds.includes(id)));
    } else {
      const newIds = data.map(getItemId).filter((id) => !selectedIds.includes(id));
      onSelect([...selectedIds, ...newIds]);
    }
  };

  const handleSelectRow = (item: T) => {
    if (!onSelect) return;
    const id = getItemId(item);
    if (selectedIds.includes(id)) {
      onSelect(selectedIds.filter((s) => s !== id));
    } else {
      onSelect([...selectedIds, id]);
    }
  };

  const totalPages = pagination
    ? Math.max(1, Math.ceil(pagination.total / pagination.pageSize))
    : 1;

  const startItem = pagination
    ? (pagination.page - 1) * pagination.pageSize + 1
    : 1;
  const endItem = pagination
    ? Math.min(pagination.page * pagination.pageSize, pagination.total)
    : data.length;
  const totalItems = pagination ? pagination.total : data.length;

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      const current = pagination?.page ?? 1;
      pages.push(1);
      if (current > 3) pages.push('...');
      for (
        let i = Math.max(2, current - 1);
        i <= Math.min(totalPages - 1, current + 1);
        i++
      ) {
        pages.push(i);
      }
      if (current < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col w-full bg-[#0A0E17] rounded-xl border border-[#1F2937] overflow-hidden">
      {/* Scrollable table container */}
      <div className="w-full overflow-x-auto">
        <table className="w-full min-w-full border-collapse">
          <thead
            className={`bg-[#0D1117] ${
              stickyHeader ? 'sticky top-0 z-10' : ''
            }`}
          >
            <tr className="border-b border-[#1F2937]">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isIndeterminate;
                      }}
                      onChange={handleSelectAll}
                      className="w-4 h-4 rounded border-[#374151] bg-[#111827] text-[#3B82F6] cursor-pointer accent-[#3B82F6] focus:ring-[#3B82F6] focus:ring-offset-0"
                    />
                  </div>
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider select-none ${
                    col.sortable ? 'cursor-pointer hover:text-gray-200 transition-colors' : ''
                  }`}
                  style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                  onClick={() => col.sortable && onSort && onSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.header}</span>
                    {col.sortable && (
                      <SortIcon
                        active={sortConfig?.key === col.key}
                        direction={sortConfig?.key === col.key ? sortConfig.direction : undefined}
                      />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {loading ? (
              Array.from({ length: pagination?.pageSize ?? 8 }).map((_, i) => (
                <SkeletonRow key={i} colCount={totalColumns} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={totalColumns}
                  className="px-4 py-16 text-center text-gray-500 text-sm"
                >
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      className="w-10 h-10 text-gray-700"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0H4"
                      />
                    </svg>
                    <span>{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((item, rowIndex) => {
                const id = getItemId(item);
                const isSelected = selectedIds.includes(id);
                return (
                  <tr
                    key={id ?? rowIndex}
                    onClick={() => onRowClick && onRowClick(item)}
                    className={`
                      border-b border-[#1F2937] transition-colors duration-150
                      ${
                        isSelected
                          ? 'bg-[#172033]'
                          : rowIndex % 2 === 0
                          ? 'bg-[#111827]'
                          : 'bg-[#0D1117]'
                      }
                      ${onRowClick ? 'cursor-pointer' : ''}
                      hover:bg-[#1a2332]
                    `}
                  >
                    {selectable && (
                      <td
                        className="px-4 py-3 w-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectRow(item);
                        }}
                      >
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(item)}
                            className="w-4 h-4 rounded border-[#374151] bg-[#111827] text-[#3B82F6] cursor-pointer accent-[#3B82F6] focus:ring-[#3B82F6] focus:ring-offset-0"
                          />
                        </div>
                      </td>
                    )}
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-4 py-3 text-sm text-gray-300"
                        style={col.width ? { width: col.width, minWidth: col.width } : undefined}
                      >
                        {col.render
                          ? col.render(item)
                          : String((item as Record<string, unknown>)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-[#1F2937] bg-[#0D1117]">
          {/* Left: results info + page size */}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>
              Affichage{' '}
              <span className="font-semibold text-gray-200">{totalItems === 0 ? 0 : startItem}</span>
              {'-'}
              <span className="font-semibold text-gray-200">{endItem}</span>
              {' sur '}
              <span className="font-semibold text-gray-200">{totalItems}</span>
              {' résultats'}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Lignes:</span>
              <select
                value={pagination.pageSize}
                onChange={(e) => {
                  pagination.onPageSizeChange(Number(e.target.value));
                }}
                className="bg-[#111827] border border-[#1F2937] text-gray-300 text-xs rounded-md px-2 py-1 focus:outline-none focus:border-[#3B82F6] cursor-pointer hover:border-[#374151] transition-colors"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Right: page navigation */}
          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="flex items-center justify-center w-8 h-8 rounded-md border border-[#1F2937] bg-[#111827] text-gray-400 text-sm hover:bg-[#1a2332] hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Page précédente"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M8.5 3L5 7L8.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((page, i) =>
              page === '...' ? (
                <span
                  key={`ellipsis-${i}`}
                  className="flex items-center justify-center w-8 h-8 text-gray-600 text-sm select-none"
                >
                  …
                </span>
              ) : (
                <button
                  key={page}
                  onClick={() => pagination.onPageChange(page as number)}
                  className={`flex items-center justify-center w-8 h-8 rounded-md border text-sm transition-colors ${
                    pagination.page === page
                      ? 'bg-[#3B82F6] border-[#3B82F6] text-white font-semibold shadow-lg shadow-blue-900/30'
                      : 'border-[#1F2937] bg-[#111827] text-gray-400 hover:bg-[#1a2332] hover:text-gray-200'
                  }`}
                >
                  {page}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page >= totalPages}
              className="flex items-center justify-center w-8 h-8 rounded-md border border-[#1F2937] bg-[#111827] text-gray-400 text-sm hover:bg-[#1a2332] hover:text-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Page suivante"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M5.5 3L9 7L5.5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
