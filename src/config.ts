// Docworm central config. Admin editable from Settings page, persisted to localStorage.
// All categorical inputs are dropdowns sourced from here. No free text categories.

export const THEME = {
  primary: '#6D4AFF',
  primaryDark: '#5B3FD1',
  primaryLight: '#EFEBFF',
  primaryPale: '#F6F3FF',
};

export interface AppOptions {
  departments: string[];
  years: string[];
  roles: string[];
  proposalStatuses: string[];
  eventCategories: string[];
  organizingBodies: string[];
  audiences: string[];
  resourceTypes: string[];
  budgetHeads: string[];
  expenseCategories: string[];
  taskTypes: string[];
  priorities: string[];
  taskStatuses: string[];
  academicYears: string[];
}

export const DEFAULT_OPTIONS: AppOptions = {
  departments: ['IT', 'CMPN', 'EXTC', 'ECS', 'MECH', 'CIVIL', 'HAS'],
  years: ['FY', 'SY', 'TY', 'BE'],
  roles: ['Principal', 'Dean', 'HOD', 'Faculty'],
  proposalStatuses: ['Draft', 'Submitted', 'Under Review', 'Approved', 'Rejected', 'Changes Requested', 'Withdrawn', 'Completed'],
  eventCategories: ['Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar', 'Guest Lecture', 'Industrial Visit', 'Placement', 'Other'],
  organizingBodies: ['Department', 'Student Council', 'SWDC', 'NSS', 'DLLE', 'R&D Cell', 'T&P Cell', 'Other'],
  audiences: ['Students', 'Staff', 'Both', 'External participants', 'Alumni', 'Other'],
  resourceTypes: ['Classroom', 'Lab', 'Auditorium', 'Seminar Hall', 'Ground', 'Equipment'],
  budgetHeads: ['Department Fund', 'Student Welfare Fund', 'IIC Fund', 'Sponsorship', 'College Fund', 'Other'],
  expenseCategories: ['Prizes', 'Refreshments', 'Printing', 'Equipment', 'Travel', 'Honorarium', 'Decor', 'Other'],
  taskTypes: ['Report Submission', 'Event Coordination', 'Accreditation or NAAC or NBA', 'Admission Related', 'Examination Related', 'Infrastructure', 'Meeting', 'Other'],
  priorities: ['Low', 'Medium', 'High', 'Urgent'],
  taskStatuses: ['Not Started', 'In Progress', 'Completed', 'Overdue'],
  academicYears: ['2024-25', '2025-26', '2026-27', '2027-28'],
};

export const PO_LIST: { code: string; name: string }[] = [
  { code: 'PO1', name: 'Engineering knowledge: apply mathematics, science and engineering fundamentals' },
  { code: 'PO2', name: 'Problem analysis: identify, formulate and analyse complex engineering problems' },
  { code: 'PO3', name: 'Design and development: design solutions for complex problems with societal care' },
  { code: 'PO4', name: 'Investigations: use research methods including experiments and synthesis' },
  { code: 'PO5', name: 'Modern tool usage: create, select and apply appropriate techniques and IT tools' },
  { code: 'PO6', name: 'Engineer and society: assess societal, health, safety, legal and cultural issues' },
  { code: 'PO7', name: 'Environment and sustainability: understand impact and need for sustainable development' },
  { code: 'PO8', name: 'Ethics: apply ethical principles and commit to professional responsibilities' },
  { code: 'PO9', name: 'Individual and team work: function effectively as a member or leader of teams' },
  { code: 'PO10', name: 'Communication: communicate effectively on complex activities with community' },
  { code: 'PO11', name: 'Project management: apply management principles to manage projects in teams' },
  { code: 'PO12', name: 'Life-long learning: engage in independent learning in broad technological change' },
];

export const COLLEGE = {
  name: 'Shree L.R. Tiwari College of Engineering',
  short: 'SLRTCE',
  address: 'Shree L.R. Tiwari College of Engineering, Mira Road (East), Thane 401107',
  phone: '+91 22 2812 1234',
  email: 'office@slrtce.in',
};

export function currentAcademicYear(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = m >= 5 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}
