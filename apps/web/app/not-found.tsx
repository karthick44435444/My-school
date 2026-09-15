import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-4">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-black text-indigo-600 mb-4">404</h1>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Page Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
