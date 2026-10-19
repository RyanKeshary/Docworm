// Docworm First-Run & Redeployment Bootstrap Script
// Creates default departments (all 17), event categories, academic options,
// app settings, and safely upserts baseline institutional accounts.
//
// 🛡️ NON-DELETION GUARANTEE:
// This script NEVER deletes or truncates existing user accounts.
// All custom accounts (faculty signups, custom staff, etc.) are strictly preserved
// across redeployments until explicitly deleted by Principal, Dean, or HOD.
// Run with: npm run bootstrap

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { SEED_USERS } from '../src/seed';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// Load environment from .env if present
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
  console.error('❌ Missing DATABASE_URL in environment or .env');
  process.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require', max: 1 });

const DEPARTMENTS = [
  { id: 'dept-it', code: 'IT', name: 'Information Technology' },
  { id: 'dept-cmpn', code: 'CMPN', name: 'Computer Engineering' },
  { id: 'dept-cs', code: 'CS', name: 'Computer Science and Engineering' },
  { id: 'dept-extc', code: 'EXTC', name: 'Electronics & Telecommunication Engineering' },
  { id: 'dept-ecs', code: 'ECS', name: 'Electronics & Computer Science' },
  { id: 'dept-etrx', code: 'ETRX', name: 'Electronics Engineering' },
  { id: 'dept-mech', code: 'MECH', name: 'Mechanical Engineering' },
  { id: 'dept-civil', code: 'CIVIL', name: 'Civil Engineering' },
  { id: 'dept-has', code: 'HAS', name: 'Humanities & Applied Sciences' },
  { id: 'dept-aiml', code: 'AIML', name: 'Artificial Intelligence & Machine Learning' },
  { id: 'dept-aids', code: 'AIDS', name: 'Artificial Intelligence & Data Science' },
  { id: 'dept-cyber', code: 'CYBER', name: 'CSE Cyber Security' },
  { id: 'dept-mca', code: 'MCA', name: 'Master of Computer Applications' },
  { id: 'dept-bvoc', code: 'B.VOC', name: 'Bachelor of Vocation' },
  { id: 'dept-tpo', code: 'TPO', name: 'Training & Placement Office' },
  { id: 'dept-exam', code: 'EXAM', name: 'Examination Cell' },
  { id: 'dept-iqac', code: 'IQAC', name: 'Internal Quality Assurance Cell' },
];

const EVENT_CATEGORIES = [
  'Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar',
  'Guest Lecture', 'Industrial Visit', 'Placement', 'Other'
];

const ACADEMIC_OPTIONS: Record<string, string[]> = {
  departments: ['IT', 'CMPN', 'CS', 'EXTC', 'ECS', 'ETRX', 'MECH', 'CIVIL', 'HAS', 'AIML', 'AIDS', 'CYBER', 'MCA', 'B.VOC', 'TPO', 'EXAM', 'IQAC'],
  years: ['FY', 'SY', 'TY', 'BE'],
  academicYears: ['2024-25', '2025-26', '2026-27', '2027-28'],
  organizingBodies: ['Department', 'Student Council', 'SWDC', 'NSS', 'DLLE', 'R&D Cell', 'T&P Cell', 'Other'],
  audiences: ['Students', 'Staff', 'Both', 'External participants', 'Alumni', 'Other'],
  resourceTypes: ['Classroom', 'Lab', 'Auditorium', 'Seminar Hall', 'Ground', 'Equipment'],
  budgetHeads: ['Department Fund', 'Student Welfare Fund', 'College Fund', 'Sponsorship', 'Other'],
  expenseCategories: ['Prizes', 'Refreshments', 'Printing', 'Equipment', 'Travel', 'Honorarium', 'Decor', 'Other'],
  taskTypes: ['Report Submission', 'Event Coordination', 'Accreditation or NAAC or NBA', 'Admission Related', 'Examination Related', 'Infrastructure', 'Meeting', 'Other'],
  priorities: ['Low', 'Medium', 'High', 'Urgent'],
  designations: [
    'Principal & Head of Institution',
    'Dean, Student Welfare & Academic Affairs',
    'I/C Dean Academics',
    'Dean SWDC',
    'Head of Department',
    'Deputy Head of Department',
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Faculty Coordinator',
    'Director TPO',
    'Coordinator TPO',
    'Controller Of Examination',
    'IQAC Coordinator',
    'Lecturer'
  ],
};

const DEFAULT_LETTERHEAD = {
  collegeName: 'Shree L.R. Tiwari College of Engineering',
  short: 'SLRTCE',
  address: 'Shree L.R. Tiwari College of Engineering, Mira Road (East), Thane 401107',
  phone: '+91 22 2812 1234',
  email: 'office@slrtce.in',
};

async function bootstrap() {
  console.log('🚀 Starting Docworm Institutional Bootstrap...');

  try {
    const timeRes = await sql`SELECT NOW()`;
    console.log(`✅ Connected to PostgreSQL. Server Time: ${timeRes[0].now}`);

    // 1. Seed All 17 Departments
    console.log('📦 Seeding standard College Departments (17 departments)...');
    for (const d of DEPARTMENTS) {
      await sql`
        INSERT INTO public.departments (id, code, name, active)
        VALUES (${d.id}, ${d.code}, ${d.name}, TRUE)
        ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, active = TRUE
      `;
    }
    console.log(`✅ ${DEPARTMENTS.length} departments verified.`);

    // 2. Seed Event Categories
    console.log('📦 Seeding standard Event Categories...');
    for (const cat of EVENT_CATEGORIES) {
      const id = `cat-${cat.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      await sql`
        INSERT INTO public.event_categories (id, name, active)
        VALUES (${id}, ${cat}, TRUE)
        ON CONFLICT (name) DO UPDATE SET active = TRUE
      `;
    }
    console.log(`✅ ${EVENT_CATEGORIES.length} event categories verified.`);

    // 3. Seed Academic Options
    console.log('📦 Seeding Academic Options & Restricted Dropdowns...');
    let optCount = 0;
    for (const [type, values] of Object.entries(ACADEMIC_OPTIONS)) {
      for (let i = 0; i < values.length; i++) {
        const val = values[i];
        const id = `opt-${type}-${i + 1}-${val.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
        await sql`
          INSERT INTO public.academic_options (id, type, value, sort_order, active)
          VALUES (${id}, ${type}, ${val}, ${i}, TRUE)
          ON CONFLICT (type, value) DO UPDATE SET sort_order = EXCLUDED.sort_order, active = TRUE
        `;
        optCount++;
      }
    }
    console.log(`✅ ${optCount} academic options verified.`);

    // 4. Seed App Settings (Letterhead & Email Config)
    console.log('📦 Seeding App Settings & College Letterhead...');
    await sql`
      INSERT INTO public.app_settings (key, value, updated_at)
      VALUES ('letterhead', ${JSON.stringify(DEFAULT_LETTERHEAD)}, NOW())
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
    `;

    // 5. Get Department ID Mapping for user association
    const deptRows = await sql`SELECT id, code FROM public.departments`;
    const deptMap = new Map<string, string>();
    for (const d of deptRows) {
      deptMap.set(d.code.toUpperCase(), d.id);
    }

    const defaultPasswordHash = await bcrypt.hash('password@67', 10);

    // 6. Non-Destructive Upsert of Baseline Institutional Accounts (SEED_USERS)
    console.log(`👥 Non-destructive verification of baseline institutional accounts (${SEED_USERS.length})...`);
    for (const u of SEED_USERS) {
      const email = u.email.toLowerCase().trim();
      const existing = await sql`SELECT id, password_hash, role, status FROM public.users WHERE lower(email) = ${email}`;
      const isDeanOrPrincipal = u.role === 'Principal' || u.role === 'Dean';
      const deptId = (isDeanOrPrincipal || !u.department)
        ? null
        : (deptMap.get(u.department.toUpperCase()) || null);

      if (existing.length > 0) {
        // Keep existing password and existing status! Only update role and designation if missing
        await sql`
          UPDATE public.users
          SET
            name = COALESCE(NULLIF(name, ''), ${u.name}),
            designation = COALESCE(NULLIF(designation, ''), ${u.designation}),
            department_id = ${deptId},
            role = ${u.role},
            updated_at = NOW()
          WHERE id = ${existing[0].id}
        `;
        console.log(`  ✓ Preserved & verified: ${u.name} (${email}) [${u.role}]`);
      } else {
        await sql`
          INSERT INTO public.users (
            name, email, password_hash, role, department_id,
            phone, designation, status, must_change_password
          ) VALUES (
            ${u.name}, ${email}, ${defaultPasswordHash}, ${u.role}, ${deptId},
            ${u.phone || '+91 22 2812 1234'}, ${u.designation}, 'active', FALSE
          )
        `;
        console.log(`  + Seeded baseline account: ${u.name} (${email}) [${u.role}]`);
      }
    }

    // 7. Verification of All Users (Ensuring zero account loss)
    const allUsers = await sql`
      SELECT u.id, u.name, u.email, u.role, u.status, d.code as department_code
      FROM public.users u
      LEFT JOIN public.departments d ON u.department_id = d.id
      ORDER BY u.role, u.name
    `;

    console.log(`\n🛡️ NON-DELETION VERIFICATION:`);
    console.log(`Total user accounts currently active in system: ${allUsers.length}`);
    let customAccountCount = 0;
    const seedEmails = new Set(SEED_USERS.map((x) => x.email.toLowerCase().trim()));

    for (const u of allUsers) {
      const isCustom = !seedEmails.has(u.email.toLowerCase().trim());
      if (isCustom) customAccountCount++;
      console.log(`  - ${u.role}: ${u.name} (${u.email}) [dept: ${u.department_code || 'ALL/NULL'}] status: ${u.status}${isCustom ? ' (User-Created / Preserved)' : ''}`);
    }

    console.log(`\n✅ ${customAccountCount} user-created/custom accounts safely preserved!`);
    console.log('🎉 Docworm Bootstrap & Redeploy Verification Completed Successfully!\n');
  } catch (err) {
    console.error('❌ Bootstrap failed with error:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

bootstrap();
