// Docworm Optional Development Seed Script
// Populates test accounts for each institutional role (Principal, Dean, HOD, Faculty)
// and sample proposals for end-to-end testing across roles.
// Run ONLY manually when desired: npm run seed:dev

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const connectionString = process.env.DATABASE_URL || '';
if (!connectionString) {
  console.error('❌ Missing DATABASE_URL.');
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require', max: 1 });

async function seedDev() {
  console.log('🌱 Seeding Docworm Development Test Data...');
  const pwHash = await bcrypt.hash('password@67', 10);

  try {
    // 1. Get Department IDs
    const depts = await sql`SELECT id, code FROM public.departments`;
    const deptMap: Record<string, string> = {};
    for (const d of depts) deptMap[d.code] = d.id;

    // 2. Insert Standard Role Accounts
    const users = [
      {
        email: 'principal@slrtce.in',
        name: 'Dr. Suresh Ukarande',
        role: 'Principal',
        dept: null, // Principal has department_id = NULL
        designation: 'Principal & Head of Institution',
        phone: '+91 22 2812 1234',
      },
      {
        email: 'dean@slrtce.in',
        name: 'Dr. Smita Patil',
        role: 'Dean',
        dept: deptMap['HAS'] || null,
        designation: 'Dean, Student Welfare & Academic Affairs',
        phone: '+91 98201 11223',
      },
      {
        email: 'hod.it@slrtce.in',
        name: 'Dr. Vinayak Shinde',
        role: 'HOD',
        dept: deptMap['IT'] || null,
        designation: 'Head of Department, Information Technology',
        phone: '+91 98202 22334',
      },
      {
        email: 'hod.extc@slrtce.in',
        name: 'Dr. Rajesh Bansode',
        role: 'HOD',
        dept: deptMap['EXTC'] || null,
        designation: 'Head of Department, EXTC',
        phone: '+91 98203 33445',
      },
      {
        email: 'prof.sharma@slrtce.in',
        name: 'Prof. Anjali Sharma',
        role: 'Faculty',
        dept: deptMap['IT'] || null,
        designation: 'Assistant Professor, IT',
        phone: '+91 98204 44556',
      },
      {
        email: 'prof.patil@slrtce.in',
        name: 'Prof. Rahul Patil',
        role: 'Faculty',
        dept: deptMap['EXTC'] || null,
        designation: 'Assistant Professor, EXTC',
        phone: '+91 98205 55667',
      },
    ];

    const userMap: Record<string, string> = {};

    for (const u of users) {
      const res = await sql`
        INSERT INTO public.users (
          name, email, password_hash, role, department_id,
          phone, designation, status, must_change_password
        ) VALUES (
          ${u.name}, ${u.email}, ${pwHash}, ${u.role}, ${u.dept},
          ${u.phone}, ${u.designation}, 'active', FALSE
        )
        ON CONFLICT (email) DO UPDATE SET
          name = EXCLUDED.name,
          role = EXCLUDED.role,
          department_id = EXCLUDED.department_id,
          designation = EXCLUDED.designation,
          phone = EXCLUDED.phone,
          status = 'active'
        RETURNING id, email
      `;
      userMap[res[0].email] = res[0].id;
      console.log(`  👤 Seeded ${u.role}: ${u.name} (${u.email})`);
    }

    // 3. Sample Proposal (Under Review: IT Faculty -> HOD -> Dean -> Principal)
    const facultyItId = userMap['prof.sharma@slrtce.in'];
    const hodItId = userMap['hod.it@slrtce.in'];
    const deanId = userMap['dean@slrtce.in'];
    const principalId = userMap['principal@slrtce.in'];

    const propId = 'req-dev-ai-workshop-2026';
    const refNo = 'SLRTCE/IT/2026-27/001';

    await sql`
      INSERT INTO public.permission_requests (
        id, ref_no, academic_year, date_of_request, event_name, event_category,
        organizing_body, start_date, end_date, start_time, end_time, reason,
        purpose, audience, departments, years, participants, has_budget,
        budget_head, opening_balance, budget_justification, faculty_id,
        submitter_name, submitter_dept, status
      ) VALUES (
        ${propId}, ${refNo}, '2026-27', CURRENT_DATE,
        'Hands-on Workshop on Generative AI & Cloud Agents',
        'Workshop', 'Department',
        CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '8 days',
        '09:30', '16:30',
        'To upskill undergraduate engineers in modern AI agent orchestration.',
        'Industry immersion and practical AI system development skills.',
        ARRAY['Students', 'Staff'], ARRAY['IT', 'CMPN'], ARRAY['TE', 'BE'],
        120, TRUE, 'Department Fund', 45000,
        'Honorarium for industry speakers and cloud laboratory provisioning.',
        ${facultyItId}, 'Prof. Anjali Sharma', 'IT', 'Under Review'
      )
      ON CONFLICT (id) DO NOTHING
    `;

    // Resource Booking
    await sql`
      INSERT INTO public.permission_request_resources (
        id, permission_request_id, resource_type, room_no, owner_dept,
        date, start_time, end_time, status
      ) VALUES (
        ${propId + '-res1'}, ${propId}, 'Seminar Hall', 'Seminar Hall 2 (4th Floor)', 'IT',
        CURRENT_DATE + INTERVAL '7 days', '09:30', '16:30', 'Approved'
      )
      ON CONFLICT (id) DO NOTHING
    `;

    // Budget Items
    await sql`
      INSERT INTO public.permission_request_budget_items (
        id, permission_request_id, item, category, quantity, unit_cost
      ) VALUES
        (${propId + '-b1'}, ${propId}, 'Resource Person Honorarium', 'Honorarium', 2, 7500),
        (${propId + '-b2'}, ${propId}, 'Participant Workshop Kits & Certificates', 'Printing', 120, 100),
        (${propId + '-b3'}, ${propId}, 'High-tea & Refreshments', 'Refreshments', 120, 60)
      ON CONFLICT (id) DO NOTHING
    `;

    // Approval Steps Chain
    await sql`
      INSERT INTO public.permission_request_approval_steps (
        id, permission_request_id, step_order, role, user_id, user_name, action, acted_at, remark
      ) VALUES
        (${propId + '-step-hod'}, ${propId}, 1, 'HOD', ${hodItId}, 'Dr. Vinayak Shinde', 'Approved', NOW() - INTERVAL '1 hour', 'Strongly recommended for technical growth.'),
        (${propId + '-step-dean'}, ${propId}, 2, 'Dean', ${deanId}, 'Dr. Smita Patil', 'Pending', NULL, ''),
        (${propId + '-step-prin'}, ${propId}, 3, 'Principal', ${principalId}, 'Dr. Suresh Ukarande', 'Pending', NULL, '')
      ON CONFLICT (id) DO NOTHING
    `;

    // Sample Announcement
    await sql`
      INSERT INTO public.announcements (
        id, title, body, priority, audience_dept, created_by
      ) VALUES (
        'ann-dev-welcome-2026',
        'Official Welcome to the New Academic Session & Permission Portal Go-Live',
        'All faculty members and department heads are requested to route institutional event proposals through the Docworm portal.',
        'High', NULL, ${principalId}
      )
      ON CONFLICT (id) DO NOTHING
    `;

    console.log('\n✅ Dev test seed completed! All passwords set to: docworm123');
  } catch (err) {
    console.error('❌ Dev seed failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedDev();
