import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Eye, Save } from 'lucide-react';
import { useData, nowStr } from '../store';
import { DEFAULT_OPTIONS, PO_LIST, currentAcademicYear } from '../config';
import type { Proposal } from '../types';
import { AttachmentUploader, Badge, EmptyState, ExportMenu, Field, Modal, btnGhost, btnPrimary, inputCls } from '../components';
import { REPORT_COLS, budgetTotals, exportCSV, exportLetterDOCX, exportLetterPDF, exportPDF, exportXLSX, flattenReport, letterPlainText } from '../utils';

const STEPS = ['Basics', 'Resources', 'Budget', 'PO Mapping', 'Review and Submit'];

interface Draft extends Record<string, unknown> {
  eventName?: string; eventCategory?: string; organizingBody?: string;
  startDate?: string; endDate?: string; startTime?: string; endTime?: string;
  purpose?: string; audience?: string[]; departments?: string[]; years?: string[];
  participants?: number; resources?: Proposal['resources'];
  hasBudget?: boolean; budgetHead?: string; openingBalance?: number;
  budgetItems?: Proposal['budgetItems']; budgetJustification?: string;
  poMappings?: Proposal['poMappings']; academicYear?: string;
}

export function ProposalForm() {
  const { options, currentUser, proposals, saveProposals, pushAudit, pushNotification, users, getNextRefNumber } = useData();
  const { id: editId } = useParams();
  const editing = proposals.find((p) => p.id === editId);
  const canEdit = editing && editing.submitterId === currentUser.id && ['Draft', 'Changes Requested'].includes(editing.status);
  const [saving, setSaving] = useState(false);
  const nav = useNavigate();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const draftKey = editId ? `docworm:draft:${editId}` : 'docworm:draft:new';
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) return JSON.parse(raw);
    } catch { /* noop */ }
    if (editing) {
      return {
        academicYear: editing.academicYear, eventCategory: editing.eventCategory,
        organizingBody: editing.organizingBody, startDate: editing.startDate, endDate: editing.endDate,
        startTime: editing.startTime, endTime: editing.endTime, audience: editing.audience,
        departments: editing.departments, years: editing.years, participants: editing.participants,
        resources: editing.resources.map((r) => ({ ...r, status: 'Pending' as const })),
        hasBudget: editing.hasBudget, budgetHead: editing.budgetHead, openingBalance: editing.openingBalance,
        budgetItems: editing.budgetItems, budgetJustification: editing.budgetJustification,
        poMappings: editing.poMappings, purpose: editing.purpose, eventName: editing.eventName,
      };
    }
    return {
      academicYear: currentAcademicYear(), eventCategory: 'Technical', organizingBody: 'Department',
      startDate: new Date().toISOString().slice(0, 10), endDate: new Date().toISOString().slice(0, 10),
      startTime: '09:00', endTime: '17:00', audience: ['Students'], departments: [currentUser.department],
      years: ['SY'], participants: 50, resources: [], hasBudget: false, openingBalance: 0,
      budgetItems: [], poMappings: [], purpose: '', eventName: '',
    };
  });
  useEffect(() => { localStorage.setItem(draftKey, JSON.stringify(draft)); }, [draft, draftKey]);
  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));

  if (editId && !canEdit) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/proposals" className="text-sm text-primary font-semibold inline-flex items-center gap-1"><ArrowLeft size={15} /> Back to proposals</Link>
        <EmptyState title="Cannot edit this proposal" hint="Only the submitter can edit, and only while it is a draft or changes were requested." />
      </div>
    );
  }

  const toggleMulti = (key: 'audience' | 'departments' | 'years', v: string) => {
    const arr = [...((draft[key] as string[]) ?? [])];
    set(key, arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  };

  const budget = useMemo(() => {
    const items = draft.budgetItems ?? [];
    const total = items.reduce((s, r) => s + r.quantity * r.unitCost, 0);
    return { total, closing: (draft.openingBalance ?? 0) - total };
  }, [draft]);

  const validate = (s: number): boolean => {
    const e: Record<string, string> = {};
    if (s === 0) {
      if (!draft.eventName?.trim()) e.eventName = 'Event name is required.';
      if (!draft.startDate) e.startDate = 'Start date is required.';
      if (!draft.endDate) e.endDate = 'End date is required.';
      if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) e.endDate = 'End date cannot be before start date.';
      if (!((draft.purpose as string) ?? '').trim()) e.purpose = 'Purpose is required.';
      else if ((draft.purpose as string).length < 30) e.purpose = 'Please add a little more detail, at least 30 characters.';
      if (!draft.participants || draft.participants < 1) e.participants = 'Expected participants must be at least 1.';
      if (!(draft.departments ?? []).length) e.departments = 'Select at least one department.';
      const aud = (draft.audience as string[]) ?? [];
      if (!aud.length) e.audience = 'Select at least one audience.';
      else if (aud.includes('Other') && !aud.some((x) => x.startsWith('Other ('))) e.audienceOther = 'Please specify the other audience.';
    }
    if (s === 2 && draft.hasBudget) {
      if (!draft.budgetHead) e.budgetHead = 'Choose a budget head.';
      if (budget.closing < 0 && !(draft.budgetJustification as string)?.trim()) e.budgetJustification = 'Closing balance is negative, a justification is required to submit.';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildProposal = async (status: Proposal['status']): Promise<Proposal> => {
    const cell = (draft.departments as string[])?.[0] ?? currentUser.department;
    const cat = (draft.eventCategory as string) ?? 'General';
    const year = (draft.academicYear as string) ?? currentAcademicYear();
    const refNo = await getNextRefNumber(cell, cat, year);
    const principal = users.find((u) => u.role === 'Principal');
    return {
      id: `p-${Date.now().toString(36)}`,
      refNo,
      academicYear: (draft.academicYear as string) ?? currentAcademicYear(),
      dateOfRequest: new Date().toISOString().slice(0, 10),
      eventName: (draft.eventName as string) ?? 'Untitled event',
      eventCategory: (draft.eventCategory as string) ?? 'Technical',
      organizingBody: (draft.organizingBody as string) ?? 'Department',
      startDate: (draft.startDate as string) ?? '',
      endDate: (draft.endDate as string) ?? (draft.startDate as string) ?? '',
      startTime: (draft.startTime as string) ?? '09:00',
      endTime: (draft.endTime as string) ?? '17:00',
      purpose: (draft.purpose as string) ?? '',
      audience: (draft.audience as string[]) ?? [],
      departments: (draft.departments as string[]) ?? [],
      years: (draft.years as string[]) ?? [],
      participants: Number(draft.participants ?? 0),
      resources: (draft.resources as Proposal['resources']) ?? [],
      hasBudget: Boolean(draft.hasBudget),
      budgetHead: (draft.budgetHead as string) ?? '',
      openingBalance: Number(draft.openingBalance ?? 0),
      budgetItems: (draft.budgetItems as Proposal['budgetItems']) ?? [],
      budgetJustification: (draft.budgetJustification as string) ?? '',
      poMappings: (draft.poMappings as Proposal['poMappings']) ?? [],
      attachments: [],
      submitterId: currentUser.id,
      submitterName: currentUser.name,
      submitterDept: currentUser.department,
      status,
      approvalChain: [
        { id: 's1', role: 'Submitter', userId: currentUser.id, userName: currentUser.name, action: status === 'Draft' ? 'Pending' : 'Approved', actedAt: status === 'Draft' ? undefined : nowStr(), remark: status === 'Draft' ? undefined : 'Submitted for approval' },
        { id: 's2', role: 'HOD', userId: currentUser.id, userName: currentUser.name, action: 'Pending' },
        ...(draft.organizingBody === 'SWDC' ? [{ id: 's3', role: 'Dean', userId: '', userName: 'Dean SWDC', action: 'Pending' as const }] : []),
        { id: 's4', role: 'Principal', userId: principal?.id ?? '', userName: principal?.name ?? 'Principal', action: 'Pending' },
      ],
      createdAt: nowStr(),
      updatedAt: nowStr(),
    };
  };

  const save = async (status: Proposal['status']) => {
    if (status !== 'Draft' && !(validate(0) && validate(2))) { setStep(0); return; }
    setSaving(true);
    try {
      if (editing && canEdit) {
        const fresh = await buildProposal(status);
        const updated: Proposal = {
          ...fresh,
          id: editing.id,
          refNo: editing.refNo,
          dateOfRequest: editing.dateOfRequest,
          createdAt: editing.createdAt,
          attachments: editing.attachments,
          submitterId: editing.submitterId,
          submitterName: editing.submitterName,
          submitterDept: editing.submitterDept,
          // Resubmission reopens every review step so approvers see the new version.
          approvalChain: fresh.approvalChain,
          updatedAt: nowStr(),
        };
        saveProposals(proposals.map((x) => x.id === editing.id ? updated : x));
        pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `${status === 'Draft' ? 'Updated draft' : 'Resubmitted proposal'} ${updated.refNo}`, entity: 'Proposal', entityId: updated.id });
        localStorage.removeItem(draftKey);
        nav(`/proposals/${updated.id}`);
        return;
      }
      const p = await buildProposal(status);
      saveProposals([p, ...proposals]);
      pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `${status === 'Draft' ? 'Saved draft' : 'Submitted proposal'} ${p.refNo}`, entity: 'Proposal', entityId: p.id });
      localStorage.removeItem(draftKey);
      nav(`/proposals/${p.id}`);
    } finally {
      setSaving(false);
    }
  };

  const addResource = () => set('resources', [...(draft.resources ?? []), { id: `r-${Date.now()}`, resourceType: 'Classroom', roomNo: '', ownerDept: options.departments[0], date: draft.startDate, startTime: '09:00', endTime: '11:00', status: 'Pending' as const }]);
  const addItem = () => set('budgetItems', [...(draft.budgetItems ?? []), { id: `b-${Date.now()}`, item: '', category: options.expenseCategories[0], quantity: 1, unitCost: 0 }]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <Link to={editing ? `/proposals/${editing.id}` : '/proposals'} className="text-sm text-primary font-semibold inline-flex items-center gap-1"><ArrowLeft size={15} /> {editing ? 'Back to proposal' : 'Back to proposals'}</Link>
      <div>
        <p className="text-xs text-slate-500">{editing ? `Editing ${editing.refNo}, draft auto-saves in this browser` : 'New proposal, draft auto-saves in this browser'}</p>
        <h1 className="text-2xl font-bold">{editing ? 'Edit permission request' : 'Create permission request'}</h1>
      </div>
      <div className="bg-white border border-gray-200 rounded-card p-4">
        <ol className="flex flex-wrap gap-2" aria-label="Form progress">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <button onClick={() => setStep(i)} className={`w-7 h-7 rounded-full text-xs font-bold ${i === step ? 'bg-primary text-white' : i < step ? 'bg-primary-light text-primary-dark' : 'bg-gray-100 text-slate-500'}`} aria-current={i === step ? 'step' : undefined}>{i + 1}</button>
              <span className={`text-xs font-semibold ${i === step ? 'text-primary-dark' : 'text-slate-500'}`}>{s}</span>
              {i < STEPS.length - 1 && <span className="w-6 h-px bg-gray-200 mx-1" />}
            </li>
          ))}
        </ol>
        <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div>
      </div>

      <div className="bg-white border border-gray-200 rounded-card p-5 sm:p-6 space-y-4">
        {step === 0 && (
          <>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Reference number (auto-generated on submit)" hint="Format: SLRTCE/CELL OR DEPT/CATEGORY/running number">
                <input disabled value={editing ? editing.refNo : 'SLRTCE/.../auto on submit'} className={`${inputCls} bg-gray-50`} />
              </Field>
              <Field label="Academic year">
                <select value={draft.academicYear as string} onChange={(e) => set('academicYear', e.target.value)} className={inputCls}>
                  {options.academicYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Event name" error={errors.eventName}>
              <input value={(draft.eventName as string) ?? ''} onChange={(e) => set('eventName', e.target.value)} className={inputCls} placeholder="Example: Internal Hackathon" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Event category">
                <select value={draft.eventCategory as string} onChange={(e) => set('eventCategory', e.target.value)} className={inputCls}>
                  {options.eventCategories.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Organizing body">
                <select value={draft.organizingBody as string} onChange={(e) => set('organizingBody', e.target.value)} className={inputCls}>
                  {options.organizingBodies.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
            </div>
            <div className="grid sm:grid-cols-4 gap-4">
              <Field label="Start date" error={errors.startDate}><input type="date" value={draft.startDate as string} onChange={(e) => set('startDate', e.target.value)} className={inputCls} /></Field>
              <Field label="End date" error={errors.endDate}><input type="date" value={draft.endDate as string} onChange={(e) => set('endDate', e.target.value)} className={inputCls} /></Field>
              <Field label="Start time"><input type="time" value={draft.startTime as string} onChange={(e) => set('startTime', e.target.value)} className={inputCls} /></Field>
              <Field label="End time"><input type="time" value={draft.endTime as string} onChange={(e) => set('endTime', e.target.value)} className={inputCls} /></Field>
            </div>
            <Field label={`Purpose and justification (${((draft.purpose as string) ?? '').length} chars)`} error={errors.purpose}>
              <textarea value={(draft.purpose as string) ?? ''} onChange={(e) => set('purpose', e.target.value)} rows={4} maxLength={2000} className={inputCls} placeholder="Why this event, who benefits, expected outcomes" />
            </Field>
            <div className="grid sm:grid-cols-2 gap-4">
              <fieldset>
                <legend className="text-sm font-medium">Target audience</legend>
                {errors.audience && <p className="text-xs text-red-600 mt-1">{errors.audience}</p>}
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {options.audiences.map((a) => {
                    const aud = (draft.audience as string[]) ?? [];
                    const selected = a === 'Other'
                      ? aud.some((x) => x === 'Other' || x.startsWith('Other ('))
                      : aud.includes(a);
                    return (
                      <button type="button" key={a} onClick={() => {
                        if (a === 'Other') {
                          set('audience', selected ? aud.filter((x) => x !== 'Other' && !x.startsWith('Other (')) : [...aud, 'Other']);
                        } else {
                          toggleMulti('audience', a);
                        }
                      }} className={`px-2.5 py-1.5 text-xs font-medium rounded-md border ${selected ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'}`}>{a}</button>
                    );
                  })}
                </div>
                {((draft.audience as string[]) ?? []).some((x) => x === 'Other' || x.startsWith('Other (')) && (
                  <Field label="Specify other audience (required)" error={errors.audienceOther}>
                    <input
                      value={(((draft.audience as string[]) ?? []).find((x) => x.startsWith('Other (')) ?? '').replace(/^Other \(/, '').replace(/\)$/, '')}
                      onChange={(e) => {
                        const aud = ((draft.audience as string[]) ?? []).filter((x) => x !== 'Other' && !x.startsWith('Other ('));
                        const t = e.target.value.trim();
                        set('audience', t ? [...aud, `Other (${t})`] : [...aud, 'Other']);
                      }}
                      className={inputCls}
                      placeholder="Example: Parents of FY students"
                    />
                  </Field>
                )}
              </fieldset>
              <fieldset>
                <legend className="text-sm font-medium">Years</legend>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {options.years.map((a) => (
                    <button type="button" key={a} onClick={() => toggleMulti('years', a)} className={`px-2.5 py-1.5 text-xs font-medium rounded-md border ${(draft.years as string[])?.includes(a) ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'}`}>{a}</button>
                  ))}
                </div>
              </fieldset>
            </div>
            <fieldset>
              <legend className="text-sm font-medium">Departments involved</legend>
              {errors.departments && <p className="text-xs text-red-600">{errors.departments}</p>}
              <div className="mt-1 flex flex-wrap gap-1.5">
                {options.departments.map((a) => (
                  <button type="button" key={a} onClick={() => toggleMulti('departments', a)} className={`px-2.5 py-1.5 text-xs font-medium rounded-md border ${(draft.departments as string[])?.includes(a) ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300'}`}>{a}</button>
                ))}
              </div>
            </fieldset>
            <Field label="Expected participants" error={errors.participants}>
              <input type="number" min={1} value={draft.participants as number} onChange={(e) => set('participants', Number(e.target.value))} className={`${inputCls} max-w-48`} />
            </Field>
          </>
        )}

        {step === 1 && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Resources required</h2>
              <button onClick={addResource} className={btnGhost}>Add row</button>
            </div>
            <p className="text-sm text-slate-500">Rows owned by other departments become separate sub-requests to each HOD.</p>
            {(draft.resources ?? []).length === 0 && <EmptyState title="No resources added" hint="Add classrooms, labs, halls, or equipment rows." />}
            {(draft.resources ?? []).map((r, i) => (
              <div key={r.id} className="border border-gray-200 rounded-card p-3 grid sm:grid-cols-6 gap-2">
                <select value={r.resourceType} onChange={(e) => { const arr = [...(draft.resources ?? [])]; arr[i] = { ...r, resourceType: e.target.value }; set('resources', arr); }} className={inputCls} aria-label="Resource type">
                  {options.resourceTypes.map((t) => <option key={t}>{t}</option>)}
                </select>
                <input value={r.roomNo} onChange={(e) => { const arr = [...(draft.resources ?? [])]; arr[i] = { ...r, roomNo: e.target.value }; set('resources', arr); }} placeholder="Room or lab no" className={inputCls} aria-label="Room number" />
                <select value={r.ownerDept} onChange={(e) => { const arr = [...(draft.resources ?? [])]; arr[i] = { ...r, ownerDept: e.target.value }; set('resources', arr); }} className={inputCls} aria-label="Owner department">
                  {options.departments.map((t) => <option key={t}>{t}</option>)}
                </select>
                <input type="date" value={r.date} onChange={(e) => { const arr = [...(draft.resources ?? [])]; arr[i] = { ...r, date: e.target.value }; set('resources', arr); }} className={inputCls} aria-label="Resource date" />
                <input type="time" value={r.startTime} onChange={(e) => { const arr = [...(draft.resources ?? [])]; arr[i] = { ...r, startTime: e.target.value }; set('resources', arr); }} className={inputCls} aria-label="Start time" />
                <div className="flex gap-1">
                  <input type="time" value={r.endTime} onChange={(e) => { const arr = [...(draft.resources ?? [])]; arr[i] = { ...r, endTime: e.target.value }; set('resources', arr); }} className={inputCls} aria-label="End time" />
                  <button onClick={() => set('resources', (draft.resources ?? []).filter((x) => x.id !== r.id))} className="px-2 text-red-600 text-sm" aria-label="Remove row">Remove</button>
                </div>
              </div>
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <label className="flex items-center gap-3 bg-primary-pale border border-primary-border rounded-card p-3">
              <input type="checkbox" checked={Boolean(draft.hasBudget)} onChange={(e) => set('hasBudget', e.target.checked)} className="w-4 h-4 accent-[#6D4AFF]" />
              <span className="text-sm font-semibold">This event has a budget</span>
            </label>
            {draft.hasBudget && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Budget head" error={errors.budgetHead}>
                    <select value={(draft.budgetHead as string) ?? ''} onChange={(e) => set('budgetHead', e.target.value)} className={inputCls}>
                      <option value="">Select head</option>
                      {options.budgetHeads.map((h) => <option key={h}>{h}</option>)}
                    </select>
                  </Field>
                  <Field label="Opening balance (Rs.)">
                    <input type="number" min={0} value={draft.openingBalance as number} onChange={(e) => set('openingBalance', Number(e.target.value))} className={inputCls} />
                  </Field>
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Expense table</h3>
                  <button onClick={addItem} className={btnGhost}>Add expense</button>
                </div>
                {(draft.budgetItems ?? []).map((b, i) => (
                  <div key={b.id} className="grid sm:grid-cols-6 gap-2 border border-gray-200 rounded-card p-3">
                    <input value={b.item} onChange={(e) => { const arr = [...(draft.budgetItems ?? [])]; arr[i] = { ...b, item: e.target.value }; set('budgetItems', arr); }} placeholder="Item" className={`${inputCls} sm:col-span-2`} aria-label="Expense item" />
                    <select value={b.category} onChange={(e) => { const arr = [...(draft.budgetItems ?? [])]; arr[i] = { ...b, category: e.target.value }; set('budgetItems', arr); }} className={inputCls} aria-label="Expense category">
                      {options.expenseCategories.map((c) => <option key={c}>{c}</option>)}
                    </select>
                    <input type="number" min={1} value={b.quantity} onChange={(e) => { const arr = [...(draft.budgetItems ?? [])]; arr[i] = { ...b, quantity: Number(e.target.value) }; set('budgetItems', arr); }} className={inputCls} aria-label="Quantity" />
                    <input type="number" min={0} value={b.unitCost} onChange={(e) => { const arr = [...(draft.budgetItems ?? [])]; arr[i] = { ...b, unitCost: Number(e.target.value) }; set('budgetItems', arr); }} className={inputCls} aria-label="Unit cost" />
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold">Rs. {b.quantity * b.unitCost}</span>
                      <button onClick={() => set('budgetItems', (draft.budgetItems ?? []).filter((x) => x.id !== b.id))} className="text-red-600" aria-label="Remove expense">Remove</button>
                    </div>
                  </div>
                ))}
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="border border-gray-200 rounded-card p-3"><p className="text-slate-500">Total expenses</p><p className="font-bold text-lg">Rs. {budget.total}</p></div>
                  <div className={`border rounded-card p-3 ${budget.closing < 0 ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}><p className="text-slate-500">Closing balance</p><p className={`font-bold text-lg ${budget.closing < 0 ? 'text-red-700' : ''}`}>Rs. {budget.closing}</p></div>
                  <div className="border border-gray-200 rounded-card p-3"><p className="text-slate-500">Opening</p><p className="font-bold text-lg">Rs. {draft.openingBalance as number}</p></div>
                </div>
                {budget.closing < 0 && (
                  <Field label="Justification for negative balance (required)" error={errors.budgetJustification}>
                    <textarea value={(draft.budgetJustification as string) ?? ''} onChange={(e) => set('budgetJustification', e.target.value)} rows={3} className={inputCls} placeholder="Explain how the deficit will be covered" />
                  </Field>
                )}
              </>
            )}
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="font-semibold">PO mapping</h2>
            <p className="text-sm text-slate-500">Select POs and explain the mapping. Hover a PO code to see its full name.</p>
            <div className="space-y-2">
              {PO_LIST.map((po) => {
                const existing = (draft.poMappings as Proposal['poMappings'])?.find((m) => m.po === po.code);
                return (
                  <div key={po.code} className="border border-gray-200 rounded-card p-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={Boolean(existing)}
                        onChange={() => {
                          const cur = [...(draft.poMappings ?? [])];
                          if (existing) set('poMappings', cur.filter((m) => m.po !== po.code));
                          else set('poMappings', [...cur, { po: po.code, explanation: '' }]);
                        }}
                        className="w-4 h-4 accent-[#6D4AFF]"
                      />
                      <span title={po.name} className="text-sm font-bold text-primary-dark underline decoration-dotted cursor-help">{po.code}</span>
                      <span className="text-xs text-slate-500">{po.name}</span>
                    </label>
                    {existing && (
                      <input
                        value={existing.explanation}
                        onChange={(e) => set('poMappings', (draft.poMappings ?? []).map((m) => m.po === po.code ? { ...m, explanation: e.target.value } : m))}
                        placeholder={`How does the event map to ${po.code}`}
                        className={`${inputCls} mt-2`}
                        aria-label={`${po.code} explanation`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="font-semibold">Review and submit</h2>
            <dl className="text-sm grid sm:grid-cols-2 gap-2">
              <div className="border border-gray-200 rounded-card p-3"><dt className="text-slate-500">Event</dt><dd className="font-semibold">{(draft.eventName as string) || 'Untitled'}</dd></div>
              <div className="border border-gray-200 rounded-card p-3"><dt className="text-slate-500">Dates</dt><dd className="font-semibold">{draft.startDate as string} to {draft.endDate as string}, {draft.startTime as string} to {draft.endTime as string}</dd></div>
              <div className="border border-gray-200 rounded-card p-3"><dt className="text-slate-500">Departments</dt><dd className="font-semibold">{((draft.departments as string[]) ?? []).join(', ')}</dd></div>
              <div className="border border-gray-200 rounded-card p-3"><dt className="text-slate-500">Budget</dt><dd className="font-semibold">{draft.hasBudget ? `Rs. ${budget.total} total, Rs. ${budget.closing} closing` : 'No budget'}</dd></div>
            </dl>
            <p className="text-sm text-slate-500">Signatory block is auto-filled from submitter and approval chain: Coordinator ({currentUser.name}), HOD, Dean (if SWDC), Principal.</p>
            {(errors.eventName || errors.budgetJustification) && <p className="text-sm text-red-600">Please fix validation errors in earlier steps.</p>}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {step > 0 && <button onClick={() => setStep(step - 1)} className={btnGhost}><ArrowLeft size={15} /> Previous</button>}
        <div className="flex-1" />
        <button onClick={() => save('Draft')} className={btnGhost} disabled={saving}><Save size={15} /> {saving ? 'Saving...' : 'Save as draft'}</button>
        {step < STEPS.length - 1
          ? <button onClick={() => { if (validate(step)) setStep(step + 1); }} className={btnPrimary}>Next <ArrowRight size={15} /></button>
          : <button onClick={() => save('Submitted')} className={btnPrimary} disabled={saving}><Eye size={15} /> {saving ? 'Submitting...' : editing ? 'Resubmit proposal' : 'Submit proposal'}</button>}
      </div>
    </div>
  );
}

export function ProposalDetail() {
  const { id } = useParams();
  const { proposals, saveProposals, comments, saveComments, currentUser, users, pushNotification, pushAudit, notifications, saveNotifications, letterhead, completions, saveCompletions, backend } = useData();
  const nav = useNavigate();
  const p = proposals.find((x) => x.id === id);
  const [remark, setRemark] = useState('');
  const [comment, setComment] = useState('');
  const [letterOpen, setLetterOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [report, setReport] = useState({ done: true, actualDate: '', actualParticipants: '', actualExpenditure: '', outcome: '', reasonIfNotDone: '', posAchieved: [] as string[] });
  const [bulkMsg, setBulkMsg] = useState('');

  useEffect(() => { setBulkMsg(''); }, [id]);
  if (!p) return <EmptyState title="Proposal not found" hint="It may have been removed." />;

  const { total, closing } = budgetTotals(p);
  const thread = comments.filter((c) => c.proposalId === p.id);
  const existingReport = completions[p.id];
  const reportPending = p.status === 'Approved' && p.endDate < new Date().toISOString().slice(0, 10) && !existingReport;

  const act = (action: 'Approved' | 'Rejected' | 'Changes Requested') => {
    if ((action !== 'Approved') && !remark.trim()) { setBulkMsg('A remark is mandatory for reject or request changes.'); return; }
    const chain = p.approvalChain.map((s) => {
      const isMine = s.userId === currentUser.id || (currentUser.role === 'Principal' && s.role === 'Principal') || (currentUser.role === 'Dean' && s.role === 'Dean' && !s.userId);
      if (isMine && s.action === 'Pending') return { ...s, action, actedAt: nowStr(), remark: remark || action, userId: currentUser.id, userName: currentUser.name };
      return s;
    });
    let status = p.status;
    if (action === 'Rejected') status = 'Rejected';
    else if (action === 'Changes Requested') status = 'Changes Requested';
    else if (chain.every((s) => s.action === 'Approved')) status = 'Approved';
    else status = 'Under Review';
    const resourcesOk = p.resources.length === 0 || p.resources.every((r) => r.status !== 'Rejected');
    if (action === 'Approved' && !resourcesOk) status = 'Under Review';
    const updated = { ...p, approvalChain: chain, status, updatedAt: nowStr() };
    saveProposals(proposals.map((x) => x.id === p.id ? updated : x));
    pushNotification({ userId: p.submitterId, title: `Proposal ${status}`, body: `${p.refNo}: ${remark || action}`, link: `/proposals/${p.id}` });
    pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `${action} ${p.refNo} with remark: ${remark || action}`, entity: 'Proposal', entityId: p.id });
    setRemark('');
    setBulkMsg(`Recorded: ${action}.`);
  };

  const decideResource = (rid: string, ok: boolean) => {
    if (!remark.trim() && !ok) { setBulkMsg('A remark is mandatory to reject a room request.'); return; }
    const updated = { ...p, resources: p.resources.map((r) => r.id === rid ? { ...r, status: ok ? 'Approved' as const : 'Rejected' as const, decidedBy: currentUser.name, decidedAt: nowStr(), remark: remark || (ok ? 'Approved' : 'Rejected') } : r), updatedAt: nowStr() };
    saveProposals(proposals.map((x) => x.id === p.id ? updated : x));
    pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `${ok ? 'Approved' : 'Rejected'} resource ${rid} for ${p.refNo}`, entity: 'Proposal', entityId: p.id });
    setRemark('');
  };

  const postComment = () => {
    if (!comment.trim()) return;
    saveComments([{ id: `c-${Date.now()}`, proposalId: p.id, userId: currentUser.id, userName: currentUser.name, text: comment, createdAt: nowStr() }, ...comments]);
    setComment('');
  };

  const setStatus = (status: Proposal['status']) => {
    saveProposals(proposals.map((x) => x.id === p.id ? { ...x, status, updatedAt: nowStr() } : x));
    pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `Set ${p.refNo} to ${status}`, entity: 'Proposal', entityId: p.id });
  };

  const submitReport = () => {
    if (!report.done && !report.reasonIfNotDone.trim()) { setBulkMsg('Reason is mandatory when the event was not done.'); return; }
    saveCompletions({ ...completions, [p.id]: { proposalId: p.id, done: report.done, actualDate: report.actualDate, actualParticipants: report.actualParticipants, actualExpenditure: report.actualExpenditure, outcome: report.outcome, photos: [], posAchieved: report.posAchieved, reasonIfNotDone: report.reasonIfNotDone, submittedAt: nowStr(), submittedBy: currentUser.name } });
    saveProposals(proposals.map((x) => x.id === p.id ? { ...x, status: 'Completed' as const, updatedAt: nowStr() } : x));
    pushAudit({ actorId: currentUser.id, actorName: currentUser.name, action: `Submitted completion report for ${p.refNo}`, entity: 'Proposal', entityId: p.id });
    setReportOpen(false);
  };

  const reportFields = existingReport
    ? [existingReport.actualDate, existingReport.actualParticipants, existingReport.actualExpenditure, existingReport.outcome, existingReport.posAchieved.join(','), existingReport.done ? 'done' : existingReport.reasonIfNotDone]
    : [];
  const reportDone = reportFields.filter((f) => String(f ?? '').trim()).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => nav(-1)} className="text-sm text-primary font-semibold inline-flex items-center gap-1"><ArrowLeft size={15} /> Back</button>
        <span className="text-xs text-slate-400">Proposals / {p.refNo}</span>
        <div className="flex-1" />
        <Badge text={p.status} />
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <h1 className="text-2xl font-bold flex-1 min-w-52">{p.eventName}</h1>
        {p.submitterId === currentUser.id && ['Draft', 'Changes Requested'].includes(p.status) && (
          <Link to={`/proposals/${p.id}/edit`} className={btnPrimary}>Edit</Link>
        )}
        <button onClick={() => setLetterOpen(true)} className={btnGhost}><Eye size={15} /> Preview as letter</button>
        <button onClick={() => exportLetterPDF(p, letterhead)} className={btnGhost}>Letter PDF</button>
        <button onClick={() => exportLetterDOCX(p, letterhead)} className={btnGhost}>Letter DOCX</button>
      </div>
      <p className="font-mono text-xs text-slate-500">{p.refNo} | {p.academicYear} | Requested {p.dateOfRequest} by {p.submitterName}</p>
      {bulkMsg && <p className="text-sm bg-primary-pale border border-primary-border text-primary-dark rounded-card px-3 py-2" role="status">{bulkMsg}</p>}
      {reportPending && <div className="bg-amber-50 border border-amber-200 rounded-card px-4 py-3 text-sm"><span className="font-semibold">Completion report pending.</span> The event date has passed. <button className="text-primary font-semibold ml-1" onClick={() => setReportOpen(true)}>Submit report</button></div>}

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <section className="bg-white border border-gray-200 rounded-card p-5">
            <h2 className="font-semibold mb-2">Summary</h2>
            <dl className="grid sm:grid-cols-2 gap-2 text-sm">
              {[['Category', p.eventCategory], ['Organizer', p.organizingBody], ['Dates', `${p.startDate} to ${p.endDate}`], ['Time', `${p.startTime} to ${p.endTime}`], ['Audience', p.audience.join(', ')], ['Departments', p.departments.join(', ')], ['Years', p.years.join(', ')], ['Participants', String(p.participants)]].map(([k, v]) => (
                <div key={k} className="border border-gray-100 rounded-md px-3 py-2"><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
            <p className="text-sm mt-3 leading-relaxed">{p.purpose}</p>
            {p.hasBudget && <p className="text-sm mt-2">Budget head <b>{p.budgetHead}</b>, opening Rs. {p.openingBalance}, expenses Rs. {total}, closing Rs. <span className={closing < 0 ? 'text-red-700 font-bold' : 'font-bold'}>{closing}</span></p>}
          </section>

          <section className="bg-white border border-gray-200 rounded-card p-5">
            <h2 className="font-semibold mb-2">Attachments ({p.attachments.length} of 5)</h2>
            <AttachmentUploader
              files={p.attachments}
              onChange={(files) => {
                const updated = { ...p, attachments: files, updatedAt: nowStr() };
                saveProposals(proposals.map((x) => x.id === p.id ? updated : x));
                if (backend === 'supabase') {
                  import('../lib/supabase').then(({ supabase }) =>
                    import('../lib/backend').then(({ insertAttachmentMeta }) =>
                      files.filter((f) => f.storagePath).forEach((f) =>
                        insertAttachmentMeta(supabase(), {
                          id: f.id, proposalId: p.id, name: f.name,
                          size: f.size, kind: f.kind,
                          storagePath: f.storagePath ?? '', uploadedBy: currentUser.id,
                        }).catch(() => undefined))));
                }
              }}
            />
          </section>

          <section className="bg-white border border-gray-200 rounded-card p-5">
            <h2 className="font-semibold mb-2">Resource sub-requests (per HOD)</h2>
            {p.resources.length === 0 && <p className="text-sm text-slate-500">No rooms or labs requested.</p>}
            <div className="space-y-2">
              {p.resources.map((r) => (
                <div key={r.id} className="border border-gray-200 rounded-card p-3 text-sm flex flex-wrap gap-2 items-center">
                  <span className="font-semibold">{r.resourceType} {r.roomNo}</span>
                  <span className="text-slate-500">{r.ownerDept} | {r.date}, {r.startTime} to {r.endTime}</span>
                  <Badge text={r.status} />
                  <span className="flex-1" />
                  {r.status === 'Pending' && (currentUser.role === 'Principal' || (currentUser.role === 'HOD' && currentUser.department === r.ownerDept)) && (
                    <span className="flex gap-1">
                      <button onClick={() => decideResource(r.id, true)} className="px-2.5 py-1 text-xs font-semibold rounded-md bg-primary text-white">Approve</button>
                      <button onClick={() => decideResource(r.id, false)} className="px-2.5 py-1 text-xs font-semibold rounded-md border border-red-300 text-red-700">Reject</button>
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-card p-5">
            <h2 className="font-semibold mb-2">Comments ({thread.length})</h2>
            <div className="flex gap-2">
              <input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a progress comment" className={inputCls} aria-label="Add comment" />
              <button onClick={postComment} className={btnPrimary}>Post</button>
            </div>
            <ul className="mt-3 space-y-2">
              {thread.map((c) => (
                <li key={c.id} className="border border-gray-100 rounded-md px-3 py-2 text-sm">
                  <span className="font-semibold">{c.userName}</span> <span className="text-xs text-slate-400">{c.createdAt}</span>
                  <p className="mt-0.5">{c.text}</p>
                </li>
              ))}
              {thread.length === 0 && <li className="text-sm text-slate-500">No comments yet.</li>}
            </ul>
          </section>

          {(existingReport || reportPending) && (
            <section className="bg-white border border-gray-200 rounded-card p-5">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold flex-1">Completion report {existingReport ? `(${reportDone} of 6 fields completed)` : ''}</h2>
                {existingReport && (
                  <ExportMenu onExport={(fmt) => {
                    const rows = [flattenReport(p, existingReport)];
                    const file = `docworm-report-${p.refNo.replace(/\//g, '-')}`;
                    if (fmt === 'CSV') exportCSV(`${file}.csv`, rows, REPORT_COLS);
                    else if (fmt === 'XLSX') exportXLSX(`${file}.xlsx`, rows, REPORT_COLS);
                    else if (fmt === 'PDF') exportPDF(`${file}.pdf`, `Docworm completion report ${p.refNo}`, REPORT_COLS, rows);
                    else window.print();
                  }} />
                )}
              </div>
              {existingReport ? (
                <dl className="text-sm mt-2 space-y-1">
                  <p>Done: <b>{existingReport.done ? 'Yes' : 'No'}</b></p>
                  <p>Actual date: {existingReport.actualDate || <span className="text-red-600">missing</span>}</p>
                  <p>Actual participants: {existingReport.actualParticipants || <span className="text-red-600">missing</span>}</p>
                  <p>Actual expenditure: {existingReport.actualExpenditure || <span className="text-red-600">missing</span>} (planned Rs. {total})</p>
                  <p>Outcome: {existingReport.outcome || <span className="text-red-600">missing</span>}</p>
                  <p>POs achieved: {existingReport.posAchieved.join(', ') || <span className="text-red-600">missing</span>}</p>
                </dl>
              ) : (
                <button onClick={() => setReportOpen(true)} className={btnPrimary}>Fill completion report</button>
              )}
            </section>
          )}
        </div>

        <div className="space-y-4">
          <section className="bg-white border border-gray-200 rounded-card p-5">
            <h2 className="font-semibold mb-3">Approval timeline</h2>
            <ol className="space-y-3">
              {p.approvalChain.map((s, i) => (
                <li key={s.id} className="flex gap-3">
                  <span className={`w-6 h-6 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 ${s.action === 'Approved' ? 'bg-green-600 text-white' : s.action === 'Pending' ? 'bg-gray-200 text-slate-600' : 'bg-red-600 text-white'}`}>{i + 1}</span>
                  <div className="text-sm">
                    <p className="font-semibold">{s.role}: {s.userName || 'Unassigned'}</p>
                    <p className="text-xs text-slate-500">{s.action}{s.actedAt ? `, ${s.actedAt}` : ''}</p>
                    {s.remark && <p className="text-xs mt-0.5 bg-gray-50 border border-gray-100 rounded px-2 py-1">{s.remark}</p>}
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 space-y-2">
              <Field label="Remark (mandatory for reject or changes)">
                <input value={remark} onChange={(e) => setRemark(e.target.value)} className={inputCls} placeholder="Decision note" />
              </Field>
              <div className="flex flex-wrap gap-1.5">
                <button onClick={() => act('Approved')} className="px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 text-white">Approve</button>
                <button onClick={() => act('Rejected')} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-red-300 text-red-700">Reject</button>
                <button onClick={() => act('Changes Requested')} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-amber-300 text-amber-800">Request changes</button>
              </div>
              {p.submitterId === currentUser.id && ['Submitted', 'Under Review', 'Changes Requested'].includes(p.status) && (
                <button onClick={() => setStatus('Withdrawn')} className="text-xs text-slate-500 underline">Withdraw proposal</button>
              )}
              {currentUser.role === 'Principal' && (
                <button onClick={() => { setStatus('Approved'); pushNotification({ userId: p.submitterId, title: 'Proposal Approved', body: `${p.refNo} approved by Principal`, link: `/proposals/${p.id}` }); }} className="text-xs text-primary font-semibold underline">Force approve (principal)</button>
              )}
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-card p-5">
            <h2 className="font-semibold mb-2">Audit log</h2>
            <ul className="text-xs space-y-1.5 text-slate-600">
              {notifications.filter((n) => n.link.includes(p.id)).slice(0, 4).map((n) => <li key={n.id}>{n.createdAt}: {n.title}, {n.body}</li>)}
              <li>Created {p.createdAt}, updated {p.updatedAt}</li>
              <li>Submitted by {p.submitterName} ({p.submitterDept})</li>
            </ul>
          </section>
        </div>
      </div>

      {letterOpen && (
        <Modal title={`Formal letter: ${p.refNo}`} onClose={() => setLetterOpen(false)} wide>
          <div className="border border-gray-200 rounded-card p-6 bg-white text-sm leading-relaxed print-full">
            <p className="text-primary font-bold">Docworm</p>
            <h3 className="font-bold text-lg">{letterhead.collegeName}</h3>
            <p className="text-slate-500 text-xs">{letterhead.address}</p>
            <hr className="my-3" />
            <p>Ref: {p.refNo}</p>
            <p>Academic Year: {p.academicYear}</p>
            <p>Date: {p.dateOfRequest}</p>
            <p className="mt-3">To,<br />The Principal,<br />{letterhead.collegeName},<br />Mira Road (East).</p>
            <p className="mt-3 font-bold">Subject: Permission to organise {p.eventName} on {p.startDate}.</p>
            <p className="mt-3">Respected Sir,</p>
            <pre className="whitespace-pre-wrap font-sans mt-2">{letterPlainText(p, letterhead)}</pre>
            <table className="w-full mt-4 text-xs border border-gray-300">
              <thead><tr className="bg-gray-50"><th className="border p-2">Coordinator</th><th className="border p-2">HOD</th><th className="border p-2">Dean / Principal</th></tr></thead>
              <tbody><tr><td className="border p-2">{p.submitterName}</td><td className="border p-2">{p.approvalChain.find((s) => s.role === 'HOD')?.userName ?? ''}</td><td className="border p-2">Principal</td></tr></tbody>
            </table>
          </div>
          <div className="mt-3 flex gap-2 print-hidden">
            <button onClick={() => exportLetterPDF(p, letterhead)} className={btnPrimary}>Download PDF</button>
            <button onClick={() => exportLetterDOCX(p, letterhead)} className={btnGhost}>Download DOCX</button>
            <button onClick={() => window.print()} className={btnGhost}>Print</button>
          </div>
        </Modal>
      )}

      {reportOpen && (
        <Modal title="Completion report" onClose={() => setReportOpen(false)}>
          <div className="space-y-3 text-sm">
            <label className="flex gap-4">
              <span className="flex items-center gap-1.5"><input type="radio" checked={report.done} onChange={() => setReport({ ...report, done: true })} className="accent-[#6D4AFF]" /> Done</span>
              <span className="flex items-center gap-1.5"><input type="radio" checked={!report.done} onChange={() => setReport({ ...report, done: false })} className="accent-[#6D4AFF]" /> Not Done</span>
            </label>
            {!report.done && (
              <Field label="Reason (mandatory)">
                <textarea value={report.reasonIfNotDone} onChange={(e) => setReport({ ...report, reasonIfNotDone: e.target.value })} className={inputCls} rows={3} />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Field label="Actual date"><input type="date" value={report.actualDate} onChange={(e) => setReport({ ...report, actualDate: e.target.value })} className={inputCls} /></Field>
              <Field label="Actual participants"><input value={report.actualParticipants} onChange={(e) => setReport({ ...report, actualParticipants: e.target.value })} className={inputCls} placeholder="Example: 110" /></Field>
            </div>
            <Field label={`Actual expenditure (planned Rs. ${total})`}><input value={report.actualExpenditure} onChange={(e) => setReport({ ...report, actualExpenditure: e.target.value })} className={inputCls} placeholder="Example: 45000" /></Field>
            <Field label="Outcome summary"><textarea value={report.outcome} onChange={(e) => setReport({ ...report, outcome: e.target.value })} className={inputCls} rows={3} /></Field>
            <fieldset>
              <legend className="text-sm font-medium">POs actually achieved</legend>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {['PO1','PO2','PO3','PO4','PO5','PO6','PO7','PO8','PO9','PO10','PO11','PO12'].map((po) => (
                  <button type="button" key={po} onClick={() => setReport({ ...report, posAchieved: report.posAchieved.includes(po) ? report.posAchieved.filter((x) => x !== po) : [...report.posAchieved, po] })} className={`px-2 py-1 text-xs rounded-md border ${report.posAchieved.includes(po) ? 'bg-primary text-white border-primary' : 'border-gray-300'}`}>{po}</button>
                ))}
              </div>
            </fieldset>
            <button onClick={submitReport} className={btnPrimary}>Submit report</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
