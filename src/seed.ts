import type { Proposal, Task, User, ProposalComment, Notification, AuditLog } from './types';

// Baseline institutional accounts for initial login and testing.
export const SEED_USERS: User[] = [
  { id: 'u-principal', name: 'Principal Office', designation: 'Principal & Head of Institution', department: 'HAS', email: 'principal@slrtce.in', phone: '', role: 'Principal', password: 'password123' },
  { id: 'u-dean', name: 'Dean (Student Welfare)', designation: 'Dean, SWDC', department: 'HAS', email: 'dean@slrtce.in', phone: '', role: 'Dean', password: 'password123' },
  { id: 'u-hod-it', name: 'HOD (Information Technology)', designation: 'Head of Department, IT', department: 'IT', email: 'hod.it@slrtce.in', phone: '', role: 'HOD', password: 'password123' },
  { id: 'u-fac-1', name: 'Faculty Coordinator', designation: 'Assistant Professor', department: 'IT', email: 'faculty@slrtce.in', phone: '', role: 'Faculty', password: 'password123' },
];

// Clean workspace: no dummy proposals, tasks, comments, notifications, or audit logs.
export const SEED_PROPOSALS: Proposal[] = [];
export const SEED_TASKS: Task[] = [];
export const SEED_COMMENTS: ProposalComment[] = [];
export const SEED_NOTIFICATIONS: Notification[] = [];
export const SEED_AUDIT: AuditLog[] = [];
