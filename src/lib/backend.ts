// Docworm Supabase backend adapter. Maps app types to docworm_* tables.
// All IDs are opaque strings in the app. In Supabase mode user IDs are auth UUIDs.

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ApprovalStep, Attachment, AuditLog, CompletionReport, Notification,
  Proposal, ProposalComment, ResourceRow, BudgetItem, POMapping, Task, TaskUpdate, User,
} from '../types';

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const nullIfEmpty = (s: string) => (s ? s : null);
const uuidOrNull = (s: string) => (isUuid(s) ? s : null);

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ---------- Row to app ----------

function toUser(r: Record<string, string>): User {
  return {
    id: r.id, name: r.name, designation: r.designation ?? '', department: r.department ?? 'HAS',
    email: r.email, phone: r.phone ?? '', role: (r.role ?? 'Faculty') as User['role'], password: '',
  };
}

export function toProposal(r: Record<string, unknown>, kids: {
  resources: ResourceRow[]; items: BudgetItem[]; pos: POMapping[];
  steps: ApprovalStep[]; attachments: Attachment[];
}): Proposal {
  return {
    id: String(r.id),
    refNo: String(r.ref_no),
    academicYear: String(r.academic_year),
    dateOfRequest: String(r.date_of_request).slice(0, 10),
    eventName: String(r.event_name),
    eventCategory: String(r.event_category),
    organizingBody: String(r.organizing_body),
    startDate: String(r.start_date).slice(0, 10),
    endDate: String(r.end_date).slice(0, 10),
    startTime: String(r.start_time),
    endTime: String(r.end_time),
    purpose: String(r.purpose ?? ''),
    audience: (r.audience ?? []) as string[],
    departments: (r.departments ?? []) as string[],
    years: (r.years ?? []) as string[],
    participants: Number(r.participants ?? 0),
    resources: kids.resources,
    hasBudget: Boolean(r.has_budget),
    budgetHead: String(r.budget_head ?? ''),
    openingBalance: Number(r.opening_balance ?? 0),
    budgetItems: kids.items,
    budgetJustification: String(r.budget_justification ?? ''),
    poMappings: kids.pos,
    attachments: kids.attachments,
    submitterId: String(r.submitter_id ?? ''),
    submitterName: String(r.submitter_name ?? ''),
    submitterDept: String(r.submitter_dept ?? ''),
    status: r.status as Proposal['status'],
    approvalChain: kids.steps,
    createdAt: String(r.created_at ?? '').slice(0, 16).replace('T', ' '),
    updatedAt: String(r.updated_at ?? '').slice(0, 16).replace('T', ' '),
  };
}

// ---------- App to row ----------

function proposalRow(p: Proposal) {
  return {
    id: p.id,
    ref_no: p.refNo,
    academic_year: p.academicYear,
    date_of_request: p.dateOfRequest,
    event_name: p.eventName,
    event_category: p.eventCategory,
    organizing_body: p.organizingBody,
    start_date: p.startDate,
    end_date: p.endDate,
    start_time: p.startTime,
    end_time: p.endTime,
    purpose: p.purpose,
    audience: p.audience,
    departments: p.departments,
    years: p.years,
    participants: p.participants,
    has_budget: p.hasBudget,
    budget_head: p.budgetHead,
    opening_balance: p.openingBalance,
    budget_justification: p.budgetJustification,
    submitter_id: uuidOrNull(p.submitterId),
    submitter_name: p.submitterName,
    submitter_dept: p.submitterDept,
    status: p.status,
    updated_at: new Date().toISOString(),
  };
}

// ---------- Load ----------

export interface Workspace {
  users: User[];
  proposals: Proposal[];
  tasks: Task[];
  comments: ProposalComment[];
  notifications: Notification[];
  audit: AuditLog[];
  completions: Record<string, CompletionReport>;
  options: Record<string, string[]> | null;
  letterhead: Record<string, string> | null;
}

export async function loadWorkspace(sb: SupabaseClient): Promise<Workspace> {
  const [prof, props, tasks, comments, notifs, audits, reports, attach, settings] = await Promise.all([
    sb.from('docworm_profiles').select('*').order('name').limit(500),
    sb.from('docworm_proposals').select('*').order('updated_at', { ascending: false }).limit(500),
    sb.from('docworm_tasks').select('*').order('due_date', { ascending: true }).limit(500),
    sb.from('docworm_comments').select('*').order('created_at', { ascending: false }).limit(1000),
    sb.from('docworm_notifications').select('*').order('created_at', { ascending: false }).limit(300),
    sb.from('docworm_audit_logs').select('*').order('created_at', { ascending: false }).limit(500),
    sb.from('docworm_completion_reports').select('*').limit(500),
    sb.from('docworm_attachments').select('*').limit(1000),
    sb.from('docworm_settings').select('*').eq('id', 1).maybeSingle(),
  ]);
  if (prof.error) throw prof.error;
  if (props.error) throw props.error;

  const users = (prof.data ?? []).map(toUser);
  const propRows = (props.data ?? []) as Record<string, unknown>[];
  const ids = propRows.map((r) => String(r.id));

  let resRows: Record<string, unknown>[] = [];
  let itemRows: Record<string, unknown>[] = [];
  let poRows: Record<string, unknown>[] = [];
  let stepRows: Record<string, unknown>[] = [];
  if (ids.length) {
    const [a, b, c, d] = await Promise.all([
      sb.from('docworm_resources').select('*').in('proposal_id', ids).limit(2000),
      sb.from('docworm_budget_items').select('*').in('proposal_id', ids).limit(2000),
      sb.from('docworm_po_mappings').select('*').in('proposal_id', ids).limit(2000),
      sb.from('docworm_approval_steps').select('*').in('proposal_id', ids).order('step_order').limit(2000),
    ]);
    if (a.error) throw a.error;
    resRows = (a.data ?? []) as Record<string, unknown>[];
    itemRows = (b.data ?? []) as Record<string, unknown>[];
    poRows = (c.data ?? []) as Record<string, unknown>[];
    stepRows = (d.data ?? []) as Record<string, unknown>[];
  }

  const attachByProp: Record<string, Attachment[]> = {};
  ((attach.data ?? []) as Record<string, unknown>[]).forEach((r) => {
    if (!r.proposal_id) return;
    const k = String(r.proposal_id);
    (attachByProp[k] = attachByProp[k] ?? []).push({
      id: String(r.id), name: String(r.name), size: String(r.size_text ?? ''),
      kind: String(r.kind ?? ''), storagePath: String(r.storage_path ?? ''),
    } as Attachment);
  });

  const proposals = propRows.map((r) => {
    const pid = String(r.id);
    return toProposal(r, {
      resources: resRows.filter((x) => String(x.proposal_id) === pid).map((x) => ({
        id: String(x.id), resourceType: String(x.resource_type), roomNo: String(x.room_no ?? ''),
        ownerDept: String(x.owner_dept), date: String(x.date).slice(0, 10),
        startTime: String(x.start_time), endTime: String(x.end_time),
        status: x.status as ResourceRow['status'],
        decidedBy: String(x.decided_by ?? '') || undefined,
        decidedAt: String(x.decided_at ?? '') || undefined,
        remark: String(x.remark ?? '') || undefined,
      })),
      items: itemRows.filter((x) => String(x.proposal_id) === pid).map((x) => ({
        id: String(x.id), item: String(x.item ?? ''), category: String(x.category ?? ''),
        quantity: Number(x.quantity ?? 1), unitCost: Number(x.unit_cost ?? 0),
      })),
      pos: poRows.filter((x) => String(x.proposal_id) === pid).map((x) => ({
        po: String(x.po), explanation: String(x.explanation ?? ''),
      })),
      steps: stepRows.filter((x) => String(x.proposal_id) === pid).map((x) => ({
        id: String(x.id), role: String(x.role), userId: String(x.user_id ?? ''),
        userName: String(x.user_name ?? ''), action: x.action as ApprovalStep['action'],
        actedAt: String(x.acted_at ?? '') || undefined,
        remark: String(x.remark ?? '') || undefined,
      })),
      attachments: attachByProp[pid] ?? [],
    });
  });

  const taskRows = ((tasks.data ?? []) as Record<string, unknown>[]);
  const taskIds = taskRows.map((r) => String(r.id));
  let assigneeRows: Record<string, unknown>[] = [];
  let updateRows: Record<string, unknown>[] = [];
  let taskAttach: Record<string, Attachment[]> = {};
  if (taskIds.length) {
    const [a, u] = await Promise.all([
      sb.from('docworm_task_assignees').select('*').in('task_id', taskIds).limit(2000),
      sb.from('docworm_task_updates').select('*').in('task_id', taskIds).order('created_at', { ascending: false }).limit(2000),
    ]);
    if (a.error) throw a.error;
    assigneeRows = (a.data ?? []) as Record<string, unknown>[];
    updateRows = (u.data ?? []) as Record<string, unknown>[];
    ((attach.data ?? []) as Record<string, unknown>[]).forEach((r) => {
      if (!r.task_id) return;
      const k = String(r.task_id);
      (taskAttach[k] = taskAttach[k] ?? []).push({
        id: String(r.id), name: String(r.name), size: String(r.size_text ?? ''),
        kind: String(r.kind ?? ''),
      });
    });
  }
  const taskList: Task[] = taskRows.map((r) => {
    const tid = String(r.id);
    return {
      id: tid,
      title: String(r.title),
      description: String(r.description ?? ''),
      taskType: String(r.task_type),
      priority: String(r.priority),
      assignedBy: String(r.assigned_by ?? ''),
      assignedByName: String(r.assigned_by_name ?? ''),
      assignedTo: assigneeRows.filter((a) => String(a.task_id) === tid).map((a) => String(a.user_id)),
      assignedDate: String(r.assigned_date).slice(0, 10),
      dueDate: String(r.due_date).slice(0, 10),
      completionDate: r.completion_date ? String(r.completion_date).slice(0, 10) : undefined,
      status: r.status as Task['status'],
      attachments: taskAttach[tid] ?? [],
      updates: updateRows.filter((x) => String(x.task_id) === tid).map((x) => ({
        id: String(x.id), text: String(x.text), userId: String(x.user_id ?? ''),
        userName: String(x.user_name ?? ''), createdAt: String(x.created_at ?? '').slice(0, 16).replace('T', ' '),
        statusAfter: String(x.status_after ?? '') || undefined,
      } as TaskUpdate)),
      extendReason: String(r.extend_reason ?? '') || undefined,
    };
  });

  const completions: Record<string, CompletionReport> = {};
  ((reports.data ?? []) as Record<string, unknown>[]).forEach((r) => {
    const pid = String(r.proposal_id);
    completions[pid] = {
      proposalId: pid,
      done: Boolean(r.done),
      actualDate: r.actual_date ? String(r.actual_date).slice(0, 10) : '',
      actualParticipants: String(r.actual_participants ?? ''),
      actualExpenditure: String(r.actual_expenditure ?? ''),
      outcome: String(r.outcome ?? ''),
      photos: (r.photos ?? []) as string[],
      posAchieved: (r.pos_achieved ?? []) as string[],
      reasonIfNotDone: String(r.reason_if_not_done ?? ''),
      submittedAt: r.submitted_at ? String(r.submitted_at).slice(0, 16).replace('T', ' ') : undefined,
      submittedBy: String(r.submitted_by ?? '') || undefined,
    };
  });

  return {
    users,
    proposals,
    tasks: taskList,
    comments: ((comments.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id), proposalId: String(r.proposal_id), userId: String(r.user_id ?? ''),
      userName: String(r.user_name ?? ''), text: String(r.text),
      createdAt: String(r.created_at ?? '').slice(0, 16).replace('T', ' '),
    })),
    notifications: ((notifs.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id), userId: String(r.user_id), title: String(r.title),
      body: String(r.body ?? ''), link: String(r.link ?? ''), read: Boolean(r.read),
      createdAt: String(r.created_at ?? '').slice(0, 16).replace('T', ' '),
    })),
    audit: ((audits.data ?? []) as Record<string, unknown>[]).map((r) => ({
      id: String(r.id), actorId: String(r.actor_id ?? ''), actorName: String(r.actor_name ?? ''),
      action: String(r.action), entity: String(r.entity ?? ''), entityId: String(r.entity_id ?? ''),
      createdAt: String(r.created_at ?? '').slice(0, 16).replace('T', ' '),
    })),
    completions,
    options: (settings.data as Record<string, unknown> | null)?.options as Record<string, string[]> ?? null,
    letterhead: (settings.data as Record<string, unknown> | null)?.letterhead as Record<string, string> ?? null,
  };
}

// ---------- Writes ----------

export async function nextRefNumber(sb: SupabaseClient, year: string): Promise<number> {
  const { data, error } = await sb.rpc('docworm_next_ref_number', { p_year: year });
  if (error) throw error;
  return data as number;
}

export async function persistProposal(sb: SupabaseClient, p: Proposal): Promise<void> {
  const { error } = await sb.from('docworm_proposals').upsert(proposalRow(p), { onConflict: 'id' });
  if (error) throw error;
  await Promise.all([
    sb.from('docworm_resources').delete().eq('proposal_id', p.id),
    sb.from('docworm_budget_items').delete().eq('proposal_id', p.id),
    sb.from('docworm_po_mappings').delete().eq('proposal_id', p.id),
    sb.from('docworm_approval_steps').delete().eq('proposal_id', p.id),
  ]);
  const ops: PromiseLike<{ error: unknown }>[] = [];
  if (p.resources.length) {
    ops.push(sb.from('docworm_resources').insert(p.resources.map((r) => ({
      id: r.id, proposal_id: p.id, resource_type: r.resourceType, room_no: r.roomNo,
      owner_dept: r.ownerDept, date: r.date, start_time: r.startTime, end_time: r.endTime,
      status: r.status, decided_by: r.decidedBy ?? '', decided_at: r.decidedAt ?? '', remark: r.remark ?? '',
    }))) as unknown as PromiseLike<{ error: unknown }>);
  }
  if (p.budgetItems.length) {
    ops.push(sb.from('docworm_budget_items').insert(p.budgetItems.map((b) => ({
      id: b.id, proposal_id: p.id, item: b.item, category: b.category,
      quantity: b.quantity, unit_cost: b.unitCost,
    }))) as unknown as PromiseLike<{ error: unknown }>);
  }
  if (p.poMappings.length) {
    ops.push(sb.from('docworm_po_mappings').insert(p.poMappings.map((m) => ({
      proposal_id: p.id, po: m.po, explanation: m.explanation,
    }))) as unknown as PromiseLike<{ error: unknown }>);
  }
  if (p.approvalChain.length) {
    ops.push(sb.from('docworm_approval_steps').insert(p.approvalChain.map((s, i) => ({
      id: s.id, proposal_id: p.id, step_order: i, role: s.role,
      user_id: uuidOrNull(s.userId), user_name: s.userName, action: s.action,
      acted_at: s.actedAt ?? '', remark: s.remark ?? '',
    }))) as unknown as PromiseLike<{ error: unknown }>);
  }
  const results = await Promise.all(ops);
  for (const r of results) {
    if (r.error) throw r.error;
  }
}

export async function persistTask(sb: SupabaseClient, t: Task): Promise<void> {
  const { error } = await sb.from('docworm_tasks').upsert({
    id: t.id, title: t.title, description: t.description, task_type: t.taskType,
    priority: t.priority, assigned_by: uuidOrNull(t.assignedBy), assigned_by_name: t.assignedByName,
    assigned_date: t.assignedDate, due_date: t.dueDate, completion_date: nullIfEmpty(t.completionDate ?? ''),
    status: t.status, extend_reason: t.extendReason ?? '',
  }, { onConflict: 'id' });
  if (error) throw error;
  await sb.from('docworm_task_assignees').delete().eq('task_id', t.id);
  if (t.assignedTo.length) {
    const valid = t.assignedTo.filter(isUuid);
    if (valid.length) {
      const { error: e2 } = await sb.from('docworm_task_assignees').insert(valid.map((u) => ({ task_id: t.id, user_id: u })));
      if (e2) throw e2;
    }
  }
  if (t.updates.length) {
    const { error: e3 } = await sb.from('docworm_task_updates').upsert(t.updates.map((u) => ({
      id: u.id, task_id: t.id, text: u.text, user_id: uuidOrNull(u.userId),
      user_name: u.userName, status_after: u.statusAfter ?? '',
    })), { onConflict: 'id' });
    if (e3) throw e3;
  }
}

export async function insertComment(sb: SupabaseClient, c: ProposalComment): Promise<void> {
  const { error } = await sb.from('docworm_comments').insert({
    id: c.id, proposal_id: c.proposalId, user_id: uuidOrNull(c.userId),
    user_name: c.userName, text: c.text,
  });
  if (error) throw error;
}

export async function insertNotification(sb: SupabaseClient, n: Notification): Promise<void> {
  if (!isUuid(n.userId)) return;
  const { error } = await sb.from('docworm_notifications').insert({
    id: n.id, user_id: n.userId, title: n.title, body: n.body, link: n.link, read: n.read,
  });
  if (error) throw error;
  // Fire and forget email hook. Never blocks the UI.
  sb.functions.invoke('notify', { body: { notification_id: n.id } }).catch(() => undefined);
}

export async function insertAudit(sb: SupabaseClient, a: AuditLog): Promise<void> {
  const { error } = await sb.from('docworm_audit_logs').insert({
    id: a.id, actor_id: uuidOrNull(a.actorId), actor_name: a.actorName,
    action: a.action, entity: a.entity, entity_id: a.entityId,
  });
  if (error) throw error;
}

export async function upsertCompletion(sb: SupabaseClient, c: CompletionReport): Promise<void> {
  const { error } = await sb.from('docworm_completion_reports').upsert({
    proposal_id: c.proposalId, done: c.done,
    actual_date: nullIfEmpty(c.actualDate), actual_participants: c.actualParticipants,
    actual_expenditure: c.actualExpenditure, outcome: c.outcome, photos: c.photos,
    pos_achieved: c.posAchieved, reason_if_not_done: c.reasonIfNotDone,
    submitted_at: new Date().toISOString(), submitted_by: c.submittedBy ?? '',
  }, { onConflict: 'proposal_id' });
  if (error) throw error;
}

export async function upsertSettings(sb: SupabaseClient, options: unknown, letterhead: unknown): Promise<void> {
  const { error } = await sb.from('docworm_settings').upsert(
    { id: 1, options, letterhead, updated_at: new Date().toISOString() },
    { onConflict: 'id' },
  );
  if (error) throw error;
}

export async function upsertProfile(sb: SupabaseClient, u: User): Promise<void> {
  if (!isUuid(u.id)) return;
  const { error } = await sb.from('docworm_profiles').upsert({
    id: u.id, email: u.email, name: u.name, designation: u.designation,
    department: u.department, phone: u.phone, role: u.role, must_change_password: false,
  }, { onConflict: 'id' });
  if (error) throw error;
}

// ---------- Storage ----------

const ALLOWED = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/png', 'image/jpeg', 'image/webp'];
const MAX_BYTES = 10 * 1024 * 1024;

export async function uploadAttachment(
  sb: SupabaseClient, userId: string, file: File,
): Promise<{ name: string; size: string; kind: string; storagePath: string }> {
  if (!ALLOWED.includes(file.type)) throw new Error('Only PDF, DOC, DOCX, PNG, JPG, WEBP files are allowed.');
  if (file.size > MAX_BYTES) throw new Error('File is larger than the 10 MB limit.');
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${userId}/${Date.now()}-${safe}`;
  const { error } = await sb.storage.from('docworm-attachments').upload(path, file, { contentType: file.type });
  if (error) throw error;
  return { name: file.name, size: fmtSize(file.size), kind: file.type.includes('pdf') ? 'PDF' : file.type.includes('word') ? 'DOC' : 'Image', storagePath: path };
}

export async function signedDownloadUrl(sb: SupabaseClient, path: string): Promise<string> {
  const { data, error } = await sb.storage.from('docworm-attachments').createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function insertAttachmentMeta(
  sb: SupabaseClient, a: { id: string; proposalId?: string; taskId?: string; name: string; size: string; kind: string; storagePath: string; uploadedBy: string },
): Promise<void> {
  const { error } = await sb.from('docworm_attachments').insert({
    id: a.id, proposal_id: a.proposalId ?? null, task_id: a.taskId ?? null,
    name: a.name, size_text: a.size, kind: a.kind, storage_path: a.storagePath,
    uploaded_by: uuidOrNull(a.uploadedBy),
  });
  if (error) throw error;
}
