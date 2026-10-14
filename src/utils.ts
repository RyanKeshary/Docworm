import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel } from 'docx';
import type { Proposal, Task } from './types';

export const FILE_HEADER = 'Docworm, SLRTCE, Digital Permission and Task System';

// No em dashes anywhere. Use commas, colons, or hyphens only.

export function budgetTotals(p: Proposal) {
  const total = p.budgetItems.reduce((s, r) => s + r.quantity * r.unitCost, 0);
  return { total, closing: p.openingBalance - total };
}

export function proposalRef(cellOrDept: string, category: string, count: number): string {
  const cat = category.replace(/[^A-Za-z]/g, '').slice(0, 12) || 'General';
  return `SLRTCE/${cellOrDept}/${cat}/2026-${String(count).padStart(3, '0')}`;
}

export function isOverdue(dueDate: string, status: string): boolean {
  if (status === 'Completed' || status === 'Cancelled') return false;
  const today = new Date().toISOString().slice(0, 10);
  return dueDate < today;
}

export function computedTaskStatus(dueDate: string, status: string): string {
  if (status === 'Completed' || status === 'Cancelled') return status;
  return isOverdue(dueDate, status) ? 'Overdue' : status;
}

export function detectClashes(proposals: Proposal[]): string[] {
  const msgs: string[] = [];
  const slots: { room: string; date: string; s: string; e: string; ref: string }[] = [];
  for (const p of proposals) {
    if (p.status === 'Rejected' || p.status === 'Withdrawn' || p.status === 'Draft') continue;
    for (const r of p.resources) {
      if (!r.roomNo) continue;
      slots.push({ room: r.roomNo, date: r.date, s: r.startTime, e: r.endTime, ref: p.refNo });
    }
  }
  for (let i = 0; i < slots.length; i++) {
    for (let j = i + 1; j < slots.length; j++) {
      const a = slots[i]; const b = slots[j];
      if (a.room === b.room && a.date === b.date && a.s < b.e && b.s < a.e) {
        msgs.push(`Clash: ${a.room} on ${a.date} between ${a.ref} and ${b.ref}`);
      }
    }
  }
  return [...new Set(msgs)];
}

// ---------- Letter generation ----------

export function letterPlainText(p: Proposal, college: { collegeName: string; address: string }): string {
  const lines: string[] = [];
  lines.push(college.collegeName);
  lines.push(college.address);
  lines.push('');
  lines.push(`Ref: ${p.refNo}`);
  lines.push(`Academic Year: ${p.academicYear}`);
  lines.push(`Date: ${p.dateOfRequest}`);
  lines.push('');
  lines.push('To,');
  lines.push('The Principal,');
  lines.push(college.collegeName + ',');
  lines.push('Mira Road (East).');
  lines.push('');
  lines.push(`Subject: Permission to organise ${p.eventName} on ${p.startDate}${p.endDate !== p.startDate ? ' to ' + p.endDate : ''}.`);
  lines.push('');
  lines.push('Respected Sir,');
  lines.push('');
  lines.push(`With reference to the subject cited above, the ${p.organizingBody} in association with ${p.departments.join(', ')} proposes to organise ${p.eventName} (${p.eventCategory}) on ${p.startDate}${p.endDate !== p.startDate ? ' to ' + p.endDate : ''} from ${p.startTime} to ${p.endTime} for ${p.audience.join(', ')}. Target classes: ${p.years.join(', ')}. Expected participants: ${p.participants}.`);
  lines.push('');
  lines.push(`Purpose and justification: ${p.purpose}`);
  lines.push('');
  if (p.resources.length) {
    lines.push('Resources requested:');
    p.resources.forEach((r, i) => {
      lines.push(`${i + 1}. ${r.resourceType} ${r.roomNo} (${r.ownerDept}) on ${r.date}, ${r.startTime} to ${r.endTime}.`);
    });
    lines.push('');
  }
  if (p.hasBudget) {
    const { total, closing } = budgetTotals(p);
    lines.push(`Budget head: ${p.budgetHead}. Opening balance: Rs. ${p.openingBalance}. Total expenses: Rs. ${total}. Closing balance: Rs. ${closing}.`);
    lines.push('');
  }
  lines.push('We assure you that the event will be conducted in a disciplined manner without disturbing regular academics, and a completion report with photos and expenditure will be submitted after the event.');
  lines.push('');
  lines.push('We kindly request you to grant permission for the same and oblige.');
  lines.push('');
  lines.push('Thanking you,');
  lines.push('Yours faithfully,');
  lines.push('');
  const chain = p.approvalChain.map((s) => `${s.role}: ${s.userName}`).join(' | ');
  lines.push(chain);
  lines.push('');
  lines.push('Generated via Docworm, SLRTCE Digital Permission and Task System.');
  return lines.join('\n');
}

// ---------- Exports ----------

export function exportCSV(filename: string, rows: Record<string, unknown>[], columns: string[]) {
  const header = columns.join(',');
  const body = rows.map((r) => columns.map((c) => {
    const v = String(r[c] ?? '');
    return `"${v.replace(/"/g, '""')}"`;
  }).join(',')).join('\n');
  const withHeader = `# ${FILE_HEADER}\n${header}\n${body}`;
  saveAs(new Blob([withHeader], { type: 'text/csv;charset=utf-8' }), filename);
}

export function exportXLSX(filename: string, rows: Record<string, unknown>[], columns: string[]) {
  const data = [[`Docworm export, ${new Date().toISOString().slice(0, 10)}`], columns, ...rows.map((r) => columns.map((c) => r[c] ?? ''))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Docworm');
  XLSX.writeFile(wb, filename);
}

export function exportPDF(filename: string, title: string, columns: string[], rows: Record<string, unknown>[]) {
  const doc = new jsPDF();
  doc.setFontSize(11);
  doc.setTextColor(109, 74, 255);
  doc.text('Docworm', 14, 14);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(13);
  doc.text(title, 14, 22);
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text(`SLRTCE, exported ${new Date().toLocaleString()}`, 14, 28);
  autoTable(doc, {
    startY: 32,
    head: [columns],
    body: rows.map((r) => columns.map((c) => String(r[c] ?? ''))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [109, 74, 255] },
  });
  doc.save(filename);
}

export function exportLetterPDF(p: Proposal, college: { collegeName: string; address: string; phone: string; email: string }) {
  const doc = new jsPDF();
  doc.setFontSize(10);
  doc.setTextColor(109, 74, 255);
  doc.text('Docworm', 14, 12);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(14);
  doc.text(college.collegeName, 14, 20);
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 90);
  doc.text(college.address, 14, 26);
  doc.text(`${college.phone} | ${college.email}`, 14, 31);
  doc.setDrawColor(109, 74, 255);
  doc.line(14, 34, 196, 34);
  doc.setTextColor(30, 41, 59);
  doc.setFontSize(10);
  doc.text(`Ref: ${p.refNo}`, 14, 41);
  doc.text(`Academic Year: ${p.academicYear}`, 14, 47);
  doc.text(`Date: ${p.dateOfRequest}`, 14, 53);
  doc.text('To,', 14, 62);
  doc.text('The Principal,', 14, 68);
  doc.text(`${college.collegeName}, Mira Road (East).`, 14, 74);
  doc.setFont('helvetica', 'bold');
  doc.text(`Subject: Permission to organise ${p.eventName}.`, 14, 84, { maxWidth: 182 });
  doc.setFont('helvetica', 'normal');
  const body = doc.splitTextToSize(
    `Respected Sir, With reference to the subject cited above, the ${p.organizingBody} in association with ${p.departments.join(', ')} proposes to organise ${p.eventName} (${p.eventCategory}) on ${p.startDate}${p.endDate !== p.startDate ? ' to ' + p.endDate : ''} from ${p.startTime} to ${p.endTime}. Purpose: ${p.purpose} We assure disciplined conduct without disturbing academics, and we will submit a completion report after the event. We kindly request permission for the same. Thanking you, Yours faithfully.`,
    182,
  );
  doc.text(body, 14, 94);
  let y = 94 + body.length * 5 + 8;
  doc.text(`Date and time: ${p.startDate} to ${p.endDate}, ${p.startTime} to ${p.endTime}. Participants: ${p.participants}.`, 14, y);
  y += 10;
  autoTable(doc, {
    startY: y,
    head: [['Coordinator', 'HOD', 'Dean / Principal']],
    body: [[p.submitterName, p.approvalChain.find((s) => s.role === 'HOD')?.userName ?? '', p.approvalChain.find((s) => s.role === 'Principal')?.userName ?? 'Principal']],
    headStyles: { fillColor: [109, 74, 255], fontSize: 9 },
    styles: { fontSize: 9 },
  });
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 130);
  doc.text('Generated via Docworm, SLRTCE Digital Permission and Task System.', 14, 282);
  doc.save(`${p.refNo.replace(/\//g, '-')}.pdf`);
}

export async function exportLetterDOCX(p: Proposal, college: { collegeName: string; address: string; phone: string; email: string }) {
  const heading = (t: string) => new Paragraph({ children: [new TextRun({ text: t, bold: true, size: 26 })] });
  const para = (t: string, bold = false) => new Paragraph({ children: [new TextRun({ text: t, bold, size: 22 })], spacing: { after: 160 } });
  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ children: [new TextRun({ text: 'Docworm', color: '3975B7', bold: true, size: 20 })] }),
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: college.collegeName, size: 32 })] }),
        para(college.address),
        para(`${college.phone} | ${college.email}`),
        heading(`Ref: ${p.refNo}`),
        para(`Academic Year: ${p.academicYear} | Date: ${p.dateOfRequest}`),
        para('To, The Principal, ' + college.collegeName + ', Mira Road (East).'),
        para(`Subject: Permission to organise ${p.eventName} on ${p.startDate}.`, true),
        para('Respected Sir,'),
        para(`With reference to the subject cited above, the ${p.organizingBody} in association with ${p.departments.join(', ')} proposes to organise ${p.eventName} (${p.eventCategory}) on ${p.startDate} from ${p.startTime} to ${p.endTime}. Purpose: ${p.purpose}`),
        para('We assure disciplined conduct without disturbing academics, and we will submit a completion report after the event. We kindly request permission for the same. Thanking you, Yours faithfully.'),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: ['Coordinator', 'HOD', 'Dean / Principal'].map((h) => new TableCell({ children: [para(h, true)] })) }),
            new TableRow({ children: [p.submitterName, p.approvalChain.find((s) => s.role === 'HOD')?.userName ?? '', 'Principal'].map((h) => new TableCell({ children: [para(h)] })) }),
          ],
        }),
        para('Generated via Docworm, SLRTCE Digital Permission and Task System.'),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${p.refNo.replace(/\//g, '-')}.docx`);
}

export function flattenProposal(p: Proposal): Record<string, unknown> {
  const { total, closing } = budgetTotals(p);
  return {
    refNo: p.refNo,
    eventName: p.eventName,
    category: p.eventCategory,
    status: p.status,
    academicYear: p.academicYear,
    dateOfRequest: p.dateOfRequest,
    startDate: p.startDate,
    endDate: p.endDate,
    departments: p.departments.join('; '),
    years: p.years.join('; '),
    participants: p.participants,
    organizingBody: p.organizingBody,
    submitter: p.submitterName,
    budgetHead: p.hasBudget ? p.budgetHead : '',
    totalExpenses: p.hasBudget ? total : '',
    closingBalance: p.hasBudget ? closing : '',
    resources: p.resources.map((r) => `${r.resourceType} ${r.roomNo} ${r.date}`).join('; '),
    updatedAt: p.updatedAt,
  };
}

export function flattenTask(t: Task, userName: (id: string) => string): Record<string, unknown> {
  return {
    id: t.id,
    title: t.title,
    type: t.taskType,
    priority: t.priority,
    status: t.status,
    assignedBy: t.assignedByName,
    assignedTo: t.assignedTo.map(userName).join('; '),
    assignedDate: t.assignedDate,
    dueDate: t.dueDate,
    completionDate: t.completionDate ?? '',
  };
}

export const REPORT_COLS = [
  'refNo', 'eventName', 'done', 'actualDate', 'actualParticipants',
  'plannedExpenditure', 'actualExpenditure', 'outcome', 'posAchieved',
  'reasonIfNotDone', 'submittedAt', 'submittedBy',
];

export function flattenReport(
  p: Proposal, r: import('./types').CompletionReport,
): Record<string, unknown> {
  const { total } = budgetTotals(p);
  return {
    refNo: p.refNo,
    eventName: p.eventName,
    done: r.done ? 'Yes' : 'No',
    actualDate: r.actualDate,
    actualParticipants: r.actualParticipants,
    plannedExpenditure: p.hasBudget ? total : '',
    actualExpenditure: r.actualExpenditure,
    outcome: r.outcome,
    posAchieved: r.posAchieved.join('; '),
    reasonIfNotDone: r.reasonIfNotDone,
    submittedAt: r.submittedAt ?? '',
    submittedBy: r.submittedBy ?? '',
  };
}
