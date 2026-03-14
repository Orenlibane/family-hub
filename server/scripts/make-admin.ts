import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function makeAdmin() {
  try {
    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: 'orenlibane@gmail.com' }
    });

    if (!user) {
      console.error('User not found with email: orenlibane@gmail.com');
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email})`);
    console.log(`Current role: ${user.role}`);

    // Update to ADMIN
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'ADMIN' }
    });

    console.log(`✅ Updated role to: ${updated.role}`);
    console.log(`User ${updated.name} is now an ADMIN`);

  } catch (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

makeAdmin();
