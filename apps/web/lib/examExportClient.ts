import { jsPDF } from "jspdf";

export interface ExamSplit {
  title: string;
  maxMarks: number;
}

export interface ExamSubject {
  id: string;
  subjectName: string;
  date?: string;
  maxMarks: number;
  passMarks?: number;
  splits?: ExamSplit[];
}

export interface ExamPDFExportOptions {
  schoolName?: string;
  themeColor?: string;
  teacherName?: string;
  exam: {
    id: string;
    name: string;
    type?: "TEST" | "EXAM";
    className: string;
    section?: string;
    subject?: string;
    maxMarks?: number;
    passMarks?: number;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    published?: boolean;
    subjects?: ExamSubject[];
  };
  students: Array<{
    id: string;
    firstName: string;
    lastName?: string;
    username?: string;
    rollNumber?: string;
    photoUrl?: string;
    className?: string;
    section?: string;
  }>;
  marks: Array<{
    id: string;
    examId: string;
    studentId: string;
    subjectId?: string;
    marks: number;
    maxMarks: number;
    splits?: Record<string, number>;
  }>;
}

function formatDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "";
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}-${mm}-${yyyy}`;
  }
  return String(dateStr);
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = (hex || "#6366F1").replace("#", "");
  if (cleanHex.length === 3) {
    const r = parseInt(cleanHex[0] + cleanHex[0], 16);
    const g = parseInt(cleanHex[1] + cleanHex[1], 16);
    const b = parseInt(cleanHex[2] + cleanHex[2], 16);
    return { r, g, b };
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function getGrade(pct: number): { grade: string; text: string; color: { r: number; g: number; b: number } } {
  if (pct >= 90) return { grade: "A+", text: "Outstanding", color: { r: 16, g: 185, b: 129 } };
  if (pct >= 80) return { grade: "A", text: "Excellent", color: { r: 14, g: 165, b: 233 } };
  if (pct >= 70) return { grade: "B+", text: "Very Good", color: { r: 99, g: 102, b: 241 } };
  if (pct >= 60) return { grade: "B", text: "Good", color: { r: 139, g: 92, b: 246 } };
  if (pct >= 50) return { grade: "C", text: "Satisfactory", color: { r: 245, g: 158, b: 11 } };
  if (pct >= 35) return { grade: "D", text: "Pass", color: { r: 234, g: 88, b: 12 } };
  return { grade: "F", text: "Needs Improvement", color: { r: 239, g: 68, b: 68 } };
}

export function exportExamMarksPDF(options: ExamPDFExportOptions) {
  const {
    schoolName = "SchoolVajo",
    themeColor = "#6366F1",
    teacherName,
    exam,
    students = [],
    marks = [],
  } = options;

  const isExam = exam.type === "EXAM";
  const subjects = isExam && exam.subjects?.length ? exam.subjects : [];
  const isLandscape = isExam && subjects.length >= 2;

  const doc = new jsPDF({
    orientation: isLandscape ? "landscape" : "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 10;
  const printableWidth = pageWidth - margin * 2;
  const themeRgb = hexToRgb(themeColor);

  // Filter students belonging to this class & section
  const targetStudents = students.filter(
    (s) => s.className === exam.className && (!exam.section || s.section === exam.section)
  );

  // Build rows per student
  const studentRows = targetStudents.map((st) => {
    let totalObtained = 0;
    let totalMax = 0;
    let totalPass = 0;
    let hasAnyMarks = false;
    let anySubjectFailed = false;

    const subjectScores: Record<
      string,
      {
        obtained: number | null;
        max: number;
        pass: number;
        splits?: Record<string, number>;
      }
    > = {};

    if (isExam && subjects.length > 0) {
      for (const sub of subjects) {
        const markRec = marks.find(
          (m) => m.studentId === st.id && (m.subjectId === sub.id || (!m.subjectId && subjects.length === 1))
        );
        const subMax = Number(sub.maxMarks) || 100;
        const subPass = sub.passMarks != null ? Number(sub.passMarks) : Math.round(subMax * 0.35);
        totalMax += subMax;
        totalPass += subPass;

        if (markRec && markRec.marks != null) {
          hasAnyMarks = true;
          const obt = Number(markRec.marks);
          totalObtained += obt;
          if (obt < subPass) {
            anySubjectFailed = true;
          }
          subjectScores[sub.id] = {
            obtained: obt,
            max: subMax,
            pass: subPass,
            splits: markRec.splits,
          };
        } else {
          subjectScores[sub.id] = {
            obtained: null,
            max: subMax,
            pass: subPass,
          };
        }
      }
    } else {
      // Single subject / TEST
      const subMax = Number(exam.maxMarks) || 100;
      const subPass = exam.passMarks != null ? Number(exam.passMarks) : Math.round(subMax * 0.35);
      totalMax = subMax;
      totalPass = subPass;
      const markRec = marks.find((m) => m.studentId === st.id);
      if (markRec && markRec.marks != null) {
        hasAnyMarks = true;
        const obt = Number(markRec.marks);
        totalObtained += obt;
        if (obt < subPass) {
          anySubjectFailed = true;
        }
        subjectScores["main"] = {
          obtained: obt,
          max: subMax,
          pass: subPass,
        };
      } else {
        subjectScores["main"] = {
          obtained: null,
          max: subMax,
          pass: subPass,
        };
      }
    }

    const percentage = hasAnyMarks && totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;
    const gradeInfo = hasAnyMarks ? getGrade(percentage) : { grade: "—", text: "N/A", color: { r: 148, g: 163, b: 184 } };
    const isPass = hasAnyMarks && totalObtained >= totalPass && !anySubjectFailed;

    return {
      id: st.id,
      name: `${st.firstName} ${st.lastName || ""}`.trim(),
      photoUrl: st.photoUrl,
      rollNumber: st.rollNumber || st.username || "—",
      totalObtained,
      totalMax,
      totalPass,
      percentage: Math.round(percentage * 10) / 10,
      hasAnyMarks,
      grade: gradeInfo.grade,
      gradeColor: gradeInfo.color,
      isPass,
      subjectScores,
    };
  });

  // Sort by percentage descending to compute ranks
  studentRows.sort((a, b) => {
    if (!a.hasAnyMarks && !b.hasAnyMarks) return a.name.localeCompare(b.name);
    if (!a.hasAnyMarks) return 1;
    if (!b.hasAnyMarks) return -1;
    return b.percentage - a.percentage || b.totalObtained - a.totalObtained;
  });

  // Assign ranks
  let currentRank = 1;
  const finalRows = studentRows.map((row, idx) => {
    if (!row.hasAnyMarks) return { ...row, rank: "—" };
    if (idx > 0 && studentRows[idx - 1].percentage === row.percentage) {
      return { ...row, rank: `#${currentRank}` };
    }
    currentRank = idx + 1;
    return { ...row, rank: `#${currentRank}` };
  });

  // Calculate overall metrics
  const totalStudents = targetStudents.length;
  const appearedStudents = finalRows.filter((r) => r.hasAnyMarks).length;
  const passedStudents = finalRows.filter((r) => r.hasAnyMarks && r.isPass).length;
  const failedStudents = appearedStudents - passedStudents;
  const passRate = appearedStudents > 0 ? Math.round((passedStudents / appearedStudents) * 100) : 0;
  const sumPercentages = finalRows.filter((r) => r.hasAnyMarks).reduce((a, r) => a + r.percentage, 0);
  const classAvg = appearedStudents > 0 ? Math.round((sumPercentages / appearedStudents) * 10) / 10 : 0;
  const highestScore = appearedStudents > 0 ? Math.max(...finalRows.filter((r) => r.hasAnyMarks).map((r) => r.percentage)) : 0;
  const lowestScore = appearedStudents > 0 ? Math.min(...finalRows.filter((r) => r.hasAnyMarks).map((r) => r.percentage)) : 0;

  // Header drawing function
  const drawHeader = (pageNum: number) => {
    // Top banner
    doc.setFillColor(themeRgb.r, themeRgb.g, themeRgb.b);
    doc.roundedRect(margin, 8, printableWidth, 24, 3, 3, "F");

    // School Name
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(schoolName.toUpperCase(), margin + 6, 17);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const subtitle = isExam ? "EXAMINATION MARKSHEET & PERFORMANCE REPORT" : "TEST ASSESSMENT & SCORE REPORT";
    doc.text(subtitle, margin + 6, 24);

    // Right Side Metadata
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const classLabel = `Class ${exam.className}${exam.section ? `-${exam.section}` : ""}`;
    doc.text(classLabel, pageWidth - margin - 6, 17, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const dateStr = exam.dateFrom
      ? `${formatDDMMYYYY(exam.dateFrom)}${exam.dateTo && exam.dateTo !== exam.dateFrom ? ` → ${formatDDMMYYYY(exam.dateTo)}` : ""}`
      : formatDDMMYYYY(exam.date || new Date().toISOString().slice(0, 10));
    const examPassMarks =
      exam.passMarks != null
        ? exam.passMarks
        : isExam && subjects.length
        ? subjects.reduce(
            (a, s) => a + (s.passMarks != null ? Number(s.passMarks) : Math.round((Number(s.maxMarks) || 100) * 0.35)),
            0
          )
        : Math.round((Number(exam.maxMarks) || 100) * 0.35);
    doc.text(`Date: ${dateStr}   •   Out off: ${exam.maxMarks || 100}   •   Pass: ${examPassMarks}`, pageWidth - margin - 6, 24, {
      align: "right",
    });
  };

  // Footer drawing function
  const drawFooter = (pageNum: number, totalPages: number) => {
    const y = pageHeight - 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(margin, y - 3, pageWidth - margin, y - 3);

    doc.text(`${schoolName} • Confidential Official Marksheet`, margin, y + 1);
    doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, y + 1, { align: "right" });
  };

  // 1. Draw Page 1 Header
  drawHeader(1);
  let currentY = 36;

  // 2. Exam Details & Info Bar
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, currentY, printableWidth, 12, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42); // Slate 900
  doc.text(`Exam: ${exam.name}`, margin + 5, currentY + 7.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105); // Slate 600
  const teacherInfo = teacherName ? `Teacher: ${teacherName}   •   ` : "";
  const genTime = `Generated: ${new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })}`;
  doc.text(`${teacherInfo}Status: ${exam.published ? "Published" : "Draft"}   •   ${genTime}`, pageWidth - margin - 5, currentY + 7.5, {
    align: "right",
  });

  // 3. KPI Analytics Cards
  currentY += 16;
  const kpiCount = 5;
  const cardGap = 3;
  const cardWidth = (printableWidth - cardGap * (kpiCount - 1)) / kpiCount;

  const kpis = [
    { label: "TOTAL / APPEARED", value: `${totalStudents} / ${appearedStudents}`, color: { r: 30, g: 41, b: 59 }, bg: { r: 241, g: 245, b: 249 } },
    { label: "CLASS AVERAGE", value: `${classAvg}%`, color: themeRgb, bg: { r: 238, g: 242, b: 255 } },
    { label: "PASS RATE", value: `${passRate}%`, color: { r: 16, g: 185, b: 129 }, bg: { r: 236, g: 253, b: 245 } },
    { label: "HIGHEST SCORE", value: `${highestScore}%`, color: { r: 14, g: 165, b: 233 }, bg: { r: 240, g: 249, b: 255 } },
    { label: "LOWEST SCORE", value: `${lowestScore}%`, color: { r: 239, g: 68, b: 68 }, bg: { r: 254, g: 242, b: 242 } },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardWidth + cardGap);
    doc.setFillColor(kpi.bg.r, kpi.bg.g, kpi.bg.b);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, 14, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(kpi.color.r, kpi.color.g, kpi.color.b);
    doc.text(kpi.value, x + 4, currentY + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 4, currentY + 11.5);
  });

  // 4. Table Setup
  currentY += 18;

  // Calculate dynamic column widths
  let colWidths: {
    rank: number;
    roll: number;
    name: number;
    subjects: Record<string, number>;
    total: number;
    pct: number;
    grade: number;
    status: number;
  };

  if (isExam && subjects.length > 0) {
    const fixedWidth = 14 + 20 + 38 + 24 + 18 + 14 + 18; // rank + roll + name + total + pct + grade + status
    const remainingWidth = Math.max(40, printableWidth - fixedWidth);
    const subColWidth = Math.max(20, Math.floor(remainingWidth / subjects.length));

    const subMap: Record<string, number> = {};
    subjects.forEach((s) => {
      subMap[s.id] = subColWidth;
    });

    colWidths = {
      rank: 14,
      roll: 20,
      name: isLandscape ? 44 : 34,
      subjects: subMap,
      total: 24,
      pct: 18,
      grade: 14,
      status: 18,
    };
  } else {
    // Single subject / TEST
    const singleSubWidth = isLandscape ? 50 : 36;
    colWidths = {
      rank: 14,
      roll: 24,
      name: isLandscape ? 60 : 46,
      subjects: { main: singleSubWidth },
      total: 28,
      pct: 22,
      grade: 16,
      status: 22,
    };
  }

  const drawTableHeader = (y: number) => {
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.roundedRect(margin, y, printableWidth, 8, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    let x = margin + 2;
    doc.text("Rank", x, y + 5.2);
    x += colWidths.rank;

    doc.text("Roll / ID", x, y + 5.2);
    x += colWidths.roll;

    doc.text("Student Name", x, y + 5.2);
    x += colWidths.name;

    if (isExam && subjects.length > 0) {
      subjects.forEach((s) => {
        const w = colWidths.subjects[s.id] || 20;
        const subTitle = s.subjectName.length > 8 ? s.subjectName.slice(0, 7) + "…" : s.subjectName;
        const sPass = s.passMarks != null ? s.passMarks : Math.round((Number(s.maxMarks) || 100) * 0.35);
        doc.text(`${subTitle} (${s.maxMarks}/P:${sPass})`, x, y + 5.2);
        x += w;
      });
    } else {
      const subTitle = (exam.subject || "Marks").length > 12 ? (exam.subject || "Marks").slice(0, 11) + "…" : exam.subject || "Marks";
      const tPass = exam.passMarks != null ? exam.passMarks : Math.round((Number(exam.maxMarks) || 100) * 0.35);
      doc.text(`${subTitle} (${exam.maxMarks || 100}/P:${tPass})`, x, y + 5.2);
      x += colWidths.subjects["main"];
    }

    doc.text("Total", x, y + 5.2);
    x += colWidths.total;

    doc.text("%", x, y + 5.2);
    x += colWidths.pct;

    doc.text("Grade", x, y + 5.2);
    x += colWidths.grade;

    doc.text("Status", x, y + 5.2);
  };

  drawTableHeader(currentY);
  currentY += 9;

  let pageNum = 1;
  const rowHeight = 8;
  const bottomThreshold = pageHeight - 32;

  if (finalRows.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("No students found in this class/section.", pageWidth / 2, currentY + 12, { align: "center" });
  } else {
    finalRows.forEach((row, idx) => {
      // Check for page break
      if (currentY + rowHeight > bottomThreshold) {
        doc.addPage();
        pageNum++;
        drawHeader(pageNum);
        currentY = 36;
        drawTableHeader(currentY);
        currentY += 9;
      }

      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
      doc.roundedRect(margin, currentY - 1, printableWidth, rowHeight, 1, 1, "F");

      // Draw subtle bottom border
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, currentY + rowHeight - 1, margin + printableWidth, currentY + rowHeight - 1);

      let x = margin + 2;

      // Rank
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      if (row.rank === "#1") doc.setTextColor(217, 119, 6); // Gold
      else if (row.rank === "#2") doc.setTextColor(100, 116, 139); // Silver
      else if (row.rank === "#3") doc.setTextColor(180, 83, 9); // Bronze
      else doc.setTextColor(71, 85, 105);
      doc.text(row.rank, x, currentY + 4.5);
      x += colWidths.rank;

      // Roll / ID
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(String(row.rollNumber || "—"), x, currentY + 4.5);
      x += colWidths.roll;

      // Student Name with Avatar Badge
      const avatarSize = 4.6;
      const avatarX = x;
      const avatarY = currentY + 1.6;
      doc.setFillColor(238, 242, 255); // Indigo 50
      doc.setDrawColor(199, 210, 254); // Indigo 200
      doc.roundedRect(avatarX, avatarY, avatarSize, avatarSize, 1, 1, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(4.8);
      doc.setTextColor(79, 70, 229); // Indigo 600
      const initials = (row.name || "S").split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();
      doc.text(initials, avatarX + 2.3, avatarY + 3.3, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      const truncName = row.name.length > 18 ? row.name.slice(0, 17) + "…" : row.name;
      doc.text(truncName, x + avatarSize + 2, currentY + 4.5);
      x += colWidths.name;

      // Subject scores
      if (isExam && subjects.length > 0) {
        subjects.forEach((s) => {
          const score = row.subjectScores[s.id];
          const w = colWidths.subjects[s.id] || 20;

          if (score && score.obtained != null) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.5);
            const isSubFail = score.obtained < score.pass;
            if (isSubFail) doc.setTextColor(220, 38, 38);
            else doc.setTextColor(30, 41, 59);
            doc.text(`${score.obtained}`, x, currentY + 4.5);
          } else {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(7);
            doc.setTextColor(203, 213, 225);
            doc.text("—", x, currentY + 4.5);
          }
          x += w;
        });
      } else {
        const score = row.subjectScores["main"];
        if (score && score.obtained != null) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7.5);
          const isSubFail = score.obtained < score.pass;
          if (isSubFail) doc.setTextColor(220, 38, 38);
          else doc.setTextColor(30, 41, 59);
          doc.text(`${score.obtained} / ${score.max}`, x, currentY + 4.5);
        } else {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(203, 213, 225);
          doc.text("—", x, currentY + 4.5);
        }
        x += colWidths.subjects["main"];
      }

      // Total
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      if (row.hasAnyMarks) {
        doc.text(`${row.totalObtained} / ${row.totalMax}`, x, currentY + 4.5);
      } else {
        doc.setTextColor(203, 213, 225);
        doc.text("—", x, currentY + 4.5);
      }
      x += colWidths.total;

      // Percentage
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      if (row.hasAnyMarks) {
        doc.setTextColor(row.isPass ? 15 : 220, row.isPass ? 23 : 38, row.isPass ? 42 : 38);
        doc.text(`${row.percentage}%`, x, currentY + 4.5);
      } else {
        doc.setTextColor(203, 213, 225);
        doc.text("—", x, currentY + 4.5);
      }
      x += colWidths.pct;

      // Grade
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(row.gradeColor.r, row.gradeColor.g, row.gradeColor.b);
      doc.text(row.grade, x, currentY + 4.5);
      x += colWidths.grade;

      // Status Badge
      if (row.hasAnyMarks) {
        if (row.isPass) {
          doc.setFillColor(236, 253, 245); // Emerald 50
          doc.setDrawColor(167, 243, 208); // Emerald 200
          doc.roundedRect(x, currentY + 0.8, 14, 5, 1, 1, "FD");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(5, 150, 105); // Emerald 600
          doc.text("PASS", x + 3.2, currentY + 4.3);
        } else {
          doc.setFillColor(254, 242, 242); // Rose 50
          doc.setDrawColor(254, 202, 202); // Rose 200
          doc.roundedRect(x, currentY + 0.8, 14, 5, 1, 1, "FD");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(220, 38, 38); // Rose 600
          doc.text("FAIL", x + 3.5, currentY + 4.3);
        }
      } else {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("ABSENT", x, currentY + 4.5);
      }

      currentY += rowHeight;
    });
  }

  // 5. Signatures section on the bottom of the last page
  currentY += 10;
  if (currentY + 16 > pageHeight - 16) {
    doc.addPage();
    pageNum++;
    drawHeader(pageNum);
    currentY = 40;
  }

  const sigBoxY = currentY;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  // Teacher signature
  doc.text("Class Teacher Signature: _______________________", margin + 10, sigBoxY + 6);
  // Principal signature
  doc.text("Principal Signature: _______________________", pageWidth / 2 + 10, sigBoxY + 6);
  // Date & Seal
  doc.text("Date & Official Stamp: _______________________", pageWidth - margin - 75, sigBoxY + 6);

  // Update footers with total page numbers
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawFooter(p, totalPages);
  }

  // Generate clean filename and save
  const cleanName = exam.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${cleanName}_Class_${exam.className}${exam.section ? `_${exam.section}` : ""}_Marksheet.pdf`;
  doc.save(fileName);
}

export interface ExamTimetableExportOptions {
  schoolName?: string;
  themeColor?: string;
  exam: {
    id: string;
    name: string;
    type?: "TEST" | "EXAM";
    className: string;
    section?: string;
    subject?: string;
    maxMarks?: number;
    passMarks?: number;
    date?: string;
    dateFrom?: string;
    dateTo?: string;
    subjects?: ExamSubject[];
  };
}

export function exportExamTimetablePDF(options: ExamTimetableExportOptions) {
  const {
    schoolName = "SchoolVajo",
    themeColor = "#6366F1",
    exam,
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const printableWidth = pageWidth - margin * 2;
  const themeRgb = hexToRgb(themeColor);

  const isExam = exam.type === "EXAM";
  const subjects = isExam && exam.subjects?.length ? exam.subjects : [];

  // Top header banner
  doc.setFillColor(themeRgb.r, themeRgb.g, themeRgb.b);
  doc.roundedRect(margin, 12, printableWidth, 26, 3, 3, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(schoolName.toUpperCase(), margin + 8, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.text("OFFICIAL EXAMINATION TIMETABLE & SCHEDULE", margin + 8, 30);

  const classLabel = `Class ${exam.className}${exam.section ? `-${exam.section}` : ""}`;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(classLabel, pageWidth - margin - 8, 22, { align: "right" });

  const dateStr = exam.dateFrom
    ? `${formatDDMMYYYY(exam.dateFrom)}${exam.dateTo && exam.dateTo !== exam.dateFrom ? ` → ${formatDDMMYYYY(exam.dateTo)}` : ""}`
    : formatDDMMYYYY(exam.date || new Date().toISOString().slice(0, 10));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(dateStr, pageWidth - margin - 8, 30, { align: "right" });

  let currentY = 44;

  // Exam Title Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, printableWidth, 14, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const examTitle = exam.name.charAt(0).toUpperCase() + exam.name.slice(1);
  doc.text(`Examination: ${examTitle}`, margin + 6, currentY + 8.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  const totalExamMarks = isExam && subjects.length
    ? subjects.reduce((a, s) => a + (Number(s.maxMarks) || 100), 0)
    : Number(exam.maxMarks) || 100;
  doc.text(`Type: ${exam.type || "TEST"}   •   Total Marks: ${totalExamMarks}`, pageWidth - margin - 6, currentY + 8.5, { align: "right" });

  currentY += 20;

  // Table Header
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin, currentY, printableWidth, 9, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  const colSno = 12;
  const colDate = 32;
  const colDay = 24;
  const colSubject = 48;
  const colTotal = 22;
  const colPass = 20;
  const colSplits = printableWidth - (colSno + colDate + colDay + colSubject + colTotal + colPass);

  let x = margin + 3;
  doc.text("S.No", x, currentY + 6);
  x += colSno;
  doc.text("Date", x, currentY + 6);
  x += colDate;
  doc.text("Day", x, currentY + 6);
  x += colDay;
  doc.text("Subject", x, currentY + 6);
  x += colSubject;
  doc.text("Total", x, currentY + 6);
  x += colTotal;
  doc.text("Pass", x, currentY + 6);
  x += colPass;
  doc.text("Breakdown / Splits", x, currentY + 6);

  currentY += 9;

  const rows = isExam && subjects.length > 0
    ? subjects
    : [
        {
          id: "main",
          subjectName: exam.subject || exam.name || "Subject",
          date: exam.date || exam.dateFrom || new Date().toISOString().slice(0, 10),
          maxMarks: Number(exam.maxMarks) || 100,
          passMarks: exam.passMarks != null ? Number(exam.passMarks) : Math.round((Number(exam.maxMarks) || 100) * 0.35),
          splits: [],
        },
      ];

  rows.forEach((row: any, idx: number) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, currentY, printableWidth, 9, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY + 9, margin + printableWidth, currentY + 9);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);

    let cx = margin + 3;
    doc.text(String(idx + 1), cx, currentY + 6);
    cx += colSno;

    const rowDate = row.date ? new Date(row.date) : null;
    const formattedDate = formatDDMMYYYY(row.date);
    const dayName = rowDate && !isNaN(rowDate.getTime()) ? rowDate.toLocaleDateString("en-US", { weekday: "short" }) : "—";

    doc.setFont("courier", "normal");
    doc.text(formattedDate, cx, currentY + 6);
    cx += colDate;

    doc.setFont("helvetica", "normal");
    doc.text(dayName, cx, currentY + 6);
    cx += colDay;

    doc.setFont("helvetica", "bold");
    doc.text(row.subjectName, cx, currentY + 6);
    cx += colSubject;

    doc.setFont("helvetica", "normal");
    doc.text(String(row.maxMarks), cx, currentY + 6);
    cx += colTotal;

    const passM = row.passMarks != null ? row.passMarks : Math.round(Number(row.maxMarks || 100) * 0.35);
    doc.setTextColor(16, 185, 129);
    doc.setFont("helvetica", "bold");
    doc.text(String(passM), cx, currentY + 6);
    cx += colPass;

    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    const splitsText = row.splits?.length
      ? row.splits.map((sp: any) => `${sp.title}: ${sp.maxMarks}`).join("  |  ")
      : "Full Assessment";
    doc.text(splitsText, cx, currentY + 6);

    currentY += 9;
  });

  // Instructions & Rules
  currentY += 12;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, currentY, printableWidth, 24, 2, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("IMPORTANT INSTRUCTIONS FOR STUDENTS:", margin + 5, currentY + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("1. Students must be seated in the examination hall 10 minutes prior to the commencement of exam.", margin + 5, currentY + 11.5);
  doc.text("2. Bring your required stationery and school ID. Borrowing items during the exam is strictly prohibited.", margin + 5, currentY + 16);
  doc.text("3. Electronic gadgets and mobile devices are strictly not allowed inside the examination hall.", margin + 5, currentY + 20.5);

  // Signatures block
  const sigY = pageHeight - 34;
  doc.setDrawColor(203, 213, 225);
  doc.setLineDashPattern([2, 2], 0);
  doc.line(margin + 10, sigY, margin + 50, sigY);
  doc.line(pageWidth / 2 - 20, sigY, pageWidth / 2 + 20, sigY);
  doc.line(pageWidth - margin - 50, sigY, pageWidth - margin - 10, sigY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Class Teacher", margin + 18, sigY + 4);
  doc.text("Exam Coordinator", pageWidth / 2 - 13, sigY + 4);
  doc.text("Principal Signature", pageWidth - margin - 45, sigY + 4);

  // Footer
  const y = pageHeight - 8;
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y - 3, pageWidth - margin, y - 3);
  doc.text(`${schoolName} • Official Examination Timetable`, margin, y + 1);
  doc.text(`Generated on ${new Date().toLocaleDateString("en-GB")}`, pageWidth - margin, y + 1, { align: "right" });

  const cleanName = exam.name.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${cleanName}_Class_${exam.className}${exam.section ? `_${exam.section}` : ""}_Timetable.pdf`;
  doc.save(fileName);
}

export async function downloadExamTimetableImage(elementId: string, filename?: string) {
  const html2canvas = (await import("html2canvas")).default;
  const el = document.getElementById(elementId);
  if (!el) throw new Error("Element not found");
  const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
  const link = document.createElement("a");
  link.download = filename || "Exam_Timetable.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

/**
 * Fetch and download PDF marksheet directly from examId
 */
export async function downloadExamMarksPDF(
  examId: string,
  options?: { schoolName?: string; themeColor?: string; teacherName?: string }
) {
  const [examRes, userRes] = await Promise.all([
    fetch(`/api/exams?examId=${encodeURIComponent(examId)}`),
    fetch("/api/users/list?role=STUDENT"),
  ]);

  if (!examRes.ok) {
    const err = await examRes.json();
    throw new Error(err.error || "Failed to fetch exam data");
  }

  const examData = await examRes.json();
  const userData = userRes.ok ? await userRes.json() : { users: [] };

  exportExamMarksPDF({
    schoolName: options?.schoolName || "SchoolVajo",
    themeColor: options?.themeColor || "#6366F1",
    teacherName: options?.teacherName,
    exam: examData.exam,
    marks: examData.marks || [],
    students: userData.users || [],
  });
}