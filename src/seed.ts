import type { Proposal, Task, User, ProposalComment, Notification, AuditLog } from './types';

// Baseline institutional administration accounts.
export const SEED_USERS: User[] = [
  { id: 'u-principal', name: 'Principal Office', designation: 'Principal & Head of Institution', department: 'HAS', email: 'principal@slrtce.in', phone: '+91 22 2812 1234', role: 'Principal', password: 'password123', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-dean', name: 'Dean (Student Welfare)', designation: 'Dean, Student Welfare', department: 'HAS', email: 'dean@slrtce.in', phone: '', role: 'Dean', password: 'password123', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-it', name: 'HOD (Information Technology)', designation: 'Head of Department, IT', department: 'IT', email: 'hod.it@slrtce.in', phone: '', role: 'HOD', password: 'password123', status: 'active', registeredAt: '2026-01-01 09:00' },
];

// Clean workspace: no dummy proposals, tasks, comments, notifications, or audit logs.
export const SEED_PROPOSALS: Proposal[] = [];
export const SEED_TASKS: Task[] = [];
export const SEED_COMMENTS: ProposalComment[] = [];
export const SEED_NOTIFICATIONS: Notification[] = [];
export const SEED_AUDIT: AuditLog[] = [];
