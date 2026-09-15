"use client";

import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export interface PaginationProps {
  page?: number;
  currentPage?: number;
  totalPages: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (newPage: number) => void;
  themeColor?: string;
  loading?: boolean;
}

export function Pagination({
  page,
  currentPage,
  totalPages,
  totalItems,
  pageSize = 20,
  onPageChange,
  themeColor = "#6366F1",
  loading = false,
}: PaginationProps) {
  if (totalItems <= 0) return null;

  const actualPage = page ?? currentPage ?? 1;
  const start = (actualPage - 1) * pageSize + 1;
  const end = Math.min(actualPage * pageSize, totalItems);

  // Generate numbered page array with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (actualPage > 3) pages.push("...");

      const startPage = Math.max(2, actualPage - 1);
      const endPage = Math.min(totalPages - 1, actualPage + 1);

      for (let i = startPage; i <= endPage; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (actualPage < totalPages - 2) pages.push("...");
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 border-t border-slate-200/80 text-xs text-slate-600 select-none">
      {/* Items info */}
      <div className="text-slate-500 font-medium">
        Showing <span className="font-bold text-slate-800">{start}</span> to{" "}
        <span className="font-bold text-slate-800">{end}</span> of{" "}
        <span className="font-bold text-slate-900">{totalItems}</span> results
      </div>

      {/* Page controls */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page button */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={actualPage <= 1 || loading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Prev button */}
          <button
            type="button"
            onClick={() => onPageChange(actualPage - 1)}
            disabled={actualPage <= 1 || loading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 px-2.5 font-semibold"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev</span>
          </button>

          {/* Page numbers */}
          <div className="flex items-center gap-1 mx-1">
            {pages.map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`dots-${idx}`} className="px-2 text-slate-400 font-bold">
                    …
                  </span>
                );
              }
              const pageNum = Number(p);
              const isActive = pageNum === actualPage;
              return (
                <button
                  key={`page-${pageNum}`}
                  type="button"
                  onClick={() => onPageChange(pageNum)}
                  disabled={loading}
                  style={
                    isActive
                      ? { backgroundColor: themeColor, borderColor: themeColor }
                      : {}
                  }
                  className={`min-w-[32px] h-8 px-2 rounded-lg font-bold transition flex items-center justify-center border ${
                    isActive
                      ? "text-white shadow-xs"
                      : "border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          {/* Next button */}
          <button
            type="button"
            onClick={() => onPageChange(actualPage + 1)}
            disabled={actualPage >= totalPages || loading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center gap-1 px-2.5 font-semibold"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page button */}
          <button
            type="button"
            onClick={() => onPageChange(totalPages)}
            disabled={actualPage >= totalPages || loading}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
            title="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default Pagination;
