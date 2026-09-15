"use client";

import { useState, useRef, ChangeEvent, DragEvent } from "react";
import {
  X,
  UploadCloud,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  MailCheck,
  RefreshCw,
  FileCheck2,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface BulkStudentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  theme?: string;
  userRole?: string;
  defaultClassName?: string;
  defaultSection?: string;
}

interface ParsedValidationRow {
  rowNumber: number;
  firstName: string;
  lastName?: string;
  rollNumber?: string;
  email?: string;
  phone?: string;
  gender: string;
  dateOfBirth: string;
  className: string;
  section: string;
  parentName: string;
  parentEmail: string;
  isValid: boolean;
  errors: string[];
}

export default function BulkStudentUploadModal({
  isOpen,
  onClose,
  onSuccess,
  theme = "#6366F1",
  userRole = "ADMIN",
  defaultClassName,
  defaultSection,
}: BulkStudentUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Validation results
  const [validationData, setValidationData] = useState<{
    totalCount: number;
    validCount: number;
    invalidCount: number;
    rows: ParsedValidationRow[];
    invalidRows: ParsedValidationRow[];
  } | null>(null);

  // Upload results
  const [uploadResult, setUploadResult] = useState<{
    totalUploaded: number;
    totalSkipped: number;
    created: any[];
    skippedErrors: any[];
  } | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setFile(null);
    setValidationData(null);
    setUploadResult(null);
    setIsValidating(false);
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = () => {
    window.open("/api/students/bulk-template", "_blank");
  };

  const processFile = async (selectedFile: File) => {
    const validExtensions = [".xlsx", ".xls", ".csv"];
    const fileExt = selectedFile.name
      .substring(selectedFile.name.lastIndexOf("."))
      .toLowerCase();

    if (!validExtensions.includes(fileExt)) {
      toast.error("Please upload a valid Excel (.xlsx, .xls) or CSV (.csv) file");
      return;
    }

    setFile(selectedFile);
    setIsValidating(true);
    setValidationData(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("validateOnly", "true");

      const res = await fetch("/api/students/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok && !data.rows) {
        throw new Error(data.error || "Failed to validate file");
      }

      setValidationData({
        totalCount: data.totalCount || 0,
        validCount: data.validCount || 0,
        invalidCount: data.invalidCount || 0,
        rows: data.rows || [],
        invalidRows: data.invalidRows || [],
      });

      if (data.invalidCount === 0) {
        toast.success(`Validated ${data.totalCount} student rows! All valid.`);
      } else {
        toast.warning(
          `Validation finished: ${data.validCount} valid, ${data.invalidCount} invalid.`
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to parse file");
      setFile(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (skipInvalid: boolean) => {
    if (!file) return;
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("skipInvalid", skipInvalid ? "true" : "false");

      const res = await fetch("/api/students/bulk", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload students");
      }

      setUploadResult({
        totalUploaded: data.totalUploaded || 0,
        totalSkipped: data.totalSkipped || 0,
        created: data.created || [],
        skippedErrors: data.skippedErrors || [],
      });

      toast.success(
        `Successfully uploaded ${data.totalUploaded} students! Parent credential emails sent.`
      );
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const copyText = (label: string, text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  const copyAllCredentials = () => {
    if (!uploadResult?.created?.length) return;
    const lines = uploadResult.created.map((c) => {
      const cred = c.credentials;
      return `Student: ${c.studentName} (${c.className}-${c.section || "A"})\nStudent User: ${cred.student?.username}\nStudent Pass: ${cred.student?.password}\nParent User: ${cred.parent?.username}\nParent Pass: ${cred.parent?.password}\n----------------------`;
    });
    navigator.clipboard.writeText(lines.join("\n"));
    toast.success("All credentials copied to clipboard!");
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-100 my-8 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
              style={{ backgroundColor: theme }}
            >
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">
                Bulk Student Upload
              </h3>
              <p className="text-xs text-slate-500">
                Upload students via Excel (.xlsx) or CSV with automatic parent credential emails
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Step 4: Success View */}
          {uploadResult ? (
            <div className="space-y-5">
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                  <MailCheck className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-emerald-900">
                  Bulk Upload Completed!
                </h4>
                <p className="text-sm text-emerald-700 mt-1">
                  <strong>{uploadResult.totalUploaded}</strong> student(s) enrolled and credential emails were automatically sent to all parents.
                </p>
                {uploadResult.totalSkipped > 0 && (
                  <p className="text-xs text-amber-700 mt-1">
                    {uploadResult.totalSkipped} invalid row(s) were skipped.
                  </p>
                )}
              </div>

              {/* Created Students Credentials Preview */}
              {uploadResult.created.length > 0 && (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Enrolled Students ({uploadResult.created.length})
                    </span>
                    <button
                      type="button"
                      onClick={copyAllCredentials}
                      className="text-xs font-semibold px-2.5 py-1 rounded-lg border bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1 shadow-sm"
                    >
                      <Copy className="w-3.5 h-3.5" /> Copy All Credentials
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {uploadResult.created.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 text-xs flex items-center justify-between gap-4 hover:bg-slate-50/60"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {item.studentName}{" "}
                            <span className="text-slate-400 font-normal">
                              ({item.className} - {item.section})
                            </span>
                            {item.phone && (
                              <span className="text-slate-500 font-normal ml-2">
                                • {item.phone}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 font-mono mt-0.5">
                            Student: <strong>{item.credentials.student?.username}</strong> | Parent: <strong>{item.credentials.parent?.username}</strong>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            copyText(
                              `${item.studentName} credentials`,
                              `Student: ${item.credentials.student?.username} / ${item.credentials.student?.password}\nParent: ${item.credentials.parent?.username} / ${item.credentials.parent?.password}`
                            )
                          }
                          className="p-1.5 rounded-lg border hover:bg-slate-100 text-slate-500 shrink-0"
                          title="Copy credentials"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Skipped Errors if any */}
              {uploadResult.skippedErrors.length > 0 && (
                <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4">
                  <div className="text-xs font-bold text-amber-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Skipped Rows ({uploadResult.skippedErrors.length})
                  </div>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto text-xs text-amber-800">
                    {uploadResult.skippedErrors.map((err, idx) => (
                      <div key={idx} className="bg-white/80 p-2 rounded-lg border border-amber-200/60">
                        <strong>Row {err.rowNumber} ({err.name || "Unknown"}):</strong>{" "}
                        {err.errors.join(", ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Step 1: Demo Template Banner */}
              <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-indigo-950">
                      Step 1: Download Demo Excel Sheet
                    </h4>
                    <p className="text-xs text-indigo-700/80">
                      Use our formatted template to fill student and parent details accurately.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="px-3.5 py-2 rounded-xl bg-white border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center gap-1.5 hover:bg-indigo-50 shadow-sm transition shrink-0"
                >
                  <Download className="w-3.5 h-3.5" /> Download Demo Template (.xlsx)
                </button>
              </div>

              {/* Step 2: Upload Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-2">
                  Step 2: Upload Completed Spreadsheet
                </label>
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    isDragging
                      ? "border-indigo-500 bg-indigo-50/50"
                      : "border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-center text-slate-500">
                    <UploadCloud className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <span className="text-sm font-semibold text-slate-800">
                      {file ? file.name : "Click to select or drag and drop Excel file"}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Supports .xlsx, .xls, and .csv (Max 10MB)
                    </p>
                  </div>
                </div>
              </div>

              {/* Validation Loader */}
              {isValidating && (
                <div className="flex items-center justify-center gap-2.5 py-4 text-sm font-semibold text-indigo-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Validating spreadsheet rows and columns...
                </div>
              )}

              {/* Validation Preview */}
              {validationData && (
                <div className="space-y-4">
                  {/* Stats Badges */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl border border-slate-200 bg-slate-50 text-center">
                      <div className="text-xs text-slate-500 font-medium">Total Rows</div>
                      <div className="text-lg font-bold text-slate-900 mt-0.5">
                        {validationData.totalCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-emerald-200 bg-emerald-50 text-center">
                      <div className="text-xs text-emerald-600 font-medium">Valid Rows</div>
                      <div className="text-lg font-bold text-emerald-700 mt-0.5">
                        {validationData.validCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-center">
                      <div className="text-xs text-red-600 font-medium">Invalid Rows</div>
                      <div className="text-lg font-bold text-red-700 mt-0.5">
                        {validationData.invalidCount}
                      </div>
                    </div>
                  </div>

                  {/* Invalid Rows Warning Box */}
                  {validationData.invalidCount > 0 ? (
                    <div className="border border-red-200 bg-red-50/60 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-xs font-bold text-red-800 uppercase tracking-wide mb-2">
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                        Issues Found in {validationData.invalidCount} Row(s):
                      </div>
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {validationData.invalidRows.map((row, idx) => (
                          <div
                            key={idx}
                            className="bg-white p-2.5 rounded-lg border border-red-200 text-xs shadow-xs"
                          >
                            <div className="font-semibold text-slate-900 flex items-center justify-between">
                              <span>
                                Row {row.rowNumber}:{" "}
                                {row.firstName
                                  ? `${row.firstName} ${row.lastName || ""}`
                                  : "Nameless Row"}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono">
                                {row.className || "No Class"} {row.section}
                              </span>
                            </div>
                            <ul className="list-disc list-inside text-red-600 mt-1 space-y-0.5 font-medium">
                              {row.errors.map((err, eIdx) => (
                                <li key={eIdx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-600 mt-3">
                        You can either <strong>skip invalid rows</strong> and proceed with uploading the{" "}
                        <strong>{validationData.validCount}</strong> valid student(s), or fix the errors in your Excel file and re-upload.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-emerald-900">
                          All {validationData.totalCount} rows are valid!
                        </div>
                        <p className="text-xs text-emerald-700">
                          Ready to enroll students and dispatch parent credential emails.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
          {uploadResult ? (
            <button
              type="button"
              onClick={handleClose}
              className="w-full py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm transition hover:opacity-95"
              style={{ backgroundColor: theme }}
            >
              Done & Close
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleClose}
                disabled={isUploading || isValidating}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <div className="flex items-center gap-2">
                {validationData && validationData.invalidCount > 0 && validationData.validCount > 0 && (
                  <button
                    type="button"
                    onClick={() => handleUpload(true)}
                    disabled={isUploading || isValidating}
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold shadow-sm transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    Skip Invalid & Upload ({validationData.validCount})
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleUpload(false)}
                  disabled={
                    !validationData ||
                    validationData.validCount === 0 ||
                    (validationData.invalidCount > 0 && !validationData.validCount) ||
                    isUploading ||
                    isValidating
                  }
                  className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition flex items-center gap-2 hover:opacity-95 disabled:opacity-40"
                  style={{ backgroundColor: theme }}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading & Sending Emails...
                    </>
                  ) : (
                    <>
                      <FileCheck2 className="w-4 h-4" />
                      Upload {validationData ? `(${validationData.validCount})` : ""} Students
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
