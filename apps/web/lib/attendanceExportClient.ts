import { jsPDF } from "jspdf";

export interface AttendanceExportRecord {
  date: string;
  studentId?: string;
  studentName: string;
  rollNumber?: string;
  username?: string;
  className: string;
  section: string;
  photoUrl?: string | null;
  status: string;
  remarks?: string;
  markedAt?: string;
  notificationSent?: boolean;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
}

export interface AttendanceExportOptions {
  schoolName?: string;
  schoolLogo?: string | null;
  themeColor?: string;
  records: AttendanceExportRecord[];
  from: string;
  to: string;
  className?: string;
  section?: string;
  status?: string;
  teacherName?: string;
}

/** Format date string (YYYY-MM-DD or ISO) as DD-MM-YYYY (e.g. 03-09-2026) */
export function formatDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "";
  const match = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, yyyy, mm, dd] = match;
    return `${dd}-${mm}-${yyyy}`;
  }
  return String(dateStr);
}

function getStatusBadgeText(status: string): string {
  switch (status) {
    case "PRESENT":
      return "Present";
    case "ABSENT":
      return "Absent";
    case "LATE":
      return "Late";
    case "HALF_DAY":
      return "Half Day";
    case "HOLIDAY":
      return "Holiday";
    default:
      return status || "—";
  }
}

function getStatusColor(status: string): { r: number; g: number; b: number } {
  switch (status) {
    case "PRESENT":
      return { r: 16, g: 185, b: 129 }; // Emerald
    case "ABSENT":
      return { r: 239, g: 68, b: 68 }; // Rose/Red
    case "LATE":
      return { r: 245, g: 158, b: 11 }; // Amber
    case "HALF_DAY":
      return { r: 139, g: 92, b: 246 }; // Purple
    default:
      return { r: 100, g: 116, b: 139 }; // Slate
  }
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace("#", "");
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

async function loadImageDataUrl(url: string): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith("data:")) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generate and download a PDF document for student attendance
 */
export async function exportStudentAttendancePDF(options: AttendanceExportOptions) {
  const {
    schoolName = "SchoolVajo",
    schoolLogo = null,
    themeColor = "#6366F1",
    records = [],
    from,
    to,
    className,
    section,
    status,
    teacherName,
  } = options;

  let logoDataUrl: string | null = null;
  if (schoolLogo) {
    logoDataUrl = await loadImageDataUrl(schoolLogo);
  }
  if (!logoDataUrl) {
    logoDataUrl = await loadImageDataUrl("/logo.png");
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const printableWidth = pageWidth - margin * 2;

  // Calculate statistics
  const total = records.length;
  const presentCount = records.filter((r) => r.status === "PRESENT").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const halfDayCount = records.filter((r) => r.status === "HALF_DAY").length;
  const rate = total > 0 ? Math.round(((presentCount + lateCount * 0.5) / total) * 100) : 0;

  const themeRgb = hexToRgb(themeColor || "#6366F1");

  const drawHeader = (pageNum: number) => {
    // Top banner
    doc.setFillColor(themeRgb.r, themeRgb.g, themeRgb.b);
    doc.roundedRect(margin, 10, printableWidth, 24, 3, 3, "F");

    // School Emblem circle or Logo image
    if (logoDataUrl) {
      try {
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(margin + 5, 12, 18, 20, 2, 2, "F");
        const imgFmt = logoDataUrl.startsWith("data:image/jpeg") || logoDataUrl.startsWith("data:image/jpg") ? "JPEG" : "PNG";
        doc.addImage(logoDataUrl, imgFmt, margin + 6, 13, 16, 18);
      } catch {
        doc.setFillColor(255, 255, 255);
        doc.circle(margin + 12, 22, 7.5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(themeRgb.r, themeRgb.g, themeRgb.b);
        const initial = (schoolName || "S").trim().charAt(0).toUpperCase();
        doc.text(initial, margin + 12, 25.2, { align: "center" });
      }
    } else {
      doc.setFillColor(255, 255, 255);
      doc.circle(margin + 12, 22, 7.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(themeRgb.r, themeRgb.g, themeRgb.b);
      const initial = (schoolName || "S").trim().charAt(0).toUpperCase();
      doc.text(initial, margin + 12, 25.2, { align: "center" });
    }

    // School Title
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(schoolName.toUpperCase(), margin + 25, 18);

    // Subtitle
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("OFFICIAL STUDENT ATTENDANCE REPORT", margin + 25, 24);

    // Generated Date (Right aligned in banner)
    doc.setFontSize(7.5);
    const dateStr = `Generated: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    doc.text(dateStr, pageWidth - margin - 6, 18, { align: "right" });
    doc.text(`Period: ${formatDDMMYYYY(from)} to ${formatDDMMYYYY(to)}`, pageWidth - margin - 6, 24, { align: "right" });
  };

  const drawFooter = (pageNum: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.text(`${schoolName} Attendance Management System • Official Record`, margin, pageHeight - 6);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  };

  // Draw First Page Header
  drawHeader(1);

  // Filters Box
  let currentY = 38;
  doc.setFillColor(248, 250, 252); // Slate 50
  doc.setDrawColor(226, 232, 240); // Slate 200
  doc.roundedRect(margin, currentY, printableWidth, 12, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85); // Slate 700

  const filterItems = [
    `Class: ${className || "All Classes"}${section ? `-${section}` : ""}`,
    teacherName ? `Teacher: ${teacherName}` : null,
    `Status: ${status && status !== "ALL" ? status : "All Statuses"}`,
    `Total Records: ${total}`,
  ].filter(Boolean);

  doc.text(filterItems.join("   •   "), margin + 5, currentY + 7.5);

  // KPI Summary Cards
  currentY += 16;
  const cardWidth = (printableWidth - 9) / 4;
  const kpis = [
    { label: "PRESENT", value: `${presentCount}`, color: { r: 16, g: 185, b: 129 }, bg: { r: 236, g: 253, b: 245 } },
    { label: "ABSENT", value: `${absentCount}`, color: { r: 239, g: 68, b: 68 }, bg: { r: 254, g: 242, b: 242 } },
    { label: "LATE / HALF", value: `${lateCount + halfDayCount}`, color: { r: 245, g: 158, b: 11 }, bg: { r: 255, g: 251, b: 235 } },
    { label: "ATTENDANCE RATE", value: `${rate}%`, color: themeRgb, bg: { r: 245, g: 243, b: 255 } },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardWidth + 3);
    doc.setFillColor(kpi.bg.r, kpi.bg.g, kpi.bg.b);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, 14, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(kpi.color.r, kpi.color.g, kpi.color.b);
    doc.text(kpi.value, x + 4, currentY + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 4, currentY + 11);
  });

  // Table Setup
  currentY += 19;
  const colWidths = {
    sno: 10,
    date: 24,
    name: 58,
    classSec: 22,
    status: 24,
    markedAt: 22,
    remarks: 26,
  };

  const drawTableHeader = (y: number) => {
    doc.setFillColor(30, 41, 59); // Slate 800
    doc.roundedRect(margin, y, printableWidth, 7, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let x = margin + 2;
    doc.text("#", x, y + 4.8);
    x += colWidths.sno;
    doc.text("Date", x, y + 4.8);
    x += colWidths.date;
    doc.text("Student", x, y + 4.8);
    x += colWidths.name;
    doc.text("Class-Sec", x, y + 4.8);
    x += colWidths.classSec;
    doc.text("Status", x, y + 4.8);
    x += colWidths.status;
    doc.text("Time", x, y + 4.8);
    x += colWidths.markedAt;
    doc.text("Remarks", x, y + 4.8);
  };

  drawTableHeader(currentY);
  currentY += 8;

  let pageNum = 1;
  drawFooter(pageNum);

  if (records.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("No attendance records found for the selected filters.", pageWidth / 2, currentY + 12, {
      align: "center",
    });
  } else {
    records.forEach((record, index) => {
      // Check if row exceeds printable height
      if (currentY + 7 > pageHeight - 24) {
        doc.addPage();
        pageNum++;
        drawHeader(pageNum);
        currentY = 38;
        drawTableHeader(currentY);
        currentY += 8;
        drawFooter(pageNum);
      }

      // Alternating row background
      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252); // Slate 50
        doc.rect(margin, currentY, printableWidth, 6.2, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);

      let x = margin + 2;

      // S.No
      doc.text(`${index + 1}`, x, currentY + 4.2);
      x += colWidths.sno;

      // Date
      doc.text(formatDDMMYYYY(record.date) || "—", x, currentY + 4.2);
      x += colWidths.date;

      // Student with Avatar Pill
      const sName = record.studentName || "—";
      const sInitial = sName.charAt(0).toUpperCase();

      // Mini Avatar circle
      doc.setFillColor(224, 231, 255); // Indigo 100
      doc.circle(x + 2, currentY + 3.1, 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(5);
      doc.setTextColor(67, 56, 202); // Indigo 700
      doc.text(sInitial, x + 2, currentY + 3.8, { align: "center" });

      // Student Name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.2);
      doc.setTextColor(30, 41, 59);
      const dispName = sName.length > 25 ? sName.slice(0, 23) + "..." : sName;
      doc.text(dispName, x + 5.5, currentY + 4.2);
      doc.setFont("helvetica", "normal");
      x += colWidths.name;

      // Class-Sec
      const cLabel = record.className
        ? `${record.className}${record.section ? `-${record.section}` : ""}`
        : "—";
      doc.setTextColor(71, 85, 105);
      doc.text(cLabel, x, currentY + 4.2);
      x += colWidths.classSec;

      // Status Pill
      const statusColor = getStatusColor(record.status);
      doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
      doc.roundedRect(x, currentY + 1.2, 18, 4, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.text(getStatusBadgeText(record.status), x + 9, currentY + 3.9, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(100, 116, 139);
      x += colWidths.status;

      // Marked Time
      const timeStr = record.markedAt ? record.markedAt.slice(11, 16) : "—";
      doc.text(timeStr, x, currentY + 4.2);
      x += colWidths.markedAt;

      // Remarks
      const rem = record.remarks || "—";
      doc.text(rem.length > 15 ? rem.slice(0, 13) + "..." : rem, x, currentY + 4.2);

      currentY += 6.5;
    });

    // Signature section
    if (currentY + 22 > pageHeight - 16) {
      doc.addPage();
      pageNum++;
      drawHeader(pageNum);
      currentY = 38;
      drawFooter(pageNum);
    }
    currentY += 8;
    const sigBoxWidth = 52;
    // Class Teacher Signature
    doc.setDrawColor(203, 213, 225);
    doc.line(margin + 5, currentY + 12, margin + 5 + sigBoxWidth, currentY + 12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(teacherName ? `Class Teacher (${teacherName})` : "Class Teacher Signature", margin + 5, currentY + 16);

    // Principal Signature
    const prX = pageWidth - margin - 5 - sigBoxWidth;
    doc.line(prX, currentY + 12, prX + sigBoxWidth, currentY + 12);
    doc.text("Principal / Head of School", prX, currentY + 16);
  }

  // Construct filename
  const filenameParts = ["student_attendance"];
  if (className) filenameParts.push(className.replace(/\s+/g, "-"));
  if (section) filenameParts.push(section);
  if (from === to) {
    filenameParts.push(from);
  } else {
    filenameParts.push(`${from}_to_${to}`);
  }
  const filename = `${filenameParts.join("_")}.pdf`;

  doc.save(filename);
}

/**
 * Generate and download an Excel Spreadsheet (.xls / XML Spreadsheet) for student attendance
 */
export function exportStudentAttendanceExcel(options: AttendanceExportOptions) {
  const {
    schoolName = "SchoolVajo",
    records = [],
    from,
    to,
    className,
    section,
    status,
  } = options;

  const total = records.length;
  const presentCount = records.filter((r) => r.status === "PRESENT").length;
  const absentCount = records.filter((r) => r.status === "ABSENT").length;
  const lateCount = records.filter((r) => r.status === "LATE").length;
  const halfDayCount = records.filter((r) => r.status === "HALF_DAY").length;
  const rate = total > 0 ? Math.round(((presentCount + lateCount * 0.5) / total) * 100) : 0;

  // Escape XML entities
  const xmlEsc = (str: string | number | null | undefined) => {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${xmlEsc(schoolName)} - Student Attendance Report</Title>
  <Subject>Attendance Export</Subject>
  <Author>SchoolVajo</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="16" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#475569" ss:Bold="1"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaValue">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="9" ss:Color="#64748B" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiPresent">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#059669" ss:Bold="1"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiAbsent">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#DC2626" ss:Bold="1"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiRate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Color="#4F46E5" ss:Bold="1"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="2" ss:Color="#0F172A"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRow">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="DataRowAlt">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#1E293B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatusPresent">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#059669" ss:Bold="1"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatusAbsent">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#DC2626" ss:Bold="1"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatusLate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#D97706" ss:Bold="1"/>
   <Interior ss:Color="#FFFBEB" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Attendance Report">
  <Table ss:ExpandedColumnCount="8" ss:ExpandedRowCount="${records.length + 20}" x:FullColumns="1"
   x:FullRows="1" ss:DefaultRowHeight="20">
   <Column ss:Width="40"/>
   <Column ss:Width="85"/>
   <Column ss:Width="160"/>
   <Column ss:Width="75"/>
   <Column ss:Width="65"/>
   <Column ss:Width="85"/>
   <Column ss:Width="70"/>
   <Column ss:Width="140"/>

   <!-- Title Banner -->
   <Row ss:Height="32">
    <Cell ss:MergeAcross="7" ss:StyleID="HeaderTitle">
     <Data ss:Type="String">  ${xmlEsc(schoolName)} - Student Attendance Report</Data>
    </Cell>
   </Row>

   <!-- Metadata -->
   <Row ss:Height="20">
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Date Range:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="MetaValue"><Data ss:Type="String">${xmlEsc(formatDDMMYYYY(from))} to ${xmlEsc(formatDDMMYYYY(to))}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Generated:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="MetaValue"><Data ss:Type="String">${new Date().toLocaleString()}</Data></Cell>
   </Row>
   <Row ss:Height="20">
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Class/Section:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="MetaValue"><Data ss:Type="String">${xmlEsc(className || "All Classes")} ${xmlEsc(section ? `(Section ${section})` : "")}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Filter Status:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="MetaValue"><Data ss:Type="String">${xmlEsc(status && status !== "ALL" ? status : "All Statuses")}</Data></Cell>
   </Row>

   <!-- Blank spacing -->
   <Row ss:Height="10"/>

   <!-- KPI Cards Headers -->
   <Row ss:Height="18">
    <Cell ss:StyleID="KpiHeader"><Data ss:Type="String">TOTAL</Data></Cell>
    <Cell ss:StyleID="KpiHeader"><Data ss:Type="String">PRESENT</Data></Cell>
    <Cell ss:StyleID="KpiHeader"><Data ss:Type="String">ABSENT</Data></Cell>
    <Cell ss:StyleID="KpiHeader"><Data ss:Type="String">LATE</Data></Cell>
    <Cell ss:StyleID="KpiHeader"><Data ss:Type="String">HALF DAY</Data></Cell>
    <Cell ss:StyleID="KpiHeader"><Data ss:Type="String">RATE (%)</Data></Cell>
   </Row>
   <!-- KPI Cards Values -->
   <Row ss:Height="26">
    <Cell ss:StyleID="KpiRate"><Data ss:Type="Number">${total}</Data></Cell>
    <Cell ss:StyleID="KpiPresent"><Data ss:Type="Number">${presentCount}</Data></Cell>
    <Cell ss:StyleID="KpiAbsent"><Data ss:Type="Number">${absentCount}</Data></Cell>
    <Cell ss:StyleID="KpiHeader"><Data ss:Type="Number">${lateCount}</Data></Cell>
    <Cell ss:StyleID="KpiHeader"><Data ss:Type="Number">${halfDayCount}</Data></Cell>
    <Cell ss:StyleID="KpiRate"><Data ss:Type="String">${rate}%</Data></Cell>
   </Row>

   <!-- Blank spacing -->
   <Row ss:Height="14"/>

   <!-- Data Table Headers -->
   <Row ss:Height="24">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">S.No</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Student Name</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Class</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Section</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Time</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Remarks</Data></Cell>
   </Row>

   <!-- Data Rows -->
   ${records
     .map((r, i) => {
       const rowStyle = i % 2 === 0 ? "DataRow" : "DataRowAlt";
       let statusStyle = rowStyle;
       if (r.status === "PRESENT") statusStyle = "StatusPresent";
       else if (r.status === "ABSENT") statusStyle = "StatusAbsent";
       else if (r.status === "LATE") statusStyle = "StatusLate";

       return `<Row ss:Height="22">
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${i + 1}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(formatDDMMYYYY(r.date))}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.studentName)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.className)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.section)}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${xmlEsc(getStatusBadgeText(r.status))}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.markedAt ? r.markedAt.slice(11, 16) : "")}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.remarks || "")}</Data></Cell>
   </Row>`;
     })
     .join("\n")}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <Selected/>
   <FreezePanes/>
   <FrozenNoSplit/>
   <SplitHorizontal>8</SplitHorizontal>
   <TopRowBottomPane>8</TopRowBottomPane>
   <ActivePane>2</ActivePane>
   <Panes>
    <Pane>
     <Number>3</Number>
    </Pane>
    <Pane>
     <Number>2</Number>
     <ActiveRow>0</ActiveRow>
    </Pane>
   </Panes>
   <ProtectObjects>False</ProtectObjects>
   <ProtectScenarios>False</ProtectScenarios>
  </WorksheetOptions>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const filenameParts = ["student_attendance"];
  if (className) filenameParts.push(className.replace(/\s+/g, "-"));
  if (section) filenameParts.push(section);
  if (from === to) {
    filenameParts.push(from);
  } else {
    filenameParts.push(`${from}_to_${to}`);
  }
  const filename = `${filenameParts.join("_")}.xls`;

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export interface TeacherExportRecord {
  date: string;
  teacherId?: string;
  teacherName: string;
  email?: string;
  phone?: string;
  education?: string;
  classLabel?: string;
  status: string;
  markedAt?: string | null;
}

/**
 * Generate and download a PDF document for teacher check-in
 */
export function exportTeacherCheckInPDF(options: {
  schoolName?: string;
  schoolLogo?: string | null;
  themeColor?: string;
  records: TeacherExportRecord[];
  from: string;
  to: string;
}) {
  const {
    schoolName = "School",
    schoolLogo = null,
    themeColor = "#6366F1",
    records = [],
    from,
    to,
  } = options;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const printableWidth = pageWidth - margin * 2;

  const total = records.length;
  const checkedInCount = records.filter((r) => r.status === "CHECKED_IN" || r.status === "PRESENT").length;
  const notCheckedInCount = total - checkedInCount;
  const rate = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;

  const themeRgb = hexToRgb(themeColor || "#6366F1");

  const drawHeader = (pageNum: number) => {
    doc.setFillColor(themeRgb.r, themeRgb.g, themeRgb.b);
    doc.roundedRect(margin, 10, printableWidth, 22, 3, 3, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(schoolName.toUpperCase(), margin + 6, 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("TEACHER CHECK-IN & ATTENDANCE REPORT", margin + 6, 25);

    doc.setFontSize(7.5);
    const dateStr = `Generated: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}`;
    doc.text(dateStr, pageWidth - margin - 6, 18, { align: "right" });
    doc.text(`Period: ${formatDDMMYYYY(from)} to ${formatDDMMYYYY(to)}`, pageWidth - margin - 6, 25, { align: "right" });
  };

  const drawFooter = (pageNum: number) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
    doc.text(`${schoolName} Attendance Management System • Confidential Staff Record`, margin, pageHeight - 6);
    doc.text(`Page ${pageNum}`, pageWidth - margin, pageHeight - 6, { align: "right" });
  };

  drawHeader(1);

  // Filters Box
  let currentY = 36;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, currentY, printableWidth, 12, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(`Type: Teacher Check-In Report   •   Period: ${from} to ${to}   •   Total Records: ${total}`, margin + 5, currentY + 7.5);

  // KPI Summary Cards
  currentY += 16;
  const cardWidth = (printableWidth - 9) / 4;
  const kpis = [
    { label: "TOTAL RECORDS", value: `${total}`, color: { r: 79, g: 70, b: 229 }, bg: { r: 238, g: 242, b: 255 } },
    { label: "CHECKED IN", value: `${checkedInCount}`, color: { r: 16, g: 185, b: 129 }, bg: { r: 236, g: 253, b: 245 } },
    { label: "NOT CHECKED IN", value: `${notCheckedInCount}`, color: { r: 239, g: 68, b: 68 }, bg: { r: 254, g: 242, b: 242 } },
    { label: "CHECK-IN RATE", value: `${rate}%`, color: themeRgb, bg: { r: 245, g: 243, b: 255 } },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardWidth + 3);
    doc.setFillColor(kpi.bg.r, kpi.bg.g, kpi.bg.b);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, currentY, cardWidth, 14, 2, 2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(kpi.color.r, kpi.color.g, kpi.color.b);
    doc.text(kpi.value, x + 4, currentY + 6.5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 4, currentY + 11);
  });

  currentY += 19;
  const colWidths = {
    sno: 10,
    date: 24,
    name: 50,
    classLabel: 30,
    contact: 36,
    status: 24,
    time: 18,
  };

  const drawTableHeader = (y: number) => {
    doc.setFillColor(30, 41, 59);
    doc.roundedRect(margin, y, printableWidth, 7, 1.5, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let x = margin + 2;
    doc.text("#", x, y + 4.8);
    x += colWidths.sno;
    doc.text("Date", x, y + 4.8);
    x += colWidths.date;
    doc.text("Teacher Name", x, y + 4.8);
    x += colWidths.name;
    doc.text("Class / Role", x, y + 4.8);
    x += colWidths.classLabel;
    doc.text("Contact", x, y + 4.8);
    x += colWidths.contact;
    doc.text("Status", x, y + 4.8);
    x += colWidths.status;
    doc.text("Time", x, y + 4.8);
  };

  drawTableHeader(currentY);
  currentY += 8;

  let pageNum = 1;
  drawFooter(pageNum);

  if (records.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text("No teacher check-in records found for this period.", pageWidth / 2, currentY + 12, {
      align: "center",
    });
  } else {
    records.forEach((record, index) => {
      if (currentY + 7 > pageHeight - 16) {
        doc.addPage();
        pageNum++;
        drawHeader(pageNum);
        currentY = 36;
        drawTableHeader(currentY);
        currentY += 8;
        drawFooter(pageNum);
      }

      if (index % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, currentY, printableWidth, 6.2, "F");
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(51, 65, 85);

      let x = margin + 2;

      // S.No
      doc.text(`${index + 1}`, x, currentY + 4.2);
      x += colWidths.sno;

      // Date
      doc.text(formatDDMMYYYY(record.date) || "—", x, currentY + 4.2);
      x += colWidths.date;

      // Teacher Name
      const tName = record.teacherName || "—";
      doc.setFont("helvetica", "bold");
      doc.text(tName.length > 28 ? tName.slice(0, 26) + "..." : tName, x, currentY + 4.2);
      doc.setFont("helvetica", "normal");
      x += colWidths.name;

      // Class / Role
      const cLabel = record.classLabel || "—";
      doc.text(cLabel.length > 18 ? cLabel.slice(0, 16) + "..." : cLabel, x, currentY + 4.2);
      x += colWidths.classLabel;

      // Contact
      const contact = record.phone || record.email || "—";
      doc.text(contact.length > 20 ? contact.slice(0, 18) + "..." : contact, x, currentY + 4.2);
      x += colWidths.contact;

      // Status Pill
      const isCheckedIn = record.status === "CHECKED_IN" || record.status === "PRESENT";
      const statusColor = isCheckedIn ? { r: 16, g: 185, b: 129 } : { r: 239, g: 68, b: 68 };
      doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
      doc.roundedRect(x, currentY + 1.2, 20, 4, 1, 1, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.text(isCheckedIn ? "Checked In" : "Not In", x + 10, currentY + 3.9, { align: "center" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.2);
      doc.setTextColor(100, 116, 139);
      x += colWidths.status;

      // Marked Time
      const timeStr = record.markedAt ? record.markedAt.slice(11, 16) : "—";
      doc.text(timeStr, x, currentY + 4.2);

      currentY += 6.5;
    });
  }

  const filename = `teacher_checkin_${from}_to_${to}.pdf`;
  doc.save(filename);
}

/**
 * Generate and download an Excel Spreadsheet (.xls / XML Spreadsheet) for teacher check-in
 */
export function exportTeacherCheckInExcel(options: {
  schoolName?: string;
  records: TeacherExportRecord[];
  from: string;
  to: string;
}) {
  const {
    schoolName = "SchoolVajo",
    records = [],
    from,
    to,
  } = options;

  const total = records.length;
  const checkedInCount = records.filter((r) => r.status === "CHECKED_IN" || r.status === "PRESENT").length;
  const notCheckedInCount = total - checkedInCount;
  const rate = total > 0 ? Math.round((checkedInCount / total) * 100) : 0;

  const xmlEsc = (str: string | number | null | undefined) => {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">
  <Title>${xmlEsc(schoolName)} - Teacher Check-In Report</Title>
  <Subject>Teacher Attendance Export</Subject>
  <Author>SchoolVajo</Author>
  <Created>${new Date().toISOString()}</Created>
 </DocumentProperties>
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
  </Style>
  <Style ss:ID="HeaderTitle">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="16" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#4F46E5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaLabel">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#475569" ss:Bold="1"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="MetaValue">
   <Alignment ss:Horizontal="Left" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Color="#0F172A"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiHead">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="9" ss:Color="#64748B" ss:Bold="1"/>
   <Interior ss:Color="#F1F5F9" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiPres">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#059669" ss:Bold="1"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiAbs">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#DC2626" ss:Bold="1"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="KpiRate">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="14" ss:Color="#4F46E5" ss:Bold="1"/>
   <Interior ss:Color="#EEF2FF" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="ColHeader">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/>
   <Interior ss:Color="#1E293B" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataRow">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/>
  </Style>
  <Style ss:ID="DataRowAlt">
   <Alignment ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#1E293B"/>
   <Interior ss:Color="#F8FAFC" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatPres">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#059669" ss:Bold="1"/>
   <Interior ss:Color="#ECFDF5" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="StatAbs">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#DC2626" ss:Bold="1"/>
   <Interior ss:Color="#FEF2F2" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="Teacher Check-In">
  <Table ss:ExpandedColumnCount="8" ss:ExpandedRowCount="${records.length + 20}" x:FullColumns="1" ss:DefaultRowHeight="20">
   <Column ss:Width="40"/>
   <Column ss:Width="85"/>
   <Column ss:Width="160"/>
   <Column ss:Width="150"/>
   <Column ss:Width="100"/>
   <Column ss:Width="120"/>
   <Column ss:Width="90"/>
   <Column ss:Width="80"/>

   <Row ss:Height="30">
    <Cell ss:MergeAcross="7" ss:StyleID="HeaderTitle"><Data ss:Type="String">  ${xmlEsc(schoolName)} - Teacher Check-In Report</Data></Cell>
   </Row>

   <Row ss:Height="20">
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Date Range:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="MetaValue"><Data ss:Type="String">${xmlEsc(formatDDMMYYYY(from))} to ${xmlEsc(formatDDMMYYYY(to))}</Data></Cell>
    <Cell ss:StyleID="MetaLabel"><Data ss:Type="String">Generated:</Data></Cell>
    <Cell ss:MergeAcross="2" ss:StyleID="MetaValue"><Data ss:Type="String">${new Date().toLocaleString()}</Data></Cell>
   </Row>

   <Row ss:Height="8"/>

   <Row ss:Height="18">
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">TOTAL RECORDS</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">CHECKED IN</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">NOT CHECKED IN</Data></Cell>
    <Cell ss:StyleID="KpiHead"><Data ss:Type="String">CHECK-IN RATE</Data></Cell>
   </Row>
   <Row ss:Height="24">
    <Cell ss:StyleID="KpiRate"><Data ss:Type="Number">${total}</Data></Cell>
    <Cell ss:StyleID="KpiPres"><Data ss:Type="Number">${checkedInCount}</Data></Cell>
    <Cell ss:StyleID="KpiAbs"><Data ss:Type="Number">${notCheckedInCount}</Data></Cell>
    <Cell ss:StyleID="KpiRate"><Data ss:Type="String">${rate}%</Data></Cell>
   </Row>

   <Row ss:Height="10"/>

   <Row ss:Height="22">
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">#</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Date</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Teacher Name</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Email</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Phone</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Class / Section</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Status</Data></Cell>
    <Cell ss:StyleID="ColHeader"><Data ss:Type="String">Time</Data></Cell>
   </Row>

   ${records
     .map((r, i) => {
       const rowStyle = i % 2 === 0 ? "DataRow" : "DataRowAlt";
       const isCheckedIn = r.status === "CHECKED_IN" || r.status === "PRESENT";
       const statusStyle = isCheckedIn ? "StatPres" : "StatAbs";
       const statusText = isCheckedIn ? "Checked In" : "Not Checked In";

       return `<Row ss:Height="20">
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="Number">${i + 1}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(formatDDMMYYYY(r.date))}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.teacherName)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.email)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.phone)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.classLabel)}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${xmlEsc(statusText)}</Data></Cell>
    <Cell ss:StyleID="${rowStyle}"><Data ss:Type="String">${xmlEsc(r.markedAt ? r.markedAt.slice(11, 16) : "")}</Data></Cell>
   </Row>`;
     })
     .join("\n")}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([xmlContent], {
    type: "application/vnd.ms-excel;charset=utf-8",
  });

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `teacher_checkin_${from}_to_${to}.xls`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Download attendance report in Excel, PDF, or CSV for Students or Teachers
 */
export async function downloadAttendanceReport(params: {
  format: "excel" | "pdf" | "csv";
  type?: "student" | "teacher";
  from: string;
  to: string;
  className?: string;
  section?: string;
  status?: string;
  schoolName?: string;
  schoolLogo?: string | null;
  themeColor?: string;
}) {
  const {
    format,
    type = "student",
    from,
    to,
    className,
    section,
    status,
    schoolName,
    schoolLogo,
    themeColor,
  } = params;

  // Student PDF or Excel
  if (type === "student" && (format === "pdf" || format === "excel")) {
    const q = new URLSearchParams({
      type: "student",
      format: "json",
      from,
      to,
    });
    if (className) q.set("className", className);
    if (section) q.set("section", section);
    if (status && status !== "ALL") q.set("status", status);

    const res = await fetch(`/api/attendance/export?${q.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch attendance data for export");
    }

    const data = await res.json();
    const records: AttendanceExportRecord[] = data.records || [];
    const actualSchoolName = schoolName || data.schoolName || "School";
    const actualSchoolLogo = schoolLogo !== undefined ? schoolLogo : data.schoolLogo;

    if (format === "pdf") {
      await exportStudentAttendancePDF({
        schoolName: actualSchoolName,
        schoolLogo: actualSchoolLogo,
        themeColor,
        records,
        from,
        to,
        className,
        section,
        status,
      });
    } else {
      exportStudentAttendanceExcel({
        schoolName: actualSchoolName,
        records,
        from,
        to,
        className,
        section,
        status,
      });
    }
    return;
  }

  // Teacher PDF or Excel
  if (type === "teacher" && (format === "pdf" || format === "excel")) {
    const q = new URLSearchParams({
      type: "teacher",
      format: "json",
      from,
      to,
    });

    const res = await fetch(`/api/attendance/export?${q.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Failed to fetch teacher check-in data for export");
    }

    const data = await res.json();
    const records: TeacherExportRecord[] = data.records || [];
    const actualSchoolName = schoolName || data.schoolName || "School";
    const actualSchoolLogo = schoolLogo !== undefined ? schoolLogo : data.schoolLogo;

    if (format === "pdf") {
      exportTeacherCheckInPDF({
        schoolName: actualSchoolName,
        schoolLogo: actualSchoolLogo,
        themeColor,
        records,
        from,
        to,
      });
    } else {
      exportTeacherCheckInExcel({
        schoolName: actualSchoolName,
        records,
        from,
        to,
      });
    }
    return;
  }

  // Direct CSV download via API
  const q = new URLSearchParams({
    type,
    format: "csv",
    from,
    to,
  });
  if (className) q.set("className", className);
  if (section) q.set("section", section);
  if (status && status !== "ALL") q.set("status", status);

  const res = await fetch(`/api/attendance/export?${q.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to download attendance file");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  const disposition = res.headers.get("Content-Disposition");
  let filename = `attendance_${type}_${from}_to_${to}.csv`;
  if (disposition && disposition.includes("filename=")) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
