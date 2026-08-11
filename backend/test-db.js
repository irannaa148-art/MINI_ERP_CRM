const { PrismaClient } = require('@prisma/client');

const passwords = ['postgres', 'admin', 'root', 'password', '123456', 'master', 'postgres123', 'admin123', 'irann', 'gemini'];

async function testPrismaConnections() {
  for (const pwd of passwords) {
    const url = `postgresql://postgres:${encodeURIComponent(pwd)}@localhost:5432/postgres?schema=public`;
    const prisma = new PrismaClient({ datasources: { db: { url } } });

    try {
      await prisma.$connect();
      console.log(`✅ SUCCESS! User 'postgres' connected with password: "${pwd}"`);
      await prisma.$disconnect();
      return pwd;
    } catch (err) {
      console.log(`❌ Password "${pwd}" failed: ${err.message.split('\n')[0]}`);
      await prisma.$disconnect();
    }
  }

  // Also test Windows user name
  const winUser = process.env.USERNAME || 'irann';
  for (const pwd of passwords) {
    const url = `postgresql://${winUser}:${encodeURIComponent(pwd)}@localhost:5432/postgres?schema=public`;
    const prisma = new PrismaClient({ datasources: { db: { url } } });

    try {
      await prisma.$connect();
      console.log(`✅ SUCCESS! User '${winUser}' connected with password: "${pwd}"`);
      await prisma.$disconnect();
      return pwd;
    } catch (err) {
      await prisma.$disconnect();
    }
  }
}

testPrismaConnections();
