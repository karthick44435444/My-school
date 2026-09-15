import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { getApiBase, getToken } from "@/lib/api";
import { useToast } from "@/hooks/useToast";
import { Colors, spacing, radius } from "@/constants/theme";

interface BulkStudentUploadModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  color?: string;
  isTeacher?: boolean;
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

export function BulkStudentUploadModal({
  visible,
  onClose,
  onSuccess,
  color = Colors.primary,
  isTeacher = false,
}: BulkStudentUploadModalProps) {
  const toast = useToast();
  const [file, setFile] = useState<{ uri: string; name: string; mimeType?: string } | null>(null);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [validating, setValidating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Validation report
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

  if (!visible) return null;

  const resetState = () => {
    setFile(null);
    setValidationData(null);
    setUploadResult(null);
    setValidating(false);
    setUploading(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleDownloadTemplate = async () => {
    setDownloadingTemplate(true);
    try {
      const base = await getApiBase();
      const templateUrl = `${base}/api/students/bulk-template`;

      if (Platform.OS === "web") {
        if (typeof window !== "undefined") {
          window.open(templateUrl, "_blank");
        }
        return;
      }

      const fileUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}student_bulk_upload_demo.xlsx`;
      const result = await FileSystem.downloadAsync(templateUrl, fileUri);

      if (result.status === 200) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(result.uri, {
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "Download Student Demo Template",
            UTI: "com.microsoft.excel.xlsx",
          });
        } else {
          toast.success("Template downloaded to device");
        }
      } else {
        throw new Error("Failed to download template");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to download template");
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handlePickFile = async () => {
    try {
      const doc = await DocumentPicker.getDocumentAsync({
        type: [
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "application/vnd.ms-excel",
          "text/csv",
          "text/comma-separated-values",
          "*/*",
        ],
        copyToCacheDirectory: true,
      });

      if (doc.canceled || !doc.assets?.[0]) return;

      const picked = doc.assets[0];
      const validName = picked.name.toLowerCase();
      if (
        !validName.endsWith(".xlsx") &&
        !validName.endsWith(".xls") &&
        !validName.endsWith(".csv")
      ) {
        toast.error("Please pick an Excel (.xlsx, .xls) or CSV file");
        return;
      }

      const selectedFile = {
        uri: picked.uri,
        name: picked.name,
        mimeType: picked.mimeType || "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      };

      setFile(selectedFile);
      setValidationData(null);
      setUploadResult(null);
      setValidating(true);

      const base = await getApiBase();
      const token = await getToken();

      const formData = new FormData();
      formData.append("file", {
        uri: selectedFile.uri,
        name: selectedFile.name,
        type: selectedFile.mimeType,
      } as any);
      formData.append("validateOnly", "true");

      const res = await fetch(`${base}/api/students/bulk`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok && !data.rows) {
        throw new Error(data.error || "Validation failed");
      }

      setValidationData({
        totalCount: data.totalCount || 0,
        validCount: data.validCount || 0,
        invalidCount: data.invalidCount || 0,
        rows: data.rows || [],
        invalidRows: data.invalidRows || [],
      });

      if (data.invalidCount === 0) {
        toast.success(`Validated ${data.totalCount} rows! All valid.`);
      } else {
        toast.info(
          `${data.validCount} valid rows, ${data.invalidCount} rows have issues.`
        );
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process file");
      setFile(null);
    } finally {
      setValidating(false);
    }
  };

  const handleUpload = async (skipInvalid: boolean) => {
    if (!file) return;
    setUploading(true);

    try {
      const base = await getApiBase();
      const token = await getToken();

      const formData = new FormData();
      formData.append("file", {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
      } as any);
      formData.append("skipInvalid", skipInvalid ? "true" : "false");

      const res = await fetch(`${base}/api/students/bulk`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUploadResult({
        totalUploaded: data.totalUploaded || 0,
        totalSkipped: data.totalSkipped || 0,
        created: data.created || [],
        skippedErrors: data.skippedErrors || [],
      });

      toast.success(
        `Successfully uploaded ${data.totalUploaded} students! Parent emails dispatched.`
      );
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const copyText = async (label: string, text: string) => {
    if (!text) return;
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(text);
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      }
      toast.success(`${label} copied!`);
    } catch {
      toast.error(`Failed to copy ${label}`);
    }
  };

  const copyAllCredentials = async () => {
    if (!uploadResult?.created?.length) return;
    const lines = uploadResult.created.map((c) => {
      const cred = c.credentials;
      return `Student: ${c.studentName} (${c.className}-${c.section || "A"})\nStudent User: ${cred.student?.username}\nStudent Pass: ${cred.student?.password}\nParent User: ${cred.parent?.username}\nParent Pass: ${cred.parent?.password}\n----------------------`;
    });
    const allText = lines.join("\n");
    try {
      if (Clipboard?.setStringAsync) {
        await Clipboard.setStringAsync(allText);
      } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(allText);
      }
      toast.success("All credentials copied!");
    } catch {
      toast.error("Failed to copy credentials");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.modalHead}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <View style={[styles.headIcon, { backgroundColor: color + "18" }]}>
                <Ionicons name="document-text" size={20} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>Bulk Student Upload</Text>
                <Text style={styles.modalSub}>Excel (.xlsx) / CSV file upload</Text>
              </View>
            </View>
            <Pressable onPress={handleClose} hitSlop={12} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.text} />
            </Pressable>
          </View>

          <ScrollView style={styles.bodyScroll} keyboardShouldPersistTaps="handled">
            {uploadResult ? (
              /* Success View */
              <View style={styles.successContainer}>
                <View style={styles.successBanner}>
                  <Ionicons name="checkmark-circle" size={44} color={Colors.success} />
                  <Text style={styles.successTitle}>Bulk Upload Completed!</Text>
                  <Text style={styles.successMsg}>
                    <Text style={{ fontWeight: "700" }}>{uploadResult.totalUploaded}</Text> student(s) enrolled and credential emails were automatically sent to parents.
                  </Text>
                  {uploadResult.totalSkipped > 0 && (
                    <Text style={styles.skippedMsg}>
                      {uploadResult.totalSkipped} invalid row(s) were skipped.
                    </Text>
                  )}
                </View>

                {uploadResult.created.length > 0 && (
                  <View style={styles.credSection}>
                    <View style={styles.credHeader}>
                      <Text style={styles.credHeaderTitle}>
                        Enrolled Students ({uploadResult.created.length})
                      </Text>
                      <Pressable
                        style={styles.copyAllBtn}
                        onPress={copyAllCredentials}
                      >
                        <Ionicons name="copy-outline" size={14} color={Colors.text} />
                        <Text style={styles.copyAllText}>Copy All</Text>
                      </Pressable>
                    </View>
                    <View style={styles.credList}>
                      {uploadResult.created.map((item, idx) => (
                        <View key={idx} style={styles.credItem}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.studentName}>
                              {item.studentName}{" "}
                              <Text style={styles.studentMeta}>
                                ({item.className} - {item.section})
                              </Text>
                              {item.phone ? (
                                <Text style={styles.studentMeta}>
                                  {" "}• {item.phone}
                                </Text>
                              ) : null}
                            </Text>
                            <Text style={styles.credDetails}>
                              Student: {item.credentials.student?.username} | Parent: {item.credentials.parent?.username}
                            </Text>
                          </View>
                          <Pressable
                            style={styles.singleCopyBtn}
                            onPress={() =>
                              copyText(
                                `${item.studentName} credentials`,
                                `Student: ${item.credentials.student?.username} / ${item.credentials.student?.password}\nParent: ${item.credentials.parent?.username} / ${item.credentials.parent?.password}`
                              )
                            }
                            hitSlop={6}
                          >
                            <Ionicons name="copy-outline" size={16} color={color} />
                          </Pressable>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {uploadResult.skippedErrors.length > 0 && (
                  <View style={styles.errorSection}>
                    <Text style={styles.errorSectionTitle}>
                      Skipped Rows ({uploadResult.skippedErrors.length})
                    </Text>
                    {uploadResult.skippedErrors.map((err, idx) => (
                      <View key={idx} style={styles.errorItem}>
                        <Text style={styles.errorRowHead}>
                          Row {err.rowNumber} ({err.name || "Unknown"}):
                        </Text>
                        <Text style={styles.errorText}>{err.errors.join(", ")}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              /* Upload & Validation Steps */
              <View style={styles.formContainer}>
                {/* Step 1: Demo Template Banner */}
                <View style={styles.templateBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={styles.templateIcon}>
                      <Ionicons name="cloud-download-outline" size={20} color="#4F46E5" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.stepTitle}>Step 1: Download Demo Template</Text>
                      <Text style={styles.stepDesc}>
                        Download sample Excel format with pre-filled demo student rows.
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    style={[styles.downloadBtn, downloadingTemplate && { opacity: 0.6 }]}
                    onPress={handleDownloadTemplate}
                    disabled={downloadingTemplate}
                  >
                    {downloadingTemplate ? (
                      <ActivityIndicator size="small" color="#4F46E5" />
                    ) : (
                      <>
                        <Ionicons name="download-outline" size={16} color="#4F46E5" />
                        <Text style={styles.downloadBtnText}>Download Demo Sheet (.xlsx)</Text>
                      </>
                    )}
                  </Pressable>
                </View>

                {/* Step 2: Pick File */}
                <View style={styles.fileSection}>
                  <Text style={styles.stepHeader}>Step 2: Select Completed File</Text>
                  <Pressable
                    style={[styles.pickFileBox, file && { borderColor: color, backgroundColor: color + "08" }]}
                    onPress={handlePickFile}
                    disabled={validating || uploading}
                  >
                    <Ionicons
                      name={file ? "document-text" : "cloud-upload-outline"}
                      size={32}
                      color={file ? color : Colors.textMuted}
                    />
                    <Text style={styles.pickFileName}>
                      {file ? file.name : "Tap to pick Excel (.xlsx / .csv)"}
                    </Text>
                    <Text style={styles.pickFileSub}>
                      {file ? "Tap to change file" : "Supports .xlsx, .xls and .csv files"}
                    </Text>
                  </Pressable>
                </View>

                {/* Validation Loading */}
                {validating && (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="small" color={color} />
                    <Text style={[styles.loadingText, { color }]}>
                      Validating rows and columns...
                    </Text>
                  </View>
                )}

                {/* Validation Summary */}
                {validationData && (
                  <View style={styles.valSummaryContainer}>
                    <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Total</Text>
                        <Text style={styles.statVal}>{validationData.totalCount}</Text>
                      </View>
                      <View style={[styles.statBox, { borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" }]}>
                        <Text style={[styles.statLabel, { color: "#065F46" }]}>Valid</Text>
                        <Text style={[styles.statVal, { color: "#047857" }]}>{validationData.validCount}</Text>
                      </View>
                      <View style={[styles.statBox, { borderColor: "#FECACA", backgroundColor: "#FEF2F2" }]}>
                        <Text style={[styles.statLabel, { color: "#991B1B" }]}>Invalid</Text>
                        <Text style={[styles.statVal, { color: "#B91C1C" }]}>{validationData.invalidCount}</Text>
                      </View>
                    </View>

                    {/* Invalid Rows List */}
                    {validationData.invalidCount > 0 ? (
                      <View style={styles.invalidBox}>
                        <View style={styles.invalidHead}>
                          <Ionicons name="alert-circle" size={16} color="#DC2626" />
                          <Text style={styles.invalidHeadText}>
                            Errors found in {validationData.invalidCount} row(s):
                          </Text>
                        </View>
                        <ScrollView style={styles.invalidScroll} nestedScrollEnabled>
                          {validationData.invalidRows.map((row, idx) => (
                            <View key={idx} style={styles.invalidRowItem}>
                              <Text style={styles.invalidRowTitle}>
                                Row {row.rowNumber}: {row.firstName ? `${row.firstName} ${row.lastName || ""}` : "No Name"}{" "}
                                <Text style={styles.invalidRowClass}>({row.className} {row.section})</Text>
                              </Text>
                              <Text style={styles.invalidRowErrors}>
                                • {row.errors.join("\n• ")}
                              </Text>
                            </View>
                          ))}
                        </ScrollView>
                        <Text style={styles.skipNote}>
                          You can skip these invalid rows and upload the {validationData.validCount} valid student(s).
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.validBox}>
                        <Ionicons name="checkmark-circle" size={20} color="#059669" />
                        <Text style={styles.validBoxText}>
                          All {validationData.totalCount} student rows are valid!
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.modalFoot}>
            {uploadResult ? (
              <Pressable
                style={[styles.footBtn, styles.primaryBtn, { backgroundColor: color }]}
                onPress={handleClose}
              >
                <Text style={styles.primaryBtnText}>Done</Text>
              </Pressable>
            ) : (
              <View style={styles.footBtnRow}>
                <Pressable
                  style={[styles.footBtn, styles.cancelBtn]}
                  onPress={handleClose}
                  disabled={uploading || validating}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </Pressable>

                {validationData && validationData.invalidCount > 0 && validationData.validCount > 0 && (
                  <Pressable
                    style={[styles.footBtn, styles.skipBtn]}
                    onPress={() => handleUpload(true)}
                    disabled={uploading || validating}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.skipBtnText}>
                        Skip & Upload ({validationData.validCount})
                      </Text>
                    )}
                  </Pressable>
                )}

                <Pressable
                  style={[
                    styles.footBtn,
                    styles.primaryBtn,
                    { backgroundColor: color },
                    (!validationData ||
                      validationData.validCount === 0 ||
                      (validationData.invalidCount > 0 && !validationData.validCount) ||
                      uploading ||
                      validating) && { opacity: 0.4 },
                  ]}
                  onPress={() => handleUpload(false)}
                  disabled={
                    !validationData ||
                    validationData.validCount === 0 ||
                    (validationData.invalidCount > 0 && !validationData.validCount) ||
                    uploading ||
                    validating
                  }
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      Upload {validationData ? `(${validationData.validCount})` : ""}
                    </Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
    paddingBottom: Platform.OS === "ios" ? 28 : 16,
  },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
  },
  modalSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
  },
  bodyScroll: {
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  formContainer: {
    gap: 16,
  },
  templateBox: {
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#E0E7FF",
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  templateIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  stepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#312E81",
  },
  stepDesc: {
    fontSize: 11,
    color: "#4338CA",
    marginTop: 2,
    lineHeight: 15,
  },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  downloadBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  fileSection: {
    gap: 8,
  },
  stepHeader: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pickFileBox: {
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: Colors.border,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  pickFileName: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    textAlign: "center",
  },
  pickFileSub: {
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: "center",
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: "600",
  },
  valSummaryContainer: {
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  statVal: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.text,
    marginTop: 2,
  },
  invalidBox: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  invalidHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  invalidHeadText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#991B1B",
  },
  invalidScroll: {
    maxHeight: 140,
  },
  invalidRowItem: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
  },
  invalidRowTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7F1D1D",
  },
  invalidRowClass: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textMuted,
  },
  invalidRowErrors: {
    fontSize: 11,
    fontWeight: "500",
    color: "#DC2626",
    marginTop: 3,
    lineHeight: 15,
  },
  skipNote: {
    fontSize: 11,
    color: "#7F1D1D",
    fontStyle: "italic",
  },
  validBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  validBoxText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
    flex: 1,
  },
  successContainer: {
    gap: 14,
  },
  successBanner: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#065F46",
  },
  successMsg: {
    fontSize: 12,
    color: "#047857",
    textAlign: "center",
    lineHeight: 16,
  },
  skippedMsg: {
    fontSize: 11,
    color: "#B45309",
    textAlign: "center",
  },
  credSection: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    overflow: "hidden",
  },
  credHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  credHeaderTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textMuted,
    textTransform: "uppercase",
  },
  copyAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.text,
  },
  credList: {
    maxHeight: 180,
  },
  credItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  studentName: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.text,
  },
  studentMeta: {
    fontWeight: "500",
    color: Colors.textMuted,
  },
  credDetails: {
    fontSize: 11,
    color: Colors.textMuted,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginTop: 2,
  },
  singleCopyBtn: {
    padding: 6,
  },
  errorSection: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 10,
    gap: 6,
  },
  errorSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
    textTransform: "uppercase",
  },
  errorItem: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 6,
    padding: 6,
  },
  errorRowHead: {
    fontSize: 11,
    fontWeight: "700",
    color: "#78350F",
  },
  errorText: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 1,
  },
  modalFoot: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  footBtnRow: {
    flexDirection: "row",
    gap: 8,
  },
  footBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: "#F8FAFC",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.text,
  },
  skipBtn: {
    backgroundColor: "#D97706",
  },
  skipBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
  },
  primaryBtn: {
    flex: 1,
  },
  primaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
});
