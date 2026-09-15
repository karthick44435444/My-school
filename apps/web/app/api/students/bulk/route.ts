import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import {
  createStudent,
  findDuplicateUser,
  normalizeEmail,
  getTeacherClasses,
  cleanPhoneNumber,
  ensureClass,
  readDB,
} from "@/lib/store";
import {
  sendEmail,
  credentialsEmailHtml,
  studentAndParentCredentialsEmailHtml,
} from "@/lib/email";
import * as XLSX from "xlsx";

export interface BulkStudentRow {
  rowNumber: number;
  firstName: string;
  lastName?: string;
  rollNumber?: string;
  email?: string;
  phone?: string;
  gender: string;
  dateOfBirth: string; // YYYY-MM-DD
  className: string;
  section: string;
  parentName: string;
  parentEmail: string;
  isValid: boolean;
  errors: string[];
}

function normalizeDate(raw: any): { dateStr: string | null; error?: string } {
  if (!raw) return { dateStr: null, error: "Date of birth is required" };

  let d: Date | null = null;

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    d = raw;
  } else if (typeof raw === "number") {
    // Excel serial date format
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) {
      d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
    }
  } else if (typeof raw === "string") {
    const trimmed = raw.trim();
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parts = trimmed.split("-").map(Number);
      d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    }
    // DD/MM/YYYY or DD-MM-YYYY
    else if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(trimmed)) {
      const parts = trimmed.split(/[/-]/).map(Number);
      d = new Date(Date.UTC(parts[2], parts[1] - 1, parts[0]));
    }
    // MM/DD/YYYY
    else {
      const timestamp = Date.parse(trimmed);
      if (!isNaN(timestamp)) {
        d = new Date(timestamp);
      }
    }
  }

  if (!d || isNaN(d.getTime())) {
    return { dateStr: null, error: "Invalid date format. Use YYYY-MM-DD (e.g. 2010-05-15)" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (d >= today) {
    return { dateStr: null, error: "Date of birth must be a past date" };
  }

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return { dateStr: `${year}-${month}-${day}` };
}

function getField(row: Record<string, any>, possibleKeys: string[]): any {
  for (const key of Object.keys(row)) {
    const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    for (const p of possibleKeys) {
      if (normalizedKey === p.toLowerCase().replace(/[^a-z0-9]/g, "")) {
        return row[key];
      }
    }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["ADMIN", "PRINCIPAL", "TEACHER"].includes(auth.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let rawData: any[] = [];
    let skipInvalid = false;
    let validateOnly = false;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      skipInvalid = formData.get("skipInvalid") === "true";
      validateOnly = formData.get("validateOnly") === "true";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return NextResponse.json({ error: "Excel sheet is empty" }, { status: 400 });
      }
      const sheet = workbook.Sheets[firstSheetName];
      rawData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    } else {
      const body = await req.json();
      rawData = body.students || body.data || [];
      skipInvalid = Boolean(body.skipInvalid);
      validateOnly = Boolean(body.validateOnly);
    }

    if (!Array.isArray(rawData) || rawData.length === 0) {
      return NextResponse.json(
        { error: "No student records found in file / request" },
        { status: 400 }
      );
    }

    let teacherClasses: any[] = [];
    if (auth.role === "TEACHER") {
      teacherClasses = getTeacherClasses(auth.userId);
    }

    const db = readDB();
    const parsedRows: BulkStudentRow[] = [];
    const seenBatchEmails = new Set<string>();

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNumber = i + 2; // Row 1 is header, data starts at 2
      const errors: string[] = [];

      const firstName = String(
        getField(row, ["firstname", "first_name", "first name", "name", "student name", "studentname"]) || ""
      ).trim();
      const lastName = String(
        getField(row, ["lastname", "last_name", "last name", "surname"]) || ""
      ).trim();
      const rollNumberRaw = getField(row, ["rollnumber", "roll_number", "roll number", "rollno", "roll_no", "roll no"]);
      const rollNumber = rollNumberRaw !== undefined && rollNumberRaw !== null ? String(rollNumberRaw).trim() : "";
      const email = String(
        getField(row, ["email", "studentemail", "student_email", "student email"]) || ""
      ).trim();
      const rawPhone = getField(row, ["phone", "phonenumber", "phone_number", "phone number", "mobile", "contact"]);
      const phone = cleanPhoneNumber(rawPhone);
      const genderRaw = String(getField(row, ["gender", "sex"]) || "").trim().toUpperCase();
      const dobRaw = getField(row, ["dateofbirth", "date_of_birth", "date of birth", "dob", "birthdate", "birth date"]);
      const rawClassName = String(
        getField(row, ["class", "classname", "class_name", "grade", "standard"]) || ""
      ).trim();
      const sectionRaw = String(
        getField(row, ["section", "sec", "division"]) || "A"
      ).trim();
      const section = sectionRaw.toUpperCase() || "A";
      const parentName = String(
        getField(row, [
          "parentname",
          "parent_name",
          "parent name",
          "fathername",
          "father name",
          "mothername",
          "mother name",
          "guardianname",
          "guardian name",
        ]) || ""
      ).trim();
      const parentEmail = String(
        getField(row, [
          "parentemail",
          "parent_email",
          "parent email",
          "fatheremail",
          "father email",
          "motheremail",
          "guardianemail",
        ]) || ""
      ).trim();
      const rawParentPhone = getField(row, [
        "parentphone",
        "parent_phone",
        "parent phone",
        "fatherphone",
        "father phone",
        "motherphone",
      ]);
      const parentPhone = cleanPhoneNumber(rawParentPhone) || phone;

      // Check required fields
      if (!firstName) {
        errors.push("First Name is required");
      }

      if (rollNumber && !/^\d+$/.test(rollNumber)) {
        errors.push("Roll number must contain numbers only");
      }

      let gender = genderRaw;
      if (!["MALE", "FEMALE", "OTHER"].includes(gender)) {
        if (gender === "M" || gender === "BOY") gender = "MALE";
        else if (gender === "F" || gender === "GIRL") gender = "FEMALE";
        else if (gender === "O") gender = "OTHER";
        else if (!gender) errors.push("Gender is required (MALE, FEMALE, or OTHER)");
        else errors.push(`Invalid gender '${gender}'. Must be MALE, FEMALE, or OTHER`);
      }

      const dobResult = normalizeDate(dobRaw);
      if (dobResult.error) {
        errors.push(dobResult.error);
      }
      const dateOfBirth = dobResult.dateStr || "";

      if (!rawClassName) {
        errors.push("Class is required");
      }

      // Check matching class in school
      const matchingClass = db.classes.find(
        (c) =>
          c.schoolId === auth.schoolId &&
          c.isActive &&
          (c.name.toLowerCase() === rawClassName.toLowerCase() ||
            c.name.toLowerCase() === `class ${rawClassName.toLowerCase()}` ||
            rawClassName.toLowerCase() === `class ${c.name.toLowerCase()}`) &&
          c.section.toLowerCase() === section.toLowerCase()
      );
      const className = matchingClass ? matchingClass.name : rawClassName;

      if (!parentName) {
        errors.push("Parent Name is required");
      }

      if (!parentEmail) {
        errors.push("Parent Email is required");
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
        errors.push("Parent Email format is invalid");
      }

      if (email) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push("Student Email format is invalid");
        } else if (normalizeEmail(email) === normalizeEmail(parentEmail)) {
          errors.push("Student email and Parent email cannot be the same");
        } else if (seenBatchEmails.has(normalizeEmail(email))) {
          errors.push(`Duplicate student email '${email}' in this file`);
        } else {
          seenBatchEmails.add(normalizeEmail(email));
        }

        // Check if student email already in DB
        const dupStudentEmail = db.users.find(
          (u: any) =>
            u.schoolId === auth.schoolId &&
            u.role === "STUDENT" &&
            u.isActive &&
            !u.email?.includes("@student.local") &&
            normalizeEmail(u.email) === normalizeEmail(email)
        );
        if (dupStudentEmail) {
          errors.push(`Student with email '${email}' already exists in this school`);
        }
      }

      // Teacher class authorization check
      if (auth.role === "TEACHER") {
        const isClassTeacher = teacherClasses.some(
          (c: any) =>
            c.role === "CLASS_TEACHER" &&
            (c.className?.toLowerCase() === rawClassName.toLowerCase() ||
              c.className?.toLowerCase() === `class ${rawClassName.toLowerCase()}` ||
              rawClassName.toLowerCase() === `class ${c.className?.toLowerCase()}`) &&
            (!c.section || !section || c.section?.toLowerCase() === section.toLowerCase())
        );
        if (!isClassTeacher) {
          errors.push(
            `You are not assigned as Class Teacher for ${rawClassName}${section ? ` - Sec ${section}` : ""}`
          );
        }
      }

      // Check duplicate student (same name, email, dateOfBirth) in DB
      if (firstName && dateOfBirth) {
        const dup = findDuplicateUser({
          schoolId: auth.schoolId,
          role: "STUDENT",
          firstName,
          lastName,
          email: email || undefined,
          dateOfBirth,
        });
        if (dup) {
          errors.push(
            `Student already exists in school (${dup.firstName} ${dup.lastName || ""}, DOB: ${dup.dateOfBirth})`
          );
        }
      }

      parsedRows.push({
        rowNumber,
        firstName,
        lastName: lastName || undefined,
        rollNumber: rollNumber || undefined,
        email: email || undefined,
        phone: phone || undefined,
        gender: gender || "MALE",
        dateOfBirth,
        className,
        section,
        parentName,
        parentEmail,
        isValid: errors.length === 0,
        errors,
      });
    }

    const validRows = parsedRows.filter((r) => r.isValid);
    const invalidRows = parsedRows.filter((r) => !r.isValid);

    // If validation only mode requested
    if (validateOnly) {
      return NextResponse.json({
        valid: invalidRows.length === 0,
        totalCount: parsedRows.length,
        validCount: validRows.length,
        invalidCount: invalidRows.length,
        rows: parsedRows,
        invalidRows,
      });
    }

    // If there are errors and skipInvalid is false, return validation error
    if (invalidRows.length > 0 && !skipInvalid) {
      return NextResponse.json(
        {
          error: `Validation failed for ${invalidRows.length} row(s). Please review and fix or choose to skip invalid rows.`,
          totalCount: parsedRows.length,
          validCount: validRows.length,
          invalidCount: invalidRows.length,
          rows: parsedRows,
          invalidRows,
        },
        { status: 400 }
      );
    }

    if (validRows.length === 0) {
      return NextResponse.json(
        { error: "No valid student rows to upload" },
        { status: 400 }
      );
    }

    // Proceed to create valid students
    const createdResults: any[] = [];
    const executionErrors: { rowNumber: number; name: string; error: string }[] = [];

    for (const row of validRows) {
      try {
        const result = createStudent({
          schoolId: auth.schoolId,
          schoolCode: auth.schoolCode,
          firstName: row.firstName,
          lastName: row.lastName,
          email: row.email,
          phone: row.phone,
          gender: row.gender,
          dateOfBirth: row.dateOfBirth || "2000-01-01",
          className: row.className,
          section: row.section,
          rollNumber: row.rollNumber,
          rollNo: row.rollNumber,
          parentName: row.parentName,
          parentEmail: row.parentEmail,
          parentPhone: row.phone,
          createdById: auth.userId,
        });

        // Send parent credentials email immediately
        if (row.parentEmail) {
          try {
            await sendEmail({
              to: row.parentEmail,
              subject: `My School — Student & Parent Credentials (${(auth as any).schoolName || auth.schoolCode})`,
              html: studentAndParentCredentialsEmailHtml({
                studentName: `${row.firstName} ${row.lastName || ""}`.trim(),
                parentName: row.parentName || "Parent",
                schoolName: (auth as any).schoolName || "My School",
                schoolCode: auth.schoolCode,
                studentUsername: result.credentials.student.username,
                studentPassword: result.credentials.student.password,
                parentUsername: result.credentials.parent.username,
                parentPassword: result.credentials.parent.password,
                className: row.className,
                section: row.section,
              }),
              text: `School Code: ${auth.schoolCode}\nStudent: ${result.credentials.student.username} / ${result.credentials.student.password}\nParent: ${result.credentials.parent.username} / ${result.credentials.parent.password}`,
            });
          } catch (mailErr) {
            console.error(`[bulk mail err row ${row.rowNumber}]`, mailErr);
          }
        }

        // Send student direct email if custom email was provided
        if (row.email && !row.email.includes("@student.local")) {
          try {
            await sendEmail({
              to: row.email,
              subject: `My School — Student Portal Credentials (${(auth as any).schoolName || auth.schoolCode})`,
              html: credentialsEmailHtml({
                role: "STUDENT",
                schoolCode: auth.schoolCode,
                username: result.credentials.student.username,
                password: result.credentials.student.password,
                schoolName: (auth as any).schoolName,
                recipientName: `${row.firstName} ${row.lastName || ""}`.trim(),
                className: row.className,
                section: row.section,
              }),
              text: `Role: Student\nSchool: ${auth.schoolCode}\nUsername: ${result.credentials.student.username}\nPassword: ${result.credentials.student.password}`,
            });
          } catch (stMailErr) {
            console.error(`[bulk student mail err row ${row.rowNumber}]`, stMailErr);
          }
        }

        createdResults.push({
          rowNumber: row.rowNumber,
          studentId: result.student.id,
          studentName: `${row.firstName} ${row.lastName || ""}`.trim(),
          className: row.className,
          section: row.section,
          rollNumber: row.rollNumber,
          phone: row.phone,
          credentials: result.credentials,
        });
      } catch (err: any) {
        executionErrors.push({
          rowNumber: row.rowNumber,
          name: `${row.firstName} ${row.lastName || ""}`.trim(),
          error: err.message || "Failed to create student",
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully uploaded ${createdResults.length} student(s) and dispatched credential emails to parents.`,
      totalUploaded: createdResults.length,
      totalSkipped: invalidRows.length + executionErrors.length,
      created: createdResults,
      skippedErrors: [
        ...invalidRows.map((r) => ({
          rowNumber: r.rowNumber,
          name: `${r.firstName} ${r.lastName || ""}`.trim(),
          errors: r.errors,
        })),
        ...executionErrors.map((e) => ({
          rowNumber: e.rowNumber,
          name: e.name,
          errors: [e.error],
        })),
      ],
    });
  } catch (error: any) {
    console.error("[bulk student upload]", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
