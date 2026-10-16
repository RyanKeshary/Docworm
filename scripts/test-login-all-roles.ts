async function testAllRoles() {
  const roles = [
    { role: 'Principal', email: 'principal@slrtce.in' },
    { role: 'Dean', email: 'dean@slrtce.in' },
    { role: 'HOD', email: 'hod.it@slrtce.in' },
    { role: 'Faculty', email: 'prof.sharma@slrtce.in' },
  ];

  for (const r of roles) {
    const res = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: r.email, password: 'password@67' }),
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`✅ [${r.role}] ${data.user.name} (${r.email}) authenticated successfully! Status: ${res.status}`);
    } else {
      console.error(`❌ [${r.role}] Failed: ${data.error}`);
    }
  }
}

testAllRoles().catch(console.error);
