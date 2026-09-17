import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  try {
    const headers = [
      "First Name",
      "Last Name",
      "Roll Number",
      "Email (Optional)",
      "Phone Number",
      "Gender",
      "Date of Birth",
      "Class",
      "Section",
      "Parent Name",
      "Parent Email",
    ];

    const sampleRows = [
      [
        "Aarav",
        "Sharma",
        "101",
        "",
        "+91 9876543210",
        "MALE",
        "2010-05-15",
        "10",
        "A",
        "Rajesh Sharma",
        "rajesh.sharma@example.com",
      ],
      [
        "Diya",
        "Patel",
        "102",
        "",
        "+91 9876543211",
        "FEMALE",
        "2010-08-22",
        "10",
        "A",
        "Suresh Patel",
        "suresh.patel@example.com",
      ],
      [
        "Rohan",
        "Verma",
        "103",
        "",
        "+91 9876543212",
        "MALE",
        "2011-01-10",
        "9",
        "B",
        "Vikram Verma",
        "vikram.verma@example.com",
      ],
    ];

    const data = [headers, ...sampleRows];
    const worksheet = XLSX.utils.aoa_to_sheet(data, { cellDates: false });

    // Explicitly set all data cells to String format so Excel doesn't misinterpret '+' as formula
    const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1:K4");
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = XLSX.utils.encode_cell({ c: C, r: R });
        if (worksheet[cell_address]) {
          worksheet[cell_address].t = "s"; // string type
          worksheet[cell_address].z = "@"; // text format
        }
      }
    }

    // Set column widths
    worksheet["!cols"] = [
      { wch: 16 }, // First Name
      { wch: 16 }, // Last Name
      { wch: 14 }, // Roll Number
      { wch: 28 }, // Email
      { wch: 20 }, // Phone Number
      { wch: 12 }, // Gender
      { wch: 16 }, // Date of Birth (YYYY-MM-DD)
      { wch: 14 }, // Class
      { wch: 10 }, // Section
      { wch: 22 }, // Parent Name
      { wch: 28 }, // Parent Email
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students_Template");

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition":
          'attachment; filename="student_bulk_upload_demo.xlsx"',
      },
    });
  } catch (error: any) {
    console.error("[bulk-template]", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate template" },
      { status: 500 }
    );
  }
}
