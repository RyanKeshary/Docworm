import React, { useMemo, useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, Plus, Database, Server, ExternalLink, RefreshCw, Trash2,
  Shield, CheckCircle2, Copy, Check, Info, User as UserIcon, Lock,
  Crown, CheckCircle, XCircle, UserCheck, AlertTriangle, FileSpreadsheet,
  Play, Send, Bell, Key, Edit2, Sliders, Wrench, Mail, Terminal, SlidersHorizontal,
  Download, Eye, AlertCircle
} from 'lucide-react';
import { useData, nowStr } from '../store';
import { Badge, Drawer, EmptyState, ExportMenu, Field, Modal, btnGhost, btnPrimary, inputCls } from '../components';
import { REPORT_COLS, computedTaskStatus, detectClashes, exportCSV, exportPDF, exportXLSX, flattenProposal, flattenReport, flattenTask, budgetTotals, exportLetterPDF } from '../utils';
import type { Task, User } from '../types';
import { api } from '../lib/api';
import { ErrorBoundary } from '../components/ErrorBoundary';
import {
  CloudTableEditorPanel,
  SqlEditorPanel,
  MitigationToolsPanel,
  AcademicOptionsPanel,
  SmtpSettingsPanel,
  UserProfilePanel,
  EditStaffModal,
} from './AdminPanels';

export function TasksList() {
  const { tasks, users, currentUser, saveTasks, pushNotification, pushAudit } = useData();
  const [view, setView] = useState<'table' | 'board'>('table');
  const [fType, setFType] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fPriority, setFPriority] = useState('');
  const [search, setSearch] = useState('');
  const [modalUserSearch, setModalUserSearch] = useState('');
  const [create, setCreate] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', taskType: 'Report Submission', priority: 'Medium', assignedTo: [] as string[], dueDate: '' });
  const [detail, setDetail] = useState<Task | null>(null);

  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  // Role-based scoping:
  // - Principal & Dean: see all tasks across all departments
  // - HOD: sees all tasks within their department (assigned by/to department staff)
  // - Faculty: sees tasks assigned to them or created by them
  const scopedTasks = useMemo(() => {
    if (currentUser.role === 'Principal' || currentUser.role === 'Dean') {
      return tasks;
    }
    if (currentUser.role === 'HOD') {
      const deptUserIds = new Set(users.filter((u) => u.department === currentUser.department).map((u) => u.id));
      return tasks.filter(
        (t) =>
          deptUserIds.has(t.assignedBy) ||
          t.assignedTo.some((uid) => deptUserIds.has(uid)) ||
          t.assignedBy === currentUser.id,
      );
    }
    return tasks.filter((t) => t.assignedTo.includes(currentUser.id) || t.assignedBy === currentUser.id);
  }, [tasks, currentUser, users]);

  const list = scopedTasks.filter((t) => {
    if (fType && t.taskType !== fType) return false;
    if (fPriority && t.priority !== fPriority) return false;
    const cs = computedTaskStatus(t.dueDate, t.status);
    if (fStatus && cs !== fStatus) return false;
    if (search && !(t.title + t.description).toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const rows = list.map((t) => flattenTask(t, name));
  const [visible, setVisible] = useState(50);
  React.useEffect(() => { setVisible(50); }, [fType, fStatus, fPriority, search]);
  const shown = list.slice(0, visible);
  const cols = ['id', 'title', 'type', 'priority', 'status', 'assignedTo', 'dueDate', 'completionDate'];

  const submitTask = () => {
    if (!form.title.trim() || !form.dueDate || form.assignedTo.length === 0) return;
    const t: Task = {
      id: `t-${Date.now().toString(36)}`, title: form.title, description: form.description,
      taskType: form.taskType, priority: form.priority, assignedBy: currentUser.id,
      assignedByName: currentUser.name, assignedTo: form.assignedTo,
      assignedDate: new Date().toISOString().slice(0, 10), dueDate: form.dueDate,
      status: 'Not Started', attachments: [], updates: [],
    };
    saveTasks([t, ...tasks]);
    form.assignedTo.forEach((uid) => pushNotification({ userId: uid, title: 'New task assigned', body: `${t.title}, due ${t.dueDate}`, link: `/tasks/${t.id}` }));
    pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `Assigned task ${t.title}`, entity: 'Task', entityId: t.id });
    setCreate(false);
    setForm({ title: '', description: '', taskType: 'Report Submission', priority: 'Medium', assignedTo: [], dueDate: '' });
  };

  const boardCols = ['Not Started', 'In Progress', 'Completed', 'Overdue'];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div><p className="text-xs text-slate-500">Tasks</p><h1 className="text-2xl font-bold">Task assignments</h1></div>
        <div className="flex-1" />
        <div className="flex bg-gray-100 rounded-card p-1">
          {(['table', 'board'] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize ${view === v ? 'bg-white shadow-sm text-primary-dark' : 'text-slate-600'}`}>{v}</button>
          ))}
        </div>
        <ExportMenu onExport={(f) => {
          if (f === 'CSV') exportCSV('docworm-tasks.csv', rows, cols);
          else if (f === 'XLSX') exportXLSX('docworm-tasks.xlsx', rows, cols);
          else if (f === 'PDF') exportPDF('docworm-tasks.pdf', 'Docworm tasks export', cols, rows);
          else window.print();
        }} />
        {(currentUser.role === 'Principal' || currentUser.role === 'HOD') && <button onClick={() => setCreate(true)} className={btnPrimary}><Plus size={15} /> New task</button>}
      </div>

      <div className="flex flex-wrap gap-2 bg-white border border-gray-200 rounded-card p-3">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks" className={`${inputCls} !w-48`} aria-label="Search tasks" />
        <select value={fType} onChange={(e) => setFType(e.target.value)} className={`${inputCls} !w-52`} aria-label="Filter by type">
          <option value="">All types</option>
          {['Report Submission', 'Event Coordination', 'Accreditation or NAAC or NBA', 'Admission Related', 'Examination Related', 'Infrastructure', 'Meeting', 'Other'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={`${inputCls} !w-36`} aria-label="Filter by status">
          <option value="">All statuses</option>
          {['Not Started', 'In Progress', 'Completed', 'Overdue'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={fPriority} onChange={(e) => setFPriority(e.target.value)} className={`${inputCls} !w-32`} aria-label="Filter by priority">
          <option value="">All priorities</option>
          {['Low', 'Medium', 'High', 'Urgent'].map((t) => <option key={t}>{t}</option>)}
        </select>
        <span className="text-xs text-slate-500 ml-auto">{list.length} tasks</span>
      </div>

      {list.length === 0 && <EmptyState title="No tasks found" hint="Adjust filters or ask the principal to assign a task." />}

      {view === 'table' && list.length > 0 && (
        <>
          <div className="hidden md:block bg-white border border-gray-200 rounded-card overflow-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-slate-500 border-b border-gray-100">
                <th className="p-3">Title</th><th className="p-3">Type</th><th className="p-3">Priority</th><th className="p-3">Status</th><th className="p-3">Assignees</th><th className="p-3">Due</th><th className="p-3">Open</th>
              </tr></thead>
              <tbody>
                {shown.map((t) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-primary-pale/40">
                    <td className="p-3 font-medium">{t.title}</td>
                    <td className="p-3 text-slate-600">{t.taskType}</td>
                    <td className="p-3">{t.priority}</td>
                    <td className="p-3"><Badge text={computedTaskStatus(t.dueDate, t.status)} /></td>
                    <td className="p-3 text-xs">{t.assignedTo.map(name).join(', ')}</td>
                    <td className="p-3 text-xs">{t.dueDate}</td>
                    <td className="p-3"><button onClick={() => setDetail(t)} className="text-primary font-semibold">Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden space-y-2">
            {shown.map((t) => (
              <button key={t.id} onClick={() => setDetail(t)} className="w-full text-left bg-white border border-gray-200 rounded-card p-4">
                <span className="flex gap-2 items-center"><span className="font-semibold text-sm flex-1">{t.title}</span><Badge text={computedTaskStatus(t.dueDate, t.status)} /></span>
                <span className="text-xs text-slate-500">{t.taskType} | due {t.dueDate}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {view === 'table' && visible < list.length && (
        <button onClick={() => setVisible((v: number) => v + 50)} className={`${btnGhost} w-full justify-center`}>
          Show more ({list.length - visible} remaining)
        </button>
      )}

      {view === 'board' && (
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {boardCols.map((col) => (
            <div key={col} className="bg-gray-50 border border-gray-200 rounded-card p-3">
              <p className="text-sm font-bold flex items-center gap-2"><Badge text={col} /><span className="text-slate-500">{list.filter((t) => computedTaskStatus(t.dueDate, t.status) === col).length}</span></p>
              <div className="mt-2 space-y-2">
                {list.filter((t) => computedTaskStatus(t.dueDate, t.status) === col).slice(0, 20).map((t) => (
                  <button key={t.id} onClick={() => setDetail(t)} className="w-full text-left bg-white border border-gray-200 rounded-card p-3 hover:border-primary-border">
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.taskType} | {t.priority} | due {t.dueDate}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.assignedTo.map(name).join(', ')}</p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {create && (
        <Modal title="Assign task (Principal)" onClose={() => setCreate(false)}>
          <div className="space-y-3">
            <Field label="Title"><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} placeholder="Example: NBA compliance files" /></Field>
            <Field label="Description"><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} rows={3} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Task type">
                <select value={form.taskType} onChange={(e) => setForm({ ...form, taskType: e.target.value })} className={inputCls}>
                  {['Report Submission', 'Event Coordination', 'Accreditation or NAAC or NBA', 'Admission Related', 'Examination Related', 'Infrastructure', 'Meeting', 'Other'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={inputCls}>
                  {['Low', 'Medium', 'High', 'Urgent'].map((t) => <option key={t}>{t}</option>)}
                </select>
              </Field>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Assign to (searchable)</legend>
              <input placeholder="Type to filter users" className={`${inputCls} mt-1 mb-2`} value={modalUserSearch} onChange={(e) => setModalUserSearch(e.target.value)} aria-label="Filter users" />
              <div className="max-h-40 overflow-auto border border-gray-200 rounded-card divide-y divide-gray-50">
                {users.filter((u) => u.role !== 'Principal' && (u.name + u.department).toLowerCase().includes(modalUserSearch.toLowerCase())).map((u) => (
                  <label key={u.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                    <input type="checkbox" checked={form.assignedTo.includes(u.id)} onChange={() => setForm({ ...form, assignedTo: form.assignedTo.includes(u.id) ? form.assignedTo.filter((x) => x !== u.id) : [...form.assignedTo, u.id] })} className="accent-primary" />
                    {u.name} <span className="text-xs text-slate-500">({u.role}, {u.department})</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Due date"><input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={inputCls} /></Field>
            <button onClick={submitTask} className={btnPrimary}>Assign task</button>
          </div>
        </Modal>
      )}

      {detail && <TaskDrawer task={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}

export function TaskDrawer({ task, onClose }: { task: Task; onClose: () => void }) {
  const { tasks, saveTasks, users, currentUser, pushAudit, pushNotification } = useData();
  const [text, setText] = useState('');
  const [extendDate, setExtendDate] = useState('');
  const [extendReason, setExtendReason] = useState('');
  const live = tasks.find((t) => t.id === task.id) ?? task;
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? id;

  const updateStatus = (status: Task['status'], remark?: string) => {
    const upd = { id: `tu-${Date.now()}`, text: remark || `Status set to ${status}`, userId: currentUser.id, userName: currentUser.name, createdAt: nowStr(), statusAfter: status };
    saveTasks(tasks.map((t) => t.id === live.id ? { ...t, status, completionDate: status === 'Completed' ? new Date().toISOString().slice(0, 10) : t.completionDate, updates: [upd, ...t.updates], updatedAt: undefined } as Task : t));
    pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `Set task ${live.title} to ${status}`, entity: 'Task', entityId: live.id });
  };
  const post = () => {
    if (!text.trim()) return;
    saveTasks(tasks.map((t) => t.id === live.id ? { ...t, updates: [{ id: `tu-${Date.now()}`, text, userId: currentUser.id, userName: currentUser.name, createdAt: nowStr() }, ...t.updates] } : t));
    setText('');
  };
  const extend = () => {
    if (!extendDate || !extendReason.trim()) return;
    saveTasks(tasks.map((t) => t.id === live.id ? { ...t, dueDate: extendDate, extendReason, updates: [{ id: `tu-${Date.now()}`, text: `Due date extended to ${extendDate}. Reason: ${extendReason}`, userId: currentUser.id, userName: currentUser.name, createdAt: nowStr() }, ...t.updates] } : t));
    live.assignedTo.forEach((uid) => pushNotification({ userId: uid, title: 'Task due date extended', body: `${live.title} now due ${extendDate}`, link: `/tasks/${live.id}` }));
    setExtendDate(''); setExtendReason('');
  };

  return (
    <Drawer title={live.title} onClose={onClose}>
      <div className="space-y-3 text-sm">
        <p><Badge text={computedTaskStatus(live.dueDate, live.status)} /> <span className="text-slate-500 ml-1">{live.taskType} | {live.priority}</span></p>
        <p className="text-slate-700">{live.description}</p>
        <p className="text-xs text-slate-500">Assigned by {live.assignedByName} on {live.assignedDate}, due {live.dueDate}, to {live.assignedTo.map(name).join(', ')}</p>
        {live.extendReason && <p className="text-xs bg-amber-50 border border-amber-200 rounded px-2 py-1">Extension note: {live.extendReason}</p>}
        <div className="flex flex-wrap gap-1.5">
          {(['Not Started', 'In Progress', 'Completed'] as const).map((s) => (
            <button key={s} onClick={() => updateStatus(s)} className={`px-2.5 py-1.5 text-xs font-semibold rounded-md border ${live.status === s ? 'bg-primary text-white border-primary' : 'border-gray-300'}`}>{s}</button>
          ))}
          {currentUser.role === 'Principal' && <button onClick={() => updateStatus('Cancelled', 'Cancelled by principal')} className="px-2.5 py-1.5 text-xs font-semibold rounded-md border border-red-300 text-red-700">Cancel</button>}
        </div>
        {currentUser.role === 'Principal' && (
          <div className="border border-gray-200 rounded-card p-3 space-y-2">
            <p className="font-semibold text-xs">Extend due date (logged reason)</p>
            <input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} className={inputCls} aria-label="New due date" />
            <input value={extendReason} onChange={(e) => setExtendReason(e.target.value)} placeholder="Reason for extension" className={inputCls} aria-label="Extension reason" />
            <button onClick={extend} className={btnGhost}>Extend</button>
          </div>
        )}
        <div>
          <p className="font-semibold mb-1">Progress comments</p>
          <div className="flex gap-2">
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add update or completion remark" className={inputCls} aria-label="Add task update" />
            <button onClick={post} className={btnPrimary}>Post</button>
          </div>
          <ul className="mt-2 space-y-1.5">
            {live.updates.map((u) => <li key={u.id} className="border border-gray-100 rounded px-2 py-1.5"><b>{u.userName}</b> <span className="text-xs text-slate-400">{u.createdAt}</span><br />{u.text}</li>)}
            {live.updates.length === 0 && <li className="text-slate-500">No updates yet.</li>}
          </ul>
        </div>
        <Link to={`/tasks/${live.id}`} className="text-primary text-xs font-semibold">Open full task page</Link>
      </div>
    </Drawer>
  );
}

export function TaskDetail() {
  const { id } = useParams();
  const { tasks } = useData();
  const nav = useNavigate();
  const t = tasks.find((x) => x.id === id);
  const [open, setOpen] = useState(true);
  if (!t) return <EmptyState title="Task not found" hint="It may have been removed." />;
  return (
    <div className="space-y-3">
      <button onClick={() => nav(-1)} className="text-sm text-primary font-semibold inline-flex items-center gap-1"><ArrowLeft size={15} /> Back</button>
      <h1 className="text-2xl font-bold">{t.title}</h1>
      {open && <TaskDrawer task={t} onClose={() => { setOpen(false); nav('/tasks'); }} />}
      {!open && <Link to="/tasks" className={btnGhost}>Back to tasks</Link>}
    </div>
  );
}

export function CalendarView() {
  const { proposals } = useData();
  const approved = proposals.filter((p) => ['Approved', 'Completed'].includes(p.status));
  const clashes = detectClashes(proposals);
  const days = useMemo(() => {
    const m: Record<string, typeof approved> = {};
    approved.forEach((p) => {
      const d = p.startDate;
      m[d] = [...(m[d] ?? []), p];
    });
    return Object.entries(m).sort();
  }, [approved]);
  return (
    <div className="space-y-4">
      <div><p className="text-xs text-slate-500">Calendar</p><h1 className="text-2xl font-bold">Approved events and room clashes</h1></div>
      {clashes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-card p-4 text-sm text-red-800 space-y-1">
          <p className="font-bold">Clash warnings</p>
          {clashes.map((c, i) => <p key={i}>{c}</p>)}
        </div>
      )}
      {days.length === 0 && <EmptyState title="No scheduled events" hint="Approved events will appear here by date." />}
      <div className="space-y-2">
        {days.map(([d, list]) => (
          <div key={d} className="bg-white border border-gray-200 rounded-card p-4">
            <p className="font-bold text-sm">{d}</p>
            <div className="mt-2 grid sm:grid-cols-2 gap-2">
              {list.map((p) => (
                <Link key={p.id} to={`/proposals/${p.id}`} className="border border-gray-200 rounded-card px-3 py-2 text-sm hover:border-primary-border">
                  <span className="font-semibold">{p.eventName}</span> <Badge text={p.status} />
                  <span className="block text-xs text-slate-500">{p.startTime} to {p.endTime} | {p.resources.map((r) => r.roomNo).filter(Boolean).join(', ') || 'No rooms'}</span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Reports() {
  const { proposals, tasks, completions, currentUser, pushNotification, pushAudit, letterhead, options } = useData();
  const currentYear = new Date().getFullYear();
  const defaultAcYear = `${currentYear}-${String(currentYear + 1).slice(2)}`;
  const [year, setYear] = useState(defaultAcYear);
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('');
  const [range, setRange] = useState({ from: `${currentYear}-01-01`, to: `${currentYear}-12-31` });

  const yp = proposals.filter((p) => p.academicYear === year);
  const approvalRate = proposals.length ? Math.round((proposals.filter((p) => ['Approved', 'Completed'].includes(p.status)).length / proposals.length) * 100) : 0;
  const pendingReports = proposals.filter((p) => p.status === 'Approved' && p.endDate < new Date().toISOString().slice(0, 10) && !completions[p.id]);
  const overdueReports = pendingReports.filter((p) => p.endDate < new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10));
  const taskRate = tasks.length ? Math.round((tasks.filter((t) => t.status === 'Completed').length / tasks.length) * 100) : 0;
  const budgetByHead = useMemo(() => {
    const m: Record<string, number> = {};
    proposals.filter((p) => p.hasBudget).forEach((p) => { m[p.budgetHead] = (m[p.budgetHead] ?? 0) + budgetTotals(p).total; });
    return Object.entries(m);
  }, [proposals]);

  const filtered = proposals.filter((p) =>
    (!dept || p.departments.includes(dept)) &&
    (!status || p.status === status) &&
    p.startDate >= range.from && p.startDate <= range.to,
  );
  const cols = ['refNo', 'eventName', 'category', 'status', 'startDate', 'departments', 'submitter', 'participants', 'totalExpenses'];
  const submittedList = proposals
    .filter((p) => completions[p.id])
    .map((p) => ({ p, r: completions[p.id] }));
  const bulkExport = (fmt: 'CSV' | 'XLSX' | 'PDF') => {
    const rows = filtered.map(flattenProposal);
    if (fmt === 'CSV') exportCSV(`docworm-bulk-${range.from}-${range.to}.csv`, rows, cols);
    else if (fmt === 'XLSX') exportXLSX(`docworm-bulk-${range.from}-${range.to}.xlsx`, rows, cols);
    else exportPDF(`docworm-bulk-${range.from}-${range.to}.pdf`, `Docworm bulk export ${range.from} to ${range.to}`, cols, rows);
  };
  const zipLetters = () => {
    filtered.filter((p) => p.status === 'Approved').forEach((p, i) => setTimeout(() => exportLetterPDF(p, letterhead), i * 400));
  };
  const analyticsExport = () => {
    const rows = [{
      academicYear: year, totalProposals: yp.length, approvalRate: `${approvalRate}%`,
      approved: yp.filter((p) => ['Approved', 'Completed'].includes(p.status)).length,
      rejected: yp.filter((p) => p.status === 'Rejected').length,
      budgetUtilization: budgetByHead.map(([h, v]) => `${h}: Rs.${v}`).join('; '),
      taskCompletionRate: `${taskRate}%`,
    }];
    exportXLSX(`docworm-analytics-${year}.xlsx`, rows, Object.keys(rows[0]));
  };

  return (
    <div className="space-y-4">
      <div><p className="text-xs text-slate-500">Reports</p><h1 className="text-2xl font-bold">Completion and analytics</h1></div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-card p-5">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="font-semibold">Analytics export ({year})</h2>
            <div className="flex-1" />
            <select value={year} onChange={(e) => setYear(e.target.value)} className={`${inputCls} !w-32`} aria-label="Academic year">
              {options.academicYears.map((y) => <option key={y}>{y}</option>)}
            </select>
            <button onClick={analyticsExport} className={btnPrimary}>Export summary</button>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
            {[
              ['Total proposals', String(yp.length)],
              ['Approval rate', `${approvalRate}%`],
              ['Task completion', `${taskRate}%`],
              ['Budget heads', String(budgetByHead.length)],
            ].map(([k, v]) => (
              <div key={k} className="border border-gray-200 rounded-card p-3"><p className="text-xl font-bold">{v}</p><p className="text-xs text-slate-500">{k}</p></div>
            ))}
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold">Budget used by head</p>
            <div className="mt-2 space-y-1.5">
              {budgetByHead.map(([h, v]) => (
                <div key={h} className="flex items-center gap-2 text-sm">
                  <span className="w-44 truncate">{h}</span>
                  <span className="flex-1 h-5 bg-gray-100 rounded"><span className="block h-full bg-primary rounded" style={{ width: `${Math.min(100, (v / Math.max(1, ...budgetByHead.map((x) => x[1]))) * 100)}%` }} /></span>
                  <span className="font-semibold text-xs">Rs. {v}</span>
                </div>
              ))}
              {budgetByHead.length === 0 && <p className="text-sm text-slate-500">No budgets yet.</p>}
            </div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-card p-5">
          <h2 className="font-semibold">Bulk export (principal)</h2>
          <div className="mt-2 space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Field label="From"><input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} className={inputCls} /></Field>
              <Field label="To"><input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} className={inputCls} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={dept} onChange={(e) => setDept(e.target.value)} className={inputCls} aria-label="Department"><option value="">All depts</option>{options.departments.map((d) => <option key={d}>{d}</option>)}</select>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls} aria-label="Status"><option value="">All statuses</option>{options.proposalStatuses.map((d) => <option key={d}>{d}</option>)}</select>
            </div>
            <p className="text-xs text-slate-500">{filtered.length} proposals match.</p>
            <div className="flex flex-wrap gap-1.5">
              <button onClick={() => bulkExport('CSV')} className={btnGhost}>CSV</button>
              <button onClick={() => bulkExport('XLSX')} className={btnGhost}>XLSX</button>
              <button onClick={() => bulkExport('PDF')} className={btnGhost}>PDF</button>
              <button onClick={zipLetters} className={btnPrimary}>Approved letters PDF</button>
            </div>
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Polished Excel Reports (Server Formatted)</span>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`/api/export/excel/permission-requests?from=${range.from}&to=${range.to}&status=${status}&department=${dept}`}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                >
                  <FileSpreadsheet size={14} /> Requests Excel (.xlsx)
                </a>
                <a
                  href="/api/export/excel/staff-directory"
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs"
                >
                  <FileSpreadsheet size={14} /> Staff Directory (.xlsx)
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Pending reports ({pendingReports.length})</h2>
          <div className="flex-1" />
          <ExportMenu onExport={(f) => {
            const rows = pendingReports.map(flattenProposal);
            if (f === 'CSV') exportCSV('docworm-pending-reports.csv', rows, cols);
            else if (f === 'XLSX') exportXLSX('docworm-pending-reports.xlsx', rows, cols);
            else if (f === 'PDF') exportPDF('docworm-pending-reports.pdf', 'Docworm pending reports', cols, rows);
            else window.print();
          }} />
        </div>
        <div className="mt-3 space-y-2">
          {pendingReports.map((p) => {
            const overdue = overdueReports.includes(p);
            return (
              <div key={p.id} className={`border rounded-card px-3 py-2.5 text-sm flex flex-wrap gap-2 items-center ${overdue ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                <Link to={`/proposals/${p.id}`} className="font-semibold flex-1 min-w-40">{p.eventName}</Link>
                <span className="font-mono text-xs text-slate-500">{p.refNo}</span>
                {overdue && <Badge text="Overdue" />}
                {currentUser.role === 'Principal' && (
                  <button
                    onClick={() => { pushNotification({ userId: p.submitterId, title: 'Completion report reminder', body: `Please submit the completion report for ${p.refNo}`, link: `/proposals/${p.id}` }); pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `Sent report reminder for ${p.refNo}`, entity: 'Proposal', entityId: p.id }); }}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md bg-primary text-white"
                  >
                    Send reminder
                  </button>
                )}
              </div>
            );
          })}
          {pendingReports.length === 0 && <EmptyState title="No pending reports" hint="Approved events past their date will appear here." />}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">Submitted reports ({submittedList.length})</h2>
          <div className="flex-1" />
          <ExportMenu onExport={(f) => {
            const rows = submittedList.map(({ p, r }) => flattenReport(p, r));
            if (f === 'CSV') exportCSV('docworm-submitted-reports.csv', rows, REPORT_COLS);
            else if (f === 'XLSX') exportXLSX('docworm-submitted-reports.xlsx', rows, REPORT_COLS);
            else if (f === 'PDF') exportPDF('docworm-submitted-reports.pdf', 'Docworm submitted completion reports', REPORT_COLS, rows);
            else window.print();
          }} />
        </div>
        <div className="mt-3 space-y-2">
          {submittedList.map(({ p, r }) => (
            <div key={p.id} className="border border-gray-200 rounded-card px-3 py-2.5 text-sm flex flex-wrap gap-2 items-center">
              <Link to={`/proposals/${p.id}`} className="font-semibold flex-1 min-w-40">{p.eventName}</Link>
              <span className="font-mono text-xs text-slate-500">{p.refNo}</span>
              <Badge text={r.done ? 'Done' : 'Not Done'} />
              <ExportMenu onExport={(f) => {
                const rows = [flattenReport(p, r)];
                const file = `docworm-report-${p.refNo.replace(/\//g, '-')}`;
                if (f === 'CSV') exportCSV(`${file}.csv`, rows, REPORT_COLS);
                else if (f === 'XLSX') exportXLSX(`${file}.xlsx`, rows, REPORT_COLS);
                else if (f === 'PDF') exportPDF(`${file}.pdf`, `Docworm completion report ${p.refNo}`, REPORT_COLS, rows);
                else window.print();
              }} />
            </div>
          ))}
          {submittedList.length === 0 && <EmptyState title="No submitted reports yet" hint="Reports appear here once submitters file them." />}
        </div>
      </div>
    </div>
  );
}

export function NotificationsCenter() {
  const { notifications, saveNotifications, currentUser, options } = useData();
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(false);
  const [pushStatus, setPushStatus] = useState<'idle' | 'subscribed' | 'unsupported' | 'denied'>('idle');
  const [pushFeedback, setPushFeedback] = useState('');

  // Announcement composer state (Principal only)
  const isPrincipal = currentUser.role === 'Principal';
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [priority, setPriority] = useState<'normal' | 'high' | 'urgent'>('normal');
  const [audience, setAudience] = useState<string>('all');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastFeedback, setBroadcastFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Load announcements from server
  const loadAnnouncements = async () => {
    try {
      setLoadingAnnouncements(true);
      const res = await api.announcements.list();
      if (res.announcements) setAnnouncements(res.announcements);
    } catch (err: any) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoadingAnnouncements(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPushStatus('unsupported');
    } else if (Notification.permission === 'granted') {
      setPushStatus('subscribed');
    } else if (Notification.permission === 'denied') {
      setPushStatus('denied');
    }
  }, []);

  // Web Push Subscription flow
  const handleEnablePush = async () => {
    try {
      setPushFeedback('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushStatus('denied');
        setPushFeedback('Notification permission denied by browser.');
        return;
      }

      setPushFeedback('Registering service worker and fetching VAPID keys...');
      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const { publicKey } = await api.push.getVapidKey();
      if (!publicKey) throw new Error('VAPID public key unavailable from server.');

      const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
      const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: outputArray,
      });

      await api.push.subscribe(sub.toJSON());
      setPushStatus('subscribed');
      setPushFeedback('Push notifications activated successfully! You will receive institutional alerts.');
    } catch (err: any) {
      console.error('Push error:', err);
      setPushFeedback(`Push subscription error: ${err.message}`);
    }
  };

  // Submit broadcast announcement (Principal only)
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setBroadcastFeedback({ type: 'error', msg: 'Title and message body are required.' });
      return;
    }

    try {
      setSendingBroadcast(true);
      setBroadcastFeedback(null);
      const res = await api.announcements.create({
        title: title.trim(),
        body: body.trim(),
        priority,
        audience_dept: audience === 'all' ? null : audience,
      });

      setBroadcastFeedback({
        type: 'success',
        msg: `Broadcast sent! Dispatched to ${res.recipientsCount} faculty accounts via Email, Push, and In-App Bell.`,
      });
      setTitle('');
      setBody('');
      setPriority('normal');
      setAudience('all');
      await loadAnnouncements();
    } catch (err: any) {
      setBroadcastFeedback({ type: 'error', msg: err.message || 'Failed to dispatch broadcast.' });
    } finally {
      setSendingBroadcast(false);
    }
  };

  const mine = notifications.filter((n) => n.userId === currentUser.id);

  return (
    <div className="space-y-6 max-w-4xl animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">Communications & Alerts</p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">Announcements & Notification Hub</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time institutional broadcasts dispatched via Email, Browser Web Push, and In-App Bell.
          </p>
        </div>

        <div>
          {pushStatus === 'subscribed' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 size={14} className="text-emerald-600" /> Web Push Active
            </span>
          ) : (
            <button
              onClick={handleEnablePush}
              disabled={pushStatus === 'unsupported'}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-card text-xs font-semibold bg-primary text-white hover:bg-primary-dark transition-colors shadow-xs"
            >
              <Bell size={14} /> Enable Browser Push Notifications
            </button>
          )}
        </div>
      </div>

      {pushFeedback && (
        <div className="p-3 bg-slate-50 border border-slate-200 text-xs text-slate-700 rounded-card flex items-center justify-between">
          <span>{pushFeedback}</span>
          <button onClick={() => setPushFeedback('')} className="text-slate-400 hover:text-slate-600 font-bold ml-2">×</button>
        </div>
      )}

      {/* 1. PRINCIPAL BROADCAST COMPOSER */}
      {isPrincipal && (
        <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <span className="w-8 h-8 rounded-lg bg-primary-pale text-primary flex items-center justify-center">
              <Send size={16} />
            </span>
            <div>
              <h2 className="font-bold text-slate-900 text-base">New Institutional Broadcast (Principal Only)</h2>
              <p className="text-xs text-slate-500">Delivered immediately via Email, Web Push, and In-App Notifications.</p>
            </div>
          </div>

          {broadcastFeedback && (
            <div className={`p-3.5 rounded-card text-xs font-medium flex items-center gap-2 ${
              broadcastFeedback.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}>
              {broadcastFeedback.type === 'success' ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <AlertCircle size={16} className="text-rose-600 shrink-0" />}
              <span>{broadcastFeedback.msg}</span>
            </div>
          )}

          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 block mb-1">Announcement Title *</label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Urgent Faculty Meeting Regarding NAAC Documentation"
                  className={inputCls}
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className={inputCls}
                >
                  <option value="normal">Normal</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent / Immediate</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Target Audience</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className={inputCls}
              >
                <option value="all">All Faculty & Staff (Institution-wide)</option>
                {options.departments.map((d) => (
                  <option key={d} value={d}>Department of {d} Only</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Message Body *</label>
              <textarea
                required
                rows={4}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the full institutional message or directive here..."
                className={inputCls}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={sendingBroadcast}
                className={`${btnPrimary} !px-5`}
              >
                {sendingBroadcast ? (
                  <span className="flex items-center gap-1.5">
                    <RefreshCw size={14} className="animate-spin" /> Dispatching Broadcast...
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Send size={14} /> Send Broadcast to Faculty
                  </span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 2. RECENT BROADCASTS & DELIVERY REPORTS */}
      <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-slate-900 text-base">Broadcast Announcements History</h2>
            <p className="text-xs text-slate-500">Official directives and circulars published to faculty.</p>
          </div>
          <button onClick={loadAnnouncements} className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
            <RefreshCw size={12} className={loadingAnnouncements ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {announcements.map((a) => (
            <div key={a.id} className="py-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                    a.priority === 'urgent' ? 'bg-rose-100 text-rose-800 border border-rose-300' :
                    a.priority === 'high' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    'bg-slate-100 text-slate-700 border border-slate-300'
                  }`}>
                    {a.priority}
                  </span>
                  <h3 className="font-bold text-slate-900 text-sm">{a.title}</h3>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  {String(a.created_at || '').slice(0, 16).replace('T', ' ')}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{a.body}</p>

              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                <span>By: <b className="text-slate-700">{a.creator_name || 'Principal Office'}</b></span>
                <span>Audience: <b className="text-slate-700">{a.target_department ? `Dept of ${a.target_department}` : 'All Faculty'}</b></span>

                {isPrincipal && (
                  <span className="ml-auto inline-flex items-center gap-2 text-[11px] bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                    <span>Delivered: <b>{a.receipts_count ?? 1}</b></span>
                    <span>Read: <b className="text-emerald-700">{a.read_count ?? 1}</b></span>
                  </span>
                )}
              </div>
            </div>
          ))}

          {announcements.length === 0 && !loadingAnnouncements && (
            <EmptyState title="No broadcasts published" hint="Institutional broadcasts sent by the Principal will appear here." />
          )}
        </div>
      </div>

      {/* 3. IN-APP NOTIFICATIONS INBOX */}
      <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-slate-900 text-base">
              Personal Notifications ({mine.filter((n) => !n.read).length} Unread)
            </h2>
            <p className="text-xs text-slate-500">Status updates, assigned tasks, and review queries.</p>
          </div>
          <button
            onClick={() => saveNotifications(notifications.map((n) => n.userId === currentUser.id ? { ...n, read: true } : n))}
            className={btnGhost}
          >
            Mark all read
          </button>
        </div>

        {mine.length === 0 && (
          <EmptyState title="No notifications" hint="Status changes, assignments, and reminders will appear here." />
        )}

        <div className="space-y-2">
          {mine.map((n) => (
            <div
              key={n.id}
              className={`border rounded-card p-4 text-sm transition-all ${
                n.read ? 'border-gray-200 bg-white' : 'border-primary-border bg-primary-pale/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-slate-900">{n.title}</p>
                <span className="text-[11px] text-slate-400 font-mono shrink-0">{n.createdAt}</span>
              </div>
              <p className="text-slate-600 mt-1 text-xs sm:text-sm">{n.body}</p>
              <div className="mt-2.5 flex items-center gap-3">
                {n.link && (
                  <Link to={n.link} className="text-primary font-semibold text-xs hover:underline">
                    Open linked item →
                  </Link>
                )}
                {!n.read && (
                  <button
                    onClick={() => saveNotifications(notifications.map((x) => x.id === n.id ? { ...x, read: true } : x))}
                    className="text-xs text-slate-500 hover:text-slate-800 underline"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const {
    options, saveOptions, users, saveUsers, letterhead, saveLetterhead,
    resetDemo, purgeFakeData, audit, currentUser, setCurrentUserId,
    backend, syncState, lastSyncedAt, refresh, proposals, tasks, comments, notifications,
    approveFaculty, rejectFaculty, addLeadership, removeUser: storeRemoveUser,
  } = useData();

  const [params, setParams] = useSearchParams();
  const isPrincipal = currentUser.role === 'Principal';
  const isDean = currentUser.role === 'Dean';
  const isHod = currentUser.role === 'HOD';
  const isAdmin = isPrincipal;
  const canManageStaff = isPrincipal || isDean || isHod;

  const availableRolesToAdd = useMemo(() => {
    if (isPrincipal) return ['Dean', 'HOD', 'Faculty', 'Office Admin'] as const;
    if (isDean) return ['HOD', 'Faculty', 'Office Admin'] as const;
    if (isHod) return ['Faculty'] as const;
    return [] as const;
  }, [isPrincipal, isDean, isHod]);

  const rawTab = params.get('tab');
  const currentTab = (!rawTab || rawTab === 'database') ? (canManageStaff ? 'leadership' : 'profile') : rawTab;
  const setTab = (t: string) => setParams({ tab: t });

  const pendingFaculty = useMemo(() => users.filter((u) => u.status === 'pending_approval'), [users]);

  const defaultRole = isPrincipal ? 'HOD' : isDean ? 'HOD' : 'Faculty';
  const [leadershipForm, setLeadershipForm] = useState<{
    name: string;
    email: string;
    password: string;
    role: 'Principal' | 'Dean' | 'HOD' | 'Faculty' | 'Office Admin';
    department: string;
    designation: string;
    phone: string;
  }>({
    name: '',
    email: '',
    password: 'password@67',
    role: defaultRole,
    department: currentUser.department || 'IT',
    designation: '',
    phone: '',
  });
  const [leadershipFeedback, setLeadershipFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [staffRoleFilter, setStaffRoleFilter] = useState<'All' | 'Principal' | 'Dean' | 'HOD' | 'Faculty'>('All');
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [editingStaff, setEditingStaff] = useState<User | null>(null);
  const [dbSubTab, setDbSubTab] = useState<'tables' | 'sql' | 'mitigation' | 'guide'>('tables');
  const [purgeFeedback, setPurgeFeedback] = useState('');
  const [copiedEnv, setCopiedEnv] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const nav = useNavigate();

  // Filtered staff list based on role scoping and search
  const visibleStaff = useMemo(() => {
    let list = users;
    if (isHod && currentUser.department) {
      list = list.filter((u) => u.department === currentUser.department || u.role === 'Principal' || u.role === 'Dean');
    }
    if (staffRoleFilter !== 'All') {
      list = list.filter((u) => u.role === staffRoleFilter);
    }
    if (staffSearchQuery.trim()) {
      const q = staffSearchQuery.toLowerCase();
      list = list.filter((u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.department || '').toLowerCase().includes(q) ||
        (u.designation || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [users, staffRoleFilter, staffSearchQuery, isHod, currentUser.department]);

  const editList = (key: keyof typeof options, val: string) => {
    saveOptions({ ...options, [key]: val.split(',').map((s) => s.trim()).filter(Boolean) });
  };

  const handleAppointLeadership = async (e: React.FormEvent) => {
    e.preventDefault();
    setLeadershipFeedback(null);
    if (!leadershipForm.name.trim() || !leadershipForm.email.trim()) {
      setLeadershipFeedback({ type: 'error', msg: 'Full name and institutional email are required.' });
      return;
    }
    const targetDept = isHod ? (currentUser.department || 'IT') : (leadershipForm.role === 'Principal' ? '' : (leadershipForm.department || 'IT'));
    const targetDesignation = leadershipForm.designation.trim() || (
      leadershipForm.role === 'Dean' ? 'Dean, Student Welfare' :
      leadershipForm.role === 'HOD' ? `Head of Department, ${targetDept}` :
      leadershipForm.role === 'Office Admin' ? 'Administrative Officer' :
      'Assistant Professor'
    );
    const err = await addLeadership({
      name: leadershipForm.name.trim(),
      email: leadershipForm.email.trim(),
      password: leadershipForm.password || 'password@67',
      role: leadershipForm.role,
      department: targetDept,
      designation: targetDesignation,
      phone: leadershipForm.phone.trim(),
    });
    if (err) {
      setLeadershipFeedback({ type: 'error', msg: err });
      return;
    }
    setLeadershipFeedback({ type: 'success', msg: `Successfully added ${leadershipForm.role}: ${leadershipForm.name}!` });
    setLeadershipForm({
      name: '',
      email: '',
      password: 'password@67',
      role: defaultRole,
      department: currentUser.department || 'IT',
      designation: '',
      phone: '',
    });
    setTimeout(() => setLeadershipFeedback(null), 4000);
  };

  const canRemoveTarget = (target: User) => {
    if (target.id === currentUser.id) return false;
    if (target.role === 'Principal') return false;
    if (isPrincipal) return true;
    if (isDean) return target.role !== 'Dean';
    if (isHod) return target.role === 'Faculty' && (target.department === currentUser.department || !target.department);
    return false;
  };

  const handleRemoveUser = (target: User) => {
    if (target.role === 'Principal') {
      alert('The Principal account is the institutional master administrator and cannot be removed.');
      return;
    }
    if (!canRemoveTarget(target)) {
      alert('You do not have authority to remove this staff member.');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently remove ${target.name} (${target.role}, ${target.department || 'General'})? This action cannot be undone.`)) {
      storeRemoveUser(target.id);
    }
  };

  const handlePurgeFakeData = () => {
    if (window.confirm('Are you sure you want to remove all fake proposals, demo tasks, notifications, and reset to a clean slate? This action cannot be undone.')) {
      purgeFakeData();
      setPurgeFeedback('All fake proposals, dummy tasks, and cached mock entries have been purged!');
      setTimeout(() => setPurgeFeedback(''), 4000);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const sampleEnvText = `# Supabase Cloud Credentials for Docworm
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`;

  const copyEnv = () => {
    navigator.clipboard.writeText(sampleEnvText);
    setCopiedEnv(true);
    setTimeout(() => setCopiedEnv(false), 2500);
  };

  const tables = [
    { name: 'docworm_proposals', count: proposals.length, desc: 'Institutional permission letters, dates, budget, department approvals' },
    { name: 'docworm_tasks', count: tasks.length, desc: 'Event action items, assignees, priorities, and deadlines' },
    { name: 'docworm_profiles', count: users.length, desc: 'Institutional staff profiles, designations, roles & departments' },
    { name: 'docworm_comments', count: comments.length, desc: 'Review notes, queries, and HOD/Dean remarks' },
    { name: 'docworm_notifications', count: notifications.length, desc: 'Live alerts for signers, submitters & coordinators' },
    { name: 'docworm_audit_log', count: audit.length, desc: 'Institutional audit trail of all approval decisions and changes' },
    { name: 'docworm_resources', count: 'Dynamic', desc: 'Room & seminar hall bookings and clashes' },
    { name: 'docworm_approval_steps', count: 'Dynamic', desc: 'Step-by-step routing chain (Submitter -> HOD -> Dean -> Principal)' },
    { name: 'docworm_completion_reports', count: 'Dynamic', desc: 'Post-event completion evidence and participant statistics' },
    { name: 'docworm_settings', count: '1', desc: 'Custom dropdown lists, departments, and letterhead' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">System & Configuration</span>
            {!isPrincipal && (
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">
                {currentUser.role} View
              </span>
            )}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">Settings & Administration</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage institutional leadership, academic options, letterhead, and staff directory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => nav('/')} className={btnGhost}>Dashboard</button>
        </div>
      </div>

      {purgeFeedback && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-card p-3.5 flex items-center gap-2.5 animate-fade-in shadow-xs">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
          <span>{purgeFeedback}</span>
        </div>
      )}

      {/* Tabs navigation - clean, responsive pills */}
      <div className="flex gap-1.5 bg-slate-100/80 p-1.5 rounded-card border border-slate-200/60 overflow-x-auto scrollbar-thin">
        {[
          ...(canManageStaff
            ? [
                {
                  id: 'leadership',
                  label: isPrincipal ? 'Leadership & Staff' : isDean ? 'Staff & Faculty' : 'Department Faculty',
                  badge: isPrincipal && pendingFaculty.length > 0 ? `${pendingFaculty.length} Pending` : null,
                  icon: <Crown size={15} />,
                },
              ]
            : []),
          { id: 'profile', label: 'My Profile', icon: <UserIcon size={15} /> },
          ...(isPrincipal || isDean ? [{ id: 'options', label: 'Academic Options', icon: null }] : []),
          ...(isPrincipal ? [{ id: 'letterhead', label: 'College Letterhead', icon: null }] : []),
          { id: 'auth', label: 'Role Permissions', icon: <Shield size={15} /> },
          ...(isPrincipal ? [{ id: 'smtp', label: 'Email & SMTP', icon: <Mail size={15} /> }] : []),
          ...(isPrincipal || isDean ? [{ id: 'audit', label: `Audit Log (${(audit || []).length})`, icon: null }] : []),
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all shrink-0 ${
              currentTab === t.id
                ? 'bg-white text-primary shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-extrabold animate-pulse ml-0.5">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* 0. LEADERSHIP & FACULTY MANAGEMENT TAB */}
      {currentTab === 'leadership' && (
        <ErrorBoundary fallbackTitle="Staff & Leadership Administration">
          <div className="space-y-6 animate-fade-in">
          {/* Top Info Banner */}
          <div className="bg-white border border-slate-200 rounded-card p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl shrink-0">🏛️</span>
              <div>
                <h2 className="font-bold text-base text-slate-900">Institutional Leadership & Faculty Administration</h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Principal controls appointments of Heads of Department (HOD) and Deans, and verifies faculty registrations.
                </p>
              </div>
            </div>
            {isPrincipal && (
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 text-violet-800 border border-violet-300 shrink-0">
                👑 Principal Authority Active
              </span>
            )}
          </div>

          {leadershipFeedback && (
            <div className={`p-4 rounded-card border text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in ${
              leadershipFeedback.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}>
              {leadershipFeedback.type === 'success' ? <CheckCircle2 size={18} className="text-emerald-600 shrink-0" /> : <AlertTriangle size={18} className="text-rose-600 shrink-0" />}
              <span>{leadershipFeedback.msg}</span>
            </div>
          )}

          {/* 1. PENDING FACULTY REGISTRATIONS (PRINCIPAL APPROVAL QUEUE) */}
          <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-gray-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base">Pending Faculty Registrations</h3>
                  {pendingFaculty.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      {pendingFaculty.length} Awaiting Verification
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Direct faculty registrations require official Principal approval before portal login and event request submissions are unlocked.
                </p>
              </div>
            </div>

            {pendingFaculty.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                <CheckCircle size={32} className="text-emerald-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">No Pending Faculty Registrations</p>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  All faculty accounts are reviewed and active. New registrations from the registration page will appear here for Principal verification.
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-3.5">
                {pendingFaculty.map((u) => (
                  <div key={u.id} className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 hover:bg-amber-50/70 transition-all flex flex-col justify-between space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-10 h-10 rounded-full bg-amber-100 border border-amber-300 text-amber-800 font-bold flex items-center justify-center shrink-0">
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{u.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                            Dept of {u.department}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{u.designation || 'Faculty Coordinator'} • <span className="font-mono text-slate-700">{u.email}</span></p>
                        {u.phone && <p className="text-[11px] text-slate-500 mt-0.5">Phone: {u.phone}</p>}
                        {u.registeredAt && <p className="text-[10px] text-slate-400 mt-1">Submitted: {u.registeredAt}</p>}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-amber-200/60 flex items-center justify-end gap-2">
                      {isPrincipal ? (
                        <>
                          <button
                            onClick={() => approveFaculty(u.id)}
                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={13} />
                            Approve Registration
                          </button>
                          <button
                            onClick={() => rejectFaculty(u.id)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-amber-700 font-medium">Pending Principal Approval</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. ADD / APPOINT STAFF (Principal: all; Dean: HOD & below; HOD: Faculty) */}
          {canManageStaff && (
            <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4">
              <div className="pb-3 border-b border-gray-100">
                <h3 className="font-bold text-slate-900 text-base">
                  {isPrincipal ? 'Appoint Leadership & Staff (Principal Authority)' :
                   isDean ? 'Add Department Heads & Faculty (Dean Authority)' :
                   `Add Faculty Members (${currentUser.department || 'Department'})`}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isPrincipal ? 'Principal can appoint all institutional leadership, Deans, HODs, and Faculty members.' :
                   isDean ? 'Deans can appoint Department Heads (HODs) and Faculty coordinators.' :
                   `HOD can add Faculty members directly into the Dept of ${currentUser.department || 'Engineering'}.`}
                </p>
              </div>

              <form onSubmit={handleAppointLeadership} className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-slate-700">Appoint Role:</span>
                  <div className="flex gap-2 flex-wrap">
                    {availableRolesToAdd.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setLeadershipForm({
                          ...leadershipForm,
                          role: r,
                          designation: r === 'HOD' ? `Head of Department, ${leadershipForm.department || 'IT'}` :
                                       r === 'Dean' ? 'Dean, Student Welfare' :
                                       r === 'Office Admin' ? 'Administrative Officer' :
                                       'Assistant Professor',
                        })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                          leadershipForm.role === r
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-gray-200 hover:bg-slate-100'
                        }`}
                      >
                        {(r as string) === 'Principal' && '👑 Principal'}
                        {r === 'Dean' && '🎓 Dean'}
                        {r === 'HOD' && '🏢 Head of Department (HOD)'}
                        {r === 'Faculty' && '👤 Faculty'}
                        {r === 'Office Admin' && '💼 Office Admin'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Full Name *</label>
                    <input
                      required
                      value={leadershipForm.name}
                      onChange={(e) => setLeadershipForm({ ...leadershipForm, name: e.target.value })}
                      placeholder="e.g. Dr. Satish Deshmukh"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      {isHod ? 'Department' : leadershipForm.role === 'HOD' ? 'Department Headed *' : 'Department / Assigned Domain'}
                    </label>
                    {isHod ? (
                      <input
                        value={`Dept of ${currentUser.department || 'General'}`}
                        disabled
                        className={`${inputCls} bg-slate-50 text-slate-600 font-semibold cursor-not-allowed`}
                      />
                    ) : leadershipForm.role === 'Principal' ? (
                      <input
                        value="Institutional Master (All Departments)"
                        disabled
                        className={`${inputCls} bg-slate-50 text-slate-500 cursor-not-allowed`}
                      />
                    ) : (
                      <select
                        value={leadershipForm.department}
                        onChange={(e) => setLeadershipForm({
                          ...leadershipForm,
                          department: e.target.value,
                          designation: leadershipForm.role === 'HOD' ? `Head of Department, ${e.target.value}` : leadershipForm.designation,
                        })}
                        className={inputCls}
                      >
                        {(options.departments || ['IT', 'CMPN', 'EXTC', 'MECH', 'CIVIL', 'AIDS', 'HAS']).map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Designation</label>
                    <input
                      value={leadershipForm.designation}
                      onChange={(e) => setLeadershipForm({ ...leadershipForm, designation: e.target.value })}
                      placeholder="e.g. Professor & HOD"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Institutional Email *</label>
                    <input
                      required
                      type="email"
                      value={leadershipForm.email}
                      onChange={(e) => setLeadershipForm({ ...leadershipForm, email: e.target.value })}
                      placeholder={leadershipForm.role === 'HOD' ? 'hod.dept@slrtce.in' : 'faculty@slrtce.in'}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Login Password *</label>
                    <input
                      required
                      type="text"
                      value={leadershipForm.password}
                      onChange={(e) => setLeadershipForm({ ...leadershipForm, password: e.target.value })}
                      placeholder="Password"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number (optional)</label>
                    <input
                      value={leadershipForm.phone}
                      onChange={(e) => setLeadershipForm({ ...leadershipForm, phone: e.target.value })}
                      placeholder="+91 98765 43210"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button type="submit" className={btnPrimary}>
                    <Plus size={15} /> Add {leadershipForm.role}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 3. ACTIVE LEADERSHIP & STAFF DIRECTORY */}
          <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Authorized Leadership & Staff Directory</h3>
                <p className="text-xs text-slate-500 mt-0.5">All active institutional accounts registered in the system</p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <input
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  placeholder="Search staff..."
                  className={`${inputCls} !py-1.5 text-xs w-48`}
                />
                <span className="text-xs font-semibold bg-primary-pale text-primary border border-primary-border px-2.5 py-1 rounded-full">
                  {visibleStaff.length} Accounts
                </span>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['All', 'Principal', 'Dean', 'HOD', 'Faculty'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setStaffRoleFilter(r)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                    staffRoleFilter === r
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-slate-50 text-slate-600 border-gray-200 hover:bg-slate-100'
                  }`}
                >
                  {r} ({r === 'All' ? users.length : users.filter((u) => u.role === r).length})
                </button>
              ))}
            </div>

            {/* Directory items */}
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-card overflow-hidden">
              {visibleStaff.map((u) => {
                const isMe = u.id === currentUser.id;
                const isPending = u.status === 'pending_approval';
                return (
                  <div key={u.id} className="flex flex-wrap items-center justify-between p-4 hover:bg-slate-50/70 transition-colors gap-3">
                    <div className="flex items-start gap-3">
                      <span className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        u.role === 'Principal' ? 'bg-violet-100 text-violet-800 border border-violet-300' :
                        u.role === 'Dean' ? 'bg-blue-100 text-blue-800 border border-blue-300' :
                        u.role === 'HOD' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}>
                        {u.name.charAt(0).toUpperCase()}
                      </span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-slate-900">{u.name}</span>
                          <Badge text={u.role} />
                          {isPending && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              Pending Approval
                            </span>
                          )}
                          {isMe && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                              ● You
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {u.designation} • Dept of {u.department} • <span className="font-mono text-slate-700">{u.email}</span>
                          {u.phone && ` • ${u.phone}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isPrincipal && (
                        <button
                          onClick={() => setEditingStaff(u)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1"
                          title="Edit staff profile"
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                      )}
                      {canRemoveTarget(u) && !isMe && (
                        <button
                          onClick={() => handleRemoveUser(u)}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
                          title="Remove user account"
                        >
                          Remove Account
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {editingStaff && (
            <EditStaffModal
              user={editingStaff}
              onClose={() => setEditingStaff(null)}
              onSaved={handleRefresh}
            />
          )}
        </div>
        </ErrorBoundary>
      )}


      {/* 2. PROFILE TAB */}
      {currentTab === 'profile' && (
        <ErrorBoundary fallbackTitle="User Profile">
          <div className="space-y-6 animate-fade-in">
            <UserProfilePanel currentUser={currentUser} onUpdate={handleRefresh} />
          </div>
        </ErrorBoundary>
      )}

      {/* 3. OPTIONS TAB */}
      {currentTab === 'options' && (
        <ErrorBoundary fallbackTitle="Academic Options">
          <div className="space-y-6 animate-fade-in">
            <AcademicOptionsPanel />
          </div>
        </ErrorBoundary>
      )}

      {/* 4. SMTP SETTINGS TAB */}
      {currentTab === 'smtp' && (
        <ErrorBoundary fallbackTitle="Email & SMTP Settings">
          <div className="space-y-6 animate-fade-in">
            <SmtpSettingsPanel />
          </div>
        </ErrorBoundary>
      )}

      {/* 4. ROLE & AUTH CONTROL TAB */}
      {currentTab === 'auth' && (
        <ErrorBoundary fallbackTitle="Role Permissions Matrix">
          <div className="space-y-6 animate-fade-in">
            {/* Active User Credentials Card */}
            <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <h2 className="font-bold text-slate-900 text-base">Active User Session</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Logged in as <span className="font-semibold text-slate-800">{currentUser.name}</span> ({currentUser.email}) with institutional <span className="font-semibold text-primary">{currentUser.role}</span> privileges.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-pale text-primary border border-primary-border">
                    Active Role: {currentUser.role}
                  </span>
                  {isPrincipal && (
                    <button
                      onClick={() => setTab('leadership')}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary-dark transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Crown size={13} />
                      Manage Leadership & Staff
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Institutional Role Permissions Matrix */}
            <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Institutional Role Permission Matrix</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Defines access boundaries enforced across all modules</p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto scrollbar-thin">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-slate-50 text-slate-600">
                      <th className="py-2.5 px-3 font-semibold">Role</th>
                      <th className="py-2.5 px-3 font-semibold">Proposals Authority</th>
                      <th className="py-2.5 px-3 font-semibold">Resource / Lab Approvals</th>
                      <th className="py-2.5 px-3 font-semibold">Task Delegation</th>
                      <th className="py-2.5 px-3 font-semibold">System & Database</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-1.5"><Badge text="Principal" /></td>
                      <td className="py-3 px-3 text-slate-600">Final institutional sanction; force approve; budget clearance</td>
                      <td className="py-3 px-3 text-slate-600">Full institutional room override</td>
                      <td className="py-3 px-3 text-slate-600">Create & assign tasks across all departments</td>
                      <td className="py-3 px-3 text-emerald-700 font-medium">Full Admin (Staff, DB, Letterhead)</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-1.5"><Badge text="Dean" /></td>
                      <td className="py-3 px-3 text-slate-600">Student welfare & inter-departmental approval stage</td>
                      <td className="py-3 px-3 text-slate-600">View room allocation & clashes</td>
                      <td className="py-3 px-3 text-slate-600">View college tasks & assignments</td>
                      <td className="py-3 px-3 text-slate-500">View audit logs & analytics</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-1.5"><Badge text="HOD" /></td>
                      <td className="py-3 px-3 text-slate-600">First-level departmental proposal endorsement</td>
                      <td className="py-3 px-3 text-slate-600">Approve / reject labs & classrooms owned by department</td>
                      <td className="py-3 px-3 text-slate-600">Assign departmental tasks to faculty</td>
                      <td className="py-3 px-3 text-slate-500">Department reports & directory</td>
                    </tr>
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-semibold text-slate-900 flex items-center gap-1.5"><Badge text="Faculty" /></td>
                      <td className="py-3 px-3 text-slate-600">Draft proposals, request budgets, submit completion reports</td>
                      <td className="py-3 px-3 text-slate-600">Request rooms / seminar halls with clash detection</td>
                      <td className="py-3 px-3 text-slate-600">View & complete assigned tasks</td>
                      <td className="py-3 px-3 text-slate-500">Personal profile & proposal history</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* 5. LETTERHEAD TAB */}
      {currentTab === 'letterhead' && (
        <ErrorBoundary fallbackTitle="College Letterhead">
          <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs space-y-4 animate-fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-slate-900 text-base">College Letterhead Header</h2>
                <p className="text-xs text-slate-500">Appears on every exported PDF and DOCX permission letter.</p>
              </div>
              {!isAdmin && (
                <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                  <Lock size={12} /> Admin Managed
                </span>
              )}
            </div>

            <Field label="College Name">
              <input
                value={letterhead.collegeName}
                onChange={(e) => isAdmin && saveLetterhead({ ...letterhead, collegeName: e.target.value })}
                disabled={!isAdmin}
                className={`${inputCls} ${!isAdmin ? 'bg-slate-50 cursor-not-allowed' : ''}`}
              />
            </Field>
            <Field label="Official Address">
              <textarea
                value={letterhead.address}
                onChange={(e) => isAdmin && saveLetterhead({ ...letterhead, address: e.target.value })}
                disabled={!isAdmin}
                className={`${inputCls} ${!isAdmin ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                rows={2}
              />
            </Field>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Phone">
                <input
                  value={letterhead.phone}
                  onChange={(e) => isAdmin && saveLetterhead({ ...letterhead, phone: e.target.value })}
                  disabled={!isAdmin}
                  className={`${inputCls} ${!isAdmin ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                />
              </Field>
              <Field label="Official Email">
                <input
                  value={letterhead.email}
                  onChange={(e) => isAdmin && saveLetterhead({ ...letterhead, email: e.target.value })}
                  disabled={!isAdmin}
                  className={`${inputCls} ${!isAdmin ? 'bg-slate-50 cursor-not-allowed' : ''}`}
                />
              </Field>
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* 6. AUDIT TAB */}
      {currentTab === 'audit' && (
        <ErrorBoundary fallbackTitle="Audit Trail">
          <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 shadow-xs animate-fade-in">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="font-bold text-slate-900 text-base">Institutional Audit Trail</h2>
                <p className="text-xs text-slate-500">Chronological record of official approvals, edits, and status changes.</p>
              </div>
              <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
                {audit.length} Records
              </span>
            </div>

            <div className="mt-4 max-h-[500px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {audit.map((a) => (
                <div key={a.id} className="border border-gray-100 rounded-card p-3 hover:bg-slate-50/70 transition-colors text-xs sm:text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{a.actorName}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{a.createdAt}</span>
                  </div>
                  <p className="text-slate-600 mt-1">{a.action}</p>
                </div>
              ))}
              {audit.length === 0 && (
                <EmptyState title="No audit records" hint="Actions performed across Docworm will be recorded here." />
              )}
            </div>
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}
