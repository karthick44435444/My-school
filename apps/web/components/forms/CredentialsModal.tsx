"use client";

import { Copy, X } from "lucide-react";
import { toast } from "sonner";

export type CredentialPair = {
  username?: string;
  password?: string;
  schoolCode?: string;
  email?: string;
};

export type Credentials = CredentialPair & {
  role?: string;
  student?: CredentialPair;
  parent?: CredentialPair;
};

export default function CredentialsModal({
  credentials,
  theme = "#6366F1",
  onClose,
  title = "Credentials",
}: {
  credentials: Credentials | null;
  theme?: string;
  onClose: () => void;
  title?: string;
}) {
  if (!credentials) return null;

  const isStudent = Boolean(credentials.student);

  const copyText = (label: string, value: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const copyAll = () => {
    const lines: string[] = [];
    if (isStudent) {
      const school = credentials.student?.schoolCode || credentials.schoolCode;
      if (school) lines.push(`School: ${school}`);
      if (credentials.student?.username) lines.push(`Student username: ${credentials.student.username}`);
      if (credentials.student?.password) lines.push(`Student password: ${credentials.student.password}`);
      if (credentials.parent?.username) lines.push(`Parent username: ${credentials.parent.username}`);
      if (credentials.parent?.password) lines.push(`Parent password: ${credentials.parent.password}`);
    } else {
      if (credentials.schoolCode) lines.push(`School: ${credentials.schoolCode}`);
      if (credentials.username) lines.push(`Username: ${credentials.username}`);
      if (credentials.password) lines.push(`Password: ${credentials.password}`);
    }
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("All credentials copied");
  };

  const Row = ({ label, value }: { label: string; value?: string }) =>
    value ? (
      <div className="flex items-center justify-between gap-2 py-1.5">
        <div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</div>
          <code className="font-mono text-sm font-semibold text-slate-900">{value}</code>
        </div>
        <button
          type="button"
          className="p-1.5 rounded-lg border hover:bg-slate-50"
          onClick={() => copyText(label, value)}
        >
          <Copy className="w-3.5 h-3.5 text-slate-500" />
        </button>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-3">Save these credentials securely.</p>

        {isStudent ? (
          <div className="space-y-3">
            <div className="rounded-xl border bg-slate-50 px-3 divide-y">
              <Row label="School code" value={credentials.student?.schoolCode || credentials.schoolCode} />
              <Row label="Student username" value={credentials.student?.username} />
              <Row label="Student password (DOB)" value={credentials.student?.password} />
            </div>
            <div className="rounded-xl border bg-indigo-50 px-3 divide-y divide-indigo-100">
              <Row label="Parent username" value={credentials.parent?.username} />
              <Row label="Parent password" value={credentials.parent?.password} />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border bg-slate-50 px-3 divide-y">
            <Row label="School code" value={credentials.schoolCode} />
            <Row label="Username" value={credentials.username} />
            <Row label="Password" value={credentials.password} />
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={copyAll}
            className="flex-1 py-2 rounded-xl border text-sm font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50"
          >
            <Copy className="w-4 h-4" /> Copy all
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: theme }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
