// Central Role-Based Access Control (RBAC) Module
// Implements the institutional permission matrix for Docworm.
// Enforced on the server and mirrored in the UI.

export type Role = 'Principal' | 'Dean' | 'HOD' | 'Faculty';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  department_id: string | null;
  department_code?: string;
  status?: string;
}

export type Action =
  // Staff & User Management
  | 'user:view_all'
  | 'user:view_dept'
  | 'user:view_own'
  | 'user:create'
  | 'user:edit_own'
  | 'user:edit_other'
  | 'user:delete'
  | 'user:approve_registration'

  // Permission Requests & Proposals
  | 'request:view_all'
  | 'request:view_dept'
  | 'request:view_own'
  | 'request:create'
  | 'request:edit_own'
  | 'request:decide_principal'   // approve, deny, revert pending requests
  | 'request:endorse_hod'        // recommend within HOD chain step

  // Announcements & Broadcasts
  | 'announcement:create'
  | 'announcement:delete'
  | 'announcement:view'

  // Settings & Admin Tools (Phase 6)
  | 'admin:table_editor_read'
  | 'admin:table_editor_write'
  | 'admin:sql_editor'
  | 'admin:academic_options_write'
  | 'admin:departments_write'
  | 'admin:settings_write'
  | 'admin:view_read_only'

  // Faculty Leaves & Employee Gate Passes
  | 'leave:view_all'
  | 'leave:view_dept'
  | 'leave:view_own'
  | 'leave:create'
  | 'leave:endorse_hod'
  | 'leave:decide_principal'
  | 'leave:cancel_own'
  | 'gatepass:view_all'
  | 'gatepass:view_dept'
  | 'gatepass:view_own'
  | 'gatepass:create'
  | 'gatepass:endorse_hod'
  | 'gatepass:decide_principal'
  | 'gatepass:cancel_own'


  // Reports & Exports
  | 'report:export_excel'
  | 'report:export_csv';

/**
 * Central permission check function.
 * @param user Authenticated user context
 * @param action The requested action
 * @param resource Optional resource (e.g., target user or permission request)
 */
export function can(user: AuthUser | null | undefined, action: Action, resource?: any): boolean {
  if (!user || user.status === 'pending_approval' || user.status === 'terminated') {
    return false;
  }

  const role = user.role;

  switch (action) {
    // ----------------------------------------------------
    // 1. Staff Management
    // ----------------------------------------------------
    case 'user:view_all':
      // Principal and Dean can view all staff across all departments
      return role === 'Principal' || role === 'Dean';

    case 'user:view_dept':
      // Principal & Dean see all. HOD sees staff in own department.
      if (role === 'Principal' || role === 'Dean') return true;
      if (role === 'HOD') {
        if (!resource) return true; // generic dept view
        return resource.department_id === user.department_id || resource.department === user.department_code;
      }
      return false;

    case 'user:view_own':
      return true;

    case 'user:create':
      // Principal can add all. Dean can add HOD and rest below. HOD can add Faculty. Faculty adds none.
      if (role === 'Principal') return true;
      if (!resource) return false;
      {
        const targetRole = typeof resource === 'string' ? resource : resource.role;
        if (role === 'Dean') {
          return targetRole === 'HOD' || targetRole === 'Faculty' || targetRole === 'Office Admin';
        }
        if (role === 'HOD') {
          return targetRole === 'Faculty';
        }
      }
      return false;

    case 'user:delete':
      if (role === 'Principal') return true;
      if (!resource) return false;
      {
        const targetRole = typeof resource === 'string' ? resource : resource.role;
        if (role === 'Dean') {
          return targetRole === 'HOD' || targetRole === 'Faculty' || targetRole === 'Office Admin';
        }
        if (role === 'HOD') {
          const resDept = resource.department_code || resource.department_id || resource.department;
          const isSameDept = !resDept || resDept === user.department_code || resDept === user.department_id;
          return targetRole === 'Faculty' && isSameDept;
        }
      }
      return false;

    case 'user:approve_registration':
      // ONLY Principal can approve or verify registration queue
      return role === 'Principal';

    case 'user:edit_own':
      // All active users can edit their own basic profile
      if (!resource) return true;
      return resource.id === user.id;

    case 'user:edit_other':
      // ONLY Principal can edit other staff profiles
      return role === 'Principal';

    // ----------------------------------------------------
    // 2. Permission Requests
    // ----------------------------------------------------
    case 'request:view_all':
      // Principal & Dean can view all requests across all departments
      return role === 'Principal' || role === 'Dean';

    case 'request:view_dept':
      if (role === 'Principal' || role === 'Dean') return true;
      if (role === 'HOD') {
        if (!resource) return true;
        const resDept = resource.submitter_dept || resource.department_code || resource.department_id;
        return resDept === user.department_code || resDept === user.department_id;
      }
      return false;

    case 'request:view_own':
      if (role === 'Principal' || role === 'Dean') return true;
      if (!resource) return true;
      return resource.faculty_id === user.id || resource.submitter_id === user.id;

    case 'request:create':
      // Faculty and HOD can submit their own requests. Principal optional. Dean cannot.
      return role === 'Faculty' || role === 'HOD' || role === 'Principal';

    case 'request:edit_own':
      if (!resource) return role === 'Faculty' || role === 'HOD';
      const isOwner = resource.faculty_id === user.id || resource.submitter_id === user.id;
      const isEditable = resource.status === 'Draft' || resource.status === 'Changes Requested';
      return (isOwner && isEditable) || role === 'Principal';

    case 'request:decide_principal':
      // Approve, deny, or revert pending requests: Principal ONLY. Dean cannot.
      return role === 'Principal';

    case 'request:endorse_hod':
      // HOD can endorse requests originating from their own department
      if (role !== 'HOD') return false;
      if (!resource) return true;
      const dept = resource.submitter_dept || resource.department_code || resource.department_id;
      return dept === user.department_code || dept === user.department_id;

    // ----------------------------------------------------
    // 3. Announcements & Broadcasts
    // ----------------------------------------------------
    case 'announcement:create':
    case 'announcement:delete':
      // ONLY Principal can send or delete announcements/broadcasts
      return role === 'Principal';

    case 'announcement:view':
      // All authenticated staff can view broadcasts
      return true;

    // ----------------------------------------------------
    // 4. Settings & Admin Tools (Phase 6)
    // ----------------------------------------------------
    case 'admin:table_editor_read':
      return role === 'Principal' || role === 'Dean';

    case 'admin:table_editor_write':
    case 'admin:sql_editor':
    case 'admin:academic_options_write':
    case 'admin:departments_write':
    case 'admin:settings_write':
      // Principal ONLY. Dean cannot write/edit/delete admin settings.
      return role === 'Principal';

    case 'admin:view_read_only':
      // Dean can view admin logs/analytics in read-only mode
      return role === 'Principal' || role === 'Dean';

    // ----------------------------------------------------
    // 5. Faculty Leaves & Employee Gate Passes
    // ----------------------------------------------------
    case 'gatepass:view_all':
    case 'leave:view_all':
      return role === 'Principal' || role === 'Dean';

    case 'gatepass:view_dept':
    case 'leave:view_dept':
      if (role === 'Principal' || role === 'Dean') return true;
      if (role === 'HOD') {
        if (!resource) return true;
        const resDept = resource.department_code || resource.department_id || resource.department;
        return resDept === user.department_code || resDept === user.department_id;
      }
      return false;

    case 'gatepass:view_own':
    case 'leave:view_own':
      if (role === 'Principal' || role === 'Dean') return true;
      if (!resource) return true;
      return (resource.employee_id || resource.faculty_id) === user.id;

    case 'gatepass:create':
    case 'leave:create':
      return role === 'Faculty' || role === 'HOD';

    case 'gatepass:endorse_hod':
    case 'leave:endorse_hod': {
      if (role !== 'HOD') return false;
      if (!resource) return true;
      const leaveDept = resource.department_code || resource.department_id || resource.department;
      return leaveDept === user.department_code || leaveDept === user.department_id;
    }

    case 'gatepass:decide_principal':
    case 'leave:decide_principal':
      return role === 'Principal';

    case 'gatepass:cancel_own':
    case 'leave:cancel_own':
      if (!resource) return role === 'Faculty' || role === 'HOD';
      return (resource.employee_id || resource.faculty_id) === user.id && (resource.status === 'Pending' || resource.status === 'Draft');


    // ----------------------------------------------------
    // 6. Reports & Exports
    // ----------------------------------------------------
    case 'report:export_excel':
    case 'report:export_csv':
      return true;

    default:
      return false;
  }
}
