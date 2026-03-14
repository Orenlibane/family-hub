import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Seed admin emails
  const adminEmail = 'orenlibane@gmail.com';

  const existingAdmin = await prisma.adminEmail.findUnique({
    where: { email: adminEmail }
  });

  if (!existingAdmin) {
    await prisma.adminEmail.create({
      data: { email: adminEmail }
    });
    console.log(`✅ Added admin email: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin email already exists: ${adminEmail}`);
  }

  // Update existing users with admin emails to ADMIN role
  const adminEmails = await prisma.adminEmail.findMany();
  const emails = adminEmails.map(a => a.email);

  if (emails.length > 0) {
    const updated = await prisma.user.updateMany({
      where: {
        email: { in: emails },
        role: { not: 'ADMIN' }
      },
      data: {
        role: 'ADMIN'
      }
    });

    if (updated.count > 0) {
      console.log(`✅ Upgraded ${updated.count} user(s) to ADMIN role`);
    }
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
