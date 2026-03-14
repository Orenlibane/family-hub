import bcrypt from 'bcrypt';
import { prisma } from './prisma.service.js';

const SALT_ROUNDS = 10;

/**
 * Hash a PIN for storage
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

/**
 * Verify a PIN against a hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

/**
 * Authenticate a child user with username and PIN
 */
export async function authenticateChild(username: string, pin: string) {
  // Find child auth by username
  const childAuth = await prisma.childAuth.findFirst({
    where: { username },
    include: {
      user: {
        include: {
          household: true
        }
      }
    }
  });

  if (!childAuth) {
    throw new Error('Invalid username or PIN');
  }

  // Verify PIN
  const isValid = await verifyPin(pin, childAuth.pinHash);
  if (!isValid) {
    throw new Error('Invalid username or PIN');
  }

  // Ensure user is a child
  if (childAuth.user.role !== 'KID') {
    throw new Error('This account is not a child account');
  }

  return {
    user: childAuth.user,
    household: childAuth.user.household
  };
}

/**
 * Create child auth credentials
 */
export async function createChildAuth(userId: string, username: string, pin: string) {
  // Check if username is already taken
  const existing = await prisma.childAuth.findFirst({
    where: { username }
  });

  if (existing) {
    throw new Error('Username already taken');
  }

  // Hash PIN
  const pinHash = await hashPin(pin);

  // Create child auth
  return prisma.childAuth.create({
    data: {
      userId,
      username,
      pinHash
    }
  });
}

/**
 * Reset child PIN
 */
export async function resetChildPin(userId: string, newPin: string) {
  const pinHash = await hashPin(newPin);

  return prisma.childAuth.update({
    where: { userId },
    data: { pinHash }
  });
}
