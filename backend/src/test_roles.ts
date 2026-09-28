import { prisma } from './lib/prisma';
import jwt from 'jsonwebtoken';

const secret = process.env.JWT_SECRET || 'super-secret-key-mp-agile-cost-2026';

async function testAllRoleEndpoints() {
  console.log('=== DAMACO FINAL SECURITY & ROLE AUDIT ===');
  const users = await prisma.user.findMany({ include: { role: true } });
  
  for (const user of users) {
    const roleName = user.role.name;
    const token = jwt.sign({ id: user.id, email: user.email, role: roleName }, secret);
    const headers = { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token };

    const dashRes = await fetch('http://localhost:5000/api/dashboard/summary', { headers });
    const dashData = await dashRes.json();
    
    const projRes = await fetch('http://localhost:5000/api/projects', { headers });
    const projData = await projRes.json();

    console.log(`Role: ${roleName.padEnd(15)} | User: ${user.email.padEnd(25)} | Dashboard Status: ${dashRes.status} (${dashData.success}) | Projects Returned: ${projData.data?.length ?? 0}`);
  }
}

testAllRoleEndpoints();
