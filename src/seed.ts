import type { Proposal, Task, User, ProposalComment, Notification, AuditLog } from './types';

// Baseline institutional administration accounts.
export const SEED_USERS: User[] = [
  { id: 'u-principal', name: 'Prof. Dr. Umesh S Bhadade', designation: 'Principal & Head of Institution', department: null, email: 'principal@slrtce.in', phone: '+91 22 2812 1234', role: 'Principal', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-cs', name: 'Dr. Bhushan Nemade', designation: 'Head of Department, CS', department: 'CS', email: 'hod.cs@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-it', name: 'Dr. Vikas Kaul', designation: 'Head of Department, IT', department: 'IT', email: 'hod.it@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-iqac', name: 'Dr. Sheetal Mahadik', designation: 'IQAC Coordinator', department: 'IQAC', email: 'iqac@slrtce.in', phone: '', role: 'Faculty', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-dean-academics', name: 'Dr. Usha Bag', designation: 'I/C Dean Academics', department: null, email: 'usha.bag@slrtce.in', phone: '', role: 'Dean', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-extc', name: 'Mrs. Swapna Patil', designation: 'Head of Department, EXTC', department: 'EXTC', email: 'hod.extc@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-ecs', name: 'Mrs. Samita Bhandari', designation: 'Head of Department, ECS', department: 'ECS', email: 'hod.etrx@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-dhod-it', name: 'Mrs. Rupali Pashte', designation: 'Deputy HOD IT', department: 'IT', email: 'rupali.pashte@slrtce.in', phone: '', role: 'Faculty', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-civil', name: 'Mrs. Prajakta Mukadam', designation: 'Head of Department, Civil', department: 'CIVIL', email: 'hod.civil@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-coe', name: 'Mrs. Zainab Mizwan', designation: 'Controller Of Examination', department: 'EXAM', email: 'zainab.mizwan@slrtce.in', phone: '', role: 'Faculty', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-cyber', name: 'Dr. Pravin Jangid', designation: 'I/C HOD CSE Cyber Security', department: 'CYBER', email: 'pravin.jangid@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-aiml', name: 'Dr. Aabha Patil', designation: 'I/C HOD CSE AIML', department: 'AIML', email: 'aabha.patil@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-ds', name: 'Dr. Madhuri Gedam', designation: 'I/C HOD CSE Data Science', department: 'AIDS', email: 'madhuri.gedam@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-mca', name: 'Mr. Rajesh Gaikwad', designation: 'I/C HOD MCA', department: 'MCA', email: 'rajesh.gaikwad@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-mech', name: 'Dr. Abhijit Samanta', designation: 'Head of Department, Mechanical', department: 'MECH', email: 'hod.mech@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-dhod-cmpn', name: 'Dr. Archana Belge', designation: 'Deputy HOD Computer Eng', department: 'CMPN', email: 'archana.belge@slrtce.in', phone: '', role: 'Faculty', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-dean-swdc', name: 'Mr. Saumya Philip', designation: 'Dean SWDC', department: null, email: 'saumya.philip@slrtce.in', phone: '', role: 'Dean', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-fe', name: 'Dr. Lahu Teli', designation: 'Head of Department, HAS', department: 'HAS', email: 'hod.fe@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-hod-aiml-2', name: 'Dr. Uma Goradiya', designation: 'I/C HOD AIML', department: 'AIML', email: 'uma.goradiya@slrtce.in', phone: '', role: 'HOD', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-bvoc', name: 'Dr. Sweta Padman', designation: 'Coordinator B.Voc', department: 'B.VOC', email: 'sweta.parkhedkar@slrtce.in', phone: '', role: 'Faculty', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-tpo-dir', name: 'Dr. Sushant Gandhi', designation: 'Director TPO', department: 'TPO', email: 'sushant.gandhi@slrtce.in', phone: '', role: 'Faculty', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
  { id: 'u-tpo-coord', name: 'Mrs. Sonali Padalkar', designation: 'Coordinator TPO', department: 'TPO', email: 'sonali.padalkar@slrtce.in', phone: '', role: 'Faculty', password: 'password@67', status: 'active', registeredAt: '2026-01-01 09:00' },
];

// Clean workspace: no dummy proposals, tasks, comments, notifications, or audit logs.
export const SEED_PROPOSALS: Proposal[] = [];
export const SEED_TASKS: Task[] = [];
export const SEED_COMMENTS: ProposalComment[] = [];
export const SEED_NOTIFICATIONS: Notification[] = [];
export const SEED_AUDIT: AuditLog[] = [];
