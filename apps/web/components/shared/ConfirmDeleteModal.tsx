"use client";

import { Loader2 } from "lucide-react";

interface ConfirmDeleteModalProps {
  open: boolean;
  title?: string;
  description?: string;
  confirmText?: string;
  loading?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  open,
  title = "Confirm Delete",
  description = "This action cannot be undone.",
  confirmText = "Delete",
  loading = false,
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl">
        <h3 className="font-black text-lg text-slate-900 mb-1">{title}</h3>
        {description && <p className="text-sm text-slate-500 mb-6">{description}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-2xl bg-red-600 text-white text-sm font-bold shadow-md hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
