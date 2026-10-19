import type { Role } from '../types';

/**
 * Role hierarchy (higher index = higher authority).
 * Faculty < HOD < Dean < Principal
 */
export const ROLE_HIERARCHY: Role[] = ['Faculty', 'HOD', 'Dean', 'Principal'];

/** Returns a numeric rank for comparison. Higher = more authority. */
export function roleRank(role: Role): number {
  return ROLE_HIERARCHY.indexOf(role);
}

/** Returns true if `role` has at least the authority of `minRole`. */
export function hasAuthority(role: Role, minRole: Role): boolean {
  return roleRank(role) >= roleRank(minRole);
}

/** Role display colours and labels used across the app. */
export const ROLE_META: Record<Role, {
  label: string;
  badge: string;
  accent: string;
  bg: string;
  border: string;
  icon: string;
}> = {
  Principal: {
    label: 'Principal',
    badge: 'bg-violet-100 text-violet-800 border-violet-300',
    accent: 'text-violet-700',
    bg: 'bg-violet-50',
    border: 'border-violet-300',
    icon: '🏛️',
  },
  Dean: {
    label: 'Dean',
    badge: 'bg-blue-100 text-blue-800 border-blue-300',
    accent: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    icon: '🎓',
  },
  HOD: {
    label: 'HOD',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    accent: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    icon: '🏢',
  },
  Faculty: {
    label: 'Faculty',
    badge: 'bg-amber-100 text-amber-800 border-amber-300',
    accent: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    icon: '👤',
  },
  'Office Admin': {
    label: 'Office Admin',
    badge: 'bg-slate-100 text-slate-800 border-slate-300',
    accent: 'text-slate-700',
    bg: 'bg-slate-50',
    border: 'border-slate-300',
    icon: '📋',
  },
};

/**
 * Returns the ordered approval chain for a proposal.
 * - Faculty submits → HOD reviews → Dean reviews → Principal sanctions.
 * - HOD submits → skips HOD review → directly goes to Dean → Principal sanctions.
 */
export function buildApprovalChain(
  hodUser: { id: string; name: string } | undefined,
  deanUser: { id: string; name: string } | undefined,
  principalUser: { id: string; name: string } | undefined,
  proposalId?: string,
  submitterRole?: Role,
) {
  const prefix = proposalId ? `${proposalId}-` : `step-${Date.now().toString(36)}-`;
  const chain = [];
  if (submitterRole !== 'HOD') {
    chain.push({
      id: `${prefix}hod`,
      role: 'HOD',
      userId: hodUser?.id ?? '',
      userName: hodUser?.name ?? 'Head of Department',
      action: 'Pending' as const,
    });
  }
  chain.push({
    id: `${prefix}dean`,
    role: 'Dean',
    userId: deanUser?.id ?? '',
    userName: deanUser?.name ?? 'Dean (Student Welfare)',
    action: 'Pending' as const,
  });
  chain.push({
    id: `${prefix}prin`,
    role: 'Principal',
    userId: principalUser?.id ?? '',
    userName: principalUser?.name ?? 'Principal Office',
    action: 'Pending' as const,
  });
  return chain;
}

/**
 * Computes the "active" step in an approval chain — the first Pending one.
 * Returns null if all are decided.
 */
export function activeChainStep<T extends { id: string; role: string; action: string }>(chain: T[]): T | null {
  return chain.find((s) => s.action === 'Pending') ?? null;
}

/**
 * Returns true if the given role can act on the given proposal right now.
 * - Principal holds executive sanction authority on any pending proposal at all times.
 * - HOD CANNOT endorse or approve their own submissions.
 */
export function canActOnProposal(
  userRole: Role,
  chain: { id: string; role: string; action: string }[],
  proposal?: { submitterId?: string; faculty_id?: string; status?: string },
  currentUserId?: string,
): boolean {
  // Principal has executive sanction authority over ANY pending proposal at any time
  if (userRole === 'Principal') {
    const isPending = chain.some((s) => s.action === 'Pending') || (proposal && ['Submitted', 'Under Review'].includes(proposal.status || ''));
    return Boolean(isPending);
  }

  const active = activeChainStep(chain);
  if (!active) return false;

  const roleMap: Record<string, Role> = {
    HOD: 'HOD',
    Dean: 'Dean',
    Principal: 'Principal',
  };
  return roleMap[active.role] === userRole;
}

/**
 * Permission matrix for UI actions.
 * - Faculty: submits proposals, tracks own requests.
 * - HOD: sees everything in their department; endorses & forwards to Dean.
 * - Dean: sees all HODs and faculties across all departments; recommends & forwards to Principal.
 * - Principal: sees all institutional requests & staff; holds the EXCLUSIVE final sanction / approval authority.
 */
export const PERMISSIONS = {
  canCreateProposal: (role: Role) => role === 'Faculty' || role === 'HOD',
  canReviewInChain: (role: Role) => hasAuthority(role, 'HOD'),
  canEndorseAsHOD: (role: Role) => role === 'HOD',
  canRecommendAsDean: (role: Role) => role === 'Dean',
  canSanctionAsPrincipal: (role: Role) => role === 'Principal',
  canApproveProposals: (role: Role) => hasAuthority(role, 'HOD'), // can take action in their chain step
  canAssignTasks: (role: Role) => hasAuthority(role, 'HOD'),
  canManageUsers: (role: Role) => role === 'Principal',
  canChangeSettings: (role: Role) => role === 'Principal',
  canViewAllProposals: (role: Role) => hasAuthority(role, 'Dean'), // Dean and Principal see all
  canViewDepartmentProposals: (role: Role) => role === 'HOD',
  canViewAuditLogs: (role: Role) => hasAuthority(role, 'HOD'),
  canViewAllTasks: (role: Role) => hasAuthority(role, 'HOD'),
  canSubmitCompletion: (role: Role) => role === 'Faculty' || role === 'HOD',
  canWithdrawProposal: (role: Role) => role === 'Faculty' || role === 'HOD',
  canViewAnalytics: (role: Role) => hasAuthority(role, 'HOD'),
  canViewAllDepartments: (role: Role) => hasAuthority(role, 'Dean'),
} as const;

/**
 * Scopes proposal visibility based on institutional hierarchy:
 * - Principal & Dean: see ALL proposals across all departments, HODs, and faculties.
 * - HOD: sees EVERYTHING in their department (all faculty proposals, department events).
 * - Faculty: sees only their own proposals and submissions.
 */
export function getProposalsForRole<T extends {
  submitterId: string;
  submitterDept?: string;
  departments?: string[];
  approvalChain?: { id: string; role: string; userId?: string; action: string }[];
}>(
  proposals: T[],
  user: { id: string; role: Role; department?: string | null },
): T[] {
  if (user.role === 'Principal' || user.role === 'Dean') {
    return proposals;
  }
  if (user.role === 'HOD') {
    const dept = (user.department || '').toLowerCase().trim();
    return proposals.filter((p) => {
      // 1. Direct submitter is this HOD
      if (p.submitterId === user.id) return true;
      // 2. Department match
      const subDept = (p.submitterDept || '').toLowerCase().trim();
      const depts = (p.departments || []).map((d) => d.toLowerCase().trim());
      if (dept && (subDept === dept || depts.includes(dept))) return true;
      // 3. Explicitly assigned to this HOD or unassigned HOD step in chain
      if (p.approvalChain?.some((s) => s.role === 'HOD' && (s.userId === user.id || !s.userId))) return true;
      // 4. If proposal is from a cell/committee without dedicated HOD, allow HOD review
      const isCell = ['cultural committee', 'student council', 'sports committee', 'e-cell', 'nss', 'training & placement'].includes(subDept);
      if (isCell) return true;
      return false;
    });
  }
  // Faculty: sees only their own submissions
  return proposals.filter((p) => p.submitterId === user.id);
}

/**
 * Returns role-appropriate action labels ensuring that only Principal sanctions,
 * while HOD & Dean endorse and recommend up the chain.
 */
export function getRoleActionMeta(role: Role) {
  if (role === 'Principal') {
    return {
      actionName: 'Sanction & Approve',
      actionVerb: 'Sanction',
      dialogTitle: 'Principal Official Sanction Desk',
      dialogSubtitle: 'Final institutional authority: Your sanction issues the official signed permission letter and confirms bookings.',
      isFinalApproval: true,
      defaultRemark: 'Sanctioned and approved by Principal Office. Permitted to proceed.',
      badgeLabel: 'Final Authority',
    };
  }
  if (role === 'Dean') {
    return {
      actionName: 'Recommend (Forward to Principal)',
      actionVerb: 'Recommend',
      dialogTitle: 'Dean Institutional Clearance',
      dialogSubtitle: 'Academic & Student Welfare oversight: Recommends the proposal and forwards it to the Principal for final sanction.',
      isFinalApproval: false,
      defaultRemark: 'Reviewed and recommended for Principal sanction.',
      badgeLabel: 'Dean Recommendation',
    };
  }
  if (role === 'HOD') {
    return {
      actionName: 'Endorse (Forward to Dean)',
      actionVerb: 'Endorse',
      dialogTitle: 'Department Head Endorsement',
      dialogSubtitle: 'Department authority: Endorses the faculty submission and forwards it to the Dean for cross-department review.',
      isFinalApproval: false,
      defaultRemark: 'Department verified and endorsed. Forwarding to Dean.',
      badgeLabel: 'HOD Endorsement',
    };
  }
  return {
    actionName: 'Submit',
    actionVerb: 'Submit',
    dialogTitle: 'Faculty Submission',
    dialogSubtitle: 'Faculty submission routed through HOD → Dean → Principal.',
    isFinalApproval: false,
    defaultRemark: 'Submitted for approval.',
    badgeLabel: 'Faculty Submission',
  };
}
