// Server-Side Polished Excel (.xlsx) Report Generator
// Generates institutional-grade workbooks using ExcelJS with formulas, styling,
// zebra stripes, auto column widths, and print setup.

import ExcelJS from 'exceljs';
import { sql } from './db';
import type { AuthUser } from './rbac';

const PRIMARY_COLOR = 'FF1E3A8A'; // Deep Navy
const ZEBRA_COLOR = 'FFF8FAFC';   // Soft Slate Tint
const BORDER_COLOR = 'FFE2E8F0';  // Light Gray

export async function generateStaffDirectoryExcel(user: AuthUser): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Docworm Institutional Portal';
  wb.created = new Date();

  const ws = wb.addWorksheet('Staff Directory', {
    pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0, showGridLines: true },
  });

  // 1. Fetch data respecting RBAC
  let rows: any[];
  if (user.role === 'Principal' || user.role === 'Dean') {
    rows = await sql`
      SELECT u.name, u.email, u.role, d.name as department, u.designation, u.phone, u.status, u.created_at
      FROM public.users u
      LEFT JOIN public.departments d ON u.department_id = d.id
      ORDER BY u.role, u.name
    `;
  } else if (user.role === 'HOD') {
    rows = await sql`
      SELECT u.name, u.email, u.role, d.name as department, u.designation, u.phone, u.status, u.created_at
      FROM public.users u
      LEFT JOIN public.departments d ON u.department_id = d.id
      WHERE u.department_id = ${user.department_id}
      ORDER BY u.role, u.name
    `;
  } else {
    rows = await sql`
      SELECT u.name, u.email, u.role, d.name as department, u.designation, u.phone, u.status, u.created_at
      FROM public.users u
      LEFT JOIN public.departments d ON u.department_id = d.id
      WHERE u.id = ${user.id}
    `;
  }

  // 2. Title Block
  ws.mergeCells('A1:G1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'SHREE L.R. TIWARI COLLEGE OF ENGINEERING';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: PRIMARY_COLOR } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 25;

  ws.mergeCells('A2:G2');
  const subCell = ws.getCell('A2');
  subCell.value = `Institutional Staff Directory • Generated: ${new Date().toLocaleDateString('en-IN')} by ${user.name} (${user.role})`;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  // Empty spacer row
  ws.getRow(3).height = 10;

  // 3. Header Row
  const headers = ['Full Name', 'Institutional Email', 'Role', 'Department', 'Designation', 'Phone', 'Account Status'];
  const headerRow = ws.getRow(4);
  headerRow.values = headers;
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    cell.border = {
      top: { style: 'thin', color: { argb: PRIMARY_COLOR } },
      bottom: { style: 'medium', color: { argb: PRIMARY_COLOR } },
    };
  });

  // Freeze top 4 rows
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];

  // 4. Data Rows
  let rowIndex = 5;
  for (const r of rows) {
    const row = ws.getRow(rowIndex);
    row.values = [
      r.name,
      r.email,
      r.role,
      r.department || 'Institutional (Office of Principal)',
      r.designation || 'Staff',
      r.phone || '—',
      r.status.toUpperCase(),
    ];
    row.height = 20;

    const isZebra = rowIndex % 2 === 0;
    row.eachCell((cell) => {
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_COLOR } };
      }
      cell.font = { name: 'Arial', size: 9 };
      cell.border = {
        bottom: { style: 'thin', color: { argb: BORDER_COLOR } },
        right: { style: 'thin', color: { argb: BORDER_COLOR } },
      };
      cell.alignment = { vertical: 'middle' };
    });

    rowIndex++;
  }

  // 5. Auto Column Widths
  ws.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(Math.max(maxLen + 4, 14), 45);
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function generatePermissionRequestsExcel(user: AuthUser): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Docworm Institutional Portal';
  wb.created = new Date();

  const ws = wb.addWorksheet('Permission Requests', {
    pageSetup: { orientation: 'landscape', fitToWidth: 1, fitToHeight: 0, showGridLines: true },
  });

  let rows: any[];
  if (user.role === 'Principal' || user.role === 'Dean') {
    rows = await sql`
      SELECT ref_no, academic_year, event_name, event_category, start_date, end_date,
             submitter_name, submitter_dept, opening_balance, participants, status
      FROM public.permission_requests
      ORDER BY date_of_request DESC
    `;
  } else if (user.role === 'HOD') {
    rows = await sql`
      SELECT ref_no, academic_year, event_name, event_category, start_date, end_date,
             submitter_name, submitter_dept, opening_balance, participants, status
      FROM public.permission_requests
      WHERE submitter_dept = ${user.department_code || ''}
      ORDER BY date_of_request DESC
    `;
  } else {
    rows = await sql`
      SELECT ref_no, academic_year, event_name, event_category, start_date, end_date,
             submitter_name, submitter_dept, opening_balance, participants, status
      FROM public.permission_requests
      WHERE faculty_id = ${user.id}
      ORDER BY date_of_request DESC
    `;
  }

  // Title Block
  ws.mergeCells('A1:J1');
  const titleCell = ws.getCell('A1');
  titleCell.value = 'SHREE L.R. TIWARI COLLEGE OF ENGINEERING';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: PRIMARY_COLOR } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 25;

  ws.mergeCells('A2:J2');
  const subCell = ws.getCell('A2');
  subCell.value = `Official Event Permission Requests Report • ${new Date().toLocaleDateString('en-IN')}`;
  subCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
  subCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 18;

  // Header
  const headers = ['Ref No', 'Year', 'Event Name', 'Category', 'Start Date', 'End Date', 'Coordinator', 'Dept', 'Budget (₹)', 'Status'];
  const headerRow = ws.getRow(4);
  headerRow.values = headers;
  headerRow.height = 24;

  headerRow.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIMARY_COLOR } };
    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left' };
  });

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4 }];

  let startDataRow = 5;
  let rowIndex = 5;

  for (const r of rows) {
    const row = ws.getRow(rowIndex);
    row.values = [
      r.ref_no,
      r.academic_year,
      r.event_name,
      r.event_category,
      String(r.start_date).slice(0, 10),
      String(r.end_date).slice(0, 10),
      r.submitter_name,
      r.submitter_dept,
      Number(r.opening_balance || 0),
      r.status,
    ];
    row.height = 20;

    const isZebra = rowIndex % 2 === 0;
    row.eachCell((cell, colNumber) => {
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA_COLOR } };
      }
      cell.font = { name: 'Arial', size: 9 };
      cell.border = { bottom: { style: 'thin', color: { argb: BORDER_COLOR } } };
      cell.alignment = { vertical: 'middle' };

      // Number formatting for budget column (Column 9 / 'I')
      if (colNumber === 9) {
        cell.numFmt = '₹#,##0.00';
        cell.alignment = { vertical: 'middle', horizontal: 'right' };
      }
    });

    rowIndex++;
  }

  // Summary / Totals Row with formula
  if (rows.length > 0) {
    const summaryRow = ws.getRow(rowIndex);
    summaryRow.values = [
      'TOTAL INSTITUTIONAL SANCTIONED / REQUESTED',
      '', '', '', '', '', '', '',
      { formula: `SUM(I${startDataRow}:I${rowIndex - 1})` },
      `${rows.length} Events`,
    ];
    summaryRow.height = 24;
    summaryRow.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: PRIMARY_COLOR } };
      cell.border = { top: { style: 'thin' }, bottom: { style: 'double' } };
      if (colNumber === 9) {
        cell.numFmt = '₹#,##0.00';
        cell.alignment = { horizontal: 'right' };
      }
    });
  }

  ws.columns.forEach((col) => {
    let maxLen = 12;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const len = cell.value ? String(cell.value).length : 0;
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(Math.max(maxLen + 4, 12), 40);
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
