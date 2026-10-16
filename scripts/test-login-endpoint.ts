async function testLogin() {
  const res = await fetch('http://localhost:3001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'principal@slrtce.in', password: 'password@67' }),
  });
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('User logged in:', data.user?.name, data.user?.email, 'Role:', data.user?.role);
}

testLogin().catch(console.error);
