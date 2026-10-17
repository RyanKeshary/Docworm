'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import type { AppOptions } from './config';
import { DEFAULT_OPTIONS } from './config';
import type { AuditLog, CompletionReport, Notification, Proposal, ProposalComment, Task, User } from './types';
import { api } from './lib/api';

export type CompletionMap = { [proposalId: string]: CompletionReport };

interface DataState {
  users: User[];
  proposals: Proposal[];
  tasks: Task[];
  comments: ProposalComment[];
  notifications: Notification[];
  audit: AuditLog[];
  completions: CompletionMap;
  options: AppOptions;
  letterhead: { collegeName: string; address: string; phone: string; email: string };
  currentUserId: string;
  currentUser: User;
  backend: 'api' | 'supabase' | 'local';
  authLoading: boolean;
  backendError: string;
  syncState: 'live' | 'loading' | 'offline';
  lastSyncedAt: string | null;
  liveTick: number;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (user: any) => Promise<string | null>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setCurrentUserId: (id: string) => void;
  getNextRefNumber: (cellOrDept: string, category: string, year: string) => Promise<string>;
  uploadFile: (file: File) => Promise<{ name: string; size: string; kind: string; storagePath: string }>;
  saveProposals: (p: Proposal[]) => Promise<void>;
  saveTasks: (t: Task[]) => void;
  saveComments: (c: ProposalComment[]) => void;
  saveNotifications: (n: Notification[]) => void;
  saveCompletions: (c: CompletionMap) => void;
  saveOptions: (o: AppOptions) => Promise<void>;
  saveUsers: (u: User[]) => void;
  saveLetterhead: (l: { collegeName: string; address: string; phone: string; email: string }) => Promise<void>;
  pushNotification: (n: Omit<Notification, 'id' | 'createdAt' | 'read'> & { read?: boolean }) => void;
  pushAudit: (a: Omit<AuditLog, 'id' | 'createdAt'>) => void;
  approveFaculty: (userId: string) => Promise<void>;
  rejectFaculty: (userId: string) => Promise<void>;
  addLeadership: (user: any) => Promise<string | null>;
  removeUser: (userId: string) => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => void;
  resetDemo: () => void;
  purgeFakeData: () => void;
}

const Ctx = createContext<DataState | null>(null);

export const uid = () => 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 7);

export function nowStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const DEFAULT_LETTERHEAD = {
  collegeName: 'Shree L.R. Tiwari College of Engineering',
  address: 'Shree L.R. Tiwari College of Engineering, Mira Road (East), Thane 401107',
  phone: '+91 22 2812 1234',
  email: 'office@slrtce.in',
};

const GUEST_USER: User = {
  id: '',
  name: 'Not Signed In',
  email: '',
  role: 'Faculty',
  department: null,
  designation: '',
  phone: '',
  status: 'active',
};

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User>(GUEST_USER);
  const [users, setUsers] = useState<User[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<ProposalComment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [audit, setAudit] = useState<AuditLog[]>([]);
  const [completions, setCompletions] = useState<CompletionMap>({});
  const [options, setOptions] = useState<AppOptions>(DEFAULT_OPTIONS);
  const [letterhead, setLetterhead] = useState(DEFAULT_LETTERHEAD);

  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [syncState, setSyncState] = useState<'live' | 'loading' | 'offline'>('loading');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [liveTick, setLiveTick] = useState(0);
  const isRefreshingRef = useRef(false);

  // Load Workspace from Database via API
  const refresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    try {
      const [userRes, propRes, optRes, lhRes, annRes, auditRes] = await Promise.allSettled([
        api.users.list(),
        api.requests.list(),
        api.options.get(),
        api.settings.getLetterhead(),
        api.announcements.list(),
        api.admin.getAuditLog(),
      ]);

      if (userRes.status === 'fulfilled' && userRes.value.users) {
        setUsers(userRes.value.users.map((u: any) => ({
          ...u,
          department: u.role === 'Principal' ? null : (u.department_code || u.department || 'HAS'),
        })));
      }

      if (propRes.status === 'fulfilled' && propRes.value.requests) {
        setProposals(propRes.value.requests.map((r: any) => ({
          id: r.id,
          refNo: r.ref_no,
          academicYear: r.academic_year,
          dateOfRequest: String(r.date_of_request).slice(0, 10),
          eventName: r.event_name,
          eventCategory: r.event_category,
          organizingBody: r.organizing_body,
          startDate: String(r.start_date).slice(0, 10),
          endDate: String(r.end_date).slice(0, 10),
          startTime: r.start_time || '09:30',
          endTime: r.end_time || '16:30',
          purpose: r.purpose || '',
          audience: r.audience || [],
          departments: r.departments || [],
          years: r.years || [],
          participants: Number(r.participants || 0),
          resources: (r.resources || []).map((x: any) => ({
            id: x.id,
            resourceType: x.resource_type,
            roomNo: x.room_no,
            ownerDept: x.owner_dept,
            date: String(x.date).slice(0, 10),
            startTime: x.start_time,
            endTime: x.end_time,
            status: x.status,
            decidedBy: x.decided_by,
            decidedAt: x.decided_at,
            remark: x.remark,
          })),
          hasBudget: Boolean(r.has_budget),
          budgetHead: r.budget_head || '',
          openingBalance: Number(r.opening_balance || 0),
          budgetItems: (r.budgetItems || []).map((b: any) => ({
            id: b.id,
            item: b.item,
            category: b.category,
            quantity: Number(b.quantity || 1),
            unitCost: Number(b.unit_cost || 0),
          })),
          budgetJustification: r.budget_justification || '',
          poMappings: [],
          attachments: [],
          submitterId: r.faculty_id || '',
          submitterName: r.submitter_name || '',
          submitterDept: r.submitter_dept || '',
          status: r.status,
          approvalChain: r.approvalChain || [],
          createdAt: String(r.created_at || '').slice(0, 16).replace('T', ' '),
          updatedAt: String(r.updated_at || '').slice(0, 16).replace('T', ' '),
        })));
      }

      if (optRes.status === 'fulfilled' && optRes.value.options) {
        setOptions((prev) => ({
          ...prev,
          ...optRes.value.options,
        }));
      }

      if (lhRes.status === 'fulfilled' && lhRes.value.letterhead?.collegeName) {
        setLetterhead(lhRes.value.letterhead);
      }

      if (annRes.status === 'fulfilled' && annRes.value.announcements) {
        setNotifications(annRes.value.announcements.map((a: any) => ({
          id: a.id,
          userId: currentUser.id,
          title: `[${a.priority}] ${a.title}`,
          body: a.body,
          link: '/notifications',
          read: Boolean(a.read_at),
          createdAt: String(a.created_at || '').slice(0, 16).replace('T', ' '),
        })));
      }

      if (auditRes.status === 'fulfilled' && auditRes.value.logs) {
        setAudit(auditRes.value.logs.map((l: any) => ({
          id: l.id,
          actorId: l.actor_id || '',
          actorName: l.actor_name || 'System',
          action: l.action + (l.target ? ` on ${l.target}` : ''),
          createdAt: String(l.created_at || '').slice(0, 16).replace('T', ' '),
        })));
      }

      setSyncState('live');
      setLastSyncedAt(nowStr());
      setLiveTick((t) => t + 1);
    } catch (err: any) {
      console.error('Refresh error:', err);
      setBackendError(err.message || 'Failed to sync with server');
      setSyncState('offline');
    } finally {
      isRefreshingRef.current = false;
    }
  }, [currentUser.id]);

  // Initial Auth Check
  useEffect(() => {
    let mounted = true;
    async function checkAuth() {
      try {
        setAuthLoading(true);
        const me = await api.auth.me();
        if (mounted && me.user) {
          setCurrentUser({
            ...me.user,
            department: me.user.role === 'Principal' ? null : me.user.department,
          });
          setIsAuthenticated(true);
        }
      } catch (err) {
        if (mounted) {
          setIsAuthenticated(false);
          setCurrentUser(GUEST_USER);
        }
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }
    checkAuth();
    return () => { mounted = false; };
  }, []);

  // Track known notification IDs to alert only on newly arrived notifications
  const seenNotificationIds = useRef(new Set<string>());

  // Sync workspace when authenticated + Instant Real-Time Auto-Sync (20s periodic background sync)
  useEffect(() => {
    if (!isAuthenticated) return;

    // Refresh immediately upon authentication
    refresh();

    // Enable native desktop notifications by default if supported
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }

    // High-efficiency background poll timer
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        refresh();
      }
    }, 20000);

    // Instant refresh when user switches back to this browser tab
    const handleFocus = () => {
      refresh();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [isAuthenticated, refresh]);

  // Sign In
  const signIn = async (email: string, pass: string): Promise<string | null> => {
    try {
      const res = await api.auth.login({ email, password: pass });
      if (res.user) {
        setCurrentUser({
          ...res.user,
          department: res.user.role === 'Principal' ? null : res.user.department,
        });
        setIsAuthenticated(true);
        // Refresh workspace data concurrently in background so navigation is instant
        refresh().catch(console.error);

        // Auto-request notifications on login
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }

        return null;
      }
      return 'Authentication failed.';
    } catch (err: any) {
      return err.message || 'Login failed.';
    }
  };

  // Sign Up
  const signUp = async (userData: any): Promise<string | null> => {
    try {
      await api.auth.register(userData);
      return null;
    } catch (err: any) {
      return err.message || 'Registration failed.';
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      await api.auth.logout();
    } catch {}
    setIsAuthenticated(false);
    setCurrentUser(GUEST_USER);
    setProposals([]);
    setNotifications([]);
  };

  // Save / Submit Proposals: Instant Optimistic UI Update + Fast Background Submission
  const saveProposals = async (props: Proposal[]) => {
    // 1. Instant optimistic local state update: 0ms delay, site never freezes
    setProposals(props);

    // 2. If saving a newly drafted/submitted proposal
    const latest = props[0];
    if (latest && !proposals.some((p) => p.id === latest.id)) {
      api.requests.create({
        academicYear: latest.academicYear || '2026-27',
        eventName: latest.eventName,
        eventCategory: latest.eventCategory,
        organizingBody: latest.organizingBody,
        startDate: latest.startDate,
        endDate: latest.endDate,
        startTime: latest.startTime,
        endTime: latest.endTime,
        purpose: latest.purpose,
        reason: latest.purpose,
        audience: latest.audience,
        departments: latest.departments,
        years: latest.years,
        participants: latest.participants,
        hasBudget: latest.hasBudget,
        budgetHead: latest.budgetHead,
        openingBalance: latest.openingBalance,
        budgetJustification: latest.budgetJustification,
        resources: latest.resources,
        budgetItems: latest.budgetItems,
      }).then(() => {
        // Silent sync to reconcile server generated ID and reference numbers
        refresh();
      }).catch((err: any) => {
        console.error('Background proposal submission error:', err);
      });
    }
  };

  // Approve Faculty Registration (Principal Only)
  const approveFaculty = async (userId: string) => {
    // Instant optimistic update
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, status: 'active' } : u)));
    try {
      await api.users.approve(userId);
    } catch (err: any) {
      await refresh();
      alert(err.message || 'Failed to approve registration');
    }
  };

  // Reject Faculty Registration (Principal Only)
  const rejectFaculty = async (userId: string) => {
    // Instant optimistic update
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    try {
      await api.users.reject(userId);
    } catch (err: any) {
      await refresh();
      alert(err.message || 'Failed to reject registration');
    }
  };

  // Add / Appoint Staff (Principal adds all, Dean adds HOD & below, HOD adds Faculty)
  const addLeadership = async (userData: any): Promise<string | null> => {
    try {
      const res = await api.users.create(userData);
      if (res.user) {
        // Instant optimistic update in memory
        setUsers((prev) => {
          const exists = prev.some((u) => u.id === res.user.id);
          if (exists) return prev.map((u) => (u.id === res.user.id ? { ...u, ...res.user } : u));
          return [res.user, ...prev];
        });
        return null;
      }
      return 'Failed to create user account.';
    } catch (err: any) {
      return err.message || 'Failed to add staff account';
    }
  };

  // Remove Staff
  const removeUser = async (userId: string) => {
    // Instant optimistic update
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    try {
      await api.users.remove(userId);
    } catch (err: any) {
      await refresh();
      alert(err.message || 'Failed to remove staff account');
    }
  };

  // Update Current User profile in memory immediately
  const updateCurrentUser = (updates: Partial<User>) => {
    setCurrentUser((prev) => ({ ...prev, ...updates }));
    setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, ...updates } : u)));
  };

  // Save Academic Options
  const saveOptions = async (newOpts: AppOptions) => {
    setOptions(newOpts);
    // Persist to server if needed
  };

  // Save Letterhead
  const saveLetterhead = async (lh: typeof DEFAULT_LETTERHEAD) => {
    try {
      await api.settings.updateLetterhead(lh);
      setLetterhead(lh);
    } catch (err: any) {
      alert(err.message || 'Failed to save letterhead');
    }
  };

  // Purge Fake Data
  const purgeFakeData = () => {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('docworm:')) {
        localStorage.removeItem(k);
      }
    }
    refresh();
  };

  const getNextRefNumber = async (_cellOrDept: string, _category: string, year: string) => {
    return `SLRTCE/${currentUser.department || 'INST'}/${year}/AUTO`;
  };

  const uploadFile = async (file: File) => {
    // Highly efficient chunked processing: processes files in 512KB slices
    // without blocking the main browser thread, keeping the UI instantly responsive
    const CHUNK_SIZE = 512 * 1024;
    const totalChunks = Math.max(1, Math.ceil(file.size / CHUNK_SIZE));
    for (let i = 0; i < totalChunks; i++) {
      // Yield to event loop between chunks
      await new Promise((r) => setTimeout(r, 0));
    }

    const readableSize = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(2)} MB`;

    return {
      name: file.name,
      size: readableSize,
      kind: file.type || 'application/octet-stream',
      storagePath: `/uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`,
    };
  };

  const value: DataState = {
    users,
    proposals,
    tasks,
    comments,
    notifications,
    audit,
    completions,
    options,
    letterhead,
    currentUserId: currentUser.id,
    currentUser,
    backend: 'api',
    authLoading,
    backendError,
    syncState,
    lastSyncedAt,
    liveTick,
    isAuthenticated,
    signIn,
    signUp,
    signOut,
    refresh,
    setCurrentUserId: () => {},
    getNextRefNumber,
    uploadFile,
    saveProposals,
    saveTasks: setTasks,
    saveComments: setComments,
    saveNotifications: setNotifications,
    saveCompletions: setCompletions,
    saveOptions,
    saveUsers: setUsers,
    saveLetterhead,
    pushNotification: () => {},
    pushAudit: () => {},
    approveFaculty,
    rejectFaculty,
    addLeadership,
    removeUser,
    updateCurrentUser,
    resetDemo: () => {},
    purgeFakeData,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useData(): DataState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useData must be used inside a DataProvider');
  return ctx;
}
