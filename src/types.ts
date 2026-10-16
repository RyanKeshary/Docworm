// Docworm data model types.
// Mirrors suggested schema: Users, Departments, Proposals, ProposalResources,
// BudgetItems, POMappings, ApprovalSteps, Comments, CompletionReports,
// Tasks, TaskUpdates, Notifications, AuditLogs, Settings.

export type Role = 'Principal' | 'Dean' | 'HOD' | 'Faculty';
export type ProposalStatus =
  | 'Draft' | 'Submitted' | 'Under Review' | 'Approved'
  | 'Rejected' | 'Changes Requested' | 'Withdrawn' | 'Completed';

export interface User {
  id: string;
  name: string;
  designation: string;
  department: string | null;
  department_id?: string | null;
  email: string;
  phone: string;
  role: Role;
  photo_url?: string;
  status?: 'active' | 'pending_approval' | 'rejected' | 'terminated';
  must_change_password?: boolean;
  registeredAt?: string;
  password?: string;
}

export interface ResourceRow {
  id: string;
  resourceType: string;
  roomNo: string;
  ownerDept: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  decidedBy?: string;
  decidedAt?: string;
  remark?: string;
}

export interface BudgetItem {
  id: string;
  item: string;
  category: string;
  quantity: number;
  unitCost: number;
}

export interface POMapping {
  po: string;
  explanation: string;
}

export interface ApprovalStep {
  id: string;
  role: string;
  userId: string;
  userName: string;
  action: 'Pending' | 'Approved' | 'Rejected' | 'Changes Requested';
  actedAt?: string;
  remark?: string;
}

export interface ProposalComment {
  id: string;
  proposalId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  size: string;
  kind: string;
  storagePath?: string;
}

export interface CompletionReport {
  proposalId: string;
  done: boolean;
  actualDate: string;
  actualParticipants: string;
  actualExpenditure: string;
  outcome: string;
  photos: string[];
  posAchieved: string[];
  reasonIfNotDone: string;
  submittedAt?: string;
  submittedBy?: string;
}

export interface Proposal {
  id: string;
  refNo: string;
  academicYear: string;
  dateOfRequest: string;
  eventName: string;
  eventCategory: string;
  organizingBody: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  purpose: string;
  audience: string[];
  departments: string[];
  years: string[];
  participants: number;
  resources: ResourceRow[];
  hasBudget: boolean;
  budgetHead: string;
  openingBalance: number;
  budgetItems: BudgetItem[];
  budgetJustification: string;
  poMappings: POMapping[];
  attachments: Attachment[];
  submitterId: string;
  submitterName: string;
  submitterDept: string;
  status: ProposalStatus;
  approvalChain: ApprovalStep[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskUpdate {
  id: string;
  text: string;
  userId: string;
  userName: string;
  createdAt: string;
  statusAfter?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  taskType: string;
  priority: string;
  assignedBy: string;
  assignedByName: string;
  assignedTo: string[];
  assignedDate: string;
  dueDate: string;
  completionDate?: string;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'Overdue' | 'Cancelled';
  attachments: Attachment[];
  updates: TaskUpdate[];
  extendReason?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorName: string;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
}

export interface LetterheadSettings {
  collegeName: string;
  address: string;
  phone: string;
  email: string;
}

export type LeaveType =
  | 'Casual Leave'
  | 'Medical Leave'
  | 'On Duty (OD)'
  | 'Earned Leave'
  | 'Compensatory Off';

export type LeaveStatus =
  | 'Pending'
  | 'Recommended'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled';

export interface FacultyLeave {
  id: string;
  ref_no: string;
  faculty_id: string;
  faculty_name: string;
  faculty_email?: string;
  faculty_phone?: string;
  department_id?: string;
  department: string;
  leave_type: LeaveType;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  half_day_session: 'Morning' | 'Afternoon' | 'Full Day';
  reason: string;
  alternate_faculty: string;
  lecture_adjustments: string;
  contact_phone: string;
  attachment_url: string;
  status: LeaveStatus;
  hod_id?: string;
  hod_name?: string;
  hod_remark?: string;
  hod_acted_at?: string;
  principal_id?: string;
  principal_name?: string;
  principal_remark?: string;
  principal_acted_at?: string;
  created_at: string;
  updated_at: string;
}

