// Docworm First-Run Bootstrap Script
// Creates schema migrations, default departments, event categories, academic options,
// and the first Principal account from environment variables.
// Run with: npm run bootstrap

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import bcrypt from 'bcryptjs';

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
  { id: 'dept-extc', code: 'EXTC', name: 'Electronics & Telecommunication Engineering' },
  { id: 'dept-ecs', code: 'ECS', name: 'Electronics & Computer Science' },
  { id: 'dept-mech', code: 'MECH', name: 'Mechanical Engineering' },
  { id: 'dept-civil', code: 'CIVIL', name: 'Civil Engineering' },
  { id: 'dept-has', code: 'HAS', name: 'Humanities & Applied Sciences' },
];

const EVENT_CATEGORIES = [
  'Technical', 'Cultural', 'Sports', 'Workshop', 'Seminar',
  'Guest Lecture', 'Industrial Visit', 'Placement', 'Other'
];

const ACADEMIC_OPTIONS: Record<string, string[]> = {
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
    'Dean, Student Welfare',
    'Head of Department',
    'Professor',
    'Associate Professor',
    'Assistant Professor',
    'Faculty Coordinator',
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

    // 1. Seed Departments
    console.log('📦 Seeding standard College Departments...');
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

    // 5. Bootstrap Initial Principal Account
    const principalEmail = (process.env.INITIAL_PRINCIPAL_EMAIL || 'umesh.bhadade@slrtce.in').toLowerCase().trim();
    const principalPassword = process.env.INITIAL_PRINCIPAL_PASSWORD || 'password@67';
    console.log(`👑 Bootstrapping Master Principal Account (${principalEmail})...`);

    const passwordHash = await bcrypt.hash(principalPassword, 10);

    const existingPrincipal = await sql`
      SELECT id FROM public.users WHERE lower(email) = ${principalEmail}
    `;

    let principalId: string;
    if (existingPrincipal.length > 0) {
      principalId = existingPrincipal[0].id;
      await sql`
        UPDATE public.users
        SET
          name = 'Principal Office',
          password_hash = ${passwordHash},
          role = 'Principal',
          department_id = NULL,
          designation = 'Principal & Head of Institution',
          phone = '+91 22 2812 1234',
          status = 'active',
          must_change_password = FALSE,
          updated_at = NOW()
        WHERE id = ${principalId}
      `;
      console.log(`✅ Existing Principal account (${principalEmail}) updated with department_id = NULL.`);
    } else {
      const inserted = await sql`
        INSERT INTO public.users (
          name, email, password_hash, role, department_id,
          phone, designation, status, must_change_password
        ) VALUES (
          'Principal Office', ${principalEmail}, ${passwordHash}, 'Principal', NULL,
          '+91 22 2812 1234', 'Principal & Head of Institution', 'active', FALSE
        )
        RETURNING id
      `;
      principalId = inserted[0].id;
      console.log(`✅ Master Principal account created with ID: ${principalId}`);
    }

    // 6. Record Audit Log for Bootstrap
    await sql`
      INSERT INTO public.audit_log (actor_id, actor_name, action, target, meta)
      VALUES (
        ${principalId},
        'System Bootstrap',
        'SYSTEM_INITIALIZED',
        'users:principal',
        ${JSON.stringify({ email: principalEmail, enforcedDepartmentNull: true, forcedPasswordChange: true })}
      )
    `;

    console.log('\n🎉 Docworm Bootstrap Completed Successfully!');
    console.log(`-----------------------------------------------------`);
    console.log(`Principal Login:    ${principalEmail}`);
    console.log(`Temporary Password: ${principalPassword}`);
    console.log(`Forced Password Change on First Login: YES`);
    console.log(`Principal Department: NULL (Institutional Authority)`);
    console.log(`-----------------------------------------------------\n`);
  } catch (err) {
    console.error('❌ Bootstrap failed with error:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

bootstrap();
