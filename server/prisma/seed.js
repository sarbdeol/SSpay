// ============================================
// Database Seed - Initial Data
// Run: npm run db:seed
// ============================================
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 1. Create Super Admin
  const superAdminPassword = await bcrypt.hash('admin123', 10);
  const superAdmin = await prisma.user.upsert({
    where: { username: 'superadmin' },
    update: {},
    create: {
      name: 'Super Admin',
      username: 'superadmin',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    }
  });
  console.log('✅ Super Admin created:', superAdmin.username);

  // 2. Create sample Admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.admin.upsert({
    where: { id: 1 },
    update: {},
    create: { name: 'Rohit' }
  });

  const adminUser = await prisma.user.upsert({
    where: { username: 'rohit' },
    update: {},
    create: {
      name: 'Rohit',
      username: 'rohit',
      password: adminPassword,
      role: 'ADMIN',
      adminId: admin.id,
      createdBy: superAdmin.id,
    }
  });
  console.log('✅ Admin created:', adminUser.username);

  // 3. Create sample Merchant
  const merchantPassword = await bcrypt.hash('merchant123', 10);
  const merchant = await prisma.merchant.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Firojbhai',
      maxPaymentLimit: 500000,
      commissionChargePercent: 2.5,
      adminId: admin.id,
    }
  });

  await prisma.user.upsert({
    where: { username: 'firojbhai' },
    update: {},
    create: {
      name: 'Firojbhai',
      username: 'firojbhai',
      password: merchantPassword,
      role: 'MERCHANT',
      merchantId: merchant.id,
      createdBy: adminUser.id,
    }
  });
  console.log('✅ Merchant created: firojbhai');

  // 4. Create sample Agent
  const agentPassword = await bcrypt.hash('agent123', 10);
  const agent = await prisma.agent.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Roysa',
      commissionChargePercent: 1.5,
      adminId: admin.id,
    }
  });

  await prisma.user.upsert({
    where: { username: 'roysa' },
    update: {},
    create: {
      name: 'Roysa',
      username: 'roysa',
      password: agentPassword,
      role: 'AGENT',
      agentId: agent.id,
      createdBy: adminUser.id,
    }
  });
  console.log('✅ Agent created: roysa');

  // 5. Assign Agent to Merchant
  await prisma.merchantAgent.upsert({
    where: { merchantId_agentId: { merchantId: merchant.id, agentId: agent.id } },
    update: {},
    create: { merchantId: merchant.id, agentId: agent.id }
  });

  // 6. Create sample Operator
  const operator = await prisma.operator.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Yovi',
      maxTransactionAmount: 100000,
      minTransactionAmount: 100,
      commissionChargePercent: 0.5,
      agentId: agent.id,
    }
  });

  const opPassword = await bcrypt.hash('operator123', 10);
  await prisma.user.upsert({
    where: { username: 'yovi' },
    update: {},
    create: {
      name: 'Yovi',
      username: 'yovi',
      password: opPassword,
      role: 'OPERATOR',
      operatorId: operator.id,
      createdBy: adminUser.id,
    }
  });
  console.log('✅ Operator created: yovi');

  // 7. Create sample Collector
  const collector = await prisma.collector.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Main Collector',
      adminId: admin.id,
    }
  });

  const colPassword = await bcrypt.hash('collector123', 10);
  await prisma.user.upsert({
    where: { username: 'collector1' },
    update: {},
    create: {
      name: 'Main Collector',
      username: 'collector1',
      password: colPassword,
      role: 'COLLECTOR',
      collectorId: collector.id,
      createdBy: adminUser.id,
    }
  });
  console.log('✅ Collector created: collector1');

  console.log('\n🎉 Seed complete!\n');
  console.log('Login credentials:');
  console.log('─────────────────────────────────');
  console.log('Super Admin: superadmin / admin123');
  console.log('Admin:       rohit / admin123');
  console.log('Merchant:    firojbhai / merchant123');
  console.log('Agent:       roysa / agent123');
  console.log('Operator:    yovi / operator123');
  console.log('Collector:   collector1 / collector123');
  console.log('─────────────────────────────────');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
