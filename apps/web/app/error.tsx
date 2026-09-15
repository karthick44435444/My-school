"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-black text-red-600 mb-4">500</h1>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500 mb-6">
          An unexpected error occurred. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
